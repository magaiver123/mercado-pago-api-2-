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
  storeSlug?: string
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

export interface PrintReceiptBackendResponse {
  success: boolean
  result?: "queued" | "already_queued" | "already_printed" | "failed_previous"
  code?: string
  jobId?: string
  jobStatus?: string
  error?: string
  retryable?: boolean
}

export async function printReceiptViaBackend(
  receipt: ReceiptData,
): Promise<PrintReceiptBackendResponse> {
  const response = await fetch("/api/print/receipt", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      orderId: receipt.orderId,
      receipt,
    }),
  })

  const data = (await response.json().catch(() => null)) as PrintReceiptBackendResponse | null

  if (!response.ok) {
    return {
      success: false,
      error: data?.error ?? "Falha ao enviar comprovante para a fila de impressao",
      code: data?.code,
      retryable: data?.retryable,
    }
  }

  return {
    success: data?.success === true,
    result: data?.result,
    code: data?.code,
    jobId: data?.jobId,
    jobStatus: data?.jobStatus,
  }
}
