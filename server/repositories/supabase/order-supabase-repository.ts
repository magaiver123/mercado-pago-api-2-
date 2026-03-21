import { AppError } from "@/api/utils/app-error"
import { OrderRecord } from "@/api/types/domain"
import { BaseSupabaseRepository } from "@/api/repositories/supabase/base-supabase-repository"
import { OrderRepository, PendingStockProcessingOrder, RegisterOrderInput, RegisterOrderResult } from "@/api/repositories/contracts/order-repository"

export class OrderSupabaseRepository extends BaseSupabaseRepository implements OrderRepository {
  async registerOrder(input: RegisterOrderInput): Promise<RegisterOrderResult> {
    const { data, error } = await this.db
      .from("orders")
      .insert({
        store_id: input.storeId,
        user_id: input.userId,
        mercadopago_order_id: input.mercadopagoOrderId,
        total_amount: input.totalAmount,
        payment_method: input.paymentMethod,
        status: input.status,
        items: input.items,
      })
      .select("id, order_number")
      .single()

    if (error || !data) {
      if (error?.code === "23505") {
        const { data: existing, error: existingError } = await this.db
          .from("orders")
          .select("id, order_number")
          .eq("mercadopago_order_id", input.mercadopagoOrderId)
          .maybeSingle()

        if (!existingError && existing) {
          return {
            id: existing.id as string,
            orderNumber: (existing.order_number as number | null) ?? null,
          }
        }
      }

      throw new AppError("Erro ao registrar pedido", 500)
    }

    return {
      id: data.id as string,
      orderNumber: (data.order_number as number | null) ?? null,
    }
  }

  async getStatusByMercadopagoOrderId(orderId: string): Promise<{ status: string; created_at: string; stock_processed: boolean } | null> {
    const { data, error } = await this.db
      .from("orders")
      .select("status, created_at, stock_processed")
      .eq("mercadopago_order_id", orderId)
      .single()
    if (error || !data) return null
    return data as { status: string; created_at: string; stock_processed: boolean }
  }

  async getAccessContextByMercadopagoOrderId(orderId: string): Promise<{ user_id: string; store_id: string } | null> {
    const { data, error } = await this.db
      .from("orders")
      .select("user_id, store_id")
      .eq("mercadopago_order_id", orderId)
      .maybeSingle()

    if (error || !data) return null
    return data as { user_id: string; store_id: string }
  }

  async listPendingStockProcessingByStoreId(storeId: string, limit: number): Promise<PendingStockProcessingOrder[]> {
    const { data, error } = await this.db
      .from("orders")
      .select("id, mercadopago_order_id, status, stock_processed, created_at")
      .eq("store_id", storeId)
      .eq("stock_processed", false)
      .not("mercadopago_order_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(limit)

    if (error) {
      throw new AppError("Erro ao listar pedidos pendentes de processamento de estoque", 500)
    }

    return (data as PendingStockProcessingOrder[] | null) ?? []
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

  async findForStockProcessing(mercadopagoOrderId: string): Promise<Pick<OrderRecord, "id" | "store_id" | "items" | "stock_processed"> | null> {
    const { data, error } = await this.db
      .from("orders")
      .select("id, store_id, items, stock_processed")
      .eq("mercadopago_order_id", mercadopagoOrderId)
      .single()

    if (error || !data) return null
    return data as Pick<OrderRecord, "id" | "store_id" | "items" | "stock_processed">
  }

  async claimForProcessedHandling(
    mercadopagoOrderId: string,
    lockAt: string,
  ): Promise<Pick<OrderRecord, "id" | "store_id" | "items" | "stock_processed"> | null> {
    const { data, error } = await this.db
      .from("orders")
      .update({
        processing_lock_at: lockAt,
      })
      .eq("mercadopago_order_id", mercadopagoOrderId)
      .eq("stock_processed", false)
      .is("processing_lock_at", null)
      .select("id, store_id, items, stock_processed")
      .maybeSingle()

    if (error) {
      // Backward compatibility: environments sem migration 012 (sem processing_lock_at).
      if (error.code === "42703") {
        const legacyOrder = await this.findForStockProcessing(mercadopagoOrderId)
        if (!legacyOrder || legacyOrder.stock_processed) return null
        return legacyOrder
      }
      throw new AppError("Erro ao bloquear processamento de pedido", 500)
    }

    if (!data) return null
    return data as Pick<OrderRecord, "id" | "store_id" | "items" | "stock_processed">
  }

  async releaseProcessingLock(orderId: string): Promise<void> {
    const { error } = await this.db
      .from("orders")
      .update({
        processing_lock_at: null,
      })
      .eq("id", orderId)

    if (error) {
      if (error.code === "42703") return
      throw new AppError("Erro ao liberar lock de processamento do pedido", 500)
    }
  }

  async updateStatusByMercadopagoOrderId(mercadopagoOrderId: string, status: string): Promise<void> {
    const { error } = await this.db
      .from("orders")
      .update({ status })
      .eq("mercadopago_order_id", mercadopagoOrderId)

    if (error) {
      throw new AppError("Erro ao atualizar status do pedido", 500)
    }
  }

  async markStockProcessed(orderId: string): Promise<void> {
    const { error } = await this.db
      .from("orders")
      .update({
        status: "processed",
        stock_processed: true,
        processing_lock_at: null,
      })
      .eq("id", orderId)

    if (error) {
      if (error.code === "42703") {
        const { error: fallbackError } = await this.db
          .from("orders")
          .update({
            status: "processed",
            stock_processed: true,
          })
          .eq("id", orderId)

        if (!fallbackError) return
      }
      throw new AppError("Erro ao marcar pedido como processado", 500)
    }
  }
}
