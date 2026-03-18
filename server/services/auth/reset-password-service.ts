import bcrypt from "bcryptjs"
import { AppError } from "@/api/utils/app-error"
import { getRepositoryFactory } from "@/api/repositories/repository-factory"

interface ResetPasswordInput {
  email: string
  code: string
  password: string
}

export async function resetPasswordService(input: ResetPasswordInput) {
  if (!input.email || !input.code || !input.password || input.password.length < 6) {
    throw new AppError("Dados inválidos", 400)
  }

  const repositories = getRepositoryFactory()

  const reset = await repositories.passwordReset.findValid(input.email, input.code, new Date().toISOString())
  if (!reset) {
    throw new AppError("Código inválido", 400)
  }

  const user = await repositories.user.findById(reset.user_id)
  if (!user) {
    throw new AppError("Usuário inválido", 400)
  }

  const isSamePassword = await bcrypt.compare(input.password, user.password_hash)
  if (isSamePassword) {
    throw new AppError("A nova senha não pode ser igual a anterior", 400)
  }

  const newHash = await bcrypt.hash(input.password, 10)

  await repositories.user.updatePasswordHash(reset.user_id, newHash)
  await repositories.passwordReset.markUsed(reset.id, new Date().toISOString())

  return { success: true }
}

