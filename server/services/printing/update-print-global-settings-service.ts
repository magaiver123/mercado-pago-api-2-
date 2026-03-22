import { AppError } from "@/api/utils/app-error"
import { sanitizeString } from "@/api/utils/sanitize"
import { getRepositoryFactory } from "@/api/repositories/repository-factory"
import { isValidEscPosProfile } from "@/api/services/printing/escpos-profiles"

interface UpdatePrintGlobalSettingsInput {
  defaultConnectionType: unknown
  defaultPort: unknown
  defaultEscposProfile: unknown
  defaultPaperWidthMm: unknown
  queueClaimIntervalMs: unknown
  heartbeatIntervalMs: unknown
  maxRetryAttempts: unknown
}

function parseIntInRange(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
) {
  const raw =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseInt(value, 10)
        : Number.NaN

  if (!Number.isFinite(raw)) return fallback
  const parsed = Math.floor(raw)
  if (parsed < min || parsed > max) return fallback
  return parsed
}

export async function updatePrintGlobalSettingsService(
  input: UpdatePrintGlobalSettingsInput,
) {
  const connectionType = sanitizeString(input.defaultConnectionType)?.toLowerCase() ?? "tcp"
  if (connectionType !== "tcp") {
    throw new AppError("Apenas conexao TCP e suportada no momento", 400)
  }

  const escposProfile = sanitizeString(input.defaultEscposProfile) ?? "generic"
  if (!isValidEscPosProfile(escposProfile)) {
    throw new AppError("Perfil ESC/POS global invalido", 400)
  }

  const settings = await getRepositoryFactory().printGlobalSettings.updateDefault({
    defaultConnectionType: "tcp",
    defaultPort: parseIntInRange(input.defaultPort, 9100, 1, 65535),
    defaultEscposProfile: escposProfile,
    defaultPaperWidthMm: parseIntInRange(input.defaultPaperWidthMm, 80, 58, 82),
    queueClaimIntervalMs: parseIntInRange(input.queueClaimIntervalMs, 2500, 500, 60000),
    heartbeatIntervalMs: parseIntInRange(input.heartbeatIntervalMs, 10000, 1000, 120000),
    maxRetryAttempts: parseIntInRange(input.maxRetryAttempts, 5, 1, 20),
  })

  return {
    success: true,
    settings: {
      defaultConnectionType: settings.default_connection_type,
      defaultPort: settings.default_port,
      defaultEscposProfile: settings.default_escpos_profile,
      defaultPaperWidthMm: settings.default_paper_width_mm,
      queueClaimIntervalMs: settings.queue_claim_interval_ms,
      heartbeatIntervalMs: settings.heartbeat_interval_ms,
      maxRetryAttempts: settings.max_retry_attempts,
      updatedAt: settings.updated_at,
    },
  }
}
