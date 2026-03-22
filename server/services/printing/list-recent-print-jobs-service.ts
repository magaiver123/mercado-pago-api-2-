import { getRepositoryFactory } from "@/api/repositories/repository-factory"

interface ListRecentPrintJobsInput {
  storeId: string
  limit: unknown
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
  const jobs = await repositories.printJob.listRecentByStoreId(
    input.storeId,
    normalizeLimit(input.limit),
  )

  return {
    jobs,
  }
}
