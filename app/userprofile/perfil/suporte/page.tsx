"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { ChevronRight, HelpCircle, MessageCircle } from "lucide-react"
import { clearUserprofileAuthUser, getUserprofileAuthUser } from "@/lib/userprofile-auth-store"
import { UserprofilePerfilShell } from "@/components/userprofile/perfil-shell"

const WHATSAPP_URL = "https://wa.me/message/EC3OBFDLFSMTH1"

const faqItems = [
  "Como usar o totem de autoatendimento?",
  "Posso cancelar um pedido?",
  "Como alterar meus dados cadastrais?",
  "Quais formas de pagamento sao aceitas?",
]

export default function SuportePage() {
  const router = useRouter()
  const [isAuthorized, setIsAuthorized] = useState(false)

  useEffect(() => {
    const user = getUserprofileAuthUser()
    if (!user) {
      router.replace("/userprofile/login")
      return
    }

    setIsAuthorized(true)
  }, [router])

  function handleLogout() {
    clearUserprofileAuthUser()
    router.replace("/userprofile")
  }

  if (!isAuthorized) return null

  return (
    <UserprofilePerfilShell
      title="Central de Suporte"
      description="Estamos aqui para ajudar. Fale com nosso time e encontre respostas para as duvidas mais comuns."
      onLogout={handleLogout}
    >
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.08 }}
        className="grid gap-5 lg:grid-cols-[1.2fr_1fr]"
      >
        <section className="rounded-3xl border border-zinc-800 bg-zinc-900/45 p-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-500/15">
              <HelpCircle className="h-6 w-6 text-orange-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Contato Rapido</h2>
              <p className="text-sm text-zinc-400">Atendimento direto pelo WhatsApp.</p>
            </div>
          </div>

          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="group block rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5 transition-colors hover:border-green-500/35 hover:bg-zinc-900"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-green-500/15 text-green-400 transition-colors group-hover:bg-green-500/25">
              <MessageCircle className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold text-white">WhatsApp</h3>
            <p className="mt-1 text-sm text-zinc-400">51 99588-1730</p>
            <p className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-green-400">
              Iniciar conversa
              <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </p>
          </a>
        </section>

        <section className="rounded-3xl border border-zinc-800 bg-zinc-900/45 p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">Perguntas Frequentes</h2>
          <div className="space-y-2">
            {faqItems.map((question, index) => (
              <motion.button
                key={question}
                type="button"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.12 + index * 0.05 }}
                className="flex w-full items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950/75 px-4 py-3 text-left transition-colors hover:border-zinc-700 hover:bg-zinc-900"
              >
                <span className="text-sm text-zinc-200">{question}</span>
                <ChevronRight className="h-4 w-4 shrink-0 text-zinc-500" />
              </motion.button>
            ))}
          </div>
        </section>
      </motion.div>
    </UserprofilePerfilShell>
  )
}
