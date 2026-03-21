import { createHmac, timingSafeEqual } from "crypto"
import { NextResponse } from "next/server"
import { getSessionContextEnv } from "@/api/config/env"
import { isValidUUID } from "@/api/utils/validators"

const ADMIN_SESSION_COOKIE = "admin_session_ctx"
const ADMIN_BYPASS_COOKIE = "admin_bypass_ctx"
const ADMIN_BYPASS_MAX_AGE_SECONDS = 60 * 60 * 12
const ADMIN_BYPASS_DEVICE_PREFIX = "admin-bypass"

type AdminSessionPayload = {
  userId: string
  issuedAt: number
}

type AdminBypassPayload = {
  userId: string
  storeId: string
  storeSlug: string
  issuedAt: number
}

function sign(value: string, secret: string) {
  return createHmac("sha256", secret).update(value).digest("base64url")
}

function encode<T extends object>(payload: T, secret: string) {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url")
  const signature = sign(encodedPayload, secret)
  return `${encodedPayload}.${signature}`
}

function decode(value: string, secret: string): unknown | null {
  const [encodedPayload, providedSignature] = value.split(".")

  if (!encodedPayload || !providedSignature) {
    return null
  }

  const expectedSignature = sign(encodedPayload, secret)
  const providedSignatureBuffer = Buffer.from(providedSignature)
  const expectedSignatureBuffer = Buffer.from(expectedSignature)

  if (providedSignatureBuffer.length !== expectedSignatureBuffer.length) {
    return null
  }

  if (!timingSafeEqual(providedSignatureBuffer, expectedSignatureBuffer)) {
    return null
  }

  try {
    return JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"))
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

function isValidIssuedAt(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
}

export function setAdminSessionCookie(
  response: NextResponse,
  input: { userId: string },
) {
  const { secret } = getSessionContextEnv()
  const value = encode<AdminSessionPayload>(
    {
      userId: input.userId,
      issuedAt: Date.now(),
    },
    secret,
  )

  response.cookies.set(ADMIN_SESSION_COOKIE, value, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ADMIN_BYPASS_MAX_AGE_SECONDS,
  })
}

export function clearAdminSessionCookie(response: NextResponse) {
  response.cookies.delete(ADMIN_SESSION_COOKIE)
}

export function readAdminSessionFromRequest(request: Request): AdminSessionPayload | null {
  const cookieValue = parseCookie(request.headers.get("cookie"), ADMIN_SESSION_COOKIE)
  if (!cookieValue) return null

  const { secret } = getSessionContextEnv()
  const decoded = decode(cookieValue, secret) as Partial<AdminSessionPayload> | null

  if (!decoded?.userId || !decoded?.issuedAt) {
    return null
  }

  if (!isValidUUID(decoded.userId) || !isValidIssuedAt(decoded.issuedAt)) {
    return null
  }

  const age = Date.now() - decoded.issuedAt
  if (age > ADMIN_BYPASS_MAX_AGE_SECONDS * 1000) {
    return null
  }

  return {
    userId: decoded.userId,
    issuedAt: decoded.issuedAt,
  }
}

export function setAdminBypassCookie(
  response: NextResponse,
  input: { userId: string; storeId: string; storeSlug: string },
) {
  const { secret } = getSessionContextEnv()
  const value = encode<AdminBypassPayload>(
    {
      userId: input.userId,
      storeId: input.storeId,
      storeSlug: input.storeSlug,
      issuedAt: Date.now(),
    },
    secret,
  )

  response.cookies.set(ADMIN_BYPASS_COOKIE, value, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ADMIN_BYPASS_MAX_AGE_SECONDS,
  })
}

export function clearAdminBypassCookie(response: NextResponse) {
  response.cookies.delete(ADMIN_BYPASS_COOKIE)
}

export function readAdminBypassFromRequest(request: Request): AdminBypassPayload | null {
  const cookieValue = parseCookie(request.headers.get("cookie"), ADMIN_BYPASS_COOKIE)
  if (!cookieValue) return null

  const { secret } = getSessionContextEnv()
  const decoded = decode(cookieValue, secret) as Partial<AdminBypassPayload> | null

  if (!decoded?.userId || !decoded?.storeId || !decoded?.storeSlug || !decoded?.issuedAt) {
    return null
  }

  if (
    !isValidUUID(decoded.userId) ||
    !isValidUUID(decoded.storeId) ||
    typeof decoded.storeSlug !== "string" ||
    decoded.storeSlug.trim() === "" ||
    !isValidIssuedAt(decoded.issuedAt)
  ) {
    return null
  }

  const age = Date.now() - decoded.issuedAt
  if (age > ADMIN_BYPASS_MAX_AGE_SECONDS * 1000) {
    return null
  }

  return {
    userId: decoded.userId,
    storeId: decoded.storeId,
    storeSlug: decoded.storeSlug,
    issuedAt: decoded.issuedAt,
  }
}

export function getAdminBypassDeviceId(userId: string) {
  return `${ADMIN_BYPASS_DEVICE_PREFIX}:${userId}`
}
