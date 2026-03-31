"use client";

import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  ChevronDown,
  Minus,
  Plus,
  RotateCcw,
  ShoppingBag,
  Trash2,
} from "lucide-react";
import { useCartStore } from "@/lib/cart-store";
import Image from "next/image";
import { toast } from "@/components/ui/use-toast";

interface CartProps {
  isOpen: boolean;
  onClose: () => void;
  onCheckout: () => void;
  onRestartOrder: () => void;
}

export function Cart({
  isOpen,
  onClose,
  onCheckout,
  onRestartOrder,
}: CartProps) {
  const { items, updateQuantity, removeItem, getTotal, clearCart } =
    useCartStore();
  const total = getTotal();

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[1px]"
        onClick={onClose}
      />

      <aside className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-[74rem] px-2 sm:px-4">
        <div className="flex h-[min(92vh,48rem)] flex-col overflow-hidden rounded-t-[2rem] bg-[#f2e9dc] shadow-[0_-28px_60px_rgba(0,0,0,0.42)]">
          <header className="border-b border-[#dfcfba] bg-[#efe2d1] px-4 py-3 sm:px-6 sm:py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-orange-100 p-2 text-orange-600">
                  <ShoppingBag className="h-5 w-5" />
                </span>
                <h2 className="text-[2rem] font-bold leading-none tracking-[-0.03em] text-[#4b2b1e] sm:text-[2.2rem]">
                  Sua sacola
                </h2>
              </div>

              <button
                onClick={onClose}
                className="rounded-full p-2 text-[#6f4833] transition hover:bg-[#e8d7c3]"
                aria-label="Fechar sacola"
              >
                <ChevronDown className="h-6 w-6" />
              </button>
            </div>
          </header>

          {items.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center px-6 py-10 text-center">
              <span className="mb-4 rounded-full bg-orange-100 p-4 text-orange-500">
                <ShoppingBag className="h-10 w-10" />
              </span>
              <p className="text-xl font-bold text-[#4a2a1d]">Sua sacola esta vazia</p>
              <p className="mt-2 text-sm font-medium text-zinc-600">
                Adicione itens no menu para continuar.
              </p>
              <Button
                onClick={onClose}
                variant="outline"
                className="mt-6 rounded-full border-orange-300 px-6 text-orange-600 hover:bg-orange-500 hover:text-white"
              >
                Voltar ao menu
              </Button>
            </div>
          ) : (
            <>
              <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-5 pt-4 sm:px-6">
                <section className="rounded-2xl bg-[#f8f3eb] p-3 shadow-[0_10px_24px_rgba(0,0,0,0.08)] sm:p-4">
                  <div className="mb-3 flex items-center justify-end">
                    <button
                      onClick={clearCart}
                      className="inline-flex items-center gap-2 rounded-full border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-500 hover:text-white"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Limpar sacola
                    </button>
                  </div>

                  <div className="max-h-[35vh] space-y-3 overflow-y-auto pr-1">
                    {items.map((item) => (
                      <article
                        key={item.id}
                        className="rounded-2xl border border-[#e7d7c3] bg-white p-3 shadow-[0_8px_18px_rgba(0,0,0,0.05)]"
                      >
                        <div className="flex gap-3">
                          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-orange-50">
                            <Image
                              src={item.image_url || "/placeholder.svg"}
                              alt={item.name}
                              fill
                              className="object-contain p-1.5"
                            />
                          </div>

                          <div className="min-w-0 flex-1">
                            <h3 className="truncate text-[1rem] font-bold text-[#4a2a1d]">
                              {item.name}
                            </h3>
                            <p className="mt-1 text-sm font-semibold text-zinc-500">
                              R$ {item.price.toFixed(2).replace(".", ",")}
                            </p>

                            <div className="mt-3 flex items-center justify-between gap-2">
                              <div className="flex items-center rounded-full border border-[#f0c9ab] bg-orange-50">
                                <button
                                  onClick={() =>
                                    updateQuantity(item.id, item.quantity - 1)
                                  }
                                  className="rounded-l-full p-2 text-orange-600 transition hover:bg-orange-100"
                                  aria-label={`Diminuir quantidade de ${item.name}`}
                                >
                                  <Minus className="h-4 w-4" />
                                </button>

                                <span className="w-8 text-center text-sm font-bold text-[#4a2a1d]">
                                  {item.quantity}
                                </span>

                                <button
                                  onClick={() => {
                                    const success = updateQuantity(
                                      item.id,
                                      item.quantity + 1
                                    );

                                    if (!success) {
                                      toast({
                                        title: "Estoque máximo atingido",
                                        description: `Disponível: ${item.stock} unidade(s).`,
                                        variant: "warning",
                                      });
                                    }
                                  }}
                                  className={`rounded-r-full p-2 text-orange-600 transition ${
                                    item.quantity >= item.stock
                                      ? "opacity-45"
                                      : "hover:bg-orange-100"
                                  }`}
                                  aria-label={`Aumentar quantidade de ${item.name}`}
                                >
                                  <Plus className="h-4 w-4" />
                                </button>
                              </div>

                              <button
                                onClick={() => removeItem(item.id)}
                                className="rounded-full p-2 text-red-500 transition hover:bg-red-50"
                                aria-label={`Remover ${item.name}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>

                          <div className="text-right">
                            <p className="text-sm font-bold text-zinc-700">Total</p>
                            <p className="text-base font-bold text-[#4a2a1d]">
                              R${" "}
                              {(item.price * item.quantity)
                                .toFixed(2)
                                .replace(".", ",")}
                            </p>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>

              </div>

              <footer className="border-t border-[#dcc9b2] bg-[#efe2d1] px-4 py-4 sm:px-6">
                <div className="mb-4 flex items-center justify-between border-b border-[#dcc9b2] pb-3">
                  <span className="text-[1.4rem] font-semibold text-[#4a2a1d]">
                    Total
                  </span>
                  <span className="text-[2.25rem] font-black leading-none tracking-[-0.03em] text-[#4a2a1d]">
                    R$ {total.toFixed(2).replace(".", ",")}
                  </span>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <Button
                    variant="link"
                    onClick={onClose}
                    className="h-auto justify-start px-0 text-base font-bold text-[#bb4f1a] underline underline-offset-4 hover:text-[#9d3f12]"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Voltar
                  </Button>

                  <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[17rem]">
                    <Button
                      onClick={onCheckout}
                      size="lg"
                      className="h-12 rounded-full bg-orange-500 text-lg font-bold text-white shadow-[0_14px_28px_rgba(249,115,22,0.32)] hover:bg-orange-600"
                    >
                      Pagar pedido
                    </Button>

                    <Button
                      variant="link"
                      onClick={onRestartOrder}
                      className="h-auto justify-center px-0 text-base font-bold text-[#bb4f1a] underline underline-offset-4 hover:text-[#9d3f12]"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Recomecar pedido
                    </Button>
                  </div>
                </div>
              </footer>
            </>
          )}
        </div>
      </aside>
    </>
  );
}
