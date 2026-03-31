import { AppError } from "@/api/utils/app-error"
import { isValidUUID } from "@/api/utils/validators"
import { getRepositoryFactory } from "@/api/repositories/repository-factory"

export async function listProductsByCategoryService(storeId: string, categoryId: string | null) {
  if (!storeId || !isValidUUID(storeId)) {
    throw new AppError("Loja inválida", 400)
  }

  if (!categoryId || !isValidUUID(categoryId)) {
    throw new AppError("Categoria inválida", 400)
  }

  return getRepositoryFactory().menu.listActiveProductsByCategory(storeId, categoryId)
}
