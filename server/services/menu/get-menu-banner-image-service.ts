import { getRepositoryFactory } from "@/api/repositories/repository-factory"

export async function getMenuBannerImageService(storeId: string) {
  const imageUrl = await getRepositoryFactory().menu.getMenuBannerImageUrl(storeId)
  return { image_url: imageUrl }
}
