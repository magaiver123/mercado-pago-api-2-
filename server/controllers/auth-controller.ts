import { NextResponse } from "next/server"
import { AppError } from "@/api/utils/app-error"
import { cpfLoginService } from "@/api/services/auth/cpf-login-service"
import { registerService } from "@/api/services/auth/register-service"
import { emailLoginService } from "@/api/services/auth/email-login-service"
import { forgotPasswordService } from "@/api/services/auth/forgot-password-service"
import { verifyResetCodeService } from "@/api/services/auth/verify-reset-code-service"
import { resetPasswordService } from "@/api/services/auth/reset-password-service"
import { signupStartService } from "@/api/services/auth/signup-start-service"
import { signupResendService } from "@/api/services/auth/signup-resend-service"
import { signupVerifyEmailService } from "@/api/services/auth/signup-verify-email-service"
import { signupVerifyPhoneService } from "@/api/services/auth/signup-verify-phone-service"
import {
  clearAdminBypassCookie,
  clearAdminSessionCookie,
  setAdminSessionCookie,
} from "@/api/utils/admin-bypass-context"
import { clearStoreContextCookie } from "@/api/utils/store-context"
import {
  clearUserSessionCookie,
  setUserSessionCookie,
} from "@/api/utils/user-session-context"
import { assertRateLimit } from "@/api/utils/rate-limit"

function getRequestClientIp(request: Request): string {
  const xForwardedFor = request.headers.get("x-forwarded-for")
  if (xForwardedFor) {
    const first = xForwardedFor.split(",")[0]?.trim()
    if (first) return first
  }

  return request.headers.get("x-real-ip") ?? "unknown-ip"
}

export async function loginByCpfController(request: Request) {
  const clientIp = getRequestClientIp(request)
  let body: any = null
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "CPF invalido" }, { status: 400 })
  }

  const normalizedCpf = typeof body?.cpf === "string" ? body.cpf.replace(/\D/g, "") : ""
  assertRateLimit({
    key: `cpf-login:${clientIp}:${normalizedCpf.slice(0, 9)}`,
    limit: 15,
    windowMs: 60_000,
    message: "Muitas tentativas de login. Aguarde e tente novamente.",
  })

  const data = await cpfLoginService(body?.cpf)
  const response = NextResponse.json(data)
  setUserSessionCookie(response, { userId: data.id, source: "kiosk" })
  return response
}

export async function registerController(request: Request) {
  let body: any = null
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Dados invalidos" }, { status: 400 })
  }

  const data = await registerService({
    cpf: body?.cpf,
    name: body?.name,
    phone: body?.phone,
    email: body?.email,
    password: body?.password,
  })

  return NextResponse.json(data)
}

export async function loginByEmailController(request: Request) {
  let body: any = null
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Dados invalidos" }, { status: 400 })
  }

  const data = await emailLoginService({
    email: body?.email,
    password: body?.password,
  })

  const response = NextResponse.json(data)

  if (data.role === "admin") {
    setAdminSessionCookie(response, { userId: data.id })
  } else {
    clearAdminSessionCookie(response)
    clearAdminBypassCookie(response)
    clearStoreContextCookie(response)
  }

  setUserSessionCookie(response, {
    userId: data.id,
    source: "userprofile",
  })

  return response
}

export async function forgotPasswordController(request: Request) {
  let email: string | null = null
  try {
    const body = await request.json()
    email = body?.email ?? null
  } catch {}

  const data = await forgotPasswordService(email)
  return NextResponse.json(data)
}

export async function verifyResetCodeController(request: Request) {
  let body: any = null
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ valid: false })
  }

  const email = typeof body?.email === "string" ? body.email.trim() : null
  const code = typeof body?.code === "string" ? body.code.trim() : null

  const data = await verifyResetCodeService({ email, code })
  return NextResponse.json(data)
}

export async function resetPasswordController(request: Request) {
  let body: any = null
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Dados invalidos" }, { status: 400 })
  }

  try {
    const data = await resetPasswordService({
      email: body?.email,
      code: body?.code,
      password: body?.password,
    })
    return NextResponse.json(data)
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

export async function signupStartController(request: Request) {
  let body: any = null
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Dados invalidos" }, { status: 400 })
  }

  const data = await signupStartService({
    name: body?.name,
    cpf: body?.cpf,
    phone: body?.phone,
    email: body?.email,
    password: body?.password,
  })

  return NextResponse.json(data)
}

export async function signupVerifyEmailController(request: Request) {
  let body: any = null
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Dados invalidos" }, { status: 400 })
  }

  const data = await signupVerifyEmailService({
    signupId: body?.signupId,
    code: body?.code,
  })

  return NextResponse.json(data)
}

export async function signupResendController(request: Request) {
  let body: any = null
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Dados invalidos" }, { status: 400 })
  }

  const data = await signupResendService({
    signupId: body?.signupId,
    channel: body?.channel,
  })

  return NextResponse.json(data)
}

export async function signupVerifyPhoneController(request: Request) {
  let body: any = null
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Dados invalidos" }, { status: 400 })
  }

  const data = await signupVerifyPhoneService({
    signupId: body?.signupId,
    code: body?.code,
  })

  return NextResponse.json(data)
}

export async function logoutController() {
  const response = NextResponse.json({ success: true })
  clearAdminSessionCookie(response)
  clearAdminBypassCookie(response)
  clearStoreContextCookie(response)
  clearUserSessionCookie(response)
  return response
}