import { OrderRecord } from "@/api/types/domain"

export interface RegisterOrderInput {
  userId: string
  mercadopagoOrderId: string
  totalAmount: number
  paymentMethod: string
  status: string
  items: unknown
}

export interface OrderRepository {
  registerOrder(input: RegisterOrderInput): Promise<void>
  getStatusByMercadopagoOrderId(orderId: string): Promise<{ status: string; created_at: string } | null>
  listByUserId(userId: string): Promise<Array<Pick<OrderRecord, "id" | "order_number" | "status" | "total_amount" | "items" | "created_at">>>
  findForStockProcessing(mercadopagoOrderId: string): Promise<Pick<OrderRecord, "id" | "items" | "stock_processed"> | null>
  updateStatusByMercadopagoOrderId(mercadopagoOrderId: string, status: string): Promise<void>
  markStockProcessed(orderId: string): Promise<void>
}

