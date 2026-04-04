import { AppError } from "@/api/utils/app-error"
import { getRepositoryFactory } from "@/api/repositories/repository-factory"
import { isValidUUID } from "@/api/utils/validators"
import { getMercadoPagoPointEnv } from "@/api/config/env"
import { getSupabaseAdminClient } from "@/api/config/database"
import { mercadoPagoApiRequest } from "@/api/services/mercadopago/mercadopago-api"
import { logger } from "@/api/utils/logger"
import { normalizePointOrderStatus } from "@/lib/mercadopago-point-status"

interface OrderItem {
  productId: string
  quantity: number
}

type AllowedPaymentMethodId = "pix" | "credit_card" | "debit_card"

interface CreateOrderInput {
  userId?: string
  externalReference?: string
  checkoutSessionId?: string
  description: string
  items: OrderItem[]
  paymentMethodId: AllowedPaymentMethodId
  customerDocument?: string | null
  customerDocumentType?: "CPF" | "CNPJ" | null
}

function isValidOrderRequest(body: unknown): body is CreateOrderInput {
  if (!body || typeof body !== "object") return false

  const value = body as Partial<CreateOrderInput>

  if (value.userId !== undefined && (typeof value.userId !== "string" || !isValidUUID(value.userId))) return false
  if (value.externalReference !== undefined) {
    if (typeof value.externalReference !== "string" || value.externalReference.trim() === "") return false
    if (!/^[a-zA-Z0-9_-]{1,64}$/.test(value.externalReference)) return false
  }
  if (value.checkoutSessionId !== undefined) {
    if (typeof value.checkoutSessionId !== "string" || value.checkoutSessionId.trim() === "") return false
    if (!/^[a-zA-Z0-9_-]{1,80}$/.test(value.checkoutSessionId)) return false
  }
  if (typeof value.description !== "string" || value.description.trim() === "") return false
  if (!Array.isArray(value.items) || value.items.length === 0) return false

  for (const item of value.items) {
    if (!item || typeof item !== "object") return false
    if (typeof item.productId !== "string" || item.productId.trim() === "") return false
    if (typeof item.quantity !== "number" || item.quantity <= 0) return false
  }

  const allowedMethods: AllowedPaymentMethodId[] = ["pix", "credit_card", "debit_card"]
  if (!value.paymentMethodId || !allowedMethods.includes(value.paymentMethodId as AllowedPaymentMethodId)) return false

  return true
}

function normalizeLockInfo(lockData: any) {
  const status = typeof lockData?.status === "string" ? lockData.status : lockData?.enabled ? "active" : "inactive"
  const enabled = lockData?.enabled === true
  const deviceId = typeof lockData?.device_id === "string" ? lockData.device_id.trim() : ""
  return {
    status,
    enabled,
    deviceId,
  }
}

