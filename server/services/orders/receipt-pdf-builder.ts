import PDFDocument from "pdfkit"
import { ReceiptPrintPayload } from "@/api/services/printing/receipt-print-payload"

const RECEIPT_WIDTH_PT = 226.77 // 80mm em pontos
const RECEIPT_HEIGHT_PT = 1000
const RECEIPT_MARGIN_PT = 14
const TEMPLATE_LINE_WIDTH = 42

function repeat(char: string, size: number) {
  return char.repeat(Math.max(1, size))
}

export async function buildReceiptPdfBuffer(payload: ReceiptPrintPayload): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    const doc = new PDFDocument({
      size: [RECEIPT_WIDTH_PT, RECEIPT_HEIGHT_PT],
      margins: {
        top: RECEIPT_MARGIN_PT,
        left: RECEIPT_MARGIN_PT,
        right: RECEIPT_MARGIN_PT,
        bottom: RECEIPT_MARGIN_PT,
      },
      info: {
        Title: `Comprovante ${payload.orderId}`,
        Author: "Mr Smart",
        Subject: "Comprovante de compra",
      },
    })

    doc.on("data", (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    })
    doc.on("error", reject)
    doc.on("end", () => {
      resolve(Buffer.concat(chunks))
    })

    doc.font("Courier").fontSize(8.6)

    const lines = Array.isArray(payload.escposTemplate?.lines)
      ? payload.escposTemplate.lines
      : []

    for (const line of lines) {
      if (typeof line === "string") {
        doc.font("Courier").text(line, { align: "left" })
        continue
      }

      if (line?.separator === "major") {
        doc.font("Courier").text(repeat("=", TEMPLATE_LINE_WIDTH), { align: "left" })
        continue
      }

      if (line?.separator === "minor") {
        doc.font("Courier").text(repeat("-", TEMPLATE_LINE_WIDTH), { align: "left" })
        continue
      }

      if (line?.empty === true) {
        doc.moveDown(0.4)
        continue
      }

      if (!line || typeof line.text !== "string" || line.text.trim() === "") {
        continue
      }

      doc.font(line.bold === true ? "Courier-Bold" : "Courier")
      doc.text(line.text, {
        align:
          line.align === "center" || line.align === "right" || line.align === "left"
            ? line.align
            : "left",
      })

      if (typeof line.blankLinesAfter === "number" && Number.isFinite(line.blankLinesAfter)) {
        const blankLinesAfter = Math.max(0, Math.min(4, Math.floor(line.blankLinesAfter)))
        if (blankLinesAfter > 0) {
          doc.moveDown(blankLinesAfter * 0.35)
        }
      }
    }

    doc.end()
  })
}

