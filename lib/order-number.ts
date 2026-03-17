const ORDER_NUMBER_LENGTH = 8

export function formatOrderNumber(orderNumber: number | null | undefined): string | null {
  if (typeof orderNumber !== "number" || !Number.isFinite(orderNumber)) {
    return null
  }

  const normalized = Math.trunc(orderNumber)
  if (normalized < 0) {
    return null
  }

  return String(normalized).padStart(ORDER_NUMBER_LENGTH, "0")
}

export function formatOrderNumberOrFallback(
  orderNumber: number | null | undefined,
  fallback: string,
): string {
  return formatOrderNumber(orderNumber) ?? fallback
}

