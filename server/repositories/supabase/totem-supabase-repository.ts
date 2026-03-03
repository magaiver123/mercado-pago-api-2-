import { AppError } from "@/api/utils/app-error"
import { BaseSupabaseRepository } from "@/api/repositories/supabase/base-supabase-repository"
import { ActivateTotemInput, TotemRepository } from "@/api/repositories/contracts/totem-repository"
import { TotemRecord } from "@/api/types/domain"

export class TotemSupabaseRepository extends BaseSupabaseRepository implements TotemRepository {
  async findByDeviceId(deviceId: string): Promise<Pick<TotemRecord, "id" | "status"> | null> {
    const { data, error } = await this.db.from("totems").select("id, status").eq("device_id", deviceId).maybeSingle()
    if (error) throw new AppError("Erro ao validar dispositivo", 500)
    return (data as Pick<TotemRecord, "id" | "status"> | null) ?? null
  }

  async findByActivationCode(activationCode: string): Promise<Pick<TotemRecord, "id" | "status" | "device_id"> | null> {
    const { data, error } = await this.db
      .from("totems")
      .select("id, status, device_id")
      .eq("activation_code", activationCode)
      .maybeSingle()

    if (error) throw new AppError("Erro ao validar codigo de ativacao", 500)
    return (data as Pick<TotemRecord, "id" | "status" | "device_id"> | null) ?? null
  }

  async activate(input: ActivateTotemInput): Promise<"ok" | "conflict" | "not_updated"> {
    const { data, error } = await this.db
      .from("totems")
      .update({
        device_id: input.deviceId,
        status: "active",
        activation_code: null,
        activated_at: input.now,
        last_seen_at: input.now,
        updated_at: input.now,
      })
      .eq("id", input.totemId)
      .eq("status", "inactive")
      .eq("activation_code", input.activationCode)
      .select("id")

    if (error) {
      if (error.code === "23505") {
        return "conflict"
      }

      throw new AppError("Nao foi possivel ativar o totem", 500)
    }

    if (!data || data.length === 0) {
      return "not_updated"
    }

    return "ok"
  }

  async updateLastSeenActive(totemId: string, now: string): Promise<boolean> {
    const { error } = await this.db
      .from("totems")
      .update({
        last_seen_at: now,
        updated_at: now,
      })
      .eq("id", totemId)
      .eq("status", "active")

    return !error
  }
}

