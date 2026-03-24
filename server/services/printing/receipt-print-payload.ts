import { ReceiptData } from "@/lib/receipt-types"
import { sanitizeString } from "@/api/utils/sanitize"

const MAX_ITEMS = 120
const MAX_TEXT = 240
const MAX_ITEM_NAME = 80

function sanitizeNumber(value: unknown, fallback = 0): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback
  const normalized = Math.round(value * 100) / 100
  return normalized
}

function sanitizeText(value: unknown, maxLength = MAX_TEXT): string | null {
  const normalized = sanitizeString(value)
  if (!normalized) return null
  return normalized.slice(0, maxLength)
}

function sanitizeReceiptData(value: unknown, orderId: string): ReceiptData | null {
  if (!value || typeof value !== "object") return null

  const raw = value as Partial<ReceiptData>
  const items = Array.isArray(raw.items)
    ? raw.items
        .slice(0, MAX_ITEMS)
        .map((item) => ({
          name: sanitizeText(item?.name, MAX_ITEM_NAME) ?? "Item",
          quantity: Math.max(1, Math.floor(sanitizeNumber(item?.quantity, 1))),
          unitPrice: Math.max(0, sanitizeNumber(item?.unitPrice, 0)),
        }))
        .filter((item) => item.name.length > 0)
    : []

  if (items.length === 0) return null

  const itemsSubtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
  const rawSubtotal = Math.max(0, sanitizeNumber(raw.subtotal, itemsSubtotal))
  const normalizedSubtotal = rawSubtotal > 0 ? rawSubtotal : itemsSubtotal
  const rawDiscounts = Math.max(0, sanitizeNumber(raw.discounts, 0))
  const normalizedDiscounts = Math.min(rawDiscounts, normalizedSubtotal)
  const rawTotal = Math.max(0, sanitizeNumber(raw.total, normalizedSubtotal - normalizedDiscounts))
  const normalizedTotal = rawTotal > 0 ? rawTotal : Math.max(0, normalizedSubtotal - normalizedDiscounts)

  const createdAtRaw = sanitizeText(raw.createdAt, 80)
  const createdAtParsed = createdAtRaw ? new Date(createdAtRaw) : null
  const createdAt =
    createdAtParsed && Number.isFinite(createdAtParsed.getTime())
      ? createdAtParsed.toISOString()
      : new Date().toISOString()

  return {
    orderId,
    orderNumber:
      typeof raw.orderNumber === "number" && Number.isFinite(raw.orderNumber)
        ? raw.orderNumber
        : null,
    createdAt,
    customerName: sanitizeText(raw.customerName ?? null, 80),
    customerDocument: sanitizeText(raw.customerDocument ?? null, 32) ?? undefined,
    items,
    paymentMethod: sanitizeText(raw.paymentMethod, 64) ?? "Nao informado",
    subtotal: normalizedSubtotal,
    discounts: normalizedDiscounts,
    total: normalizedTotal,
    storeName: sanitizeText(raw.storeName, 120) ?? "Autoatendimento",
    storeLegalName: sanitizeText(raw.storeLegalName ?? null, 120) ?? undefined,
    storeAddress: sanitizeText(raw.storeAddress ?? null, 180) ?? undefined,
    storeTaxId: sanitizeText(raw.storeTaxId ?? null, 32) ?? undefined,
    storePhone: sanitizeText(raw.storePhone ?? null, 32) ?? undefined,
    storeLogoPath: sanitizeText(raw.storeLogoPath ?? null, 300) ?? undefined,
    authorizationCode: sanitizeText(raw.authorizationCode ?? null, 80) ?? undefined,
    accessKey: sanitizeText(raw.accessKey ?? null, 120) ?? undefined,
    additionalMessage: sanitizeText(raw.additionalMessage ?? null, 240) ?? undefined,
  }
}

export interface ReceiptPrintPayload {
  type: "receipt"
  orderId: string
  requestedAt: string
  receipt: ReceiptData
}

export function buildReceiptPrintPayload(input: {
  orderId: string
  receipt: unknown
}): ReceiptPrintPayload | null {
  const orderId = sanitizeString(input.orderId)
  if (!orderId) return null

  const receipt = sanitizeReceiptData(input.receipt, orderId)
  if (!receipt) return null

  return {
    type: "receipt",
    orderId,
    requestedAt: new Date().toISOString(),
    receipt,
  }
}
