export interface CreateStockMovementInput {
  storeId: string
  fridgeId?: string | null
  productId: string
  quantity: number
  reason: string
  createdAt: string
}

export interface StockRepository {
  getCurrentStock(storeId: string, productId: string, fridgeId?: string | null): Promise<number | null>
  updateStock(storeId: string, productId: string, quantity: number, updatedAt: string, fridgeId?: string | null): Promise<void>
  decrementStockIfEnough(
    storeId: string,
    productId: string,
    quantityToDecrement: number,
    updatedAt: string,
    fridgeId?: string | null,
  ): Promise<"ok" | "insufficient" | "not_found" | "conflict">
  createMovement(input: CreateStockMovementInput): Promise<void>
}
