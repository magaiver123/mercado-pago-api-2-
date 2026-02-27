import bcrypt from "bcryptjs"
import { AppError } from "@/api/utils/app-error"
import { getRepositoryFactory } from "@/api/repositories/repository-factory"

interface EmailLoginInput {
  email: string
  password: string
}

export async function emailLoginService(input: EmailLoginInput) {
  if (!input.email || typeof input.email !== "string" || !input.password || typeof input.password !== "string") {
    throw new AppError("Dados invalidos", 400)
  }

  const repositories = getRepositoryFactory()
  const user = await repositories.user.findByEmail(input.email)

  if (!user) {
    throw new AppError("Email ou senha invalidos", 401)
  }

  if (user.status !== "ativo") {
    throw new AppError("Usuario bloqueado", 403)
  }

  const passwordMatch = await bcrypt.compare(input.password, user.password_hash)
  if (!passwordMatch) {
    throw new AppError("Email ou senha invalidos", 401)
  }

  await repositories.user.updateLastAccess(user.id, new Date().toISOString())

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    cpf: user.cpf,
  }
}

