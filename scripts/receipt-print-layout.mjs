const FIXED_BUSINESS_NAME = "MR SMART"
const FIXED_CNPJ = "51.397.705/0001-25"
const FIXED_PHONE = "(51) 995881730"
const FIXED_PAYMENT_STATUS = "PAGAMENTO APROVADO"

function supportsAccent(profile) {
  const normalized = String(profile || "").toLowerCase()
  return normalized.includes("bematech")
}

function getPaperProfile(paperWidthMm, escposProfile) {
  const mm = Number.isFinite(paperWidthMm) ? Number(paperWidthMm) : 80
  const useWideLayout = supportsAccent(escposProfile)
  const width = mm <= 58 ? 32 : useWideLayout ? 48 : 42
  const compact = width <= 32
  const qtyWidth = compact ? 3 : 4
  const totalWidth = compact ? 8 : 10
  const descWidth = Math.max(8, width - qtyWidth - totalWidth - 2)

  return {
    width,
    compact,
    majorSeparator: "=".repeat(width),
    minorSeparator: "-".repeat(width),
    itemColumns: {
      qty: qtyWidth,
      desc: descWidth,
      total: totalWidth,
    },
  }
}

function normalizePrintableText(value, preserveAccents) {
  const text = String(value ?? "")
    .replace(/\r/g, "")
    .replace(/\t/g, " ")
    .replace(/\u00a0/g, " ")
    .replace(/[\x00-\x08\x0B-\x1F\x7F]/g, "")

  if (preserveAccents) {
    return text.replace(/[^\x20-\xFF\n]/g, "?")
  }

  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E\n]/g, "?")
}

function formatMoney(value) {
  const amount = typeof value === "number" && Number.isFinite(value) ? value : 0
  const absolute = Math.abs(amount)
  const formatted = absolute.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return `${amount < 0 ? "-" : ""}R$ ${formatted}`
}

function formatMoneyCompact(value) {
  const amount = typeof value === "number" && Number.isFinite(value) ? value : 0
  const absolute = Math.abs(amount)
  const formatted = absolute.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return `${amount < 0 ? "-" : ""}${formatted}`
}

function formatOrderNumber(orderNumber) {
  if (typeof orderNumber !== "number" || !Number.isFinite(orderNumber)) return null
  const normalized = Math.trunc(orderNumber)
  if (normalized < 0) return null
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
    second: "2-digit",
    hour12: false,
  })

  return `${datePart} ${timePart}`
}

function splitReceiptDateTime(dateTime) {
  const text = String(dateTime || "")
  const match = text.match(/^(\d{2}\/\d{2}\/\d{4})\s+(\d{2}:\d{2}:\d{2})$/)
  if (!match) return { date: "--/--/----", time: "--:--:--" }
  return { date: match[1], time: match[2] }
}

