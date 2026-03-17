import { getRepositoryFactory } from "@/api/repositories/repository-factory"
import { AppError } from "@/api/utils/app-error"
import { isValidUUID } from "@/api/utils/validators"
import { sendSignupCodeEmail } from "@/api/services/auth/send-signup-code-email"
import {
  ensureSignupSessionIsActive,
  generateSignupCode,
  getCooldownSeconds,
  shouldExposeDebugPhoneCode,
  SIGNUP_CODE_EXPIRATION_MS,
  SIGNUP_RESEND_COOLDOWN_MS,
} from "@/api/services/auth/signup-verification-utils"

type Channel = "email" | "phone"

interface SignupResendInput {
  signupId: string
  channel: Channel
}

export async function signupResendService(input: SignupResendInput) {
  const signupId = typeof input.signupId === "string" ? input.signupId.trim() : ""
  const channel = input.channel

  if (!isValidUUID(signupId) || (channel !== "email" && channel !== "phone")) {
    throw new AppError("Dados invalidos", 400)
  }

  const repositories = getRepositoryFactory()
  const signup = await repositories.signupVerification.findById(signupId)

  if (!signup) {
    throw new AppError("Verificacao de cadastro nao encontrada", 404)
  }

  const now = new Date()
  ensureSignupSessionIsActive(signup, now)

  if (channel === "email" && signup.email_verified_at) {
    throw new AppError("Email ja verificado", 409)
  }

  if (channel === "phone" && signup.phone_verified_at) {
    throw new AppError("Telefone ja verificado", 409)
  }

  const lastSentAt = channel === "email" ? signup.last_email_sent_at : signup.last_phone_sent_at
  const cooldownSeconds = getCooldownSeconds(lastSentAt, now)

  if (cooldownSeconds > 0) {
    throw new AppError(`Aguarde ${cooldownSeconds}s para reenviar o codigo`, 429)
  }

  const newCode = generateSignupCode()
  const newExpiresAt = new Date(now.getTime() + SIGNUP_CODE_EXPIRATION_MS).toISOString()
  const sentAt = now.toISOString()

  if (channel === "email") {
    await repositories.signupVerification.updateEmailCode(signupId, newCode, newExpiresAt, sentAt)
    await sendSignupCodeEmail(signup.email, newCode)
  } else {
    await repositories.signupVerification.updatePhoneCode(signupId, newCode, newExpiresAt, sentAt)
  }

  return {
    success: true,
    resendCooldown: Math.ceil(SIGNUP_RESEND_COOLDOWN_MS / 1000),
    debugPhoneCode: channel === "phone" && shouldExposeDebugPhoneCode() ? newCode : undefined,
  }
}
