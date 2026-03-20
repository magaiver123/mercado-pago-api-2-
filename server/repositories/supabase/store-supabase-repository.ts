import { AppError } from "@/api/utils/app-error"
import { PublicStoreRecord } from "@/api/types/domain"
import { BaseSupabaseRepository } from "@/api/repositories/supabase/base-supabase-repository"
import { ListPublicStoresFilters, StoreRepository } from "@/api/repositories/contracts/store-repository"

function normalizeSearchTerm(value: string) {
  return value.replace(/[,%]/g, "").trim()
}

export class StoreSupabaseRepository extends BaseSupabaseRepository implements StoreRepository {
  async listActivePublicStores(filters: ListPublicStoresFilters): Promise<PublicStoreRecord[]> {
    let query = this.db
      .from("stores")
      .select("id, slug, name, rua, numero, bairro, cidade, estado, visual_status, visual_text")
      .eq("status", true)
      .order("cidade", { ascending: true })
      .order("name", { ascending: true })

    if (filters.city) {
      query = query.ilike("cidade", filters.city.trim())
    }

    if (filters.search) {
      const searchTerm = normalizeSearchTerm(filters.search)
      if (searchTerm.length > 0) {
        query = query.or(
          [
            `name.ilike.%${searchTerm}%`,
            `rua.ilike.%${searchTerm}%`,
            `bairro.ilike.%${searchTerm}%`,
            `cidade.ilike.%${searchTerm}%`,
          ].join(","),
        )
      }
    }

    const { data, error } = await query

    if (error) {
      throw new AppError("Erro ao carregar unidades", 500, "PUBLIC_STORES_FETCH_ERROR", false)
    }

    return (data as PublicStoreRecord[] | null) ?? []
  }
}