function formatCustomerCpf(value) {
  const raw = String(value ?? "").trim()
  const digits = raw.replace(/\D/g, "")
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}.***.***-${digits.slice(9)}`
  }

  return raw || "CPF nao informado"
}

function formatCustomerName(value) {
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

function escInit() {
  return Buffer.from([0x1b, 0x40])
}

function escCodePage(profile) {
  if (supportsAccent(profile)) {
    return Buffer.from([0x1b, 0x74, 0x02])
  }
  return null
}

function escAlign(mode) {
  const n = mode === "center" ? 1 : mode === "right" ? 2 : 0
  return Buffer.from([0x1b, 0x61, n])
}

function escBold(enabled) {
  return Buffer.from([0x1b, 0x45, enabled ? 1 : 0])
}

function escCutPartial() {
  return Buffer.from([0x1d, 0x56, 0x42, 0x00])
}

function textLine(value, options) {
  const text = normalizePrintableText(value ?? "", options.preserveAccents)
  return Buffer.from(`${text}\n`, options.preserveAccents ? "latin1" : "ascii")
}

function separatorLine(value, options) {
  return textLine(value, options)
}

function truncateText(value, width) {
  const raw = String(value ?? "")
  if (width <= 0) return ""
  if (raw.length <= width) return raw
  if (width === 1) return raw.slice(0, 1)
  return `${raw.slice(0, width - 1)}~`
}

function wrapText(value, width) {
  const clean = String(value ?? "").trim()
  if (!clean) return [""]
  if (width <= 0) return [""]

  const words = clean.split(/\s+/)
  const lines = []
  let current = ""

  for (const word of words) {
    if (!current) {
      if (word.length <= width) {
        current = word
      } else {
        let remainder = word
        while (remainder.length > width) {
          lines.push(remainder.slice(0, width))
          remainder = remainder.slice(width)
        }
        current = remainder
      }
      continue
    }

    const next = `${current} ${word}`
    if (next.length <= width) {
      current = next
      continue
    }

    lines.push(current)
    if (word.length <= width) {
      current = word
      continue
    }

    let remainder = word
    while (remainder.length > width) {
      lines.push(remainder.slice(0, width))
      remainder = remainder.slice(width)
    }
    current = remainder
  }

  if (current) lines.push(current)
  return lines.length > 0 ? lines : [""]
}

function alignLeftRight(left, right, width) {
  const l = String(left ?? "")
  const r = String(right ?? "")
  const space = width - l.length - r.length
  if (space >= 1) {
    return `${l}${" ".repeat(space)}${r}`
  }
  if (width <= r.length) {
    return r.slice(r.length - width)
  }
  const allowedLeft = Math.max(1, width - r.length - 1)
  return `${truncateText(l, allowedLeft)} ${r}`
}

function fitLeft(value, width) {
  const text = truncateText(value, width)
  return text.padEnd(width, " ")
}

function fitRight(value, width) {
  const text = String(value ?? "")
  if (text.length >= width) return text.slice(text.length - width)
  return text.padStart(width, " ")
}

function renderHeader(parts, profile, options) {
  parts.push(escAlign("left"))
  parts.push(separatorLine(profile.majorSeparator, options))

  parts.push(escAlign("center"))
  parts.push(escBold(true))
  parts.push(textLine(FIXED_BUSINESS_NAME, options))
  parts.push(escBold(false))
  parts.push(textLine(`CNPJ: ${FIXED_CNPJ}`, options))
  parts.push(textLine(`Tel: ${FIXED_PHONE}`, options))

  parts.push(escAlign("left"))
  parts.push(separatorLine(profile.majorSeparator, options))
}

function formatItemRow(values, profile) {
  const { qty, desc, total } = profile.itemColumns
  return `${fitLeft(values.desc, desc)} ${fitRight(values.qty, qty)} ${fitRight(values.total, total)}`
}

function renderReceiptIdentity(parts, receipt, profile, options) {
  const formattedOrderNumber = formatOrderNumberOrFallback(receipt.orderNumber, "-")
  const orderLine =
    formattedOrderNumber === "-"
      ? "Pedido: -"
      : `Pedido: #${formattedOrderNumber}`

  const { date, time } = splitReceiptDateTime(formatReceiptDateTime(receipt.createdAt))

  parts.push(textLine("Comprovante de Compra", options))
  parts.push(textLine("", options))
  parts.push(textLine(orderLine, options))
  parts.push(textLine(`Data: ${date}`, options))
  parts.push(textLine(`Hora: ${time}`, options))
  parts.push(textLine(`Cliente: ${formatCustomerName(receipt.customerName)}`, options))
  parts.push(textLine(`CPF: ${formatCustomerCpf(receipt.customerDocument)}`, options))
  parts.push(textLine("", options))

  parts.push(separatorLine(profile.minorSeparator, options))
  parts.push(
    textLine(
      formatItemRow({ desc: "ITEM", qty: "QTD", total: "TOTAL" }, profile),
      options,
    ),
  )
  parts.push(separatorLine(profile.minorSeparator, options))
}

