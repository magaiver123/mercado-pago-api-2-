import { AppError } from "@/api/utils/app-error"
import { BaseSupabaseRepository } from "@/api/repositories/supabase/base-supabase-repository"
import { StoreLockRepository } from "@/api/repositories/contracts/store-lock-repository"
import { StoreLockRecord } from "@/api/types/domain"

export class StoreLockSupabaseRepository extends BaseSupabaseRepository implements StoreLockRepository {
  async findPrimaryEnabledByStoreId(
    storeId: string,
  ): Promise<Pick<StoreLockRecord, "id" | "store_id" | "device_id" | "enabled" | "is_primary"> | null> {
    const { data, error } = await this.db
      .from("store_locks")
      .select("id, store_id, device_id, enabled, is_primary")
      .eq("store_id", storeId)
      .eq("enabled", true)
      .eq("is_primary", true)
      .limit(1)
      .maybeSingle()

    if (error) {
      throw new AppError("Erro ao buscar fechadura da loja", 500)
    }

    return (data as Pick<StoreLockRecord, "id" | "store_id" | "device_id" | "enabled" | "is_primary"> | null) ?? null
  }
}
