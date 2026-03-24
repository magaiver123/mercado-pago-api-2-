import { AppError } from "@/api/utils/app-error"
import { sanitizeString } from "@/api/utils/sanitize"
import { getRepositoryFactory } from "@/api/repositories/repository-factory"
import { buildReceiptPrintPayload } from "@/api/services/printing/receipt-print-payload"
import { resolveTotemPrintContextService } from "@/api/services/printing/resolve-totem-print-context-service"
import { resolveStoreReceiptInfoService } from "@/api/services/printing/resolve-store-receipt-info-service"
import {
  PRINT_JOB_ACTION_RECEIPT,
  PrintQueueCode,
  PrintQueueResult,
} from "@/api/services/printing/printing-domain"

interface CreateReceiptPrintJobInput {
  storeId: string
  deviceId: unknown
  orderId: unknown
  receipt: unknown
}

export async function createReceiptPrintJobService(input: CreateReceiptPrintJobInput) {
  const orderId = sanitizeString(input.orderId)
  if (!orderId || orderId.length > 120) {
    throw new AppError("orderId invalido", 400, "ORDER_ID_INVALID", true, false)
  }

  const payload = buildReceiptPrintPayload({
    orderId,
    receipt: input.receipt,
  })

  if (!payload) {
    throw new AppError(
      "Comprovante invalido para impressao",
      400,
      "RECEIPT_PAYLOAD_INVALID",
      true,
      false,
    )
  }

  const { totem, printer } = await resolveTotemPrintContextService(input.deviceId)
  if (!totem.store_id || totem.store_id !== input.storeId) {
    throw new AppError(
      "Totem nao pertence ao contexto atual da loja",
      403,
      "STORE_CONTEXT_MISMATCH",
      true,
      false,
    )
  }
  if (!printer) {
    throw new AppError(
      "Nenhuma impressora ativa vinculada a este totem",
      422,
      "PRINTER_NOT_CONFIGURED",
      true,
      false,
    )
  }

  const repositories = getRepositoryFactory()
  const [orderMetadata, storeReceiptInfo] = await Promise.all([
    repositories.order.getReceiptMetadataByMercadopagoOrderId(orderId),
    resolveStoreReceiptInfoService(input.storeId),
  ])

  if (orderMetadata) {
    payload.receipt.orderNumber = orderMetadata.order_number ?? payload.receipt.orderNumber ?? null
    payload.receipt.createdAt = orderMetadata.created_at || payload.receipt.createdAt
    if (
      (!payload.receipt.paymentMethod || payload.receipt.paymentMethod === "Nao informado") &&
      orderMetadata.payment_method
    ) {
      payload.receipt.paymentMethod = orderMetadata.payment_method
    }
  }

  if (storeReceiptInfo) {
    payload.receipt.storeName = storeReceiptInfo.storeName
    payload.receipt.storeAddress = storeReceiptInfo.storeAddress
    payload.receipt.storeLegalName = storeReceiptInfo.storeLegalName ?? payload.receipt.storeLegalName
    payload.receipt.storeTaxId = storeReceiptInfo.storeTaxId ?? payload.receipt.storeTaxId
    payload.receipt.storePhone = storeReceiptInfo.storePhone ?? payload.receipt.storePhone
    payload.receipt.storeLogoPath = storeReceiptInfo.storeLogoPath ?? payload.receipt.storeLogoPath
  }

  const [queueResult, globalSettings] = await Promise.all([
    repositories.printJob.createOrGetByIdempotency({
      totemId: totem.id,
      storeId: input.storeId,
      orderId,
      action: PRINT_JOB_ACTION_RECEIPT,
      payload,
    }),
    repositories.printGlobalSettings.getDefault(),
  ])

  const job = queueResult.job

  let result: PrintQueueResult = "queued"
  let code: PrintQueueCode = "QUEUED"

  if (queueResult.created) {
    result = "queued"
    code = "QUEUED"
  } else if (job.status === "printed") {
    result = "already_printed"
    code = "ORDER_ALREADY_PRINTED"
  } else if (job.status === "failed") {
    const requeued = await repositories.printJob.requeueFailed(
      job.id,
      totem.id,
      globalSettings.max_retry_attempts,
    )

    if (requeued) {
      result = "queued"
      code = "FAILED_PREVIOUS_REQUEUED"
    } else {
      result = "failed_previous"
      code = "REQUEUE_NOT_ALLOWED"
    }
  } else if (job.status === "pending" || job.status === "claimed") {
    result = "already_queued"
    code = "ORDER_ALREADY_QUEUED"
  }

  return {
    success: true,
    result,
    code,
    jobId: job.id,
    jobStatus: job.status,
    printer: {
      model: printer.model,
      escposProfile: printer.escpos_profile,
      paperWidthMm: printer.paper_width_mm,
    },
  }
}