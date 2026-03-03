import crypto from "crypto"

const WEBHOOK_TOLERANCE_MS = 5 * 60 * 1000

interface ValidateInput {
  xSignature: string | null
  xRequestId: string | null
  dataIdFromQuery: string | null
  secret: string
  now?: number
}

function parseSignatureHeader(xSignature: string): { ts: string | null; v1: string | null } {
  const parts = xSignature.split(",")
  let ts: string | null = null
  let v1: string | null = null

  for (const part of parts) {
    const [key, value] = part.split("=")
    if (!key || !value) continue

    const normalizedKey = key.trim().toLowerCase()
    const normalizedValue = value.trim()

    if (normalizedKey === "ts") {
      ts = normalizedValue
      continue
    }

    if (normalizedKey === "v1") {
      v1 = normalizedValue
    }
  }

  return { ts, v1 }
}

function buildManifest(params: { dataId: string | null; requestId: string | null; ts: string | null }): string {
  const parts: string[] = []

  if (params.dataId) {
    parts.push(`id:${params.dataId.toLowerCase()};`)
  }

  if (params.requestId) {
    parts.push(`request-id:${params.requestId};`)
  }

  if (params.ts) {
    parts.push(`ts:${params.ts};`)
  }

  return parts.join("")
}

function safeEqualHex(left: string, right: string): boolean {
  const normalizedLeft = left.toLowerCase()
  const normalizedRight = right.toLowerCase()

  if (normalizedLeft.length !== normalizedRight.length) {
    return false
  }

  const leftBuffer = Buffer.from(normalizedLeft, "utf8")
  const rightBuffer = Buffer.from(normalizedRight, "utf8")

  return crypto.timingSafeEqual(leftBuffer, rightBuffer)
}

export function validateMercadoPagoWebhookSignatureService(input: ValidateInput): boolean {
  const { xSignature, xRequestId, dataIdFromQuery, secret } = input
  const now = input.now ?? Date.now()

  if (!xSignature || !secret || !xRequestId) {
    return false
  }

  const { ts, v1 } = parseSignatureHeader(xSignature)
  if (!ts || !v1) {
    return false
  }

  const tsNumber = Number(ts)
  if (!Number.isFinite(tsNumber)) {
    return false
  }

  if (Math.abs(now - tsNumber) > WEBHOOK_TOLERANCE_MS) {
    return false
  }

  const manifest = buildManifest({
    dataId: dataIdFromQuery,
    requestId: xRequestId,
    ts,
  })

  if (manifest.length === 0) {
    return false
  }

  const expectedSignature = crypto.createHmac("sha256", secret).update(manifest).digest("hex")

  return safeEqualHex(expectedSignature, v1)
}

