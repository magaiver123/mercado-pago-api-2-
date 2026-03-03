import { getRepositoryFactory } from "@/api/repositories/repository-factory"

export async function updateOrderStatusService(mercadopagoOrderId: string, status: string) {
  await getRepositoryFactory().order.updateStatusByMercadopagoOrderId(mercadopagoOrderId, status)
}

