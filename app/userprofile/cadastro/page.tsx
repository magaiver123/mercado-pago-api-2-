"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ShoppingCart, User, Mail, Phone, CreditCard, ArrowLeft, Lock } from "lucide-react"

import { validateCPF, formatCPF } from "@/lib/cpf-validator"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function CadastroPage() {
  const router = useRouter()

  const [cpf, setCpf] = useState("")
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleCPFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "")
    if (value.length <= 11) setCpf(value)
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "")
    if (value.length <= 11) setPhone(value)
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    if (!validateCPF(cpf)) {
      setError("CPF inválido")
      setIsLoading(false)
      return
    }

    if (phone.length < 10) {
      setError("Telefone inválido")
      setIsLoading(false)
      return
    }

    if (password.length < 6) {
      setError("A senha deve ter no mínimo 6 dígitos")
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cpf,
          name,
          phone,
          email,
          password,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Erro ao cadastrar")
        setIsLoading(false)
        return
      }

      router.push("/userprofile/login?registered=true")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao cadastrar")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/userprofile" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">
              Mr <span className="text-primary">Smart</span>
            </span>
          </div>
        </div>
      </header>

      {/* Form */}
      <div className="flex-1 px-4 py-8">
        <div className="container mx-auto max-w-sm">
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Criar conta</h1>
            <p className="text-muted-foreground">Preencha seus dados para começar</p>
          </div>

          <form className="space-y-4" onSubmit={handleRegister}>
            <div className="space-y-2">
              <Label>Nome completo</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-10 py-6"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>CPF</Label>
              <div className="relative">
                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  value={formatCPF(cpf)}
                  onChange={handleCPFChange}
                  className="pl-10 py-6"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Telefone</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  value={phone.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3")}
                  onChange={handlePhoneChange}
                  className="pl-10 py-6"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>E-mail</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 py-6"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 py-6"
                />
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600 text-center">{error}</p>
            )}

            <div className="pt-4">
              <Button
                type="submit"
                size="lg"
                className="w-full py-6 text-lg font-semibold"
                disabled={isLoading}
              >
                {isLoading ? "Criando conta..." : "Criar minha conta"}
              </Button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <p className="text-muted-foreground">
              Já tem uma conta?{" "}
              <Link href="/userprofile/login" className="text-primary font-semibold hover:underline">
                Entrar
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}

