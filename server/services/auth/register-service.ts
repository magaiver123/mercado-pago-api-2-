import bcrypt from "bcryptjs"
import { AppError } from "@/api/utils/app-error"
import { validateCPF } from "@/lib/cpf-validator"
import { getRepositoryFactory } from "@/api/repositories/repository-factory"

interface RegisterInput {
  cpf: string
  name: string
  phone: string
  email: string
  password: string
}

export async function registerService(input: RegisterInput) {
  if (
    !input.cpf ||
    typeof input.cpf !== "string" ||
    !validateCPF(input.cpf) ||
    !input.name ||
    typeof input.name !== "string" ||
    !input.phone ||
    typeof input.phone !== "string" ||
    input.phone.length < 10 ||
    !input.email ||
    typeof input.email !== "string" ||
    !input.password ||
    typeof input.password !== "string" ||
    input.password.length < 6
  ) {
    throw new AppError("Dados invalidos", 400)
  }

  const repositories = getRepositoryFactory()

  if (await repositories.user.existsByCpf(input.cpf)) {
    throw new AppError("CPF ja cadastrado", 409)
  }

  if (await repositories.user.existsByEmail(input.email)) {
    throw new AppError("Email ja cadastrado", 409)
  }

  if (await repositories.user.existsByPhone(input.phone)) {
    throw new AppError("Telefone ja cadastrado", 409)
  }

  const passwordHash = await bcrypt.hash(input.password, 10)

  await repositories.user.create({
    cpf: input.cpf,
    name: input.name,
    phone: input.phone,
    email: input.email,
    passwordHash,
    status: "ativo",
    createdAt: new Date().toISOString(),
  })

  return { success: true }
}

