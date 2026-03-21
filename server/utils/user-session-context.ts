import { createHmac, timingSafeEqual } from "crypto"
import { NextResponse } from "next/server"
import { getSessionContextEnv } from "@/api/config/env"
import { AppError } from "@/api/utils/app-error"
import { isValidUUID } from "@/api/utils/validators"

const USER_SESSION_COOKIE = "user_session_ctx"
const USER_SESSION_MAX_AGE_SECONDS = 60 * 60 * 4

type UserSessionSource = "kiosk" | "userprofile"

type UserSessionPayload = {
  userId: string
  source: UserSessionSource
  issuedAt: number
}

function sign(value: string, secret: string) {
  return createHmac("sha256", secret).update(value).digest("base64url")
}

function encode(payload: UserSessionPayload, secret: string) {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url")
  const signature = sign(encodedPayload, secret)
  return `${encodedPayload}.${signature}`
}

function decode(value: string, secret: string): UserSessionPayload | null {
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
    ) as Partial<UserSessionPayload>

    if (!decoded?.userId || !decoded?.source || !decoded?.issuedAt) return null
    if (!isValidUUID(decoded.userId)) return null
    if (decoded.source !== "kiosk" && decoded.source !== "userprofile") return null
    if (typeof decoded.issuedAt !== "number" || !Number.isFinite(decoded.issuedAt)) return null

    return {
      userId: decoded.userId,
      source: decoded.source,
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

export function setUserSessionCookie(
  response: NextResponse,
  input: { userId: string; source: UserSessionSource },
) {
  const { secret } = getSessionContextEnv()
  const value = encode(
    {
      userId: input.userId,
      source: input.source,
      issuedAt: Date.now(),
    },
    secret,
  )

  response.cookies.set(USER_SESSION_COOKIE, value, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: USER_SESSION_MAX_AGE_SECONDS,
  })
}

export function clearUserSessionCookie(response: NextResponse) {
  response.cookies.delete(USER_SESSION_COOKIE)
}

export function readUserSessionFromRequest(request: Request): UserSessionPayload | null {
  const cookieValue = parseCookie(request.headers.get("cookie"), USER_SESSION_COOKIE)
  if (!cookieValue) return null

  const { secret } = getSessionContextEnv()
  const payload = decode(cookieValue, secret)
  if (!payload) return null

  const age = Date.now() - payload.issuedAt
  if (age > USER_SESSION_MAX_AGE_SECONDS * 1000) {
    return null
  }

  return payload
}

export function requireUserSessionFromRequest(request: Request): UserSessionPayload {
  const payload = readUserSessionFromRequest(request)
  if (!payload) {
    throw new AppError("Sessao de usuario invalida", 401)
  }

  return payload
}
