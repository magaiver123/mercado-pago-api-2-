import { AppError } from "@/api/utils/app-error"

type EnvKey =
  | "NEXT_PUBLIC_SUPABASE_URL"
  | "SUPABASE_SERVICE_ROLE_KEY"
  | "STORE_CONTEXT_SECRET"
  | "SESSION_CONTEXT_SECRET"
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
  | "EMAIL_LOGO_URL"
  | "EMAIL_APP_URL"
  | "EMAIL_SUPPORT_WHATSAPP_URL"

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
    emailLogoUrl: requireEnv("EMAIL_LOGO_URL"),
    emailAppUrl: requireEnv("EMAIL_APP_URL"),
    emailSupportWhatsappUrl: requireEnv("EMAIL_SUPPORT_WHATSAPP_URL"),
  }
}

export function getStoreContextEnv() {
  return {
    secret: readEnv("STORE_CONTEXT_SECRET") ?? requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
  }
}

export function getSessionContextEnv() {
  return {
    secret:
      readEnv("SESSION_CONTEXT_SECRET") ??
      readEnv("STORE_CONTEXT_SECRET") ??
      requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
  }
}

export function getAdminBypassEnv() {
  return {
    enabled: readEnv("ADMIN_BYPASS_ENABLED") === "true",
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
