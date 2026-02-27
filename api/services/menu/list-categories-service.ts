import { getRepositoryFactory } from "@/api/repositories/repository-factory"

export async function listCategoriesService() {
  return getRepositoryFactory().menu.listActiveCategories()
}

