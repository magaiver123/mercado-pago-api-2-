import { AppError } from "@/api/utils/app-error"
import {
  CreateStoreLockInput,
  LockCommandDiagnostic,
  StoreLockRepository,
  UpdateStoreLockInput,
} from "@/api/repositories/contracts/store-lock-repository"
import { BaseSupabaseRepository } from "@/api/repositories/supabase/base-supabase-repository"
import { StoreLockRecord } from "@/api/types/domain"

type LockSummary = Pick<
  StoreLockRecord,
  "id" | "store_id" | "device_id" | "status" | "enabled" | "is_primary"
>

function normalizeLockStatus(row: any): "pending" | "active" | "inactive" {
  if (row?.status === "pending" || row?.status === "inactive" || row?.status === "active") {
    return row.status
  }
  return row?.enabled ? "active" : "inactive"
}

function mapLockSummary(row: any): LockSummary {
  return {
    id: String(row.id),
    store_id: String(row.store_id),
    device_id: typeof row.device_id === "string" ? row.device_id : null,
    status: normalizeLockStatus(row),
    enabled: Boolean(row.enabled),
    is_primary: Boolean(row.is_primary),
  }
}

function mapLockRecord(row: any): StoreLockRecord {
  return {
    ...mapLockSummary(row),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  }
}

export class StoreLockSupabaseRepository extends BaseSupabaseRepository implements StoreLockRepository {
  private async maybeSelectWithLegacyFallback<T>(
    withStatus: () => Promise<{ data: T | null; error: any }>,
    withoutStatus: () => Promise<{ data: T | null; error: any }>,
  ) {
    const first = await withStatus()
    if (!first.error) return first
    if (first.error.code !== "42703") return first
    return withoutStatus()
  }

  async findPrimaryEnabledByStoreId(storeId: string): Promise<LockSummary | null> {
    const result = await this.maybeSelectWithLegacyFallback(
      () =>
        this.db
          .from("store_locks")
          .select("id, store_id, device_id, status, enabled, is_primary")
          .eq("store_id", storeId)
          .eq("enabled", true)
          .eq("status", "active")
          .eq("is_primary", true)
          .limit(1)
          .maybeSingle(),
      () =>
        this.db
          .from("store_locks")
          .select("id, store_id, device_id, enabled, is_primary")
          .eq("store_id", storeId)
          .eq("enabled", true)
          .eq("is_primary", true)
          .limit(1)
          .maybeSingle(),
    )

    if (result.error) {
      throw new AppError("Erro ao buscar fechadura da loja", 500)
    }

    if (!result.data) return null
    return mapLockSummary(result.data)
  }

  async findEnabledById(lockId: string): Promise<LockSummary | null> {
    const result = await this.maybeSelectWithLegacyFallback(
      () =>
        this.db
          .from("store_locks")
          .select("id, store_id, device_id, status, enabled, is_primary")
          .eq("id", lockId)
          .eq("enabled", true)
          .eq("status", "active")
          .maybeSingle(),
      () =>
        this.db
          .from("store_locks")
          .select("id, store_id, device_id, enabled, is_primary")
          .eq("id", lockId)
          .eq("enabled", true)
          .maybeSingle(),
    )

    if (result.error) {
      throw new AppError("Erro ao buscar fechadura", 500)
    }

    if (!result.data) return null
    return mapLockSummary(result.data)
  }

  async findById(lockId: string): Promise<LockSummary | null> {
    const result = await this.maybeSelectWithLegacyFallback(
      () =>
        this.db
          .from("store_locks")
          .select("id, store_id, device_id, status, enabled, is_primary")
          .eq("id", lockId)
          .maybeSingle(),
      () =>
        this.db
          .from("store_locks")
          .select("id, store_id, device_id, enabled, is_primary")
          .eq("id", lockId)
          .maybeSingle(),
    )

    if (result.error) {
      throw new AppError("Erro ao buscar fechadura", 500)
    }

    if (!result.data) return null
    return mapLockSummary(result.data)
  }

  async listByStoreId(
    storeId: string,
  ): Promise<
    Array<
      Pick<
        StoreLockRecord,
        "id" | "store_id" | "device_id" | "status" | "enabled" | "is_primary" | "created_at" | "updated_at"
      >
    >
  > {
    const result = await this.maybeSelectWithLegacyFallback(
      () =>
        this.db
          .from("store_locks")
          .select("id, store_id, device_id, status, enabled, is_primary, created_at, updated_at")
          .eq("store_id", storeId)
          .order("created_at", { ascending: true }),
      () =>
        this.db
          .from("store_locks")
          .select("id, store_id, device_id, enabled, is_primary, created_at, updated_at")
          .eq("store_id", storeId)
          .order("created_at", { ascending: true }),
    )

    if (result.error) {
      throw new AppError("Erro ao listar fechaduras", 500)
    }

    return ((result.data as any[] | null) ?? []).map(mapLockRecord)
  }

  async create(input: CreateStoreLockInput): Promise<StoreLockRecord> {
    const payload = {
      store_id: input.storeId,
      device_id: input.deviceId,
      status: input.status,
      enabled: input.enabled,
      is_primary: input.isPrimary,
    }

    const { data, error } = await this.db
      .from("store_locks")
      .insert(payload)
      .select("id, store_id, device_id, status, enabled, is_primary, created_at, updated_at")
      .single()

    if (error || !data) {
      throw new AppError("Erro ao criar fechadura", 500)
    }

    return mapLockRecord(data)
  }

  async update(input: UpdateStoreLockInput): Promise<StoreLockRecord> {
    const payload: Record<string, unknown> = {}

    if (input.deviceId !== undefined) payload.device_id = input.deviceId
    if (input.status !== undefined) payload.status = input.status
    if (input.enabled !== undefined) payload.enabled = input.enabled
    if (input.isPrimary !== undefined) payload.is_primary = input.isPrimary

    const { data, error } = await this.db
      .from("store_locks")
      .update(payload)
      .eq("id", input.id)
      .eq("store_id", input.storeId)
      .select("id, store_id, device_id, status, enabled, is_primary, created_at, updated_at")
      .single()

    if (error || !data) {
      throw new AppError("Erro ao atualizar fechadura", 500)
    }

    return mapLockRecord(data)
  }

  async listDiagnosticsByStoreId(storeId: string, limit: number): Promise<LockCommandDiagnostic[]> {
    const normalizedLimit = Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 100) : 20
    const { data, error } = await this.db
      .from("lock_commands")
      .select("id, order_id, device_id, topic, status, error, attempts, created_at, last_attempt_at, sent_at")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false })
      .limit(normalizedLimit)

    if (error) {
      throw new AppError("Erro ao carregar diagnostico de fechaduras", 500)
    }

    return ((data as LockCommandDiagnostic[] | null) ?? [])
  }
}
