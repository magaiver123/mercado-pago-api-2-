"use client"

import { type FormEvent, type KeyboardEvent, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { ArrowLeft, ArrowRight, Lock, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { setUserprofileAuthUser } from "@/lib/userprofile-auth-store"

type Mode = "login" | "forgot-email" | "forgot-code" | "forgot-reset"

const EMPTY_CODE = ["", "", "", "", "", ""]

function createEmptyCode() {
  return [...EMPTY_CODE]
}

function sanitizeCodeInput(value: string) {
  return value.replace(/\D/g, "").slice(0, 1)
}

export default function UserprofileLoginPage() {
  const router = useRouter()

  const [mode, setMode] = useState<Mode>("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [code, setCode] = useState<string[]>(createEmptyCode())
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)

  const canResendCode = resendCooldown === 0
  const joinedCode = useMemo(() => code.join(""), [code])

  useEffect(() => {
    if (typeof window === "undefined") return
    const params = new URLSearchParams(window.location.search)
    if (params.get("registered") === "true") {
      setSuccess("Cadastro concluído com sucesso. Entre com seu e-mail e senha.")
    }
  }, [])

  useEffect(() => {
    if (resendCooldown === 0) return

    const timer = setInterval(() => {
      setResendCooldown((current) => {
        if (current <= 1) {
          clearInterval(timer)
          return 0
        }
        return current - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [resendCooldown])

  function clearTransientMessages() {
    setError(null)
    setSuccess(null)
  }

  async function handleLogin(event: FormEvent) {
    event.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/userprofile/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json().catch(() => null)
      if (!response.ok) {
        setError(data?.error || "Erro ao fazer login")
        return
      }

      setUserprofileAuthUser({
        id: data.id,
        name: data.name ?? null,
        cpf: data.cpf ?? null,
        phone: data.phone ?? null,
        email: data.email,
        role: data.role ?? null,
      })

      router.push("/userprofile/perfil")
    } catch {
      setError("Erro ao fazer login")
    } finally {
      setIsLoading(false)
    }
  }

  async function handleSendCode(event: FormEvent) {
    event.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/userprofile/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      const data = await response.json().catch(() => null)
      if (!data?.success) {
        setError("Não foi possível enviar o código. Verifique o e-mail informado.")
        return
      }

      setCode(createEmptyCode())
      setResendCooldown(typeof data.cooldown === "number" ? data.cooldown : 60)
      setMode("forgot-code")
    } finally {
      setIsLoading(false)
    }
  }

  async function handleResendCode() {
    if (!canResendCode) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/userprofile/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      const data = await response.json().catch(() => null)
      if (!data?.success) {
        setError("Não foi possível reenviar o código. Tente novamente.")
        return
      }

      setResendCooldown(typeof data.cooldown === "number" ? data.cooldown : 60)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleVerifyCode(event: FormEvent) {
    event.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/userprofile/auth/verify-reset-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: joinedCode }),
      })

      const data = await response.json().catch(() => null)
      if (!data?.valid) {
        setError("Código inválido")
        return
      }

      setMode("forgot-reset")
      setPassword("")
      setConfirmPassword("")
    } finally {
      setIsLoading(false)
    }
  }

  async function handleResetPassword(event: FormEvent) {
    event.preventDefault()
    setIsLoading(true)
    setError(null)

    if (password !== confirmPassword) {
      setError("As senhas não coincidem")
      setIsLoading(false)
      return
    }

    if (password.length < 6) {
      setError("A senha deve ter no mínimo 6 dígitos")
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch("/api/userprofile/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: joinedCode, password }),
      })

      const data = await response.json().catch(() => null)
      if (!response.ok) {
        setError(data?.error || "Erro ao atualizar senha")
        return
      }

      setSuccess("Senha atualizada com sucesso. Faça login para continuar.")
      setMode("login")
      setPassword("")
      setConfirmPassword("")
      setCode(createEmptyCode())
    } catch {
      setError("Erro inesperado")
    } finally {
      setIsLoading(false)
    }
  }

  function handleCodeChange(index: number, value: string) {
    const digit = sanitizeCodeInput(value)
    setCode((current) => {
      const next = [...current]
      next[index] = digit
      return next
    })

    if (digit && index < 5) {
      const nextInput = document.getElementById(`forgot-code-${index + 1}`)
      nextInput?.focus()
    }
  }

  function handleCodeKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !code[index] && index > 0) {
      const previousInput = document.getElementById(`forgot-code-${index - 1}`)
      previousInput?.focus()
    }
  }

  function handleBackToLogin() {
    clearTransientMessages()
    setMode("login")
    setCode(createEmptyCode())
    setPassword("")
    setConfirmPassword("")
    setResendCooldown(0)
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
          {mode === "login" && (
            <div className="space-y-8">
              <div className="text-center">
                <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">Bem-vindo de volta</h1>
                <p className="text-zinc-400">Entre com suas credenciais para acessar sua conta</p>
              </div>

              {error && <p className="text-sm text-red-400 text-center">{error}</p>}
              {success && <p className="text-sm text-green-400 text-center">{success}</p>}

              <form className="space-y-4" onSubmit={handleLogin}>
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

                <button
                  type="button"
                  onClick={() => {
                    clearTransientMessages()
                    setMode("forgot-email")
                  }}
                  className="text-sm text-orange-500 hover:text-orange-400 transition-colors"
                >
                  Esqueci minha senha
                </button>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 bg-orange-500 text-white hover:bg-orange-600 rounded-xl font-medium shadow-lg shadow-orange-500/20"
                >
                  Entrar
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </form>

              <p className="text-center text-zinc-400">
                Não tem uma conta?{" "}
                <Link href="/userprofile/cadastro" className="text-orange-500 hover:text-orange-400 transition-colors font-medium">
                  Cadastrar
                </Link>
              </p>
            </div>
          )}

          {mode === "forgot-email" && (
            <div className="space-y-8">
              <button
                onClick={handleBackToLogin}
                className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </button>

              <div className="text-center">
                <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">Recuperar senha</h1>
                <p className="text-zinc-400">Digite seu e-mail para receber o código de recuperação</p>
              </div>

              {error && <p className="text-sm text-red-400 text-center">{error}</p>}

              <form className="space-y-4" onSubmit={handleSendCode}>
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

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 bg-orange-500 text-white hover:bg-orange-600 rounded-xl font-medium shadow-lg shadow-orange-500/20"
                >
                  Enviar código
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </form>
            </div>
          )}

          {mode === "forgot-code" && (
            <div className="space-y-8">
              <button
                onClick={() => {
                  clearTransientMessages()
                  setMode("forgot-email")
                }}
                className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </button>

              <div className="text-center">
                <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">Digite o código</h1>
                <p className="text-zinc-400 break-words">
                  Enviamos um código de 6 dígitos para{" "}
                  <span className="text-white break-all">{email || "seu e-mail"}</span>
                </p>
              </div>

              {error && <p className="text-sm text-red-400 text-center">{error}</p>}

              <form className="space-y-6" onSubmit={handleVerifyCode}>
                <div className="flex justify-center gap-2 sm:gap-3">
                  {code.map((digit, index) => (
                    <Input
                      key={index}
                      id={`forgot-code-${index}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(event) => handleCodeChange(index, event.target.value)}
                      onKeyDown={(event) => handleCodeKeyDown(index, event)}
                      className="w-10 h-12 sm:w-12 sm:h-14 text-center text-lg sm:text-xl font-bold bg-zinc-900 border-zinc-800 text-white focus:border-orange-500 focus:ring-orange-500/20 rounded-xl"
                    />
                  ))}
                </div>

                <Button
                  type="submit"
                  disabled={isLoading || joinedCode.length !== 6}
                  className="w-full h-12 bg-orange-500 text-white hover:bg-orange-600 rounded-xl font-medium shadow-lg shadow-orange-500/20"
                >
                  Verificar código
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>

                <p className="text-center text-zinc-400">
                  {canResendCode ? (
                    <button
                      type="button"
                      onClick={handleResendCode}
                      className="text-orange-500 hover:text-orange-400 transition-colors font-medium"
                    >
                      Reenviar código
                    </button>
                  ) : (
                    <span>Reenviar em {resendCooldown}s</span>
                  )}
                </p>
              </form>
            </div>
          )}

          {mode === "forgot-reset" && (
            <div className="space-y-8">
              <button
                onClick={() => {
                  clearTransientMessages()
                  setMode("forgot-code")
                }}
                className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </button>

              <div className="text-center">
                <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">Redefinir senha</h1>
                <p className="text-zinc-400">Defina sua nova senha de acesso</p>
              </div>

              {error && <p className="text-sm text-red-400 text-center">{error}</p>}

              <form className="space-y-4" onSubmit={handleResetPassword}>
                <div className="space-y-2">
                  <label className="text-sm text-zinc-400">Nova senha</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                    <Input
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="pl-12 h-12 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-orange-500 focus:ring-orange-500/20 rounded-xl"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-zinc-400">Confirmar nova senha</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                    <Input
                      type="password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
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
                  Atualizar senha
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </form>
            </div>
          )}
        </motion.div>
      </main>
    </div>
  )
}
