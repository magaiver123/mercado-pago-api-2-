import { getRepositoryFactory } from "@/api/repositories/repository-factory"
import { getHeartbeatWindows } from "@/api/services/printing/printing-domain"
import { getSupabaseAdminClient } from "@/api/config/database"

interface ListGlobalPrinterStatusInput {
  limit: unknown
}

function normalizeLimit(value: unknown) {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return Math.min(value, 500)
  }
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10)
    if (Number.isInteger(parsed) && parsed > 0) {
      return Math.min(parsed, 500)
    }
  }
  return 200
}

export async function listGlobalPrinterStatusService(input: ListGlobalPrinterStatusInput) {
  const repositories = getRepositoryFactory()
  const limit = normalizeLimit(input.limit)
  const globalSettings = await repositories.printGlobalSettings.getDefault()
  const heartbeatWindows = getHeartbeatWindows(globalSettings.heartbeat_interval_ms)

  const [totems, printers, recentJobs] = await Promise.all([
    repositories.totem.listAll(limit),
    repositories.totemPrinter.listAll(limit),
    repositories.printJob.listRecentGlobal(limit * 3),
  ])
  const db = getSupabaseAdminClient()
  const storeIds = [...new Set(totems.map((totem) => totem.store_id))]
  const totemIds = totems.map((totem) => totem.id)
  const [{ data: storesData }, { data: totemNamesData }] = await Promise.all([
    storeIds.length > 0
      ? db.from("stores").select("id, name").in("id", storeIds)
      : Promise.resolve({ data: [] as Array<{ id: string; name: string }> }),
    totemIds.length > 0
      ? db.from("totems").select("id, name").in("id", totemIds)
      : Promise.resolve({ data: [] as Array<{ id: string; name: string }> }),
  ])
  const storeNameById = new Map<string, string>(
    ((storesData as Array<{ id: string; name: string }> | null) ?? []).map((store) => [
      store.id,
      store.name,
    ]),
  )
  const totemNameById = new Map<string, string>(
    ((totemNamesData as Array<{ id: string; name: string }> | null) ?? []).map((totem) => [
      totem.id,
      totem.name,
    ]),
  )

  const printerByTotem = new Map(printers.map((printer) => [printer.totem_id, printer]))
  const jobsByTotem = new Map<string, typeof recentJobs>()

  for (const job of recentJobs) {
    const bucket = jobsByTotem.get(job.totem_id) ?? []
    bucket.push(job)
    jobsByTotem.set(job.totem_id, bucket)
  }

  const items = []
  let online = 0
  let offline = 0
  let degraded = 0
  let error = 0
  let unknown = 0
  let disabled = 0
  let noPrinter = 0
  let maintenance = 0
  let failed = 0
  let pendingQueue = 0

  for (const totem of totems) {
    const printer = printerByTotem.get(totem.id) ?? null
    const totemJobs = jobsByTotem.get(totem.id) ?? []
    const pendingJobs = totemJobs.filter((job) => job.status === "pending").length
    const failedJobs = totemJobs.filter((job) => job.status === "failed").length
    const printedJob = totemJobs.find((job) => job.status === "printed") ?? null
    if (pendingJobs > 0) pendingQueue += 1

    let status:
      | "online"
      | "offline"
      | "degraded"
      | "error"
      | "unknown"
      | "disabled"
      | "no_printer"
      | "maintenance"
      | "failed" = "unknown"

    if (totem.maintenance_mode) {
      status = "maintenance"
      maintenance += 1
    } else if (!printer) {
      status = "no_printer"
      noPrinter += 1
    } else if (!printer.is_active) {
      status = "disabled"
      disabled += 1
    } else if (!printer.last_heartbeat_at) {
      status = "offline"
      offline += 1
    } else {
      const heartbeatTs = new Date(printer.last_heartbeat_at).getTime()
      if (!Number.isFinite(heartbeatTs)) {
        status = "unknown"
        unknown += 1
      } else {
        const ageMs = Date.now() - heartbeatTs
        if (ageMs <= heartbeatWindows.onlineMaxAgeMs) {
          if (printer.last_error || failedJobs > 0) {
            status = "failed"
            failed += 1
            error += 1
          } else if (printer.last_status === "retrying") {
            status = "degraded"
            degraded += 1
          } else {
            status = "online"
            online += 1
          }
        } else if (ageMs <= heartbeatWindows.degradedMaxAgeMs) {
          status = "degraded"
          degraded += 1
        } else {
          status = "offline"
          offline += 1
        }
      }
    }

    items.push({
      printerId: printer?.id ?? null,
      totemId: totem.id,
      totemName: totemNameById.get(totem.id) ?? null,
      storeId: totem.store_id,
      storeName: storeNameById.get(totem.store_id) ?? "Loja",
      deviceId: totem.device_id ?? null,
      totemStatus: totem.status ?? null,
      maintenanceMode: Boolean(totem.maintenance_mode),
      model: printer?.model ?? null,
      connectionType: printer?.connection_type ?? null,
      ip: printer?.ip ?? null,
      port: printer?.port ?? null,
      escposProfile: printer?.escpos_profile ?? null,
      isActive: printer?.is_active ?? false,
      healthStatus: status,
      lastHeartbeatAt: printer?.last_heartbeat_at ?? null,
      lastStatus: printer?.last_status ?? null,
      lastError: printer?.last_error ?? null,
      agentVersion: printer?.agent_version ?? null,
      pendingJobs,
      failedJobs,
      lastPrintedAt: printedJob?.printed_at ?? null,
      updatedAt: printer?.updated_at ?? null,
    })
  }

  return {
    settings: {
      heartbeatIntervalMs: globalSettings.heartbeat_interval_ms,
      queueClaimIntervalMs: globalSettings.queue_claim_interval_ms,
      maxRetryAttempts: globalSettings.max_retry_attempts,
      onlineWindowMs: heartbeatWindows.onlineMaxAgeMs,
      degradedWindowMs: heartbeatWindows.degradedMaxAgeMs,
    },
    summary: {
      total: items.length,
      online,
      offline,
      degraded,
      error,
      unknown,
      disabled,
      noPrinter,
      maintenance,
      failed,
      pendingQueue,
    },
    items,
  }
}
