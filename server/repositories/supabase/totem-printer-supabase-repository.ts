import { AppError } from "@/api/utils/app-error"
import { BaseSupabaseRepository } from "@/api/repositories/supabase/base-supabase-repository"
import {
  TotemPrinterRepository,
  UpdateTotemPrinterHeartbeatInput,
  UpsertTotemPrinterInput,
} from "@/api/repositories/contracts/totem-printer-repository"
import { TotemPrinterRecord } from "@/api/types/domain"

export class TotemPrinterSupabaseRepository
  extends BaseSupabaseRepository
  implements TotemPrinterRepository
{
  async upsertByTotemId(input: UpsertTotemPrinterInput): Promise<TotemPrinterRecord> {
    const { data, error } = await this.db
      .from("totem_printers")
      .upsert(
        {
          totem_id: input.totemId,
          store_id: input.storeId,
          connection_type: input.connectionType,
          ip: input.ip,
          port: input.port,
          model: input.model,
          escpos_profile: input.escposProfile,
          paper_width_mm: input.paperWidthMm,
          is_active: input.isActive,
        },
        {
          onConflict: "totem_id",
        },
      )
      .select(
        "id, totem_id, store_id, connection_type, ip, port, model, escpos_profile, paper_width_mm, is_active, last_heartbeat_at, last_status, last_error, agent_version, created_at, updated_at",
      )
      .single()

    if (error || !data) {
      throw new AppError("Erro ao salvar impressora do totem", 500)
    }

    return data as TotemPrinterRecord
  }

  async findByTotemId(totemId: string): Promise<TotemPrinterRecord | null> {
    const { data, error } = await this.db
      .from("totem_printers")
      .select(
        "id, totem_id, store_id, connection_type, ip, port, model, escpos_profile, paper_width_mm, is_active, last_heartbeat_at, last_status, last_error, agent_version, created_at, updated_at",
      )
      .eq("totem_id", totemId)
      .maybeSingle()

    if (error) throw new AppError("Erro ao buscar impressora do totem", 500)
    return (data as TotemPrinterRecord | null) ?? null
  }

  async findActiveByTotemId(totemId: string): Promise<TotemPrinterRecord | null> {
    const { data, error } = await this.db
      .from("totem_printers")
      .select(
        "id, totem_id, store_id, connection_type, ip, port, model, escpos_profile, paper_width_mm, is_active, last_heartbeat_at, last_status, last_error, agent_version, created_at, updated_at",
      )
      .eq("totem_id", totemId)
      .eq("is_active", true)
      .maybeSingle()

    if (error) throw new AppError("Erro ao buscar impressora ativa do totem", 500)
    return (data as TotemPrinterRecord | null) ?? null
  }

  async listByStoreId(storeId: string): Promise<TotemPrinterRecord[]> {
    const { data, error } = await this.db
      .from("totem_printers")
      .select(
        "id, totem_id, store_id, connection_type, ip, port, model, escpos_profile, paper_width_mm, is_active, last_heartbeat_at, last_status, last_error, agent_version, created_at, updated_at",
      )
      .eq("store_id", storeId)
      .order("created_at", { ascending: false })

    if (error) throw new AppError("Erro ao listar impressoras dos totens", 500)
    return (data as TotemPrinterRecord[] | null) ?? []
  }

  async updateHeartbeat(input: UpdateTotemPrinterHeartbeatInput): Promise<void> {
    const { error } = await this.db
      .from("totem_printers")
      .update({
        last_heartbeat_at: input.heartbeatAt,
        last_status: input.status ?? null,
        last_error: input.error ?? null,
        agent_version: input.agentVersion ?? null,
      })
      .eq("totem_id", input.totemId)

    if (error) {
      throw new AppError("Erro ao atualizar heartbeat da impressora", 500)
    }
  }
}
