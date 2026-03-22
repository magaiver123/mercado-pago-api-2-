import { OrderRecord } from "@/api/types/domain"

export interface RegisterOrderInput {
  storeId: string
  userId: string
  mercadopagoOrderId: string
  totalAmount: number
  paymentMethod: string
  status: string
  items: unknown
}

export interface RegisterOrderResult {
  id: string
  orderNumber: number | null
}

export interface PendingStockProcessingOrder {
  id: string
  mercadopago_order_id: string
  status: string
  stock_processed: boolean
  created_at: string
}

export interface OrderReceiptMetadata {
  order_number: number | null
  created_at: string
  payment_method: string | null
}

export interface OrderRepository {
  registerOrder(input: RegisterOrderInput): Promise<RegisterOrderResult>
  getStatusByMercadopagoOrderId(orderId: string): Promise<{ status: string; created_at: string; stock_processed: boolean } | null>
  getReceiptMetadataByMercadopagoOrderId(orderId: string): Promise<OrderReceiptMetadata | null>
  getAccessContextByMercadopagoOrderId(
    orderId: string,
  ): Promise<{ user_id: string; store_id: string } | null>
  listPendingStockProcessingByStoreId(storeId: string, limit: number): Promise<PendingStockProcessingOrder[]>
  listByUserId(userId: string): Promise<Array<Pick<OrderRecord, "id" | "order_number" | "status" | "total_amount" | "items" | "created_at">>>
  findForStockProcessing(mercadopagoOrderId: string): Promise<Pick<OrderRecord, "id" | "store_id" | "items" | "stock_processed"> | null>
  claimForProcessedHandling(
    mercadopagoOrderId: string,
    lockAt: string,
  ): Promise<Pick<OrderRecord, "id" | "store_id" | "items" | "stock_processed"> | null>
  releaseProcessingLock(orderId: string): Promise<void>
  updateStatusByMercadopagoOrderId(mercadopagoOrderId: string, status: string): Promise<void>
  markStockProcessed(orderId: string): Promise<void>
}
