import { getSupabaseAdminClient } from "@/api/config/database"
import { logger } from "@/api/utils/logger"

interface UpsertEmailSuppressionInput {
  email: string
  reason: string
  sourceEventType: string
  sourceEventId: string | null
  payload: unknown
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase()
}

export async function getActiveEmailSuppression(email: string): Promise<{
  reason: string
  source_event_type: string
  created_at: string
} | null> {
  const normalizedEmail = normalizeEmail(email)
  if (!normalizedEmail) return null

  const db: any = getSupabaseAdminClient()
  const { data, error } = await db
    .from("email_suppressions")
    .select("reason, source_event_type, created_at")
    .eq("email", normalizedEmail)
    .is("released_at", null)
    .maybeSingle()

  if (!error) {
    return (data as { reason: string; source_event_type: string; created_at: string } | null) ?? null
  }

  // Backward compatibility for environments without migration.
  if (error.code === "42P01" || error.code === "42703") {
    return null
  }

  logger.error("Erro ao consultar supressao de e-mail", {
    email: normalizedEmail,
    code: error.code,
    message: error.message,
  })

  return null
}

export async function upsertEmailSuppression(input: UpsertEmailSuppressionInput): Promise<void> {
  const normalizedEmail = normalizeEmail(input.email)
  if (!normalizedEmail) return

  const db: any = getSupabaseAdminClient()
  const nowIso = new Date().toISOString()

  const { error } = await db
    .from("email_suppressions")
    .upsert(
      {
        email: normalizedEmail,
        reason: input.reason,
        source_event_type: input.sourceEventType,
        source_event_id: input.sourceEventId,
        payload: input.payload ?? null,
        updated_at: nowIso,
        released_at: null,
      },
      { onConflict: "email" },
    )

  if (!error) {
    return
  }

  if (error.code === "42P01" || error.code === "42703") {
    logger.warn("Tabela de supressao de e-mail indisponivel; seguindo sem persistir bloqueio", {
      email: normalizedEmail,
    })
    return
  }

  throw error
}

