import { getMercadoPagoApiEnv } from "@/api/config/env"

type MercadoPagoHttpMethod = "GET" | "POST" | "PATCH" | "DELETE"

export interface MercadoPagoApiResult<T = unknown> {
  ok: boolean
  status: number
  data: T | null
  raw: unknown
  message: string
}

function extractErrorMessage(payload: unknown): string {
  if (!payload) return "Erro na comunicação com Mercado Pago"

  if (typeof payload === "string" && payload.trim() !== "") {
    return payload
  }

  if (typeof payload === "object") {
    const data = payload as Record<string, unknown>
    const message = data.message
    if (typeof message === "string" && message.trim() !== "") return message
    const error = data.error
    if (typeof error === "string" && error.trim() !== "") return error
    const cause = data.cause
    if (Array.isArray(cause) && cause.length > 0) {
      const first = cause[0]
      if (first && typeof first === "object" && typeof (first as Record<string, unknown>).description === "string") {
        return String((first as Record<string, unknown>).description)
      }
    }
    const errors = data.errors
    if (Array.isArray(errors) && errors.length > 0) {
      const first = errors[0]
      if (first && typeof first === "object") {
        const description = (first as Record<string, unknown>).description
        if (typeof description === "string" && description.trim() !== "") {
          return description
        }
      }
    }
  }

  return "Erro na comunicação com Mercado Pago"
}

export async function mercadoPagoApiRequest<T = unknown>(params: {
  path: string
  method: MercadoPagoHttpMethod
  idempotencyKey?: string
  body?: unknown
}): Promise<MercadoPagoApiResult<T>> {
  const { accessToken } = getMercadoPagoApiEnv()
  const { path, method, idempotencyKey, body } = params

  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  }

  if (idempotencyKey) {
    headers["X-Idempotency-Key"] = idempotencyKey
  }

  const response = await fetch(`https://api.mercadopago.com${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  const contentType = response.headers.get("content-type")
  let raw: unknown = null

  if (contentType && contentType.includes("application/json")) {
    raw = await response.json().catch(() => null)
  } else {
    raw = await response.text().catch(() => null)
  }

  return {
    ok: response.ok,
    status: response.status,
    data: response.ok ? (raw as T) : null,
    raw,
    message: response.ok ? "ok" : extractErrorMessage(raw),
  }
}
