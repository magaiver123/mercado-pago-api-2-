import { createHmac, timingSafeEqual } from "crypto"
import { NextResponse } from "next/server"
import { getSessionContextEnv } from "@/api/config/env"
import { AppError } from "@/api/utils/app-error"
import { isValidUUID } from "@/api/utils/validators"

const CHECKOUT_SESSION_COOKIE = "checkout_session_ctx"
const CHECKOUT_SESSION_MAX_AGE_SECONDS = 60 * 15
const CHECKOUT_SESSION_VERSION = 2

type CheckoutSessionPayload = {
  v: number
  sessionId: string
  userId: string
  storeId: string
  issuedAt: number
}

function sign(value: string, secret: string) {
  return createHmac("sha256", secret).update(value).digest("base64url")
}

function encode(payload: CheckoutSessionPayload, secret: string) {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url")
  const signature = sign(encodedPayload, secret)
  return `${encodedPayload}.${signature}`
}

function decode(value: string, secret: string): CheckoutSessionPayload | null {
  const [encodedPayload, providedSignature] = value.split(".")
  if (!encodedPayload || !providedSignature) return null

  const expectedSignature = sign(encodedPayload, secret)
  const providedSignatureBuffer = Buffer.from(providedSignature)
  const expectedSignatureBuffer = Buffer.from(expectedSignature)

  if (providedSignatureBuffer.length !== expectedSignatureBuffer.length) return null
  if (!timingSafeEqual(providedSignatureBuffer, expectedSignatureBuffer)) return null

  try {
    const decoded = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as Partial<CheckoutSessionPayload>

    if (!decoded?.sessionId || !decoded?.userId || !decoded?.storeId || !decoded?.issuedAt) return null
    if (!isValidUUID(decoded.userId) || !isValidUUID(decoded.storeId)) return null
    if (typeof decoded.sessionId !== "string" || decoded.sessionId.trim() === "") return null
    if (typeof decoded.issuedAt !== "number" || !Number.isFinite(decoded.issuedAt)) return null

    return {
      v: typeof decoded.v === "number" ? decoded.v : 1,
      sessionId: decoded.sessionId,
      userId: decoded.userId,
      storeId: decoded.storeId,
      issuedAt: decoded.issuedAt,
    }
  } catch {
    return null
  }
}

function parseCookie(cookieHeader: string | null, key: string): string | null {
  if (!cookieHeader) return null

  const parts = cookieHeader.split(";")
  for (const part of parts) {
    const [rawName, ...rawValue] = part.trim().split("=")
    if (rawName !== key) continue
    return rawValue.join("=")
  }

  return null
}

export function setCheckoutSessionCookie(
  response: NextResponse,
  input: { sessionId: string; userId: string; storeId: string },
) {
  const { secret } = getSessionContextEnv()
  const value = encode(
    {
      v: CHECKOUT_SESSION_VERSION,
      sessionId: input.sessionId,
      userId: input.userId,
      storeId: input.storeId,
      issuedAt: Date.now(),
    },
    secret,
  )

  response.cookies.set(CHECKOUT_SESSION_COOKIE, value, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: CHECKOUT_SESSION_MAX_AGE_SECONDS,
  })
}

export function clearCheckoutSessionCookie(response: NextResponse) {
  response.cookies.delete(CHECKOUT_SESSION_COOKIE)
}

export function readCheckoutSessionFromRequest(request: Request): CheckoutSessionPayload | null {
  const cookieValue = parseCookie(request.headers.get("cookie"), CHECKOUT_SESSION_COOKIE)
  if (!cookieValue) return null

  const { secret, previousSecret } = getSessionContextEnv()
  const payload =
    decode(cookieValue, secret) ??
    (previousSecret ? decode(cookieValue, previousSecret) : null)
  if (!payload || payload.v < 1) return null

  const age = Date.now() - payload.issuedAt
  if (age > CHECKOUT_SESSION_MAX_AGE_SECONDS * 1000) return null

  return payload
}

export function requireCheckoutSessionFromRequest(request: Request): CheckoutSessionPayload {
  const payload = readCheckoutSessionFromRequest(request)
  if (!payload) {
    throw new AppError("Sessao de checkout invalida", 401)
  }
  return payload
}
