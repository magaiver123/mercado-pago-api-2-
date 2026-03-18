"use client"

import { useState, type ReactNode } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion } from "framer-motion"
import { LogOut, Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"

const navItems = [
  { label: "Conta", href: "/userprofile/perfil" },
  { label: "Dados", href: "/userprofile/perfil/dados" },
  { label: "Pedidos", href: "/userprofile/perfil/pedidos" },
  { label: "Suporte", href: "/userprofile/perfil/suporte" },
]

function isActivePath(pathname: string, href: string) {
  if (href === "/userprofile/perfil") return pathname === href
  return pathname === href || pathname.startsWith(`${href}/`)
}

type UserprofilePerfilShellProps = {
  title: string
  description: string
  onLogout: () => void
  children: ReactNode
}

export function UserprofilePerfilShell({ title, description, onLogout, children }: UserprofilePerfilShellProps) {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <main className="relative min-h-screen bg-zinc-950 text-white userprofile-theme overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-zinc-950 via-zinc-950 to-zinc-900 pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[620px] bg-zinc-800/30 rounded-full blur-3xl pointer-events-none" />
      <div className="up-noise-overlay" aria-hidden="true" />

      <motion.header
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-1.5rem)] max-w-6xl"
      >
        <nav className="relative flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-900/60 px-3 sm:px-4 py-3 backdrop-blur-md">
          <Link href="/userprofile/perfil" className="flex items-center gap-2">
            <img src="/LOGOMR.png" alt="Mr Smart" className="h-9 w-9 object-contain" />
            <span className="hidden sm:block font-semibold">
              <span className="text-orange-500">Mr</span>
              <span className="text-white"> Smart</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-1 rounded-full border border-zinc-800 bg-zinc-950/70 p-1">
            {navItems.map((item) => {
              const active = isActivePath(pathname, item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative rounded-full px-4 py-2 text-sm transition-colors ${
                    active ? "text-white" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="up-profile-active-link"
                      className="absolute inset-0 rounded-full border border-orange-500/40 bg-orange-500/15"
                      transition={{ type: "spring", stiffness: 500, damping: 35 }}
                    />
                  )}
                  <span className="relative z-10">{item.label}</span>
                </Link>
              )
            })}
          </div>

          <div className="hidden md:flex items-center">
            <Button
              type="button"
              variant="ghost"
              onClick={onLogout}
              className="rounded-full border border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:bg-zinc-800 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </Button>
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="md:hidden rounded-xl p-2 text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white"
            aria-label="Alternar menu de navegacao"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </nav>

        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-2 rounded-2xl border border-zinc-800 bg-zinc-900/95 p-3 backdrop-blur-md md:hidden"
          >
            <div className="space-y-1">
              {navItems.map((item) => {
                const active = isActivePath(pathname, item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`block rounded-xl px-4 py-3 text-sm transition-colors ${
                      active
                        ? "border border-orange-500/40 bg-orange-500/10 text-white"
                        : "text-zinc-300 hover:bg-zinc-800 hover:text-white"
                    }`}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </div>
            <div className="mt-3 border-t border-zinc-800 pt-3">
              <Button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false)
                  onLogout()
                }}
                className="w-full rounded-full bg-orange-500 text-white hover:bg-orange-600 up-shimmer-btn"
              >
                <LogOut className="h-4 w-4" />
                Sair da conta
              </Button>
            </div>
          </motion.div>
        )}
      </motion.header>

      <section className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-10 pt-28 sm:pt-32">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8 rounded-3xl border border-zinc-800 bg-zinc-900/55 p-5 sm:p-7 shadow-2xl shadow-black/30"
        >
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">{title}</h1>
          <p className="mt-2 max-w-2xl text-sm sm:text-base text-zinc-400">{description}</p>
        </motion.div>

        {children}
      </section>
    </main>
  )
}
