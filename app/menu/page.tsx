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
    <div className="flex h-screen flex-col overflow-hidden bg-[#f3f1ee]">
      <header className="flex-none">
        <section className="relative h-32 overflow-hidden sm:h-40">
          <Image
            src="/hot-dog-sandwich-snack-combo-meal-promotional-appe.jpg"
            alt="Banner promocional"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/88 via-zinc-900/58 to-orange-600/78" />
          <div className="relative flex h-full items-center justify-between px-5 sm:px-6">
            <div className="max-w-[72%]">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.3em] text-orange-200 sm:text-[0.75rem]">
                Autoatendimento
              </p>
              <h1 className="mt-1 text-[1.5rem] font-bold leading-[0.95] tracking-[-0.02em] text-white sm:text-[2rem]">
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

        <section className="bg-[#f3f1ee] px-5 pb-3 pt-5 sm:px-6 sm:pt-6">
          <div className="grid grid-cols-[1fr_auto] items-start gap-4">
            <div className="pt-1">
              <h2 className="text-[2.05rem] font-bold leading-none tracking-[-0.03em] text-[#3b2417] sm:text-[2.65rem]">
                Oi, {customerName}
                <span className="text-orange-500">!</span>
              </h2>
              <p className="mt-1 text-sm font-medium text-zinc-600 sm:text-base">
                Escolha sua categoria e adicione seus produtos
              </p>
            </div>

            <div className="flex flex-col items-end gap-2.5">
              <button
                type="button"
                onClick={handleRewardsClick}
                className="group flex w-[14.5rem] items-center gap-2 rounded-2xl border border-orange-200 bg-orange-50 px-3 py-2 text-left transition hover:bg-orange-100 sm:w-[17rem]"
              >
                <div className="rounded-full bg-orange-500 p-2 text-white">
                  <TicketPercent className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-zinc-500">
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
                className="h-10 rounded-full border-2 border-orange-500 px-5 text-sm font-semibold text-orange-600 hover:bg-orange-500 hover:text-white sm:h-11 sm:px-6"
              >
                Cancelar
              </Button>
            </div>
          </div>
        </section>
      </header>

      <div className="min-h-0 flex-1 overflow-hidden">
        <div className="flex h-full min-h-0">
          <aside className="w-[11.8rem] flex-none border-r border-[#e3d5c6] bg-[#f2ebe1] px-2.5 py-3 sm:w-[12.8rem] sm:px-3">
            <nav className="space-y-1.5">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`w-full rounded-xl border px-3 py-3 text-left text-[0.92rem] font-semibold transition ${
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

          <main className="min-h-0 flex-1 overflow-hidden bg-[#f7f4ef]">
            <div className="h-full overflow-y-auto px-4 pb-36 pt-2 sm:px-6">
              <div className="sticky top-0 z-10 border-b border-[#e7ddcf] bg-[#f7f4ef] py-3">
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

      <footer className="relative flex-none border-t border-[#e4d6c7] bg-[#efe6d8] px-5 pb-4 pt-7 sm:px-6">
        <button
          type="button"
          onClick={() => setIsCartOpen(true)}
          className="absolute -top-6 right-5 flex items-center gap-2 rounded-full bg-orange-500 px-4 py-2.5 text-lg font-bold text-white shadow-[0_14px_28px_rgba(249,115,22,0.35)] transition hover:bg-orange-600 sm:right-6"
        >
          <ShoppingBag className="h-4 w-4" />
          <span>R$ {total.toFixed(2).replace(".", ",")}</span>
        </button>

        <div className="flex items-center justify-between gap-4">
          <button type="button" onClick={() => setIsCartOpen(true)} className="text-left">
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
