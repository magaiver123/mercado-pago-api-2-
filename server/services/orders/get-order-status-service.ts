import { AppError } from "@/api/utils/app-error"
import { getRepositoryFactory } from "@/api/repositories/repository-factory"
import { mercadoPagoApiRequest } from "@/api/services/mercadopago/mercadopago-api"
import { isFinalPointOrderStatus, normalizePointOrderStatus } from "@/lib/mercadopago-point-status"

export async function getOrderStatusService(orderId: string | null) {
  if (!orderId) {
    throw new AppError("Order ID is required", 400)
  }

  const repositories = getRepositoryFactory()
  const localOrder = await repositories.order.getStatusByMercadopagoOrderId(orderId)

  const localStatus = normalizePointOrderStatus(localOrder?.status)
  const shouldFetchFromMercadoPago = !localOrder || !isFinalPointOrderStatus(localStatus)

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
