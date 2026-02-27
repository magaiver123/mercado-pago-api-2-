import { TotemRecord } from "@/api/types/domain"

export interface ActivateTotemInput {
  totemId: string
  activationCode: string
  deviceId: string
  now: string
}

export interface TotemRepository {
  findByDeviceId(deviceId: string): Promise<Pick<TotemRecord, "id" | "status"> | null>
  findByActivationCode(activationCode: string): Promise<Pick<TotemRecord, "id" | "status" | "device_id"> | null>
  activate(input: ActivateTotemInput): Promise<"ok" | "conflict" | "not_updated">
  updateLastSeenActive(totemId: string, now: string): Promise<boolean>
}

