import { sanitizeString } from "@/api/utils/sanitize"
import { getRepositoryFactory } from "@/api/repositories/repository-factory"
import { resolveTotemPrintContextService } from "@/api/services/printing/resolve-totem-print-context-service"

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

  await repositories.totemPrinter.updateHeartbeat({
    totemId: totem.id,
    heartbeatAt: now,
    status: "online",
    agentVersion: sanitizeString(input.agentVersion),
  })

  const agentId = sanitizeString(input.agentId) ?? `agent:${totem.id}`
  const job = await repositories.printJob.claimNextPending({
    totemId: totem.id,
    claimedBy: agentId,
    claimedAt: now,
  })

  if (!job) {
    return {
      success: true,
      hasJob: false,
      pollIntervalMs: globalSettings.queue_claim_interval_ms,
    }
  }

  return {
    success: true,
    hasJob: true,
    pollIntervalMs: Math.max(500, Math.floor(globalSettings.queue_claim_interval_ms / 2)),
    job: {
      id: job.id,
      orderId: job.order_id,
      action: job.action,
      payload: job.payload,
      attempts: job.attempts,
      createdAt: job.created_at,
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
