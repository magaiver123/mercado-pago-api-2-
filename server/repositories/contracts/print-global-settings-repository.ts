import { PrintGlobalSettingsRecord } from "@/api/types/domain"

export interface UpdatePrintGlobalSettingsInput {
  defaultConnectionType: "tcp"
  defaultPort: number
  defaultEscposProfile: string
  defaultPaperWidthMm: number
  queueClaimIntervalMs: number
  heartbeatIntervalMs: number
  maxRetryAttempts: number
}

export interface PrintGlobalSettingsRepository {
  getDefault(): Promise<PrintGlobalSettingsRecord>
  updateDefault(input: UpdatePrintGlobalSettingsInput): Promise<PrintGlobalSettingsRecord>
}
