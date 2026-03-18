"use client"

import { type ClipboardEvent, type Dispatch, type FormEvent, type KeyboardEvent, type SetStateAction, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { ArrowLeft, ArrowRight, CreditCard, Lock, Mail, Phone, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { validateCPF } from "@/lib/cpf-validator"

type Step = "form" | "verify-email"

const EMPTY_CODE = ["", "", "", "", "", ""]

function createEmptyCode() {
  return [...EMPTY_CODE]
}

function sanitizeCodeInput(value: string) {
  return value.replace(/\D/g, "").slice(0, 1)
}

function distributePastedDigits(currentCode: string[], startIndex: number, rawValue: string) {
  const digits = rawValue.replace(/\D/g, "")
  if (!digits) return null

  const nextCode = [...currentCode]
  let writeIndex = startIndex

  for (const digit of digits) {
    if (writeIndex >= nextCode.length) break
    nextCode[writeIndex] = digit
    writeIndex += 1
  }

  const nextEmptyIndex = nextCode.findIndex((digit, index) => index >= startIndex && digit === "")
  const focusIndex = nextEmptyIndex === -1 ? Math.min(writeIndex - 1, nextCode.length - 1) : nextEmptyIndex

  return { nextCode, focusIndex }
}

function formatCpf(value: string) {
  return value
    .replace(/\D/g, "")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2")
    .slice(0, 14)
}

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11)
  if (digits.length <= 10) {
    return digits.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3").trim()
  }
  return digits.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3").trim()
}

