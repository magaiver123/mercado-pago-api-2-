import { getRepositoryFactory } from "@/api/repositories/repository-factory"
import { AppError } from "@/api/utils/app-error"
import { isValidUUID } from "@/api/utils/validators"
import { sendSignupCodeEmail } from "@/api/services/auth/send-signup-code-email"
import {
  ensureSignupSessionIsActive,
  generateSignupCode,
  getCooldownSeconds,
  SIGNUP_CODE_EXPIRATION_MS,
  SIGNUP_RESEND_COOLDOWN_MS,
} from "@/api/services/auth/signup-verification-utils"

interface SignupResendInput {
  signupId: string
  channel: string
}

export async function signupResendService(input: SignupResendInput) {
  const signupId = typeof input.signupId === "string" ? input.signupId.trim() : ""
  const channel = input.channel

  if (!isValidUUID(signupId)) {
    throw new AppError("Dados inválidos", 400)
  }

  if (channel !== "email") {
    throw new AppError("Reenvio por telefone não é mais suportado", 400)
  }

  const repositories = getRepositoryFactory()
  const signup = await repositories.signupVerification.findById(signupId)

  if (!signup) {
    throw new AppError("Verificação de cadastro não encontrada", 404)
  }

  const now = new Date()
  ensureSignupSessionIsActive(signup, now)

  if (channel === "email" && signup.email_verified_at) {
    throw new AppError("Email já verificado", 409)
  }

  const lastSentAt = signup.last_email_sent_at
  const cooldownSeconds = getCooldownSeconds(lastSentAt, now)

  if (cooldownSeconds > 0) {
    throw new AppError(`Aguarde ${cooldownSeconds}s para reenviar o código`, 429)
  }

  const newCode = generateSignupCode()
  const newExpiresAt = new Date(now.getTime() + SIGNUP_CODE_EXPIRATION_MS).toISOString()
  const sentAt = now.toISOString()

  await repositories.signupVerification.updateEmailCode(signupId, newCode, newExpiresAt, sentAt)
  await sendSignupCodeEmail({
    email: signup.email,
    code: newCode,
    recipientName: signup.name,
    expiresInMinutes: Math.ceil(SIGNUP_CODE_EXPIRATION_MS / 60_000),
  })

  return {
    success: true,
    resendCooldown: Math.ceil(SIGNUP_RESEND_COOLDOWN_MS / 1000),
  }
}
