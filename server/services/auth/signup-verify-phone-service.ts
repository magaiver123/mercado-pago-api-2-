import { getRepositoryFactory } from "@/api/repositories/repository-factory"
import { AppError } from "@/api/utils/app-error"
import { isValidUUID } from "@/api/utils/validators"
import {
  ensureSignupSessionIsActive,
  isCodeExpired,
} from "@/api/services/auth/signup-verification-utils"

interface SignupVerifyPhoneInput {
  signupId: string
  code: string
}

export async function signupVerifyPhoneService(input: SignupVerifyPhoneInput) {
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

  if (!signup.email_verified_at) {
    throw new AppError("Email ainda nao verificado", 400)
  }

  if (!signup.phone_verified_at) {
    if (isCodeExpired(signup.phone_code_expires_at, now)) {
      throw new AppError("Codigo de telefone expirado", 410)
    }

    if (code !== signup.phone_code) {
      throw new AppError("Codigo de telefone invalido", 400)
    }

    await repositories.signupVerification.markPhoneVerified(signupId, now.toISOString())
  }

  if (signup.completed_at) {
    return { success: true as const }
  }

  if (await repositories.user.existsByCpf(signup.cpf)) {
    throw new AppError("CPF ja cadastrado", 409)
  }

  if (await repositories.user.existsByEmail(signup.email)) {
    throw new AppError("Email ja cadastrado", 409)
  }

  if (await repositories.user.existsByPhone(signup.phone)) {
    throw new AppError("Telefone ja cadastrado", 409)
  }

  await repositories.user.create({
    cpf: signup.cpf,
    name: signup.name,
    phone: signup.phone,
    email: signup.email,
    passwordHash: signup.password_hash,
    status: "ativo",
    createdAt: now.toISOString(),
  })

  await repositories.signupVerification.markCompleted(signupId, now.toISOString())

  return { success: true as const }
}
