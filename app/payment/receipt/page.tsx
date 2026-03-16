"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { ReceiptPreview } from "@/components/ReceiptPreview"
import {
  clearReceiptFromSession,
  getReceiptFromSession,
} from "@/lib/receipt-types"
import { clearAuthUser } from "@/lib/auth-store"

export default function ReceiptPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlOrderId = searchParams.get("orderId")

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [hasInteracted, setHasInteracted] = useState(false)
  const [isPrinting, setIsPrinting] = useState(false)
  const [receiptLoaded, setReceiptLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [receipt] = useState(() => getReceiptFromSession())

  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!receipt) {
      setError("Não encontramos os dados do comprovante deste pedido.")
      // volta para a tela de sucesso genérica após alguns segundos
      const id = setTimeout(() => {
        router.push("/payment/success")
      }, 4000)
      return () => clearTimeout(id)
    }

    if (urlOrderId && receipt.orderId !== urlOrderId) {
      // se o orderId não bater, ainda assim mostramos o comprovante mais recente
      console.warn(
        "[receipt] orderId from URL does not match stored receipt orderId",
      )
    }

    setReceiptLoaded(true)

    timeoutRef.current = setTimeout(() => {
      finishFlow()
    }, 180000)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, urlOrderId])

  const finishFlow = () => {
    clearAuthUser()
    clearReceiptFromSession()
    router.push("/")
  }

  const cancelAutoTimeout = () => {
    setHasInteracted(true)
  }

  const handleViewReceipt = () => {
    cancelAutoTimeout()
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
  }

  const handlePrint = () => {
    if (!receipt || isPrinting) return
    cancelAutoTimeout()
    setIsPrinting(true)

    try {
      window.print()
    } finally {
      setTimeout(() => {
        setIsPrinting(false)
      }, 4000)
    }
  }

  if (!receiptLoaded && !error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white p-4">
        <p className="text-black/80">Carregando comprovante...</p>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f3f1ee] p-6">
      <div className="w-full max-w-3xl space-y-10">
        <div className="flex justify-center">
          <Image
            src="/logo.svg"
            alt="Logo"
            width={180}
            height={60}
            className="h-16 w-auto"
          />
        </div>

        <div className="space-y-3 text-center">
          <h1 className="text-4xl font-bold text-black">
            Pronto
            {receipt?.customerName ? `, ${receipt.customerName}` : ","}
          </h1>
          <p className="text-xl font-bold text-black">
            Aqui está o seu comprovante
          </p>
          {receipt?.orderId && (
            <p className="text-sm font-semibold text-orange-500">
              Nº do pedido: {receipt.orderId}
            </p>
          )}
          <p className="mt-3 text-base font-medium text-black/80">
            Abra a geladeira e retire os itens do seu pedido
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <button
            onClick={handleViewReceipt}
            className="flex aspect-square flex-col items-center justify-center gap-4 rounded-2xl border-2 border-orange-500 bg-white p-6 text-center shadow-sm transition hover:border-orange-600 hover:shadow-md"
          >
            <div className="relative h-20 w-20">
              <Image
                src="/receipt/10.svg"
                alt="Ver Nota"
                fill
                className="object-contain"
              />
            </div>
            <h2 className="text-2xl font-semibold text-black">Ver Nota</h2>
          </button>

          <button
            onClick={handlePrint}
            className="flex aspect-square flex-col items-center justify-center gap-4 rounded-2xl border-2 border-orange-500 bg-orange-500 p-6 text-center text-white shadow-sm transition hover:bg-orange-600 hover:shadow-md"
          >
            <div className="relative h-20 w-20">
              <Image
                src="/receipt/11.svg"
                alt="Imprimir Nota"
                fill
                className="object-contain"
              />
            </div>
            <h2 className="text-2xl font-semibold">Imprimir Nota</h2>
            <div className="text-xs text-white/90">
              {isPrinting ? "Enviando para impressão..." : "Toque para imprimir"}
            </div>
          </button>
        </div>

        {error && (
          <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-center text-sm text-red-700">
            {error}
          </div>
        )}

        {!hasInteracted && (
          <p className="text-center text-xs text-black/60">
            Se você não tocar na tela, retornaremos automaticamente ao início
            em 3 minutos.
          </p>
        )}
      </div>

      <div id="printable-receipt" className="pointer-events-none fixed inset-0 z-[-1] flex items-center justify-center p-4">
        {receipt && <ReceiptPreview receipt={receipt} />}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto bg-white p-6">
          {receipt && <ReceiptPreview receipt={receipt} />}
          <div className="mt-4 flex justify-center">
            <Button
              variant="outline"
              className="border-orange-500 text-orange-600 hover:bg-orange-50"
              onClick={handleCloseModal}
            >
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="fixed inset-x-0 bottom-0 flex justify-center bg-gradient-to-t from-[#f3f1ee] via-[#f3f1ee]/95 to-transparent pb-8 pt-4">
        <Button
          size="lg"
          className="h-14 min-w-[260px] rounded-full bg-orange-500 text-lg font-semibold text-white shadow-md hover:bg-orange-600"
          onClick={finishFlow}
        >
          Finalizar pedido
        </Button>
      </div>
    </main>
  )
}

