import { AppError } from "@/api/utils/app-error"
import { sanitizeString } from "@/api/utils/sanitize"
import { isValidUUID } from "@/api/utils/validators"
import { getRepositoryFactory } from "@/api/repositories/repository-factory"
import { isValidEscPosProfile, suggestEscPosProfile } from "@/api/services/printing/escpos-profiles"
import {
  PRINT_CONNECTION_TYPE_TCP,
  normalizePaperWidth,
  normalizePort,
} from "@/api/services/printing/printing-domain"

interface UpsertTotemPrinterConfigInput {
  storeId: string
  totemId: unknown
  connectionType: unknown
  ip: unknown
  port: unknown
  model: unknown
  escposProfile: unknown
  paperWidthMm: unknown
  isActive: unknown
}

function normalizeConnectionType(value: unknown): "tcp" {
  const normalized = sanitizeString(value)?.toLowerCase()
  if (!normalized || normalized === PRINT_CONNECTION_TYPE_TCP) return PRINT_CONNECTION_TYPE_TCP
  throw new AppError("Tipo de conexao nao suportado. Use TCP", 400)
}

function isValidPrinterAddress(value: string): boolean {
  const ipPattern =
    /^(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)$/
  const hostPattern = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9-]{1,63}$/i
  return ipPattern.test(value) || hostPattern.test(value)
}

export async function upsertTotemPrinterConfigService(
  input: UpsertTotemPrinterConfigInput,
) {
  const totemId = sanitizeString(input.totemId)
  const ip = sanitizeString(input.ip)
  const model = sanitizeString(input.model)

  if (!totemId || !isValidUUID(totemId)) {
    throw new AppError("totemId invalido", 400, "TOTEM_CONTEXT_MISSING", true, false)
  }

  if (!ip) {
    throw new AppError("IP da impressora e obrigatorio", 400, "PRINTER_NOT_CONFIGURED", true, false)
  }

  if (!isValidPrinterAddress(ip)) {
    throw new AppError("IP/host da impressora invalido", 400, "RECEIPT_PAYLOAD_INVALID", true, false)
  }

  if (!model) {
    throw new AppError(
      "Modelo da impressora e obrigatorio",
      400,
      "PRINTER_NOT_CONFIGURED",
      true,
      false,
    )
  }

  const repositories = getRepositoryFactory()
  const totem = await repositories.totem.findById(totemId)
  if (!totem) {
    throw new AppError("Totem nao encontrado", 404, "TOTEM_CONTEXT_MISSING", true, false)
  }

  if (totem.store_id !== input.storeId) {
    throw new AppError(
      "Totem nao pertence a loja selecionada",
      403,
      "STORE_CONTEXT_MISMATCH",
      true,
      false,
    )
  }

  const providedProfile = sanitizeString(input.escposProfile)
  const escposProfile =
    providedProfile && isValidEscPosProfile(providedProfile)
      ? providedProfile
      : suggestEscPosProfile(model)

  const saved = await repositories.totemPrinter.upsertByTotemId({
    totemId,
    storeId: input.storeId,
    connectionType: normalizeConnectionType(input.connectionType),
    ip,
    port: normalizePort(input.port),
    model,
    escposProfile,
    paperWidthMm: normalizePaperWidth(input.paperWidthMm),
    isActive: input.isActive !== false,
  })

  return {
    success: true,
    printer: saved,
  }
}
