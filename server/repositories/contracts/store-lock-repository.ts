import { StoreLockRecord } from "@/api/types/domain"

export interface StoreLockRepository {
  findPrimaryEnabledByStoreId(
    storeId: string,
  ): Promise<Pick<StoreLockRecord, "id" | "store_id" | "device_id" | "enabled" | "is_primary"> | null>
}
