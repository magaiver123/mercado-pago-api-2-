import { Resend } from "resend"
import { AppError } from "@/api/utils/app-error"
import { logger } from "@/api/utils/logger"
import { getResendWebhookEnv } from "@/api/config/env"
import { registerWebhookEventService } from "@/api/services/mercadopago/register-webhook-event-service"
import { upsertEmailSuppression } from "@/api/services/email/email-suppression-service"

interface ProcessResendWebhookInput {
  payload: string
  svixId: string | null
  svixTimestamp: string | null
  svixSignature: string | null
}

interface ResendWebhookPayload {
  type?: string
  data?: {
    email_id?: string
    to?: string[]
    [key: string]: unknown
  }
  [key: string]: unknown
}

let resendWebhookClient: Resend | null = null

function getResendWebhookClient() {
  if (!resendWebhookClient) {
    resendWebhookClient = new Resend()
  }
  return resendWebhookClient
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase()
}

function extractRecipientEmails(payload: ResendWebhookPayload): string[] {
  const to = Array.isArray(payload.data?.to) ? payload.data?.to : []
  return Array.from(
    new Set(
      to
        .filter((value): value is string => typeof value === "string")
        .map((value) => normalizeEmail(value))
        .filter(Boolean),
    ),
  )
}

function isSuppressionType(eventType: string) {
  return (
    eventType === "email.bounced" ||
    eventType === "email.complained" ||
    eventType === "email.suppressed"
  )
}

function getSuppressionReason(eventType: string) {
  if (eventType === "email.bounced") return "bounce"
  if (eventType === "email.complained") return "complaint"
  return "suppressed"
}

function verifyResendWebhookPayload(input: ProcessResendWebhookInput): ResendWebhookPayload {
  const { webhookSecret } = getResendWebhookEnv()
  const svixId = input.svixId?.trim() ?? ""
  const svixTimestamp = input.svixTimestamp?.trim() ?? ""
  const svixSignature = input.svixSignature?.trim() ?? ""

  if (!svixId || !svixTimestamp || !svixSignature) {
    throw new AppError("Cabecalhos de assinatura do webhook ausentes.", 401, "RESEND_WEBHOOK_INVALID_SIGNATURE")
  }

  try {
    const verifiedPayload = getResendWebhookClient().webhooks.verify({
      payload: input.payload,
      webhookSecret,
      headers: {
        id: svixId,
        timestamp: svixTimestamp,
        signature: svixSignature,
      },
    })

    return verifiedPayload as unknown as ResendWebhookPayload
  } catch {
    throw new AppError("Assinatura de webhook invalida.", 401, "RESEND_WEBHOOK_INVALID_SIGNATURE")
  }
}

export async function processResendWebhookService(input: ProcessResendWebhookInput) {
  const parsedPayload = verifyResendWebhookPayload(input)
  const eventType = typeof parsedPayload.type === "string" ? parsedPayload.type : "unknown"
  const eventKey = `resend:${input.svixId ?? "missing-id"}`

  const webhookEvent = await registerWebhookEventService({
    provider: "resend",
    eventKey,
    action: eventType,
    mercadopagoOrderId: null,
    payload: parsedPayload,
  })

  if (webhookEvent.duplicate) {
    logger.info("Webhook Resend duplicado ignorado", { eventKey, eventType })
    return { ok: true, duplicate: true, eventType }
  }

  const recipients = extractRecipientEmails(parsedPayload)
  if (isSuppressionType(eventType)) {
    const reason = getSuppressionReason(eventType)
    const eventId =
      typeof parsedPayload.data?.email_id === "string" ? parsedPayload.data.email_id : null

    for (const recipient of recipients) {
      await upsertEmailSuppression({
        email: recipient,
        reason,
        sourceEventType: eventType,
        sourceEventId: eventId,
        payload: parsedPayload,
      })
    }

    logger.warn("Supressao de e-mail registrada por webhook Resend", {
      eventType,
      recipients,
      eventKey,
    })
  } else {
    logger.info("Webhook Resend processado", {
      eventType,
      recipients,
      eventKey,
    })
  }

  return { ok: true, duplicate: false, eventType }
}
