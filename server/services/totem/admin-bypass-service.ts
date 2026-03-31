import { AppError } from "@/api/utils/app-error"
import { sanitizeString } from "@/api/utils/sanitize"
import { getSupabaseAdminClient } from "@/api/config/database"
import {
  readAdminBypassFromRequest,
  readAdminSessionFromRequest,
} from "@/api/utils/admin-bypass-context"
import { getAdminBypassEnv } from "@/api/config/env"

type AdminBypassResult = {
  allowed: boolean
  reason: "disabled" | "no_admin_session" | "invalid_admin" | "missing_bypass" | "user_mismatch" | "invalid_store" | "ok"
  userId?: string
  storeId?: string
  storeSlug?: string
}

function normalizeStoreSlug(value: unknown): string | null {
  const sanitized = sanitizeString(value)
  if (!sanitized) return null

  // Accept placeholders copied from docs/URLs like "<minha-loja>"
  const withoutPlaceholderWrapper = sanitized.replace(/^<(.+)>$/, "$1").trim()
  const normalized = withoutPlaceholderWrapper.toLowerCase()
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalized)) {
    return null
  }

  return normalized
}

async function resolveActiveStoreBySlug(storeSlug: string): Promise<{ id: string; slug: string } | null> {
  const db = getSupabaseAdminClient()
  const { data, error } = await db
    .from("stores")
    .select("id, slug")
    .eq("slug", storeSlug)
    .eq("status", true)
    .limit(1)
    .maybeSingle()

  if (error) {
    throw new AppError("Erro interno", 500, "STORE_LOOKUP_ERROR", false)
  }

  const storeData = data as { id: string; slug: string } | null
  if (!storeData) {
    return null
  }

  return {
    id: storeData.id,
    slug: storeData.slug,
  }
}

async function isUserActiveAdmin(userId: string): Promise<boolean> {
  const db = getSupabaseAdminClient()
  const { data, error } = await db
    .from("users")
    .select("id")
    .eq("id", userId)
    .eq("status", "ativo")
    .eq("role", "admin")
    .limit(1)
    .maybeSingle()

  if (error) {
    throw new AppError("Erro interno", 500, "ADMIN_VALIDATION_ERROR", false)
  }

  const userData = data as { id: string } | null
  return Boolean(userData?.id)
}

async function getValidatedAdminFromSession(request: Request): Promise<string | null> {
  const session = readAdminSessionFromRequest(request)
  if (!session) {
    return null
  }

  const isAdmin = await isUserActiveAdmin(session.userId)
  if (!isAdmin) {
    return null
  }

  return session.userId
}

export async function activateAdminBypassService(
  request: Request,
  input: { storeSlug: unknown },
): Promise<AdminBypassResult> {
  const { enabled } = getAdminBypassEnv()
  if (!enabled) {
    return { allowed: false, reason: "disabled" }
  }

  const adminUserId = await getValidatedAdminFromSession(request)
  if (!adminUserId) {
    return { allowed: false, reason: "invalid_admin" }
  }

  const storeSlug = normalizeStoreSlug(input.storeSlug)
  if (!storeSlug) {
    throw new AppError("storeSlug inválido. Use o slug sem < >, por exemplo: nino-imoveis", 400)
  }

  const store = await resolveActiveStoreBySlug(storeSlug)
  if (!store) {
    return { allowed: false, reason: "invalid_store" }
  }

  return {
    allowed: true,
    reason: "ok",
    userId: adminUserId,
    storeId: store.id,
    storeSlug: store.slug,
  }
}

export async function getAdminBypassStatusService(request: Request): Promise<AdminBypassResult> {
  const { enabled } = getAdminBypassEnv()
  if (!enabled) {
    return { allowed: false, reason: "disabled" }
  }

  const adminUserId = await getValidatedAdminFromSession(request)
  if (!adminUserId) {
    return { allowed: false, reason: "no_admin_session" }
  }

  const bypass = readAdminBypassFromRequest(request)
  if (!bypass) {
    return { allowed: false, reason: "missing_bypass" }
  }

  if (bypass.userId !== adminUserId) {
    return { allowed: false, reason: "user_mismatch" }
  }

  const store = await resolveActiveStoreBySlug(bypass.storeSlug)
  if (!store || store.id !== bypass.storeId) {
    return { allowed: false, reason: "invalid_store" }
  }

  return {
    allowed: true,
    reason: "ok",
    userId: bypass.userId,
    storeId: bypass.storeId,
    storeSlug: bypass.storeSlug,
  }
}
