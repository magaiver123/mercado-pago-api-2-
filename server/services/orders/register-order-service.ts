import { AppError } from "@/api/utils/app-error"
import { isValidUUID } from "@/api/utils/validators"
import { getRepositoryFactory } from "@/api/repositories/repository-factory"

interface RegisterOrderInput {
  storeId: string
  userId: string
  mercadopagoOrderId: string
  totalAmount: number
  paymentMethod: string
  items: unknown
}

export async function registerOrderService(input: RegisterOrderInput) {
  if (
    !input.storeId ||
    !isValidUUID(input.storeId) ||
    !input.userId ||
    !isValidUUID(input.userId) ||
    !input.mercadopagoOrderId ||
    typeof input.mercadopagoOrderId !== "string" ||
    typeof input.totalAmount !== "number" ||
    !input.paymentMethod ||
    typeof input.paymentMethod !== "string"
  ) {
    throw new AppError("Dados inválidos", 400)
  }

  const createdOrder = await getRepositoryFactory().order.registerOrder({
    storeId: input.storeId,
    userId: input.userId,
    mercadopagoOrderId: input.mercadopagoOrderId,
    totalAmount: input.totalAmount,
    paymentMethod: input.paymentMethod,
    status: "pending",
    items: input.items,
  })

  return {
    success: true,
    orderId: createdOrder.id,
    orderNumber: createdOrder.orderNumber,
  }
}
