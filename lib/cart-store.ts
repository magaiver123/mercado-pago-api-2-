import { create } from "zustand"


/* =========================
   PRODUCT TYPE (REAL)
========================= */

export type Product = {
  id: string
  name: string
  price: number
  image_url?: string | null
  stock: number // 🔥 vem direto do banco
}

/* =========================
   CART ITEM
========================= */

export interface CartItem extends Product {
  quantity: number
}

/* =========================
   STORE
========================= */

interface CartStore {
  items: CartItem[]
  addItem: (product: Product) => boolean
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => boolean
  clearCart: () => void
  getTotal: () => number
  getItemCount: () => number
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],

  addItem: (product) => {
    const items = get().items
    const existingItem = items.find((item) => item.id === product.id)

    if (product.stock <= 0) return false

    if (existingItem) {
      if (existingItem.quantity >= existingItem.stock) {
        return false
      }

      set({
        items: items.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        ),
      })

      return true
    }

    set({
      items: [...items, { ...product, quantity: 1 }],
    })

    return true
  },

  removeItem: (productId) => {
    set({
      items: get().items.filter((item) => item.id !== productId),
    })
  },

  updateQuantity: (productId, quantity) => {
    const item = get().items.find((i) => i.id === productId)
    if (!item) return false

    if (quantity <= 0) {
      get().removeItem(productId)
      return true
    }

    if (quantity > item.stock) {
      return false // 🚫 limite atingido
    }

    set({
      items: get().items.map((item) =>
        item.id === productId ? { ...item, quantity } : item
      ),
    })

    return true
  },

  clearCart: () => {
    set({ items: [] })
  },

  getTotal: () => {
    return get().items.reduce(
      (total, item) => total + item.price * item.quantity,
      0
    )
  },

  getItemCount: () => {
    return get().items.reduce(
      (count, item) => count + item.quantity,
      0
    )
  },
}))
