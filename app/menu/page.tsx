"use client"

export const dynamic = "force-dynamic"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { ShoppingBag } from "lucide-react"
import { products, categories } from "@/lib/products"
import { useCartStore } from "@/lib/cart-store"
import { Cart } from "@/components/cart"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { getAuthUser, clearAuthUser } from "@/lib/auth-store"

// 👉 ÚNICO export default
export default function MenuPage() {
  return <MenuClient />
}

function MenuClient() {
  const [selectedCategory, setSelectedCategory] = useState("lanches")
  const [isCartOpen, setIsCartOpen] = useState(false)

  const { addItem, getTotal, getItemCount } = useCartStore()
  const router = useRouter()

  useEffect(() => {
    const user = getAuthUser()
    if (!user) {
      router.push("/auth/login")
    }
  }, [router])

  const filteredProducts = products.filter(
    (p) => p.category === selectedCategory
  )

  const itemCount = getItemCount()
  const total = getTotal()

  const handleCheckout = () => {
    setIsCartOpen(false)
    router.push("/checkout")
  }

  const handleCancel = () => {
    clearAuthUser()
    router.push("/")
  }

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Header */}
      <header className="bg-white border-b border-zinc-200 px-6 py-4 flex items-center justify-between">
        <Image
          src="/logologin.png"
          alt="Logo Menu"
          width={96}
          height={64}
          className="object-contain"
          priority
        />

        <Button
          variant="outline"
          size="lg"
          className="border-2 border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white rounded-full"
          onClick={handleCancel}
        >
          Cancelar
        </Button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-56 bg-white border-r border-zinc-200 overflow-y-auto p-6">
          <h2 className="text-black font-bold text-2xl mb-6">MENU</h2>

          <nav className="space-y-2">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                  selectedCategory === category.id
                    ? "bg-orange-500 text-white font-semibold"
                    : "text-black hover:bg-orange-100"
                }`}
              >
                {category.name}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main */}
        <main className="flex-1 overflow-y-auto p-8">
          <h1 className="text-black font-bold text-3xl mb-8 capitalize">
            {categories.find((c) => c.id === selectedCategory)?.name}
          </h1>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((product) => (
              <button
                key={product.id}
                onClick={() => addItem(product)}
                className="bg-white border border-zinc-200 rounded-xl overflow-hidden hover:ring-2 hover:ring-orange-500 transition-all"
              >
                <div className="aspect-square relative bg-orange-100">
                  <Image
                    src={product.image || "/placeholder.svg"}
                    alt={product.name}
                    fill
                    className="object-cover"
                  />
                </div>

                <div className="p-4 text-left">
                  <h3 className="text-black font-semibold mb-1">
                    {product.name}
                  </h3>

                  <p className="text-orange-600 font-bold text-lg">
                    R$ {product.price.toFixed(2).replace(".", ",")}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer
        className="bg-orange-500 hover:bg-orange-600 px-6 py-5 cursor-pointer"
        onClick={() => itemCount > 0 && setIsCartOpen(true)}
      >
        <div className="flex items-center justify-between text-white font-bold">
          <div className="flex items-center gap-3">
            <ShoppingBag />
            {itemCount === 0
              ? "Seu carrinho está vazio"
              : `${itemCount} itens no carrinho`}
          </div>

          {itemCount > 0 && `R$ ${total.toFixed(2).replace(".", ",")}`}
        </div>
      </footer>

      {isCartOpen && (
        <Cart
          isOpen={isCartOpen}
          onClose={() => setIsCartOpen(false)}
          onCheckout={handleCheckout}
        />
      )}
    </div>
  )
}
