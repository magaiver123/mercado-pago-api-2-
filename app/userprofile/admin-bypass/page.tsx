"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"

export default function AdminBypassPage() {
  const router = useRouter()
  const hasRunRef = useRef(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (hasRunRef.current) return
    hasRunRef.current = true

    const params = new URLSearchParams(window.location.search)
    const storeSlug = params.get("store")
    const shouldDeactivate = params.get("off") === "1"

    async function run() {
      try {
        if (shouldDeactivate) {
          await fetch("/api/totem/admin-bypass/deactivate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          })

          router.replace("/userprofile")
          return
        }

        if (!storeSlug) {
          router.replace("/userprofile")
          return
        }

        const response = await fetch("/api/totem/admin-bypass/activate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ storeSlug }),
        })

        const data = await response.json().catch(() => null)

        if (!response.ok || data?.allowed !== true) {
          setError(data?.error ?? "Nao foi possivel ativar o modo de teste admin.")
          return
        }

        router.replace("/")
      } catch {
        setError("Erro ao ativar o modo de teste admin.")
      }
    }

    run()
  }, [router])

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-center">
        <h1 className="text-xl font-semibold text-foreground">Bypass Admin</h1>

        {error ? (
          <div className="mt-4 space-y-4">
            <p className="text-sm text-destructive">{error}</p>
            <Link href="/userprofile" className="text-sm text-primary hover:underline">
              Voltar para Userprofile
            </Link>
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">Processando solicitacao...</p>
        )}
      </div>
    </main>
  )
}
