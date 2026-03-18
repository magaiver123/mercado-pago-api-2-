import { Resend } from "resend"
import { getEmailEnv } from "@/api/config/env"
import { AppError, isAppError } from "@/api/utils/app-error"
import { logger } from "@/api/utils/logger"
import { buildAuthOtpEmail } from "@/api/services/auth/build-auth-otp-email"

let resendClient: Resend | null = null

function getResendClient() {
  if (!resendClient) {
    const { resendApiKey } = getEmailEnv()
    resendClient = new Resend(resendApiKey)
  }
  return resendClient
}

function mapResendErrorToMessage(error: { statusCode?: number | null; message?: string | null }) {
  const rawMessage = `${error.message ?? ""}`.toLowerCase()
  const looksLikeSenderDomainIssue =
    error.statusCode === 403 &&
    (rawMessage.includes("testing emails") || rawMessage.includes("verify a domain") || rawMessage.includes("from address"))

  if (looksLikeSenderDomainIssue) {
    return "Falha ao enviar o código de verificação. Configure EMAIL_FROM com um remetente @mrsmart.com.br verificado no Resend."
  }

  return "Não foi possível enviar o código de verificação por e-mail. Tente novamente em instantes."
}

interface SendSignupCodeEmailInput {
  email: string
  code: string
  recipientName: string | null | undefined
  expiresInMinutes: number
}

export async function sendSignupCodeEmail(input: SendSignupCodeEmailInput) {
  let emailFrom = ""
  try {
    emailFrom = getEmailEnv().emailFrom
  } catch {
    throw new AppError("Configuração de e-mail incompleta (RESEND_API_KEY/EMAIL_FROM/EMAIL_LOGO_URL/EMAIL_APP_URL/EMAIL_SUPPORT_WHATSAPP_URL).", 500, "EMAIL_CONFIG_MISSING")
  }

  try {
    const payload = buildAuthOtpEmail({
      flow: "signup",
      recipientName: input.recipientName,
      code: input.code,
      expiresInMinutes: input.expiresInMinutes,
    })

    const { error } = await getResendClient().emails.send({
      from: emailFrom,
      to: input.email,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    })

    if (!error) {
      return
    }

    logger.error("Falha no envio de e-mail de verificação de cadastro via Resend", {
      reason: error.message,
      name: error.name,
      statusCode: (error as { statusCode?: number }).statusCode,
    })
    throw new AppError(mapResendErrorToMessage(error), 502, "EMAIL_SEND_FAILED")
  } catch (error) {
    if (isAppError(error)) {
      throw error
    }

    logger.error("Erro inesperado no envio de e-mail de verificação de cadastro", {
      error: error instanceof Error ? error.message : "unknown_error",
    })
    throw new AppError("Não foi possível enviar o código de verificação por e-mail. Tente novamente em instantes.", 502, "EMAIL_SEND_FAILED")
  }
}
