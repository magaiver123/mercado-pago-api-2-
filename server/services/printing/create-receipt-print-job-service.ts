import { AppError } from "@/api/utils/app-error"
import { sanitizeString } from "@/api/utils/sanitize"
import { getRepositoryFactory } from "@/api/repositories/repository-factory"
import { buildReceiptPrintPayload } from "@/api/services/printing/receipt-print-payload"
import { resolveTotemPrintContextService } from "@/api/services/printing/resolve-totem-print-context-service"

interface CreateReceiptPrintJobInput {
  storeId: string
  deviceId: unknown
  orderId: unknown
  receipt: unknown
}

export async function createReceiptPrintJobService(input: CreateReceiptPrintJobInput) {
  const orderId = sanitizeString(input.orderId)
  if (!orderId) {
    throw new AppError("orderId invalido", 400)
  }

  const payload = buildReceiptPrintPayload({
    orderId,
    receipt: input.receipt,
  })

  if (!payload) {
    throw new AppError("Comprovante invalido para impressao", 400)
  }

  const { totem, printer } = await resolveTotemPrintContextService(input.deviceId)
  if (!totem.store_id || totem.store_id !== input.storeId) {
    throw new AppError("Totem nao pertence ao contexto atual da loja", 403)
  }
  if (!printer) {
    throw new AppError("Nenhuma impressora ativa vinculada a este totem", 422)
  }

  const repositories = getRepositoryFactory()
  const queueResult = await repositories.printJob.createOrGetByIdempotency({
    totemId: totem.id,
    storeId: input.storeId,
    orderId,
    action: "print_receipt",
    payload,
  })
  const job = queueResult.job

  const normalizedStatus = job.status
  let result: "queued" | "already_queued" | "already_printed" | "failed_previous" = "queued"

  if (queueResult.created) {
    result = "queued"
  } else if (normalizedStatus === "printed") {
    result = "already_printed"
  } else if (normalizedStatus === "failed") {
    const requeued = await repositories.printJob.requeueFailed(job.id, totem.id)
    result = requeued ? "queued" : "failed_previous"
  } else if (normalizedStatus === "pending" || normalizedStatus === "claimed") {
    result = "already_queued"
  }

  return {
    success: true,
    result,
    jobId: job.id,
    jobStatus: job.status,
    printer: {
      model: printer.model,
      escposProfile: printer.escpos_profile,
      paperWidthMm: printer.paper_width_mm,
    },
  }
}
