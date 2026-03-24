import {
  PrintAgentDeviceRecord,
  PrintAgentEnrollmentRecord,
} from "@/api/types/domain"

export interface CreatePrintAgentEnrollmentInput {
  deviceId: string
  agentId: string
  tokenHash: string
  qrSignature: string
  apiBaseUrl: string
  expiresAt: string
}

export interface ActivatePrintAgentDeviceInput {
  deviceId: string
  agentId: string
  keyId: string
  hmacSecretHash: string
  hmacSecretCiphertext: string
}

export interface UpdatePrintAgentRuntimeStatusInput {
  deviceId: string
  status?: string | null
  error?: string | null
  agentVersion?: string | null
  seenAt: string
}

export interface PrintAgentDeviceRepository {
  createEnrollment(input: CreatePrintAgentEnrollmentInput): Promise<PrintAgentEnrollmentRecord>
  findEnrollmentByTokenHash(tokenHash: string): Promise<PrintAgentEnrollmentRecord | null>
  consumeEnrollmentById(id: string): Promise<void>
  revokeEnrollmentById(id: string): Promise<void>
  upsertActivatedDevice(input: ActivatePrintAgentDeviceInput): Promise<PrintAgentDeviceRecord>
  findDeviceByDeviceId(deviceId: string): Promise<PrintAgentDeviceRecord | null>
  listDevices(limit: number): Promise<PrintAgentDeviceRecord[]>
  revokeDeviceByDeviceId(deviceId: string): Promise<PrintAgentDeviceRecord | null>
  updateRuntimeStatus(input: UpdatePrintAgentRuntimeStatusInput): Promise<void>
}
