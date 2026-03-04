import { getRepositoryFactory } from "@/api/repositories/repository-factory"

export async function listActiveSlidesService(storeId: string) {
  return getRepositoryFactory().kioskSlide.listActiveSlides(storeId)
}