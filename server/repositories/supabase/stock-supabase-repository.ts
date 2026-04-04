import { AppError } from "@/api/utils/app-error"
import { BaseSupabaseRepository } from "@/api/repositories/supabase/base-supabase-repository"
import { CreateStockMovementInput, StockRepository } from "@/api/repositories/contracts/stock-repository"

export class StockSupabaseRepository extends BaseSupabaseRepository implements StockRepository {
  private async getCurrentStockLegacy(storeId: string, productId: string): Promise<number | null> {
    const { data, error } = await this.db
      .from("product_stock")
      .select("quantity")
      .eq("store_id", storeId)
      .eq("product_id", productId)
      .single()

    if (error || !data) return null
    return typeof data.quantity === "number" ? data.quantity : null
  }

  async getCurrentStock(storeId: string, productId: string, fridgeId?: string | null): Promise<number | null> {
    if (!fridgeId) {
      return this.getCurrentStockLegacy(storeId, productId)
    }

    const primary = await this.db
      .from("fridge_inventory")
      .select("quantity, is_active")
      .eq("store_id", storeId)
      .eq("fridge_id", fridgeId)
      .eq("product_id", productId)
      .maybeSingle()

    if (primary.error) {
      if (primary.error.code !== "42P01" && primary.error.code !== "42703") {
        throw new AppError("Erro ao carregar estoque da geladeira", 500)
      }
      return this.getCurrentStockLegacy(storeId, productId)
    }

    if (!primary.data) return null
    if (primary.data.is_active === false) return null
    return typeof primary.data.quantity === "number" ? primary.data.quantity : null
  }

  async updateStock(
    storeId: string,
    productId: string,
    quantity: number,
    updatedAt: string,
    fridgeId?: string | null,
  ): Promise<void> {
    if (!fridgeId) {
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
      return
    }

    const primary = await this.db
      .from("fridge_inventory")
      .update({
        quantity,
        updated_at: updatedAt,
      })
      .eq("store_id", storeId)
      .eq("fridge_id", fridgeId)
      .eq("product_id", productId)
      .eq("is_active", true)

    if (primary.error) {
      if (primary.error.code !== "42P01" && primary.error.code !== "42703") {
        throw new AppError("Erro ao atualizar estoque da geladeira", 500)
      }

      await this.updateStock(storeId, productId, quantity, updatedAt, null)
    }
  }

  async decrementStockIfEnough(
    storeId: string,
    productId: string,
    quantityToDecrement: number,
    updatedAt: string,
    fridgeId?: string | null,
  ): Promise<"ok" | "insufficient" | "not_found" | "conflict"> {
    const currentQuantity = await this.getCurrentStock(storeId, productId, fridgeId)
    if (currentQuantity === null) return "not_found"
    if (currentQuantity < quantityToDecrement) return "insufficient"

    const nextQuantity = currentQuantity - quantityToDecrement

    if (!fridgeId) {
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

      if (error || !data) return "conflict"
      return "ok"
    }

    const primary = await this.db
      .from("fridge_inventory")
      .update({
        quantity: nextQuantity,
        updated_at: updatedAt,
      })
      .eq("store_id", storeId)
      .eq("fridge_id", fridgeId)
      .eq("product_id", productId)
      .eq("is_active", true)
      .eq("quantity", currentQuantity)
      .select("quantity")
      .maybeSingle()

    if (primary.error) {
      if (primary.error.code !== "42P01" && primary.error.code !== "42703") {
        return "conflict"
      }
      return this.decrementStockIfEnough(storeId, productId, quantityToDecrement, updatedAt, null)
    }

    if (!primary.data) return "conflict"
    return "ok"
  }

  async createMovement(input: CreateStockMovementInput): Promise<void> {
    const payload: Record<string, unknown> = {
      store_id: input.storeId,
      product_id: input.productId,
      type: "saida",
      quantity: input.quantity,
      reason: input.reason,
      user_id: null,
      created_at: input.createdAt,
    }

    if (input.fridgeId) {
      payload.fridge_id = input.fridgeId
    }

    const { error } = await this.db.from("stock_movements").insert(payload)

    if (error) {
      if ((error.code === "42703" || error.code === "23503") && "fridge_id" in payload) {
        const legacyPayload = { ...payload }
        delete legacyPayload.fridge_id
        const legacy = await this.db.from("stock_movements").insert(legacyPayload)
        if (!legacy.error) return
      }
      throw new AppError("Erro ao registrar movimentacao de estoque", 500)
    }
  }
}
