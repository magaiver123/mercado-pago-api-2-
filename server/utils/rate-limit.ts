import { AppError } from "@/api/utils/app-error"

type Bucket = {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()

export function assertRateLimit(input: {
  key: string
  limit: number
  windowMs: number
  message?: string
}) {
  const now = Date.now()
  const existing = buckets.get(input.key)

  if (!existing || existing.resetAt <= now) {
    buckets.set(input.key, {
      count: 1,
      resetAt: now + input.windowMs,
    })
    return
  }

  if (existing.count >= input.limit) {
    throw new AppError(input.message ?? "Muitas tentativas. Tente novamente.", 429)
  }

  existing.count += 1
  buckets.set(input.key, existing)
}

