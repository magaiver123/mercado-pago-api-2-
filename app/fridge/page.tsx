"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { getAuthUser } from "@/lib/auth-store"
import { clearSelectedFridge, setSelectedFridge } from "@/lib/fridge-store"
import { useCartStore } from "@/lib/cart-store"

type FridgeOption = {
  id: string
  name: string
  code: string
  is_primary?: boolean
}

export default function FridgeSelectionPage() {
  const router = useRouter()
  const clearCart = useCartStore((state) => state.clearCart)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fridges, setFridges] = useState<FridgeOption[]>([])

  useEffect(() => {
    const user = getAuthUser()
    if (!user) {
      router.replace("/auth/login")
      return
    }

    clearSelectedFridge()
    clearCart()

    async function loadFridges() {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch("/api/fridges/available", { cache: "no-store" })
        const data = await response.json().catch(() => ({}))
        if (!response.ok) {
          throw new Error(data?.error || "Nao foi possivel carregar geladeiras")
        }

        const list = Array.isArray(data?.fridges) ? data.fridges : []
        setFridges(list)
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Erro ao carregar geladeiras")
      } finally {
        setLoading(false)
      }
    }

    void loadFridges()
  }, [clearCart, router])

  const handleSelect = (fridge: FridgeOption) => {
    setSelectedFridge({
      id: fridge.id,
      name: fridge.name,
      code: fridge.code,
      is_primary: fridge.is_primary === true,
    })
    router.push("/menu")
  }

  return (
    <main className="min-h-screen bg-white px-4 py-8 sm:px-8 sm:py-10">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-8 flex flex-col items-center text-center">
          <Image
            src="/logologin.png"
            alt="Logo MR"
            width={260}
            height={120}
            priority
            className="mb-6 h-auto w-[230px] sm:w-[260px]"
          />
          <h1 className="text-4xl font-black tracking-tight text-black">
            Escolha a geladeira
          </h1>
          <p className="mt-2 text-sm font-medium text-black/70">
            O cardapio e o estoque serao carregados pela geladeira selecionada.
          </p>
        </div>

        <Card className="border border-orange-200">
          <CardContent className="space-y-4 p-5 sm:p-6">
            {loading ? (
              <p className="text-center text-sm text-black/70">Carregando geladeiras...</p>
            ) : null}

            {error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            {!loading && !error && fridges.length === 0 ? (
              <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-700">
                Nenhuma geladeira operacional encontrada para esta loja.
              </div>
            ) : null}

            {!loading && fridges.length > 0 ? (
              <div className="grid gap-3">
                {fridges.map((fridge) => (
                  <button
                    key={fridge.id}
                    onClick={() => handleSelect(fridge)}
                    className="w-full rounded-2xl border-2 border-orange-300 bg-white px-5 py-4 text-left transition hover:border-orange-500 hover:bg-orange-50"
                  >
                    <p className="text-xl font-bold text-orange-600">{fridge.name}</p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                      Codigo: {fridge.code}
                    </p>
                  </button>
                ))}
              </div>
            ) : null}

            <Button
              variant="outline"
              className="mt-2 w-full border-orange-400 text-orange-600 hover:bg-orange-50"
              onClick={() => router.push("/auth/login")}
            >
              Voltar
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
