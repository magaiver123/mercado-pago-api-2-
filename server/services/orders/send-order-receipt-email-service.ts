import { AppError, isAppError } from "@/api/utils/app-error"
import { sanitizeString } from "@/api/utils/sanitize"
import { logger } from "@/api/utils/logger"
import { getRepositoryFactory } from "@/api/repositories/repository-factory"
import { ReceiptItem } from "@/lib/receipt-types"
import { buildReceiptPrintPayload } from "@/api/services/printing/receipt-print-payload"
import { resolveStoreReceiptInfoService } from "@/api/services/printing/resolve-store-receipt-info-service"
import { buildReceiptPdfBuffer } from "@/api/services/orders/receipt-pdf-builder"
import { buildOrderReceiptEmail } from "@/api/services/orders/build-order-receipt-email"
import { sendTransactionalEmailService } from "@/api/services/email/send-transactional-email-service"
import { getReceiptEmailEnv } from "@/api/config/env"
import {
  buildReceiptEmailIdempotencyKey,
  getRemainingReceiptEmailCooldownSeconds,
} from "@/api/services/orders/receipt-email-cooldown"

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

function mapTransactionalEmailError(error: AppError) {
  if (error.code === "EMAIL_SENDER_NOT_VERIFIED" || error.code === "EMAIL_PROVIDER_TEST_MODE_RESTRICTED") {
    return new AppError(
      "Falha ao enviar comprovante por e-mail. Configure EMAIL_FROM com um remetente de dominio verificado no Resend.",
      502,
      "EMAIL_SEND_FAILED",
    )
  }

  if (error.code === "EMAIL_RECIPIENT_INVALID") {
    return new AppError(
      "Falha ao enviar comprovante por e-mail. O e-mail do cliente parece invalido.",
      422,
      "EMAIL_SEND_FAILED",
    )
  }

  if (error.code === "EMAIL_RECIPIENT_SUPPRESSED") {
    return new AppError(
      "Nao foi possivel enviar o comprovante: este e-mail esta em lista de supressao por bounce/complaint.",
      409,
      "EMAIL_RECIPIENT_SUPPRESSED",
      true,
      false,
    )
  }

  if (error.code === "EMAIL_PROVIDER_RATE_LIMIT" || error.code === "EMAIL_PROVIDER_UNAVAILABLE") {
    return new AppError(
      "Falha ao enviar comprovante por e-mail. Limite do provedor atingido, tente novamente em instantes.",
      502,
      "EMAIL_SEND_FAILED",
      true,
      true,
    )
  }

  if (error.code === "ENV_MISSING") {
    return new AppError(
      "Configuracao de e-mail incompleta (RESEND_API_KEY/EMAIL_FROM/EMAIL_REPLY_TO).",
      500,
      "EMAIL_CONFIG_MISSING",
    )
  }

  if (error.code === "EMAIL_PROVIDER_REJECTED") {
    return new AppError(
      "Nao foi possivel enviar o comprovante por e-mail. Tente novamente em instantes.",
      502,
      "EMAIL_SEND_FAILED",
    )
  }

  return error
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

  const now = new Date()
  const { cooldownSeconds } = getReceiptEmailEnv()
  const retryAfterSeconds = getRemainingReceiptEmailCooldownSeconds({
    lastSentAt: order.last_receipt_email_sent_at,
    now,
    cooldownSeconds,
  })

  if (retryAfterSeconds > 0) {
    throw new AppError(
      `Aguarde ${retryAfterSeconds}s para solicitar novo envio de comprovante.`,
      429,
      "RECEIPT_EMAIL_COOLDOWN",
      true,
      true,
      { retryAfterSeconds },
    )
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

    const idempotencyKey = buildReceiptEmailIdempotencyKey({
      orderId: order.mercadopago_order_id,
      now,
      cooldownSeconds,
    })

    const sendResult = await sendTransactionalEmailService({
      emailType: "order_receipt",
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
      idempotencyKey,
      userId: user.id,
      orderId: order.mercadopago_order_id,
    })

    await repositories.order.updateReceiptEmailSentAt(order.id, now.toISOString())

    return {
      success: true,
      cooldownSeconds,
      nextAllowedAt: new Date(now.getTime() + cooldownSeconds * 1000).toISOString(),
      resendMessageId: sendResult.providerMessageId,
    }
  } catch (error) {
    if (isAppError(error)) {
      if (error.code === "RECEIPT_EMAIL_COOLDOWN") {
        throw error
      }

      const mappedError = mapTransactionalEmailError(error)
      logger.error("Falha ao enviar comprovante digital por e-mail", {
        orderId: order.mercadopago_order_id,
        userId: user.id,
        code: mappedError.code,
        message: mappedError.message,
      })
      throw mappedError
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
}
