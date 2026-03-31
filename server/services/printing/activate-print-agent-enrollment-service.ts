import { randomBytes } from "node:crypto"
import { AppError } from "@/api/utils/app-error"
import { getPrintAgentAuthEnv } from "@/api/config/env"
import { getRepositoryFactory } from "@/api/repositories/repository-factory"
import {
  encryptDeviceSecret,
  sha256Hex,
  signPrintAgentEnrollment,
} from "@/api/services/printing/agent-device-crypto"
import { sanitizeString } from "@/api/utils/sanitize"

interface ActivatePrintAgentEnrollmentInput {
  token: unknown
  deviceId: unknown
  agentId: unknown
  apiBaseUrl: unknown
  signature: unknown
  agentVersion: unknown
}

export async function activatePrintAgentEnrollmentService(
  input: ActivatePrintAgentEnrollmentInput,
) {
  const token = sanitizeString(input.token)
  const deviceId = sanitizeString(input.deviceId)
  const apiBaseUrl = sanitizeString(input.apiBaseUrl)
  const signature = sanitizeString(input.signature)
  const requestedAgentId = sanitizeString(input.agentId)
  const agentVersion = sanitizeString(input.agentVersion)

  if (!token || !deviceId || !apiBaseUrl || !signature) {
    throw new AppError("Payload de ativação inválido", 400, "RECEIPT_PAYLOAD_INVALID", true, false)
  }

  const repositories = getRepositoryFactory()
  const enrollment = await repositories.printAgentDevice.findEnrollmentByTokenHash(sha256Hex(token))
  if (!enrollment) {
    throw new AppError("Enrollment inválido", 404, "AGENT_AUTH_INVALID", true, false)
  }
  if (enrollment.device_id !== deviceId) {
    throw new AppError("Enrollment inválido para este dispositivo", 401, "AGENT_AUTH_INVALID", true, false)
  }
  if (enrollment.revoked_at) {
    throw new AppError("Enrollment revogado", 401, "AGENT_AUTH_INVALID", true, false)
  }
  if (enrollment.consumed_at) {
    throw new AppError("Enrollment já utilizado", 409, "AGENT_AUTH_INVALID", true, false)
  }

  const expiresAtTs = new Date(enrollment.expires_at).getTime()
  if (!Number.isFinite(expiresAtTs) || Date.now() > expiresAtTs) {
    throw new AppError("Enrollment expirado", 401, "AGENT_AUTH_INVALID", true, false)
  }

  const env = getPrintAgentAuthEnv()
  const expectedSignature = signPrintAgentEnrollment({
    secret: env.hmacSecret,
    deviceId,
    token,
    expiresAt: enrollment.expires_at,
    apiBaseUrl: enrollment.api_base_url,
  })
  if (expectedSignature !== signature || signature !== enrollment.qr_signature) {
    throw new AppError("Assinatura do enrollment inválida", 401, "AGENT_AUTH_INVALID", true, false)
  }

  if (apiBaseUrl !== enrollment.api_base_url) {
    throw new AppError("API base URL divergente do enrollment", 400, "RECEIPT_PAYLOAD_INVALID", true, false)
  }

  const keyId = randomBytes(16).toString("hex")
  const deviceSecret = randomBytes(32).toString("hex")
  const hmacSecretHash = sha256Hex(deviceSecret)
  const hmacSecretCiphertext = encryptDeviceSecret(deviceSecret, env.hmacSecret)
  const activated = await repositories.printAgentDevice.upsertActivatedDevice({
    deviceId,
    agentId: requestedAgentId ?? enrollment.agent_id,
    keyId,
    hmacSecretHash,
    hmacSecretCiphertext,
  })
  await repositories.printAgentDevice.consumeEnrollmentById(enrollment.id)
  await repositories.printAgentDevice.updateRuntimeStatus({
    deviceId,
    seenAt: new Date().toISOString(),
    status: "online",
    error: null,
    agentVersion,
  })

  return {
    success: true,
    code: "PRINT_AGENT_ENROLLMENT_ACTIVATED",
    device: {
      deviceId: activated.device_id,
      agentId: activated.agent_id,
      keyId: activated.key_id,
      minSupportedVersion: activated.min_supported_version,
      status: activated.status,
    },
    credentials: {
      keyId: activated.key_id,
      hmacSecret: deviceSecret,
    },
  }
}
