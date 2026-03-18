import { getRepositoryFactory } from "@/api/repositories/repository-factory"

export async function listActiveMenuBannersService(storeId: string) {
  return getRepositoryFactory().menu.listActiveMenuBanners(storeId)
}
