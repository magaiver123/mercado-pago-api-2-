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
  const { totem, printer } = await resolveTotemPrintContextService(input.deviceId, {
    requireActivePrinter: false,
  })

  if (printer) {
    await getRepositoryFactory().totemPrinter.updateHeartbeat({
      totemId: totem.id,
      heartbeatAt: new Date().toISOString(),
      status: sanitizeString(input.status),
      error: sanitizeString(input.error),
      agentVersion: sanitizeString(input.agentVersion),
    })
  }

  return {
    success: true,
    pollIntervalMs: 2500,
    printerConfigured: Boolean(printer),
    totemId: totem.id,
  }
}
