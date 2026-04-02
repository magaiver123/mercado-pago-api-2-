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
  emailLogoUrl: string | null
  emailAppUrl: string
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

function formatMoney(value: number) {
  if (!Number.isFinite(value)) return "R$ 0,00"
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value)
}

function formatDateTime(value: string) {
  const parsed = new Date(value)
  const safeDate = Number.isNaN(parsed.getTime()) ? new Date() : parsed
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(safeDate)
}

function maskCustomerCpf(value: string | null | undefined) {
  const raw = String(value ?? "").trim()
  if (!raw) return "CPF nao informado"

  const digits = raw.replace(/\D/g, "")
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}.***.***-${digits.slice(9)}`
  }

  return raw
}

function maskCustomerName(value: string | null | undefined) {
  const raw = String(value ?? "").trim()
  if (!raw) return "Nao informado"

  const words = raw.split(/\s+/).filter(Boolean)
  if (words.length === 0) return "Nao informado"

  return words
    .map((word) => {
      if (word.length <= 1) return "*"
      const visible = Math.min(3, word.length - 1)
      return `${word.slice(0, visible)}${"*".repeat(word.length - visible)}`
    })
    .join(" ")
}

function readOrderReceiptVisualEnv(): OrderReceiptVisualEnv {
  const emailLogoUrlRaw = String(process.env.EMAIL_LOGO_URL ?? "").trim()
  const emailAppUrlRaw = String(process.env.EMAIL_APP_URL ?? "").trim()
  const emailSupportWhatsappUrlRaw = String(process.env.EMAIL_SUPPORT_WHATSAPP_URL ?? "").trim()

  return {
    emailLogoUrl: emailLogoUrlRaw || null,
    emailAppUrl: emailAppUrlRaw || "https://mrsmart.com.br",
    emailSupportWhatsappUrl: emailSupportWhatsappUrlRaw || "https://wa.me/5551995881730",
  }
}

export function buildOrderReceiptEmail(input: BuildOrderReceiptEmailInput): BuiltOrderReceiptEmail {
  const { emailLogoUrl, emailAppUrl, emailSupportWhatsappUrl } = readOrderReceiptVisualEnv()
  const receipt = input.receipt
  const displayOrder = formatOrderNumberOrFallback(
    receipt.orderNumber,
    receipt.orderId.slice(0, 8).toUpperCase(),
  )
  const safeOrder = escapeHtml(displayOrder)
  const safeStoreName = escapeHtml(sanitizeText(receipt.storeName, "Autoatendimento"))
  const safeDateTime = escapeHtml(formatDateTime(receipt.createdAt))
  const safePaymentMethod = escapeHtml(sanitizeText(receipt.paymentMethod, "Nao informado"))
  const safeCustomerName = escapeHtml(maskCustomerName(receipt.customerName))
  const safeCustomerCpf = escapeHtml(maskCustomerCpf(receipt.customerDocument))
  const subtotal = receipt.subtotal
  const discounts = receipt.discounts ?? 0
  const total = receipt.total
  const safeLogoUrl = emailLogoUrl ? escapeHtml(emailLogoUrl) : null
  const safeAppUrl = escapeHtml(emailAppUrl)
  const safeSupportUrl = escapeHtml(emailSupportWhatsappUrl)
  const fileName = `comprovante-pedido-${displayOrder}.pdf`
  const safeFileName = escapeHtml(fileName)
  const subject = `Comprovante digital do pedido #${displayOrder} - Mr Smart`

  const itemsHtml = receipt.items
    .map((item) => {
      const itemName = escapeHtml(sanitizeText(item.name, "Item"))
      const itemQuantity = Number.isFinite(item.quantity) ? Math.max(1, Math.floor(item.quantity)) : 1
      const itemUnitPrice = Number.isFinite(item.unitPrice) ? Math.max(0, item.unitPrice) : 0
      const itemTotal = itemQuantity * itemUnitPrice
      return `
        <tr>
          <td style="padding:8px 0;color:#111827;font-size:13px;line-height:1.4;">${itemName}</td>
          <td style="padding:8px 0;color:#374151;font-size:13px;text-align:center;">${itemQuantity}</td>
          <td style="padding:8px 0;color:#111827;font-size:13px;text-align:right;">${escapeHtml(formatMoney(itemTotal))}</td>
        </tr>
      `.trim()
    })
    .join("")

  const html = `
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${escapeHtml(subject)}</title>
      </head>
      <body style="margin:0;padding:0;background:#f4f6f8;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:28px 12px;background:#f4f6f8;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#ffffff;border:1px solid #e5e7eb;border-radius:18px;overflow:hidden;">
                <tr>
                  <td style="padding:24px 24px 16px 24px;border-bottom:1px solid #f3f4f6;">
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        ${
                          safeLogoUrl
                            ? `<td style="vertical-align:middle;">
                          <img src="${safeLogoUrl}" alt="Mr Smart" width="44" height="44" style="display:block;border:0;" />
                        </td>`
                            : ""
                        }
                        <td style="${safeLogoUrl ? "padding-left:12px;" : ""}font-family:Arial,sans-serif;">
                          <div style="font-size:22px;font-weight:700;color:#111827;">Mr Smart</div>
                          <div style="margin-top:2px;font-size:12px;color:#6b7280;">Comprovante digital do seu pedido</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:22px 24px 16px 24px;font-family:Arial,sans-serif;">
                    <h1 style="margin:0 0 8px 0;font-size:22px;line-height:1.3;color:#111827;">Pedido #${safeOrder}</h1>
                    <p style="margin:0;color:#4b5563;font-size:14px;line-height:1.6;">
                      Seu comprovante completo est&aacute; anexado em PDF (<strong>${safeFileName}</strong>).
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 24px 10px 24px;font-family:Arial,sans-serif;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:12px;padding:14px;">
                      <tr><td style="font-size:13px;color:#6b7280;padding:2px 0;">Loja</td><td style="font-size:13px;color:#111827;text-align:right;padding:2px 0;">${safeStoreName}</td></tr>
                      <tr><td style="font-size:13px;color:#6b7280;padding:2px 0;">Data e hora</td><td style="font-size:13px;color:#111827;text-align:right;padding:2px 0;">${safeDateTime}</td></tr>
                      <tr><td style="font-size:13px;color:#6b7280;padding:2px 0;">Pagamento</td><td style="font-size:13px;color:#111827;text-align:right;padding:2px 0;">${safePaymentMethod}</td></tr>
                      <tr><td style="font-size:13px;color:#6b7280;padding:2px 0;">Cliente</td><td style="font-size:13px;color:#111827;text-align:right;padding:2px 0;">${safeCustomerName}</td></tr>
                      <tr><td style="font-size:13px;color:#6b7280;padding:2px 0;">CPF</td><td style="font-size:13px;color:#111827;text-align:right;padding:2px 0;">${safeCustomerCpf}</td></tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 24px 10px 24px;font-family:Arial,sans-serif;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <thead>
                        <tr>
                          <th align="left" style="font-size:12px;color:#6b7280;padding:8px 0;border-bottom:1px solid #e5e7eb;">Item</th>
                          <th align="center" style="font-size:12px;color:#6b7280;padding:8px 0;border-bottom:1px solid #e5e7eb;">Qtd</th>
                          <th align="right" style="font-size:12px;color:#6b7280;padding:8px 0;border-bottom:1px solid #e5e7eb;">Total</th>
                        </tr>
                      </thead>
                      <tbody>${itemsHtml}</tbody>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 24px 22px 24px;font-family:Arial,sans-serif;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e5e7eb;padding-top:8px;">
                      <tr><td style="font-size:13px;color:#4b5563;padding:4px 0;">Subtotal</td><td style="font-size:13px;color:#111827;text-align:right;padding:4px 0;">${escapeHtml(formatMoney(subtotal))}</td></tr>
                      <tr><td style="font-size:13px;color:#4b5563;padding:4px 0;">Descontos</td><td style="font-size:13px;color:#111827;text-align:right;padding:4px 0;">${escapeHtml(formatMoney(discounts))}</td></tr>
                      <tr><td style="font-size:15px;font-weight:700;color:#111827;padding:5px 0;">Total pago</td><td style="font-size:15px;font-weight:700;color:#111827;text-align:right;padding:5px 0;">${escapeHtml(formatMoney(total))}</td></tr>
                    </table>
                    <div style="margin-top:14px;">
                      <a href="${safeAppUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:#f97316;color:#ffffff;text-decoration:none;font-size:13px;font-weight:700;padding:10px 14px;border-radius:10px;">Acessar minha conta</a>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:14px 24px 20px 24px;border-top:1px solid #f3f4f6;font-family:Arial,sans-serif;">
                    <p style="margin:0;font-size:12px;line-height:1.6;color:#6b7280;">
                      Precisa de ajuda? Fale com nosso time no
                      <a href="${safeSupportUrl}" target="_blank" rel="noopener noreferrer" style="color:#374151;text-decoration:none;">WhatsApp</a>.
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

  const itemsText = receipt.items
    .map((item) => {
      const quantity = Number.isFinite(item.quantity) ? Math.max(1, Math.floor(item.quantity)) : 1
      const unitPrice = Number.isFinite(item.unitPrice) ? Math.max(0, item.unitPrice) : 0
      const totalItem = quantity * unitPrice
      return `- ${sanitizeText(item.name, "Item")} x${quantity} (${formatMoney(totalItem)})`
    })
    .join("\n")

  const text = [
    `Mr Smart - Pedido #${displayOrder}`,
    "",
    "Comprovante digital anexado em PDF.",
    "",
    `Loja: ${sanitizeText(receipt.storeName, "Autoatendimento")}`,
    `Data e hora: ${formatDateTime(receipt.createdAt)}`,
    `Pagamento: ${sanitizeText(receipt.paymentMethod, "Nao informado")}`,
    `Cliente: ${maskCustomerName(receipt.customerName)}`,
    `CPF: ${maskCustomerCpf(receipt.customerDocument)}`,
    "",
    "Itens:",
    itemsText || "- Sem itens",
    "",
    `Subtotal: ${formatMoney(subtotal)}`,
    `Descontos: ${formatMoney(discounts)}`,
    `Total pago: ${formatMoney(total)}`,
    "",
    `Acessar minha conta: ${emailAppUrl}`,
    `Suporte WhatsApp: ${emailSupportWhatsappUrl}`,
  ].join("\n")

  return {
    subject,
    html,
    text,
    fileName,
  }
}
