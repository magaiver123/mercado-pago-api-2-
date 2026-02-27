export function sanitizeString(value: unknown): string | null {
  if (typeof value !== "string") return null
  const sanitized = value.trim()
  return sanitized.length > 0 ? sanitized : null
}

export function normalizePhone(value: string): string {
  return value.replace(/\D/g, "")
}

