"use client";

import { Button } from "@/components/ui/button";
import { X, Plus, Minus, Trash2, ShoppingBag } from "lucide-react";
import { useCartStore } from "@/lib/cart-store";
import Image from "next/image";
import { toast } from "@/components/ui/use-toast";

interface CartProps {
  isOpen: boolean;
  onClose: () => void;
  onCheckout: () => void;
}

export function Cart({ isOpen, onClose, onCheckout }: CartProps) {
  const { items, updateQuantity, removeItem, getTotal, clearCart } =
    useCartStore();
  const total = getTotal();

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-zinc-950/55 backdrop-blur-[1.5px]" onClick={onClose} />

      <aside className="fixed bottom-0 right-0 top-0 z-50 flex w-full max-w-sm flex-col bg-[#faf7f3] shadow-[0_20px_60px_rgba(0,0,0,0.3)] sm:max-w-md">
        <header className="border-b border-[#e7d7c3] bg-white px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="rounded-full bg-orange-100 p-2 text-orange-600">
                <ShoppingBag className="h-5 w-5" />
              </span>
              <div>
                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                  Pedido
                </p>
                <h2 className="text-2xl font-bold leading-none tracking-[-0.02em] text-[#4a2a1d]">
                  Sua sacola
                </h2>
              </div>
            </div>

            <button
              onClick={onClose}
              className="rounded-full border border-zinc-200 bg-white p-2 text-zinc-600 transition hover:border-orange-300 hover:text-orange-600"
              aria-label="Fechar carrinho"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
            <span className="mb-4 rounded-full bg-orange-100 p-4 text-orange-500">
              <ShoppingBag className="h-10 w-10" />
            </span>
            <p className="text-lg font-bold text-[#4a2a1d]">Sua sacola esta vazia</p>
            <p className="mt-2 text-sm font-medium text-zinc-500">
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
            <section className="flex-1 space-y-3 overflow-y-auto px-4 py-4 sm:px-6">
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
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
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
                              const success = updateQuantity(item.id, item.quantity + 1);

                              if (!success) {
                                toast({
                                  title: "Estoque maximo atingido",
                                  description: `Disponivel: ${item.stock} unidade(s).`,
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
                        R$ {(item.price * item.quantity).toFixed(2).replace(".", ",")}
                      </p>
                    </div>
                  </div>
                </article>
              ))}

              <Button
                onClick={clearCart}
                variant="outline"
                className="w-full rounded-full border-red-300 text-red-600 hover:bg-red-500 hover:text-white"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Limpar carrinho
              </Button>
            </section>

            <footer className="border-t border-[#e7d7c3] bg-white px-4 py-4 sm:px-6 sm:py-5">
              <div className="mb-4 flex items-center justify-between rounded-2xl border border-[#e7d7c3] bg-[#faf7f3] px-4 py-3">
                <span className="text-sm font-semibold uppercase tracking-[0.08em] text-zinc-500">
                  Subtotal
                </span>
                <span className="text-2xl font-bold tracking-[-0.02em] text-[#4a2a1d]">
                  R$ {total.toFixed(2).replace(".", ",")}
                </span>
              </div>

              <Button
                onClick={onCheckout}
                size="lg"
                className="h-14 w-full rounded-full bg-orange-500 text-lg font-bold text-white shadow-[0_14px_28px_rgba(249,115,22,0.32)] hover:bg-orange-600"
              >
                Finalizar pedido
              </Button>
            </footer>
          </>
        )}
      </aside>
    </>
  );
}
