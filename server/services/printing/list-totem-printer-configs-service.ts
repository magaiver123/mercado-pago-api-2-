import { getRepositoryFactory } from "@/api/repositories/repository-factory"
import { getHeartbeatWindows } from "@/api/services/printing/printing-domain"
import { getSupabaseAdminClient } from "@/api/config/database"

interface ListTotemPrinterConfigsInput {
  storeId: string
}

export async function listTotemPrinterConfigsService(
  input: ListTotemPrinterConfigsInput,
) {
  const repositories = getRepositoryFactory()
  const [totems, printers, recentJobs, globalSettings] = await Promise.all([
    repositories.totem.listByStoreId(input.storeId),
    repositories.totemPrinter.listByStoreId(input.storeId),
    repositories.printJob.listRecentByStoreId(input.storeId, 200),
    repositories.printGlobalSettings.getDefault(),
  ])
  const db = getSupabaseAdminClient()
  const totemIds = totems.map((totem) => totem.id)
  const { data: totemNamesData } =
    totemIds.length > 0
      ? await db.from("totems").select("id, name").in("id", totemIds)
      : { data: [] as Array<{ id: string; name: string }> }
  const totemNameById = new Map<string, string>(
    ((totemNamesData as Array<{ id: string; name: string }> | null) ?? []).map((totem) => [
      totem.id,
      totem.name,
    ]),
  )

  const printerByTotemId = new Map(printers.map((printer) => [printer.totem_id, printer]))
  const jobsByTotem = new Map<string, typeof recentJobs>()
  const windows = getHeartbeatWindows(globalSettings.heartbeat_interval_ms)

  for (const job of recentJobs) {
    const bucket = jobsByTotem.get(job.totem_id) ?? []
    bucket.push(job)
    jobsByTotem.set(job.totem_id, bucket)
  }

  return {
    defaults: {
      defaultPort: globalSettings.default_port,
      defaultEscposProfile: globalSettings.default_escpos_profile,
      defaultPaperWidthMm: globalSettings.default_paper_width_mm,
      heartbeatIntervalMs: globalSettings.heartbeat_interval_ms,
      queueClaimIntervalMs: globalSettings.queue_claim_interval_ms,
      maxRetryAttempts: globalSettings.max_retry_attempts,
      onlineWindowMs: windows.onlineMaxAgeMs,
      degradedWindowMs: windows.degradedMaxAgeMs,
    },
    totems: totems.map((totem) => {
      const printer = printerByTotemId.get(totem.id) ?? null
      const totemJobs = jobsByTotem.get(totem.id) ?? []
      const pendingJobs = totemJobs.filter((job) => job.status === "pending").length
      const failedJobs = totemJobs.filter((job) => job.status === "failed").length
      let healthStatus:
        | "online"
        | "offline"
        | "degraded"
        | "failed"
        | "disabled"
        | "no_printer"
        | "maintenance" = "offline"

      if (totem.maintenance_mode) {
        healthStatus = "maintenance"
      } else if (!printer) {
        healthStatus = "no_printer"
      } else if (!printer.is_active) {
        healthStatus = "disabled"
      } else if (!printer.last_heartbeat_at) {
        healthStatus = "offline"
      } else {
        const heartbeatTs = new Date(printer.last_heartbeat_at).getTime()
        if (!Number.isFinite(heartbeatTs)) {
          healthStatus = "offline"
        } else {
          const ageMs = Date.now() - heartbeatTs
          if (ageMs <= windows.onlineMaxAgeMs) {
            if (printer.last_error || failedJobs > 0) {
              healthStatus = "failed"
            } else if (printer.last_status === "retrying") {
              healthStatus = "degraded"
            } else {
              healthStatus = "online"
            }
          } else if (ageMs <= windows.degradedMaxAgeMs) {
            healthStatus = "degraded"
          } else {
            healthStatus = "offline"
          }
        }
      }

      return {
        id: totem.id,
        name: totemNameById.get(totem.id) ?? null,
        status: totem.status,
        deviceId: totem.device_id,
        maintenanceMode: Boolean(totem.maintenance_mode),
        printer,
        healthStatus,
        pendingJobs,
        failedJobs,
      }
    }),
  }
}
