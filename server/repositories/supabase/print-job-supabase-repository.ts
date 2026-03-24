import { AppError } from "@/api/utils/app-error"
import { BaseSupabaseRepository } from "@/api/repositories/supabase/base-supabase-repository"
import {
  ClaimNextPrintJobInput,
  CreatePrintJobInput,
  MarkPrintJobOutcome,
  MarkPrintJobFailureInput,
  MarkPrintJobSuccessInput,
  PrintJobRepository,
} from "@/api/repositories/contracts/print-job-repository"
import { PrintJobRecord } from "@/api/types/domain"
import { computeRetryDelayMs } from "@/api/services/printing/printing-domain"

const PRINT_JOB_SELECT =
  "id, totem_id, store_id, order_id, action, payload, status, attempts, claimed_at, claimed_by, lease_expires_at, last_attempt_at, next_retry_at, printed_at, printed_by_agent, last_error, error_code, error_retryable, created_at, updated_at"

function isMissingColumnError(error: { code?: string } | null | undefined) {
  return error?.code === "42703"
}

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
      throw new AppError("Erro ao criar job de impressao", 500, "DB_UNAVAILABLE", false, true)
    }

    const { data: existing, error: existingError } = await this.db
      .from("print_jobs")
      .select(PRINT_JOB_SELECT)
      .eq("totem_id", input.totemId)
      .eq("order_id", input.orderId)
      .eq("action", input.action)
      .maybeSingle()

    if (existingError || !existing) {
      throw new AppError("Erro ao recuperar job de impressao existente", 500, "DB_UNAVAILABLE", false, true)
    }

    return {
      job: existing as PrintJobRecord,
      created: false,
    }
  }

  private async markExpiredClaimsAsRecoverable(input: ClaimNextPrintJobInput) {
    const staleClaimedAtIso = new Date(
      new Date(input.claimedAt).getTime() - Math.max(15_000, input.leaseMs),
    ).toISOString()

    const updateFull = await this.db
      .from("print_jobs")
      .update({
        status: "pending",
        claimed_at: null,
        claimed_by: null,
        lease_expires_at: null,
        error_code: "JOB_STALE_CLAIM",
        error_retryable: true,
      })
      .eq("totem_id", input.totemId)
      .eq("status", "claimed")
      .lt("lease_expires_at", input.claimedAt)

    if (!updateFull.error) return

    if (!isMissingColumnError(updateFull.error)) {
      throw new AppError("Erro ao recuperar jobs claimed abandonados", 500, "DB_UNAVAILABLE", false, true)
    }

    const legacyUpdate = await this.db
      .from("print_jobs")
      .update({
        status: "pending",
        claimed_at: null,
        claimed_by: null,
      })
      .eq("totem_id", input.totemId)
      .eq("status", "claimed")
      .lt("claimed_at", staleClaimedAtIso)

    if (legacyUpdate.error) {
      throw new AppError("Erro ao recuperar jobs claimed abandonados", 500, "DB_UNAVAILABLE", false, true)
    }
  }

  private async selectNextPendingCandidate(input: ClaimNextPrintJobInput): Promise<{ id: string; attempts: number } | null> {
    const baseQuery = this.db
      .from("print_jobs")
      .select("id, attempts")
      .eq("totem_id", input.totemId)
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(1)

    const withRetryWindow = await baseQuery.or(`next_retry_at.is.null,next_retry_at.lte.${input.claimedAt}`).maybeSingle()

    if (!withRetryWindow.error) {
      const candidate = withRetryWindow.data as { id?: string; attempts?: number } | null
      if (!candidate?.id) return null
      return {
        id: candidate.id,
        attempts: typeof candidate.attempts === "number" ? candidate.attempts : 0,
      }
    }

    if (!isMissingColumnError(withRetryWindow.error)) {
      throw new AppError("Erro ao consultar jobs pendentes de impressao", 500, "DB_UNAVAILABLE", false, true)
    }

    const legacy = await this.db
      .from("print_jobs")
      .select("id, attempts")
      .eq("totem_id", input.totemId)
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle()

    if (legacy.error) {
      throw new AppError("Erro ao consultar jobs pendentes de impressao", 500, "DB_UNAVAILABLE", false, true)
    }

    const candidate = legacy.data as { id?: string; attempts?: number } | null
    if (!candidate?.id) return null

    return {
      id: candidate.id,
      attempts: typeof candidate.attempts === "number" ? candidate.attempts : 0,
    }
  }

  private async markCandidateAsExceededRetries(candidateId: string) {
    const full = await this.db
      .from("print_jobs")
      .update({
        status: "failed",
        error_code: "REQUEUE_NOT_ALLOWED",
        error_retryable: false,
      })
      .eq("id", candidateId)

    if (!full.error) return

    if (!isMissingColumnError(full.error)) {
      throw new AppError("Erro ao marcar job excedido como falho", 500, "DB_UNAVAILABLE", false, true)
    }

    const legacy = await this.db
      .from("print_jobs")
      .update({
        status: "failed",
      })
      .eq("id", candidateId)

    if (legacy.error) {
      throw new AppError("Erro ao marcar job excedido como falho", 500, "DB_UNAVAILABLE", false, true)
    }
  }

  private async claimCandidate(
    candidateId: string,
    nextAttempts: number,
    input: ClaimNextPrintJobInput,
  ): Promise<PrintJobRecord | null> {
    const leaseExpiresAtIso = new Date(new Date(input.claimedAt).getTime() + input.leaseMs).toISOString()

    const full = await this.db
      .from("print_jobs")
      .update({
        status: "claimed",
        claimed_by: input.claimedBy,
        claimed_at: input.claimedAt,
        attempts: nextAttempts,
        last_attempt_at: input.claimedAt,
        lease_expires_at: leaseExpiresAtIso,
        next_retry_at: null,
        error_code: null,
        error_retryable: null,
      })
      .eq("id", candidateId)
      .eq("status", "pending")
      .select(PRINT_JOB_SELECT)
      .maybeSingle()

    if (!full.error && full.data) {
      return full.data as PrintJobRecord
    }

    if (!isMissingColumnError(full.error)) {
      return null
    }

    const legacy = await this.db
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

    if (legacy.error) {
      throw new AppError("Erro ao claimar job pendente de impressao", 500, "DB_UNAVAILABLE", false, true)
    }

    return (legacy.data as PrintJobRecord | null) ?? null
  }

  private async claimNextPendingFallback(input: ClaimNextPrintJobInput): Promise<PrintJobRecord | null> {
    await this.markExpiredClaimsAsRecoverable(input)

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const candidate = await this.selectNextPendingCandidate(input)
      if (!candidate) {
        return null
      }

      const nextAttempts = candidate.attempts + 1
      if (nextAttempts > input.maxRetryAttempts) {
        await this.markCandidateAsExceededRetries(candidate.id)
        continue
      }

      const claimed = await this.claimCandidate(candidate.id, nextAttempts, input)
      if (claimed) return claimed
    }

    return null
  }

  async claimNextPending(input: ClaimNextPrintJobInput): Promise<PrintJobRecord | null> {
    const leaseSeconds = Math.max(5, Math.floor(input.leaseMs / 1000))
    const { data, error } = await this.db.rpc("claim_next_print_job", {
      p_totem_id: input.totemId,
      p_claimed_by: input.claimedBy,
      p_now: input.claimedAt,
      p_max_retry_attempts: input.maxRetryAttempts,
      p_lease_seconds: leaseSeconds,
    })

    if (error) {
      // Backward compatibility in environments where migration 016 has not run yet.
      if (error.code === "42883") {
        return this.claimNextPendingFallback(input)
      }
      throw new AppError("Erro ao claimar proximo job de impressao", 500, "DB_UNAVAILABLE", false, true)
    }

    if (!Array.isArray(data) || data.length === 0) return null
    return data[0] as PrintJobRecord
  }

  async markPrinted(input: MarkPrintJobSuccessInput): Promise<MarkPrintJobOutcome> {
    const { data: current, error: currentError } = await this.db
      .from("print_jobs")
      .select("status, claimed_by")
      .eq("id", input.jobId)
      .eq("totem_id", input.totemId)
      .maybeSingle()

    if (currentError) {
      throw new AppError("Erro ao consultar job para confirmacao", 500, "DB_UNAVAILABLE", false, true)
    }

    if (!current) {
      return {
        outcome: "not_found",
        status: "not_found",
      }
    }

    const currentStatus = String((current as any).status ?? "")
    if (currentStatus === "printed") {
      return { outcome: "duplicate", status: "printed" }
    }
    if (currentStatus !== "claimed") {
      return { outcome: "out_of_order", status: currentStatus || "unknown" }
    }

    const claimedBy = String((current as any).claimed_by ?? "")
    if (claimedBy !== input.agentId) {
      return { outcome: "out_of_order", status: currentStatus }
    }

    const full = await this.db
      .from("print_jobs")
      .update({
        status: "printed",
        printed_at: input.printedAt,
        printed_by_agent: input.agentId,
        lease_expires_at: null,
        claimed_at: null,
        claimed_by: null,
        next_retry_at: null,
        error_code: null,
        error_retryable: null,
        last_error: null,
      })
      .eq("id", input.jobId)
      .eq("totem_id", input.totemId)
      .eq("status", "claimed")
      .eq("claimed_by", input.agentId)
      .select("id, status")
      .maybeSingle()

    if (!full.error && (full.data as { id?: string } | null)?.id) {
      return {
        outcome: "applied",
        status: "printed",
      }
    }

    if (full.error && !isMissingColumnError(full.error)) {
      throw new AppError("Erro ao confirmar impressao do job", 500, "DB_UNAVAILABLE", false, true)
    }

    const legacy = await this.db
      .from("print_jobs")
      .update({
        status: "printed",
        printed_at: input.printedAt,
        claimed_at: null,
        claimed_by: null,
        last_error: null,
      })
      .eq("id", input.jobId)
      .eq("totem_id", input.totemId)
      .eq("status", "claimed")
      .eq("claimed_by", input.agentId)
      .select("id, status")
      .maybeSingle()

    if (legacy.error) {
      throw new AppError("Erro ao confirmar impressao do job", 500, "DB_UNAVAILABLE", false, true)
    }

    if (!(legacy.data as { id?: string } | null)?.id) {
      return { outcome: "out_of_order", status: "claimed" }
    }

    return {
      outcome: "applied",
      status: "printed",
    }
  }

  async markFailure(input: MarkPrintJobFailureInput): Promise<MarkPrintJobOutcome> {
    const { data: current, error: currentError } = await this.db
      .from("print_jobs")
      .select("id, status, attempts, claimed_by")
      .eq("id", input.jobId)
      .eq("totem_id", input.totemId)
      .maybeSingle()

    if (currentError) {
      throw new AppError("Erro ao consultar job para registrar falha", 500, "DB_UNAVAILABLE", false, true)
    }

    if (!current) {
      return {
        outcome: "not_found",
        status: "not_found",
      }
    }

    const currentStatus = String((current as any).status ?? "")
    if (currentStatus === "printed") {
      return {
        outcome: "duplicate",
        status: "printed",
      }
    }

    if (currentStatus !== "claimed") {
      return {
        outcome: "out_of_order",
        status: currentStatus || "unknown",
      }
    }

    const claimedBy = String((current as any).claimed_by ?? "")
    if (claimedBy !== input.agentId) {
      return {
        outcome: "out_of_order",
        status: currentStatus,
      }
    }

    const attempts =
      typeof (current as { attempts?: number }).attempts === "number"
        ? (current as { attempts: number }).attempts
        : 0

    const willRetry = input.retryable && attempts < input.maxRetryAttempts
    const nextStatus = willRetry ? "pending" : "failed"
    const retryDelayMs = computeRetryDelayMs({
      attempts: Math.max(1, attempts),
      queueClaimIntervalMs: input.queueClaimIntervalMs,
    })
    const nextRetryAt = willRetry ? new Date(Date.now() + retryDelayMs).toISOString() : null

    const full = await this.db
      .from("print_jobs")
      .update({
        status: nextStatus,
        last_error: input.error,
        error_code: input.errorCode,
        error_retryable: willRetry,
        claimed_at: null,
        claimed_by: null,
        lease_expires_at: null,
        next_retry_at: nextRetryAt,
      })
      .eq("id", input.jobId)
      .eq("totem_id", input.totemId)
      .eq("status", "claimed")
      .eq("claimed_by", input.agentId)
      .select("id, status")
      .maybeSingle()

    if (!full.error && (full.data as { id?: string } | null)?.id) {
      return {
        outcome: "applied",
        status: nextStatus,
      }
    }

    if (full.error && !isMissingColumnError(full.error)) {
      throw new AppError("Erro ao registrar falha de impressao", 500, "DB_UNAVAILABLE", false, true)
    }

    const legacy = await this.db
      .from("print_jobs")
      .update({
        status: nextStatus,
        last_error: input.error,
        claimed_at: null,
        claimed_by: null,
      })
      .eq("id", input.jobId)
      .eq("totem_id", input.totemId)
      .eq("status", "claimed")
      .eq("claimed_by", input.agentId)
      .select("id, status")
      .maybeSingle()

    if (legacy.error) {
      throw new AppError("Erro ao registrar falha de impressao", 500, "DB_UNAVAILABLE", false, true)
    }

    if (!(legacy.data as { id?: string } | null)?.id) {
      return {
        outcome: "out_of_order",
        status: currentStatus,
      }
    }

    return {
      outcome: "applied",
      status: nextStatus,
    }
  }

  async requeueFailed(
    jobId: string,
    totemId: string,
    maxRetryAttempts: number,
  ): Promise<PrintJobRecord | null> {
    const safeMaxRetries = Math.max(1, Math.floor(maxRetryAttempts))

    const full = await this.db
      .from("print_jobs")
      .update({
        status: "pending",
        claimed_at: null,
        claimed_by: null,
        lease_expires_at: null,
        next_retry_at: null,
        error_code: null,
        error_retryable: null,
        last_error: null,
      })
      .eq("id", jobId)
      .eq("totem_id", totemId)
      .eq("status", "failed")
      .lt("attempts", safeMaxRetries)
      .select(PRINT_JOB_SELECT)
      .maybeSingle()

    if (!full.error) {
      return (full.data as PrintJobRecord | null) ?? null
    }

    if (!isMissingColumnError(full.error)) {
      throw new AppError("Erro ao reencaminhar job de impressao", 500, "DB_UNAVAILABLE", false, true)
    }

    const legacy = await this.db
      .from("print_jobs")
      .update({
        status: "pending",
        claimed_at: null,
        claimed_by: null,
        last_error: null,
      })
      .eq("id", jobId)
      .eq("totem_id", totemId)
      .eq("status", "failed")
      .lt("attempts", safeMaxRetries)
      .select(PRINT_JOB_SELECT)
      .maybeSingle()

    if (legacy.error) {
      throw new AppError("Erro ao reencaminhar job de impressao", 500, "DB_UNAVAILABLE", false, true)
    }

    return (legacy.data as PrintJobRecord | null) ?? null
  }

  async listRecentByStoreId(storeId: string, limit: number): Promise<PrintJobRecord[]> {
    const { data, error } = await this.db
      .from("print_jobs")
      .select(PRINT_JOB_SELECT)
      .eq("store_id", storeId)
      .order("created_at", { ascending: false })
      .limit(limit)

    if (error) {
      throw new AppError("Erro ao listar jobs de impressao", 500, "DB_UNAVAILABLE", false, true)
    }

    return (data as PrintJobRecord[] | null) ?? []
  }

  async listRecentGlobal(limit: number): Promise<PrintJobRecord[]> {
    const safeLimit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 500) : 200

    const { data, error } = await this.db
      .from("print_jobs")
      .select(PRINT_JOB_SELECT)
      .order("created_at", { ascending: false })
      .limit(safeLimit)

    if (error) {
      throw new AppError("Erro ao listar jobs globais de impressao", 500, "DB_UNAVAILABLE", false, true)
    }

    return (data as PrintJobRecord[] | null) ?? []
  }
}
