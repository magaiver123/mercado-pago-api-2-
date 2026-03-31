import { AppError } from "@/api/utils/app-error"
import { getRepositoryFactory } from "@/api/repositories/repository-factory"
import { mercadoPagoApiRequest } from "@/api/services/mercadopago/mercadopago-api"
import { normalizePointOrderStatus } from "@/lib/mercadopago-point-status"

interface RefundOrderAuthContext {
  userId: string
  storeId: string
}

export async function refundMercadoPagoOrderService(orderId: string | null, auth: RefundOrderAuthContext) {
  if (!orderId) {
    throw new AppError("Order ID e obrigatorio", 400)
  }

  const repositories = getRepositoryFactory()
  const accessContext = await repositories.order.getAccessContextByMercadopagoOrderId(orderId)
  if (!accessContext) {
    throw new AppError("Pedido não encontrado", 404)
  }

  if (accessContext.user_id !== auth.userId || accessContext.store_id !== auth.storeId) {
    throw new AppError("Acesso negado para reembolsar este pedido", 403)
  }

  const refundResponse = await mercadoPagoApiRequest<{
    id?: string
    status?: string
  }>({
    path: `/v1/orders/${orderId}/refund`,
    method: "POST",
    idempotencyKey: `refund-${orderId}-${Date.now()}`,
  })

  if (!refundResponse.ok) {
    return {
      ok: false as const,
      status: refundResponse.status,
      body: {
        error: refundResponse.message || "Erro ao reembolsar pedido",
        details: refundResponse.raw,
      },
    }
  }

  const status = normalizePointOrderStatus(refundResponse.data?.status ?? "refunded")
  await repositories.order.updateStatusByMercadopagoOrderId(orderId, status)

  return {
    ok: true as const,
    status: 200,
    body: {
      success: true,
      message: "Pedido reembolsado com sucesso",
      status,
    },
  }
}
