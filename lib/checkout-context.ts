export type TaxDocumentType = "CPF" | "CNPJ"

export interface CheckoutTaxDocument {
  type: TaxDocumentType
  value: string
}

const CHECKOUT_TAX_DOCUMENT_KEY = "checkout_tax_document"

export function saveCheckoutTaxDocument(document: CheckoutTaxDocument | null) {
  if (typeof window === "undefined") return

  try {
    if (!document) {
      sessionStorage.removeItem(CHECKOUT_TAX_DOCUMENT_KEY)
      return
    }

    sessionStorage.setItem(CHECKOUT_TAX_DOCUMENT_KEY, JSON.stringify(document))
  } catch {
    // ignore storage errors
  }
}

export function getCheckoutTaxDocument(): CheckoutTaxDocument | null {
  if (typeof window === "undefined") return null

  try {
    const raw = sessionStorage.getItem(CHECKOUT_TAX_DOCUMENT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CheckoutTaxDocument
    if (!parsed || typeof parsed !== "object") return null
    if (parsed.type !== "CPF" && parsed.type !== "CNPJ") return null
    if (typeof parsed.value !== "string" || parsed.value.trim() === "") return null

    return {
      type: parsed.type,
      value: parsed.value.trim(),
    }
  } catch {
    return null
  }
}

