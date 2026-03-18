import { Resend } from "resend"
import { getEmailEnv } from "@/api/config/env"
import { AppError, isAppError } from "@/api/utils/app-error"
import { logger } from "@/api/utils/logger"

let resendClient: Resend | null = null

function getResendClient() {
  if (!resendClient) {
    const { resendApiKey } = getEmailEnv()
    resendClient = new Resend(resendApiKey)
  }
  return resendClient
}

function mapResendErrorToMessage(error: { statusCode?: number; message?: string }) {
  const rawMessage = `${error.message ?? ""}`.toLowerCase()
  const looksLikeSenderDomainIssue =
    error.statusCode === 403 &&
    (rawMessage.includes("testing emails") || rawMessage.includes("verify a domain") || rawMessage.includes("from address"))

  if (looksLikeSenderDomainIssue) {
    return "Falha ao enviar o codigo de verificacao. Configure EMAIL_FROM com um remetente @mrsmart.com.br verificado no Resend."
  }

  return "Nao foi possivel enviar o codigo de verificacao por e-mail. Tente novamente em instantes."
}

export async function sendSignupCodeEmail(email: string, code: string) {
  let emailFrom = ""
  try {
    emailFrom = getEmailEnv().emailFrom
  } catch {
    throw new AppError("Configuracao de e-mail incompleta (RESEND_API_KEY/EMAIL_FROM).", 500, "EMAIL_CONFIG_MISSING")
  }

  try {
    const { error } = await getResendClient().emails.send({
      from: emailFrom,
      to: email,
      subject: "Codigo de verificacao de cadastro - Mr Smart",
      html: `
        <div style="font-family: Arial, sans-serif;">
          <h2>Verificacao de cadastro</h2>
          <p>Use o codigo abaixo para validar seu cadastro:</p>
          <div style="font-size: 24px; font-weight: bold; letter-spacing: 4px;">
            ${code}
          </div>
          <p>Este codigo expira em alguns minutos.</p>
          <p>Se voce nao solicitou esse cadastro, ignore este e-mail.</p>
        </div>
      `,
    })

    if (!error) {
      return
    }

    logger.error("Falha no envio de email de verificacao de cadastro via Resend", {
      reason: error.message,
      name: error.name,
      statusCode: (error as { statusCode?: number }).statusCode,
    })
    throw new AppError(mapResendErrorToMessage(error), 502, "EMAIL_SEND_FAILED")
  } catch (error) {
    if (isAppError(error)) {
      throw error
    }

    logger.error("Erro inesperado no envio de email de verificacao de cadastro", {
      error: error instanceof Error ? error.message : "unknown_error",
    })
    throw new AppError("Nao foi possivel enviar o codigo de verificacao por e-mail. Tente novamente em instantes.", 502, "EMAIL_SEND_FAILED")
  }
}
