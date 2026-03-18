import bcrypt from "bcryptjs"
import { validateCPF } from "@/lib/cpf-validator"
import { getRepositoryFactory } from "@/api/repositories/repository-factory"
import { AppError } from "@/api/utils/app-error"
import { isValidEmail } from "@/api/utils/validators"
import { normalizePhone } from "@/api/utils/sanitize"
import { sendSignupCodeEmail } from "@/api/services/auth/send-signup-code-email"
import {
  generateSignupCode,
  maskEmail,
  maskPhone,
  shouldExposeDebugPhoneCode,
  SIGNUP_CODE_EXPIRATION_MS,
  SIGNUP_RESEND_COOLDOWN_MS,
  SIGNUP_SESSION_EXPIRATION_MS,
} from "@/api/services/auth/signup-verification-utils"

interface SignupStartInput {
  name: string
  cpf: string
  phone: string
  email: string
  password: string
}

export async function signupStartService(input: SignupStartInput) {
  const name = typeof input.name === "string" ? input.name.trim() : ""
  const cpf = typeof input.cpf === "string" ? input.cpf.replace(/\D/g, "") : ""
  const phone = typeof input.phone === "string" ? normalizePhone(input.phone) : ""
  const email = typeof input.email === "string" ? input.email.trim() : ""
  const password = typeof input.password === "string" ? input.password : ""

  if (!name || !validateCPF(cpf) || phone.length < 10 || phone.length > 11 || !isValidEmail(email) || password.length < 6) {
    throw new AppError("Dados inválidos", 400)
  }

  const repositories = getRepositoryFactory()

  if (await repositories.user.existsByCpf(cpf)) {
    throw new AppError("CPF já cadastrado", 409)
  }

  if (await repositories.user.existsByEmail(email)) {
    throw new AppError("E-mail já cadastrado", 409)
  }

  if (await repositories.user.existsByPhone(phone)) {
    throw new AppError("Telefone já cadastrado", 409)
  }

  const passwordHash = await bcrypt.hash(password, 10)
  const now = new Date()
  const emailCode = generateSignupCode()
  const phoneCode = generateSignupCode()
  const codeExpiresAt = new Date(now.getTime() + SIGNUP_CODE_EXPIRATION_MS).toISOString()
  const sessionExpiresAt = new Date(now.getTime() + SIGNUP_SESSION_EXPIRATION_MS).toISOString()

  const signup = await repositories.signupVerification.create({
    name,
    cpf,
    phone,
    email,
    passwordHash,
    emailCode,
    phoneCode,
    emailCodeExpiresAt: codeExpiresAt,
    phoneCodeExpiresAt: codeExpiresAt,
    lastEmailSentAt: now.toISOString(),
    lastPhoneSentAt: now.toISOString(),
    expiresAt: sessionExpiresAt,
  })

  await sendSignupCodeEmail({
    email,
    code: emailCode,
    recipientName: name,
    expiresInMinutes: Math.ceil(SIGNUP_CODE_EXPIRATION_MS / 60_000),
  })

  return {
    signupId: signup.id,
    expiresIn: Math.ceil(SIGNUP_SESSION_EXPIRATION_MS / 1000),
    resendCooldown: Math.ceil(SIGNUP_RESEND_COOLDOWN_MS / 1000),
    emailMasked: maskEmail(email),
    phoneMasked: maskPhone(phone),
    debugPhoneCode: shouldExposeDebugPhoneCode() ? phoneCode : undefined,
  }
}
