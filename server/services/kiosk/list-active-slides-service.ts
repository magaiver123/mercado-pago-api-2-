import { getRepositoryFactory } from "@/api/repositories/repository-factory"

export async function listActiveSlidesService() {
  return getRepositoryFactory().kioskSlide.listActiveSlides()
}

