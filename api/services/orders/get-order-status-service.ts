import { AppError } from "@/api/utils/app-error"
import { getRepositoryFactory } from "@/api/repositories/repository-factory"

export async function getOrderStatusService(orderId: string | null) {
  if (!orderId) {
    throw new AppError("Order ID is required", 400)
  }

  const data = await getRepositoryFactory().order.getStatusByMercadopagoOrderId(orderId)

  if (!data) {
    throw new AppError("Order not found", 404)
  }

  return {
    orderId,
    status: data.status,
    createdAt: data.created_at,
    source: "database",
  }
}

