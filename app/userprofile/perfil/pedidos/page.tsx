"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Calendar, Package } from "lucide-react"
import {
  clearUserprofileAuthUser,
  getUserprofileAuthUser,
  type UserprofileUser,
} from "@/lib/userprofile-auth-store"
import { normalizePointOrderStatus } from "@/lib/mercadopago-point-status"
import { formatOrderNumberOrFallback } from "@/lib/order-number"
import { UserprofilePerfilShell } from "@/components/userprofile/perfil-shell"

type Order = {
  id: string
  order_number: number | null
  status: string
  total_amount: number | string
  created_at: string
  item_count: number
}

function getStatusPresentation(status: string) {
  const key = normalizePointOrderStatus(status)

  switch (key) {
    case "processed":
      return { label: "Concluido", className: "border-emerald-500/30 bg-emerald-500/15 text-emerald-300" }
    case "created":
    case "at_terminal":
    case "pending":
    case "processing":
      return { label: "Pendente", className: "border-amber-500/30 bg-amber-500/15 text-amber-300" }
    case "canceled":
      return { label: "Cancelado", className: "border-red-500/30 bg-red-500/15 text-red-300" }
    case "failed":
    case "error":
      return { label: "Falhou", className: "border-red-500/30 bg-red-500/15 text-red-300" }
    case "expired":
      return { label: "Expirado", className: "border-orange-500/30 bg-orange-500/15 text-orange-300" }
    case "action_required":
      return { label: "Acao necessaria", className: "border-amber-500/30 bg-amber-500/15 text-amber-300" }
    case "refunded":
      return { label: "Reembolsado", className: "border-zinc-500/30 bg-zinc-500/15 text-zinc-300" }
    default:
      return { label: key.charAt(0).toUpperCase() + key.slice(1), className: "border-zinc-500/30 bg-zinc-500/15 text-zinc-300" }
  }
}

function formatCurrency(value: number | string) {
  const numeric = typeof value === "number" ? value : Number(String(value).replace(",", "."))
  if (!Number.isFinite(numeric)) return "R$ 0,00"
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(numeric)
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "--/--/----"
  return new Intl.DateTimeFormat("pt-BR").format(date)
}

function formatOrderNumber(order: Order) {
  return formatOrderNumberOrFallback(order.order_number, order.id.slice(0, 8).toUpperCase())
}

export default function PedidosPage() {
  const router = useRouter()
  const [authUser, setAuthUser] = useState<UserprofileUser | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const currentUser = getUserprofileAuthUser()
    if (!currentUser) {
      router.replace("/userprofile/login")
      return
    }

    const userId = currentUser.id
    setAuthUser(currentUser)

    async function loadOrders() {
      try {
        const response = await fetch(`/api/userprofile/orders?userId=${userId}`)
        const data = await response.json().catch(() => null)

        if (response.status === 401 || response.status === 404) {
          clearUserprofileAuthUser()
          router.replace("/userprofile/login")
          return
        }

        if (!response.ok || !Array.isArray(data)) {
          setError("Nao foi possivel carregar seus pedidos.")
          return
        }

        setOrders(data as Order[])
      } catch {
        setError("Nao foi possivel carregar seus pedidos.")
      } finally {
        setIsLoading(false)
      }
    }

    loadOrders()
  }, [router])

  function handleLogout() {
    clearUserprofileAuthUser()
    router.replace("/userprofile")
  }

  if (isLoading && !authUser) return null

  return (
    <UserprofilePerfilShell
      title="Historico de Pedidos"
      description="Veja o status de cada compra e acompanhe seus ultimos pedidos com praticidade."
      onLogout={handleLogout}
    >
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.45, delay: 0.08 }}>
        {error && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>
        )}

        {!isLoading && orders.length === 0 ? (
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900/45 p-10 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-800/80">
              <Package className="h-7 w-7 text-zinc-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">Nenhum pedido encontrado</h2>
            <p className="mt-2 text-sm text-zinc-400">Quando voce concluir uma compra, ela aparecera aqui automaticamente.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order, index) => {
              const status = getStatusPresentation(order.status)
              return (
                <motion.article
                  key={order.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.38, delay: 0.1 + index * 0.05 }}
                  className="rounded-2xl border border-zinc-800 bg-zinc-900/45 p-4 sm:p-5 transition-colors hover:border-zinc-700 hover:bg-zinc-900/75"
                >
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/15 text-orange-400">
                        <Package className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-zinc-500">Pedido</p>
                        <p className="font-semibold text-white">#{formatOrderNumber(order)}</p>
                      </div>
                    </div>
                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${status.className}`}>
                      {status.label}
                    </span>
                  </div>

                  <div className="mb-2 flex items-center gap-2 text-sm text-zinc-400">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDate(order.created_at)}</span>
                    <span className="text-zinc-600">|</span>
                    <span>{order.item_count} itens</span>
                  </div>

                  <p className="text-xl font-bold text-white">{formatCurrency(order.total_amount)}</p>
                </motion.article>
              )
            })}
          </div>
        )}
      </motion.div>
    </UserprofilePerfilShell>
  )
}
