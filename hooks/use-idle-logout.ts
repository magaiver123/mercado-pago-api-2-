"use client"

import { useEffect, useRef } from "react"
import { useRouter, usePathname } from "next/navigation"
import { clearAuthUser } from "@/lib/auth-store"
import { useCartStore } from "@/lib/cart-store"

const IDLE_TIME_MS = 30_000 // 10 segundos (depois você ajusta)

const EXCLUDED_ROUTES = [
  "/checkout",
  "/payment/processing",
  "/payment/success",
  "/payment/error",
]

export function useIdleLogout() {
  const router = useRouter()
  const pathname = usePathname()
  const clearCart = useCartStore((s) => s.clearCart)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // ⛔ não roda nas rotas excluídas
    if (EXCLUDED_ROUTES.some((route) => pathname.startsWith(route))) {
      return
    }

    const resetTimer = () => {
      if (timerRef.current) clearTimeout(timerRef.current)

      timerRef.current = setTimeout(() => {
        clearCart()
        clearAuthUser()
        router.push("/")
      }, IDLE_TIME_MS)
    }

    // eventos que contam como interação
    const events = ["mousemove", "mousedown", "keydown", "touchstart"]

    events.forEach((event) => {
      window.addEventListener(event, resetTimer)
    })

    // inicia o timer
    resetTimer()

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      events.forEach((event) => {
        window.removeEventListener(event, resetTimer)
      })
    }
  }, [pathname, router, clearCart])
}
