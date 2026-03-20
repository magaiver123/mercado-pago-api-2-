import { AppError } from "@/api/utils/app-error"
import { getRepositoryFactory } from "@/api/repositories/repository-factory"
import { sanitizeString } from "@/api/utils/sanitize"
import { publishOpenDoorCommandService } from "@/api/services/mqtt/publish-open-door-command-service"

interface TestOpenLockInput {
  storeId: unknown
  socketId?: unknown
}

export async function testOpenLockService(input: TestOpenLockInput) {
  const storeId = sanitizeString(input.storeId)
  if (!storeId) {
    throw new AppError("Store ID invalido", 400)
  }

  const socketId = sanitizeString(input.socketId) ?? `test-${Date.now()}`
  const repositories = getRepositoryFactory()
  const lock = await repositories.storeLock.findPrimaryEnabledByStoreId(storeId)

  if (!lock || !lock.device_id) {
    throw new AppError("Fechadura nao configurada para esta loja", 404)
  }

  const publishResult = await publishOpenDoorCommandService({
    deviceId: lock.device_id,
    socketId,
    source: "admin_test_endpoint",
    storeId,
  })

  if (!publishResult.ok) {
    throw new AppError("Falha ao enviar comando MQTT para a fechadura", 502)
  }

  return {
    success: true,
    storeId,
    deviceId: lock.device_id,
    topic: publishResult.topic,
    socketId,
    publishedAt: new Date().toISOString(),
  }
}
