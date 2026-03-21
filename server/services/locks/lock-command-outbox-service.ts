import { getSupabaseAdminClient } from "@/api/config/database"

interface CreateLockCommandInput {
  orderId: string
  storeId: string
  deviceId: string
  socketId: string
  topic: string
  payload: unknown
}

interface LockCommandRecord {
  id: string
  order_id: string
  store_id: string
  device_id: string
  socket_id: string
  status: "pending" | "sent" | "failed" | "acked"
  attempts: number
}

async function nextAttemptCount(lockCommandId: string): Promise<number> {
  const db: any = getSupabaseAdminClient()
  const { data, error } = await db
    .from("lock_commands")
    .select("attempts")
    .eq("id", lockCommandId)
    .maybeSingle()

  if (error) throw error
  const currentAttempts = typeof (data as any)?.attempts === "number" ? (data as any).attempts : 0
  return currentAttempts + 1
}

export async function upsertPendingLockCommandService(
  input: CreateLockCommandInput,
): Promise<LockCommandRecord> {
  const db: any = getSupabaseAdminClient()
  const { data, error } = await db
    .from("lock_commands")
    .upsert(
      {
        order_id: input.orderId,
        store_id: input.storeId,
        device_id: input.deviceId,
        socket_id: input.socketId,
        topic: input.topic,
        payload: input.payload ?? {},
        status: "pending",
      },
      {
        onConflict: "order_id,socket_id",
      },
    )
    .select("id, order_id, store_id, device_id, socket_id, status, attempts")
    .single()

  if (error || !data) {
    throw error ?? new Error("Falha ao criar comando de fechadura")
  }

  return data as LockCommandRecord
}

export async function markLockCommandSentService(lockCommandId: string): Promise<void> {
  const db: any = getSupabaseAdminClient()
  const attempts = await nextAttemptCount(lockCommandId)
  const { error } = await db
    .from("lock_commands")
    .update({
      status: "sent",
      attempts,
      sent_at: new Date().toISOString(),
      last_attempt_at: new Date().toISOString(),
      error: null,
    })
    .eq("id", lockCommandId)

  if (error) throw error
}

export async function markLockCommandFailedService(
  lockCommandId: string,
  errorMessage: string,
): Promise<void> {
  const db: any = getSupabaseAdminClient()
  const attempts = await nextAttemptCount(lockCommandId)
  const { error } = await db
    .from("lock_commands")
    .update({
      status: "failed",
      attempts,
      last_attempt_at: new Date().toISOString(),
      error: errorMessage,
    })
    .eq("id", lockCommandId)

  if (error) throw error
}
