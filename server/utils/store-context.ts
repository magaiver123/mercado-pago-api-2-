import { createHmac, timingSafeEqual } from "crypto"
import { NextResponse } from "next/server"
import { getStoreContextEnv } from "@/api/config/env"
import { AppError } from "@/api/utils/app-error"
import { isValidUUID } from "@/api/utils/validators"

const STORE_CONTEXT_COOKIE = "store_ctx"
const STORE_CONTEXT_MAX_AGE_SECONDS = 60 * 60 * 12

type StoreContextPayload = {
  storeId: string
  deviceId: string
  issuedAt: number
}

function sign(value: string, secret: string) {
  return createHmac("sha256", secret).update(value).digest("base64url")
}

function encode(payload: StoreContextPayload, secret: string) {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url")
  const signature = sign(encodedPayload, secret)
  return `${encodedPayload}.${signature}`
}

function decode(value: string, secret: string): StoreContextPayload | null {
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
    const decoded = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as Partial<StoreContextPayload>

    if (!decoded?.storeId || !decoded?.deviceId || !decoded?.issuedAt) {
      return null
    }

    if (!isValidUUID(decoded.storeId)) {
      return null
    }

    if (typeof decoded.deviceId !== "string" || decoded.deviceId.trim() === "") {
      return null
    }

    if (typeof decoded.issuedAt !== "number" || !Number.isFinite(decoded.issuedAt)) {
      return null
    }

    return {
      storeId: decoded.storeId,
      deviceId: decoded.deviceId,
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

export function setStoreContextCookie(
  response: NextResponse,
  input: { storeId: string; deviceId: string },
) {
  const { secret } = getStoreContextEnv()
  const value = encode(
    {
      storeId: input.storeId,
      deviceId: input.deviceId,
      issuedAt: Date.now(),
    },
    secret,
  )

  response.cookies.set(STORE_CONTEXT_COOKIE, value, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: STORE_CONTEXT_MAX_AGE_SECONDS,
  })
}

export function clearStoreContextCookie(response: NextResponse) {
  response.cookies.delete(STORE_CONTEXT_COOKIE)
}

export function readStoreContextFromRequest(request: Request): StoreContextPayload | null {
  const cookieValue = parseCookie(request.headers.get("cookie"), STORE_CONTEXT_COOKIE)
  if (!cookieValue) return null

  const { secret } = getStoreContextEnv()
  const payload = decode(cookieValue, secret)
  if (!payload) return null

  const age = Date.now() - payload.issuedAt
  if (age > STORE_CONTEXT_MAX_AGE_SECONDS * 1000) {
    return null
  }

  return payload
}

export function requireStoreContextFromRequest(request: Request): StoreContextPayload {
  const payload = readStoreContextFromRequest(request)
  if (!payload) {
    throw new AppError("Contexto de loja inválido", 401)
  }

  return payload
}
