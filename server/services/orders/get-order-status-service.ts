import { AppError } from "@/api/utils/app-error"
import { getRepositoryFactory } from "@/api/repositories/repository-factory"
import { mercadoPagoApiRequest } from "@/api/services/mercadopago/mercadopago-api"
import { processMercadoPagoWebhookService } from "@/api/services/mercadopago/process-mercadopago-webhook-service"
import { isFinalPointOrderStatus, normalizePointOrderStatus } from "@/lib/mercadopago-point-status"

interface GetOrderStatusOptions {
  processedFallbackMode?: "full" | "stock_only" | "none"
}

export async function getOrderStatusService(orderId: string | null, options: GetOrderStatusOptions = {}) {
  if (!orderId) {
    throw new AppError("Order ID is required", 400)
  }

  const processedFallbackMode = options.processedFallbackMode ?? "full"

  const repositories = getRepositoryFactory()
  const localOrder = await repositories.order.getStatusByMercadopagoOrderId(orderId)

  const localStatus = normalizePointOrderStatus(localOrder?.status)
  const requiresProcessedSideEffects = localStatus === "processed" && localOrder?.stock_processed === false
  const shouldFetchFromMercadoPago = !localOrder || !isFinalPointOrderStatus(localStatus) || requiresProcessedSideEffects

  if (!shouldFetchFromMercadoPago && localOrder) {
    return {
      orderId,
      status: localStatus,
      createdAt: localOrder.created_at,
      source: "database",
    }
  }

  const remoteOrderResponse = await mercadoPagoApiRequest<{
    id?: string
    status?: string
    created_date?: string
  }>({
    path: `/v1/orders/${orderId}`,
    method: "GET",
  })

  if (remoteOrderResponse.ok && remoteOrderResponse.data?.status) {
    const normalizedRemoteStatus = normalizePointOrderStatus(remoteOrderResponse.data.status)

    if (localOrder && normalizePointOrderStatus(localOrder.status) !== normalizedRemoteStatus) {
      await repositories.order.updateStatusByMercadopagoOrderId(orderId, normalizedRemoteStatus)
    }

    // Fallback de resiliencia: se webhook falhar, processa efeitos de "processed"
    // na primeira reconciliacao do status consultado no app.
    if (normalizedRemoteStatus === "processed" && processedFallbackMode !== "none") {
      await processMercadoPagoWebhookService({
        action: "order.processed",
        mercadopagoOrderId: orderId,
        data: { id: orderId },
      }, {
        skipDoorCommand: processedFallbackMode === "stock_only",
        source: "order_status_poll",
      })
    }

    return {
      orderId,
      status: normalizedRemoteStatus,
      createdAt: localOrder?.created_at ?? remoteOrderResponse.data.created_date ?? null,
      source: localOrder ? "mercadopago_reconciled" : "mercadopago",
    }
  }

  if (!localOrder) {
    throw new AppError("Order not found", 404)
  }

  return {
    orderId,
    status: localStatus,
    createdAt: localOrder.created_at,
    source: "database",
  }
}
