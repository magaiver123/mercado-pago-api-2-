import { AppError } from "@/api/utils/app-error"
import { sanitizeString } from "@/api/utils/sanitize"
import { getRepositoryFactory } from "@/api/repositories/repository-factory"
import { resolveTotemPrintContextService } from "@/api/services/printing/resolve-totem-print-context-service"
import {
  PrintErrorCode,
  normalizeAgentId,
} from "@/api/services/printing/printing-domain"

interface AgentAckSuccessInput {
  deviceId: unknown
  agentId: unknown
  jobId: unknown
}

interface AgentAckFailureInput {
  deviceId: unknown
  agentId: unknown
  jobId: unknown
  error: unknown
  errorCode: unknown
  retryable: unknown
}

function classifyAgentFailure(errorMessage: string): { errorCode: PrintErrorCode; retryable: boolean } {
  const normalized = errorMessage.toLowerCase()
  if (normalized.includes("timeout")) {
    return { errorCode: "PRINTER_TCP_TIMEOUT", retryable: true }
  }
  if (normalized.includes("econnrefused") || normalized.includes("refused")) {
    return { errorCode: "PRINTER_CONNECTION_REFUSED", retryable: true }
  }
  if (normalized.includes("paper") || normalized.includes("sem papel")) {
    return { errorCode: "PRINTER_OUT_OF_PAPER", retryable: true }
  }
  if (normalized.includes("payload")) {
    return { errorCode: "RECEIPT_PAYLOAD_INVALID", retryable: false }
  }
  if (normalized.includes("render")) {
    return { errorCode: "ESCPOS_RENDER_ERROR", retryable: false }
  }

  return { errorCode: "API_UNAVAILABLE", retryable: true }
}

function normalizeProvidedErrorCode(value: unknown): PrintErrorCode | null {
  const normalized = sanitizeString(value)
  if (!normalized) return null

  const allowed: PrintErrorCode[] = [
    "API_UNAVAILABLE",
    "DB_UNAVAILABLE",
    "TOTEM_CONTEXT_MISSING",
    "KIOSK_SESSION_INVALID",
    "TOTEM_INACTIVE",
    "TOTEM_MAINTENANCE",
    "PRINTER_NOT_CONFIGURED",
    "PRINTER_INACTIVE",
    "HEARTBEAT_EXPIRED",
    "AGENT_OFFLINE",
    "CLAIM_CONFLICT",
    "JOB_STALE_CLAIM",
    "PRINTER_TCP_TIMEOUT",
    "PRINTER_CONNECTION_REFUSED",
    "PRINTER_OUT_OF_PAPER",
    "RECEIPT_PAYLOAD_INVALID",
    "ORDER_ID_INVALID",
    "STORE_CONTEXT_MISMATCH",
    "ORDER_ALREADY_PRINTED",
    "ORDER_ALREADY_QUEUED",
    "REQUEUE_NOT_ALLOWED",
    "ACK_DUPLICATE",
    "ACK_OUT_OF_ORDER",
    "ESCPOS_RENDER_ERROR",
    "AGENT_AUTH_INVALID",
    "AGENT_AUTH_REQUIRED",
  ]

  return allowed.includes(normalized as PrintErrorCode)
    ? (normalized as PrintErrorCode)
    : null
}

export async function agentAckPrintJobSuccessService(input: AgentAckSuccessInput) {
  const { totem } = await resolveTotemPrintContextService(input.deviceId, {
    requireActivePrinter: false,
  })
  const jobId = sanitizeString(input.jobId)
  const agentId = normalizeAgentId(input.agentId, `agent:${totem.id}`)

  if (!jobId) {
    throw new AppError("jobId inválido", 400, "ORDER_ID_INVALID", true, false)
  }

  const repositories = getRepositoryFactory()
  const result = await repositories.printJob.markPrinted({
    jobId,
    totemId: totem.id,
    agentId,
    printedAt: new Date().toISOString(),
  })
  if (result.outcome === "not_found") {
    throw new AppError("Job não encontrado para confirmação", 404, "ORDER_ID_INVALID", true, false)
  }

  if (result.outcome !== "applied") {
    await repositories.totemPrinter.updateHeartbeat({
      totemId: totem.id,
      heartbeatAt: new Date().toISOString(),
      status: "ack_ignored",
      error: result.outcome,
    })

    return {
      success: true,
      applied: false,
      code: result.outcome === "duplicate" ? "ACK_DUPLICATE" : "ACK_OUT_OF_ORDER",
      status: result.status,
    }
  }

  await repositories.totemPrinter.updateHeartbeat({
    totemId: totem.id,
    heartbeatAt: new Date().toISOString(),
    status: "printed",
    error: null,
  })

  return {
    success: true,
    applied: true,
    code: "PRINTED",
    status: result.status,
  }
}

export async function agentAckPrintJobFailureService(input: AgentAckFailureInput) {
  const { totem } = await resolveTotemPrintContextService(input.deviceId, {
    requireActivePrinter: false,
  })
  const jobId = sanitizeString(input.jobId)
  const agentId = normalizeAgentId(input.agentId, `agent:${totem.id}`)

  if (!jobId) {
    throw new AppError("jobId inválido", 400, "ORDER_ID_INVALID", true, false)
  }

  const error =
    sanitizeString(input.error) ?? "Falha desconhecida no agente de impressão"
  const classified = classifyAgentFailure(error)
  const providedErrorCode = normalizeProvidedErrorCode(input.errorCode)
  const retryable = typeof input.retryable === "boolean" ? input.retryable : classified.retryable

  const repositories = getRepositoryFactory()
  const globalSettings = await repositories.printGlobalSettings.getDefault()
  const updated = await repositories.printJob.markFailure({
    jobId,
    totemId: totem.id,
    agentId,
    error,
    errorCode: providedErrorCode ?? classified.errorCode,
    retryable,
    maxRetryAttempts: globalSettings.max_retry_attempts,
    queueClaimIntervalMs: globalSettings.queue_claim_interval_ms,
  })

  if (updated.outcome === "not_found") {
    throw new AppError("Job não encontrado para registrar falha", 404, "ORDER_ID_INVALID", true, false)
  }

  if (updated.outcome !== "applied") {
    await repositories.totemPrinter.updateHeartbeat({
      totemId: totem.id,
      heartbeatAt: new Date().toISOString(),
      status: "ack_ignored",
      error: `${providedErrorCode ?? classified.errorCode}:${updated.outcome}`,
    })

    return {
      success: true,
      applied: false,
      code: updated.outcome === "duplicate" ? "ACK_DUPLICATE" : "ACK_OUT_OF_ORDER",
      status: updated.status,
    }
  }

  await repositories.totemPrinter.updateHeartbeat({
    totemId: totem.id,
    heartbeatAt: new Date().toISOString(),
    status: retryable ? "retrying" : "failed",
    error: `${providedErrorCode ?? classified.errorCode}:${error}`,
  })

  return {
    success: true,
    applied: true,
    status: updated.status,
    code: providedErrorCode ?? classified.errorCode,
    retryable,
  }
}
