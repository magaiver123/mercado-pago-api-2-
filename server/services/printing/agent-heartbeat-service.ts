import { sanitizeString } from "@/api/utils/sanitize"
import { getRepositoryFactory } from "@/api/repositories/repository-factory"
import { resolveTotemPrintContextService } from "@/api/services/printing/resolve-totem-print-context-service"

interface AgentHeartbeatInput {
  deviceId: unknown
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

  if (printer) {
    await repositories.totemPrinter.updateHeartbeat({
      totemId: totem.id,
      heartbeatAt: new Date().toISOString(),
      status: sanitizeString(input.status),
      error: sanitizeString(input.error),
      agentVersion: sanitizeString(input.agentVersion),
    })
  }

  return {
    success: true,
    pollIntervalMs: globalSettings.queue_claim_interval_ms,
    printerConfigured: Boolean(printer),
    totemId: totem.id,
  }
}
