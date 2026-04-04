import { AppError } from "@/api/utils/app-error"
import { getPrintAdminEnv } from "@/api/config/env"
import { isValidUUID } from "@/api/utils/validators"
import { getAdminBypassStatusService } from "@/api/services/totem/admin-bypass-service"
import { requireActiveAdminSessionService } from "@/api/services/auth/require-active-admin-session-service"

function getAdminBypassErrorStatus(reason: string): number {
  if (reason === "disabled") return 403
  if (reason === "invalid_store") return 404
  return 401
}

function readStoreId(value: unknown): string | null {
  if (typeof value !== "string") return null
  const normalized = value.trim()
  if (!isValidUUID(normalized)) return null
  return normalized
}

function getStoreIdFromBody(body: unknown): string | null {
  if (!body || typeof body !== "object") return null
  const value = body as Record<string, unknown>
  return readStoreId(value.storeId ?? value.store_id)
}

function getStoreIdFromQuery(request: Request): string | null {
  const { searchParams } = new URL(request.url)
  return readStoreId(searchParams.get("storeId") ?? searchParams.get("store_id"))
}

export function hasValidServerAdminToken(request: Request): boolean {
  const { apiToken } = getPrintAdminEnv()
  const headerValue = request.headers.get("x-print-admin-token")
  return Boolean(headerValue && headerValue === apiToken)
}

export async function requireStoreAdminAccess(request: Request, body?: unknown): Promise<string> {
  if (hasValidServerAdminToken(request)) {
    const storeId = getStoreIdFromBody(body) ?? getStoreIdFromQuery(request)
    if (!storeId) {
      throw new AppError("storeId invalido", 400, "STORE_CONTEXT_MISMATCH", true, false)
    }
    return storeId
  }

  const bypassStatus = await getAdminBypassStatusService(request)
  if (!bypassStatus.allowed || !bypassStatus.storeId) {
    throw new AppError(
      "Acesso negado para operacao administrativa da loja",
      getAdminBypassErrorStatus(bypassStatus.reason),
    )
  }
  return bypassStatus.storeId
}

export async function requireGlobalAdminAccess(request: Request): Promise<void> {
  if (hasValidServerAdminToken(request)) return
  await requireActiveAdminSessionService(request)
}
