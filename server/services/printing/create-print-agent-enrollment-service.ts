import { randomBytes } from "node:crypto"
import { AppError } from "@/api/utils/app-error"
import { getPrintAgentAuthEnv } from "@/api/config/env"
import { getRepositoryFactory } from "@/api/repositories/repository-factory"
import { signPrintAgentEnrollment, sha256Hex } from "@/api/services/printing/agent-device-crypto"
import { sanitizeString } from "@/api/utils/sanitize"

interface CreatePrintAgentEnrollmentInput {
  deviceId: unknown
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
  const deviceId = sanitizeString(input.deviceId)
  const apiBaseUrl = normalizeApiBaseUrl(input.apiBaseUrl)

  if (!deviceId) {
    throw new AppError("deviceId invalido", 400, "TOTEM_CONTEXT_MISSING", true, false)
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
  const repositories = getRepositoryFactory()
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
