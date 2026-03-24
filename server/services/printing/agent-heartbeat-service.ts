import { sanitizeString } from "@/api/utils/sanitize"
import { getRepositoryFactory } from "@/api/repositories/repository-factory"
import { resolveTotemPrintContextService } from "@/api/services/printing/resolve-totem-print-context-service"
import { normalizeAgentId } from "@/api/services/printing/printing-domain"

interface AgentHeartbeatInput {
  deviceId: unknown
  agentId: unknown
  status: unknown
  error: unknown
  agentVersion: unknown
}

export async function agentHeartbeatService(input: AgentHeartbeatInput) {
  const repositories = getRepositoryFactory()
  const { totem, printer } = await resolveTotemPrintContextService(input.deviceId, {
    requireActivePrinter: false,
  })
  const globalSettings = await repositories.printGlobalSettings.getDefault()
  const now = new Date().toISOString()
  const normalizedStatus = sanitizeString(input.status)
  const normalizedError = sanitizeString(input.error)
  const normalizedAgentId = normalizeAgentId(input.agentId, `agent:${totem.id}`)
  const runtimeDeviceId = sanitizeString(input.deviceId)

  if (printer) {
    await repositories.totemPrinter.updateHeartbeat({
      totemId: totem.id,
      heartbeatAt: now,
      status: normalizedStatus,
      error: normalizedError,
      agentVersion: sanitizeString(input.agentVersion),
    })
  }
  if (runtimeDeviceId) {
    await repositories.printAgentDevice.updateRuntimeStatus({
      deviceId: runtimeDeviceId,
      seenAt: now,
      status: normalizedStatus,
      error: normalizedError,
      agentVersion: sanitizeString(input.agentVersion),
    })
  }

  return {
    success: true,
    code: "AGENT_HEARTBEAT_OK",
    pollIntervalMs: globalSettings.queue_claim_interval_ms,
    heartbeatIntervalMs: globalSettings.heartbeat_interval_ms,
    printerConfigured: Boolean(printer),
    totemId: totem.id,
    agentId: normalizedAgentId,
  }
}