function renderItemsTable(parts, receipt, profile, options) {
  const items = Array.isArray(receipt.items) ? receipt.items : []
  const hasItems = items.length > 0

  if (!hasItems) {
    parts.push(textLine("Sem itens para exibir.", options))
    parts.push(separatorLine(profile.minorSeparator, options))
    return
  }

  for (const item of items) {
    const quantity =
      typeof item?.quantity === "number" && Number.isFinite(item.quantity)
        ? Math.max(1, Math.floor(item.quantity))
        : 1
    const unitPrice =
      typeof item?.unitPrice === "number" && Number.isFinite(item.unitPrice)
        ? Math.max(0, item.unitPrice)
        : 0
    const itemTotal = quantity * unitPrice
    const itemName = String(item?.name || "Item")
    const descLines = wrapText(itemName, profile.itemColumns.desc)

    parts.push(
      textLine(
        formatItemRow(
          {
            desc: descLines[0] || "",
            qty: String(quantity),
            total: formatMoneyCompact(itemTotal),
          },
          profile,
        ),
        options,
      ),
    )

    for (const continuation of descLines.slice(1)) {
      parts.push(
        textLine(
          formatItemRow(
            {
              desc: continuation,
              qty: "",
              total: "",
            },
            profile,
          ),
          options,
        ),
      )
    }
  }

  parts.push(separatorLine(profile.minorSeparator, options))
}

function resolveTotals(receipt) {
  const itemsTotal = Array.isArray(receipt.items)
    ? receipt.items.reduce((sum, item) => {
      const quantity =
        typeof item?.quantity === "number" && Number.isFinite(item.quantity)
          ? Math.max(1, item.quantity)
          : 1
      const unitPrice =
        typeof item?.unitPrice === "number" && Number.isFinite(item.unitPrice)
          ? Math.max(0, item.unitPrice)
          : 0
      return sum + quantity * unitPrice
    }, 0)
    : 0

  const subtotal =
    typeof receipt.subtotal === "number" && Number.isFinite(receipt.subtotal)
      ? Math.max(0, receipt.subtotal)
      : itemsTotal
  const discounts =
    typeof receipt.discounts === "number" && Number.isFinite(receipt.discounts)
      ? Math.max(0, receipt.discounts)
      : 0
  const total =
    typeof receipt.total === "number" && Number.isFinite(receipt.total)
      ? Math.max(0, receipt.total)
      : Math.max(0, subtotal - discounts)

  return { subtotal, discounts, total }
}

function renderTotals(parts, receipt, profile, options) {
  const totals = resolveTotals(receipt)

  parts.push(textLine(alignLeftRight("Subtotal:", formatMoney(totals.subtotal), profile.width), options))
  parts.push(textLine(alignLeftRight("Desconto:", formatMoney(totals.discounts), profile.width), options))
  parts.push(textLine(alignLeftRight("Total Pago:", formatMoney(totals.total), profile.width), options))
  parts.push(separatorLine(profile.minorSeparator, options))
}

function renderPaymentAndStatus(parts, receipt, profile, options) {
  const paymentMethod = String(receipt.paymentMethod || "Nao informado").trim() || "Nao informado"

  parts.push(textLine("Forma de pagamento:", options))
  parts.push(textLine(paymentMethod, options))
  parts.push(textLine("", options))
  parts.push(textLine("Status:", options))
  parts.push(textLine(FIXED_PAYMENT_STATUS, options))
  parts.push(textLine("", options))
  parts.push(separatorLine(profile.minorSeparator, options))
}

function renderFooter(parts, profile, options) {
  parts.push(escAlign("center"))
  parts.push(textLine("Obrigado pela preferencia!", options))
  parts.push(textLine("Mr Smart", options))

  parts.push(escAlign("left"))
  parts.push(separatorLine(profile.majorSeparator, options))
}

export function buildReceiptBytes(payload, printer) {
  const receipt = payload?.receipt ?? {}
  const profile = getPaperProfile(printer?.paperWidthMm ?? 80, printer?.escposProfile)
  const preserveAccents = supportsAccent(printer?.escposProfile)
  const options = { preserveAccents }
  const parts = []

  parts.push(escInit())
  const codePage = escCodePage(printer?.escposProfile)
  if (codePage) parts.push(codePage)

  renderHeader(parts, profile, options)
  renderReceiptIdentity(parts, receipt, profile, options)
  renderItemsTable(parts, receipt, profile, options)
  renderTotals(parts, receipt, profile, options)
  renderPaymentAndStatus(parts, receipt, profile, options)
  renderFooter(parts, profile, options)

  parts.push(escCutPartial())
  return Buffer.concat(parts)
}
