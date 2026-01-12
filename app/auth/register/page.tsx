"use client"

import type React from "react"

import { createClient } from "@/lib/supabase/client"
import { validateCPF, formatCPF } from "@/lib/cpf-validator"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

export default function RegisterPage() {
  const [cpf, setCpf] = useState("")
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleCPFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "")
    if (value.length <= 11) {
      setCpf(value)
    }
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "")
    if (value.length <= 11) {
      setPhone(value)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    // Validate CPF
    if (!validateCPF(cpf)) {
      setError("CPF inválido")
      setIsLoading(false)
      return
    }

    // Validate phone
    if (phone.length < 10) {
      setError("Telefone inválido")
      setIsLoading(false)
      return
    }

    try {
      const supabase = createClient()

      // Check if CPF already exists
      const { data: existingUsers } = await supabase.from("users").select("cpf").eq("cpf", cpf).limit(1)

      if (existingUsers && existingUsers.length > 0) {
        setError("CPF já cadastrado")
        setIsLoading(false)
        return
      }

      // Insert new user
      const { error: insertError } = await supabase.from("users").insert({
        cpf,
        name,
        phone,
        email,
      })

      if (insertError) throw insertError

      // Redirect to login
      router.push("/auth/login?registered=true")
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Erro ao cadastrar")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-black p-6">
      <div className="w-full max-w-md">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-20 w-20 bg-white rounded-lg flex items-center justify-center">
              <div className="text-black font-bold text-xs">
                ALABAMA
                <br />
                COMIDARIA
                <br />
                <span className="text-[#E11D48]">Delivery</span>
              </div>
            </div>
            <CardTitle className="text-2xl text-white">Cadastro</CardTitle>
            <p className="text-zinc-400 text-sm mt-2">Preencha seus dados para cadastrar</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRegister}>
              <div className="flex flex-col gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="cpf" className="text-white">
                    CPF
                  </Label>
                  <Input
                    id="cpf"
                    type="text"
                    placeholder="000.000.000-00"
                    required
                    value={formatCPF(cpf)}
                    onChange={handleCPFChange}
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="name" className="text-white">
                    Nome Completo
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="João da Silva"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="phone" className="text-white">
                    Telefone
                  </Label>
                  <Input
                    id="phone"
                    type="text"
                    placeholder="(00) 00000-0000"
                    required
                    value={phone.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3")}
                    onChange={handlePhoneChange}
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="email" className="text-white">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seuemail@exemplo.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                </div>

                {error && <p className="text-sm text-red-500 text-center">{error}</p>}

                <Button
                  type="submit"
                  className="w-full bg-[#E11D48] hover:bg-[#BE123C] text-white"
                  disabled={isLoading}
                >
                  {isLoading ? "Cadastrando..." : "Cadastrar"}
                </Button>

                <div className="text-center">
                  <Link href="/auth/login">
                    <Button type="button" variant="ghost" className="text-zinc-400 hover:text-white">
                      Já tem cadastro? Fazer login
                    </Button>
                  </Link>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
