import { Resend } from "resend"
import { getEmailEnv } from "@/api/config/env"
import { AppError } from "@/api/utils/app-error"

let resendClient: Resend | null = null

function getResendClient() {
  if (!resendClient) {
    const { resendApiKey } = getEmailEnv()
    resendClient = new Resend(resendApiKey)
  }
  return resendClient
}

export async function sendResetCodeEmail(email: string, code: string) {
  const { emailFrom } = getEmailEnv()

  const { error } = await getResendClient().emails.send({
    from: emailFrom,
    to: email,
    subject: "Recuperacao de senha - Mr Smart",
    html: `
      <div style="font-family: Arial, sans-serif;">
        <h2>Recuperacao de senha</h2>
        <p>Use o codigo abaixo para redefinir sua senha:</p>
        <div style="font-size: 24px; font-weight: bold; letter-spacing: 4px;">
          ${code}
        </div>
        <p>Este codigo expira em alguns minutos.</p>
        <p>Se voce nao solicitou isso, ignore este e-mail.</p>
      </div>
    `,
  })

  if (error) {
    throw new AppError("Erro ao enviar email", 500, "EMAIL_SEND_FAILED", false)
  }
}

