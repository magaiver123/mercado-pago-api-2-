import { getMercadoPagoApiEnv } from "@/api/config/env"

type MercadoPagoHttpMethod = "GET" | "POST" | "PATCH" | "DELETE"

export interface MercadoPagoApiResult<T = unknown> {
  ok: boolean
  status: number
  data: T | null
  raw: unknown
  message: string
}

function firstNonEmptyString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim() !== "") {
      return value.trim()
    }
  }
  return null
}

function extractErrorMessage(payload: unknown): string {
  if (!payload) return "Erro na comunicacao com Mercado Pago"

  if (typeof payload === "string" && payload.trim() !== "") {
    return payload
  }

  if (typeof payload === "object") {
    const data = payload as Record<string, unknown>
    const directMessage = firstNonEmptyString(
      data.message,
      data.error,
      data.detail,
      data.error_description,
      data.status_detail,
      data.title,
    )
    if (directMessage) return directMessage

    const cause = data.cause
    if (Array.isArray(cause) && cause.length > 0) {
      const first = cause[0]
      if (first && typeof first === "object") {
        const causeMessage = firstNonEmptyString(
          (first as Record<string, unknown>).description,
          (first as Record<string, unknown>).message,
          (first as Record<string, unknown>).detail,
          (first as Record<string, unknown>).code,
        )
        if (causeMessage) return causeMessage
      }
    }

    const errors = data.errors
    if (Array.isArray(errors) && errors.length > 0) {
      const first = errors[0]
      if (first && typeof first === "object") {
        const errorsMessage = firstNonEmptyString(
          (first as Record<string, unknown>).description,
          (first as Record<string, unknown>).message,
          (first as Record<string, unknown>).detail,
          (first as Record<string, unknown>).code,
        )
        if (errorsMessage) return errorsMessage
      }
    }
  }

  return "Erro na comunicacao com Mercado Pago"
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

  const abortController = new AbortController()
  const timeoutHandle = setTimeout(() => abortController.abort(), 15000)
  let response: Response

  try {
    response = await fetch(`https://api.mercadopago.com${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: abortController.signal,
    })
  } catch (error) {
    const isTimeout = error instanceof Error && error.name === "AbortError"
    return {
      ok: false,
      status: 504,
      data: null,
      raw: null,
      message: isTimeout
        ? "Tempo limite na comunicacao com Mercado Pago"
        : "Falha de conexao com Mercado Pago",
    }
  } finally {
    clearTimeout(timeoutHandle)
  }

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
