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

assert.equal(formatOrderNumberOrFallback(123, "MP-ORDER"), "00000123")
assert.equal(formatOrderNumberOrFallback(null, "MP-ORDER"), "MP-ORDER")

const formattedDate = formatReceiptDateTime("2026-03-22T06:44:16.887Z")
assert.match(formattedDate, /^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/)

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
assert.match(genericRaw, /mercado-centro/)
assert.match(genericRaw, /Mr Smart Autoatendimento/)
assert.match(genericRaw, /CNPJ: 51\.397\.705\/0001-25/)
assert.match(genericRaw, /Telefone: 51995881730/)
assert.match(genericRaw, /COMPROVANTE DE COMPRA/)
assert.match(genericRaw, /Pedido/)
assert.match(genericRaw, /Data\/Hora/)
assert.match(genericRaw, /Pagamento/)
assert.match(genericRaw, /Cliente/)
assert.match(genericRaw, /CPF\/CNPJ/)
assert.match(genericRaw, /QTD/)
assert.match(genericRaw, /DESCRICAO/)
assert.match(genericRaw, /UN/)
assert.match(genericRaw, /TOTAL/)
assert.match(genericRaw, /Subtotal/)
assert.match(genericRaw, /Descontos/)
assert.match(genericRaw, /TOTAL FINAL/)
assert.match(genericRaw, /Autorizacao/)
assert.match(genericRaw, /Chave/)
assert.match(genericRaw, /Obs/)
assert.match(genericRaw, /COMPRA FINALIZADA/)
assert.match(genericRaw, /Guarde este comprovante/)

const genericLines = toPrintableLines(genericBytes)
assertNoLineOverflow(genericLines, 48)

const compactBytes = buildReceiptBytes(payload, {
  escposProfile: "generic",
  paperWidthMm: 58,
})
const compactRaw = asLatin1(compactBytes)
assert.match(compactRaw, /QTD/)
assert.match(compactRaw, /DESCRICAO/)
assert.match(compactRaw, /UN/)
assert.match(compactRaw, /TOTAL/)
assert.match(compactRaw, /TOTAL FINAL/)
const compactLines = toPrintableLines(compactBytes)
assertNoLineOverflow(compactLines, 32)

const payloadWithoutMeta = {
  orderId: "MP-ORDER-WITHOUT-META",
  receipt: {
    orderId: "MP-ORDER-WITHOUT-META",
    createdAt: "2026-03-22T06:44:16.887Z",
    paymentMethod: "Pix",
    total: 5,
    subtotal: 5,
    discounts: 0,
    storeName: "Mercado",
    items: [{ name: "Cafe", quantity: 1, unitPrice: 5 }],
  },
}

const noMetaRaw = asLatin1(
  buildReceiptBytes(payloadWithoutMeta, {
    escposProfile: "generic",
    paperWidthMm: 80,
  }),
)
assert.doesNotMatch(noMetaRaw, /Autorizacao/)
assert.doesNotMatch(noMetaRaw, /Chave/)
assert.doesNotMatch(noMetaRaw, /Obs:/)

const accentPayload = {
  orderId: "O-1",
  receipt: {
    orderId: "O-1",
    createdAt: "2026-03-22T06:44:16.887Z",
    paymentMethod: "Débito",
    total: 5,
    subtotal: 5,
    storeSlug: "sao-joao",
    customerName: "João da Silva",
    storeName: "São João",
    items: [{ name: "Pão de queijo", quantity: 1, unitPrice: 5 }],
  },
}

const genericAccentRaw = asLatin1(
  buildReceiptBytes(accentPayload, {
    escposProfile: "generic",
    paperWidthMm: 80,
  }),
)
assert.match(genericAccentRaw, /Debito/)
assert.match(genericAccentRaw, /Joao da Silva/)

const bematechAccentRaw = asLatin1(
  buildReceiptBytes(accentPayload, {
    escposProfile: "bematech-mp4200",
    paperWidthMm: 80,
  }),
)
assert.match(bematechAccentRaw, /D[ée]bito/)
assert.match(bematechAccentRaw, /Jo[ãa]o da Silva/)

console.log("receipt-print-layout tests passed")
