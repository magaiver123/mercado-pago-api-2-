import { getRepositoryFactory } from "@/api/repositories/repository-factory"
import { publishOpenDoorCommandService } from "@/api/services/mqtt/publish-open-door-command-service"
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

    if (!order.store_id) {
      logger.warn("Webhook sem store_id no pedido", { mercadopagoOrderId, action })
      return { ok: true }
    }

    const items = Array.isArray(order.items) ? order.items : []

    for (const item of items) {
      if (typeof item !== "object" || item === null) continue

      const productId = (item as { id?: unknown; productId?: unknown }).id ?? (item as { productId?: unknown }).productId
      const quantity = (item as { quantity?: unknown }).quantity

      if (typeof productId !== "string" || typeof quantity !== "number") continue
      if (quantity <= 0) continue

      const currentStock = await repositories.stock.getCurrentStock(order.store_id, productId)
      if (typeof currentStock !== "number") continue

      const newQuantity = currentStock - quantity
      if (newQuantity < 0) continue

      const now = new Date().toISOString()
      await repositories.stock.updateStock(order.store_id, productId, newQuantity, now)
      await repositories.stock.createMovement({
        storeId: order.store_id,
        productId,
        quantity,
        reason: `Venda - Pedido ${mercadopagoOrderId}`,
        createdAt: now,
      })
    }

    await repositories.order.markStockProcessed(order.id)

    const lock = await repositories.storeLock.findPrimaryEnabledByStoreId(order.store_id)
    if (!lock || !lock.device_id) {
      logger.warn("Webhook processed sem fechadura configurada para a loja", {
        mercadopagoOrderId,
        storeId: order.store_id,
      })
      return { ok: true }
    }

    const publishResult = await publishOpenDoorCommandService({
      deviceId: lock.device_id,
      socketId: mercadopagoOrderId,
      source: "mercadopago_webhook",
      storeId: order.store_id,
      mercadopagoOrderId,
    })

    if (!publishResult.ok) {
      logger.error("Webhook processed falhou ao enviar comando MQTT de abertura", {
        mercadopagoOrderId,
        storeId: order.store_id,
        deviceId: lock.device_id,
        topic: publishResult.topic,
        error: publishResult.error ?? "unknown_error",
      })
    }

    return { ok: true }
  }

  await repositories.order.updateStatusByMercadopagoOrderId(mercadopagoOrderId, newStatus)
  return { ok: true }
}
