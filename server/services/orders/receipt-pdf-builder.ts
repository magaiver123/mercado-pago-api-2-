import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib"
import { ReceiptPrintPayload } from "@/api/services/printing/receipt-print-payload"

const RECEIPT_WIDTH_PT = 226.77 // 80mm em pontos
const RECEIPT_MARGIN_PT = 14
const FONT_SIZE = 8.6
const LINE_HEIGHT = 11.2
const EXTRA_LINE_HEIGHT = 4
const MIN_HEIGHT = 280
const MAX_TEMPLATE_LINE_WIDTH = 42

type TemplateLineObject = {
  text?: string
  align?: "left" | "center" | "right"
  bold?: boolean
  separator?: "major" | "minor"
  empty?: boolean
  blankLinesAfter?: number
}

type RenderLine = {
  text: string
  align: "left" | "center" | "right"
  bold: boolean
  extraSpaceAfter: number
}

function repeat(char: string, size: number) {
  return char.repeat(Math.max(1, size))
}

function toTemplateLines(payload: ReceiptPrintPayload): Array<string | TemplateLineObject> {
  const raw = payload.escposTemplate?.lines
  if (!Array.isArray(raw)) return []
  return raw as Array<string | TemplateLineObject>
}

function normalizeRenderLines(payload: ReceiptPrintPayload): RenderLine[] {
  const lines = toTemplateLines(payload)
  const normalized: RenderLine[] = []

  for (const line of lines) {
    if (typeof line === "string") {
      if (line.trim()) {
        normalized.push({
          text: line,
          align: "left",
          bold: false,
          extraSpaceAfter: 0,
        })
      } else {
        normalized.push({
          text: "",
          align: "left",
          bold: false,
          extraSpaceAfter: EXTRA_LINE_HEIGHT,
        })
      }
      continue
    }

    if (!line || typeof line !== "object") continue

    if (line.separator === "major") {
      normalized.push({
        text: repeat("=", MAX_TEMPLATE_LINE_WIDTH),
        align: "left",
        bold: false,
        extraSpaceAfter: 0,
      })
      continue
    }

    if (line.separator === "minor") {
      normalized.push({
        text: repeat("-", MAX_TEMPLATE_LINE_WIDTH),
        align: "left",
        bold: false,
        extraSpaceAfter: 0,
      })
      continue
    }

    if (line.empty === true) {
      normalized.push({
        text: "",
        align: "left",
        bold: false,
        extraSpaceAfter: EXTRA_LINE_HEIGHT,
      })
      continue
    }

    if (typeof line.text !== "string") continue
    const text = line.text.trimEnd()
    if (!text) continue

    const align =
      line.align === "center" || line.align === "right" || line.align === "left"
        ? line.align
        : "left"
    const blankLinesAfter =
      typeof line.blankLinesAfter === "number" && Number.isFinite(line.blankLinesAfter)
        ? Math.max(0, Math.min(4, Math.floor(line.blankLinesAfter)))
        : 0

    normalized.push({
      text,
      align,
      bold: line.bold === true,
      extraSpaceAfter: blankLinesAfter * EXTRA_LINE_HEIGHT,
    })
  }

  return normalized
}

function measureContentHeight(lines: RenderLine[]) {
  const rawHeight = lines.reduce((sum, line) => sum + LINE_HEIGHT + line.extraSpaceAfter, 0)
  return Math.max(MIN_HEIGHT, rawHeight + RECEIPT_MARGIN_PT * 2)
}

function getXByAlign(font: PDFFont, text: string, align: "left" | "center" | "right") {
  const contentWidth = RECEIPT_WIDTH_PT - RECEIPT_MARGIN_PT * 2
  const textWidth = font.widthOfTextAtSize(text, FONT_SIZE)

  if (align === "center") {
    return RECEIPT_MARGIN_PT + Math.max(0, (contentWidth - textWidth) / 2)
  }

  if (align === "right") {
    return RECEIPT_MARGIN_PT + Math.max(0, contentWidth - textWidth)
  }

  return RECEIPT_MARGIN_PT
}

export async function buildReceiptPdfBuffer(payload: ReceiptPrintPayload): Promise<Buffer> {
  const lines = normalizeRenderLines(payload)
  const height = measureContentHeight(lines)

  const doc = await PDFDocument.create()
  const fontRegular = await doc.embedFont(StandardFonts.Courier)
  const fontBold = await doc.embedFont(StandardFonts.CourierBold)
  const page = doc.addPage([RECEIPT_WIDTH_PT, height])

  let y = height - RECEIPT_MARGIN_PT - FONT_SIZE

  for (const line of lines) {
    if (line.text === "") {
      y -= LINE_HEIGHT + line.extraSpaceAfter
      continue
    }

    const font = line.bold ? fontBold : fontRegular
    const x = getXByAlign(font, line.text, line.align)

    page.drawText(line.text, {
      x,
      y,
      font,
      size: FONT_SIZE,
      color: rgb(0, 0, 0),
    })

    y -= LINE_HEIGHT + line.extraSpaceAfter

    // Evita desenhar fora da página caso venham linhas demais no payload.
    if (y < RECEIPT_MARGIN_PT) {
      break
    }
  }

  const bytes = await doc.save()
  return Buffer.from(bytes)
}

