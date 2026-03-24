import { getRepositoryFactory } from "@/api/repositories/repository-factory"

interface ListRecentPrintJobsInput {
  storeId: string
  limit: unknown
  status?: unknown
  totemId?: unknown
}

function normalizeLimit(value: unknown): number {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return Math.min(value, 100)
  }
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10)
    if (Number.isInteger(parsed) && parsed > 0) {
      return Math.min(parsed, 100)
    }
  }
  return 30
}

export async function listRecentPrintJobsService(input: ListRecentPrintJobsInput) {
  const repositories = getRepositoryFactory()
  const normalizedStatus =
    typeof input.status === "string" && input.status.trim() !== ""
      ? input.status.trim().toLowerCase()
      : null
  const normalizedTotemId =
    typeof input.totemId === "string" && input.totemId.trim() !== ""
      ? input.totemId.trim()
      : null

  const jobs = await repositories.printJob.listRecentByStoreId(
    input.storeId,
    normalizedStatus || normalizedTotemId ? Math.max(100, normalizeLimit(input.limit)) : normalizeLimit(input.limit),
  )

  return {
    jobs: jobs
      .filter((job) => (normalizedStatus ? String(job.status).toLowerCase() === normalizedStatus : true))
      .filter((job) => (normalizedTotemId ? job.totem_id === normalizedTotemId : true))
      .slice(0, normalizeLimit(input.limit)),
  }
}
