import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendResetCodeEmail(
  email: string,
  code: string
) {
  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to: email,
    subject: "Recuperação de senha - Mr Smart",
    html: `
      <div style="font-family: Arial, sans-serif;">
        <h2>Recuperação de senha</h2>
        <p>Use o código abaixo para redefinir sua senha:</p>
        <div style="font-size: 24px; font-weight: bold; letter-spacing: 4px;">
          ${code}
        </div>
        <p>Este código expira em alguns minutos.</p>
        <p>Se você não solicitou isso, ignore este e-mail.</p>
      </div>
    `,
  });

  if (error) {
    console.error("Erro ao enviar email (Resend):", error);
    throw new Error("Erro ao enviar email");
  }
}
