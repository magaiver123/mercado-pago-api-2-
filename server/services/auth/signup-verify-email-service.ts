import { getRepositoryFactory } from "@/api/repositories/repository-factory"
import { AppError } from "@/api/utils/app-error"
import { isValidUUID } from "@/api/utils/validators"
import {
  ensureSignupSessionIsActive,
  isCodeExpired,
} from "@/api/services/auth/signup-verification-utils"

interface SignupVerifyEmailInput {
  signupId: string
  code: string
}

export async function signupVerifyEmailService(input: SignupVerifyEmailInput) {
  const signupId = typeof input.signupId === "string" ? input.signupId.trim() : ""
  const code = typeof input.code === "string" ? input.code.trim() : ""

  if (!isValidUUID(signupId) || !/^\d{6}$/.test(code)) {
    throw new AppError("Dados invalidos", 400)
  }

  const repositories = getRepositoryFactory()
  const signup = await repositories.signupVerification.findById(signupId)

  if (!signup) {
    throw new AppError("Verificacao de cadastro nao encontrada", 404)
  }

  const now = new Date()
  ensureSignupSessionIsActive(signup, now)

  if (signup.email_verified_at) {
    return { emailVerified: true as const }
  }

  if (isCodeExpired(signup.email_code_expires_at, now)) {
    throw new AppError("Codigo de email expirado", 410)
  }

  if (code !== signup.email_code) {
    throw new AppError("Codigo de email invalido", 400)
  }

  await repositories.signupVerification.markEmailVerified(signupId, now.toISOString())

  return { emailVerified: true as const }
}
