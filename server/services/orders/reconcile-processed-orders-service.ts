import { AppError } from "@/api/utils/app-error"
import { getRepositoryFactory } from "@/api/repositories/repository-factory"
import { getOrderStatusService } from "@/api/services/orders/get-order-status-service"
import { sanitizeString } from "@/api/utils/sanitize"

interface ReconcileProcessedOrdersInput {
  storeId: unknown
  limit?: unknown
}

function normalizeLimit(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.min(Math.max(Math.trunc(value), 1), 100)
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number.parseInt(value, 10)
    if (Number.isFinite(parsed)) {
      return Math.min(Math.max(parsed, 1), 100)
    }
  }

  return 30
}

export async function reconcileProcessedOrdersService(input: ReconcileProcessedOrdersInput) {
  const storeId = sanitizeString(input.storeId)
  if (!storeId) {
    throw new AppError("Store ID invalido", 400)
  }

  const limit = normalizeLimit(input.limit)
  const repositories = getRepositoryFactory()
  const pendingOrders = await repositories.order.listPendingStockProcessingByStoreId(storeId, limit)

  let processedCount = 0
  let pendingCount = 0
  let failedCount = 0

  for (const order of pendingOrders) {
    try {
      const statusResult = await getOrderStatusService(order.mercadopago_order_id, {
        processedFallbackMode: "stock_only",
      })
      const refreshed = await repositories.order.findForStockProcessing(order.mercadopago_order_id)
      const isProcessed = refreshed?.stock_processed === true

      if (isProcessed) {
        processedCount += 1
        continue
      }

      if (statusResult.status === "processed") {
        // Defesa extra: se a reconciliacao retornar processed e ainda nao marcou,
        // conta como pendente para nova tentativa.
        pendingCount += 1
      } else {
        pendingCount += 1
      }
    } catch {
      failedCount += 1
    }
  }

  return {
    success: true,
    storeId,
    scanned: pendingOrders.length,
    processedCount,
    pendingCount,
    failedCount,
    limit,
    reconciledAt: new Date().toISOString(),
  }
}
