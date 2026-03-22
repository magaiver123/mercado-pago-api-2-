import assert from "node:assert/strict";
import {
  formatOrderNumberOrFallback,
  formatReceiptDateTime,
  buildReceiptBytes,
} from "./receipt-print-layout.mjs";

function bufferAsAscii(buffer) {
  return buffer.toString("ascii");
}

assert.equal(formatOrderNumberOrFallback(123, "MP-ORDER"), "00000123");
assert.equal(formatOrderNumberOrFallback(null, "MP-ORDER"), "MP-ORDER");

const formattedDate = formatReceiptDateTime("2026-03-22T06:44:16.887Z");
assert.match(formattedDate, /^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/);

const bytes = buildReceiptBytes(
  {
    orderId: "MP-ORDER-XYZ",
    receipt: {
      orderId: "MP-ORDER-XYZ",
      orderNumber: 321,
      createdAt: "2026-03-22T06:44:16.887Z",
      paymentMethod: "Cartao de Debito",
      total: 2,
      storeName: "Loja Exemplo",
      storeAddress: "Rua A, 100",
      storeTaxId: "12.345.678/0001-99",
      items: [{ name: "Agua", quantity: 2, unitPrice: 1 }],
    },
  },
  {
    escposProfile: "generic",
    paperWidthMm: 80,
  },
);

const raw = bufferAsAscii(bytes);
assert.match(raw, /Pedido: 00000321/);
assert.match(raw, /Data: \d{2}\/\d{2}\/\d{4} \d{2}:\d{2}/);
assert.match(raw, /Obrigado pela preferencia!/);
assert.doesNotMatch(raw, /Perfil ESC\/POS/);

console.log("receipt-print-layout tests passed");
