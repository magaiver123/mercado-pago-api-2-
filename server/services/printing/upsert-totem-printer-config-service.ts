import { AppError } from "@/api/utils/app-error"
import { sanitizeString } from "@/api/utils/sanitize"
import { isValidUUID } from "@/api/utils/validators"
import { getRepositoryFactory } from "@/api/repositories/repository-factory"
import { isValidEscPosProfile, suggestEscPosProfile } from "@/api/services/printing/escpos-profiles"

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

function normalizePort(value: unknown): number {
  if (typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 65535) {
    return value
  }

  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10)
    if (Number.isInteger(parsed) && parsed >= 1 && parsed <= 65535) {
      return parsed
    }
  }

  return 9100
}

function normalizePaperWidth(value: unknown): number {
  if (typeof value === "number" && [58, 76, 80, 82].includes(value)) {
    return value
  }
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10)
    if ([58, 76, 80, 82].includes(parsed)) {
      return parsed
    }
  }
  return 80
}

function normalizeConnectionType(value: unknown): "tcp" {
  const normalized = sanitizeString(value)?.toLowerCase()
  if (!normalized || normalized === "tcp") return "tcp"
  throw new AppError("Tipo de conexao nao suportado. Use TCP", 400)
}

export async function upsertTotemPrinterConfigService(
  input: UpsertTotemPrinterConfigInput,
) {
  const totemId = sanitizeString(input.totemId)
  const ip = sanitizeString(input.ip)
  const model = sanitizeString(input.model)

  if (!totemId || !isValidUUID(totemId)) {
    throw new AppError("totemId invalido", 400)
  }

  if (!ip) {
    throw new AppError("IP da impressora e obrigatorio", 400)
  }

  if (!model) {
    throw new AppError("Modelo da impressora e obrigatorio", 400)
  }

  const repositories = getRepositoryFactory()
  const totem = await repositories.totem.findById(totemId)
  if (!totem) {
    throw new AppError("Totem nao encontrado", 404)
  }

  if (totem.store_id !== input.storeId) {
    throw new AppError("Totem nao pertence a loja selecionada", 403)
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
