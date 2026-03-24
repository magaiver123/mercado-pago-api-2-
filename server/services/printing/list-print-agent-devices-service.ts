import { getRepositoryFactory } from "@/api/repositories/repository-factory"

interface ListPrintAgentDevicesInput {
  limit: unknown
}

function normalizeLimit(value: unknown): number {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return Math.min(500, value)
  }
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10)
    if (Number.isInteger(parsed) && parsed > 0) {
      return Math.min(500, parsed)
    }
  }
  return 200
}

function toHealthStatus(input: {
  status: string
  revokedAt: string | null
  lastSeenAt: string | null
}) {
  if (input.status === "revoked" || input.revokedAt) return "revoked"
  if (input.status === "disabled") return "disabled"
  if (!input.lastSeenAt) return "offline"

  const ts = new Date(input.lastSeenAt).getTime()
  if (!Number.isFinite(ts)) return "unknown"
  const age = Date.now() - ts
  if (age <= 30_000) return "online"
  if (age <= 120_000) return "degraded"
  return "offline"
}

export async function listPrintAgentDevicesService(input: ListPrintAgentDevicesInput) {
  const repositories = getRepositoryFactory()
  const devices = await repositories.printAgentDevice.listDevices(normalizeLimit(input.limit))
  const items = devices.map((device) => ({
    id: device.id,
    deviceId: device.device_id,
    agentId: device.agent_id,
    keyId: device.key_id,
    status: device.status,
    healthStatus: toHealthStatus({
      status: device.status,
      revokedAt: device.revoked_at,
      lastSeenAt: device.last_seen_at,
    }),
    minSupportedVersion: device.min_supported_version,
    lastSeenAt: device.last_seen_at,
    lastStatus: device.last_status,
    lastError: device.last_error,
    lastAgentVersion: device.last_agent_version,
    revokedAt: device.revoked_at,
    createdAt: device.created_at,
    updatedAt: device.updated_at,
  }))

  return {
    success: true,
    code: "PRINT_AGENT_DEVICES_LISTED",
    summary: {
      total: items.length,
      online: items.filter((item) => item.healthStatus === "online").length,
      degraded: items.filter((item) => item.healthStatus === "degraded").length,
      offline: items.filter((item) => item.healthStatus === "offline").length,
      disabled: items.filter((item) => item.healthStatus === "disabled").length,
      revoked: items.filter((item) => item.healthStatus === "revoked").length,
      unknown: items.filter((item) => item.healthStatus === "unknown").length,
    },
    items,
  }
}
