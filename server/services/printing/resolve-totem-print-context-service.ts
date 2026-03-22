import { AppError } from "@/api/utils/app-error"
import { sanitizeString } from "@/api/utils/sanitize"
import { getRepositoryFactory } from "@/api/repositories/repository-factory"

export async function resolveTotemPrintContextService(
  deviceIdValue: unknown,
  options: { requireActivePrinter?: boolean } = {},
) {
  const deviceId = sanitizeString(deviceIdValue)
  if (!deviceId) {
    throw new AppError("Device ID invalido", 400)
  }

  const repositories = getRepositoryFactory()
  const totem = await repositories.totem.findByDeviceId(deviceId)
  if (!totem) {
    throw new AppError("Totem nao encontrado para o device informado", 404)
  }

  if (totem.maintenance_mode) {
    throw new AppError("Totem em manutencao", 409)
  }

  if (totem.status !== "active") {
    throw new AppError("Totem inativo", 409)
  }

  const printer = await repositories.totemPrinter.findActiveByTotemId(totem.id)
  if (options.requireActivePrinter !== false && !printer) {
    throw new AppError("Nenhuma impressora ativa vinculada a este totem", 422)
  }

  return {
    deviceId,
    totem,
    printer,
  }
}
