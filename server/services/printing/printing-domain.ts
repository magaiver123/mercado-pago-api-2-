import { sanitizeString } from "@/api/utils/sanitize"

export const PRINT_JOB_ACTION_RECEIPT = "print_receipt" as const
export const PRINT_CONNECTION_TYPE_TCP = "tcp" as const
export const PRINT_PAPER_WIDTH_OPTIONS = [58, 76, 80, 82] as const

export type PrintPaperWidth = (typeof PRINT_PAPER_WIDTH_OPTIONS)[number]
export type PrintQueueResult = "queued" | "already_queued" | "already_printed" | "failed_previous"
export type PrintQueueCode =
  | "QUEUED"
  | "ORDER_ALREADY_QUEUED"
  | "ORDER_ALREADY_PRINTED"
  | "FAILED_PREVIOUS_REQUEUED"
  | "REQUEUE_NOT_ALLOWED"

export type PrintErrorCode =
  | "API_UNAVAILABLE"
  | "DB_UNAVAILABLE"
  | "TOTEM_CONTEXT_MISSING"
  | "KIOSK_SESSION_INVALID"
  | "TOTEM_INACTIVE"
  | "TOTEM_MAINTENANCE"
  | "PRINTER_NOT_CONFIGURED"
  | "PRINTER_INACTIVE"
  | "HEARTBEAT_EXPIRED"
  | "AGENT_OFFLINE"
  | "CLAIM_CONFLICT"
  | "JOB_STALE_CLAIM"
  | "PRINTER_TCP_TIMEOUT"
  | "PRINTER_CONNECTION_REFUSED"
  | "PRINTER_OUT_OF_PAPER"
  | "RECEIPT_PAYLOAD_INVALID"
  | "ORDER_ID_INVALID"
  | "STORE_CONTEXT_MISMATCH"
  | "ORDER_ALREADY_PRINTED"
  | "ORDER_ALREADY_QUEUED"
  | "REQUEUE_NOT_ALLOWED"
  | "ACK_DUPLICATE"
  | "ACK_OUT_OF_ORDER"
  | "ESCPOS_RENDER_ERROR"
  | "AGENT_AUTH_INVALID"
  | "AGENT_AUTH_REQUIRED"

export function normalizePort(value: unknown, fallback = 9100): number {
  const raw =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseInt(value, 10)
        : Number.NaN

  if (!Number.isFinite(raw)) return fallback
  const parsed = Math.floor(raw)
  if (parsed < 1 || parsed > 65535) return fallback
  return parsed
}

export function normalizePaperWidth(value: unknown, fallback: PrintPaperWidth = 80): PrintPaperWidth {
  const raw =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseInt(value, 10)
        : Number.NaN

  if (!Number.isFinite(raw)) return fallback
  const parsed = Math.floor(raw) as PrintPaperWidth
  return PRINT_PAPER_WIDTH_OPTIONS.includes(parsed) ? parsed : fallback
}

export function normalizeAgentId(value: unknown, fallback: string): string {
  const normalized = sanitizeString(value)
  if (!normalized) return fallback
  return normalized.slice(0, 120)
}

export function computeLeaseMs(input: {
  heartbeatIntervalMs: number
  queueClaimIntervalMs: number
}): number {
  const heartbeatWindow = Math.max(5_000, Math.floor(input.heartbeatIntervalMs * 3))
  const queueWindow = Math.max(5_000, Math.floor(input.queueClaimIntervalMs * 4))
  return Math.max(15_000, heartbeatWindow, queueWindow)
}

export function computeRetryDelayMs(input: {
  attempts: number
  queueClaimIntervalMs: number
}): number {
  const safeAttempts = Math.max(1, Math.min(8, Math.floor(input.attempts)))
  const base = Math.max(500, input.queueClaimIntervalMs)
  return Math.min(120_000, base * 2 ** (safeAttempts - 1))
}

export function getHeartbeatWindows(heartbeatIntervalMs: number) {
  const onlineMaxAgeMs = Math.max(15_000, heartbeatIntervalMs * 2)
  const degradedMaxAgeMs = Math.max(30_000, heartbeatIntervalMs * 4)
  return {
    onlineMaxAgeMs,
    degradedMaxAgeMs,
  }
}
