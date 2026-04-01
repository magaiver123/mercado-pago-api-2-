import { ReceiptData } from "@/lib/receipt-types"
import { sanitizeString } from "@/api/utils/sanitize"

const MAX_ITEMS = 120
const MAX_TEXT = 240
const MAX_ITEM_NAME = 80
const MAX_TEMPLATE_LINES = 260
const MAX_TEMPLATE_LINE_TEXT = 120

type EscPosTextAlign = "left" | "center" | "right"

interface EscPosTemplateLineObject {
  text?: string
  align?: EscPosTextAlign
  bold?: boolean
  separator?: "major" | "minor"
  empty?: boolean
  blankLinesAfter?: number
}

type EscPosTemplateLine = string | EscPosTemplateLineObject

interface EscPosTemplate {
  lines: EscPosTemplateLine[]
}

function sanitizeNumber(value: unknown, fallback = 0): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback
  const normalized = Math.round(value * 100) / 100
  return normalized
}

function sanitizeText(value: unknown, maxLength = MAX_TEXT): string | null {
  const normalized = sanitizeString(value)
  if (!normalized) return null
  return normalized.slice(0, maxLength)
}

function formatCustomerCpf(value: unknown): string {
  const raw = sanitizeText(value, 32)
  if (!raw) return "CPF nao informado"

  const digits = raw.replace(/\D/g, "")
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
  }

  return raw
}

function sanitizeReceiptData(value: unknown, orderId: string): ReceiptData | null {
  if (!value || typeof value !== "object") return null

  const raw = value as Partial<ReceiptData>
  const items = Array.isArray(raw.items)
    ? raw.items
        .slice(0, MAX_ITEMS)
        .map((item) => ({
          name: sanitizeText(item?.name, MAX_ITEM_NAME) ?? "Item",
          quantity: Math.max(1, Math.floor(sanitizeNumber(item?.quantity, 1))),
          unitPrice: Math.max(0, sanitizeNumber(item?.unitPrice, 0)),
        }))
        .filter((item) => item.name.length > 0)
    : []

  if (items.length === 0) return null

  const itemsSubtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
  const rawSubtotal = Math.max(0, sanitizeNumber(raw.subtotal, itemsSubtotal))
  const normalizedSubtotal = rawSubtotal > 0 ? rawSubtotal : itemsSubtotal
  const rawDiscounts = Math.max(0, sanitizeNumber(raw.discounts, 0))
  const normalizedDiscounts = Math.min(rawDiscounts, normalizedSubtotal)
  const rawTotal = Math.max(0, sanitizeNumber(raw.total, normalizedSubtotal - normalizedDiscounts))
  const normalizedTotal = rawTotal > 0 ? rawTotal : Math.max(0, normalizedSubtotal - normalizedDiscounts)

  const createdAtRaw = sanitizeText(raw.createdAt, 80)
  const createdAtParsed = createdAtRaw ? new Date(createdAtRaw) : null
  const createdAt =
    createdAtParsed && Number.isFinite(createdAtParsed.getTime())
      ? createdAtParsed.toISOString()
      : new Date().toISOString()

  return {
    orderId,
    orderNumber:
      typeof raw.orderNumber === "number" && Number.isFinite(raw.orderNumber)
        ? raw.orderNumber
        : null,
    createdAt,
    customerName: sanitizeText(raw.customerName ?? null, 80),
    customerDocument: sanitizeText(raw.customerDocument ?? null, 32) ?? undefined,
    items,
    paymentMethod: sanitizeText(raw.paymentMethod, 64) ?? "Não informado",
    subtotal: normalizedSubtotal,
    discounts: normalizedDiscounts,
    total: normalizedTotal,
    storeSlug: sanitizeText(raw.storeSlug ?? null, 120) ?? undefined,
    storeName: sanitizeText(raw.storeName, 120) ?? "Autoatendimento",
    storeLegalName: sanitizeText(raw.storeLegalName ?? null, 120) ?? undefined,
    storeAddress: sanitizeText(raw.storeAddress ?? null, 180) ?? undefined,
    storeTaxId: sanitizeText(raw.storeTaxId ?? null, 32) ?? "51.397.705/0001-25",
    storePhone: sanitizeText(raw.storePhone ?? null, 32) ?? "(51) 995881730",
    storeLogoPath: sanitizeText(raw.storeLogoPath ?? null, 300) ?? undefined,
    authorizationCode: sanitizeText(raw.authorizationCode ?? null, 80) ?? undefined,
    accessKey: sanitizeText(raw.accessKey ?? null, 120) ?? undefined,
    additionalMessage: sanitizeText(raw.additionalMessage ?? null, 240) ?? undefined,
  }
}

export interface ReceiptPrintPayload {
  type: "receipt"
  orderId: string
  requestedAt: string
  receipt: ReceiptData
  escposTemplate: EscPosTemplate
}

export function buildReceiptPrintPayload(input: {
  orderId: string
  receipt: unknown
}): ReceiptPrintPayload | null {
  const orderId = sanitizeString(input.orderId)
  if (!orderId) return null

  const receipt = sanitizeReceiptData(input.receipt, orderId)
  if (!receipt) return null

  return {
    type: "receipt",
    orderId,
    requestedAt: new Date().toISOString(),
    receipt,
    escposTemplate: buildEscPosTemplate(receipt),
  }
}

