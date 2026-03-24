import { AppError } from "@/api/utils/app-error"
import { sanitizeString } from "@/api/utils/sanitize"
import { getRepositoryFactory } from "@/api/repositories/repository-factory"

export async function resolveTotemPrintContextService(
  deviceIdValue: unknown,
  options: { requireActivePrinter?: boolean } = {},
) {
  const deviceId = sanitizeString(deviceIdValue)
  if (!deviceId) {
    throw new AppError("Device ID invalido", 400, "TOTEM_CONTEXT_MISSING", true, false)
  }

  const repositories = getRepositoryFactory()
  const totem = await repositories.totem.findByDeviceId(deviceId)
  if (!totem) {
    throw new AppError(
      "Totem nao encontrado para o device informado",
      404,
      "TOTEM_CONTEXT_MISSING",
      true,
      false,
    )
  }

  if (totem.maintenance_mode) {
    throw new AppError("Totem em manutencao", 409, "TOTEM_MAINTENANCE", true, false)
  }

  if (totem.status !== "active") {
    throw new AppError("Totem inativo", 409, "TOTEM_INACTIVE", true, false)
  }

  const printer = await repositories.totemPrinter.findActiveByTotemId(totem.id)
  if (options.requireActivePrinter !== false && !printer) {
    throw new AppError(
      "Nenhuma impressora ativa vinculada a este totem",
      422,
      "PRINTER_NOT_CONFIGURED",
      true,
      false,
    )
  }

  return {
    deviceId,
    totem,
    printer,
  }
}
