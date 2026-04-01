import { AppError } from "@/api/utils/app-error"
import { sanitizeString } from "@/api/utils/sanitize"
import { isValidUUID } from "@/api/utils/validators"
import { getRepositoryFactory } from "@/api/repositories/repository-factory"
import { PRINT_JOB_ACTION_RECEIPT } from "@/api/services/printing/printing-domain"
import { buildReceiptPrintPayload } from "@/api/services/printing/receipt-print-payload"

interface CreateTestPrintJobInput {
  storeId: string
  totemId: unknown
}

export async function createTestPrintJobService(input: CreateTestPrintJobInput) {
  const totemId = sanitizeString(input.totemId)
  if (!totemId || !isValidUUID(totemId)) {
    throw new AppError("totemId inválido", 400, "TOTEM_CONTEXT_MISSING", true, false)
  }

  const repositories = getRepositoryFactory()
  const totem = await repositories.totem.findById(totemId)
  if (!totem) {
    throw new AppError("Totem não encontrado", 404, "TOTEM_CONTEXT_MISSING", true, false)
  }

  if (totem.store_id !== input.storeId) {
    throw new AppError(
      "Totem não pertence a loja selecionada",
      403,
      "STORE_CONTEXT_MISMATCH",
      true,
      false,
    )
  }

  const printer = await repositories.totemPrinter.findActiveByTotemId(totemId)
  if (!printer) {
    throw new AppError(
      "Totem sem impressora ativa configurada",
      422,
      "PRINTER_NOT_CONFIGURED",
      true,
      false,
    )
  }

  const now = new Date()
  const orderId = `TEST-${totemId.slice(0, 8)}-${now.getTime()}`

  const payload = buildReceiptPrintPayload({
    orderId,
    receipt: {
      orderId,
      createdAt: now.toISOString(),
      items: [
        {
          name: "Teste de impressão ESC/POS",
          quantity: 1,
          unitPrice: 0,
        },
      ],
      paymentMethod: "Teste",
      subtotal: 0,
      total: 0,
      storeName: "Autoatendimento",
      additionalMessage:
        "Se este texto saiu corretamente, o vínculo totem-impressora está operacional.",
    },
  })

  if (!payload) {
    throw new AppError(
      "Falha ao montar payload de impressão de teste",
      500,
      "RECEIPT_PAYLOAD_INVALID",
      false,
      true,
    )
  }

  const created = await repositories.printJob.createOrGetByIdempotency({
    totemId,
    storeId: input.storeId,
    orderId,
    action: PRINT_JOB_ACTION_RECEIPT,
    payload,
  })

  return {
    success: true,
    code: "QUEUED",
    jobId: created.job.id,
    jobStatus: created.job.status,
    printer: {
      model: printer.model,
      ip: printer.ip,
      port: printer.port,
      escposProfile: printer.escpos_profile,
    },
  }
}