function buildEscPosTemplate(receipt: ReceiptData): EscPosTemplate {
  const lines: EscPosTemplateLine[] = []

  const push = (line: EscPosTemplateLine | null) => {
    if (!line) return
    if (lines.length >= MAX_TEMPLATE_LINES) return
    lines.push(line)
  }

  const formattedOrder = formatOrderNumber(receipt.orderNumber)
  const createdAt = formatReceiptDateTime(receipt.createdAt)
  const customerCpf = formatCustomerCpf(receipt.customerDocument)
  const storeName = sanitizeText(receipt.storeName, 120) ?? "Autoatendimento"
  const storeLegalName = sanitizeText(receipt.storeLegalName, 120)
  const storeTaxId = sanitizeText(receipt.storeTaxId, 32)
  const storePhone = sanitizeText(receipt.storePhone, 32)
  const paymentMethod = sanitizeText(receipt.paymentMethod, 64) ?? "Nao informado"
  const authorizationCode = sanitizeText(receipt.authorizationCode, 80)
  const accessKey = sanitizeText(receipt.accessKey, 120)
  const additionalMessage = sanitizeText(receipt.additionalMessage, 240)

  push({ separator: "major" })
  push({
    text: storeLegalName ?? storeName,
    align: "center",
    bold: true,
  })
  if (storeLegalName && storeLegalName !== storeName) {
    push({
      text: storeName,
      align: "center",
    })
  }
  if (storeTaxId) {
    push({
      text: `CNPJ: ${storeTaxId}`,
      align: "center",
    })
  }
  if (storePhone) {
    push({
      text: `Tel: ${storePhone}`,
      align: "center",
    })
  }
  push({ separator: "major" })

  push({ text: "Comprovante de Compra" })
  push({ empty: true })
  push({ text: `Pedido: ${formattedOrder}` })
  push({ text: `Data: ${createdAt.date}` })
  push({ text: `Hora: ${createdAt.time}` })
  push({ text: `Cliente: ${customerCpf}` })
  push({ separator: "minor" })
  push({ text: "Itens" })
  push({ separator: "minor" })

  const items = Array.isArray(receipt.items) ? receipt.items : []
  items.forEach((item) => {
    const itemName = sanitizeText(item?.name, MAX_ITEM_NAME) ?? "Item"
    const quantity = Math.max(1, Math.floor(sanitizeNumber(item?.quantity, 1)))
    const unitPrice = Math.max(0, sanitizeNumber(item?.unitPrice, 0))
    const lineTotal = quantity * unitPrice

    push({
      text: `${itemName} x${quantity} - ${formatMoney(lineTotal)}`,
    })
  })

  push({ separator: "minor" })
  push({ text: `Subtotal: ${formatMoney(receipt.subtotal)}` })
  push({ text: `Desconto: ${formatMoney(receipt.discounts ?? 0)}` })
  push({ text: `Total Pago: ${formatMoney(receipt.total)}`, bold: true })
  push({ separator: "minor" })
  push({ text: "Forma de pagamento:" })
  push({ text: paymentMethod })
  push({ empty: true })
  push({ text: "Status:" })
  push({ text: "PAGAMENTO APROVADO", bold: true })

  if (authorizationCode) {
    push({ empty: true })
    push({ text: `Autorizacao: ${authorizationCode}` })
  }

  if (accessKey) {
    push({ text: `Chave: ${accessKey}` })
  }

  if (additionalMessage) {
    push({ empty: true })
    push({ text: additionalMessage })
  }

  push({ separator: "minor" })
  push({ text: "Obrigado pela preferencia!", align: "center" })
  push({ text: "Mr Smart", align: "center" })
  push({ separator: "major" })

  return {
    lines: lines
      .map(normalizeTemplateLine)
      .filter((line): line is EscPosTemplateLine => line !== null)
      .slice(0, MAX_TEMPLATE_LINES),
  }
}

function normalizeTemplateLine(line: EscPosTemplateLine): EscPosTemplateLine | null {
  if (typeof line === "string") {
    const text = sanitizeText(line, MAX_TEMPLATE_LINE_TEXT)
    return text ?? null
  }

  if (line.separator === "major" || line.separator === "minor") {
    return { separator: line.separator }
  }

  if (line.empty === true) {
    return { empty: true }
  }

  const text = sanitizeText(line.text, MAX_TEMPLATE_LINE_TEXT)
  if (!text) return null

  const normalized: EscPosTemplateLineObject = {
    text,
  }

  if (line.align === "left" || line.align === "center" || line.align === "right") {
    normalized.align = line.align
  }
  if (line.bold === true) {
    normalized.bold = true
  }
  if (typeof line.blankLinesAfter === "number" && Number.isFinite(line.blankLinesAfter)) {
    normalized.blankLinesAfter = Math.max(0, Math.min(6, Math.floor(line.blankLinesAfter)))
  }

  return normalized
}

function formatMoney(value: number): string {
  const amount = sanitizeNumber(value, 0)
  return `R$ ${amount.toFixed(2).replace(".", ",")}`
}

function formatOrderNumber(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return "-"
  }
  return `#${Math.floor(value).toString().padStart(8, "0")}`
}

function formatReceiptDateTime(createdAt: string): { date: string; time: string } {
  const parsed = new Date(createdAt)
  const safeDate = Number.isFinite(parsed.getTime()) ? parsed : new Date()
  const asBrazil = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(safeDate)

  const date = `${getDatePart(asBrazil, "day")}/${getDatePart(asBrazil, "month")}/${getDatePart(asBrazil, "year")}`
  const time = `${getDatePart(asBrazil, "hour")}:${getDatePart(asBrazil, "minute")}:${getDatePart(asBrazil, "second")}`

  return { date, time }
}

function getDatePart(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): string {
  return parts.find((part) => part.type === type)?.value ?? "00"
}
