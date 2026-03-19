import { PublicStoreRecord } from "@/api/types/domain"

export interface ListPublicStoresFilters {
  search: string | null
  city: string | null
}

export interface StoreRepository {
  listActivePublicStores(filters: ListPublicStoresFilters): Promise<PublicStoreRecord[]>
}
