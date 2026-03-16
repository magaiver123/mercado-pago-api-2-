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
  items: ReceiptItem[]
  paymentMethod: string
  subtotal: number
  discounts?: number
  total: number
  storeName: string
  storeAddress?: string
}

const RECEIPT_STORAGE_KEY = "last_kiosk_receipt"

export function saveReceiptToSession(receipt: ReceiptData) {
  if (typeof window === "undefined") return
  try {
    sessionStorage.setItem(RECEIPT_STORAGE_KEY, JSON.stringify(receipt))
  } catch {
    // ignore storage errors – kiosk still works without persisted receipt
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
    storeAddress: "Loja Totem - Endereço não configurado",
  }
}

// Hook para futura impressão avançada via backend/serviço local.
// Quando houver suporte, esta função pode enviar o `receipt` para um endpoint
// como POST /api/print-receipt, que então delega a impressão para o serviço correto.
export async function printReceiptViaBackend(_receipt: ReceiptData) {
  // Implementação futura:
  // await fetch("/api/print-receipt", {
  //   method: "POST",
  //   headers: { "Content-Type": "application/json" },
  //   body: JSON.stringify(receipt),
  // })
}


