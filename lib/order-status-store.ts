// Simple in-memory store for order statuses received via webhook
// In production, you should use a database or Redis

type OrderStatus = {
  orderId: string
  state: string
  payment?: {
    id?: number
    state?: string
    type?: string
  }
  updatedAt: Date
}

class OrderStatusStore {
  private store = new Map<string, OrderStatus>()

  set(orderId: string, data: OrderStatus) {
    this.store.set(orderId, data)

    // Auto-cleanup after 1 hour
    setTimeout(
      () => {
        this.store.delete(orderId)
      },
      60 * 60 * 1000,
    )
  }

  get(orderId: string): OrderStatus | undefined {
    return this.store.get(orderId)
  }

  delete(orderId: string) {
    this.store.delete(orderId)
  }
}

export const orderStatusStore = new OrderStatusStore()
