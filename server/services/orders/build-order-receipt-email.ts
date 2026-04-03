import { ReceiptData } from "@/lib/receipt-types"
import { formatOrderNumberOrFallback } from "@/lib/order-number"

interface BuildOrderReceiptEmailInput {
  receipt: ReceiptData
}

interface BuiltOrderReceiptEmail {
  subject: string
  html: string
  text: string
  fileName: string
}

interface OrderReceiptVisualEnv {
  emailSupportWhatsappUrl: string
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function sanitizeText(value: unknown, fallback: string) {
  if (typeof value !== "string") return fallback
  const normalized = value.trim()
  return normalized || fallback
}

function readOrderReceiptVisualEnv(): OrderReceiptVisualEnv {
  const emailSupportWhatsappUrlRaw = String(process.env.EMAIL_SUPPORT_WHATSAPP_URL ?? "").trim()

  return {
    emailSupportWhatsappUrl: emailSupportWhatsappUrlRaw || "https://wa.me/5551995881730",
  }
}

export function buildOrderReceiptEmail(input: BuildOrderReceiptEmailInput): BuiltOrderReceiptEmail {
  const { emailSupportWhatsappUrl } = readOrderReceiptVisualEnv()
  const receipt = input.receipt
  const displayOrder = formatOrderNumberOrFallback(
    receipt.orderNumber,
    receipt.orderId.slice(0, 8).toUpperCase(),
  )
  const safeGreetingName = escapeHtml(sanitizeText(receipt.customerName, "Cliente"))
  const safeSupportUrl = escapeHtml(emailSupportWhatsappUrl)
  const fileName = `comprovante-pedido-${displayOrder}.pdf`
  const subject = "Comprovante Digital - Seu documento está disponível"

  const html = `
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${subject}</title>
      </head>
      <body style="margin:0;padding:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;color:#111111;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:30px 12px;background:#ffffff;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:700px;background:#ffffff;border:1px solid #f1f1f1;border-radius:18px;overflow:hidden;box-shadow:0 6px 20px rgba(17,17,17,0.06);">
                <tr>
                  <td style="padding:0;">
                    <div style="height:6px;background:#f97316;"></div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:26px 26px 30px 26px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
                      <tr>
                        <td style="font-size:26px;font-weight:800;line-height:1;color:#111111;">
                          <span style="color:#f97316;">Mr</span> Smart
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-top:6px;font-size:13px;line-height:1.4;color:#666666;">
                          Comprovante digital da sua operação
                        </td>
                      </tr>
                    </table>

                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:22px;border:1px solid #fed7aa;background:#fff7ed;border-radius:12px;">
                      <tr>
                        <td style="padding:14px 16px;font-size:15px;line-height:1.5;color:#111111;">
                          <strong style="color:#ea580c;">Tudo certo por aqui.</strong> Seu comprovante digital já está disponível em anexo.
                        </td>
                      </tr>
                    </table>

                    <p style="margin:0 0 12px 0;color:#111111;font-size:16px;line-height:1.6;">Olá, ${safeGreetingName},</p>
                    <p style="margin:0 0 12px 0;color:#111111;font-size:16px;line-height:1.6;">Esperamos que você esteja bem &#128522;</p>
                    <p style="margin:0 0 14px 0;color:#111111;font-size:16px;line-height:1.6;">
                      Seu comprovante digital já está disponível e foi anexado a este e-mail em formato PDF para sua visualização e armazenamento.
                    </p>
                    <p style="margin:0 0 16px 0;color:#111111;font-size:16px;line-height:1.6;">
                      &#128206; <strong>Arquivo anexado:</strong> Comprovante digital da sua operação
                    </p>
                    <p style="margin:0 0 18px 0;color:#111111;font-size:16px;line-height:1.6;">
                      Recomendamos que você salve este documento para futuras consultas ou registros.
                    </p>

                    <div style="height:1px;background:#ececec;margin:14px 0 18px 0;"></div>

                    <p style="margin:0 0 10px 0;color:#111111;font-size:16px;line-height:1.6;"><strong>Informações importantes:</strong></p>
                    <ul style="margin:0 0 20px 24px;padding:0;color:#111111;font-size:15px;line-height:1.7;">
                      <li>Este comprovante é um documento oficial da transação realizada.</li>
                      <li>Caso não consiga visualizar o arquivo, verifique sua caixa de spam ou tente abrir em outro dispositivo.</li>
                      <li>Para sua segurança, não compartilhe este documento com terceiros.</li>
                    </ul>

                    <div style="height:1px;background:#ececec;margin:14px 0 18px 0;"></div>

                    <p style="margin:0 0 16px 0;color:#111111;font-size:16px;line-height:1.6;">
                      Se tiver qualquer dúvida ou precisar de suporte, nossa equipe está à disposição para ajudar.
                    </p>
                    <p style="margin:0 0 10px 0;color:#111111;font-size:16px;line-height:1.6;">Atenciosamente,</p>
                    <p style="margin:0 0 14px 0;color:#111111;font-size:16px;line-height:1.6;">
                      <strong>Mr Smart</strong><br />
                      <a href="${safeSupportUrl}" target="_blank" rel="noopener noreferrer" style="color:#ea580c;text-decoration:underline;">Suporte via WhatsApp</a>
                    </p>

                    <a
                      href="${safeSupportUrl}"
                      target="_blank"
                      rel="noopener noreferrer"
                      style="display:inline-block;background:#f97316;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:11px 16px;border-radius:10px;"
                    >
                      Falar com o suporte
                    </a>
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
    `Olá, ${sanitizeText(receipt.customerName, "Cliente")},`,
    "",
    "Esperamos que você esteja bem.",
    "",
    "Seu comprovante digital já está disponível e foi anexado a este e-mail em formato PDF para sua visualização e armazenamento.",
    "",
    "Arquivo anexado: Comprovante digital da sua operação",
    "",
    "Recomendamos que você salve este documento para futuras consultas ou registros.",
    "",
    "Informações importantes:",
    "- Este comprovante é um documento oficial da transação realizada.",
    "- Caso não consiga visualizar o arquivo, verifique sua caixa de spam ou tente abrir em outro dispositivo.",
    "- Para sua segurança, não compartilhe este documento com terceiros.",
    "",
    "Se tiver qualquer dúvida ou precisar de suporte, nossa equipe está à disposição para ajudar.",
    "",
    "Atenciosamente,",
    "Mr Smart",
    `Suporte WhatsApp: ${emailSupportWhatsappUrl}`,
  ].join("\n")

  return {
    subject,
    html,
    text,
    fileName,
  }
}
