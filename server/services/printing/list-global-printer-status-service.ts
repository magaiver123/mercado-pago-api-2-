import { getRepositoryFactory } from "@/api/repositories/repository-factory"

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

function classifyPrinterStatus(input: {
  isActive: boolean
  lastHeartbeatAt: string | null
  lastStatus: string | null
  lastError: string | null
}) {
  if (!input.isActive) return "disabled" as const
  if (input.lastError) return "error" as const
  if (!input.lastHeartbeatAt) return "unknown" as const

  const heartbeatTs = new Date(input.lastHeartbeatAt).getTime()
  if (!Number.isFinite(heartbeatTs)) return "unknown" as const

  const ageMs = Date.now() - heartbeatTs
  if (ageMs <= 90_000) {
    if (input.lastStatus === "retrying") return "degraded" as const
    return "online" as const
  }

  return "offline" as const
}

export async function listGlobalPrinterStatusService(input: ListGlobalPrinterStatusInput) {
  const repositories = getRepositoryFactory()
  const limit = normalizeLimit(input.limit)

  const [printers, recentJobs] = await Promise.all([
    repositories.totemPrinter.listAll(limit),
    repositories.printJob.listRecentGlobal(limit * 3),
  ])

  const totemCache = new Map<string, Awaited<ReturnType<typeof repositories.totem.findById>>>()
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

  for (const printer of printers) {
    if (!totemCache.has(printer.totem_id)) {
      const totem = await repositories.totem.findById(printer.totem_id)
      totemCache.set(printer.totem_id, totem)
    }
    const totem = totemCache.get(printer.totem_id)
    const status = classifyPrinterStatus({
      isActive: printer.is_active,
      lastHeartbeatAt: printer.last_heartbeat_at,
      lastStatus: printer.last_status,
      lastError: printer.last_error,
    })

    if (status === "online") online += 1
    if (status === "offline") offline += 1
    if (status === "degraded") degraded += 1
    if (status === "error") error += 1
    if (status === "unknown") unknown += 1
    if (status === "disabled") disabled += 1

    const totemJobs = jobsByTotem.get(printer.totem_id) ?? []
    const pendingJobs = totemJobs.filter((job) => job.status === "pending").length
    const failedJobs = totemJobs.filter((job) => job.status === "failed").length

    items.push({
      printerId: printer.id,
      totemId: printer.totem_id,
      storeId: printer.store_id,
      deviceId: totem?.device_id ?? null,
      totemStatus: totem?.status ?? null,
      model: printer.model,
      connectionType: printer.connection_type,
      ip: printer.ip,
      port: printer.port,
      escposProfile: printer.escpos_profile,
      isActive: printer.is_active,
      healthStatus: status,
      lastHeartbeatAt: printer.last_heartbeat_at,
      lastStatus: printer.last_status,
      lastError: printer.last_error,
      agentVersion: printer.agent_version,
      pendingJobs,
      failedJobs,
      updatedAt: printer.updated_at,
    })
  }

  return {
    summary: {
      total: items.length,
      online,
      offline,
      degraded,
      error,
      unknown,
      disabled,
    },
    items,
  }
}
