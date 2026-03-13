"use client";

export const dynamic = "force-dynamic";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, ShoppingBag, TicketPercent } from "lucide-react";
import { useCartStore } from "@/lib/cart-store";
import { Cart } from "@/components/cart";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { getAuthUser, clearAuthUser } from "@/lib/auth-store";
import { useToast } from "@/components/ui/use-toast";

/* =====================
   TYPES
===================== */
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

export default function Home() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [productsByCategory, setProductsByCategory] = useState<
    Record<string, Product[]>
  >({});
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [addedProductId, setAddedProductId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState("Cliente");
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

  const { addItem, getTotal, getItemCount, clearCart } = useCartStore();
  const router = useRouter();
  const { toast } = useToast();
  const productsScrollRef = useRef<HTMLDivElement | null>(null);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  const selectedCategoryName = useMemo(
    () => categories.find((category) => category.id === selectedCategory)?.name,
    [categories, selectedCategory]
  );

  /* =====================
     AUTH CHECK
  ====================== */
  useEffect(() => {
    const user = getAuthUser();
    if (!user) {
      router.push("/auth/login");
      return;
    }

    const firstName = user.name?.trim()?.split(/\s+/)[0] || "Cliente";
    setCustomerName(firstName);
  }, [router]);

  /* =====================
     LOAD CATEGORIES
  ====================== */
  useEffect(() => {
    async function loadCategories() {
      const response = await fetch("/api/menu/categories");
      const data = await response.json();

      const categoryList = Array.isArray(data) ? data : [];
      setCategories(categoryList);

      if (categoryList.length > 0) {
        setSelectedCategory((previous) => previous ?? categoryList[0].id);
      }
    }

    loadCategories();
  }, []);

  /* =====================
     LOAD PRODUCTS (ALL CATEGORIES)
  ====================== */
  useEffect(() => {
    if (!categories.length) {
      setProductsByCategory({});
      return;
    }

    let isCancelled = false;

    async function loadProductsByCategory() {
      setIsLoadingProducts(true);

      const responses = await Promise.all(
        categories.map(async (category) => {
          try {
            const response = await fetch(
              `/api/menu/products?category_id=${category.id}`
            );
            const data = await response.json();
            return [category.id, Array.isArray(data) ? data : []] as const;
          } catch {
            return [category.id, []] as const;
          }
        })
      );

      if (isCancelled) return;

      setProductsByCategory(Object.fromEntries(responses));
      setIsLoadingProducts(false);
    }

    loadProductsByCategory();

    return () => {
      isCancelled = true;
    };
  }, [categories]);

  /* =====================
     ACTIVE CATEGORY ON SCROLL
  ====================== */
  useEffect(() => {
    const root = productsScrollRef.current;
    if (!root || !categories.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        const activeId = visible[0]?.target?.getAttribute("data-category-id");
        if (activeId) {
          setSelectedCategory(activeId);
        }
      },
      {
        root,
        threshold: [0.2, 0.4, 0.7],
        rootMargin: "-18% 0px -58% 0px",
      }
    );

    categories.forEach((category) => {
      const section = sectionRefs.current[category.id];
      if (section) observer.observe(section);
    });

    return () => observer.disconnect();
  }, [categories, productsByCategory]);

  const setCategorySectionRef = useCallback(
    (categoryId: string) => (node: HTMLElement | null) => {
      sectionRefs.current[categoryId] = node;
    },
    []
  );

  const scrollToCategory = useCallback((categoryId: string) => {
    const root = productsScrollRef.current;
    const section = sectionRefs.current[categoryId];
    if (!root || !section) return;

    setSelectedCategory(categoryId);

    const rootTop = root.getBoundingClientRect().top;
    const sectionTop = section.getBoundingClientRect().top;
    const targetTop = sectionTop - rootTop + root.scrollTop - 12;

    root.scrollTo({
      top: Math.max(targetTop, 0),
      behavior: "smooth",
    });
  }, []);

  /* =====================
     HANDLERS
  ====================== */
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

  /* =====================
     RENDER
  ====================== */
  return (
    <div className="relative h-screen overflow-hidden bg-white p-3 sm:p-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(249,115,22,0.12),_transparent_52%)]" />
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-56 bg-gradient-to-t from-zinc-100/70 to-transparent" />

      <div className="relative mx-auto flex h-full w-full max-w-[1160px] min-h-0 flex-col overflow-hidden rounded-[1.9rem] border border-zinc-200/80 bg-white/90 shadow-[0_24px_60px_rgba(0,0,0,0.08)] backdrop-blur">
        <header className="border-b border-zinc-200/90">
          <div className="relative h-28 overflow-hidden bg-zinc-900 sm:h-32">
            <Image
              src="/hot-dog-sandwich-snack-combo-meal-promotional-appe.jpg"
              alt="Banner promocional"
              fill
              className="object-cover opacity-55"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/90 via-zinc-900/70 to-orange-600/80" />
            <div className="relative flex h-full items-center justify-between px-4 sm:px-6">
              <div className="max-w-[65%]">
                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.26em] text-orange-200/90 sm:text-[0.76rem]">
                  Autoatendimento Mr Smart
                </p>
                <h1 className="mt-1 text-[1.35rem] font-bold leading-[1.05] tracking-[-0.02em] text-white sm:text-[1.8rem]">
                  Monte seu pedido sem filas
                </h1>
              </div>

              <Image
                src="/logologin.png"
                alt="Logo menu"
                width={116}
                height={78}
                className="h-16 w-16 object-contain sm:h-20 sm:w-20"
                priority
              />
            </div>
          </div>

          <div className="grid gap-3 px-4 py-4 sm:grid-cols-[1fr_auto] sm:items-center sm:px-6">
            <div>
              <h2 className="text-[2rem] font-bold leading-none tracking-[-0.025em] text-zinc-900 sm:text-[2.4rem]">
                Oi, {customerName}
                <span className="text-orange-500">!</span>
              </h2>
              <p className="mt-1 text-sm font-medium text-zinc-600 sm:text-base">
                Escolha seus produtos e finalize com rapidez
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:items-end">
              <div className="flex w-full items-center gap-2 rounded-2xl border border-orange-200 bg-orange-50 px-3 py-2.5 sm:w-[20rem]">
                <div className="rounded-full bg-orange-500 p-2 text-white">
                  <TicketPercent className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-zinc-600">
                    Cupons e recompensas
                  </p>
                  <p className="truncate text-sm font-semibold text-zinc-900">
                    Insira seu codigo em breve
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  disabled
                  className="h-8 rounded-full bg-zinc-200 px-3 text-xs font-semibold text-zinc-500 hover:bg-zinc-200"
                >
                  Em breve
                </Button>
              </div>

              <Button
                variant="outline"
                size="lg"
                className="h-11 rounded-full border-2 border-orange-500 px-7 text-base font-semibold text-orange-600 hover:bg-orange-500 hover:text-white"
                onClick={handleCancel}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-hidden">
          <div className="flex h-full min-h-0">
            <aside className="hidden w-64 border-r border-zinc-200/90 bg-[#f8f6f3] p-4 lg:block">
              <p className="px-2 pb-3 text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500">
                Categorias
              </p>
              <nav className="space-y-2">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => scrollToCategory(category.id)}
                    className={`w-full rounded-xl px-4 py-3 text-left text-sm font-semibold transition ${
                      selectedCategory === category.id
                        ? "bg-[#4b1f0f] text-white shadow-[0_10px_20px_rgba(75,31,15,0.2)]"
                        : "border border-zinc-200 bg-white text-zinc-700 hover:border-orange-300 hover:text-orange-600"
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </nav>
            </aside>

            <main className="min-h-0 flex-1 overflow-hidden bg-white">
              <div className="border-b border-zinc-200/80 px-4 py-3 lg:hidden">
                <div className="hide-scrollbar flex gap-2 overflow-x-auto">
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => scrollToCategory(category.id)}
                      className={`flex-shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
                        selectedCategory === category.id
                          ? "bg-[#4b1f0f] text-white"
                          : "border border-zinc-300 bg-white text-zinc-700"
                      }`}
                    >
                      {category.name}
                    </button>
                  ))}
                </div>
              </div>

              <div
                ref={productsScrollRef}
                className="h-full overflow-y-auto px-4 pb-28 pt-4 sm:px-6"
              >
                <div className="pb-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.23em] text-zinc-500">
                    Menu completo
                  </p>
                  <p className="mt-1 text-sm font-medium text-zinc-600">
                    {selectedCategoryName
                      ? `Categoria em foco: ${selectedCategoryName}`
                      : "Explore todas as categorias"}
                  </p>
                </div>

                {isLoadingProducts && (
                  <p className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-medium text-zinc-600">
                    Carregando produtos...
                  </p>
                )}

                {!isLoadingProducts &&
                  categories.map((category) => {
                    const categoryProducts = productsByCategory[category.id] ?? [];

                    return (
                      <section
                        key={category.id}
                        ref={setCategorySectionRef(category.id)}
                        data-category-id={category.id}
                        className="pt-4"
                      >
                        <div className="sticky top-0 z-20 mb-4 border-b border-zinc-100 bg-white/95 py-3 backdrop-blur">
                          <h3 className="text-[1.85rem] font-bold leading-none tracking-[-0.02em] text-zinc-900 sm:text-[2.15rem]">
                            {category.name}
                          </h3>
                        </div>

                        {categoryProducts.length > 0 ? (
                          <div className="grid grid-cols-2 gap-3 pb-4 sm:gap-4 lg:grid-cols-3 2xl:grid-cols-4">
                            {categoryProducts.map((product) => {
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
                                    setTimeout(() => setAddedProductId(null), 400);
                                  }}
                                  className={`group relative overflow-hidden rounded-3xl border border-[#ecd8c2] bg-white text-left transition-all ${
                                    isOutOfStock
                                      ? "cursor-not-allowed"
                                      : "hover:-translate-y-0.5 hover:border-orange-300 hover:shadow-[0_18px_26px_rgba(249,115,22,0.18)]"
                                  } ${
                                    addedProductId === product.id
                                      ? "ring-2 ring-orange-400"
                                      : ""
                                  }`}
                                >
                                  <div className="relative aspect-[5/4] border-b border-[#f1e2d1] bg-gradient-to-b from-zinc-50 to-white p-3">
                                    <Image
                                      src={product.image_url || "/placeholder.svg"}
                                      alt={product.name}
                                      fill
                                      className="object-contain p-3 transition-transform duration-300 group-hover:scale-[1.03]"
                                    />

                                    {isOutOfStock && (
                                      <>
                                        <div className="absolute inset-0 bg-zinc-900/45" />
                                        <div className="absolute right-3 top-3 rounded-full bg-[#efb320] px-3 py-1 text-[0.64rem] font-bold uppercase tracking-[0.1em] text-zinc-900">
                                          Volto logo
                                        </div>
                                      </>
                                    )}

                                    {addedProductId === product.id && (
                                      <div className="absolute inset-0 flex items-center justify-center bg-orange-500/20">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-500 text-white shadow-lg">
                                          <Check className="h-6 w-6" />
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  <div className="px-3 pb-4 pt-3 sm:px-4">
                                    <h4
                                      className={`line-clamp-2 text-[1.04rem] font-bold leading-tight ${
                                        isOutOfStock
                                          ? "text-zinc-400"
                                          : "text-[#4b2a1f]"
                                      }`}
                                    >
                                      {product.name}
                                    </h4>
                                    <p
                                      className={`mt-2 text-[0.8rem] font-medium ${
                                        isOutOfStock
                                          ? "text-zinc-400"
                                          : "text-zinc-500"
                                      }`}
                                    >
                                      a partir
                                    </p>
                                    <p
                                      className={`text-[1.45rem] font-bold leading-none tracking-[-0.02em] ${
                                        isOutOfStock
                                          ? "text-zinc-400"
                                          : "text-zinc-900"
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
                          <p className="pb-5 text-sm font-medium text-zinc-500">
                            Nenhum produto nesta categoria.
                          </p>
                        )}
                      </section>
                    );
                  })}
              </div>
            </main>
          </div>
        </div>

        <footer className="border-t border-orange-200/80 bg-gradient-to-b from-white to-orange-50/60 p-3 sm:p-4">
          <button
            type="button"
            className={`w-full rounded-[1.35rem] px-4 py-3 text-left transition ${
              itemCount > 0
                ? "bg-orange-500 text-white shadow-[0_16px_28px_rgba(249,115,22,0.3)] hover:bg-orange-600"
                : "bg-zinc-900 text-white/90"
            }`}
            onClick={() => itemCount > 0 && setIsCartOpen(true)}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="rounded-full bg-white/20 p-2">
                  <ShoppingBag className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-lg font-bold leading-none">
                    Sua sacola
                  </p>
                  <p className="mt-1 truncate text-sm font-medium text-white/90">
                    {itemCount === 0
                      ? "Seu carrinho esta vazio"
                      : `${itemCount} item(ns) no carrinho`}
                  </p>
                </div>
              </div>

              <div className="rounded-full bg-white px-4 py-2 text-base font-bold text-orange-600">
                {itemCount === 0
                  ? "R$ 0,00"
                  : `R$ ${total.toFixed(2).replace(".", ",")}`}
              </div>
            </div>
          </button>
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
