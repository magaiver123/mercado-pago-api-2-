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
  const [isPrinting, setIsPrinting] = useState(false)
  const [receiptLoaded, setReceiptLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [receipt] = useState(() => getReceiptFromSession())

  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!receipt) {
      setError("Nao encontramos os dados do comprovante deste pedido.")
      const id = setTimeout(() => {
        router.push("/payment/success")
      }, 4000)
      return () => clearTimeout(id)
    }

    if (urlOrderId && receipt.orderId !== urlOrderId) {
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

  const handleViewReceipt = () => {
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
  }

  const handlePrint = () => {
    if (!receipt || isPrinting) return
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
    <main className="flex min-h-[100svh] w-full flex-col bg-[#f3f1ee] px-4 pb-5 pt-5">
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col">
        <div className="flex justify-center pt-1">
          <Image
            src="/logo.svg"
            alt="Logo"
            width={220}
            height={72}
            className="h-14 w-auto sm:h-16"
          />
        </div>

        <div className="mt-6 space-y-2 text-center">
          <h1 className="text-[clamp(2rem,5vw,3.4rem)] font-black leading-[0.97] text-black">
            <span className="block">
              Pronto{receipt?.customerName ? `, ${receipt.customerName}!` : "!"}
            </span>
            <span className="block">Aqui está o seu comprovante.</span>
          </h1>
          {receipt?.orderId && (
            <p className="text-xl font-black text-orange-500 sm:text-2xl">
              N° do pedido: {receipt.orderId}
            </p>
          )}
          <p className="mx-auto max-w-2xl pt-2 text-lg font-medium text-black/80 sm:text-2xl">
            Abra a geladeira e pegue os itens do seu pedido
          </p>
        </div>

        <div className="mx-auto mt-8 grid w-full max-w-2xl grid-cols-2 gap-4 md:mt-10 md:gap-8">
          <button
            type="button"
            onClick={handleViewReceipt}
            className="group flex aspect-square w-full flex-col items-center justify-center gap-3 rounded-[28px] border border-black/15 bg-white p-5 text-center shadow-[0_12px_34px_rgba(0,0,0,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(0,0,0,0.13)]"
          >
            <div className="relative h-20 w-20 sm:h-24 sm:w-24">
              <Image
                src="/receipt/view-note.svg"
                alt="Ver Nota"
                fill
                className="object-contain"
              />
            </div>
            <h2 className="text-2xl font-black text-black sm:text-3xl">
              Ver Nota
            </h2>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="group flex aspect-square w-full flex-col items-center justify-center gap-3 rounded-[28px] border border-black/15 bg-white p-5 text-center shadow-[0_12px_34px_rgba(0,0,0,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(0,0,0,0.13)]"
          >
            <div className="relative h-20 w-20 sm:h-24 sm:w-24">
              <Image
                src="/receipt/print-note.svg"
                alt="Imprimir Nota"
                fill
                className="object-contain"
              />
            </div>
            <h2 className="text-2xl font-black text-black sm:text-3xl">
              Imprimir Nota
            </h2>
            <div className="text-xs font-medium text-orange-600 sm:text-sm">
              {isPrinting ? "Enviando para impressao..." : "Toque para imprimir"}
            </div>
          </button>
        </div>

        {error && (
          <div className="mx-auto mt-4 w-full max-w-2xl rounded-lg border border-red-300 bg-red-50 p-4 text-center text-sm text-red-700">
            {error}
          </div>
        )}
      </div>

      <div
        id="printable-receipt"
        className="pointer-events-none fixed inset-0 z-[-1] flex items-center justify-center p-4"
      >
        {receipt && <ReceiptPreview receipt={receipt} />}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-h-[90vh] max-w-[420px] overflow-y-auto border-black/10 bg-white p-5 sm:max-w-[460px]">
          {receipt && <ReceiptPreview receipt={receipt} className="max-w-none" />}
          <div className="mt-4 flex justify-center">
            <Button
              variant="outline"
              className="h-11 min-w-[160px] rounded-full border-orange-500 text-orange-600 hover:bg-orange-50"
              onClick={handleCloseModal}
            >
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="mt-auto flex justify-center bg-gradient-to-t from-[#f3f1ee] via-[#f3f1ee]/95 to-transparent pb-2 pt-5">
        <Button
          size="lg"
          className="h-12 min-w-[250px] rounded-full bg-orange-500 text-base font-bold text-white shadow-md hover:bg-orange-600 sm:h-14 sm:min-w-[280px] sm:text-lg"
          onClick={finishFlow}
        >
          Finalizar pedido
        </Button>
      </div>
    </main>
  )
}
