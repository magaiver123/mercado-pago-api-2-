import { createHash, createHmac, timingSafeEqual } from "node:crypto"
import { AppError } from "@/api/utils/app-error"
import { getPrintAgentAuthEnv } from "@/api/config/env"
import { sanitizeString } from "@/api/utils/sanitize"
import { logger } from "@/api/utils/logger"

const HEADER_AGENT_ID = "x-print-agent-id"
const HEADER_AGENT_VERSION = "x-print-agent-version"
const HEADER_TIMESTAMP = "x-print-agent-ts"
const HEADER_SIGNATURE = "x-print-agent-signature"

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
}

export function authenticatePrintAgentRequest(input: {
  request: Request
  bodyText: string
  body: unknown
}): AuthenticatedPrintAgent {
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
  const expectedSignature = signMessage(env.hmacSecret, message)

  if (!isValidSignature(expectedSignature, signature.toLowerCase())) {
    throw new AppError("Assinatura de agente invalida", 401, "AGENT_AUTH_INVALID", true, false)
  }

  return {
    deviceId,
    agentId: agentIdHeader ?? sanitizeString(body?.agentId) ?? null,
    agentVersion: agentVersionHeader ?? sanitizeString(body?.agentVersion) ?? null,
    authenticated: true,
  }
}

