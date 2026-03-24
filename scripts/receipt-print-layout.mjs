function toAscii(value) {
  const text = String(value ?? "")
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E\n]/g, "?")
}

function formatCurrency(value) {
  const amount = typeof value === "number" && Number.isFinite(value) ? value : 0
  return `R$ ${amount.toFixed(2).replace(".", ",")}`
}

function formatOrderNumber(orderNumber) {
  if (typeof orderNumber !== "number" || !Number.isFinite(orderNumber)) {
    return null
  }

  const normalized = Math.trunc(orderNumber)
  if (normalized < 0) {
    return null
  }

  return String(normalized).padStart(8, "0")
}

export function formatOrderNumberOrFallback(orderNumber, fallback) {
  return formatOrderNumber(orderNumber) ?? String(fallback ?? "-")
}

export function formatReceiptDateTime(value) {
  const parsed = new Date(value ?? "")
  const date = Number.isNaN(parsed.getTime()) ? new Date() : parsed
  const datePart = date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
  const timePart = date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })

  return `${datePart} ${timePart}`
}

function isMp4200FamilyPrinter(printer) {
  const model = String(printer?.model || "").toLowerCase()
  const profile = String(printer?.escposProfile || "").toLowerCase()
  const probe = `${model} ${profile}`
  const compactProbe = probe.replace(/[^a-z0-9]/g, "")
  return (
    compactProbe.includes("mp4200") ||
    compactProbe.includes("4200th") ||
    probe.includes("mp-4200") ||
    probe.includes("mp 4200")
  )
}

function escInit() {
  return Buffer.from([0x1b, 0x40])
}

function escSelectEscPosModeTemporary() {
  // GS F9 20 01: switch to ESC/POS without saving to printer memory (MP-4200 TH manual).
  return Buffer.from([0x1d, 0xf9, 0x20, 0x01])
}

function escAlign(mode) {
  const n = mode === "center" ? 1 : mode === "right" ? 2 : 0
  return Buffer.from([0x1b, 0x61, n])
}

function escBold(enabled) {
  return Buffer.from([0x1b, 0x45, enabled ? 1 : 0])
}

function escTextSize(width = 1, height = 1) {
  const normalizedWidth = Math.min(8, Math.max(1, Math.trunc(width))) - 1
  const normalizedHeight = Math.min(8, Math.max(1, Math.trunc(height))) - 1
  const n = (normalizedWidth << 4) | normalizedHeight
  return Buffer.from([0x1d, 0x21, n])
}

function escFeedLines(lines = 3) {
  const normalized = Math.max(0, Math.min(10, Math.trunc(lines)))
  return Buffer.from([0x1b, 0x64, normalized])
}

function normalizeCutMode(value) {
  return String(value || "").toLowerCase() === "partial" ? "partial" : "full"
}

function escCut(mode = "full") {
  if (mode === "partial") {
    return Buffer.from([0x1d, 0x56, 0x01])
  }
  return Buffer.from([0x1d, 0x56, 0x00])
}

function escCutAndFeed(lines = 3) {
  // GS V 66 n: feed and cut, useful on MP-4200 TH firmware revisions.
  const normalized = Math.max(0, Math.min(10, Math.trunc(lines)))
  return Buffer.from([0x1d, 0x56, 0x42, normalized])
}

function textLine(value = "") {
  return Buffer.from(`${toAscii(value)}\n`, "ascii")
}

function separatorLine() {
  return textLine("------------------------------------------")
}

function normalizeStoreAddress(receipt) {
  const rawAddress = String(receipt?.storeAddress ?? "").trim()
  if (rawAddress.length > 0) {
    return rawAddress
  }

  return "Endereco da loja nao informado"
}

function normalizeStoreTaxId(receipt) {
  const rawTaxId = String(receipt?.storeTaxId ?? "").trim()
  if (rawTaxId.length > 0) {
    return rawTaxId
  }

  return "CNPJ nao informado"
}

function appendFeedAndCut(parts, printer) {
  const cutMode = normalizeCutMode(printer?.cutMode)
  const feedLines = 3

  // Keep legacy visual spacing unchanged.
  parts.push(textLine(""))
  parts.push(textLine(""))
  parts.push(textLine(""))

  // Add explicit feed before cut for operational safety.
  parts.push(escFeedLines(feedLines))

  if (isMp4200FamilyPrinter(printer) && cutMode === "full") {
    parts.push(escCutAndFeed(feedLines))
    return
  }

  parts.push(escCut(cutMode))
}

export function buildReceiptBytes(payload, printer) {
  const receipt = payload?.receipt ?? {}
  const items = Array.isArray(receipt.items) ? receipt.items : []
  const parts = []

  const storeDisplayName = String(
    receipt.storeLegalName || receipt.storeName || "AUTOATENDIMENTO",
  ).trim()
  const orderDisplayNumber = formatOrderNumberOrFallback(
    receipt.orderNumber,
    receipt.orderId || payload?.orderId || "-",
  )

  parts.push(escInit())
  if (isMp4200FamilyPrinter(printer)) {
    parts.push(escSelectEscPosModeTemporary())
  }
  parts.push(escAlign("center"))
  parts.push(escBold(true))
  parts.push(escTextSize(2, 2))
  parts.push(textLine(storeDisplayName))
  parts.push(escTextSize(1, 1))
  parts.push(escBold(false))
  parts.push(textLine(normalizeStoreTaxId(receipt)))
  parts.push(textLine(normalizeStoreAddress(receipt)))
  parts.push(separatorLine())

  parts.push(escAlign("left"))
  parts.push(textLine(`Pedido: ${orderDisplayNumber}`))
  parts.push(textLine(`Data: ${formatReceiptDateTime(receipt.createdAt)}`))
  parts.push(textLine(`Pagamento: ${receipt.paymentMethod || "Nao informado"}`))
  parts.push(separatorLine())

  for (const item of items) {
    const quantity =
      typeof item?.quantity === "number" && Number.isFinite(item.quantity)
        ? item.quantity
        : 1
    const unitPrice =
      typeof item?.unitPrice === "number" && Number.isFinite(item.unitPrice)
        ? item.unitPrice
        : 0
    const lineTotal = quantity * unitPrice
    const name = item?.name || "Item"
    parts.push(textLine(`${quantity}x ${name}`))
    parts.push(textLine(`  Un: ${formatCurrency(unitPrice)}  Total: ${formatCurrency(lineTotal)}`))
  }

  parts.push(separatorLine())
  parts.push(escBold(true))
  parts.push(textLine(`TOTAL: ${formatCurrency(receipt.total)}`))
  parts.push(escBold(false))
  parts.push(textLine(""))

  parts.push(escAlign("center"))
  parts.push(escBold(true))
  parts.push(textLine("Obrigado pela preferencia!"))
  parts.push(escBold(false))

  const additionalMessage = String(receipt.additionalMessage ?? "").trim()
  if (additionalMessage.length > 0 && additionalMessage !== "Obrigado pela preferencia!") {
    parts.push(textLine(additionalMessage))
  }

  appendFeedAndCut(parts, printer)
  return Buffer.concat(parts)
}
