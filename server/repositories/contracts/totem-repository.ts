import { TotemRecord } from "@/api/types/domain"

export interface ActivateTotemInput {
  totemId: string
  activationCode: string
  deviceId: string
  now: string
}

export interface TotemRepository {
  findById(totemId: string): Promise<Pick<TotemRecord, "id" | "store_id" | "status" | "device_id" | "maintenance_mode"> | null>
  listByStoreId(storeId: string): Promise<Array<Pick<TotemRecord, "id" | "store_id" | "status" | "device_id" | "maintenance_mode">>>
  findByDeviceId(
    deviceId: string
  ): Promise<
    Pick<TotemRecord, "id" | "status" | "store_id" | "maintenance_mode"> | null
  >
  findByActivationCode(activationCode: string): Promise<Pick<TotemRecord, "id" | "status" | "device_id"> | null>
  activate(input: ActivateTotemInput): Promise<"ok" | "conflict" | "not_updated">
  updateLastSeenActive(totemId: string, now: string): Promise<boolean>
}
