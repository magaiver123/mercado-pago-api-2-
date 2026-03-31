import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from "node:crypto"

function buildKey(secret: string): Buffer {
  return createHash("sha256").update(secret).digest()
}

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex")
}

export function signPrintAgentEnrollment(input: {
  secret: string
  deviceId: string
  token: string
  expiresAt: string
  apiBaseUrl: string
}): string {
  const expiresAtCanonical = (() => {
    const parsed = new Date(input.expiresAt)
    if (!Number.isFinite(parsed.getTime())) return String(input.expiresAt).trim()
    return parsed.toISOString()
  })()
  const message = `${input.deviceId}\n${input.token}\n${expiresAtCanonical}\n${input.apiBaseUrl}`
  return createHmac("sha256", input.secret).update(message).digest("hex")
}

export function encryptDeviceSecret(plaintext: string, secret: string): string {
  const iv = randomBytes(12)
  const key = buildKey(secret)
  const cipher = createCipheriv("aes-256-gcm", key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString("base64url")}.${encrypted.toString("base64url")}.${tag.toString("base64url")}`
}

export function decryptDeviceSecret(ciphertext: string, secret: string): string {
  const [ivRaw, encryptedRaw, tagRaw] = String(ciphertext).split(".")
  if (!ivRaw || !encryptedRaw || !tagRaw) {
    throw new Error("Ciphertext inválido")
  }
  const iv = Buffer.from(ivRaw, "base64url")
  const encrypted = Buffer.from(encryptedRaw, "base64url")
  const tag = Buffer.from(tagRaw, "base64url")
  const key = buildKey(secret)
  const decipher = createDecipheriv("aes-256-gcm", key, iv)
  decipher.setAuthTag(tag)
  const plain = Buffer.concat([decipher.update(encrypted), decipher.final()])
  return plain.toString("utf8")
}
