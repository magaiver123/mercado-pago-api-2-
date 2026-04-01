import assert from "node:assert/strict"
import {
  buildReceiptBytes,
  formatOrderNumberOrFallback,
  formatReceiptDateTime,
} from "./receipt-print-layout.mjs"

function asLatin1(buffer) {
  return buffer.toString("latin1")
}

function stripEscPosCommands(text) {
  return text
    .replace(/\x1b@/g, "")
    .replace(/\x1bt./g, "")
    .replace(/\x1ba./g, "")
    .replace(/\x1bE./g, "")
    .replace(/\x1bd./g, "")
    .replace(/\x1d!./g, "")
    .replace(/\x1dVB./g, "")
    .replace(/\x1dV./g, "")
    .replace(/[^\x20-\x7E\n]/g, "")
}

function toPrintableLines(buffer) {
  return stripEscPosCommands(asLatin1(buffer)).split("\n")
}

function assertNoLineOverflow(lines, maxWidth) {
  for (const line of lines) {
    if (line.length > maxWidth) {
      assert.fail(`line overflow (${line.length} > ${maxWidth}): "${line}"`)
    }
  }
}

assert.equal(formatOrderNumberOrFallback(123, "-"), "00000123")
assert.equal(formatOrderNumberOrFallback(null, "-"), "-")

const formattedDate = formatReceiptDateTime("2026-03-22T06:44:16.887Z")
assert.match(formattedDate, /^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}$/)

const payload = {
  orderId: "MP-ORDER-XYZ",
  receipt: {
    orderId: "MP-ORDER-XYZ",
    orderNumber: 321,
    createdAt: "2026-03-22T06:44:16.887Z",
    paymentMethod: "Cartao de Debito",
    total: 16.5,
    subtotal: 18.5,
    discounts: 2,
    customerName: "Maria da Silva",
    customerDocument: "123.456.789-01",
    authorizationCode: "AUTH-12345",
    accessKey: "1234 5678 9123 4567 8912",
    additionalMessage: "Retirar no balcao principal",
    storeSlug: "mercado-centro",
    storeName: "Mercado Centro",
    storeLegalName: "Mercado Centro Comercio LTDA",
    storeAddress: "Rua A, 100 - Centro",
    storeTaxId: "12.345.678/0001-99",
    storePhone: "(11) 4002-8922",
    items: [
      { name: "Agua Mineral sem Gas 500ml", quantity: 2, unitPrice: 3.25 },
      { name: "Barra de Cereal Banana e Mel", quantity: 1, unitPrice: 10 },
    ],
  },
}

const genericBytes = buildReceiptBytes(payload, {
  escposProfile: "generic",
  paperWidthMm: 80,
})
const genericRaw = asLatin1(genericBytes)

assert.match(genericRaw, /MR SMART/)
assert.match(genericRaw, /CNPJ: 51\.397\.705\/0001-25/)
assert.match(genericRaw, /Tel: \(51\) 995881730/)
assert.match(genericRaw, /Comprovante de Compra/)
assert.match(genericRaw, /Pedido: #00000321/)
assert.match(genericRaw, /Data: \d{2}\/\d{2}\/\d{4}/)
assert.match(genericRaw, /Hora: \d{2}:\d{2}:\d{2}/)
assert.match(genericRaw, /Cliente: 123\.456\.789-01/)
assert.match(genericRaw, /ITEM/)
assert.match(genericRaw, /QTD/)
assert.match(genericRaw, /TOTAL/)
assert.match(genericRaw, /Subtotal:.*R\$ 18,50/)
assert.match(genericRaw, /Desconto:.*R\$ 2,00/)
assert.match(genericRaw, /Total Pago:.*R\$ 16,50/)
assert.match(genericRaw, /Forma de pagamento:/)
assert.match(genericRaw, /Cartao de Debito/)
assert.match(genericRaw, /Status:/)
assert.match(genericRaw, /PAGAMENTO APROVADO/)
assert.match(genericRaw, /Obrigado pela preferencia!/)
assert.match(genericRaw, /Mr Smart/)

assert.doesNotMatch(genericRaw, /MP-ORDER-XYZ/)
assert.doesNotMatch(genericRaw, /Atendente: Autoatendimento/)
assert.doesNotMatch(genericRaw, /Documento:/)
assert.doesNotMatch(genericRaw, /Autorizacao/)
assert.doesNotMatch(genericRaw, /Chave/)
assert.doesNotMatch(genericRaw, /Obs:/)

const genericLines = toPrintableLines(genericBytes)
assertNoLineOverflow(genericLines, 42)

const missingOrderNumberPayload = {
  orderId: "MP-ORDER-NUMERO-AUSENTE",
  receipt: {
    orderId: "MP-ORDER-NUMERO-AUSENTE",
    createdAt: "2026-03-22T06:44:16.887Z",
    paymentMethod: "PIX",
    total: 40.9,
    subtotal: 40.9,
    discounts: 0,
    items: [
      { name: "Coca-Cola 350ml", quantity: 2, unitPrice: 6 },
      { name: "X-Salada", quantity: 1, unitPrice: 18.9 },
      { name: "Batata Frita P", quantity: 1, unitPrice: 10 },
    ],
  },
}

const missingOrderNumberRaw = asLatin1(
  buildReceiptBytes(missingOrderNumberPayload, {
    escposProfile: "generic",
    paperWidthMm: 80,
  }),
)

assert.match(missingOrderNumberRaw, /Pedido: -/)
assert.doesNotMatch(missingOrderNumberRaw, /MP-ORDER-NUMERO-AUSENTE/)

const accentPayload = {
  orderId: "O-1",
  receipt: {
    orderId: "O-1",
    createdAt: "2026-03-22T06:44:16.887Z",
    paymentMethod: "Debito",
    total: 5,
    subtotal: 5,
    items: [{ name: "Pao de queijo", quantity: 1, unitPrice: 5 }],
  },
}

const genericAccentRaw = asLatin1(
  buildReceiptBytes(accentPayload, {
    escposProfile: "generic",
    paperWidthMm: 80,
  }),
)
assert.match(genericAccentRaw, /Debito/)
assert.match(genericAccentRaw, /Pao de queijo/)

const bematechAccentRaw = asLatin1(
  buildReceiptBytes(accentPayload, {
    escposProfile: "bematech-mp4200",
    paperWidthMm: 80,
  }),
)
assert.match(bematechAccentRaw, /Debito/)
assert.match(bematechAccentRaw, /Pao de queijo/)

console.log("receipt-print-layout tests passed")
