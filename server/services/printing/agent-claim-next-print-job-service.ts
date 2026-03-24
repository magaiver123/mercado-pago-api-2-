import { sanitizeString } from "@/api/utils/sanitize"
import { getRepositoryFactory } from "@/api/repositories/repository-factory"
import { resolveTotemPrintContextService } from "@/api/services/printing/resolve-totem-print-context-service"
import { computeLeaseMs, normalizeAgentId } from "@/api/services/printing/printing-domain"

interface AgentClaimNextPrintJobInput {
  deviceId: unknown
  agentId: unknown
  agentVersion: unknown
}

export async function agentClaimNextPrintJobService(input: AgentClaimNextPrintJobInput) {
  const { totem, printer } = await resolveTotemPrintContextService(input.deviceId)
  const repositories = getRepositoryFactory()
  const globalSettings = await repositories.printGlobalSettings.getDefault()
  const now = new Date().toISOString()
  const leaseMs = computeLeaseMs({
    heartbeatIntervalMs: globalSettings.heartbeat_interval_ms,
    queueClaimIntervalMs: globalSettings.queue_claim_interval_ms,
  })

  await repositories.totemPrinter.updateHeartbeat({
    totemId: totem.id,
    heartbeatAt: now,
    status: "online",
    agentVersion: sanitizeString(input.agentVersion),
  })

  const agentId = normalizeAgentId(input.agentId, `agent:${totem.id}`)
  const job = await repositories.printJob.claimNextPending({
    totemId: totem.id,
    claimedBy: agentId,
    claimedAt: now,
    maxRetryAttempts: globalSettings.max_retry_attempts,
    leaseMs,
  })

  if (!job) {
    return {
      success: true,
      hasJob: false,
      code: "QUEUE_EMPTY",
      pollIntervalMs: globalSettings.queue_claim_interval_ms,
      heartbeatIntervalMs: globalSettings.heartbeat_interval_ms,
    }
  }

  return {
    success: true,
    hasJob: true,
    code: "JOB_CLAIMED",
    pollIntervalMs: globalSettings.queue_claim_interval_ms,
    heartbeatIntervalMs: globalSettings.heartbeat_interval_ms,
    job: {
      id: job.id,
      orderId: job.order_id,
      action: job.action,
      payload: job.payload,
      attempts: job.attempts,
      createdAt: job.created_at,
      leaseExpiresAt: job.lease_expires_at,
    },
    printer: {
      id: printer!.id,
      connectionType: printer!.connection_type,
      ip: printer!.ip,
      port: printer!.port,
      model: printer!.model,
      escposProfile: printer!.escpos_profile,
      paperWidthMm: printer!.paper_width_mm,
    },
  }
}
