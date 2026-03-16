export type PointOrderStatus =
  | "pending"
  | "processing"
  | "created"
  | "at_terminal"
  | "processed"
  | "failed"
  | "error"
  | "canceled"
  | "expired"
  | "action_required"
  | "refunded"
  | "unknown"

export const MERCADOPAGO_ACTION_TO_STATUS: Record<string, PointOrderStatus> = {
  "order.processed": "processed",
  "order.canceled": "canceled",
  "order.failed": "failed",
  "order.expired": "expired",
  "order.refunded": "refunded",
  "order.action_required": "action_required",
}

const FINAL_STATUSES = new Set<PointOrderStatus>(["processed", "failed", "error", "canceled", "expired", "refunded"])
const PENDING_STATUSES = new Set<PointOrderStatus>(["pending", "processing", "created", "at_terminal", "action_required", "unknown"])

export function normalizePointOrderStatus(value: unknown): PointOrderStatus {
  if (typeof value !== "string" || value.trim() === "") {
    return "unknown"
  }

  const normalized = value.toLowerCase()

  if (normalized === "cancelled") return "canceled"

  switch (normalized) {
    case "pending":
    case "processing":
    case "created":
    case "at_terminal":
    case "processed":
    case "failed":
    case "error":
    case "canceled":
    case "expired":
    case "action_required":
    case "refunded":
      return normalized
    default:
      return "unknown"
  }
}

export function mapWebhookActionToStatus(action: unknown): PointOrderStatus | null {
  if (typeof action !== "string") return null
  return MERCADOPAGO_ACTION_TO_STATUS[action] ?? null
}

export function isFinalPointOrderStatus(status: unknown): boolean {
  return FINAL_STATUSES.has(normalizePointOrderStatus(status))
}

export function isPendingPointOrderStatus(status: unknown): boolean {
  return PENDING_STATUSES.has(normalizePointOrderStatus(status))
}

export function getPaymentRouteByStatus(status: unknown): string | null {
  const normalized = normalizePointOrderStatus(status)

  switch (normalized) {
    case "processed":
      return "/payment/receipt"
    case "failed":
    case "error":
      return "/payment/failed"
    case "canceled":
      return "/payment/canceled"
    case "expired":
      return "/payment/expired"
    case "action_required":
      return "/payment/action_required"
    case "refunded":
      return "/payment/refunded"
    default:
      return null
  }
}

