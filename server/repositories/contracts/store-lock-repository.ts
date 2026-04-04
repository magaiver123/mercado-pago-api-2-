import { StoreLockRecord } from "@/api/types/domain"

export interface CreateStoreLockInput {
  storeId: string
  deviceId: string | null
  status: "pending" | "active" | "inactive"
  enabled: boolean
  isPrimary: boolean
}

export interface UpdateStoreLockInput {
  id: string
  storeId: string
  deviceId?: string | null
  status?: "pending" | "active" | "inactive"
  enabled?: boolean
  isPrimary?: boolean
}

export interface LockCommandDiagnostic {
  id: string
  order_id: string
  device_id: string
  topic: string
  status: string
  error: string | null
  attempts: number
  created_at: string
  last_attempt_at: string | null
  sent_at: string | null
}

export interface StoreLockRepository {
  findPrimaryEnabledByStoreId(
    storeId: string,
  ): Promise<Pick<StoreLockRecord, "id" | "store_id" | "device_id" | "status" | "enabled" | "is_primary"> | null>
  findEnabledById(
    lockId: string,
  ): Promise<Pick<StoreLockRecord, "id" | "store_id" | "device_id" | "status" | "enabled" | "is_primary"> | null>
  findById(
    lockId: string,
  ): Promise<Pick<StoreLockRecord, "id" | "store_id" | "device_id" | "status" | "enabled" | "is_primary"> | null>
  listByStoreId(
    storeId: string,
  ): Promise<Array<Pick<StoreLockRecord, "id" | "store_id" | "device_id" | "status" | "enabled" | "is_primary" | "created_at" | "updated_at">>>
  create(input: CreateStoreLockInput): Promise<StoreLockRecord>
  update(input: UpdateStoreLockInput): Promise<StoreLockRecord>
  listDiagnosticsByStoreId(storeId: string, limit: number): Promise<LockCommandDiagnostic[]>
}