export async function createMercadoPagoOrderService(
  body: unknown,
  storeId: string,
  sessionUserId: string,
  fridgeId: string,
) {
  if (!isValidOrderRequest(body)) {
    throw new AppError("Invalid request payload", 400)
  }
  if (!isValidUUID(storeId)) {
    throw new AppError("Store context is invalid", 400)
  }
  if (!isValidUUID(sessionUserId)) {
    throw new AppError("User session is invalid", 401)
  }
  if (!isValidUUID(fridgeId)) {
    throw new AppError("Fridge context is invalid", 400)
  }

  const { terminalId } = getMercadoPagoPointEnv()
  const { description, items, paymentMethodId, checkoutSessionId } = body
  const userId = sessionUserId
  const externalReference =
    typeof body.externalReference === "string" && body.externalReference.trim() !== ""
      ? body.externalReference.trim()
      : `ORDER-${Date.now()}-${userId.slice(0, 8)}`
  const repositories = getRepositoryFactory()

  const user = await repositories.user.findActiveById(userId)
  if (!user) {
    throw new AppError("Usuario nao encontrado", 404)
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
    .eq("id", fridgeId)
    .eq("store_id", storeId)
    .maybeSingle()

  if (fridgeResult.error) {
    if (fridgeResult.error.code === "42P01" || fridgeResult.error.code === "42703") {
      throw new AppError("Modulo de geladeiras ainda nao aplicado no banco", 503)
    }
    throw new AppError("Erro ao validar geladeira do pedido", 500)
  }

  if (!fridgeResult.data) {
    throw new AppError("Geladeira invalida para esta loja", 404)
  }

  const fridgeData: any = fridgeResult.data
  if (fridgeData.status !== "active") {
    throw new AppError("Geladeira inativa para novos pedidos", 409)
  }

  const rawLockData: any = Array.isArray(fridgeData.store_locks)
    ? fridgeData.store_locks[0]
    : fridgeData.store_locks
  const lockInfo = normalizeLockInfo(rawLockData)
  const hasOperationalLock =
    lockInfo.enabled && lockInfo.status === "active" && lockInfo.deviceId !== ""

  if (!hasOperationalLock) {
    throw new AppError("Geladeira sem fechadura ativa/configurada", 409)
  }

  let totalAmount = 0
  const orderItems: Array<{ id: string; name: string; quantity: number; price: number }> = []

  for (const item of items) {
    const product = await repositories.menu.getActiveProductById(storeId, item.productId, fridgeId)
    if (!product || !product.is_active) {
      throw new AppError("Produto invalido ou inativo para esta geladeira", 400)
    }

    orderItems.push({
      id: product.id,
      name: product.name,
      quantity: item.quantity,
      price: product.price,
    })

    const currentStock = await repositories.stock.getCurrentStock(storeId, product.id, fridgeId)
    if (typeof currentStock !== "number" || currentStock < item.quantity) {
      throw new AppError("Estoque insuficiente para concluir o pedido", 409)
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

  const idempotencyKey = checkoutSessionId
    ? `order-${storeId}-${fridgeId}-${userId}-${checkoutSessionId}`
    : `order-${storeId}-${fridgeId}-${externalReference}-${userId}`
  const createResponse = await mercadoPagoApiRequest<{
    id: string
    status: string
    external_reference: string
  }>({
    path: "/v1/orders",
    method: "POST",
    idempotencyKey,
    body: orderPayload,
  })

  const createErrorPayload = createResponse.raw as { errors?: Array<{ code?: string }> } | null

  if (!createResponse.ok) {
    if (createErrorPayload?.errors?.[0]?.code === "already_queued_order_on_terminal") {
      throw new AppError("Ja existe um pedido pendente no terminal. Cancele manualmente no terminal e tente novamente.", 409)
    }

    throw new AppError(createResponse.message || "Erro ao criar pedido no Mercado Pago", createResponse.status)
  }

  const createdOrder = createResponse.data
  if (!createdOrder?.id) {
    throw new AppError("Resposta invalida ao criar pedido no Mercado Pago", 502)
  }

  let registerResult: { id: string; orderNumber: number | null } | null = null

  try {
    registerResult = await repositories.order.registerOrder({
      storeId,
      fridgeId,
      userId,
      mercadopagoOrderId: createdOrder.id,
      totalAmount,
      paymentMethod: paymentMethodId,
      status: normalizePointOrderStatus(createdOrder.status),
      items: orderItems,
    })
  } catch (error) {
    logger.error("Falha ao registrar pedido local apos criacao no Mercado Pago", { error, orderId: createdOrder.id })

    await mercadoPagoApiRequest({
      path: `/v1/orders/${createdOrder.id}/cancel`,
      method: "POST",
      idempotencyKey: `rollback-cancel-${createdOrder.id}`,
    }).catch(() => null)

    throw new AppError("Nao foi possivel concluir o pedido no sistema. Tente novamente.", 500)
  }

  return {
    orderId: createdOrder.id,
    orderNumber: registerResult?.orderNumber ?? null,
    status: normalizePointOrderStatus(createdOrder.status),
    externalReference: createdOrder.external_reference,
    totalAmount: totalAmount.toFixed(2),
    paymentMethod: paymentMethodId,
    fridgeId,
  }
}
