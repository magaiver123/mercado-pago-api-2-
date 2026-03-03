import { AppError } from "@/api/utils/app-error"
import { isValidUUID } from "@/api/utils/validators"
import { getRepositoryFactory } from "@/api/repositories/repository-factory"

export async function getUserProfileService(userId: string | null) {
  if (!userId || !isValidUUID(userId)) {
    throw new AppError("Usuario invalido", 400)
  }

  const user = await getRepositoryFactory().user.findActiveById(userId)

  if (!user) {
    throw new AppError("Usuario nao encontrado", 404)
  }

  return {
    id: user.id,
    name: user.name,
    cpf: user.cpf,
    phone: user.phone,
    email: user.email,
    created_at: user.created_at,
    last_access_at: user.last_access_at,
    status: user.status,
    role: user.role,
  }
}

