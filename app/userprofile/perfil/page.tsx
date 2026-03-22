"use client"

import { useEffect, useState, type ReactNode } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { ChevronRight, ClipboardList, Headphones, Mail, Phone, Printer, UserCog } from "lucide-react"
import {
  clearUserprofileAuthUser,
  getUserprofileAuthUser,
  setUserprofileAuthUser,
  type UserprofileUser,
} from "@/lib/userprofile-auth-store"
import { UserprofilePerfilShell } from "@/components/userprofile/perfil-shell"

const menuItems = [
  {
    title: "Histórico de Pedidos",
    description: "Acompanhe compras anteriores e status de cada pedido.",
    href: "/userprofile/perfil/pedidos",
    icon: ClipboardList,
  },
  {
    title: "Dados Cadastrais",
    description: "Atualize telefone, e-mail e informações da sua conta.",
    href: "/userprofile/perfil/dados",
    icon: UserCog,
  },
  {
    title: "Suporte",
    description: "Precisa de ajuda? Fale com nossa equipe de atendimento.",
    href: "/userprofile/perfil/suporte",
    icon: Headphones,
  },
]

export default function PerfilPage() {
  const router = useRouter()
  const [user, setUser] = useState<UserprofileUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const currentUser = getUserprofileAuthUser()
    if (!currentUser) {
      router.replace("/userprofile/login")
      return
    }

    const userId = currentUser.id
    setUser(currentUser)

    async function loadUser() {
      try {
        const response = await fetch(`/api/userprofile/me?userId=${userId}`)
        const data = await response.json().catch(() => null)

        if (response.status === 401 || response.status === 404) {
          clearUserprofileAuthUser()
          router.replace("/userprofile/login")
          return
        }

        if (!response.ok || !data) return

        const refreshedUser: UserprofileUser = {
          id: data.id,
          name: data.name ?? null,
          cpf: data.cpf ?? null,
          phone: data.phone ?? null,
          email: data.email,
          role: data.role ?? null,
        }

        setUser(refreshedUser)
        setUserprofileAuthUser(refreshedUser)
      } finally {
        setIsLoading(false)
      }
    }

    loadUser()
  }, [router])

  function handleLogout() {
    clearUserprofileAuthUser()
    router.replace("/userprofile")
  }

  if (isLoading && !user) return null

  const visibleMenuItems =
    user?.role === "admin"
      ? [
          ...menuItems,
          {
            title: "Impressoras dos Totens",
            description:
              "Vincule impressoras termicas por totem e acompanhe jobs de impressao.",
            href: "/userprofile/perfil/impressoras",
            icon: Printer,
          },
        ]
      : menuItems

  return (
    <UserprofilePerfilShell
      title={`Olá${user?.name ? `, ${user.name}` : ""}`}
      description="Bem-vindo ao seu painel. Gerencie pedidos, dados cadastrais e suporte em um único lugar."
      onLogout={handleLogout}
    >
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.05 }}
        className="mb-6 grid gap-3 sm:grid-cols-2"
      >
        <QuickInfo icon={<Mail className="h-4 w-4 text-orange-400" />} label="E-mail" value={user?.email ?? "--"} />
        <QuickInfo
          icon={<Phone className="h-4 w-4 text-orange-400" />}
          label="Telefone"
          value={user?.phone || "Não informado"}
        />
      </motion.section>

      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.45, delay: 0.12 }}
        className="grid gap-4 lg:grid-cols-3"
      >
        {visibleMenuItems.map((item, index) => (
          <motion.div
            key={item.href}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.16 + index * 0.07 }}
          >
            <Link
              href={item.href}
              className="group block h-full rounded-2xl border border-zinc-800 bg-zinc-900/45 p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-orange-500/40 hover:bg-zinc-900/80"
            >
              <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500/12 text-orange-400 transition-colors group-hover:bg-orange-500/20">
                <item.icon className="h-6 w-6" />
              </div>
              <h2 className="text-lg font-semibold text-white">{item.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">{item.description}</p>
              <div className="mt-5 flex items-center gap-2 text-sm font-medium text-orange-400">
                Acessar
                <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </Link>
          </motion.div>
        ))}
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.22 }}
        className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/45 p-5"
      >
        <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Segurança da conta</h3>
        <button
          type="button"
          className="mt-3 inline-flex items-center rounded-full border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-300 transition-colors hover:bg-red-500/15"
        >
          Excluir minha conta
        </button>
      </motion.section>
    </UserprofilePerfilShell>
  )
}

function QuickInfo({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/45 p-4 sm:p-5">
      <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wide text-zinc-500">
        {icon}
        {label}
      </div>
      <p className="truncate text-sm sm:text-base text-zinc-200">{value}</p>
    </div>
  )
}
