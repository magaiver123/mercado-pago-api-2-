import { getRepositoryFactory } from "@/api/repositories/repository-factory"
import {
  markLockCommandFailedService,
  markLockCommandSentService,
  upsertPendingLockCommandService,
} from "@/api/services/locks/lock-command-outbox-service"
import {
  buildOpenDoorCommandMessage,
  publishOpenDoorCommandService,
} from "@/api/services/mqtt/publish-open-door-command-service"
import { logger } from "@/api/utils/logger"
import { mapWebhookActionToStatus } from "@/lib/mercadopago-point-status"

interface WebhookBody {
  action?: string
  mercadopagoOrderId?: string
  data?: {
    id?: string
  }
}

interface ProcessWebhookOptions {
  skipDoorCommand?: boolean
  source?: string
}

export async function processMercadoPagoWebhookService(body: WebhookBody, options: ProcessWebhookOptions = {}) {
  const action = body?.action
  const mercadopagoOrderId = body?.mercadopagoOrderId ?? body?.data?.id
  const skipDoorCommand = options.skipDoorCommand === true

  if (!action || !mercadopagoOrderId) {
    return { ok: true }
  }

  const repositories = getRepositoryFactory()
  const newStatus = mapWebhookActionToStatus(action)

  if (!newStatus) {
    return { ok: true }
  }

  if (newStatus === "processed") {
    const lockAt = new Date().toISOString()
    const claimedOrder = await repositories.order.claimForProcessedHandling(
      mercadopagoOrderId,
      lockAt,
    )

    if (!claimedOrder) {
      const existingOrder = await repositories.order.findForStockProcessing(mercadopagoOrderId)
      if (!existingOrder) {
        logger.warn("Webhook recebido para pedido não encontrado localmente", {
          mercadopagoOrderId,
          action,
        })
      } else {
        await repositories.order.updateStatusByMercadopagoOrderId(
          mercadopagoOrderId,
          newStatus,
        )
      }
      return { ok: true }
    }

    if (!claimedOrder.store_id) {
      logger.warn("Webhook sem store_id no pedido", { mercadopagoOrderId, action })
      return { ok: true }
    }

    const items = Array.isArray(claimedOrder.items) ? claimedOrder.items : []

    try {
      for (const item of items) {
        if (typeof item !== "object" || item === null) continue

        const productId =
          (item as { id?: unknown; productId?: unknown }).id ??
          (item as { productId?: unknown }).productId
        const quantity = (item as { quantity?: unknown }).quantity

        if (typeof productId !== "string" || typeof quantity !== "number") continue
        if (quantity <= 0) continue

        const now = new Date().toISOString()
        let decremented = false

        for (let attempt = 0; attempt < 3; attempt += 1) {
          const result = await repositories.stock.decrementStockIfEnough(
            claimedOrder.store_id,
            productId,
            quantity,
            now,
          )

          if (result === "ok") {
            decremented = true
            break
          }

          if (result === "insufficient") {
            throw new Error(
              `Estoque insuficiente para produto ${productId} no pedido ${mercadopagoOrderId}`,
            )
          }

          if (result === "not_found") {
            throw new Error(
              `Produto ${productId} sem registro de estoque para pedido ${mercadopagoOrderId}`,
            )
          }
        }

        if (!decremented) {
          throw new Error(
            `Falha de concorrencia ao decrementar estoque do produto ${productId} para pedido ${mercadopagoOrderId}`,
          )
        }

        await repositories.stock.createMovement({
          storeId: claimedOrder.store_id,
          productId,
          quantity,
          reason: `Venda - Pedido ${mercadopagoOrderId}`,
          createdAt: now,
        })
      }

      await repositories.order.markStockProcessed(claimedOrder.id)
    } catch (error) {
      await repositories.order.releaseProcessingLock(claimedOrder.id)
      logger.error("Falha ao processar efeitos de pedido processed", {
        mercadopagoOrderId,
        storeId: claimedOrder.store_id,
        error: error instanceof Error ? error.message : "unknown_error",
      })
      return { ok: true }
    }

    if (skipDoorCommand) {
      logger.info("Pedido processed reconciliado sem envio de comando de abertura", {
        mercadopagoOrderId,
        storeId: claimedOrder.store_id,
        source: options.source ?? "unknown",
      })
      return { ok: true }
    }

    const lock = await repositories.storeLock.findPrimaryEnabledByStoreId(claimedOrder.store_id)
    if (!lock || !lock.device_id) {
      logger.warn("Webhook processed sem fechadura configurada para a loja", {
        mercadopagoOrderId,
        storeId: claimedOrder.store_id,
      })
      return { ok: true }
    }

    const message = buildOpenDoorCommandMessage({
      deviceId: lock.device_id,
      socketId: mercadopagoOrderId,
      source: "mercadopago_webhook",
      storeId: claimedOrder.store_id,
      mercadopagoOrderId,
    })

    let lockCommandId: string | null = null
    try {
      const lockCommand = await upsertPendingLockCommandService({
        orderId: claimedOrder.id,
        storeId: claimedOrder.store_id,
        deviceId: lock.device_id,
        socketId: mercadopagoOrderId,
        topic: message.topic,
        payload: JSON.parse(message.payload),
      })
      lockCommandId = lockCommand.id
    } catch (error) {
      logger.warn("Não foi possível registrar lock command no outbox; seguindo com publish direto", {
        mercadopagoOrderId,
        storeId: claimedOrder.store_id,
        error: error instanceof Error ? error.message : "unknown_error",
      })
    }

    const publishResult = await publishOpenDoorCommandService({
      deviceId: lock.device_id,
      socketId: mercadopagoOrderId,
      source: "mercadopago_webhook",
      storeId: claimedOrder.store_id,
      mercadopagoOrderId,
    })

    if (!publishResult.ok) {
      if (lockCommandId) {
        await markLockCommandFailedService(
          lockCommandId,
          publishResult.error ?? "mqtt_publish_error",
        ).catch(() => undefined)
      }
      logger.error("Webhook processed falhou ao enviar comando MQTT de abertura", {
        mercadopagoOrderId,
        storeId: claimedOrder.store_id,
        deviceId: lock.device_id,
        topic: publishResult.topic,
        error: publishResult.error ?? "unknown_error",
      })
    } else {
      if (lockCommandId) {
        await markLockCommandSentService(lockCommandId).catch(() => undefined)
      }
    }

    return { ok: true }
  }

  await repositories.order.updateStatusByMercadopagoOrderId(mercadopagoOrderId, newStatus)
  return { ok: true }
}
