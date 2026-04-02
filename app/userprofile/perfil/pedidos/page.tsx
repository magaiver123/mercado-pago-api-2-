"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import {
  Calendar,
  CircleDollarSign,
  ListOrdered,
  Mail,
  MessageCircle,
  Package,
} from "lucide-react"
import {
  clearUserprofileAuthUser,
  getUserprofileAuthUser,
  type UserprofileUser,
} from "@/lib/userprofile-auth-store"
import { normalizePointOrderStatus } from "@/lib/mercadopago-point-status"
import { formatOrderNumberOrFallback } from "@/lib/order-number"
import { UserprofilePerfilShell } from "@/components/userprofile/perfil-shell"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

const WHATSAPP_SUPPORT_BASE_URL = "https://wa.me/5551995881730"

type Order = {
  id: string
  mercadopago_order_id: string
  order_number: number | null
  status: string
  payment_method: string | null
  total_amount: number | string
  created_at: string
  item_count: number
  items: unknown
}

type NormalizedOrderItem = {
  name: string
  quantity: number
  unitPrice: number
}

type OrderFeedback = {
  type: "success" | "error"
  message: string
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
      return {
        label: key.charAt(0).toUpperCase() + key.slice(1),
        className: "border-zinc-500/30 bg-zinc-500/15 text-zinc-300",
      }
  }
}

function parseNonNegativeNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, value)
  }

  if (typeof value === "string") {
    const normalized = value.replace(",", ".").trim()
    const parsed = Number(normalized)
    if (Number.isFinite(parsed)) {
      return Math.max(0, parsed)
    }
  }

  return null
}

function normalizeOrderItems(items: unknown): NormalizedOrderItem[] {
  if (!Array.isArray(items)) return []

  return items
    .map((item) => {
      if (!item || typeof item !== "object") return null

      const name = typeof (item as { name?: unknown }).name === "string"
        ? ((item as { name?: string }).name ?? "").trim()
        : ""
      const quantity = parseNonNegativeNumber((item as { quantity?: unknown }).quantity)
      const unitPrice = parseNonNegativeNumber(
        (item as { unitPrice?: unknown; price?: unknown }).unitPrice ??
          (item as { unitPrice?: unknown; price?: unknown }).price,
      )

      return {
        name: name || "Item",
        quantity: Math.max(1, Math.floor(quantity ?? 1)),
        unitPrice: unitPrice ?? 0,
      }
    })
    .filter((item): item is NormalizedOrderItem => Boolean(item))
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

function formatDateTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "--/--/---- --:--:--"
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date)
}

function formatPaymentMethod(value: string | null | undefined) {
  const normalized = String(value ?? "").trim().toLowerCase()

  if (normalized === "pix" || normalized === "qr") return "PIX"
  if (normalized === "debit_card") return "Cartao de Debito"
  if (normalized === "credit_card") return "Cartao de Credito"

  return normalized ? (value as string).trim() : "Nao informado"
}

function formatOrderNumber(order: Pick<Order, "order_number" | "id">) {
  return formatOrderNumberOrFallback(order.order_number, order.id.slice(0, 8).toUpperCase())
}

function maskCustomerCpf(value: string | null | undefined) {
  const raw = String(value ?? "").trim()
  if (!raw) return "CPF nao informado"

  const digits = raw.replace(/\D/g, "")
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}.***.***-${digits.slice(9)}`
  }

  return raw
}

function maskCustomerName(value: string | null | undefined) {
  const raw = String(value ?? "").trim()
  if (!raw) return "Nao informado"

  const words = raw.split(/\s+/).filter(Boolean)
  if (words.length === 0) return "Nao informado"

  return words
    .map((word) => {
      if (word.length <= 1) return "*"
      const visible = Math.min(3, word.length - 1)
      return `${word.slice(0, visible)}${"*".repeat(word.length - visible)}`
    })
    .join(" ")
}

function getItemsTotal(items: NormalizedOrderItem[]) {
  return items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
}

function buildOrderSupportMessage(order: Order, authUser: UserprofileUser | null) {
  const status = getStatusPresentation(order.status).label
  const items = normalizeOrderItems(order.items)
  const orderNumber = formatOrderNumber(order)
  const paymentMethod = formatPaymentMethod(order.payment_method)
  const total = formatCurrency(order.total_amount)
  const customerName = maskCustomerName(authUser?.name)
  const customerCpf = maskCustomerCpf(authUser?.cpf)

  const lines = [
    "Tive um problema com esse pedido:",
    "",
    `Pedido: #${orderNumber}`,
    `Data e hora: ${formatDateTime(order.created_at)}`,
    `Status: ${status}`,
    `Pagamento: ${paymentMethod}`,
    `Cliente: ${customerName}`,
    `CPF: ${customerCpf}`,
    "",
    "Itens:",
    ...items.map((item) => {
      const itemTotal = item.quantity * item.unitPrice
      return `- ${item.name} x${item.quantity} (${formatCurrency(itemTotal)})`
    }),
    "",
    `Total: ${total}`,
    `Order ID: ${order.mercadopago_order_id}`,
  ]

  return lines.join("\n")
}

