import { NextResponse } from "next/server"
import { AppError } from "@/api/utils/app-error"
import { cpfLoginService } from "@/api/services/auth/cpf-login-service"
import { registerService } from "@/api/services/auth/register-service"
import { emailLoginService } from "@/api/services/auth/email-login-service"
import { forgotPasswordService } from "@/api/services/auth/forgot-password-service"
import { verifyResetCodeService } from "@/api/services/auth/verify-reset-code-service"
import { resetPasswordService } from "@/api/services/auth/reset-password-service"

export async function loginByCpfController(request: Request) {
  let body: any = null
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "CPF invalido" }, { status: 400 })
  }

  const data = await cpfLoginService(body?.cpf)
  return NextResponse.json(data)
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

  return NextResponse.json(data)
}

export async function forgotPasswordController(request: Request) {
  let body: any = null
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false })
  }

  const data = await forgotPasswordService(body?.email ?? null)
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

