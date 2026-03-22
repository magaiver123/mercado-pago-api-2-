import { AppError } from "@/api/utils/app-error"
import { BaseSupabaseRepository } from "@/api/repositories/supabase/base-supabase-repository"
import {
  ClaimNextPrintJobInput,
  CreatePrintJobInput,
  MarkPrintJobFailureInput,
  PrintJobRepository,
} from "@/api/repositories/contracts/print-job-repository"
import { PrintJobRecord } from "@/api/types/domain"

const PRINT_JOB_SELECT =
  "id, totem_id, store_id, order_id, action, payload, status, attempts, claimed_at, claimed_by, printed_at, last_error, created_at, updated_at"

export class PrintJobSupabaseRepository
  extends BaseSupabaseRepository
  implements PrintJobRepository
{
  async createOrGetByIdempotency(
    input: CreatePrintJobInput,
  ): Promise<{ job: PrintJobRecord; created: boolean }> {
    const { data, error } = await this.db
      .from("print_jobs")
      .insert({
        totem_id: input.totemId,
        store_id: input.storeId,
        order_id: input.orderId,
        action: input.action,
        payload: input.payload ?? {},
        status: "pending",
      })
      .select(PRINT_JOB_SELECT)
      .single()

    if (!error && data) {
      return {
        job: data as PrintJobRecord,
        created: true,
      }
    }

    if (error?.code !== "23505") {
      throw new AppError("Erro ao criar job de impressao", 500)
    }

    const { data: existing, error: existingError } = await this.db
      .from("print_jobs")
      .select(PRINT_JOB_SELECT)
      .eq("totem_id", input.totemId)
      .eq("order_id", input.orderId)
      .eq("action", input.action)
      .maybeSingle()

    if (existingError || !existing) {
      throw new AppError("Erro ao recuperar job de impressao existente", 500)
    }

    return {
      job: existing as PrintJobRecord,
      created: false,
    }
  }

  async claimNextPending(input: ClaimNextPrintJobInput): Promise<PrintJobRecord | null> {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const { data: candidate, error: candidateError } = await this.db
        .from("print_jobs")
        .select("id, attempts")
        .eq("totem_id", input.totemId)
        .eq("status", "pending")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle()

      if (candidateError) {
        throw new AppError("Erro ao consultar jobs pendentes de impressao", 500)
      }

      const candidateRecord = candidate as { id?: string; attempts?: number } | null
      const candidateId = candidateRecord?.id
      if (!candidateId) {
        return null
      }

      const nextAttempts =
        (typeof candidateRecord?.attempts === "number" ? candidateRecord.attempts : 0) + 1

      const { data: claimed, error: claimedError } = await this.db
        .from("print_jobs")
        .update({
          status: "claimed",
          claimed_by: input.claimedBy,
          claimed_at: input.claimedAt,
          attempts: nextAttempts,
        })
        .eq("id", candidateId)
        .eq("status", "pending")
        .select(PRINT_JOB_SELECT)
        .maybeSingle()

      if (!claimedError && claimed) {
        return claimed as PrintJobRecord
      }
    }

    return null
  }

  async markPrinted(jobId: string, totemId: string, printedAt: string): Promise<boolean> {
    const { data, error } = await this.db
      .from("print_jobs")
      .update({
        status: "printed",
        printed_at: printedAt,
        last_error: null,
      })
      .eq("id", jobId)
      .eq("totem_id", totemId)
      .in("status", ["claimed", "pending"])
      .select("id")
      .maybeSingle()

    if (error) throw new AppError("Erro ao confirmar impressao do job", 500)
    return Boolean((data as { id?: string } | null)?.id)
  }

  async markFailure(input: MarkPrintJobFailureInput): Promise<PrintJobRecord | null> {
    const { data: current, error: currentError } = await this.db
      .from("print_jobs")
      .select("id, attempts")
      .eq("id", input.jobId)
      .eq("totem_id", input.totemId)
      .in("status", ["claimed", "pending"])
      .maybeSingle()

    if (currentError) {
      throw new AppError("Erro ao consultar job para registrar falha", 500)
    }

    if (!current) {
      return null
    }

    const attempts = typeof (current as { attempts?: number }).attempts === "number"
      ? (current as { attempts: number }).attempts
      : 0

    const nextStatus =
      input.retryable && attempts < 5 ? "pending" : "failed"

    const { data, error } = await this.db
      .from("print_jobs")
      .update({
        status: nextStatus,
        last_error: input.error,
        claimed_at: null,
        claimed_by: null,
      })
      .eq("id", input.jobId)
      .eq("totem_id", input.totemId)
      .in("status", ["claimed", "pending"])
      .select(PRINT_JOB_SELECT)
      .maybeSingle()

    if (error) {
      throw new AppError("Erro ao registrar falha de impressao", 500)
    }

    return (data as PrintJobRecord | null) ?? null
  }

  async requeueFailed(jobId: string, totemId: string): Promise<PrintJobRecord | null> {
    const { data, error } = await this.db
      .from("print_jobs")
      .update({
        status: "pending",
        claimed_at: null,
        claimed_by: null,
      })
      .eq("id", jobId)
      .eq("totem_id", totemId)
      .eq("status", "failed")
      .select(PRINT_JOB_SELECT)
      .maybeSingle()

    if (error) {
      throw new AppError("Erro ao reencaminhar job de impressao", 500)
    }

    return (data as PrintJobRecord | null) ?? null
  }

  async listRecentByStoreId(storeId: string, limit: number): Promise<PrintJobRecord[]> {
    const { data, error } = await this.db
      .from("print_jobs")
      .select(PRINT_JOB_SELECT)
      .eq("store_id", storeId)
      .order("created_at", { ascending: false })
      .limit(limit)

    if (error) {
      throw new AppError("Erro ao listar jobs de impressao", 500)
    }

    return (data as PrintJobRecord[] | null) ?? []
  }

  async listRecentGlobal(limit: number): Promise<PrintJobRecord[]> {
    const safeLimit =
      Number.isInteger(limit) && limit > 0 ? Math.min(limit, 500) : 200

    const { data, error } = await this.db
      .from("print_jobs")
      .select(PRINT_JOB_SELECT)
      .order("created_at", { ascending: false })
      .limit(safeLimit)

    if (error) {
      throw new AppError("Erro ao listar jobs globais de impressao", 500)
    }

    return (data as PrintJobRecord[] | null) ?? []
  }
}
