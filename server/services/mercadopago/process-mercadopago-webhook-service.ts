import { getRepositoryFactory } from "@/api/repositories/repository-factory"
import { getSupabaseAdminClient } from "@/api/config/database"
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

function normalizeLockInfo(rawLock: any) {
  const lock = Array.isArray(rawLock) ? rawLock[0] : rawLock
  const status = typeof lock?.status === "string" ? lock.status : lock?.enabled ? "active" : "inactive"
  const enabled = lock?.enabled === true
  const deviceId = typeof lock?.device_id === "string" ? lock.device_id.trim() : ""
  return {
    status,
    enabled,
    deviceId,
  }
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

  if (newStatus !== "processed") {
    await repositories.order.updateStatusByMercadopagoOrderId(mercadopagoOrderId, newStatus)
    return { ok: true }
  }

  const lockAt = new Date().toISOString()
  const claimedOrder = await repositories.order.claimForProcessedHandling(
    mercadopagoOrderId,
    lockAt,
  )

  if (!claimedOrder) {
    const existingOrder = await repositories.order.findForStockProcessing(mercadopagoOrderId)
    if (!existingOrder) {
      logger.warn("Webhook recebido para pedido nao encontrado localmente", {
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

  if (!claimedOrder.fridge_id) {
    logger.warn("Pedido processed sem fridge_id. Bloqueando abertura e baixa por geladeira.", {
      mercadopagoOrderId,
      storeId: claimedOrder.store_id,
      orderId: claimedOrder.id,
    })
    await repositories.order.markStockProcessed(claimedOrder.id)
    return { ok: true }
  }

  const db: any = getSupabaseAdminClient()
  const fridgeResult = await db
    .from("fridges")
    .select(
      `
      id,
      store_id,
      status,
      lock_id,
      store_locks!inner (
        id,
        status,
        enabled,
        device_id
      )
    `,
    )
    .eq("id", claimedOrder.fridge_id)
    .maybeSingle()

  if (fridgeResult.error) {
    logger.error("Falha ao carregar geladeira para processamento de webhook", {
      mercadopagoOrderId,
      fridgeId: claimedOrder.fridge_id,
      storeId: claimedOrder.store_id,
      error: fridgeResult.error.message,
    })
    await repositories.order.markStockProcessed(claimedOrder.id)
    return { ok: true }
  }

  if (!fridgeResult.data || fridgeResult.data.store_id !== claimedOrder.store_id) {
    logger.warn("Pedido aponta para geladeira inexistente ou de outra loja", {
      mercadopagoOrderId,
      fridgeId: claimedOrder.fridge_id,
      storeId: claimedOrder.store_id,
    })
    await repositories.order.markStockProcessed(claimedOrder.id)
    return { ok: true }
  }

  const fridge = fridgeResult.data as any
  const lockInfo = normalizeLockInfo(fridge.store_locks)

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
          claimedOrder.fridge_id,
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
            `Produto ${productId} fora do mix/estoque da geladeira ${claimedOrder.fridge_id}`,
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
        fridgeId: claimedOrder.fridge_id,
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
      fridgeId: claimedOrder.fridge_id,
      error: error instanceof Error ? error.message : "unknown_error",
    })
    return { ok: true }
  }

  if (skipDoorCommand) {
    logger.info("Pedido processed reconciliado sem envio de comando de abertura", {
      mercadopagoOrderId,
      storeId: claimedOrder.store_id,
      fridgeId: claimedOrder.fridge_id,
      source: options.source ?? "unknown",
    })
    return { ok: true }
  }

  const hasOperationalLock =
    fridge.status === "active" &&
    lockInfo.enabled &&
    lockInfo.status === "active" &&
    lockInfo.deviceId !== ""

  if (!hasOperationalLock) {
    logger.warn("Pedido processed sem lock operacional na geladeira", {
      mercadopagoOrderId,
      storeId: claimedOrder.store_id,
      fridgeId: claimedOrder.fridge_id,
      fridgeStatus: fridge.status,
      lockStatus: lockInfo.status,
      lockEnabled: lockInfo.enabled,
    })
    return { ok: true }
  }

  const message = buildOpenDoorCommandMessage({
    deviceId: lockInfo.deviceId,
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
      deviceId: lockInfo.deviceId,
      socketId: mercadopagoOrderId,
      topic: message.topic,
      payload: JSON.parse(message.payload),
    })
    lockCommandId = lockCommand.id
  } catch (error) {
    logger.warn("Nao foi possivel registrar lock command no outbox; seguindo com publish direto", {
      mercadopagoOrderId,
      storeId: claimedOrder.store_id,
      fridgeId: claimedOrder.fridge_id,
      error: error instanceof Error ? error.message : "unknown_error",
    })
  }

  const publishResult = await publishOpenDoorCommandService({
    deviceId: lockInfo.deviceId,
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
      fridgeId: claimedOrder.fridge_id,
      deviceId: lockInfo.deviceId,
      topic: publishResult.topic,
      error: publishResult.error ?? "unknown_error",
    })
  } else if (lockCommandId) {
    await markLockCommandSentService(lockCommandId).catch(() => undefined)
  }

  return { ok: true }
}
