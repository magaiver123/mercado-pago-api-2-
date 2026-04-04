import { AppError } from "@/api/utils/app-error"
import { isValidUUID } from "@/api/utils/validators"
import { getRepositoryFactory } from "@/api/repositories/repository-factory"

export async function listCategoriesService(storeId: string, fridgeId?: string | null) {
  if (!storeId || !isValidUUID(storeId)) {
    throw new AppError("Loja invalida", 400)
  }

  if (fridgeId && !isValidUUID(fridgeId)) {
    throw new AppError("Geladeira invalida", 400)
  }

  return getRepositoryFactory().menu.listActiveCategories(storeId, fridgeId)
}
