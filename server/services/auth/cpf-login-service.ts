import { AppError } from "@/api/utils/app-error"
import { validateCPF } from "@/lib/cpf-validator"
import { getRepositoryFactory } from "@/api/repositories/repository-factory"

export async function cpfLoginService(cpf: string) {
  if (!cpf || typeof cpf !== "string" || !validateCPF(cpf)) {
    throw new AppError("CPF invalido", 400)
  }

  const repositories = getRepositoryFactory()
  const user = await repositories.user.findActiveByCpf(cpf)

  if (!user) {
    throw new AppError("CPF invalido", 401)
  }

  await repositories.user.updateLastAccess(user.id, new Date().toISOString())

  return {
    id: user.id,
    cpf: user.cpf,
    name: user.name,
    phone: user.phone,
    email: user.email,
  }
}

