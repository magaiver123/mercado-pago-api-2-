import { AppError } from "@/api/utils/app-error"
import { KioskSlide } from "@/api/types/domain"
import { BaseSupabaseRepository } from "@/api/repositories/supabase/base-supabase-repository"
import { KioskSlideRepository } from "@/api/repositories/contracts/kiosk-slide-repository"

export class KioskSlideSupabaseRepository extends BaseSupabaseRepository implements KioskSlideRepository {
  async listActiveSlides(): Promise<KioskSlide[]> {
    const { data, error } = await this.db
      .from("kiosk_slides")
      .select("id, image_url, duration")
      .eq("active", true)
      .order("order", { ascending: true })

    if (error) throw new AppError("Erro ao carregar slides", 500)
    return (data as KioskSlide[] | null) ?? []
  }
}

