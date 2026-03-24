import { getRepositoryFactory } from "@/api/repositories/repository-factory"
import { getSupabaseAdminClient } from "@/api/config/database"
import { AppError } from "@/api/utils/app-error"

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
  const limit = normalizeLimit(input.limit)
  const devices = await repositories.printAgentDevice.listDevices(limit)
  const db = getSupabaseAdminClient()

  const deviceIds = devices
    .map((device) => device.device_id)
    .filter((id): id is string => typeof id === "string" && id.trim() !== "")

  const { data: totemsData, error: totemsError } =
    deviceIds.length > 0
      ? await db
          .from("totems")
          .select("id, device_id, store_id, name, status, maintenance_mode")
          .in("device_id", deviceIds)
      : { data: [] as Array<Record<string, any>> }
  if (totemsError) {
    throw new AppError("Erro ao consultar vinculo de totems dos agents", 500, "DB_UNAVAILABLE", true, false)
  }

  const totems = ((totemsData as Array<{
    id: string
    device_id: string | null
    store_id: string | null
    name: string | null
    status: string | null
    maintenance_mode: boolean | null
  }> | null) ?? [])

  const totemByDeviceId = new Map(
    totems
      .filter((totem) => typeof totem.device_id === "string" && totem.device_id.trim() !== "")
      .map((totem) => [totem.device_id!, totem]),
  )

  const storeIds = [...new Set(
    totems.map((totem) => totem.store_id).filter((storeId): storeId is string => Boolean(storeId)),
  )]
  const { data: storesData, error: storesError } =
    storeIds.length > 0
      ? await db.from("stores").select("id, name").in("id", storeIds)
      : { data: [] as Array<{ id: string; name: string }> }
  if (storesError) {
    throw new AppError("Erro ao consultar lojas dos agents", 500, "DB_UNAVAILABLE", true, false)
  }

  const storeNameById = new Map(
    (((storesData as Array<{ id: string; name: string }> | null) ?? [])).map((store) => [
      store.id,
      store.name,
    ]),
  )

  const totemIds = [...new Set(
    totems.map((totem) => totem.id).filter((id): id is string => typeof id === "string" && id !== ""),
  )]

  const { data: printersData, error: printersError } =
    totemIds.length > 0
      ? await db
          .from("totem_printers")
          .select(
            "totem_id, is_active, ip, port, model, escpos_profile, last_heartbeat_at, last_status, last_error, agent_version",
          )
          .in("totem_id", totemIds)
      : { data: [] as Array<Record<string, any>> }
  if (printersError) {
    throw new AppError("Erro ao consultar status das impressoras dos agents", 500, "DB_UNAVAILABLE", true, false)
  }

  const printerByTotemId = new Map(
    ((((printersData as Array<{
      totem_id: string
      is_active: boolean
      ip: string | null
      port: number | null
      model: string | null
      escpos_profile: string | null
      last_heartbeat_at: string | null
      last_status: string | null
      last_error: string | null
      agent_version: string | null
    }> | null) ?? []))).map((printer) => [printer.totem_id, printer]),
  )

  const items = devices.map((device) => {
    const totem = totemByDeviceId.get(device.device_id)
    const printer = totem ? printerByTotemId.get(totem.id) : null

    return {
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
      totem: totem
        ? {
            id: totem.id,
            name: totem.name,
            status: totem.status,
            maintenanceMode: Boolean(totem.maintenance_mode),
            storeId: totem.store_id,
            storeName: totem.store_id ? storeNameById.get(totem.store_id) ?? null : null,
            printer: printer
              ? {
                  isActive: printer.is_active,
                  ip: printer.ip,
                  port: printer.port,
                  model: printer.model,
                  escposProfile: printer.escpos_profile,
                  lastHeartbeatAt: printer.last_heartbeat_at,
                  lastStatus: printer.last_status,
                  lastError: printer.last_error,
                  agentVersion: printer.agent_version,
                }
              : null,
          }
        : null,
    }
  })

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
