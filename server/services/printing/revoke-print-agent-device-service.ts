import { AppError } from "@/api/utils/app-error"
import { getRepositoryFactory } from "@/api/repositories/repository-factory"
import { sanitizeString } from "@/api/utils/sanitize"

interface RevokePrintAgentDeviceInput {
  deviceId: unknown
}

export async function revokePrintAgentDeviceService(input: RevokePrintAgentDeviceInput) {
  const deviceId = sanitizeString(input.deviceId)
  if (!deviceId) {
    throw new AppError("deviceId invalido", 400, "TOTEM_CONTEXT_MISSING", true, false)
  }
  const repositories = getRepositoryFactory()
  const revoked = await repositories.printAgentDevice.revokeDeviceByDeviceId(deviceId)
  if (!revoked) {
    throw new AppError("Dispositivo nao encontrado", 404, "ORDER_ID_INVALID", true, false)
  }

  return {
    success: true,
    code: "PRINT_AGENT_DEVICE_REVOKED",
    device: {
      deviceId: revoked.device_id,
      status: revoked.status,
      revokedAt: revoked.revoked_at,
    },
  }
}
