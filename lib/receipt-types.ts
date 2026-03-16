export type ReceiptItem = {
  name: string
  quantity: number
  unitPrice: number
}

export interface ReceiptData {
  orderId: string
  orderNumber?: number | null
  createdAt: string
  customerName?: string | null
  customerDocument?: string
  items: ReceiptItem[]
  paymentMethod: string
  subtotal: number
  discounts?: number
  total: number
  storeName: string
  storeLegalName?: string
  storeAddress?: string
  storeTaxId?: string
  storePhone?: string
  storeLogoPath?: string
  authorizationCode?: string
  accessKey?: string
  additionalMessage?: string
}

const RECEIPT_STORAGE_KEY = "last_kiosk_receipt"

export function saveReceiptToSession(receipt: ReceiptData) {
  if (typeof window === "undefined") return
  try {
    sessionStorage.setItem(RECEIPT_STORAGE_KEY, JSON.stringify(receipt))
  } catch {
    // ignore storage errors - kiosk still works without persisted receipt
  }
}

export function getReceiptFromSession(): ReceiptData | null {
  if (typeof window === "undefined") return null
  try {
    const raw = sessionStorage.getItem(RECEIPT_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as ReceiptData
    if (!parsed || typeof parsed !== "object") return null
    if (!parsed.orderId || !Array.isArray(parsed.items)) return null
    return parsed
  } catch {
    return null
  }
}

export function clearReceiptFromSession() {
  if (typeof window === "undefined") return
  try {
    sessionStorage.removeItem(RECEIPT_STORAGE_KEY)
  } catch {
    // ignore
  }
}

export function getDefaultStoreInfo() {
  return {
    storeName: "Autoatendimento",
    storeAddress: "Loja Totem - Endereco nao configurado",
    storeLegalName: "Autoatendimento Comercial Ltda.",
    storeTaxId: "CNPJ nao informado",
    storePhone: "Telefone nao informado",
    storeLogoPath: "/logo.svg",
  }
}

// Hook para futura impressao avancada via backend/servico local.
// Quando houver suporte, esta funcao pode enviar o `receipt` para um endpoint
// como POST /api/print-receipt, que entao delega a impressao para o servico correto.
export async function printReceiptViaBackend(_receipt: ReceiptData) {
  // Implementacao futura:
  // await fetch("/api/print-receipt", {
  //   method: "POST",
  //   headers: { "Content-Type": "application/json" },
  //   body: JSON.stringify(receipt),
  // })
}
