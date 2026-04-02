import { Resend } from "resend"
import { AppError, isAppError } from "@/api/utils/app-error"
import { sanitizeString } from "@/api/utils/sanitize"
import { logger } from "@/api/utils/logger"
import { getRepositoryFactory } from "@/api/repositories/repository-factory"
import { ReceiptItem } from "@/lib/receipt-types"
import { buildReceiptPrintPayload } from "@/api/services/printing/receipt-print-payload"
import { resolveStoreReceiptInfoService } from "@/api/services/printing/resolve-store-receipt-info-service"
import { buildReceiptPdfBuffer } from "@/api/services/orders/receipt-pdf-builder"
import { buildOrderReceiptEmail } from "@/api/services/orders/build-order-receipt-email"

let resendClient: Resend | null = null

function readRequiredEmailSendEnv() {
  const resendApiKey = String(process.env.RESEND_API_KEY ?? "").trim()
  const emailFrom = String(process.env.EMAIL_FROM ?? "").trim()

  if (!resendApiKey || !emailFrom) {
    throw new AppError(
      "Configuracao de e-mail incompleta (RESEND_API_KEY/EMAIL_FROM).",
      500,
      "EMAIL_CONFIG_MISSING",
    )
  }

  return { resendApiKey, emailFrom }
}

function getResendClient() {
  if (!resendClient) {
    const { resendApiKey } = readRequiredEmailSendEnv()
    resendClient = new Resend(resendApiKey)
  }
  return resendClient
}

function mapResendErrorToMessage(error: { statusCode?: number | null; message?: string | null }) {
  const rawMessageOriginal = `${error.message ?? ""}`.trim()
  const rawMessage = rawMessageOriginal.toLowerCase()

  const looksLikeSenderDomainIssue =
    error.statusCode === 403 &&
    (rawMessage.includes("verify a domain") ||
      rawMessage.includes("from address") ||
      rawMessage.includes("sender not verified"))

  if (looksLikeSenderDomainIssue) {
    return "Falha ao enviar comprovante por e-mail. Configure EMAIL_FROM com um remetente de dominio verificado no Resend."
  }

  const looksLikeTestingModeRestriction =
    error.statusCode === 403 &&
    (
      rawMessage.includes("testing emails") ||
      rawMessage.includes("only send emails to yourself") ||
      rawMessage.includes("only send emails to your own email") ||
      rawMessage.includes("verify an email address")
    )

  if (looksLikeTestingModeRestriction) {
    return "Falha ao enviar comprovante por e-mail. No modo de teste do Resend, envie apenas para e-mails autorizados."
  }

  const looksLikeInvalidRecipient =
    error.statusCode === 422 &&
    (rawMessage.includes("invalid") || rawMessage.includes("recipient") || rawMessage.includes("to"))

  if (looksLikeInvalidRecipient) {
    return "Falha ao enviar comprovante por e-mail. O e-mail do cliente parece invalido."
  }

  if (error.statusCode === 429) {
    return "Falha ao enviar comprovante por e-mail. Limite do provedor atingido, tente novamente em instantes."
  }

  const safeMessage = rawMessageOriginal
    .replace(/\s+/g, " ")
    .slice(0, 220)

  if (safeMessage) {
    return `Falha ao enviar comprovante por e-mail (Resend ${error.statusCode ?? "sem status"}): ${safeMessage}`
  }

  return `Nao foi possivel enviar o comprovante por e-mail (Resend ${error.statusCode ?? "sem status"}). Tente novamente em instantes.`
}

function parseNonNegativeNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, value)
  }

  if (typeof value === "string") {
    const normalized = value.replace(",", ".").trim()
    const parsed = Number(normalized)
    if (Number.isFinite(parsed)) {
      return Math.max(0, parsed)
    }
  }

  return null
}

function mapPaymentMethod(value: string | null | undefined): string {
  const normalized = String(value ?? "").trim().toLowerCase()

  if (normalized === "pix" || normalized === "qr") {
    return "PIX"
  }

  if (normalized === "debit_card") {
    return "Cartao de Debito"
  }

  if (normalized === "credit_card") {
    return "Cartao de Credito"
  }

  if (!normalized) {
    return "Nao informado"
  }

  return typeof value === "string" ? value.trim() : normalized
}

function normalizeOrderItems(items: unknown): ReceiptItem[] {
  if (!Array.isArray(items)) return []

  return items
    .map((item) => {
      if (!item || typeof item !== "object") return null

      const nameValue = (item as { name?: unknown }).name
      const quantityValue = (item as { quantity?: unknown }).quantity
      const unitPriceValue =
        (item as { unitPrice?: unknown }).unitPrice ??
        (item as { price?: unknown }).price

      const name =
        typeof nameValue === "string" && nameValue.trim()
          ? nameValue.trim()
          : "Item"

      const quantityNumber = parseNonNegativeNumber(quantityValue)
      const unitPriceNumber = parseNonNegativeNumber(unitPriceValue)

      return {
        name,
        quantity: Math.max(1, Math.floor(quantityNumber ?? 1)),
        unitPrice: unitPriceNumber ?? 0,
      }
    })
    .filter((item): item is ReceiptItem => Boolean(item))
}

