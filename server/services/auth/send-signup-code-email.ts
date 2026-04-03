import { AppError, isAppError } from "@/api/utils/app-error"
import { logger } from "@/api/utils/logger"
import { buildAuthOtpEmail } from "@/api/services/auth/build-auth-otp-email"
import { sendTransactionalEmailService } from "@/api/services/email/send-transactional-email-service"

interface SendSignupCodeEmailInput {
  email: string
  code: string
  recipientName: string | null | undefined
  expiresInMinutes: number
}

export async function sendSignupCodeEmail(input: SendSignupCodeEmailInput) {
  try {
    const payload = buildAuthOtpEmail({
      flow: "signup",
      recipientName: input.recipientName,
      code: input.code,
      expiresInMinutes: input.expiresInMinutes,
    })

    await sendTransactionalEmailService({
      emailType: "auth_signup_code",
      to: input.email,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
      idempotencyKey: `auth-signup:${input.email.toLowerCase()}:${input.code}`,
    })
  } catch (error) {
    if (isAppError(error)) {
      if (
        error.code === "EMAIL_SENDER_NOT_VERIFIED" ||
        error.code === "EMAIL_PROVIDER_TEST_MODE_RESTRICTED"
      ) {
        throw new AppError(
          "Falha ao enviar o codigo de verificacao. Configure EMAIL_FROM com um remetente de dominio verificado no Resend.",
          502,
          "EMAIL_SEND_FAILED",
        )
      }

      if (error.code === "EMAIL_RECIPIENT_INVALID") {
        throw new AppError(
          "Nao foi possivel enviar o codigo de verificacao por e-mail. Verifique o e-mail da conta.",
          422,
          "EMAIL_SEND_FAILED",
        )
      }

      if (error.code === "EMAIL_RECIPIENT_SUPPRESSED") {
        throw new AppError(
          "Este e-mail esta temporariamente indisponivel para recebimento.",
          409,
          "EMAIL_SEND_FAILED",
        )
      }

      if (error.code === "ENV_MISSING") {
        throw new AppError(
          "Configuracao de e-mail incompleta (RESEND_API_KEY/EMAIL_FROM/EMAIL_REPLY_TO/RESEND_WEBHOOK_SECRET).",
          500,
          "EMAIL_CONFIG_MISSING",
        )
      }

      throw error
    }

    logger.error("Erro inesperado no envio de e-mail de verificacao de cadastro", {
      error: error instanceof Error ? error.message : "unknown_error",
    })

    throw new AppError(
      "Nao foi possivel enviar o codigo de verificacao por e-mail. Tente novamente em instantes.",
      502,
      "EMAIL_SEND_FAILED",
    )
  }
}
