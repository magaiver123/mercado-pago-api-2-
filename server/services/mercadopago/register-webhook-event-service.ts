import { getSupabaseAdminClient } from "@/api/config/database"

interface RegisterWebhookEventInput {
  provider?: string
  eventKey: string
  action: string | null
  mercadopagoOrderId: string | null
  payload: unknown
}

interface RegisterWebhookEventResult {
  duplicate: boolean
}

export async function registerWebhookEventService(
  input: RegisterWebhookEventInput,
): Promise<RegisterWebhookEventResult> {
  const db: any = getSupabaseAdminClient()

  const { error } = await db.from("webhook_events").insert({
    provider: input.provider ?? "mercadopago",
    event_key: input.eventKey,
    action: input.action,
    mercadopago_order_id: input.mercadopagoOrderId,
    payload: input.payload ?? null,
  })

  if (!error) {
    return { duplicate: false }
  }

  if (error.code === "23505") {
    return { duplicate: true }
  }

  // Fallback seguro para ambientes que ainda não executaram a migration.
  if (error.code === "42P01") {
    return { duplicate: false }
  }

  throw error
}
