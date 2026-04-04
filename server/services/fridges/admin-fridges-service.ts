import { getSupabaseAdminClient } from "@/api/config/database"
import { AppError } from "@/api/utils/app-error"
import { isValidUUID } from "@/api/utils/validators"

export interface AdminFridge {
  id: string
  store_id: string
  name: string
  code: string
  status: string
  is_primary: boolean
  lock_id: string
  created_at: string
  updated_at: string
  lock: {
    id: string
    device_id: string | null
    status: string
    enabled: boolean
    is_primary: boolean
  } | null
}

function normalizeFridgeRow(row: any): AdminFridge {
  const lock = Array.isArray(row?.store_locks) ? row.store_locks[0] : row?.store_locks
  return {
    id: String(row.id),
    store_id: String(row.store_id),
    name: String(row.name),
    code: String(row.code),
    status: String(row.status),
    is_primary: Boolean(row.is_primary),
    lock_id: String(row.lock_id),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    lock: lock
      ? {
          id: String(lock.id),
          device_id: typeof lock.device_id === "string" ? lock.device_id : null,
          status: String(lock.status ?? (lock.enabled ? "active" : "inactive")),
          enabled: Boolean(lock.enabled),
          is_primary: Boolean(lock.is_primary),
        }
      : null,
  }
}

function normalizeName(value: unknown): string {
  if (typeof value !== "string") return ""
  return value.trim()
}

export async function listAdminFridgesByStore(storeId: string): Promise<AdminFridge[]> {
  if (!isValidUUID(storeId)) {
    throw new AppError("storeId invalido", 400)
  }

  const db: any = getSupabaseAdminClient()
  const { data, error } = await db
    .from("fridges")
    .select(
      `
      id,
      store_id,
      name,
      code,
      status,
      is_primary,
      lock_id,
      created_at,
      updated_at,
      store_locks!left (
        id,
        device_id,
        status,
        enabled,
        is_primary
      )
    `,
    )
    .eq("store_id", storeId)
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: true })

  if (error) {
    if (error.code === "42P01" || error.code === "42703") {
      throw new AppError("Modulo de geladeiras ainda nao aplicado no banco", 503)
    }
    throw new AppError("Erro ao listar geladeiras", 500)
  }

  return ((data as any[] | null) ?? []).map(normalizeFridgeRow)
}

export async function getNextFridgeCodePreview(): Promise<string> {
  const db: any = getSupabaseAdminClient()
  const result = await db.rpc("peek_next_fridge_code")
  if (!result.error && typeof result.data === "string") {
    return result.data
  }

  const fallback = await db
    .from("fridges")
    .select("code")
    .order("created_at", { ascending: false })
    .limit(2000)

  if (fallback.error) {
    throw new AppError("Erro ao prever codigo da geladeira", 500)
  }

  let maxValue = 0
  for (const row of (fallback.data as Array<{ code?: string }> | null) ?? []) {
    const code = typeof row.code === "string" ? row.code.trim().toUpperCase() : ""
    if (!/^G[0-9]+$/.test(code)) continue
    const parsed = Number.parseInt(code.slice(1), 10)
    if (Number.isFinite(parsed)) {
      maxValue = Math.max(maxValue, parsed)
    }
  }

  return `G${String(maxValue + 1).padStart(4, "0")}`
}

export async function createAdminFridge(input: {
  storeId: string
  name: unknown
  lockId: unknown
  expectedCode?: unknown
}) {
  if (!isValidUUID(input.storeId)) {
    throw new AppError("storeId invalido", 400)
  }

  const name = normalizeName(input.name)
  if (!name) {
    throw new AppError("Nome da geladeira e obrigatorio", 400)
  }

  const lockId = typeof input.lockId === "string" ? input.lockId.trim() : ""
  if (!isValidUUID(lockId)) {
    throw new AppError("lockId invalido", 400)
  }

  const expectedCode =
    typeof input.expectedCode === "string" && input.expectedCode.trim() !== ""
      ? input.expectedCode.trim().toUpperCase()
      : null

  const db: any = getSupabaseAdminClient()
  const result = await db.rpc("create_fridge_with_auto_code", {
    p_store_id: input.storeId,
    p_name: name,
    p_lock_id: lockId,
    p_expected_code: expectedCode,
  })

  if (result.error) {
    throw new AppError("Erro ao criar geladeira", 500)
  }

  const row: any = Array.isArray(result.data) ? result.data[0] : result.data
  if (!row) {
    throw new AppError("Falha ao criar geladeira", 500)
  }

  if (row.success !== true) {
    if (row.message === "CODE_CONFLICT") {
      return {
        created: false as const,
        conflict: true as const,
        nextCode: typeof row.next_code === "string" ? row.next_code : await getNextFridgeCodePreview(),
      }
    }

    if (row.message === "LOCK_ALREADY_ASSIGNED") {
      throw new AppError("Fechadura ja vinculada a outra geladeira", 409)
    }

    if (row.message === "LOCK_NOT_ACTIVE") {
      throw new AppError("Fechadura sem dispositivo ativo para uso", 409)
    }

    if (row.message === "LOCK_STORE_MISMATCH") {
      throw new AppError("Fechadura nao pertence a loja selecionada", 400)
    }

    throw new AppError("Nao foi possivel criar geladeira", 400)
  }

  const fridgeId = typeof row.fridge_id === "string" ? row.fridge_id : null
  if (!fridgeId || !isValidUUID(fridgeId)) {
    throw new AppError("Resposta invalida ao criar geladeira", 500)
  }

  return {
    created: true as const,
    conflict: false as const,
    fridgeId,
    code: String(row.code),
  }
}

