import { getEmailEnv } from "@/api/config/env"

type AuthOtpEmailFlow = "reset" | "signup"

interface BuildAuthOtpEmailInput {
  flow: AuthOtpEmailFlow
  recipientName: string | null | undefined
  code: string
  expiresInMinutes: number
}

interface BuiltAuthOtpEmail {
  subject: string
  html: string
  text: string
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function extractFirstName(name: string | null | undefined) {
  const normalized = typeof name === "string" ? name.trim() : ""
  if (!normalized) return "cliente"
  const [firstName = "cliente"] = normalized.split(/\s+/)
  return firstName || "cliente"
}

function extractHost(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./i, "")
  } catch {
    return url
  }
}

function getFlowCopy(flow: AuthOtpEmailFlow) {
  if (flow === "reset") {
    return {
      subject: "Recupera\u00e7\u00e3o de senha - Mr Smart",
      preheader: "Use este c\u00f3digo para redefinir sua senha com seguran\u00e7a.",
      title: "Recupera\u00e7\u00e3o de senha",
      message: "Recebemos uma solicita\u00e7\u00e3o para redefinir a senha da sua conta.",
      codeLabel: "Seu c\u00f3digo de verifica\u00e7\u00e3o",
      securityNote: "Se voc\u00ea n\u00e3o solicitou esta redefini\u00e7\u00e3o, ignore este e-mail com seguran\u00e7a.",
    }
  }

  return {
    subject: "C\u00f3digo de verifica\u00e7\u00e3o de cadastro - Mr Smart",
    preheader: "Use este c\u00f3digo para concluir a verifica\u00e7\u00e3o do seu cadastro.",
    title: "Verifica\u00e7\u00e3o de cadastro",
    message: "Recebemos uma solicita\u00e7\u00e3o para confirmar o cadastro da sua conta.",
    codeLabel: "Seu c\u00f3digo de verifica\u00e7\u00e3o",
    securityNote: "Se voc\u00ea n\u00e3o iniciou este cadastro, ignore este e-mail com seguran\u00e7a.",
  }
}

export function buildAuthOtpEmail(input: BuildAuthOtpEmailInput): BuiltAuthOtpEmail {
  const { emailLogoUrl, emailAppUrl, emailSupportWhatsappUrl } = getEmailEnv()
  const firstName = extractFirstName(input.recipientName)
  const safeFirstName = escapeHtml(firstName)
  const safeCode = escapeHtml(input.code)
  const flowCopy = getFlowCopy(input.flow)
  const siteHost = extractHost(emailAppUrl)
  const safeSiteHost = escapeHtml(siteHost)
  const safeLogoUrl = escapeHtml(emailLogoUrl)
  const safeAppUrl = escapeHtml(emailAppUrl)
  const safeSupportUrl = escapeHtml(emailSupportWhatsappUrl)
  const safePreheader = escapeHtml(flowCopy.preheader)
  const safeTitle = escapeHtml(flowCopy.title)
  const safeMessage = escapeHtml(flowCopy.message)
  const safeCodeLabel = escapeHtml(flowCopy.codeLabel)
  const safeSecurityNote = escapeHtml(flowCopy.securityNote)
  const safeExpiresInMinutes = Math.max(1, Math.floor(input.expiresInMinutes))

  const html = `
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${flowCopy.subject}</title>
      </head>
      <body style="margin:0;padding:0;background:#f4f5f7;">
        <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
          ${safePreheader}
        </div>
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f4f5f7;padding:24px 12px;">
          <tr>
            <td align="center">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;">
                <tr>
                  <td style="padding:28px 28px 12px 28px;border-bottom:1px solid #f3f4f6;">
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="vertical-align:middle;">
                          <img src="${safeLogoUrl}" alt="Mr Smart" width="40" height="40" style="display:block;border:0;outline:none;" />
                        </td>
                        <td style="padding-left:10px;vertical-align:middle;font-family:Arial,sans-serif;font-size:20px;font-weight:700;color:#111827;">
                          Mr Smart
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:24px 28px 8px 28px;font-family:Arial,sans-serif;color:#111827;">
                    <p style="margin:0 0 14px 0;font-size:22px;line-height:1.3;font-weight:700;">Ol\u00e1, ${safeFirstName}!</p>
                    <p style="margin:0 0 8px 0;font-size:17px;line-height:1.45;font-weight:700;">${safeTitle}</p>
                    <p style="margin:0 0 20px 0;font-size:15px;line-height:1.6;color:#374151;">${safeMessage}</p>
                    <p style="margin:0 0 10px 0;font-size:13px;line-height:1.5;color:#6b7280;text-transform:uppercase;letter-spacing:0.4px;">
                      ${safeCodeLabel}
                    </p>
                    <div style="margin:0 0 18px 0;background:#111827;color:#ffffff;border-radius:12px;padding:14px 16px;font-family:'Courier New',monospace;font-size:32px;line-height:1.1;font-weight:700;letter-spacing:6px;text-align:center;">
                      ${safeCode}
                    </div>
                    <p style="margin:0 0 20px 0;font-size:14px;line-height:1.5;color:#374151;">
                      V\u00e1lido por ${safeExpiresInMinutes} minutos.
                    </p>
                    <a href="${safeAppUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:#f97316;color:#ffffff;text-decoration:none;font-family:Arial,sans-serif;font-size:14px;font-weight:700;padding:12px 18px;border-radius:10px;">
                      Acessar minha conta
                    </a>
                    <p style="margin:20px 0 0 0;font-size:13px;line-height:1.6;color:#6b7280;">
                      ${safeSecurityNote}
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:18px 28px 24px 28px;border-top:1px solid #f3f4f6;font-family:Arial,sans-serif;">
                    <p style="margin:0 0 6px 0;font-size:12px;line-height:1.6;color:#6b7280;">
                      Site: <a href="${safeAppUrl}" target="_blank" rel="noopener noreferrer" style="color:#374151;text-decoration:none;">${safeSiteHost}</a>
                    </p>
                    <p style="margin:0 0 6px 0;font-size:12px;line-height:1.6;color:#6b7280;">
                      Suporte: <a href="${safeSupportUrl}" target="_blank" rel="noopener noreferrer" style="color:#374151;text-decoration:none;">WhatsApp</a>
                    </p>
                    <p style="margin:10px 0 0 0;font-size:11px;line-height:1.6;color:#9ca3af;">
                      Esta mensagem foi enviada automaticamente. Por favor, n\u00e3o responda este e-mail.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `.trim()

  const text = [
    "Mr Smart",
    "",
    `Ol\u00e1, ${firstName}!`,
    "",
    flowCopy.title,
    flowCopy.message,
    "",
    `${flowCopy.codeLabel}: ${input.code}`,
    `V\u00e1lido por ${safeExpiresInMinutes} minutos.`,
    "",
    "Acessar minha conta:",
    emailAppUrl,
    "",
    flowCopy.securityNote,
    "",
    `Site: ${siteHost}`,
    `Suporte (WhatsApp): ${emailSupportWhatsappUrl}`,
    "",
    "Esta mensagem foi enviada automaticamente. Por favor, n\u00e3o responda este e-mail.",
  ].join("\n")

  return {
    subject: flowCopy.subject,
    html,
    text,
  }
}
