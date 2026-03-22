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
}

export interface MarkPrintJobFailureInput {
  jobId: string
  totemId: string
  error: string
  retryable: boolean
}

export interface PrintJobRepository {
  createOrGetByIdempotency(
    input: CreatePrintJobInput,
  ): Promise<{ job: PrintJobRecord; created: boolean }>
  claimNextPending(input: ClaimNextPrintJobInput): Promise<PrintJobRecord | null>
  markPrinted(jobId: string, totemId: string, printedAt: string): Promise<boolean>
  markFailure(input: MarkPrintJobFailureInput): Promise<PrintJobRecord | null>
  requeueFailed(jobId: string, totemId: string): Promise<PrintJobRecord | null>
  listRecentByStoreId(storeId: string, limit: number): Promise<PrintJobRecord[]>
  listRecentGlobal(limit: number): Promise<PrintJobRecord[]>
}
