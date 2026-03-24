function supportsAccent(profile) {
  const normalized = String(profile || "").toLowerCase()
  return normalized.includes("bematech")
}

function getPaperWidthChars(paperWidthMm) {
  const width = Number.isFinite(paperWidthMm) ? Number(paperWidthMm) : 80
  if (width <= 58) return 32
  return 48
}

function normalizePrintableText(value, preserveAccents) {
  const text = String(value ?? "").replace(/\r/g, "").replace(/\t/g, " ")
  if (preserveAccents) {
    return text.replace(/[^\x20-\xFF\n]/g, "?")
  }

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

function separatorLine(width, options) {
  return textLine("-".repeat(width), options)
}

function truncateText(value, width) {
  const raw = String(value ?? "")
  if (raw.length <= width) return raw
  if (width <= 1) return raw.slice(0, width)
  return `${raw.slice(0, width - 1)}~`
}

function wrapText(value, width) {
  const clean = String(value ?? "").trim()
  if (!clean) return [""]
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

function renderStoreHeader(parts, receipt, width, options) {
  const fantasyName = String(receipt.storeName || receipt.storeLegalName || "AUTOATENDIMENTO").trim()
  const legalName = String(receipt.storeLegalName || "").trim()
  const taxId = String(receipt.storeTaxId || "").trim()
  const address = String(receipt.storeAddress || "").trim()
  const phone = String(receipt.storePhone || "").trim()

  parts.push(escAlign("center"))
  parts.push(escBold(true))
  parts.push(escTextSize(2, 2))
  parts.push(textLine(fantasyName || "AUTOATENDIMENTO", options))
  parts.push(escTextSize(1, 1))
  parts.push(escBold(false))

  if (legalName && legalName !== fantasyName) {
    for (const line of wrapText(legalName, width)) {
      parts.push(textLine(line, options))
    }
  }
  if (taxId) parts.push(textLine(`CNPJ: ${taxId}`, options))
  if (address) {
    for (const line of wrapText(address, width)) {
      parts.push(textLine(line, options))
    }
  }
  if (phone) parts.push(textLine(`Tel: ${phone}`, options))
}

function renderOrderInfo(parts, receipt, payload, width, options) {
  const orderDisplayNumber = formatOrderNumberOrFallback(
    receipt.orderNumber,
    receipt.orderId || payload?.orderId || "-",
  )

  parts.push(separatorLine(width, options))
  parts.push(escAlign("center"))
  parts.push(escBold(true))
  parts.push(textLine("COMPROVANTE DE COMPRA", options))
  parts.push(escBold(false))
  parts.push(separatorLine(width, options))
  parts.push(escAlign("left"))
  parts.push(textLine(`Pedido: ${orderDisplayNumber}`, options))
  parts.push(textLine(`Data/Hora: ${formatReceiptDateTime(receipt.createdAt)}`, options))
  parts.push(textLine(`Pagamento: ${receipt.paymentMethod || "Nao informado"}`, options))

  if (receipt.customerName) {
    for (const line of wrapText(`Cliente: ${receipt.customerName}`, width)) {
      parts.push(textLine(line, options))
    }
  }

  if (receipt.customerDocument) {
    parts.push(textLine(`CPF/CNPJ: ${receipt.customerDocument}`, options))
  }
}

function renderItems(parts, receipt, width, options) {
  const items = Array.isArray(receipt.items) ? receipt.items : []

  parts.push(separatorLine(width, options))
  parts.push(textLine("ITENS", options))
  parts.push(separatorLine(width, options))

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

    for (const line of wrapText(itemName, width)) {
      parts.push(textLine(line, options))
    }

    const qtyUnit = `${quantity} x ${formatCurrency(unitPrice)}`
    const totalValue = formatCurrency(itemTotal)
    parts.push(textLine(alignLeftRight(`  ${qtyUnit}`, totalValue, width), options))
  }
}

function renderTotals(parts, receipt, width, options) {
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

  parts.push(separatorLine(width, options))
  parts.push(textLine(alignLeftRight("Subtotal", formatCurrency(subtotal), width), options))
  parts.push(textLine(alignLeftRight("Descontos", `- ${formatCurrency(discounts)}`, width), options))
  parts.push(escBold(true))
  parts.push(textLine(alignLeftRight("TOTAL", formatCurrency(total), width), options))
  parts.push(escBold(false))
}

function renderExtraInfo(parts, receipt, width, options) {
  const authCode = String(receipt.authorizationCode || "").trim()
  const accessKey = String(receipt.accessKey || "").trim()
  const message = String(receipt.additionalMessage || "").trim()

  if (!authCode && !accessKey && !message) return

  parts.push(separatorLine(width, options))

  if (authCode) {
    for (const line of wrapText(`Autorizacao: ${authCode}`, width)) {
      parts.push(textLine(line, options))
    }
  }
  if (accessKey) {
    for (const line of wrapText(`Chave: ${accessKey}`, width)) {
      parts.push(textLine(line, options))
    }
  }
  if (message) {
    for (const line of wrapText(`Obs: ${message}`, width)) {
      parts.push(textLine(line, options))
    }
  }
}

function renderFooter(parts, width, options) {
  parts.push(separatorLine(width, options))
  parts.push(escAlign("center"))
  parts.push(escBold(true))
  parts.push(textLine("OBRIGADO PELA PREFERENCIA!", options))
  parts.push(escBold(false))
  parts.push(textLine("Retorne sempre.", options))
  parts.push(textLine("", options))
  parts.push(textLine("", options))
}

export function buildReceiptBytes(payload, printer) {
  const receipt = payload?.receipt ?? {}
  const width = getPaperWidthChars(printer?.paperWidthMm ?? 80)
  const preserveAccents = supportsAccent(printer?.escposProfile)
  const options = { preserveAccents }
  const parts = []

  parts.push(escInit())
  const codePage = escCodePage(printer?.escposProfile)
  if (codePage) parts.push(codePage)

  renderStoreHeader(parts, receipt, width, options)
  renderOrderInfo(parts, receipt, payload, width, options)
  renderItems(parts, receipt, width, options)
  renderTotals(parts, receipt, width, options)
  renderExtraInfo(parts, receipt, width, options)
  renderFooter(parts, width, options)

  parts.push(escCutPartial())
  return Buffer.concat(parts)
}
