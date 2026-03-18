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
    throw new AppError("Dados inválidos", 400)
  }

  const repositories = getRepositoryFactory()
  const signup = await repositories.signupVerification.findById(signupId)

  if (!signup) {
    throw new AppError("Verificação de cadastro não encontrada", 404)
  }

  if (signup.completed_at) {
    return { emailVerified: true as const }
  }

  const now = new Date()
  ensureSignupSessionIsActive(signup, now)

  if (!signup.email_verified_at) {
    if (isCodeExpired(signup.email_code_expires_at, now)) {
      throw new AppError("Código de e-mail expirado", 410)
    }

    if (code !== signup.email_code) {
      throw new AppError("Código de e-mail inválido", 400)
    }

    await repositories.signupVerification.markEmailVerified(signupId, now.toISOString())
  }

  const existingByEmail = await repositories.user.findByEmail(signup.email)
  if (existingByEmail) {
    const alreadyCreatedFromSameData = existingByEmail.cpf === signup.cpf && existingByEmail.phone === signup.phone

    if (!alreadyCreatedFromSameData) {
      throw new AppError("E-mail já cadastrado", 409)
    }

    await repositories.signupVerification.markCompleted(signupId, now.toISOString())
    return { emailVerified: true as const }
  }

  if (await repositories.user.existsByCpf(signup.cpf)) {
    throw new AppError("CPF já cadastrado", 409)
  }

  if (await repositories.user.existsByPhone(signup.phone)) {
    throw new AppError("Telefone já cadastrado", 409)
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

  return { emailVerified: true as const }
}
