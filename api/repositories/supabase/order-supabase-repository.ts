import { AppError } from "@/api/utils/app-error"
import { OrderRecord } from "@/api/types/domain"
import { BaseSupabaseRepository } from "@/api/repositories/supabase/base-supabase-repository"
import { OrderRepository, RegisterOrderInput } from "@/api/repositories/contracts/order-repository"

export class OrderSupabaseRepository extends BaseSupabaseRepository implements OrderRepository {
  async registerOrder(input: RegisterOrderInput): Promise<void> {
    await this.db.from("orders").insert({
      user_id: input.userId,
      mercadopago_order_id: input.mercadopagoOrderId,
      total_amount: input.totalAmount,
      payment_method: input.paymentMethod,
      status: input.status,
      items: input.items,
    })
  }

  async getStatusByMercadopagoOrderId(orderId: string): Promise<{ status: string; created_at: string } | null> {
    const { data, error } = await this.db.from("orders").select("status, created_at").eq("mercadopago_order_id", orderId).single()
    if (error || !data) return null
    return data as { status: string; created_at: string }
  }

  async listByUserId(
    userId: string,
  ): Promise<Array<Pick<OrderRecord, "id" | "order_number" | "status" | "total_amount" | "items" | "created_at">>> {
    const { data, error } = await this.db
      .from("orders")
      .select("id, order_number, status, total_amount, items, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (error) throw new AppError("Erro ao carregar pedidos", 500)
    return ((data as Array<Pick<OrderRecord, "id" | "order_number" | "status" | "total_amount" | "items" | "created_at">> | null) ??
      [])
  }

  async findForStockProcessing(mercadopagoOrderId: string): Promise<Pick<OrderRecord, "id" | "items" | "stock_processed"> | null> {
    const { data, error } = await this.db
      .from("orders")
      .select("id, items, stock_processed")
      .eq("mercadopago_order_id", mercadopagoOrderId)
      .single()

    if (error || !data) return null
    return data as Pick<OrderRecord, "id" | "items" | "stock_processed">
  }

  async updateStatusByMercadopagoOrderId(mercadopagoOrderId: string, status: string): Promise<void> {
    await this.db.from("orders").update({ status }).eq("mercadopago_order_id", mercadopagoOrderId)
  }

  async markStockProcessed(orderId: string): Promise<void> {
    await this.db
      .from("orders")
      .update({
        status: "processed",
        stock_processed: true,
      })
      .eq("id", orderId)
  }
}

