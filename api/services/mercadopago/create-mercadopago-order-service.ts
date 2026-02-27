import { AppError } from "@/api/utils/app-error"
import { getMercadoPagoEnv } from "@/api/config/env"
import { getRepositoryFactory } from "@/api/repositories/repository-factory"

interface OrderItem {
  productId: string
  quantity: number
}

interface CreateOrderInput {
  externalReference: string
  description: string
  items: OrderItem[]
  paymentMethodId?: string
}

function isValidOrderRequest(body: unknown): body is CreateOrderInput {
  if (!body || typeof body !== "object") return false

  const value = body as Partial<CreateOrderInput>

  if (typeof value.externalReference !== "string" || value.externalReference.trim() === "") return false
  if (typeof value.description !== "string" || value.description.trim() === "") return false
  if (!Array.isArray(value.items) || value.items.length === 0) return false

  for (const item of value.items) {
    if (!item || typeof item !== "object") return false
    if (typeof item.productId !== "string" || item.productId.trim() === "") return false
    if (typeof item.quantity !== "number" || item.quantity <= 0) return false
  }

  if (value.paymentMethodId && typeof value.paymentMethodId !== "string") return false

  return true
}

export async function createMercadoPagoOrderService(body: unknown) {
  if (!isValidOrderRequest(body)) {
    throw new AppError("Invalid request payload", 400)
  }

  const { accessToken, terminalId } = getMercadoPagoEnv()
  const { externalReference, description, items, paymentMethodId } = body
  const repositories = getRepositoryFactory()

  let totalAmount = 0
  for (const item of items) {
    const product = await repositories.menu.getActiveProductById(item.productId)
    if (!product || !product.is_active) {
      throw new AppError("Produto invalido ou inativo", 400)
    }
    totalAmount += product.price * item.quantity
  }

  if (totalAmount <= 0) {
    throw new AppError("Valor total invalido", 400)
  }

  const mappedPaymentMethod = paymentMethodId === "pix" ? "qr" : paymentMethodId
  const orderPayload = {
    type: "point",
    external_reference: externalReference,
    description,
    expiration_time: "PT30M",
    transactions: {
      payments: [{ amount: totalAmount.toFixed(2) }],
    },
    config: {
      point: {
        terminal_id: terminalId,
        print_on_terminal: "no_ticket",
      },
      ...(mappedPaymentMethod && {
        payment_method: {
          default_type: mappedPaymentMethod,
        },
      }),
    },
  }

  const idempotencyKey = `order-${externalReference}`
  const response = await fetch("https://api.mercadopago.com/v1/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      "X-Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify(orderPayload),
  })

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    if (data?.errors?.[0]?.code === "already_queued_order_on_terminal") {
      throw new AppError("Ja existe um pedido pendente no terminal. Cancele manualmente no terminal e tente novamente.", 409)
    }

    throw new AppError(data?.message || "Erro ao criar pedido no Mercado Pago", response.status)
  }

  return {
    orderId: data.id,
    status: data.status,
    externalReference: data.external_reference,
    totalAmount: totalAmount.toFixed(2),
  }
}