function buildSupportUrl(order: Order, authUser: UserprofileUser | null) {
  const message = buildOrderSupportMessage(order, authUser)
  return `${WHATSAPP_SUPPORT_BASE_URL}?text=${encodeURIComponent(message)}`
}

export default function PedidosPage() {
  const router = useRouter()
  const [authUser, setAuthUser] = useState<UserprofileUser | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [openOrderId, setOpenOrderId] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sendingEmailOrderId, setSendingEmailOrderId] = useState<string | null>(null)
  const [feedbackByOrder, setFeedbackByOrder] = useState<Record<string, OrderFeedback>>({})

  useEffect(() => {
    const currentUser = getUserprofileAuthUser()
    if (!currentUser) {
      router.replace("/userprofile/login")
      return
    }

    setAuthUser(currentUser)

    async function loadOrders() {
      try {
        const response = await fetch("/api/userprofile/orders")
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

  async function handleSendReceiptEmail(order: Order) {
    setFeedbackByOrder((prev) => {
      const next = { ...prev }
      delete next[order.id]
      return next
    })

    try {
      setSendingEmailOrderId(order.id)
      const response = await fetch("/api/userprofile/orders/send-receipt-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId: order.mercadopago_order_id,
        }),
      })

      const data = await response.json().catch(() => null)
      if (!response.ok) {
        setFeedbackByOrder((prev) => ({
          ...prev,
          [order.id]: {
            type: "error",
            message: data?.error ?? "Nao foi possivel enviar o comprovante por e-mail.",
          },
        }))
        return
      }

      setFeedbackByOrder((prev) => ({
        ...prev,
        [order.id]: {
          type: "success",
          message: "Comprovante enviado para o e-mail da sua conta.",
        },
      }))
    } catch {
      setFeedbackByOrder((prev) => ({
        ...prev,
        [order.id]: {
          type: "error",
          message: "Falha de conexao ao enviar comprovante por e-mail.",
        },
      }))
    } finally {
      setSendingEmailOrderId(null)
    }
  }

  function handleLogout() {
    clearUserprofileAuthUser()
    router.replace("/userprofile")
  }

  const hasOrders = useMemo(() => !isLoading && orders.length > 0, [isLoading, orders.length])

  if (isLoading && !authUser) return null

  return (
    <UserprofilePerfilShell
      title="Historico de Pedidos"
      description="Veja detalhes de cada compra, acione suporte e envie seu comprovante digital por e-mail."
      onLogout={handleLogout}
    >
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.45, delay: 0.08 }}>
        {error && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>
        )}

        {!hasOrders ? (
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900/45 p-10 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-800/80">
              <Package className="h-7 w-7 text-zinc-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">Nenhum pedido encontrado</h2>
            <p className="mt-2 text-sm text-zinc-400">Quando voce concluir uma compra, ela aparecera aqui automaticamente.</p>
          </div>
        ) : (
          <Accordion
            type="single"
            collapsible
            value={openOrderId}
            onValueChange={setOpenOrderId}
            className="space-y-3"
          >
            {orders.map((order, index) => {
              const status = getStatusPresentation(order.status)
              const items = normalizeOrderItems(order.items)
              const itemCount = order.item_count > 0 ? order.item_count : items.length
              const subtotal = getItemsTotal(items)
              const total = parseNonNegativeNumber(order.total_amount) ?? subtotal
              const discounts = Math.max(0, subtotal - total)
              const isSendingEmail = sendingEmailOrderId === order.id
              const feedback = feedbackByOrder[order.id]
              const supportUrl = buildSupportUrl(order, authUser)

              return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.38, delay: 0.1 + index * 0.05 }}
                >
                  <AccordionItem
                    value={order.id}
                    className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/45 px-4 transition-colors hover:border-zinc-700 hover:bg-zinc-900/75"
                  >
                    <AccordionTrigger className="py-4 hover:no-underline">
                      <div className="w-full pr-4">
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

                        <div className="mb-2 flex flex-wrap items-center gap-2 text-sm text-zinc-400">
                          <Calendar className="h-4 w-4" />
                          <span>{formatDate(order.created_at)}</span>
                          <span className="text-zinc-600">|</span>
                          <span>{itemCount} itens</span>
                          <span className="text-zinc-600">|</span>
                          <span>{formatPaymentMethod(order.payment_method)}</span>
                        </div>

                        <p className="text-xl font-bold text-white">{formatCurrency(order.total_amount)}</p>
                      </div>
                    </AccordionTrigger>

                    <AccordionContent className="pb-5">
                      <div className="grid gap-3 rounded-xl border border-zinc-800/80 bg-zinc-950/50 p-4 sm:grid-cols-2">
                        <div className="space-y-1">
                          <p className="text-xs uppercase tracking-wide text-zinc-500">Data e hora</p>
                          <p className="text-sm text-zinc-200">{formatDateTime(order.created_at)}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs uppercase tracking-wide text-zinc-500">Forma de pagamento</p>
                          <p className="text-sm text-zinc-200">{formatPaymentMethod(order.payment_method)}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs uppercase tracking-wide text-zinc-500">Status</p>
                          <p className="text-sm text-zinc-200">{status.label}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs uppercase tracking-wide text-zinc-500">Total do pedido</p>
                          <p className="text-sm font-semibold text-zinc-100">{formatCurrency(total)}</p>
                        </div>
                      </div>

                      <div className="mt-4 rounded-xl border border-zinc-800/80 bg-zinc-950/50 p-4">
                        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-100">
                          <ListOrdered className="h-4 w-4 text-zinc-400" />
                          Itens detalhados do pedido
                        </div>

                        {items.length === 0 ? (
                          <p className="text-sm text-zinc-400">Nenhum item encontrado para este pedido.</p>
                        ) : (
                          <div className="space-y-2">
                            {items.map((item, itemIndex) => {
                              const itemTotal = item.quantity * item.unitPrice
                              return (
                                <div
                                  key={`${order.id}-${item.name}-${itemIndex}`}
                                  className="flex items-start justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-900/55 px-3 py-2"
                                >
                                  <div>
                                    <p className="text-sm text-zinc-200">{item.name}</p>
                                    <p className="text-xs text-zinc-500">Qtd: {item.quantity}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-xs text-zinc-500">Unitario: {formatCurrency(item.unitPrice)}</p>
                                    <p className="text-sm font-semibold text-zinc-100">{formatCurrency(itemTotal)}</p>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}

                        <div className="mt-3 border-t border-zinc-800 pt-3 text-xs text-zinc-400">
                          <div className="flex items-center justify-between">
                            <span>Subtotal</span>
                            <span>{formatCurrency(subtotal)}</span>
                          </div>
                          <div className="mt-1 flex items-center justify-between">
                            <span>Descontos</span>
                            <span>{formatCurrency(discounts)}</span>
                          </div>
                          <div className="mt-1 flex items-center justify-between text-sm font-semibold text-zinc-100">
                            <span>Total</span>
                            <span>{formatCurrency(total)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-2 sm:grid-cols-2">
                        <button
                          type="button"
                          onClick={() => void handleSendReceiptEmail(order)}
                          disabled={isSendingEmail}
                          className="inline-flex items-center justify-center gap-2 rounded-lg border border-orange-500/35 bg-orange-500/12 px-4 py-2.5 text-sm font-medium text-orange-300 transition-colors hover:bg-orange-500/20 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          <Mail className="h-4 w-4" />
                          {isSendingEmail ? "Enviando comprovante..." : "Enviar comprovante no e-mail"}
                        </button>

                        <a
                          href={supportUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-2.5 text-sm font-medium text-green-300 transition-colors hover:bg-green-500/20"
                        >
                          <MessageCircle className="h-4 w-4" />
                          Suporte deste pedido
                        </a>
                      </div>

                      {feedback && (
                        <div
                          className={`mt-3 rounded-lg border px-3 py-2 text-xs ${
                            feedback.type === "success"
                              ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-300"
                              : "border-red-500/35 bg-red-500/10 text-red-300"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <CircleDollarSign className="h-3.5 w-3.5" />
                            <span>{feedback.message}</span>
                          </div>
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                </motion.div>
              )
            })}
          </Accordion>
        )}
      </motion.div>
    </UserprofilePerfilShell>
  )
}

