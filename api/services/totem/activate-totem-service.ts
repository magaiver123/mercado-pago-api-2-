import { AppError } from "@/api/utils/app-error"
import { sanitizeString } from "@/api/utils/sanitize"
import { getRepositoryFactory } from "@/api/repositories/repository-factory"

interface ActivateTotemInput {
  activationCode: unknown
  deviceId: unknown
}

export async function activateTotemService(input: ActivateTotemInput) {
  const activationCode = sanitizeString(input.activationCode)
  const deviceId = sanitizeString(input.deviceId)

  if (!activationCode || !deviceId) {
    throw new AppError("Codigo de ativacao e device ID sao obrigatorios", 400)
  }

  const repositories = getRepositoryFactory()

  const existingByDevice = await repositories.totem.findByDeviceId(deviceId)
  if (existingByDevice?.status === "active") {
    throw new AppError("Este dispositivo ja esta ativado", 409)
  }

  const totem = await repositories.totem.findByActivationCode(activationCode)
  if (!totem) {
    throw new AppError("Codigo de ativacao nao encontrado", 404)
  }

  if (totem.status === "active") {
    throw new AppError("Codigo de ativacao ja utilizado", 409)
  }

  if (totem.device_id && totem.device_id !== deviceId) {
    throw new AppError("Codigo de ativacao nao aplicavel para este dispositivo", 422)
  }

  if (existingByDevice && existingByDevice.id !== totem.id) {
    throw new AppError("Dispositivo vinculado a outro totem", 422)
  }

  const now = new Date().toISOString()
  const activationResult = await repositories.totem.activate({
    totemId: totem.id,
    activationCode,
    deviceId,
    now,
  })

  if (activationResult === "conflict") {
    throw new AppError("Dispositivo ja vinculado a outro totem", 422)
  }

  if (activationResult === "not_updated") {
    throw new AppError("Codigo de ativacao ja utilizado ou totem inativo", 409)
  }

  return { success: true }
}

