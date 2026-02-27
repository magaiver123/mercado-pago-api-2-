import { AppError } from "@/api/utils/app-error"

type EnvKey =
  | "NEXT_PUBLIC_SUPABASE_URL"
  | "SUPABASE_SERVICE_ROLE_KEY"
  | "MERCADOPAGO_ACCESS_TOKEN"
  | "MERCADOPAGO_TERMINAL_ID"
  | "RESEND_API_KEY"
  | "EMAIL_FROM"

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

export function getMercadoPagoEnv() {
  return {
    accessToken: requireEnv("MERCADOPAGO_ACCESS_TOKEN"),
    terminalId: requireEnv("MERCADOPAGO_TERMINAL_ID"),
  }
}

export function getEmailEnv() {
  return {
    resendApiKey: requireEnv("RESEND_API_KEY"),
    emailFrom: requireEnv("EMAIL_FROM"),
  }
}

