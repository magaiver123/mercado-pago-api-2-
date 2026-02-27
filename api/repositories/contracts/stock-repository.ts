export interface CreateStockMovementInput {
  productId: string
  quantity: number
  reason: string
  createdAt: string
}

export interface StockRepository {
  getCurrentStock(productId: string): Promise<number | null>
  updateStock(productId: string, quantity: number, updatedAt: string): Promise<void>
  createMovement(input: CreateStockMovementInput): Promise<void>
}

