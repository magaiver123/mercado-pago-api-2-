import { Resend } from "resend"
import { AppError, isAppError } from "@/api/utils/app-error"
import { sanitizeString } from "@/api/utils/sanitize"
import { logger } from "@/api/utils/logger"
import { getRepositoryFactory } from "@/api/repositories/repository-factory"
import { getEmailEnv } from "@/api/config/env"
import { ReceiptItem } from "@/lib/receipt-types"
import { buildReceiptPrintPayload } from "@/api/services/printing/receipt-print-payload"
import { resolveStoreReceiptInfoService } from "@/api/services/printing/resolve-store-receipt-info-service"
import { buildReceiptPdfBuffer } from "@/api/services/orders/receipt-pdf-builder"
import { buildOrderReceiptEmail } from "@/api/services/orders/build-order-receipt-email"

let resendClient: Resend | null = null

function getResendClient() {
  if (!resendClient) {
    const { resendApiKey } = getEmailEnv()
    resendClient = new Resend(resendApiKey)
  }
  return resendClient
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

  const pdfBuffer = await buildReceiptPdfBuffer(payload)
  const emailTemplate = buildOrderReceiptEmail({
    receipt: payload.receipt,
  })

  const emailFrom = getEmailEnv().emailFrom

  try {
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
        "Nao foi possivel enviar o comprovante por e-mail. Tente novamente em instantes.",
        502,
        "EMAIL_SEND_FAILED",
      )
    }
  } catch (error) {
    if (isAppError(error)) {
      throw error
    }

    logger.error("Erro inesperado ao enviar comprovante digital por e-mail", {
      orderId: order.mercadopago_order_id,
      userId: user.id,
      error: error instanceof Error ? error.message : "unknown_error",
    })

    throw new AppError(
      "Nao foi possivel enviar o comprovante por e-mail. Tente novamente em instantes.",
      502,
      "EMAIL_SEND_FAILED",
    )
  }

  return {
    success: true,
  }
}
