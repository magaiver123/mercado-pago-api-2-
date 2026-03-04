import { getRepositoryFactory } from "@/api/repositories/repository-factory"

export async function listCategoriesService(storeId: string) {
  return getRepositoryFactory().menu.listActiveCategories(storeId)
}
