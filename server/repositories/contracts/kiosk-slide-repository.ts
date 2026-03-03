import { KioskSlide } from "@/api/types/domain"

export interface KioskSlideRepository {
  listActiveSlides(): Promise<KioskSlide[]>
}

