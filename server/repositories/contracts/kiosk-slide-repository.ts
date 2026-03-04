import { KioskSlide } from "@/api/types/domain"

export interface KioskSlideRepository {
  listActiveSlides(storeId: string): Promise<KioskSlide[]>
}
