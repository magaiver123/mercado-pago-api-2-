"use client"

import { Button } from "@/components/ui/button"
import { X, Plus, Minus, Trash2, ShoppingBag } from "lucide-react"
import { useCartStore } from "@/lib/cart-store"
import Image from "next/image"

interface CartProps {
  isOpen: boolean
  onClose: () => void
  onCheckout: () => void
}

export function Cart({ isOpen, onClose, onCheckout }: CartProps) {
  const { items, updateQuantity, removeItem, getTotal, clearCart } = useCartStore()
  const total = getTotal()

  if (!isOpen) return null

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-sm md:max-w-md bg-white z-50 shadow-xl flex flex-col">
        {/* Header */}
        <div className="border-b border-orange-200 p-4 md:p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShoppingBag className="h-6 w-6 text-orange-500" />
            <h2 className="text-black font-bold text-xl md:text-2xl">Seu Carrinho</h2>
          </div>
          <button onClick={onClose} className="text-black/60 hover:text-black p-2">
            <X className="h-6 w-6" />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <ShoppingBag className="h-20 w-20 text-orange-300 mb-4" />
            <p className="text-black text-lg font-semibold">Seu carrinho está vazio</p>
            <p className="text-black/60 text-sm mt-2">Adicione produtos para continuar</p>
            <Button
              onClick={onClose}
              variant="outline"
              className="mt-6 border-orange-300 text-orange-600 hover:bg-orange-500 hover:text-white"
            >
              Continuar Comprando
            </Button>
          </div>
        ) : (
          <>
            {/* Items */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="bg-white border border-orange-200 rounded-lg p-4 flex gap-4"
                >
                  <div className="w-20 h-20 rounded-lg overflow-hidden bg-orange-100 relative flex-shrink-0">
                    <Image src={item.image || "/placeholder.svg"} alt={item.name} fill className="object-cover" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-black font-semibold text-base truncate">{item.name}</h3>
                    <p className="text-black font-bold text-lg">
                      R$ {item.price.toFixed(2).replace(".", ",")}
                    </p>

                    <div className="flex items-center gap-3 mt-3">
                      <div className="flex items-center bg-orange-100 rounded-lg">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="p-2 text-orange-600 hover:bg-orange-200 rounded-l-lg"
                        >
                          <Minus className="h-4 w-4" />
                        </button>

                        <span className="text-black font-semibold w-8 text-center">
                          {item.quantity}
                        </span>

                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="p-2 text-orange-600 hover:bg-orange-200 rounded-r-lg"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>

                      <button
                        onClick={() => removeItem(item.id)}
                        className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-black font-bold text-lg">
                      R$ {(item.price * item.quantity).toFixed(2).replace(".", ",")}
                    </p>
                  </div>
                </div>
              ))}

              <Button
                onClick={clearCart}
                variant="outline"
                className="w-full border-red-300 text-red-600 hover:bg-red-500 hover:text-white"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Limpar Carrinho
              </Button>
            </div>

            {/* Footer */}
            <div className="border-t border-orange-200 p-4 md:p-6 space-y-4 bg-white">
              <div className="flex items-center justify-between text-black">
                <span className="text-lg">Subtotal</span>
                <span className="text-2xl font-bold">
                  R$ {total.toFixed(2).replace(".", ",")}
                </span>
              </div>

              <Button
                onClick={onCheckout}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold text-lg py-6"
                size="lg"
              >
                Finalizar Pedido
              </Button>
            </div>
          </>
        )}
      </div>
    </>
  )
}
