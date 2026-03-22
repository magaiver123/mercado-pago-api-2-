import { AppError } from "@/api/utils/app-error"
import { sanitizeString } from "@/api/utils/sanitize"
import { isValidUUID } from "@/api/utils/validators"
import { getRepositoryFactory } from "@/api/repositories/repository-factory"

interface CreateTestPrintJobInput {
  storeId: string
  totemId: unknown
}

export async function createTestPrintJobService(input: CreateTestPrintJobInput) {
  const totemId = sanitizeString(input.totemId)
  if (!totemId || !isValidUUID(totemId)) {
    throw new AppError("totemId invalido", 400)
  }

  const repositories = getRepositoryFactory()
  const totem = await repositories.totem.findById(totemId)
  if (!totem) {
    throw new AppError("Totem nao encontrado", 404)
  }

  if (totem.store_id !== input.storeId) {
    throw new AppError("Totem nao pertence a loja selecionada", 403)
  }

  const printer = await repositories.totemPrinter.findActiveByTotemId(totemId)
  if (!printer) {
    throw new AppError("Totem sem impressora ativa configurada", 422)
  }

  const now = new Date()
  const orderId = `TEST-${totemId.slice(0, 8)}-${now.getTime()}`

  const payload = {
    type: "receipt",
    orderId,
    requestedAt: now.toISOString(),
    receipt: {
      orderId,
      createdAt: now.toISOString(),
      items: [
        {
          name: "Teste de impressao ESC/POS",
          quantity: 1,
          unitPrice: 0,
        },
      ],
      paymentMethod: "Teste",
      subtotal: 0,
      total: 0,
      storeName: "Autoatendimento",
      additionalMessage:
        "Se este texto saiu corretamente, o vinculo totem-impressora esta operacional.",
    },
  }

  const created = await repositories.printJob.createOrGetByIdempotency({
    totemId,
    storeId: input.storeId,
    orderId,
    action: "print_receipt",
    payload,
  })

  return {
    success: true,
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
