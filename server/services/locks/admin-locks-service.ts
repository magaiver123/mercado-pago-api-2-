import { getRepositoryFactory } from "@/api/repositories/repository-factory"
import { getSupabaseAdminClient } from "@/api/config/database"
import { AppError } from "@/api/utils/app-error"
import { sanitizeString } from "@/api/utils/sanitize"
import { isValidUUID } from "@/api/utils/validators"
import { testOpenLockService } from "@/api/services/locks/test-open-lock-service"

function normalizeLimit(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.min(Math.max(Math.trunc(value), 1), 100)
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number.parseInt(value, 10)
    if (Number.isFinite(parsed)) {
      return Math.min(Math.max(parsed, 1), 100)
    }
  }
  return 20
}

function normalizeStatus(value: unknown): "pending" | "active" | "inactive" | null {
  if (typeof value !== "string") return null
  const normalized = value.trim().toLowerCase()
  if (normalized === "pending" || normalized === "active" || normalized === "inactive") {
    return normalized
  }
  return null
}

export async function listAdminLocksByStore(storeId: string) {
  if (!isValidUUID(storeId)) {
    throw new AppError("storeId invalido", 400)
  }

  const repositories = getRepositoryFactory()
  const locks = await repositories.storeLock.listByStoreId(storeId)

  const db: any = getSupabaseAdminClient()
  const fridgeJoin = await db
    .from("fridges")
    .select("id, name, code, lock_id")
    .eq("store_id", storeId)

  const fridgeByLockId = new Map<string, { id: string; name: string; code: string }>()
  for (const fridge of (fridgeJoin.data as any[] | null) ?? []) {
    if (typeof fridge.lock_id !== "string") continue
    fridgeByLockId.set(fridge.lock_id, {
      id: String(fridge.id),
      name: String(fridge.name),
      code: String(fridge.code),
    })
  }

  return locks.map((lock) => ({
    ...lock,
    fridge: fridgeByLockId.get(lock.id) ?? null,
  }))
}

export async function createAdminLock(input: {
  storeId: string
  deviceId?: unknown
  status?: unknown
  isPrimary?: unknown
}) {
  if (!isValidUUID(input.storeId)) {
    throw new AppError("storeId invalido", 400)
  }

  const repositories = getRepositoryFactory()
  const normalizedDeviceId = sanitizeString(input.deviceId)
  const normalizedStatus = normalizeStatus(input.status)

  const status = normalizedStatus ?? (normalizedDeviceId ? "active" : "pending")
  const enabled = status === "active"
  const isPrimary = input.isPrimary === true

  if ((status === "active" || status === "inactive") && !normalizedDeviceId) {
    throw new AppError("deviceId e obrigatorio para locks ativos/inativos", 400)
  }

  if (status === "pending" && normalizedDeviceId) {
    throw new AppError("Lock pendente nao pode ter deviceId", 400)
  }

  if (isPrimary) {
    const existing = await repositories.storeLock.findPrimaryEnabledByStoreId(input.storeId)
    if (existing) {
      await repositories.storeLock.update({
        id: existing.id,
        storeId: input.storeId,
        isPrimary: false,
      })
    }
  }

  return repositories.storeLock.create({
    storeId: input.storeId,
    deviceId: normalizedDeviceId,
    status,
    enabled,
    isPrimary,
  })
}

export async function updateAdminLock(input: {
  storeId: string
  lockId: unknown
  deviceId?: unknown
  status?: unknown
  isPrimary?: unknown
}) {
  if (!isValidUUID(input.storeId)) {
    throw new AppError("storeId invalido", 400)
  }

  const lockId = typeof input.lockId === "string" ? input.lockId.trim() : ""
  if (!isValidUUID(lockId)) {
    throw new AppError("lockId invalido", 400)
  }

  const repositories = getRepositoryFactory()
  const current = await repositories.storeLock.findById(lockId)
  if (!current || current.store_id !== input.storeId) {
    throw new AppError("Fechadura nao encontrada para a loja", 404)
  }

  const statusCandidate = input.status !== undefined ? normalizeStatus(input.status) : null
  const deviceIdCandidate =
    input.deviceId !== undefined
      ? sanitizeString(input.deviceId)
      : current.device_id

  const nextStatus = statusCandidate ?? (current.status as "pending" | "active" | "inactive")

  if ((nextStatus === "active" || nextStatus === "inactive") && !deviceIdCandidate) {
    throw new AppError("deviceId e obrigatorio para locks ativos/inativos", 400)
  }
  if (nextStatus === "pending" && deviceIdCandidate) {
    throw new AppError("Lock pendente nao pode ter deviceId", 400)
  }

  const enabled = nextStatus === "active"
  const updatePayload: {
    id: string
    storeId: string
    deviceId?: string | null
    status?: "pending" | "active" | "inactive"
    enabled?: boolean
    isPrimary?: boolean
  } = {
    id: lockId,
    storeId: input.storeId,
    status: nextStatus,
    enabled,
  }

  if (input.deviceId !== undefined) {
    updatePayload.deviceId = deviceIdCandidate
  }

  if (input.isPrimary === true) {
    const oldPrimary = await repositories.storeLock.findPrimaryEnabledByStoreId(input.storeId)
    if (oldPrimary && oldPrimary.id !== lockId) {
      await repositories.storeLock.update({
        id: oldPrimary.id,
        storeId: input.storeId,
        isPrimary: false,
      })
    }
    updatePayload.isPrimary = true
  }

  return repositories.storeLock.update(updatePayload)
}

export async function testAdminLockOpen(input: {
  storeId: string
  lockId?: unknown
  socketId?: unknown
}) {
  return testOpenLockService({
    storeId: input.storeId,
    lockId: input.lockId,
    socketId: input.socketId,
  })
}

export async function listAdminLockDiagnostics(input: {
  storeId: string
  limit?: unknown
}) {
  const repositories = getRepositoryFactory()
  const limit = normalizeLimit(input.limit)
  return repositories.storeLock.listDiagnosticsByStoreId(input.storeId, limit)
}
