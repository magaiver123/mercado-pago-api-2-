"use client"

import { useRef, useState } from "react"
import { motion } from "framer-motion"
import { Menu, X } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

const navItems = [
  { label: "Inicio", href: "#inicio" },
  { label: "Como comprar", href: "#como-comprar" },
  { label: "Ajuda", href: "#ajuda" },
]

export function UserprofileLandingNavbar() {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const navRef = useRef<HTMLDivElement>(null)

  return (
    <motion.header
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-3xl"
    >
      <nav
        ref={navRef}
        className="relative flex items-center justify-between px-4 py-3 rounded-full bg-zinc-900/40 backdrop-blur-md border border-zinc-800"
      >
        <a href="#inicio" className="flex items-center gap-2">
          <img src="/LOGOMR.png" alt="Mr Smart" className="w-9 h-9 object-contain" />
          <span className="font-semibold hidden sm:block">
            <span className="text-orange-500">Mr</span>
            <span className="text-white"> Smart</span>
          </span>
        </a>

        <div className="hidden md:flex items-center gap-1 relative">
          {navItems.map((item, index) => (
            <a
              key={item.label}
              href={item.href}
              className="relative px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {hoveredIndex === index && (
                <motion.div
                  layoutId="userprofile-navbar-hover"
                  className="absolute inset-0 bg-zinc-800 rounded-full"
                  initial={false}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
              <span className="relative z-10">{item.label}</span>
            </a>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <Link href="/userprofile/login">
            <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white hover:bg-zinc-800">
              Entrar
            </Button>
          </Link>
          <Link href="/userprofile/cadastro">
            <Button size="sm" className="up-shimmer-btn bg-orange-500 text-white hover:bg-orange-600 rounded-full px-4">
              Cadastrar
            </Button>
          </Link>
        </div>

        <button
          className="md:hidden p-2 text-zinc-400 hover:text-white"
          onClick={() => setMobileMenuOpen((prev) => !prev)}
          aria-label="Alternar menu"
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>

      {mobileMenuOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-full left-0 right-0 mt-2 p-4 rounded-2xl bg-zinc-900/95 backdrop-blur-md border border-zinc-800"
        >
          <div className="flex flex-col gap-2">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="px-4 py-3 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.label}
              </a>
            ))}
            <hr className="border-zinc-800 my-2" />
            <Link href="/userprofile/login" onClick={() => setMobileMenuOpen(false)}>
              <Button variant="ghost" className="w-full justify-start text-zinc-400 hover:text-white">
                Entrar
              </Button>
            </Link>
            <Link href="/userprofile/cadastro" onClick={() => setMobileMenuOpen(false)}>
              <Button className="w-full up-shimmer-btn bg-orange-500 text-white hover:bg-orange-600 rounded-full">
                Cadastrar
              </Button>
            </Link>
          </div>
        </motion.div>
      )}
    </motion.header>
  )
}
