import { AppError } from "@/api/utils/app-error"
import { getRepositoryFactory } from "@/api/repositories/repository-factory"
import { mercadoPagoApiRequest } from "@/api/services/mercadopago/mercadopago-api"
import { normalizePointOrderStatus } from "@/lib/mercadopago-point-status"

interface CancelOrderAuthContext {
  userId: string
  storeId: string
}

function extractMercadoPagoErrorCode(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null
  const data = payload as Record<string, unknown>

  const cause = data.cause
  if (Array.isArray(cause) && cause.length > 0) {
    const first = cause[0]
    if (first && typeof first === "object") {
      const code = (first as Record<string, unknown>).code
      if (typeof code === "string" && code.trim() !== "") return code
    }
  }

  const errors = data.errors
  if (Array.isArray(errors) && errors.length > 0) {
    const first = errors[0]
    if (first && typeof first === "object") {
      const code = (first as Record<string, unknown>).code
      if (typeof code === "string" && code.trim() !== "") return code
    }
  }

  return null
}

export async function cancelMercadoPagoOrderService(orderId: string | null, auth: CancelOrderAuthContext) {
  if (!orderId) {
    throw new AppError("Order ID e obrigatorio", 400)
  }

  const repositories = getRepositoryFactory()
  const accessContext = await repositories.order.getAccessContextByMercadopagoOrderId(orderId)
  if (!accessContext) {
    throw new AppError("Pedido nao encontrado", 404)
  }

  if (accessContext.user_id !== auth.userId || accessContext.store_id !== auth.storeId) {
    throw new AppError("Acesso negado para cancelar este pedido", 403)
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
    const code = extractMercadoPagoErrorCode(cancelResponse.raw)
    return {
      ok: false as const,
      status: cancelResponse.status,
      body: {
        error: cancelResponse.message || "Erro ao cancelar pedido",
        code,
        details: cancelResponse.raw,
      },
    }
  }

  await repositories.order.updateStatusByMercadopagoOrderId(
    orderId,
    normalizePointOrderStatus(cancelResponse.data?.status ?? "canceled"),
  )

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
