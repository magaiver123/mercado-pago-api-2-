import { AppError } from "@/api/utils/app-error"
import { getRepositoryFactory } from "@/api/repositories/repository-factory"
import { mercadoPagoApiRequest } from "@/api/services/mercadopago/mercadopago-api"
import { normalizePointOrderStatus } from "@/lib/mercadopago-point-status"

export async function cancelMercadoPagoOrderService(orderId: string | null) {
  if (!orderId) {
    throw new AppError("Order ID e obrigatorio", 400)
  }

  const cancelResponse = await mercadoPagoApiRequest<{
    id?: string
    status?: string
  }>({
    path: `/v1/orders/${orderId}/cancel`,
    method: "POST",
    idempotencyKey: `cancel-${orderId}-${Date.now()}`,
  })

  if (!cancelResponse.ok) {
    return {
      ok: false as const,
      status: cancelResponse.status,
      body: {
        error: cancelResponse.message || "Erro ao cancelar pedido",
        details: cancelResponse.raw,
      },
    }
  }

  await getRepositoryFactory().order.updateStatusByMercadopagoOrderId(orderId, normalizePointOrderStatus(cancelResponse.data?.status ?? "canceled"))

  return {
    ok: true as const,
    status: 200,
    body: {
      success: true,
      message: "Pedido cancelado com sucesso",
      status: normalizePointOrderStatus(cancelResponse.data?.status ?? "canceled"),
    },
  }
}