interface SendOrderReceiptEmailInput {
  requesterUserId: string
  orderId: unknown
}

export async function sendOrderReceiptEmailService(input: SendOrderReceiptEmailInput) {
  const orderId = sanitizeString(input.orderId)
  if (!orderId || orderId.length > 120) {
    throw new AppError("orderId invalido", 400)
  }

  const repositories = getRepositoryFactory()
  const order = await repositories.order.findByMercadopagoOrderId(orderId)

  if (!order) {
    throw new AppError("Pedido nao encontrado", 404)
  }

  if (order.user_id !== input.requesterUserId) {
    throw new AppError("Acesso negado para este pedido", 403)
  }

  const user = await repositories.user.findById(order.user_id)
  if (!user || !user.email) {
    throw new AppError("Usuario do pedido nao encontrado", 404)
  }

  const items = normalizeOrderItems(order.items)
  if (items.length === 0) {
    throw new AppError("Pedido sem itens validos para comprovante", 422)
  }

  const storeInfo = await resolveStoreReceiptInfoService(order.store_id)
  const itemsSubtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
  const orderTotal = parseNonNegativeNumber(order.total_amount) ?? itemsSubtotal
  const discounts = Math.max(0, itemsSubtotal - orderTotal)

  const payload = buildReceiptPrintPayload({
    orderId: order.mercadopago_order_id,
    receipt: {
      orderId: order.mercadopago_order_id,
      orderNumber: order.order_number,
      createdAt: order.created_at,
      customerName: user.name,
      customerDocument: user.cpf,
      items,
      paymentMethod: mapPaymentMethod(order.payment_method),
      subtotal: itemsSubtotal,
      discounts,
      total: orderTotal,
      storeSlug: storeInfo?.storeSlug,
      storeName: storeInfo?.storeName ?? "Autoatendimento",
      storeAddress: storeInfo?.storeAddress ?? "Endereco da loja nao informado",
      storeLegalName: storeInfo?.storeLegalName,
      storeTaxId: storeInfo?.storeTaxId,
      storePhone: storeInfo?.storePhone,
      storeLogoPath: storeInfo?.storeLogoPath,
    },
  })

  if (!payload) {
    throw new AppError("Falha ao montar comprovante digital", 500)
  }

  try {
    const pdfBuffer = await buildReceiptPdfBuffer(payload)
    const emailTemplate = buildOrderReceiptEmail({
      receipt: payload.receipt,
    })
    const { emailFrom } = readRequiredEmailSendEnv()

    const { error } = await getResendClient().emails.send({
      from: emailFrom,
      to: user.email,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
      text: emailTemplate.text,
      attachments: [
        {
          filename: emailTemplate.fileName,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    })

    if (error) {
      logger.error("Falha ao enviar comprovante digital por e-mail", {
        orderId: order.mercadopago_order_id,
        userId: user.id,
        reason: error.message,
        name: error.name,
        statusCode: (error as { statusCode?: number }).statusCode,
      })
      throw new AppError(
        mapResendErrorToMessage(error),
        502,
        "EMAIL_SEND_FAILED",
      )
    }
  } catch (error) {
    if (
      isAppError(error) &&
      (error.code === "EMAIL_CONFIG_MISSING" || error.code === "EMAIL_SEND_FAILED")
    ) {
      throw error
    }

    if (isAppError(error)) {
      logger.error("Falha ao montar comprovante digital por e-mail", {
        orderId: order.mercadopago_order_id,
        userId: user.id,
        code: error.code,
        message: error.message,
      })
      throw new AppError(
        "Nao foi possivel gerar o comprovante digital deste pedido. Tente novamente em instantes.",
        500,
        "RECEIPT_EMAIL_BUILD_FAILED",
      )
    }

    logger.error("Erro inesperado ao enviar comprovante digital por e-mail", {
      orderId: order.mercadopago_order_id,
      userId: user.id,
      error: error instanceof Error ? error.message : "unknown_error",
    })

    const unexpectedMessage = error instanceof Error ? error.message : ""

    throw new AppError(
      unexpectedMessage
        ? `Nao foi possivel enviar o comprovante por e-mail: ${unexpectedMessage.slice(0, 220)}`
        : "Nao foi possivel enviar o comprovante por e-mail. Tente novamente em instantes.",
      502,
      "EMAIL_SEND_FAILED",
    )
  }

  return {
    success: true,
  }
}
