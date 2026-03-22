import { TotemPrinterRecord } from "@/api/types/domain"

export interface UpsertTotemPrinterInput {
  totemId: string
  storeId: string
  connectionType: "tcp"
  ip: string
  port: number
  model: string
  escposProfile: string
  paperWidthMm: number
  isActive: boolean
}

export interface UpdateTotemPrinterHeartbeatInput {
  totemId: string
  heartbeatAt: string
  status?: string | null
  error?: string | null
  agentVersion?: string | null
}

export interface TotemPrinterRepository {
  upsertByTotemId(
    input: UpsertTotemPrinterInput,
  ): Promise<TotemPrinterRecord>
  findByTotemId(totemId: string): Promise<TotemPrinterRecord | null>
  findActiveByTotemId(totemId: string): Promise<TotemPrinterRecord | null>
  listByStoreId(storeId: string): Promise<TotemPrinterRecord[]>
  listAll(limit: number): Promise<TotemPrinterRecord[]>
  updateHeartbeat(input: UpdateTotemPrinterHeartbeatInput): Promise<void>
}
