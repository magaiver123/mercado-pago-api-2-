import { AppError } from "@/api/utils/app-error"
import { BaseSupabaseRepository } from "@/api/repositories/supabase/base-supabase-repository"
import {
  ActivatePrintAgentDeviceInput,
  CreatePrintAgentEnrollmentInput,
  PrintAgentDeviceRepository,
  UpdatePrintAgentRuntimeStatusInput,
} from "@/api/repositories/contracts/print-agent-device-repository"
import {
  PrintAgentDeviceRecord,
  PrintAgentEnrollmentRecord,
} from "@/api/types/domain"

const DEVICE_COLUMNS = [
  "id",
  "device_id",
  "agent_id",
  "key_id",
  "hmac_secret_hash",
  "hmac_secret_ciphertext",
  "status",
  "min_supported_version",
  "last_seen_at",
  "last_status",
  "last_error",
  "last_agent_version",
  "revoked_at",
  "created_at",
  "updated_at",
].join(", ")

const ENROLLMENT_COLUMNS = [
  "id",
  "device_id",
  "agent_id",
  "token_hash",
  "qr_signature",
  "api_base_url",
  "expires_at",
  "consumed_at",
  "revoked_at",
  "created_at",
  "updated_at",
].join(", ")

export class PrintAgentDeviceSupabaseRepository
  extends BaseSupabaseRepository
  implements PrintAgentDeviceRepository
{
  async createEnrollment(
    input: CreatePrintAgentEnrollmentInput,
  ): Promise<PrintAgentEnrollmentRecord> {
    const { data, error } = await this.db
      .from("print_agent_enrollments")
      .insert({
        device_id: input.deviceId,
        agent_id: input.agentId,
        token_hash: input.tokenHash,
        qr_signature: input.qrSignature,
        api_base_url: input.apiBaseUrl,
        expires_at: input.expiresAt,
      })
      .select(ENROLLMENT_COLUMNS)
      .single()

    if (error || !data) {
      throw new AppError("Erro ao criar enrollment de agente", 500)
    }

    return data as PrintAgentEnrollmentRecord
  }

  async findEnrollmentByTokenHash(tokenHash: string): Promise<PrintAgentEnrollmentRecord | null> {
    const { data, error } = await this.db
      .from("print_agent_enrollments")
      .select(ENROLLMENT_COLUMNS)
      .eq("token_hash", tokenHash)
      .maybeSingle()

    if (error) {
      throw new AppError("Erro ao buscar enrollment de agente", 500)
    }

    return (data as PrintAgentEnrollmentRecord | null) ?? null
  }

  async consumeEnrollmentById(id: string): Promise<void> {
    const { error } = await this.db
      .from("print_agent_enrollments")
      .update({
        consumed_at: new Date().toISOString(),
      })
      .eq("id", id)

    if (error) {
      throw new AppError("Erro ao consumir enrollment de agente", 500)
    }
  }

  async revokeEnrollmentById(id: string): Promise<void> {
    const { error } = await this.db
      .from("print_agent_enrollments")
      .update({
        revoked_at: new Date().toISOString(),
      })
      .eq("id", id)

    if (error) {
      throw new AppError("Erro ao revogar enrollment de agente", 500)
    }
  }

  async upsertActivatedDevice(input: ActivatePrintAgentDeviceInput): Promise<PrintAgentDeviceRecord> {
    const now = new Date().toISOString()
    const { data, error } = await this.db
      .from("print_agent_devices")
      .upsert(
        {
          device_id: input.deviceId,
          agent_id: input.agentId,
          key_id: input.keyId,
          hmac_secret_hash: input.hmacSecretHash,
          hmac_secret_ciphertext: input.hmacSecretCiphertext,
          status: "active",
          revoked_at: null,
          last_seen_at: now,
          last_status: "online",
          last_error: null,
        },
        { onConflict: "device_id" },
      )
      .select(DEVICE_COLUMNS)
      .single()

    if (error || !data) {
      throw new AppError("Erro ao ativar dispositivo de impressao", 500)
    }

    return data as PrintAgentDeviceRecord
  }

  async findDeviceByDeviceId(deviceId: string): Promise<PrintAgentDeviceRecord | null> {
    const { data, error } = await this.db
      .from("print_agent_devices")
      .select(DEVICE_COLUMNS)
      .eq("device_id", deviceId)
      .maybeSingle()

    if (error) {
      throw new AppError("Erro ao buscar dispositivo de impressao", 500)
    }

    return (data as PrintAgentDeviceRecord | null) ?? null
  }

  async listDevices(limit: number): Promise<PrintAgentDeviceRecord[]> {
    const safeLimit =
      Number.isInteger(limit) && limit > 0 ? Math.min(limit, 500) : 200
    const { data, error } = await this.db
      .from("print_agent_devices")
      .select(DEVICE_COLUMNS)
      .order("updated_at", { ascending: false })
      .limit(safeLimit)

    if (error) {
      throw new AppError("Erro ao listar dispositivos de impressao", 500)
    }

    return (data as PrintAgentDeviceRecord[] | null) ?? []
  }

  async revokeDeviceByDeviceId(deviceId: string): Promise<PrintAgentDeviceRecord | null> {
    const { data, error } = await this.db
      .from("print_agent_devices")
      .update({
        status: "revoked",
        revoked_at: new Date().toISOString(),
      })
      .eq("device_id", deviceId)
      .select(DEVICE_COLUMNS)
      .maybeSingle()

    if (error) {
      throw new AppError("Erro ao revogar dispositivo de impressao", 500)
    }

    return (data as PrintAgentDeviceRecord | null) ?? null
  }

  async updateRuntimeStatus(input: UpdatePrintAgentRuntimeStatusInput): Promise<void> {
    const { error } = await this.db
      .from("print_agent_devices")
      .update({
        last_seen_at: input.seenAt,
        last_status: input.status ?? null,
        last_error: input.error ?? null,
        last_agent_version: input.agentVersion ?? null,
      })
      .eq("device_id", input.deviceId)

    if (error) {
      throw new AppError("Erro ao atualizar status do dispositivo de impressao", 500)
    }
  }
}
