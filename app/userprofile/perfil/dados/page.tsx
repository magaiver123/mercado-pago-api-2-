"use client"

import { useEffect, useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Camera, CreditCard, Mail, Phone, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  clearUserprofileAuthUser,
  getUserprofileAuthUser,
  setUserprofileAuthUser,
  type UserprofileUser,
} from "@/lib/userprofile-auth-store"
import { UserprofilePerfilShell } from "@/components/userprofile/perfil-shell"

function formatCpf(value: string | null) {
  if (!value) return ""
  const digits = value.replace(/\D/g, "")
  if (digits.length !== 11) return value
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
}

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "")
  if (digits.length <= 10) return digits.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3").trim()
  return digits.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3").trim()
}

export default function DadosPage() {
  const router = useRouter()
  const [authUser, setAuthUser] = useState<UserprofileUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [name, setName] = useState("")
  const [cpf, setCpf] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")

  useEffect(() => {
    const currentUser = getUserprofileAuthUser()
    if (!currentUser) {
      router.replace("/userprofile/login")
      return
    }

    const userId = currentUser.id
    setAuthUser(currentUser)

    async function loadUserData() {
      try {
        const response = await fetch(`/api/userprofile/me?userId=${userId}`)
        const data = await response.json().catch(() => null)

        if (response.status === 401 || response.status === 404) {
          clearUserprofileAuthUser()
          router.replace("/userprofile/login")
          return
        }

        if (!response.ok || !data) {
          setError("Não foi possível carregar seus dados.")
          return
        }

        setName(data.name ?? "")
        setCpf(formatCpf(data.cpf ?? ""))
        setPhone(data.phone ?? "")
        setEmail(data.email ?? "")
      } catch {
        setError("Não foi possível carregar seus dados.")
      } finally {
        setIsLoading(false)
      }
    }

    loadUserData()
  }, [router])

  function handlePhoneChange(value: string) {
    const digits = value.replace(/\D/g, "")
    if (digits.length <= 11) setPhone(digits)
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSuccess(null)

    if (!authUser) {
      router.replace("/userprofile/login")
      return
    }

    try {
      setIsSaving(true)
      const response = await fetch("/api/userprofile/me", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: authUser.id,
          name,
          phone,
          email,
        }),
      })

      const data = await response.json().catch(() => null)

      if (response.status === 401 || response.status === 404) {
        clearUserprofileAuthUser()
        router.replace("/userprofile/login")
        return
      }

      if (!response.ok) {
        setError(data?.error || "Não foi possível salvar alterações.")
        return
      }

      const updatedUser: UserprofileUser = {
        id: data.user.id,
        name: data.user.name ?? null,
        cpf: data.user.cpf ?? null,
        phone: data.user.phone ?? null,
        email: data.user.email,
      }

      setAuthUser(updatedUser)
      setUserprofileAuthUser(updatedUser)
      setSuccess("Alterações salvas com sucesso.")
    } catch {
      setError("Não foi possível salvar alterações.")
    } finally {
      setIsSaving(false)
    }
  }

  function handleLogout() {
    clearUserprofileAuthUser()
    router.replace("/userprofile")
  }

  if (isLoading) return null

  return (
    <UserprofilePerfilShell
      title="Dados Cadastrais"
      description="Mantenha suas informações sempre atualizadas para uma experiência mais rápida e segura."
      onLogout={handleLogout}
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.06 }}
        className="grid gap-5 lg:grid-cols-[320px_1fr]"
      >
        <section className="rounded-3xl border border-zinc-800 bg-zinc-900/45 p-6">
          <h2 className="text-lg font-semibold text-white">Foto de Perfil</h2>
          <p className="mt-2 text-sm text-zinc-400">Personalize sua conta com uma imagem.</p>

          <div className="mt-6 flex flex-col items-center">
            <div className="relative">
              <div className="flex h-32 w-32 items-center justify-center rounded-full border border-dashed border-zinc-700 bg-zinc-950">
                <User className="h-12 w-12 text-zinc-500" />
              </div>
              <button
                type="button"
                className="absolute -bottom-1 -right-1 inline-flex h-10 w-10 items-center justify-center rounded-full bg-orange-500 text-white shadow-lg shadow-orange-500/25 transition-colors hover:bg-orange-600"
                aria-label="Adicionar foto"
              >
                <Camera className="h-4 w-4" />
              </button>
            </div>

            <p className="mt-4 text-center text-xs text-zinc-500">Toque no ícone para enviar uma foto de perfil.</p>
            <input type="file" id="profile-photo" accept="image/*" className="hidden" aria-label="Upload de foto de perfil" />
          </div>
        </section>

        <section className="rounded-3xl border border-zinc-800 bg-zinc-900/45 p-5 sm:p-6">
          <form className="space-y-4" onSubmit={handleSave}>
            <div className="space-y-2">
              <Label htmlFor="nome" className="text-zinc-300">
                Nome completo
              </Label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
                <Input
                  id="nome"
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="h-12 rounded-xl border-zinc-800 bg-zinc-950 pl-12 text-white placeholder:text-zinc-600 focus-visible:border-orange-500 focus-visible:ring-orange-500/25"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cpf" className="text-zinc-300">
                CPF
              </Label>
              <div className="relative">
                <CreditCard className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
                <Input
                  id="cpf"
                  type="text"
                  value={cpf}
                  className="h-12 rounded-xl border-zinc-800 bg-zinc-900/80 pl-12 text-zinc-300"
                  disabled
                />
              </div>
              <p className="text-xs text-zinc-500">O CPF não pode ser alterado.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefone" className="text-zinc-300">
                Telefone
              </Label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
                <Input
                  id="telefone"
                  type="tel"
                  value={formatPhone(phone)}
                  onChange={(event) => handlePhoneChange(event.target.value)}
                  className="h-12 rounded-xl border-zinc-800 bg-zinc-950 pl-12 text-white placeholder:text-zinc-600 focus-visible:border-orange-500 focus-visible:ring-orange-500/25"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-zinc-300">
                E-mail
              </Label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="h-12 rounded-xl border-zinc-800 bg-zinc-950 pl-12 text-white placeholder:text-zinc-600 focus-visible:border-orange-500 focus-visible:ring-orange-500/25"
                  required
                />
              </div>
            </div>

            {error && <p className="text-center text-sm text-red-400">{error}</p>}
            {success && <p className="text-center text-sm text-green-400">{success}</p>}

            <Button
              type="submit"
              disabled={isSaving}
              className="mt-2 h-12 w-full rounded-xl bg-orange-500 text-white shadow-lg shadow-orange-500/20 transition-colors hover:bg-orange-600 up-shimmer-btn"
            >
              {isSaving ? "Salvando..." : "Salvar alterações"}
            </Button>
          </form>
        </section>
      </motion.div>
    </UserprofilePerfilShell>
  )
}