export default function UserprofileCadastroPage() {
  const router = useRouter()

  const [step, setStep] = useState<Step>("form")
  const [name, setName] = useState("")
  const [cpf, setCpf] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [signupId, setSignupId] = useState<string | null>(null)
  const [emailMasked, setEmailMasked] = useState<string | null>(null)
  const [emailCode, setEmailCode] = useState<string[]>(createEmptyCode())
  const [emailCooldown, setEmailCooldown] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const joinedEmailCode = useMemo(() => emailCode.join(""), [emailCode])

  useEffect(() => {
    if (emailCooldown <= 0) return
    const timer = setInterval(() => {
      setEmailCooldown((current) => (current > 0 ? current - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [emailCooldown])

  function clearMessages() {
    setError(null)
    setSuccess(null)
  }

  function handleCpfChange(value: string) {
    const digits = value.replace(/\D/g, "")
    if (digits.length <= 11) setCpf(digits)
  }

  function handlePhoneChange(value: string) {
    const digits = value.replace(/\D/g, "")
    if (digits.length <= 11) setPhone(digits)
  }

  function updateCode(setter: Dispatch<SetStateAction<string[]>>, prefix: string, index: number, value: string) {
    const digit = sanitizeCodeInput(value)
    setter((current) => {
      const next = [...current]
      next[index] = digit
      return next
    })

    if (digit && index < 5) {
      const nextInput = document.getElementById(`${prefix}-${index + 1}`)
      nextInput?.focus()
    }
  }

  function moveCodeFocusBack(prefix: string, index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && index > 0 && !(event.currentTarget.value || "")) {
      const previousInput = document.getElementById(`${prefix}-${index - 1}`)
      previousInput?.focus()
    }
  }

  function handleCodePaste(
    currentCode: string[],
    setter: Dispatch<SetStateAction<string[]>>,
    prefix: string,
    index: number,
    event: ClipboardEvent<HTMLInputElement>,
  ) {
    const pastedText = event.clipboardData.getData("text")
    const result = distributePastedDigits(currentCode, index, pastedText)
    if (!result) return

    event.preventDefault()
    setter(result.nextCode)

    const targetInput = document.getElementById(`${prefix}-${result.focusIndex}`) as HTMLInputElement | null
    targetInput?.focus()
  }

  async function handleStartSignup(event: FormEvent) {
    event.preventDefault()
    clearMessages()

    if (!validateCPF(cpf)) {
      setError("CPF inválido")
      return
    }

    if (phone.length < 10) {
      setError("Telefone inválido")
      return
    }

    if (password.length < 6) {
      setError("A senha deve ter no mínimo 6 dígitos")
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch("/api/userprofile/auth/signup/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          cpf,
          phone,
          email,
          password,
        }),
      })

      const data = await response.json().catch(() => null)
      if (!response.ok) {
        setError(data?.error || "Não foi possível iniciar o cadastro")
        return
      }

      setSignupId(data.signupId)
      setEmailMasked(data.emailMasked ?? email)
      setEmailCooldown(typeof data.resendCooldown === "number" ? data.resendCooldown : 60)
      setEmailCode(createEmptyCode())
      setStep("verify-email")
      setSuccess("Código enviado para seu e-mail.")
    } catch {
      setError("Não foi possível iniciar o cadastro")
    } finally {
      setIsLoading(false)
    }
  }

  async function handleVerifyEmail(event: FormEvent) {
    event.preventDefault()
    clearMessages()
    if (!signupId) {
      setError("Sessão de cadastro inválida. Refaça o processo.")
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch("/api/userprofile/auth/signup/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signupId,
          code: joinedEmailCode,
        }),
      })

      const data = await response.json().catch(() => null)
      if (!response.ok || !data?.emailVerified) {
        setError(data?.error || "Código de e-mail inválido")
        return
      }

      setSuccess("E-mail verificado. Cadastro concluído.")
      router.push("/userprofile/login?registered=true")
    } catch {
      setError("Não foi possível validar o e-mail")
    } finally {
      setIsLoading(false)
    }
  }

  async function handleResend() {
    if (!signupId) return
    clearMessages()
    setIsLoading(true)

    try {
      const response = await fetch("/api/userprofile/auth/signup/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signupId,
          channel: "email",
        }),
      })

      const data = await response.json().catch(() => null)
      if (!response.ok || !data?.success) {
        setError(data?.error || "Não foi possível reenviar o código")
        return
      }

      const nextCooldown = typeof data.resendCooldown === "number" ? data.resendCooldown : 60
      setEmailCooldown(nextCooldown)
      setSuccess("Novo código de e-mail enviado.")
    } catch {
      setError("Não foi possível reenviar o código")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-zinc-950 flex flex-col userprofile-theme">
      <div className="absolute inset-0 bg-gradient-to-b from-zinc-950 via-zinc-950 to-zinc-900 pointer-events-none" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-zinc-800/20 rounded-full blur-3xl pointer-events-none" />
      <div className="up-noise-overlay" aria-hidden="true" />

      <header className="relative z-10 p-6">
        <Link href="/userprofile" className="inline-flex items-center gap-2">
          <img src="/LOGOMR.png" alt="Mr Smart" className="w-9 h-9 object-contain" />
          <span className="font-semibold">
            <span className="text-orange-500">Mr</span>
            <span className="text-white"> Smart</span>
          </span>
        </Link>
      </header>

      <main className="relative z-10 flex-1 flex items-center justify-center px-4 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md"
        >
          {step === "form" && (
            <div className="space-y-6">
              <div className="text-center">
                <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">Crie sua conta</h1>
                <p className="text-zinc-400">Preencha os dados abaixo para começar a comprar</p>
              </div>

              {error && <p className="text-sm text-red-400 text-center">{error}</p>}
              {success && <p className="text-sm text-green-400 text-center">{success}</p>}

              <form className="space-y-4" onSubmit={handleStartSignup}>
                <div className="space-y-2">
                  <label className="text-sm text-zinc-400">Nome completo</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                    <Input
                      type="text"
                      placeholder="Seu nome completo"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      className="pl-12 h-12 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-orange-500 focus:ring-orange-500/20 rounded-xl"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-zinc-400">CPF</label>
                  <div className="relative">
                    <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                    <Input
                      type="text"
                      placeholder="000.000.000-00"
                      value={formatCpf(cpf)}
                      onChange={(event) => handleCpfChange(event.target.value)}
                      className="pl-12 h-12 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-orange-500 focus:ring-orange-500/20 rounded-xl"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-zinc-400">Telefone</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                    <Input
                      type="text"
                      placeholder="(00) 00000-0000"
                      value={formatPhone(phone)}
                      onChange={(event) => handlePhoneChange(event.target.value)}
                      className="pl-12 h-12 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-orange-500 focus:ring-orange-500/20 rounded-xl"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-zinc-400">E-mail</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                    <Input
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      className="pl-12 h-12 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-orange-500 focus:ring-orange-500/20 rounded-xl"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-zinc-400">Senha</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                    <Input
                      type="password"
                      placeholder="********"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="pl-12 h-12 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-orange-500 focus:ring-orange-500/20 rounded-xl"
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 bg-orange-500 text-white hover:bg-orange-600 rounded-xl font-medium shadow-lg shadow-orange-500/20"
                >
                  Criar minha conta
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </form>

              <p className="text-center text-zinc-400">
                Já tem uma conta?{" "}
                <Link href="/userprofile/login" className="text-orange-500 hover:text-orange-400 transition-colors font-medium">
                  Entrar
                </Link>
              </p>
            </div>
          )}

          {step === "verify-email" && (
            <div className="space-y-8">
              <button
                onClick={() => {
                  clearMessages()
                  setStep("form")
                }}
                className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </button>

              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-orange-500/10 flex items-center justify-center">
                  <Mail className="w-8 h-8 text-orange-500" />
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">Verifique seu e-mail</h1>
                <p className="text-zinc-400 break-words">
                  Enviamos um código de 6 dígitos para{" "}
                  <span className="text-white break-all">{emailMasked ?? email}</span>
                </p>
              </div>

              {error && <p className="text-sm text-red-400 text-center">{error}</p>}
              {success && <p className="text-sm text-green-400 text-center">{success}</p>}

              <form className="space-y-6" onSubmit={handleVerifyEmail}>
                <div className="flex justify-center gap-2 sm:gap-3">
                  {emailCode.map((digit, index) => (
                    <Input
                      key={index}
                      id={`email-code-${index}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(event) => updateCode(setEmailCode, "email-code", index, event.target.value)}
                      onKeyDown={(event) => moveCodeFocusBack("email-code", index, event)}
                      onPaste={(event) => handleCodePaste(emailCode, setEmailCode, "email-code", index, event)}
                      className="w-10 h-12 sm:w-12 sm:h-14 text-center text-lg sm:text-xl font-bold bg-zinc-900 border-zinc-800 text-white focus:border-orange-500 focus:ring-orange-500/20 rounded-xl"
                    />
                  ))}
                </div>

                <Button
                  type="submit"
                  disabled={isLoading || joinedEmailCode.length !== 6}
                  className="w-full h-12 bg-orange-500 text-white hover:bg-orange-600 rounded-xl font-medium shadow-lg shadow-orange-500/20"
                >
                  Verificar e-mail
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>

                <p className="text-center text-zinc-400">
                  {emailCooldown === 0 ? (
                    <button
                      type="button"
                      onClick={handleResend}
                      className="text-orange-500 hover:text-orange-400 transition-colors font-medium"
                    >
                      Reenviar código
                    </button>
                  ) : (
                    <span>Reenviar em {emailCooldown}s</span>
                  )}
                </p>
              </form>
            </div>
          )}
        </motion.div>
      </main>
    </div>
  )
}
