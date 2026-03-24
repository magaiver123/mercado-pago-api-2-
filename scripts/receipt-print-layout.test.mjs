import assert from "node:assert/strict"
import {
  buildReceiptBytes,
  formatOrderNumberOrFallback,
  formatReceiptDateTime,
} from "./receipt-print-layout.mjs"

function asLatin1(buffer) {
  return buffer.toString("latin1")
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
assert.match(genericRaw, /Pedido: 00000321/)
assert.match(genericRaw, /Pagamento: Cartao de Debito/)
assert.match(genericRaw, /TOTAL: R\$ 16,50/)
assert.match(genericRaw, /Obrigado pela preferencia!/)
assert.deepEqual(
  [...genericBytes.slice(-6)],
  [0x1b, 0x64, 0x03, 0x1d, 0x56, 0x00],
)

const compactBytes = buildReceiptBytes(payload, {
  escposProfile: "generic",
  paperWidthMm: 58,
})
const compactRaw = asLatin1(compactBytes)
assert.match(compactRaw, /2x Agua Mineral sem Gas 500ml/)
assert.match(compactRaw, /Un: R\$ 3,25  Total: R\$ 6,50/)

const accentPayload = {
  orderId: "O-1",
  receipt: {
    orderId: "O-1",
    createdAt: "2026-03-22T06:44:16.887Z",
    paymentMethod: "Debito",
    total: 5,
    subtotal: 5,
    storeName: "Sao Joao",
    items: [{ name: "Pao de queijo", quantity: 1, unitPrice: 5 }],
  },
}
const genericAccentRaw = asLatin1(
  buildReceiptBytes(accentPayload, {
    escposProfile: "generic",
    paperWidthMm: 80,
  }),
)
assert.match(genericAccentRaw, /Sao Joao/)

const mp4200Bytes = buildReceiptBytes(accentPayload, {
  model: "MP 4200 TH",
  escposProfile: "bematech-mp4200",
  paperWidthMm: 80,
})
assert.deepEqual(
  [...mp4200Bytes.slice(0, 4)],
  [0x1b, 0x40, 0x1d, 0xf9],
)
assert.deepEqual(
  [...mp4200Bytes.slice(4, 6)],
  [0x20, 0x01],
)
assert.deepEqual(
  [...mp4200Bytes.slice(-4)],
  [0x1d, 0x56, 0x42, 0x03],
)

const partialCutBytes = buildReceiptBytes(payload, {
  escposProfile: "generic",
  paperWidthMm: 80,
  cutMode: "partial",
})
assert.deepEqual(
  [...partialCutBytes.slice(-6)],
  [0x1b, 0x64, 0x03, 0x1d, 0x56, 0x01],
)

console.log("receipt-print-layout tests passed")
