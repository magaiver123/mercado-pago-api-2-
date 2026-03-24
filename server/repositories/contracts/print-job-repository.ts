import { PrintJobRecord } from "@/api/types/domain"

export interface CreatePrintJobInput {
  totemId: string
  storeId: string
  orderId: string
  action: string
  payload: unknown
}

export interface ClaimNextPrintJobInput {
  totemId: string
  claimedBy: string
  claimedAt: string
  maxRetryAttempts: number
  leaseMs: number
}

export interface MarkPrintJobFailureInput {
  jobId: string
  totemId: string
  agentId: string
  error: string
  errorCode: string
  retryable: boolean
  maxRetryAttempts: number
  queueClaimIntervalMs: number
}

export interface MarkPrintJobSuccessInput {
  jobId: string
  totemId: string
  agentId: string
  printedAt: string
}

export interface MarkPrintJobOutcome {
  outcome: "applied" | "duplicate" | "out_of_order" | "not_found"
  status: string
}

export interface PrintJobRepository {
  createOrGetByIdempotency(
    input: CreatePrintJobInput,
  ): Promise<{ job: PrintJobRecord; created: boolean }>
  claimNextPending(input: ClaimNextPrintJobInput): Promise<PrintJobRecord | null>
  markPrinted(input: MarkPrintJobSuccessInput): Promise<MarkPrintJobOutcome>
  markFailure(input: MarkPrintJobFailureInput): Promise<MarkPrintJobOutcome>
  requeueFailed(
    jobId: string,
    totemId: string,
    maxRetryAttempts: number,
  ): Promise<PrintJobRecord | null>
  listRecentByStoreId(storeId: string, limit: number): Promise<PrintJobRecord[]>
  listRecentGlobal(limit: number): Promise<PrintJobRecord[]>
}
