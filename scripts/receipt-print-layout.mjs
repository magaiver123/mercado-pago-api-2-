const FIXED_BUSINESS_NAME = "Mr Smart Autoatendimento"
const FIXED_CNPJ = "51.397.705/0001-25"
const FIXED_PHONE = "51995881730"

function supportsAccent(profile) {
  const normalized = String(profile || "").toLowerCase()
  return normalized.includes("bematech")
}

function getPaperProfile(paperWidthMm) {
  const mm = Number.isFinite(paperWidthMm) ? Number(paperWidthMm) : 80
  const width = mm <= 58 ? 32 : 48
  const compact = width <= 32
  const qtyWidth = compact ? 3 : 4
  const unitWidth = compact ? 7 : 10
  const totalWidth = compact ? 8 : 10
  const descWidth = Math.max(8, width - qtyWidth - unitWidth - totalWidth - 3)

  return {
    width,
    compact,
    majorSeparator: "=".repeat(width),
    minorSeparator: "-".repeat(width),
    itemColumns: {
      qty: qtyWidth,
      desc: descWidth,
      unit: unitWidth,
      total: totalWidth,
    },
  }
}

function normalizePrintableText(value, preserveAccents) {
  const text = String(value ?? "")
    .replace(/\r/g, "")
    .replace(/\t/g, " ")
    .replace(/\u00a0/g, " ")
    .replace(/[‐‑‒–—]/g, "-")
    .replace(/[“”«»]/g, "\"")
    .replace(/[‘’]/g, "'")
    .replace(/…/g, "...")
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
    hour12: false,
  })

  return `${datePart} ${timePart}`
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

function escTextSize(width = 1, height = 1) {
  const normalizedWidth = Math.min(8, Math.max(1, Math.trunc(width))) - 1
  const normalizedHeight = Math.min(8, Math.max(1, Math.trunc(height))) - 1
  const n = (normalizedWidth << 4) | normalizedHeight
  return Buffer.from([0x1d, 0x21, n])
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

function renderLabelValue(parts, label, value, profile, options) {
  const cleanValue = String(value ?? "").trim()
  if (!cleanValue) return

  const prefix = `${label}: `
  const firstLineWidth = profile.width - prefix.length
  if (firstLineWidth < 8) {
    for (const line of wrapText(`${prefix}${cleanValue}`, profile.width)) {
      parts.push(textLine(line, options))
    }
    return
  }

  const wrapped = wrapText(cleanValue, firstLineWidth)
  parts.push(textLine(`${prefix}${wrapped[0]}`, options))
  for (const line of wrapped.slice(1)) {
    parts.push(textLine(`  ${line}`, options))
  }
}

function renderHeader(parts, receipt, profile, options) {
  const slug = String(receipt.storeSlug || receipt.storeName || "loja").trim() || "loja"
  const legalName = String(receipt.storeLegalName || "").trim()
  const address = String(receipt.storeAddress || "").trim()

  parts.push(escAlign("center"))
  for (const line of wrapText(slug, profile.width)) {
    parts.push(textLine(line, options))
  }

  const titleWidth = profile.compact ? profile.width : Math.max(12, Math.floor(profile.width / 2))
  parts.push(escBold(true))
  parts.push(escTextSize(profile.compact ? 1 : 2, 2))
  for (const line of wrapText(FIXED_BUSINESS_NAME, titleWidth)) {
    parts.push(textLine(line, options))
  }
  parts.push(escTextSize(1, 1))
  parts.push(escBold(false))

  parts.push(textLine(`CNPJ: ${FIXED_CNPJ}`, options))
  parts.push(textLine(`Telefone: ${FIXED_PHONE}`, options))

  parts.push(escAlign("left"))
  if (legalName) renderLabelValue(parts, "Razao Social", legalName, profile, options)
  if (address) renderLabelValue(parts, "Endereco", address, profile, options)
}

function renderReceiptIdentity(parts, receipt, payload, profile, options) {
  const orderDisplayNumber = formatOrderNumberOrFallback(
    receipt.orderNumber,
    receipt.orderId || payload?.orderId || "-",
  )

  parts.push(separatorLine(profile.majorSeparator, options))
  parts.push(escAlign("center"))
  parts.push(escBold(true))
  parts.push(textLine("COMPROVANTE DE COMPRA", options))
  parts.push(escBold(false))
  parts.push(separatorLine(profile.minorSeparator, options))

  parts.push(escAlign("left"))
  parts.push(textLine(alignLeftRight("Pedido", orderDisplayNumber, profile.width), options))
  parts.push(textLine(alignLeftRight("Data/Hora", formatReceiptDateTime(receipt.createdAt), profile.width), options))
  renderLabelValue(parts, "Pagamento", receipt.paymentMethod || "Nao informado", profile, options)

  if (receipt.customerName) {
    renderLabelValue(parts, "Cliente", receipt.customerName, profile, options)
  }

  if (receipt.customerDocument) {
    renderLabelValue(parts, "CPF/CNPJ", receipt.customerDocument, profile, options)
  }
}

function formatItemRow(values, profile) {
  const { qty, desc, unit, total } = profile.itemColumns
  return `${fitRight(values.qty, qty)} ${fitLeft(values.desc, desc)} ${fitRight(values.unit, unit)} ${fitRight(values.total, total)}`
}

function renderItemsTable(parts, receipt, profile, options) {
  const items = Array.isArray(receipt.items) ? receipt.items : []
  const hasItems = items.length > 0

  parts.push(separatorLine(profile.majorSeparator, options))
  parts.push(escBold(true))
  parts.push(textLine("ITENS", options))
  parts.push(escBold(false))
  parts.push(separatorLine(profile.minorSeparator, options))
  parts.push(
    textLine(
      formatItemRow({ qty: "QTD", desc: "DESCRICAO", unit: "UN", total: "TOTAL" }, profile),
      options,
    ),
  )
  parts.push(separatorLine(profile.minorSeparator, options))

  if (!hasItems) {
    parts.push(textLine("Sem itens para exibir.", options))
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
            qty: String(quantity),
            desc: descLines[0] || "",
            unit: formatMoneyCompact(unitPrice),
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
              qty: "",
              desc: continuation,
              unit: "",
              total: "",
            },
            profile,
          ),
          options,
        ),
      )
    }
  }
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

  parts.push(separatorLine(profile.majorSeparator, options))
  parts.push(textLine(alignLeftRight("Subtotal", formatMoney(totals.subtotal), profile.width), options))
  parts.push(textLine(alignLeftRight("Descontos", `- ${formatMoney(totals.discounts)}`, profile.width), options))
  parts.push(separatorLine(profile.minorSeparator, options))
  parts.push(escBold(true))
  parts.push(escTextSize(1, 2))
  parts.push(textLine(alignLeftRight("TOTAL FINAL", formatMoney(totals.total), profile.width), options))
  parts.push(escTextSize(1, 1))
  parts.push(escBold(false))
}

