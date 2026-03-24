import { randomBytes } from "node:crypto"
import { AppError } from "@/api/utils/app-error"
import { getPrintAgentAuthEnv } from "@/api/config/env"
import { getRepositoryFactory } from "@/api/repositories/repository-factory"
import { signPrintAgentEnrollment, sha256Hex } from "@/api/services/printing/agent-device-crypto"
import { sanitizeString } from "@/api/utils/sanitize"
import { isValidUUID } from "@/api/utils/validators"

interface CreatePrintAgentEnrollmentInput {
  deviceId: unknown
  totemId: unknown
  storeId: unknown
  agentId: unknown
  apiBaseUrl: unknown
  ttlMinutes: unknown
}

function normalizePositiveInt(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value === "number" && Number.isInteger(value)) {
    return Math.min(max, Math.max(min, value))
  }
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10)
    if (Number.isInteger(parsed)) {
      return Math.min(max, Math.max(min, parsed))
    }
  }
  return fallback
}

function normalizeApiBaseUrl(value: unknown): string {
  const raw = sanitizeString(value)
  if (!raw) {
    throw new AppError("API base URL invalida", 400, "RECEIPT_PAYLOAD_INVALID", true, false)
  }
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new AppError("API base URL invalida", 400, "RECEIPT_PAYLOAD_INVALID", true, false)
  }
  if (!url.protocol.startsWith("http")) {
    throw new AppError("API base URL deve usar http ou https", 400, "RECEIPT_PAYLOAD_INVALID", true, false)
  }
  return url.toString().replace(/\/+$/, "")
}

export async function createPrintAgentEnrollmentService(
  input: CreatePrintAgentEnrollmentInput,
) {
  const requestedDeviceId = sanitizeString(input.deviceId)
  const requestedTotemId = sanitizeString(input.totemId)
  const requestedStoreId = sanitizeString(input.storeId)
  const apiBaseUrl = normalizeApiBaseUrl(input.apiBaseUrl)

  if (!requestedDeviceId && !requestedTotemId) {
    throw new AppError("Informe deviceId ou totemId", 400, "TOTEM_CONTEXT_MISSING", true, false)
  }

  if (requestedTotemId && !isValidUUID(requestedTotemId)) {
    throw new AppError("totemId invalido", 400, "TOTEM_CONTEXT_MISSING", true, false)
  }

  if (requestedStoreId && !isValidUUID(requestedStoreId)) {
    throw new AppError("storeId invalido", 400, "STORE_CONTEXT_MISMATCH", true, false)
  }

  const repositories = getRepositoryFactory()
  var resolvedTotemId: string | null = null
  var resolvedStoreId: string | null = null
  var deviceId = requestedDeviceId

  const resolveByTotemId = async (totemId: string) => {
    const totem = await repositories.totem.findById(totemId)
    if (!totem) {
      throw new AppError("Totem nao encontrado", 404, "TOTEM_CONTEXT_MISSING", true, false)
    }
    if (totem.status !== "active") {
      throw new AppError("Totem inativo", 409, "TOTEM_INACTIVE", true, false)
    }
    if (totem.maintenance_mode) {
      throw new AppError("Totem em manutencao", 409, "TOTEM_MAINTENANCE", true, false)
    }
    if (!totem.device_id) {
      throw new AppError("Totem sem device_id vinculado", 422, "DEVICE_NOT_BOUND", true, false)
    }
    if (requestedStoreId && requestedStoreId !== totem.store_id) {
      throw new AppError("Totem nao pertence a loja informada", 403, "STORE_CONTEXT_MISMATCH", true, false)
    }
    if (requestedDeviceId && requestedDeviceId !== totem.device_id) {
      throw new AppError(
        "deviceId nao confere com o totem informado",
        409,
        "DEVICE_CONTEXT_MISMATCH",
        true,
        false,
      )
    }

    resolvedTotemId = totem.id
    resolvedStoreId = totem.store_id
    deviceId = totem.device_id
  }

  const resolveByDeviceId = async (candidateDeviceId: string) => {
    const totem = await repositories.totem.findByDeviceId(candidateDeviceId)
    if (!totem) {
      throw new AppError(
        "Nenhum totem ativo encontrado para este deviceId",
        404,
        "TOTEM_CONTEXT_MISSING",
        true,
        false,
      )
    }
    if (totem.status !== "active") {
      throw new AppError("Totem inativo", 409, "TOTEM_INACTIVE", true, false)
    }
    if (totem.maintenance_mode) {
      throw new AppError("Totem em manutencao", 409, "TOTEM_MAINTENANCE", true, false)
    }
    if (requestedStoreId && requestedStoreId !== totem.store_id) {
      throw new AppError(
        "deviceId nao pertence a loja informada",
        403,
        "STORE_CONTEXT_MISMATCH",
        true,
        false,
      )
    }

    resolvedTotemId = totem.id
    resolvedStoreId = totem.store_id
  }

  if (requestedTotemId) {
    await resolveByTotemId(requestedTotemId)
  } else if (deviceId) {
    await resolveByDeviceId(deviceId)
  }

  if (!deviceId) {
    throw new AppError("Nao foi possivel resolver o deviceId do enrollment", 422, "DEVICE_NOT_BOUND", true, false)
  }

  const agentId = sanitizeString(input.agentId) ?? deviceId

  const ttlMinutes = normalizePositiveInt(input.ttlMinutes, 15, 1, 120)
  const now = new Date()
  const expiresAt = new Date(now.getTime() + ttlMinutes * 60_000).toISOString()
  const token = randomBytes(32).toString("hex")
  const tokenHash = sha256Hex(token)
  const authEnv = getPrintAgentAuthEnv()
  const signature = signPrintAgentEnrollment({
    secret: authEnv.hmacSecret,
    deviceId,
    token,
    expiresAt,
    apiBaseUrl,
  })
  const enrollment = await repositories.printAgentDevice.createEnrollment({
    deviceId,
    agentId,
    tokenHash,
    qrSignature: signature,
    apiBaseUrl,
    expiresAt,
  })

  return {
    success: true,
    code: "PRINT_AGENT_ENROLLMENT_CREATED",
    enrollmentId: enrollment.id,
    context: {
      storeId: resolvedStoreId,
      totemId: resolvedTotemId,
      deviceId,
    },
    qrPayload: {
      v: 1,
      type: "print-agent-enrollment",
      token,
      deviceId,
      agentId,
      apiBaseUrl,
      expiresAt,
      signature,
    },
  }
}
