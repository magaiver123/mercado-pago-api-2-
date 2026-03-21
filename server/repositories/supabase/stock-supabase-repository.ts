import { AppError } from "@/api/utils/app-error"
import { BaseSupabaseRepository } from "@/api/repositories/supabase/base-supabase-repository"
import { CreateStockMovementInput, StockRepository } from "@/api/repositories/contracts/stock-repository"

export class StockSupabaseRepository extends BaseSupabaseRepository implements StockRepository {
  async getCurrentStock(storeId: string, productId: string): Promise<number | null> {
    const { data, error } = await this.db
      .from("product_stock")
      .select("quantity")
      .eq("store_id", storeId)
      .eq("product_id", productId)
      .single()
    if (error || !data) return null
    return typeof data.quantity === "number" ? data.quantity : null
  }

  async updateStock(storeId: string, productId: string, quantity: number, updatedAt: string): Promise<void> {
    const { error } = await this.db
      .from("product_stock")
      .update({
        quantity,
        updated_at: updatedAt,
      })
      .eq("store_id", storeId)
      .eq("product_id", productId)

    if (error) {
      throw new AppError("Erro ao atualizar estoque", 500)
    }
  }

  async decrementStockIfEnough(
    storeId: string,
    productId: string,
    quantityToDecrement: number,
    updatedAt: string,
  ): Promise<"ok" | "insufficient" | "not_found" | "conflict"> {
    const currentQuantity = await this.getCurrentStock(storeId, productId)
    if (currentQuantity === null) return "not_found"
    if (currentQuantity < quantityToDecrement) return "insufficient"

    const nextQuantity = currentQuantity - quantityToDecrement
    const { data, error } = await this.db
      .from("product_stock")
      .update({
        quantity: nextQuantity,
        updated_at: updatedAt,
      })
      .eq("store_id", storeId)
      .eq("product_id", productId)
      .eq("quantity", currentQuantity)
      .select("quantity")
      .maybeSingle()

    if (error) return "conflict"
    if (!data) return "conflict"
    return "ok"
  }

  async createMovement(input: CreateStockMovementInput): Promise<void> {
    const { error } = await this.db.from("stock_movements").insert({
      store_id: input.storeId,
      product_id: input.productId,
      type: "saida",
      quantity: input.quantity,
      reason: input.reason,
      user_id: null,
      created_at: input.createdAt,
    })

    if (error) {
      throw new AppError("Erro ao registrar movimentacao de estoque", 500)
    }
  }
}
