import { getRepositoryFactory } from "@/api/repositories/repository-factory"

export async function getPrintGlobalSettingsService() {
  const settings = await getRepositoryFactory().printGlobalSettings.getDefault()

  return {
    settings: {
      defaultConnectionType: settings.default_connection_type,
      defaultPort: settings.default_port,
      defaultEscposProfile: settings.default_escpos_profile,
      defaultPaperWidthMm: settings.default_paper_width_mm,
      queueClaimIntervalMs: settings.queue_claim_interval_ms,
      heartbeatIntervalMs: settings.heartbeat_interval_ms,
      maxRetryAttempts: settings.max_retry_attempts,
      updatedAt: settings.updated_at,
    },
  }
}
