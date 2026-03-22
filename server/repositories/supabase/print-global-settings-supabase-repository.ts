import { AppError } from "@/api/utils/app-error"
import { BaseSupabaseRepository } from "@/api/repositories/supabase/base-supabase-repository"
import {
  PrintGlobalSettingsRepository,
  UpdatePrintGlobalSettingsInput,
} from "@/api/repositories/contracts/print-global-settings-repository"
import { PrintGlobalSettingsRecord } from "@/api/types/domain"

const DEFAULT_ID = "default"
const SELECT_FIELDS =
  "id, default_connection_type, default_port, default_escpos_profile, default_paper_width_mm, queue_claim_interval_ms, heartbeat_interval_ms, max_retry_attempts, created_at, updated_at"

export class PrintGlobalSettingsSupabaseRepository
  extends BaseSupabaseRepository
  implements PrintGlobalSettingsRepository
{
  async getDefault(): Promise<PrintGlobalSettingsRecord> {
    const { data, error } = await this.db
      .from("print_global_settings")
      .select(SELECT_FIELDS)
      .eq("id", DEFAULT_ID)
      .maybeSingle()

    if (error) {
      throw new AppError("Erro ao carregar configuracao global de impressao", 500)
    }

    if (data) {
      return data as PrintGlobalSettingsRecord
    }

    const { data: created, error: createError } = await this.db
      .from("print_global_settings")
      .insert({ id: DEFAULT_ID })
      .select(SELECT_FIELDS)
      .single()

    if (createError || !created) {
      throw new AppError("Erro ao inicializar configuracao global de impressao", 500)
    }

    return created as PrintGlobalSettingsRecord
  }

  async updateDefault(input: UpdatePrintGlobalSettingsInput): Promise<PrintGlobalSettingsRecord> {
    const { data, error } = await this.db
      .from("print_global_settings")
      .upsert(
        {
          id: DEFAULT_ID,
          default_connection_type: input.defaultConnectionType,
          default_port: input.defaultPort,
          default_escpos_profile: input.defaultEscposProfile,
          default_paper_width_mm: input.defaultPaperWidthMm,
          queue_claim_interval_ms: input.queueClaimIntervalMs,
          heartbeat_interval_ms: input.heartbeatIntervalMs,
          max_retry_attempts: input.maxRetryAttempts,
        },
        { onConflict: "id" },
      )
      .select(SELECT_FIELDS)
      .single()

    if (error || !data) {
      throw new AppError("Erro ao salvar configuracao global de impressao", 500)
    }

    return data as PrintGlobalSettingsRecord
  }
}