export async function updateAdminFridge(input: {
  storeId: string
  fridgeId: unknown
  name?: unknown
  status?: unknown
  lockId?: unknown
  isPrimary?: unknown
}) {
  if (!isValidUUID(input.storeId)) {
    throw new AppError("storeId invalido", 400)
  }

  const fridgeId = typeof input.fridgeId === "string" ? input.fridgeId.trim() : ""
  if (!isValidUUID(fridgeId)) {
    throw new AppError("fridgeId invalido", 400)
  }

  const updates: Record<string, unknown> = {}
  if (input.name !== undefined) {
    const name = normalizeName(input.name)
    if (!name) throw new AppError("Nome da geladeira invalido", 400)
    updates.name = name
  }

  if (input.status !== undefined) {
    const status = typeof input.status === "string" ? input.status.trim().toLowerCase() : ""
    if (status !== "active" && status !== "inactive") {
      throw new AppError("Status invalido para geladeira", 400)
    }
    updates.status = status
  }

  const db: any = getSupabaseAdminClient()

  if (input.lockId !== undefined) {
    const lockId = typeof input.lockId === "string" ? input.lockId.trim() : ""
    if (!isValidUUID(lockId)) {
      throw new AppError("lockId invalido", 400)
    }

    const moveResult = await db.rpc("reassign_lock_to_fridge", {
      p_store_id: input.storeId,
      p_fridge_id: fridgeId,
      p_lock_id: lockId,
    })

    if (moveResult.error) {
      throw new AppError("Erro ao vincular fechadura na geladeira", 500)
    }

    const row: any = Array.isArray(moveResult.data) ? moveResult.data[0] : moveResult.data
    if (!row?.success) {
      throw new AppError("Nao foi possivel vincular a fechadura", 400)
    }
  }

  if (input.isPrimary === true) {
    const resetOldPrimary = await db
      .from("fridges")
      .update({ is_primary: false })
      .eq("store_id", input.storeId)
      .eq("is_primary", true)
      .neq("id", fridgeId)

    if (resetOldPrimary.error) {
      throw new AppError("Erro ao atualizar geladeira principal", 500)
    }

    updates.is_primary = true
  }

  if (Object.keys(updates).length > 0) {
    const { error } = await db
      .from("fridges")
      .update(updates)
      .eq("id", fridgeId)
      .eq("store_id", input.storeId)

    if (error) {
      throw new AppError("Erro ao atualizar geladeira", 500)
    }
  }
}

export async function inactivateAdminFridge(storeId: string, fridgeId: string) {
  if (!isValidUUID(storeId) || !isValidUUID(fridgeId)) {
    throw new AppError("Dados invalidos", 400)
  }

  const db: any = getSupabaseAdminClient()
  const { data, error } = await db
    .from("fridges")
    .select("id, is_primary")
    .eq("id", fridgeId)
    .eq("store_id", storeId)
    .maybeSingle()

  if (error) {
    throw new AppError("Erro ao localizar geladeira", 500)
  }
  if (!data) {
    throw new AppError("Geladeira nao encontrada", 404)
  }
  if (data.is_primary === true) {
    throw new AppError("A geladeira principal nao pode ser inativada", 409)
  }

  const update = await db
    .from("fridges")
    .update({ status: "inactive" })
    .eq("id", fridgeId)
    .eq("store_id", storeId)

  if (update.error) {
    throw new AppError("Erro ao inativar geladeira", 500)
  }
}

export async function listOperationalFridgesForKiosk(storeId: string) {
  if (!isValidUUID(storeId)) {
    throw new AppError("storeId invalido", 400)
  }

  const db: any = getSupabaseAdminClient()
  const { data, error } = await db
    .from("fridges")
    .select(
      `
      id,
      name,
      code,
      status,
      is_primary,
      store_locks!inner (
        id,
        status,
        enabled,
        device_id
      )
    `,
    )
    .eq("store_id", storeId)
    .eq("status", "active")
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: true })

  if (error) {
    if (error.code === "42P01" || error.code === "42703") {
      throw new AppError("Modulo de geladeiras ainda nao aplicado no banco", 503)
    }
    throw new AppError("Erro ao listar geladeiras da loja", 500)
  }

  return ((data as any[] | null) ?? [])
    .map((row) => {
      const lock = Array.isArray(row.store_locks) ? row.store_locks[0] : row.store_locks
      const lockStatus = typeof lock?.status === "string" ? lock.status : lock?.enabled ? "active" : "inactive"
      const enabled = lock?.enabled === true
      const deviceId = typeof lock?.device_id === "string" ? lock.device_id.trim() : ""
      const isOperational = enabled && lockStatus === "active" && deviceId !== ""

      return {
        id: String(row.id),
        name: String(row.name),
        code: String(row.code),
        is_primary: Boolean(row.is_primary),
        operational: isOperational,
      }
    })
    .filter((fridge) => fridge.operational)
}
