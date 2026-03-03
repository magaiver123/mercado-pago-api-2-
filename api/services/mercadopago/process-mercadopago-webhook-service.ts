import { getRepositoryFactory } from "@/api/repositories/repository-factory"
import { logger } from "@/api/utils/logger"
import { mapWebhookActionToStatus } from "@/lib/mercadopago-point-status"

interface WebhookBody {
  action?: string
  mercadopagoOrderId?: string
  data?: {
    id?: string
  }
}

export async function processMercadoPagoWebhookService(body: WebhookBody) {
  const action = body?.action
  const mercadopagoOrderId = body?.mercadopagoOrderId ?? body?.data?.id

  if (!action || !mercadopagoOrderId) {
    return { ok: true }
  }

  const repositories = getRepositoryFactory()
  const newStatus = mapWebhookActionToStatus(action)

  if (!newStatus) {
    return { ok: true }
  }

  if (newStatus === "processed") {
    const order = await repositories.order.findForStockProcessing(mercadopagoOrderId)
    if (!order || order.stock_processed) {
      if (!order) {
        logger.warn("Webhook recebido para pedido nao encontrado localmente", { mercadopagoOrderId, action })
      } else {
        await repositories.order.updateStatusByMercadopagoOrderId(mercadopagoOrderId, newStatus)
      }
      return { ok: true }
    }

    const items = Array.isArray(order.items) ? order.items : []

    for (const item of items) {
      if (typeof item !== "object" || item === null) continue

      const productId = (item as { id?: unknown; productId?: unknown }).id ?? (item as { productId?: unknown }).productId
      const quantity = (item as { quantity?: unknown }).quantity

      if (typeof productId !== "string" || typeof quantity !== "number") continue
      if (quantity <= 0) continue

      const currentStock = await repositories.stock.getCurrentStock(productId)
      if (typeof currentStock !== "number") continue

      const newQuantity = currentStock - quantity
      if (newQuantity < 0) continue

      const now = new Date().toISOString()
      await repositories.stock.updateStock(productId, newQuantity, now)
      await repositories.stock.createMovement({
        productId,
        quantity,
        reason: `Venda - Pedido ${mercadopagoOrderId}`,
        createdAt: now,
      })
    }

    await repositories.order.markStockProcessed(order.id)
    return { ok: true }
  }

  await repositories.order.updateStatusByMercadopagoOrderId(mercadopagoOrderId, newStatus)
  return { ok: true }
}
