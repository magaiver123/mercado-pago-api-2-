import { AppError } from "@/api/utils/app-error"
import { SignupVerificationRecord } from "@/api/types/domain"

export const SIGNUP_CODE_EXPIRATION_MS = 5 * 60 * 1000
export const SIGNUP_SESSION_EXPIRATION_MS = 15 * 60 * 1000
export const SIGNUP_RESEND_COOLDOWN_MS = 60 * 1000

export function generateSignupCode() {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export function maskEmail(email: string) {
  const [localPart, domain = ""] = email.split("@")
  if (!localPart) return email

  const visiblePrefix = localPart.slice(0, 2)
  const masked = "*".repeat(Math.max(2, localPart.length - visiblePrefix.length))
  return `${visiblePrefix}${masked}@${domain}`
}

export function maskPhone(phone: string) {
  const digits = phone.replace(/\D/g, "")
  if (digits.length < 4) return phone

  const prefix = digits.slice(0, 2)
  const suffix = digits.slice(-2)
  const middle = "*".repeat(Math.max(4, digits.length - 4))
  return `${prefix}${middle}${suffix}`
}

export function ensureSignupSessionIsActive(record: SignupVerificationRecord, now: Date) {
  if (record.completed_at) {
    throw new AppError("Cadastro ja finalizado", 409)
  }

  if (new Date(record.expires_at).getTime() <= now.getTime()) {
    throw new AppError("Sessao de cadastro expirada", 410)
  }
}

export function getCooldownSeconds(lastSentAt: string, now: Date) {
  const elapsedMs = now.getTime() - new Date(lastSentAt).getTime()
  if (Number.isNaN(elapsedMs)) return 0

  const remainingMs = SIGNUP_RESEND_COOLDOWN_MS - elapsedMs
  if (remainingMs <= 0) return 0

  return Math.ceil(remainingMs / 1000)
}

export function isCodeExpired(expiresAt: string, now: Date) {
  return new Date(expiresAt).getTime() <= now.getTime()
}

export function shouldExposeDebugPhoneCode() {
  return process.env.NODE_ENV !== "production"
}
