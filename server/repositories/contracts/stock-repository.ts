export interface CreateStockMovementInput {
  storeId: string
  productId: string
  quantity: number
  reason: string
  createdAt: string
}

export interface StockRepository {
  getCurrentStock(storeId: string, productId: string): Promise<number | null>
  updateStock(storeId: string, productId: string, quantity: number, updatedAt: string): Promise<void>
  createMovement(input: CreateStockMovementInput): Promise<void>
}
