import { AppError } from "@/api/utils/app-error"
import { sanitizeString } from "@/api/utils/sanitize"
import { getRepositoryFactory } from "@/api/repositories/repository-factory"

export async function validateTotemStatusService(deviceIdValue: unknown) {
  const deviceId = sanitizeString(deviceIdValue)
  if (!deviceId) {
    throw new AppError("Device ID invalido", 400)
  }

  const repositories = getRepositoryFactory()
  const totem = await repositories.totem.findByDeviceId(deviceId)

  if (!totem) {
    return { allowed: false, reason: "not_found" as const }
  }

  if (totem.status !== "active") {
    return { allowed: false, reason: "inactive" as const }
  }

  const now = new Date().toISOString()
  const updated = await repositories.totem.updateLastSeenActive(totem.id, now)

  if (!updated) {
    throw new AppError("Erro ao atualizar ultimo acesso do totem", 500)
  }

  return { allowed: true, reason: "active" as const }
}

