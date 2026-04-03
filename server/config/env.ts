import { AppError } from "@/api/utils/app-error"

type EnvKey =
  | "NEXT_PUBLIC_SUPABASE_URL"
  | "SUPABASE_SERVICE_ROLE_KEY"
  | "STORE_CONTEXT_SECRET"
  | "STORE_CONTEXT_PREVIOUS_SECRET"
  | "SESSION_CONTEXT_SECRET"
  | "SESSION_CONTEXT_PREVIOUS_SECRET"
  | "PRINT_AGENT_HMAC_SECRET"
  | "PRINT_AGENT_AUTH_ALLOW_LEGACY"
  | "PRINT_AGENT_AUTH_ALLOW_GLOBAL_FALLBACK"
  | "PRINT_AGENT_SIGNATURE_MAX_SKEW_MS"
  | "PRINT_ADMIN_API_TOKEN"
  | "ADMIN_BYPASS_ENABLED"
  | "MQTT_URL"
  | "MQTT_USER"
  | "MQTT_PASS"
  | "MQTT_CONNECT_TIMEOUT_MS"
  | "MERCADOPAGO_ACCESS_TOKEN"
  | "MERCADOPAGO_TERMINAL_ID"
  | "MERCADOPAGO_WEBHOOK_SECRET"
  | "RESEND_API_KEY"
  | "EMAIL_FROM"
  | "EMAIL_REPLY_TO"
  | "EMAIL_LOGO_URL"
  | "EMAIL_APP_URL"
  | "EMAIL_SUPPORT_WHATSAPP_URL"
  | "RESEND_WEBHOOK_SECRET"
  | "RECEIPT_EMAIL_COOLDOWN_SECONDS"

function readEnv(key: EnvKey): string | undefined {
  const value = process.env[key]
  if (!value || value.trim() === "") return undefined
  return value
}

function requireEnv(key: EnvKey): string {
  const value = readEnv(key)
  if (!value) {
    throw new AppError(`Missing environment variable: ${key}`, 500, "ENV_MISSING", false)
  }
  return value
}

export function getDatabaseEnv() {
  return {
    supabaseUrl: requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    supabaseServiceRoleKey: requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
  }
}

export function getMercadoPagoApiEnv() {
  return {
    accessToken: requireEnv("MERCADOPAGO_ACCESS_TOKEN"),
  }
}

export function getMercadoPagoPointEnv() {
  return {
    accessToken: requireEnv("MERCADOPAGO_ACCESS_TOKEN"),
    terminalId: requireEnv("MERCADOPAGO_TERMINAL_ID"),
  }
}

export function getMercadoPagoWebhookEnv() {
  return {
    webhookSecret: requireEnv("MERCADOPAGO_WEBHOOK_SECRET"),
  }
}

export function getEmailEnv() {
  return {
    resendApiKey: requireEnv("RESEND_API_KEY"),
    emailFrom: requireEnv("EMAIL_FROM"),
    emailReplyTo: requireEnv("EMAIL_REPLY_TO"),
    emailLogoUrl: requireEnv("EMAIL_LOGO_URL"),
    emailAppUrl: requireEnv("EMAIL_APP_URL"),
    emailSupportWhatsappUrl: requireEnv("EMAIL_SUPPORT_WHATSAPP_URL"),
  }
}

export function getResendWebhookEnv() {
  return {
    webhookSecret: requireEnv("RESEND_WEBHOOK_SECRET"),
  }
}

export function getReceiptEmailEnv() {
  return {
    cooldownSeconds: parseIntInRange(
      readEnv("RECEIPT_EMAIL_COOLDOWN_SECONDS"),
      180,
      30,
      3600,
    ),
  }
}

export function getStoreContextEnv() {
  return {
    secret: requireEnv("STORE_CONTEXT_SECRET"),
    previousSecret: readEnv("STORE_CONTEXT_PREVIOUS_SECRET"),
  }
}

export function getSessionContextEnv() {
  return {
    secret: requireEnv("SESSION_CONTEXT_SECRET"),
    previousSecret: readEnv("SESSION_CONTEXT_PREVIOUS_SECRET"),
  }
}

export function getAdminBypassEnv() {
  return {
    enabled: readEnv("ADMIN_BYPASS_ENABLED") === "true",
  }
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (!value) return fallback
  const normalized = value.trim().toLowerCase()
  if (normalized === "true") return true
  if (normalized === "false") return false
  return fallback
}

function parseIntInRange(
  value: string | undefined,
  fallback: number,
  min: number,
  max: number,
): number {
  if (!value) return fallback
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed)) return fallback
  if (parsed < min || parsed > max) return fallback
  return parsed
}

export function getPrintAgentAuthEnv() {
  return {
    hmacSecret: requireEnv("PRINT_AGENT_HMAC_SECRET"),
    allowLegacyUnsigned: parseBoolean(readEnv("PRINT_AGENT_AUTH_ALLOW_LEGACY"), true),
    allowGlobalFallback: parseBoolean(readEnv("PRINT_AGENT_AUTH_ALLOW_GLOBAL_FALLBACK"), true),
    signatureMaxSkewMs: parseIntInRange(
      readEnv("PRINT_AGENT_SIGNATURE_MAX_SKEW_MS"),
      60_000,
      5_000,
      300_000,
    ),
  }
}

export function getPrintAdminEnv() {
  return {
    apiToken: requireEnv("PRINT_ADMIN_API_TOKEN"),
  }
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return parsed
}

export function getMqttEnv() {
  return {
    url: readEnv("MQTT_URL"),
    user: readEnv("MQTT_USER"),
    pass: readEnv("MQTT_PASS"),
    connectTimeoutMs: parsePositiveInt(readEnv("MQTT_CONNECT_TIMEOUT_MS"), 5000),
  }
}
