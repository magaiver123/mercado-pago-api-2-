import { AppError } from "@/api/utils/app-error"
import { sanitizeString } from "@/api/utils/sanitize"
import { getRepositoryFactory } from "@/api/repositories/repository-factory"
import { resolveTotemPrintContextService } from "@/api/services/printing/resolve-totem-print-context-service"

interface AgentAckSuccessInput {
  deviceId: unknown
  jobId: unknown
}

interface AgentAckFailureInput {
  deviceId: unknown
  jobId: unknown
  error: unknown
  retryable: unknown
}

export async function agentAckPrintJobSuccessService(input: AgentAckSuccessInput) {
  const { totem } = await resolveTotemPrintContextService(input.deviceId, {
    requireActivePrinter: false,
  })
  const jobId = sanitizeString(input.jobId)

  if (!jobId) {
    throw new AppError("jobId invalido", 400)
  }

  const repositories = getRepositoryFactory()
  const ok = await repositories.printJob.markPrinted(jobId, totem.id, new Date().toISOString())
  if (!ok) {
    throw new AppError("Job nao encontrado para confirmacao", 404)
  }

  await repositories.totemPrinter.updateHeartbeat({
    totemId: totem.id,
    heartbeatAt: new Date().toISOString(),
    status: "printed",
    error: null,
  })

  return {
    success: true,
  }
}

export async function agentAckPrintJobFailureService(input: AgentAckFailureInput) {
  const { totem } = await resolveTotemPrintContextService(input.deviceId, {
    requireActivePrinter: false,
  })
  const jobId = sanitizeString(input.jobId)

  if (!jobId) {
    throw new AppError("jobId invalido", 400)
  }

  const error =
    sanitizeString(input.error) ?? "Falha desconhecida no agente de impressao"
  const retryable = input.retryable !== false

  const repositories = getRepositoryFactory()
  const updated = await repositories.printJob.markFailure({
    jobId,
    totemId: totem.id,
    error,
    retryable,
  })

  if (!updated) {
    throw new AppError("Job nao encontrado para registrar falha", 404)
  }

  await repositories.totemPrinter.updateHeartbeat({
    totemId: totem.id,
    heartbeatAt: new Date().toISOString(),
    status: retryable ? "retrying" : "failed",
    error,
  })

  return {
    success: true,
    status: updated.status,
  }
}
