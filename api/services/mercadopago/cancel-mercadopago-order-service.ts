import { AppError } from "@/api/utils/app-error"
import { getMercadoPagoEnv } from "@/api/config/env"

export async function cancelMercadoPagoOrderService(orderId: string | null) {
  if (!orderId) {
    throw new AppError("Order ID e obrigatorio", 400)
  }

  const { accessToken } = getMercadoPagoEnv()

  const response = await fetch(`https://api.mercadopago.com/v1/orders/${orderId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  })

  if (!response.ok) {
    const contentType = response.headers.get("content-type")
    let details: unknown = null

    if (contentType && contentType.includes("application/json")) {
      details = await response.json().catch(() => null)
    } else {
      details = { message: await response.text().catch(() => "") }
    }

    if (response.status === 500) {
      return {
        ok: false as const,
        status: response.status,
        body: {
          error: "O pedido nao pode ser cancelado no momento. Ele pode ja estar sendo processado no terminal.",
          details,
        },
      }
    }

    return {
      ok: false as const,
      status: response.status,
      body: { error: "Erro ao cancelar pedido", details },
    }
  }

  return {
    ok: true as const,
    status: 200,
    body: {
      success: true,
      message: "Pedido cancelado com sucesso",
    },
  }
}

