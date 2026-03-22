import { AppError } from "@/api/utils/app-error"
import { readAdminSessionFromRequest } from "@/api/utils/admin-bypass-context"
import { getSupabaseAdminClient } from "@/api/config/database"

export async function requireActiveAdminSessionService(request: Request) {
  const session = readAdminSessionFromRequest(request)
  if (!session) {
    throw new AppError("Sessao admin invalida", 401)
  }

  const db = getSupabaseAdminClient()
  const { data, error } = await db
    .from("users")
    .select("id")
    .eq("id", session.userId)
    .eq("status", "ativo")
    .eq("role", "admin")
    .limit(1)
    .maybeSingle()

  if (error) {
    throw new AppError("Erro ao validar sessao admin", 500, "ADMIN_SESSION_VALIDATION", false)
  }

  if (!data) {
    throw new AppError("Acesso restrito a administradores", 403)
  }

  return {
    userId: session.userId,
  }
}
