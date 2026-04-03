import { Resend } from "resend"
import { getEmailEnv } from "@/api/config/env"
import { AppError } from "@/api/utils/app-error"
import { logger } from "@/api/utils/logger"
import { getActiveEmailSuppression } from "@/api/services/email/email-suppression-service"

interface SendTransactionalEmailAttachment {
  filename: string
  content: Buffer
  contentType: string
}

interface SendTransactionalEmailInput {
  emailType: string
  to: string
  subject: string
  html: string
  text: string
  attachments?: SendTransactionalEmailAttachment[]
  userId?: string | null
  orderId?: string | null
  idempotencyKey?: string | null
}

interface SendTransactionalEmailResult {
  providerMessageId: string | null
}

let resendClient: Resend | null = null

function getResendClient() {
  if (!resendClient) {
    const { resendApiKey } = getEmailEnv()
    resendClient = new Resend(resendApiKey)
  }
  return resendClient
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase()
}

function mapResendErrorToAppError(error: { statusCode?: number | null; message?: string | null }) {
  const rawMessage = String(error.message ?? "").trim()
  const normalizedMessage = rawMessage.toLowerCase()
  const statusCode = error.statusCode ?? null

  const senderNotVerified =
    statusCode === 403 &&
    (normalizedMessage.includes("verify a domain") ||
      normalizedMessage.includes("sender not verified") ||
      normalizedMessage.includes("from address"))

  if (senderNotVerified) {
    return new AppError(
      "Remetente de e-mail nao verificado no Resend.",
      500,
      "EMAIL_SENDER_NOT_VERIFIED",
      true,
      false,
    )
  }

  const testingModeRestriction =
    statusCode === 403 &&
    (normalizedMessage.includes("testing emails") ||
      normalizedMessage.includes("only send emails to yourself") ||
      normalizedMessage.includes("verify an email address"))

  if (testingModeRestriction) {
    return new AppError(
      "Conta Resend em modo de teste com restricao de destinatarios.",
      403,
      "EMAIL_PROVIDER_TEST_MODE_RESTRICTED",
      true,
      false,
    )
  }

  const invalidRecipient =
    statusCode === 422 &&
    (normalizedMessage.includes("invalid") ||
      normalizedMessage.includes("recipient") ||
      normalizedMessage.includes("to"))

  if (invalidRecipient) {
    return new AppError(
      "Destinatario de e-mail invalido.",
      422,
      "EMAIL_RECIPIENT_INVALID",
      true,
      false,
    )
  }

  if (statusCode === 429) {
    return new AppError(
      "Limite temporario do provedor de e-mail atingido.",
      502,
      "EMAIL_PROVIDER_RATE_LIMIT",
      true,
      true,
    )
  }

  if (statusCode !== null && statusCode >= 500) {
    return new AppError(
      "Provedor de e-mail indisponivel no momento.",
      502,
      "EMAIL_PROVIDER_UNAVAILABLE",
      true,
      true,
    )
  }

  return new AppError(
    "Falha no provedor de e-mail.",
    502,
    "EMAIL_PROVIDER_REJECTED",
    true,
    false,
  )
}

export async function sendTransactionalEmailService(
  input: SendTransactionalEmailInput,
): Promise<SendTransactionalEmailResult> {
  const { emailFrom, emailReplyTo } = getEmailEnv()
  const normalizedRecipient = normalizeEmail(input.to)

  if (!normalizedRecipient || !normalizedRecipient.includes("@")) {
    throw new AppError("Destinatario de e-mail invalido.", 422, "EMAIL_RECIPIENT_INVALID", true, false)
  }

  const suppression = await getActiveEmailSuppression(normalizedRecipient)
  if (suppression) {
    throw new AppError(
      "Este e-mail esta temporariamente indisponivel para recebimento.",
      409,
      "EMAIL_RECIPIENT_SUPPRESSED",
      true,
      false,
    )
  }

  const sendResult = await getResendClient().emails.send(
    {
      from: emailFrom,
      to: normalizedRecipient,
      replyTo: emailReplyTo,
      subject: input.subject,
      html: input.html,
      text: input.text,
      attachments: input.attachments,
    },
    input.idempotencyKey
      ? {
          idempotencyKey: input.idempotencyKey,
        }
      : undefined,
  )

  if (sendResult.error) {
    const mappedError = mapResendErrorToAppError(sendResult.error)
    logger.error("Falha no envio transacional via Resend", {
      emailType: input.emailType,
      userId: input.userId ?? null,
      orderId: input.orderId ?? null,
      recipient: normalizedRecipient,
      statusCode: sendResult.error.statusCode ?? null,
      reason: sendResult.error.message ?? null,
      mappedCode: mappedError.code,
    })
    throw mappedError
  }

  const providerMessageId = sendResult.data?.id ?? null
  logger.info("E-mail transacional enviado com sucesso", {
    emailType: input.emailType,
    userId: input.userId ?? null,
    orderId: input.orderId ?? null,
    recipient: normalizedRecipient,
    resendMessageId: providerMessageId,
  })

  return { providerMessageId }
}

