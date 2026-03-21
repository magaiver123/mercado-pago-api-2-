import mqtt from "mqtt"
import { getMqttEnv } from "@/api/config/env"
import { logger } from "@/api/utils/logger"
import { sanitizeString } from "@/api/utils/sanitize"

interface PublishMessageInput {
  topic: string
  payload: string
}

interface PublishOpenDoorInput {
  deviceId: string
  socketId: string
  storeId?: string
  source?: string
  mercadopagoOrderId?: string
}

interface PublishOpenDoorResult {
  ok: boolean
  topic: string
  payload: string
  error?: string
}

interface OpenDoorCommandMessage {
  topic: string
  payload: string
}

function buildClientId(prefix: string) {
  const random = Math.random().toString(16).slice(2, 10)
  return `${prefix}-${Date.now()}-${random}`
}

async function publishMessageService(input: PublishMessageInput): Promise<void> {
  const mqttEnv = getMqttEnv()
  if (!mqttEnv.url) {
    throw new Error("MQTT not configured")
  }

  const connectOptions: mqtt.IClientOptions = {
    connectTimeout: mqttEnv.connectTimeoutMs,
    reconnectPeriod: 0,
    clean: true,
    clientId: buildClientId("api-open-door"),
  }

  if (mqttEnv.user && mqttEnv.pass) {
    connectOptions.username = mqttEnv.user
    connectOptions.password = mqttEnv.pass
  }

  await new Promise<void>((resolve, reject) => {
    const client = mqtt.connect(mqttEnv.url!, connectOptions)

    let settled = false
    const timeoutMs = mqttEnv.connectTimeoutMs + 3000

    const cleanupAndSettle = (error?: Error) => {
      if (settled) return
      settled = true
      clearTimeout(timeoutHandle)

      client.removeListener("connect", onConnect)
      client.removeListener("error", onError)
      client.removeListener("offline", onOffline)
      client.removeListener("close", onClose)

      // Use graceful disconnect to avoid dropping in-flight publish packets.
      client.end(false, () => {
        if (error) {
          reject(error)
          return
        }
        resolve()
      })
    }

    const timeoutHandle = setTimeout(() => {
      cleanupAndSettle(new Error("MQTT publish timeout"))
    }, timeoutMs)

    const onConnect = () => {
      // QoS 1 gives broker-level ack and avoids false-positive success on flaky links.
      client.publish(input.topic, input.payload, { qos: 1, retain: false }, (publishError) => {
        if (publishError) {
          cleanupAndSettle(publishError)
          return
        }
        cleanupAndSettle()
      })
    }

    const onError = (error: Error) => {
      cleanupAndSettle(error)
    }

    const onOffline = () => {
      cleanupAndSettle(new Error("MQTT client offline"))
    }

    const onClose = () => {
      if (!settled) {
        cleanupAndSettle(new Error("MQTT connection closed before publish"))
      }
    }

    client.on("connect", onConnect)
    client.on("error", onError)
    client.on("offline", onOffline)
    client.on("close", onClose)
  })
}

export function buildOpenDoorCommandMessage(input: PublishOpenDoorInput): OpenDoorCommandMessage {
  const deviceId = sanitizeString(input.deviceId)
  const socketId = sanitizeString(input.socketId)
  const source = sanitizeString(input.source)
  const storeId = sanitizeString(input.storeId)
  const mercadopagoOrderId = sanitizeString(input.mercadopagoOrderId)

  const topic = `devices/${deviceId ?? "unknown"}/commands`
  const payload = JSON.stringify({
    action: "openDoor",
    socketId: socketId ?? `fallback-${Date.now()}`,
    ...(source ? { source } : {}),
    ...(storeId ? { storeId } : {}),
    ...(mercadopagoOrderId ? { mercadopagoOrderId } : {}),
  })

  return { topic, payload }
}

export async function publishOpenDoorCommandService(input: PublishOpenDoorInput): Promise<PublishOpenDoorResult> {
  const deviceId = sanitizeString(input.deviceId)
  const socketId = sanitizeString(input.socketId)
  const storeId = sanitizeString(input.storeId)
  const mercadopagoOrderId = sanitizeString(input.mercadopagoOrderId)
  const source = sanitizeString(input.source)
  const { topic, payload } = buildOpenDoorCommandMessage(input)

  const mqttEnv = getMqttEnv()
  if (!mqttEnv.url) {
    logger.error("MQTT nao configurado para envio de comando openDoor", {
      hasUrl: Boolean(mqttEnv.url),
      storeId,
      deviceId,
      mercadopagoOrderId,
    })
    return { ok: false, topic, payload, error: "mqtt_not_configured" }
  }

  if (!deviceId || !socketId) {
    return { ok: false, topic, payload, error: "invalid_payload" }
  }

  try {
    await publishMessageService({ topic, payload })
    logger.info("Comando MQTT openDoor publicado", {
      topic,
      storeId,
      deviceId,
      mercadopagoOrderId,
      source,
    })
    return { ok: true, topic, payload }
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error"
    logger.error("Falha ao publicar comando MQTT openDoor", {
      topic,
      storeId,
      deviceId,
      mercadopagoOrderId,
      source,
      error: message,
    })
    return { ok: false, topic, payload, error: message }
  }
}
