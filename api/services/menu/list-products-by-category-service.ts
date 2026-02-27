import { AppError } from "@/api/utils/app-error"
import { isValidUUID } from "@/api/utils/validators"
import { getRepositoryFactory } from "@/api/repositories/repository-factory"

export async function listProductsByCategoryService(categoryId: string | null) {
  if (!categoryId || !isValidUUID(categoryId)) {
    throw new AppError("Categoria invalida", 400)
  }

  return getRepositoryFactory().menu.listActiveProductsByCategory(categoryId)
}

