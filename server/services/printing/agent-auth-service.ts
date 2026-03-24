import { createHash, createHmac, timingSafeEqual } from "node:crypto"
import { AppError } from "@/api/utils/app-error"
import { getPrintAgentAuthEnv } from "@/api/config/env"
import { sanitizeString } from "@/api/utils/sanitize"
import { logger } from "@/api/utils/logger"
import { getRepositoryFactory } from "@/api/repositories/repository-factory"
import {
  decryptDeviceSecret,
  sha256Hex as sha256HexSafe,
} from "@/api/services/printing/agent-device-crypto"

const HEADER_AGENT_ID = "x-print-agent-id"
const HEADER_AGENT_VERSION = "x-print-agent-version"
const HEADER_TIMESTAMP = "x-print-agent-ts"
const HEADER_SIGNATURE = "x-print-agent-signature"
const HEADER_KEY_ID = "x-print-agent-key-id"

function sha256Hex(value: string) {
  return createHash("sha256").update(value).digest("hex")
}

function buildSigningMessage(input: {
  timestamp: string
  method: string
  pathname: string
  bodyHash: string
}) {
  return `${input.timestamp}\n${input.method.toUpperCase()}\n${input.pathname}\n${input.bodyHash}`
}

function signMessage(secret: string, message: string) {
  return createHmac("sha256", secret).update(message).digest("hex")
}

function isValidSignature(expected: string, provided: string): boolean {
  const expectedBuffer = Buffer.from(expected, "hex")
  const providedBuffer = Buffer.from(provided, "hex")
  if (expectedBuffer.length === 0 || providedBuffer.length === 0) return false
  if (expectedBuffer.length !== providedBuffer.length) return false
  return timingSafeEqual(expectedBuffer, providedBuffer)
}

function parseTimestamp(value: string | null): number | null {
  if (!value) return null
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed)) return null
  if (parsed <= 0) return null
  return parsed
}

export interface AuthenticatedPrintAgent {
  deviceId: string
  agentId: string | null
  agentVersion: string | null
  authenticated: boolean
  authMode: "legacy-unsigned" | "global-secret" | "device-secret"
  keyId: string | null
}

export async function authenticatePrintAgentRequest(input: {
  request: Request
  bodyText: string
  body: unknown
}): Promise<AuthenticatedPrintAgent> {
  const body = (input.body ?? {}) as Record<string, unknown>
  const deviceId = sanitizeString(body?.deviceId)
  if (!deviceId) {
    throw new AppError("Device ID invalido", 400, "TOTEM_CONTEXT_MISSING", true, false)
  }

  const env = getPrintAgentAuthEnv()
  const signature = input.request.headers.get(HEADER_SIGNATURE)
  const timestamp = input.request.headers.get(HEADER_TIMESTAMP)
  const agentIdHeader = sanitizeString(input.request.headers.get(HEADER_AGENT_ID))
  const agentVersionHeader = sanitizeString(input.request.headers.get(HEADER_AGENT_VERSION))
  const keyIdHeader = sanitizeString(input.request.headers.get(HEADER_KEY_ID))

  if (!signature || !timestamp) {
    if (!env.allowLegacyUnsigned) {
      throw new AppError(
        "Assinatura do agente obrigatoria",
        401,
        "AGENT_AUTH_REQUIRED",
        true,
        false,
      )
    }

    logger.warn("Unsigned print-agent request accepted in legacy mode", {
      path: new URL(input.request.url).pathname,
      deviceId,
    })

    return {
      deviceId,
      agentId: agentIdHeader ?? sanitizeString(body?.agentId) ?? null,
      agentVersion: agentVersionHeader ?? sanitizeString(body?.agentVersion) ?? null,
      authenticated: false,
      authMode: "legacy-unsigned",
      keyId: null,
    }
  }

  const timestampMs = parseTimestamp(timestamp)
  if (!timestampMs) {
    throw new AppError("Assinatura de agente invalida", 401, "AGENT_AUTH_INVALID", true, false)
  }

  const now = Date.now()
  if (Math.abs(now - timestampMs) > env.signatureMaxSkewMs) {
    throw new AppError("Assinatura de agente expirada", 401, "AGENT_AUTH_INVALID", true, false)
  }

  const pathname = new URL(input.request.url).pathname
  const bodyHash = sha256Hex(input.bodyText)
  const message = buildSigningMessage({
    timestamp,
    method: input.request.method,
    pathname,
    bodyHash,
  })
  const normalizedSignature = signature.toLowerCase()
  const repositories = getRepositoryFactory()
  const device = await repositories.printAgentDevice.findDeviceByDeviceId(deviceId)
  if (device) {
    if (device.status !== "active" || device.revoked_at) {
      throw new AppError("Dispositivo de impressao revogado ou inativo", 401, "AGENT_AUTH_INVALID", true, false)
    }
    if (keyIdHeader && keyIdHeader !== device.key_id) {
      throw new AppError("Chave do agente invalida", 401, "AGENT_AUTH_INVALID", true, false)
    }

    let decryptedSecret = ""
    try {
      decryptedSecret = decryptDeviceSecret(device.hmac_secret_ciphertext, env.hmacSecret)
    } catch {
      throw new AppError("Credencial de agente corrompida", 401, "AGENT_AUTH_INVALID", true, false)
    }

    if (sha256HexSafe(decryptedSecret) !== device.hmac_secret_hash) {
      throw new AppError("Integridade de credencial invalida", 401, "AGENT_AUTH_INVALID", true, false)
    }

    const expectedDeviceSignature = signMessage(decryptedSecret, message)
    if (isValidSignature(expectedDeviceSignature, normalizedSignature)) {
      return {
        deviceId,
        agentId: agentIdHeader ?? sanitizeString(body?.agentId) ?? device.agent_id,
        agentVersion: agentVersionHeader ?? sanitizeString(body?.agentVersion) ?? null,
        authenticated: true,
        authMode: "device-secret",
        keyId: device.key_id,
      }
    }
  }

  if (!env.allowGlobalFallback) {
    throw new AppError("Assinatura de agente invalida", 401, "AGENT_AUTH_INVALID", true, false)
  }

  const expectedGlobalSignature = signMessage(env.hmacSecret, message)

  if (!isValidSignature(expectedGlobalSignature, normalizedSignature)) {
    throw new AppError("Assinatura de agente invalida", 401, "AGENT_AUTH_INVALID", true, false)
  }

  return {
    deviceId,
    agentId: agentIdHeader ?? sanitizeString(body?.agentId) ?? null,
    agentVersion: agentVersionHeader ?? sanitizeString(body?.agentVersion) ?? null,
    authenticated: true,
    authMode: "global-secret",
    keyId: keyIdHeader ?? null,
  }
}
