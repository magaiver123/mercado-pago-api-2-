"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, ShoppingBag, TicketPercent } from "lucide-react";
import { useCartStore } from "@/lib/cart-store";
import { Cart } from "@/components/cart";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { getAuthUser, clearAuthUser } from "@/lib/auth-store";
import { useToast } from "@/components/ui/use-toast";

type Category = {
  id: string;
  name: string;
};

type Product = {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  image_url?: string | null;
  category_id: string;
  product_stock?: { quantity: number }[] | null;
};

export default function MenuPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [addedProductId, setAddedProductId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState("Cliente");
  const [loadingProducts, setLoadingProducts] = useState(false);

  const { addItem, getTotal, getItemCount, clearCart } = useCartStore();
  const router = useRouter();
  const { toast } = useToast();

  const selectedCategoryLabel = useMemo(
    () => categories.find((category) => category.id === selectedCategory)?.name,
    [categories, selectedCategory]
  );

  useEffect(() => {
    const user = getAuthUser();
    if (!user) {
      router.push("/auth/login");
      return;
    }

    const firstName = user.name?.trim().split(/\s+/)[0] || "Cliente";
    setCustomerName(firstName);
  }, [router]);

  useEffect(() => {
    async function loadCategories() {
      const response = await fetch("/api/menu/categories");
      const data = await response.json();
      const categoryList = Array.isArray(data) ? data : [];
      setCategories(categoryList);

      if (categoryList.length > 0) {
        setSelectedCategory((current) => current ?? categoryList[0].id);
      }
    }

    loadCategories();
  }, []);

  useEffect(() => {
    if (!selectedCategory) return;
    let active = true;

    async function loadProducts() {
      setLoadingProducts(true);
      const response = await fetch(
        `/api/menu/products?category_id=${selectedCategory}`
      );
      const data = await response.json();

      if (!active) return;
      setProducts(Array.isArray(data) ? data : []);
      setLoadingProducts(false);
    }

    loadProducts();
    return () => {
      active = false;
    };
  }, [selectedCategory]);

  const itemCount = getItemCount();
  const total = getTotal();

  const handleCheckout = () => {
    setIsCartOpen(false);
    router.push("/checkout");
  };

  const handleCancel = () => {
    clearCart();
    clearAuthUser();
    router.push("/");
  };

  const handleRewardsClick = () => {
    toast({
      title: "Em breve",
      description: "Resgate de recompensas ainda nao esta disponivel.",
    });
  };

  return (
    <div className="relative h-screen overflow-hidden bg-white p-2.5 sm:p-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(249,115,22,0.12),_transparent_52%)]" />
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-56 bg-gradient-to-t from-zinc-100/70 to-transparent" />

      <div className="relative mx-auto flex h-full w-full max-w-[1140px] min-h-0 flex-col overflow-hidden rounded-[2rem] border border-zinc-200/80 bg-white/90 shadow-[0_24px_60px_rgba(0,0,0,0.08)] backdrop-blur">
        <header className="border-b border-zinc-200/80">
          <section className="relative h-32 overflow-hidden sm:h-40">
            <Image
              src="/hot-dog-sandwich-snack-combo-meal-promotional-appe.jpg"
              alt="Banner promocional"
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-r from-zinc-900/88 via-zinc-900/55 to-orange-600/78" />
            <div className="relative flex h-full items-center justify-between px-4 sm:px-6">
              <div className="max-w-[72%]">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-orange-200 sm:text-[0.75rem]">
                  Autoatendimento
                </p>
                <h1 className="mt-1 text-[1.45rem] font-bold leading-[0.98] tracking-[-0.02em] text-white sm:text-[2rem]">
                  Monte seu pedido
                </h1>
              </div>

              <Image
                src="/logologin.png"
                alt="Logo Mr Smart"
                width={96}
                height={64}
                className="h-16 w-16 object-contain sm:h-20 sm:w-20"
                priority
              />
            </div>
          </section>

          <section className="grid gap-3 px-4 py-3 sm:grid-cols-[1fr_auto] sm:px-6">
            <div>
              <h2 className="text-[2rem] font-bold leading-none tracking-[-0.03em] text-[#3b2417] sm:text-[2.6rem]">
                Oi, {customerName}
                <span className="text-orange-500">!</span>
              </h2>
              <p className="mt-1 text-sm font-medium text-zinc-600 sm:text-base">
                Escolha sua categoria e adicione seus produtos
              </p>
            </div>

            <div className="flex items-start gap-2 sm:gap-3">
              <button
                type="button"
                onClick={handleRewardsClick}
                className="group flex w-[13.75rem] items-center gap-2 rounded-2xl border border-orange-200 bg-orange-50 px-3 py-2 text-left transition hover:bg-orange-100 sm:w-[16.5rem]"
              >
                <div className="rounded-full bg-orange-500 p-2 text-white">
                  <TicketPercent className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                    Cupons e recompensas
                  </p>
                  <p className="truncate text-xs font-semibold text-zinc-900 sm:text-sm">
                    Inserir codigo
                  </p>
                </div>
                <span className="rounded-full bg-orange-500 px-2.5 py-1 text-[0.62rem] font-semibold text-white transition group-hover:bg-orange-600">
                  Em breve
                </span>
              </button>

              <Button
                variant="outline"
                onClick={handleCancel}
                className="h-11 rounded-full border-2 border-orange-500 px-4 font-semibold text-orange-600 hover:bg-orange-500 hover:text-white"
              >
                Cancelar
              </Button>
            </div>
          </section>
        </header>

        <div className="min-h-0 flex-1 overflow-hidden">
          <div className="flex h-full min-h-0">
            <aside className="hidden w-[13.2rem] border-r border-zinc-200/80 bg-[#f4efe8] p-3 md:block">
              <nav className="space-y-1.5">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`w-full rounded-xl border px-3 py-3 text-left text-[0.95rem] font-semibold transition ${
                      selectedCategory === category.id
                        ? "border-[#5a2511] bg-[#5a2511] text-white shadow-[0_10px_22px_rgba(90,37,17,0.24)]"
                        : "border-[#e4d6c7] bg-white text-[#4a2a1d] hover:border-orange-300 hover:text-orange-700"
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </nav>
            </aside>

            <main className="min-h-0 flex-1 overflow-hidden bg-white">
              <div className="border-b border-zinc-200/80 px-3 py-3 md:hidden">
                <div className="hide-scrollbar flex gap-2 overflow-x-auto">
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                        selectedCategory === category.id
                          ? "border-[#5a2511] bg-[#5a2511] text-white"
                          : "border-zinc-300 bg-white text-zinc-700"
                      }`}
                    >
                      {category.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="h-full overflow-y-auto px-4 pb-36 pt-4 sm:px-6">
                <div className="sticky top-0 z-10 border-b border-zinc-100 bg-white/95 py-3 backdrop-blur">
                  <h3 className="text-[2rem] font-bold leading-none tracking-[-0.03em] text-[#3b2417]">
                    {selectedCategoryLabel ?? "Produtos"}
                  </h3>
                </div>

                {loadingProducts ? (
                  <p className="py-8 text-sm font-medium text-zinc-500">
                    Carregando produtos...
                  </p>
                ) : products.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3 pt-4 sm:gap-4 lg:grid-cols-3">
                    {products.map((product) => {
                      const stockData = Array.isArray(product.product_stock)
                        ? product.product_stock[0]
                        : product.product_stock;
                      const stockQty = stockData?.quantity ?? 0;
                      const isOutOfStock = stockQty <= 0;

                      return (
                        <button
                          key={product.id}
                          onClick={() => {
                            const success = addItem({
                              id: product.id,
                              name: product.name,
                              price: product.price,
                              image_url: product.image_url,
                              stock: stockQty,
                            });

                            if (!success) {
                              toast({
                                title: "Estoque insuficiente",
                                description:
                                  "Voce ja adicionou a quantidade maxima disponivel deste produto.",
                                variant: "warning",
                              });
                              return;
                            }

                            setAddedProductId(product.id);
                            setTimeout(() => setAddedProductId(null), 420);
                          }}
                          className={`relative overflow-hidden rounded-[1.35rem] border border-[#e8d6c1] bg-white text-left transition ${
                            isOutOfStock
                              ? "cursor-not-allowed"
                              : "hover:-translate-y-0.5 hover:border-orange-300 hover:shadow-[0_18px_26px_rgba(249,115,22,0.16)]"
                          } ${
                            addedProductId === product.id
                              ? "ring-2 ring-orange-400"
                              : ""
                          }`}
                        >
                          <div className="relative aspect-[5/4] border-b border-[#f2e5d6] bg-gradient-to-b from-zinc-50 to-white p-3">
                            <Image
                              src={product.image_url || "/placeholder.svg"}
                              alt={product.name}
                              fill
                              className={`object-contain p-2.5 ${
                                isOutOfStock ? "grayscale" : ""
                              }`}
                            />

                            {isOutOfStock && (
                              <>
                                <div className="absolute inset-0 bg-zinc-950/36" />
                                <span className="absolute right-2 top-2 rounded-full bg-[#f4b000] px-3 py-1 text-[0.62rem] font-bold uppercase tracking-[0.12em] text-zinc-900">
                                  Volto logo
                                </span>
                              </>
                            )}

                            {addedProductId === product.id && (
                              <div className="absolute inset-0 flex items-center justify-center bg-orange-500/20">
                                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-orange-500 text-white shadow-lg">
                                  <Check className="h-5 w-5" />
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="px-3 pb-3.5 pt-3 sm:px-4">
                            <h4
                              className={`line-clamp-2 text-[1.02rem] font-bold leading-tight ${
                                isOutOfStock ? "text-zinc-400" : "text-[#4a2a1d]"
                              }`}
                            >
                              {product.name}
                            </h4>
                            <p
                              className={`mt-2 text-[0.76rem] font-medium ${
                                isOutOfStock ? "text-zinc-400" : "text-zinc-500"
                              }`}
                            >
                              a partir
                            </p>
                            <p
                              className={`text-[1.36rem] font-bold leading-none tracking-[-0.02em] ${
                                isOutOfStock ? "text-zinc-400" : "text-zinc-900"
                              }`}
                            >
                              R$ {product.price.toFixed(2).replace(".", ",")}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="py-8 text-sm font-medium text-zinc-500">
                    Nenhum produto nesta categoria.
                  </p>
                )}
              </div>
            </main>
          </div>
        </div>

        <footer className="relative border-t border-[#e4d6c7] bg-[#f1e8dc] px-4 pb-4 pt-7 sm:px-6">
          {itemCount > 0 && (
            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="absolute -top-6 right-4 flex items-center gap-2 rounded-full bg-orange-500 px-4 py-2.5 text-lg font-bold text-white shadow-[0_14px_28px_rgba(249,115,22,0.35)] transition hover:bg-orange-600 sm:right-6"
            >
              <ShoppingBag className="h-4 w-4" />
              <span>R$ {total.toFixed(2).replace(".", ",")}</span>
            </button>
          )}

          <div className="flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => itemCount > 0 && setIsCartOpen(true)}
              className="text-left"
            >
              <p className="text-3xl font-bold tracking-[-0.02em] text-[#4a2a1d]">
                Sua sacola
              </p>
              <p className="text-sm font-medium text-zinc-600">
                {itemCount === 0
                  ? "Seu carrinho esta vazio"
                  : `${itemCount} item(ns) adicionados`}
              </p>
            </button>

            <button
              type="button"
              onClick={handleCancel}
              className="text-sm font-semibold text-[#bb4f1a] underline underline-offset-4 transition hover:text-[#9d3f12]"
            >
              Recomecar pedido
            </button>
          </div>
        </footer>
      </div>

      {isCartOpen && (
        <Cart
          isOpen={isCartOpen}
          onClose={() => setIsCartOpen(false)}
          onCheckout={handleCheckout}
        />
      )}
    </div>
  );
}
