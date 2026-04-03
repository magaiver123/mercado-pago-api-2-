export function getRemainingReceiptEmailCooldownSeconds(params: {
  lastSentAt: string | null | undefined
  now: Date
  cooldownSeconds: number
}) {
  const { lastSentAt, now, cooldownSeconds } = params
  if (!lastSentAt) return 0

  const lastSentMs = new Date(lastSentAt).getTime()
  if (!Number.isFinite(lastSentMs)) return 0

  const elapsedMs = now.getTime() - lastSentMs
  const remainingMs = cooldownSeconds * 1000 - elapsedMs
  if (remainingMs <= 0) return 0

  return Math.ceil(remainingMs / 1000)
}

export function buildReceiptEmailIdempotencyKey(params: {
  orderId: string
  now: Date
  cooldownSeconds: number
}) {
  const window = Math.floor(params.now.getTime() / (params.cooldownSeconds * 1000))
  return `receipt-email:${params.orderId}:${window}`
}

