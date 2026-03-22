import { ReceiptData } from "@/lib/receipt-types"
import { sanitizeString } from "@/api/utils/sanitize"

function sanitizeNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback
}

function sanitizeReceiptData(value: unknown, orderId: string): ReceiptData | null {
  if (!value || typeof value !== "object") return null

  const raw = value as Partial<ReceiptData>
  const items = Array.isArray(raw.items)
    ? raw.items
        .map((item) => ({
          name: sanitizeString(item?.name) ?? "Item",
          quantity: Math.max(1, Math.floor(sanitizeNumber(item?.quantity, 1))),
          unitPrice: Math.max(0, sanitizeNumber(item?.unitPrice, 0)),
        }))
        .filter((item) => item.name.length > 0)
    : []

  if (items.length === 0) return null

  return {
    orderId,
    orderNumber:
      typeof raw.orderNumber === "number" && Number.isFinite(raw.orderNumber)
        ? raw.orderNumber
        : null,
    createdAt: sanitizeString(raw.createdAt) ?? new Date().toISOString(),
    customerName: sanitizeString(raw.customerName ?? null),
    customerDocument: sanitizeString(raw.customerDocument ?? null) ?? undefined,
    items,
    paymentMethod: sanitizeString(raw.paymentMethod) ?? "Nao informado",
    subtotal: Math.max(0, sanitizeNumber(raw.subtotal, 0)),
    discounts: Math.max(0, sanitizeNumber(raw.discounts, 0)),
    total: Math.max(0, sanitizeNumber(raw.total, 0)),
    storeName: sanitizeString(raw.storeName) ?? "Autoatendimento",
    storeLegalName: sanitizeString(raw.storeLegalName ?? null) ?? undefined,
    storeAddress: sanitizeString(raw.storeAddress ?? null) ?? undefined,
    storeTaxId: sanitizeString(raw.storeTaxId ?? null) ?? undefined,
    storePhone: sanitizeString(raw.storePhone ?? null) ?? undefined,
    storeLogoPath: sanitizeString(raw.storeLogoPath ?? null) ?? undefined,
    authorizationCode: sanitizeString(raw.authorizationCode ?? null) ?? undefined,
    accessKey: sanitizeString(raw.accessKey ?? null) ?? undefined,
    additionalMessage: sanitizeString(raw.additionalMessage ?? null) ?? undefined,
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
