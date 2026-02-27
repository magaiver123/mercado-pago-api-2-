import { BaseSupabaseRepository } from "@/api/repositories/supabase/base-supabase-repository"
import { CreateStockMovementInput, StockRepository } from "@/api/repositories/contracts/stock-repository"

export class StockSupabaseRepository extends BaseSupabaseRepository implements StockRepository {
  async getCurrentStock(productId: string): Promise<number | null> {
    const { data, error } = await this.db.from("product_stock").select("quantity").eq("product_id", productId).single()
    if (error || !data) return null
    return typeof data.quantity === "number" ? data.quantity : null
  }

  async updateStock(productId: string, quantity: number, updatedAt: string): Promise<void> {
    await this.db
      .from("product_stock")
      .update({
        quantity,
        updated_at: updatedAt,
      })
      .eq("product_id", productId)
  }

  async createMovement(input: CreateStockMovementInput): Promise<void> {
    await this.db.from("stock_movements").insert({
      product_id: input.productId,
      type: "saida",
      quantity: input.quantity,
      reason: input.reason,
      user_id: null,
      created_at: input.createdAt,
    })
  }
}