function renderOptionalMeta(parts, receipt, profile, options) {
  const authCode = String(receipt.authorizationCode || "").trim()
  const accessKey = String(receipt.accessKey || "").trim()
  const message = String(receipt.additionalMessage || "").trim()

  if (!authCode && !accessKey && !message) return

  parts.push(separatorLine(profile.majorSeparator, options))
  parts.push(escBold(true))
  parts.push(textLine("DADOS ADICIONAIS", options))
  parts.push(escBold(false))

  if (authCode) renderLabelValue(parts, "Autorizacao", authCode, profile, options)
  if (accessKey) renderLabelValue(parts, "Chave", accessKey, profile, options)
  if (message) renderLabelValue(parts, "Obs", message, profile, options)
}

function renderFooter(parts, profile, options) {
  parts.push(separatorLine(profile.majorSeparator, options))
  parts.push(escAlign("center"))
  parts.push(escBold(true))
  parts.push(textLine("COMPRA FINALIZADA", options))
  parts.push(escBold(false))
  parts.push(textLine("Guarde este comprovante.", options))
  parts.push(textLine("Obrigado pela preferencia!", options))
  parts.push(textLine("", options))
  parts.push(textLine("", options))
}

export function buildReceiptBytes(payload, printer) {
  const receipt = payload?.receipt ?? {}
  const profile = getPaperProfile(printer?.paperWidthMm ?? 80)
  const preserveAccents = supportsAccent(printer?.escposProfile)
  const options = { preserveAccents }
  const parts = []

  parts.push(escInit())
  const codePage = escCodePage(printer?.escposProfile)
  if (codePage) parts.push(codePage)

  renderHeader(parts, receipt, profile, options)
  renderReceiptIdentity(parts, receipt, payload, profile, options)
  renderItemsTable(parts, receipt, profile, options)
  renderTotals(parts, receipt, profile, options)
  renderOptionalMeta(parts, receipt, profile, options)
  renderFooter(parts, profile, options)

  parts.push(escCutPartial())
  return Buffer.concat(parts)
}
