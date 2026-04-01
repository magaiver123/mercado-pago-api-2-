"use client";

export const dynamic = "force-dynamic";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, ShoppingBag, TicketPercent } from "lucide-react";
import { useCartStore } from "@/lib/cart-store";
import { Cart } from "@/components/cart";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { clearAuthUser, getAuthUser } from "@/lib/auth-store";
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

type AddableProduct = {
  id: string;
  name: string;
  price: number;
  image_url?: string | null;
  stock: number;
};

type MenuBannerSlide = {
  id: string;
  image_url: string;
  duration: number;
};

function getProductStock(product: Pick<Product, "product_stock">): number {
  const stockData = Array.isArray(product.product_stock)
    ? product.product_stock[0]
    : product.product_stock;
  return stockData?.quantity ?? 0;
}

export default function MenuPage() {
  const BANNER_TRANSITION_MS = 550;

  // Layout fine-tuning: adjust these values manually to calibrate proportions on your totem.
  const layoutTune = {
    bannerHeightPx: 160,
    topBlockPaddingTopPx: 8,
    topBlockPaddingBottomPx: 14,
    greetingOffsetTopPx: 20,
    rewardsOffsetTopPx: 6,
    menuStartOffsetPx: -8,
    categoriesStartPaddingTopPx: 2,
    productsStartPaddingTopPx: 0,
    bagInfoOffsetYPx: -6,
    sidebarInsetTopPx: 10,
    sidebarInsetBottomPx: 12,
    dividerInsetYPx: 14,
    footerInsetXPx: 10,
    footerRadiusPx: 24,
  } as const;

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [addedProductId, setAddedProductId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState("Cliente");
  const [menuBanners, setMenuBanners] = useState<MenuBannerSlide[]>([]);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [incomingBannerIndex, setIncomingBannerIndex] = useState<number | null>(null);
  const [isBannerAnimating, setIsBannerAnimating] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const bannerTransitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bannerAnimationFrameRef = useRef<number | null>(null);
  const hasCustomMenuBanner = menuBanners.length > 0;

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
    async function loadMenuBanners() {
      try {
        const response = await fetch("/api/menu/banner", { cache: "no-store" });
        if (!response.ok) {
          setMenuBanners([]);
          setCurrentBannerIndex(0);
          return;
        }

        const data = await response.json();
        const parsedBanners = Array.isArray(data)
          ? data
          : Array.isArray(data?.slides)
            ? data.slides
            : [];

        const normalizedBanners = parsedBanners
          .filter((item: any) => typeof item?.image_url === "string" && item.image_url.trim() !== "")
          .map((item: any, index: number) => ({
            id: String(item.id ?? `${index}`),
            image_url: String(item.image_url),
            duration: Math.max(1, Number(item.duration ?? 5)),
          })) as MenuBannerSlide[];

        setMenuBanners(normalizedBanners);
        setCurrentBannerIndex((previous) =>
          previous >= normalizedBanners.length ? 0 : previous
        );
        setIncomingBannerIndex(null);
        setIsBannerAnimating(false);
      } catch {
        setMenuBanners([]);
        setCurrentBannerIndex(0);
      }
    }

    loadMenuBanners();
  }, []);

  const goToNextBanner = useCallback(() => {
    if (
      isBannerAnimating ||
      incomingBannerIndex !== null ||
      menuBanners.length <= 1
    ) {
      return;
    }

    const nextBanner = (currentBannerIndex + 1) % menuBanners.length;
    setIncomingBannerIndex(nextBanner);
    setIsBannerAnimating(false);

    if (bannerAnimationFrameRef.current !== null) {
      cancelAnimationFrame(bannerAnimationFrameRef.current);
    }

    bannerAnimationFrameRef.current = requestAnimationFrame(() => {
      setIsBannerAnimating(true);
    });

    if (bannerTransitionTimerRef.current) {
      clearTimeout(bannerTransitionTimerRef.current);
    }

    bannerTransitionTimerRef.current = setTimeout(() => {
      setCurrentBannerIndex(nextBanner);
      setIncomingBannerIndex(null);
      setIsBannerAnimating(false);
      bannerTransitionTimerRef.current = null;
    }, BANNER_TRANSITION_MS);
  }, [
    BANNER_TRANSITION_MS,
    currentBannerIndex,
    incomingBannerIndex,
    isBannerAnimating,
    menuBanners.length,
  ]);

  useEffect(() => {
    if (menuBanners.length <= 1) return;

    const currentBanner = menuBanners[currentBannerIndex];
    const duration = currentBanner?.duration ?? 5;
    const timer = setTimeout(goToNextBanner, duration * 1000);

    return () => clearTimeout(timer);
  }, [currentBannerIndex, goToNextBanner, menuBanners]);

  useEffect(() => {
    return () => {
      if (bannerTransitionTimerRef.current) {
        clearTimeout(bannerTransitionTimerRef.current);
      }

      if (bannerAnimationFrameRef.current !== null) {
        cancelAnimationFrame(bannerAnimationFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    async function loadCategories() {
      try {
        const response = await fetch("/api/menu/categories");
        const data = await response.json();
        const categoryList = Array.isArray(data) ? data : [];
        setCategories(categoryList);

        if (categoryList.length > 0) {
          setSelectedCategory((current) => current ?? categoryList[0].id);
        }
      } catch {
        setCategories([]);
      }
    }

    loadCategories();
  }, []);

  useEffect(() => {
    if (!selectedCategory) return;
    let active = true;

    async function loadProducts() {
      setLoadingProducts(true);
      try {
        const response = await fetch(
          `/api/menu/products?category_id=${selectedCategory}`
        );
        const data = await response.json();
        if (!active) return;
        setProducts(Array.isArray(data) ? data : []);
      } catch {
        if (!active) return;
        setProducts([]);
      } finally {
        if (active) setLoadingProducts(false);
      }
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

  const handleRestartOrder = () => {
    clearCart();
    clearAuthUser();
    router.push("/");
  };

  const handleRewardsClick = () => {
    toast({
      title: "Em breve",
      description: "Resgate de recompensas ainda não está disponível.",
    });
  };

  const handleAddToSacola = (product: AddableProduct) => {
    const success = addItem(product);

    if (!success) {
      toast({
        title: "Estoque insuficiente",
        description:
          "Você já adicionou a quantidade máxima disponível deste produto.",
        variant: "warning",
      });
      return;
    }

    setAddedProductId(product.id);
    setTimeout(() => setAddedProductId(null), 420);
  };

  const currentBannerData = hasCustomMenuBanner
    ? menuBanners[currentBannerIndex]
    : null;
  const incomingBannerData =
    incomingBannerIndex !== null ? menuBanners[incomingBannerIndex] : null;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#f3f1ee]">
      <header className="flex-none">
        <section
          className="relative overflow-hidden"
          style={{ height: layoutTune.bannerHeightPx }}
        >
          {hasCustomMenuBanner && currentBannerData?.image_url ? (
            <>
              <div
                className={`absolute inset-0 transition-opacity ease-out ${
                  isBannerAnimating && incomingBannerData ? "opacity-0" : "opacity-100"
                }`}
                style={{ transitionDuration: `${BANNER_TRANSITION_MS}ms` }}
              >
                <Image
                  src={currentBannerData.image_url}
                  alt="Banner promocional"
                  fill
                  className="object-cover"
                  priority
                />
              </div>

              {incomingBannerData?.image_url && (
                <div
                  className={`absolute inset-0 transition-opacity ease-out ${
                    isBannerAnimating ? "opacity-100" : "opacity-0"
                  }`}
                  style={{ transitionDuration: `${BANNER_TRANSITION_MS}ms` }}
                >
                  <Image
                    src={incomingBannerData.image_url}
                    alt="Banner promocional"
                    fill
                    className="object-cover"
                    priority
                  />
                </div>
              )}
            </>
          ) : (
            <>
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
            </>
          )}
        </section>

        <section
          className="bg-[#f3f1ee] px-5 sm:px-6"
          style={{
            paddingTop: layoutTune.topBlockPaddingTopPx,
            paddingBottom: layoutTune.topBlockPaddingBottomPx,
          }}
        >
          <div className="grid grid-cols-[1fr_auto] items-start gap-4">
            <div style={{ paddingTop: layoutTune.greetingOffsetTopPx }}>
              <h2 className="text-[2.05rem] font-bold leading-none tracking-[-0.03em] text-[#3b2417] sm:text-[2.65rem]">
                Oi, {customerName}
                <span className="text-orange-500">!</span>
              </h2>
            </div>

            <div
              className="flex flex-col items-end"
              style={{ paddingTop: layoutTune.rewardsOffsetTopPx }}
            >
              <button
                type="button"
                onClick={handleRewardsClick}
                className="group flex w-[16rem] items-center gap-2.5 rounded-2xl border border-orange-200 bg-orange-50 px-3.5 py-3 text-left transition hover:bg-orange-100 sm:w-[19rem]"
              >
                <div className="rounded-full bg-orange-500 p-2 text-white">
                  <TicketPercent className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                    Cupons e recompensas
                  </p>
                  <p className="truncate text-xs font-semibold text-zinc-900 sm:text-sm">
                    Inserir código
                  </p>
                </div>
                <span className="rounded-full bg-orange-500 px-2.5 py-1 text-[0.62rem] font-semibold text-white transition group-hover:bg-orange-600">
                  Em breve
                </span>
              </button>
            </div>
          </div>
        </section>
      </header>

      <div
        className="min-h-0 flex-1 overflow-hidden"
        style={{ marginTop: layoutTune.menuStartOffsetPx }}
      >
        <div className="grid h-full min-h-0 grid-cols-[11.8rem_0.55rem_1fr] sm:grid-cols-[12.8rem_0.7rem_1fr]">
          <aside
            className="min-h-0 bg-[#f3f1ee] px-2.5 sm:px-3"
            style={{
              paddingTop:
                layoutTune.sidebarInsetTopPx + layoutTune.categoriesStartPaddingTopPx,
              paddingBottom: layoutTune.sidebarInsetBottomPx,
            }}
          >
            <div className="h-full rounded-[1.4rem] bg-[#e8dccb] px-2.5 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] sm:px-3">
              <nav className="hide-scrollbar h-full space-y-1 overflow-y-auto">
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
            </div>
          </aside>

          <div
            className="flex items-stretch justify-center"
            style={{
              paddingTop: layoutTune.dividerInsetYPx,
              paddingBottom: layoutTune.dividerInsetYPx,
            }}
          >
            <div className="w-[3px] rounded-full bg-[#d8c5ae]" />
          </div>

          <main className="min-h-0 flex-1 overflow-hidden bg-[#f7f4ef]">
            <div
              className="h-full overflow-y-auto px-4 pb-36 sm:px-6"
              style={{ paddingTop: layoutTune.productsStartPaddingTopPx }}
            >
              <div className="sticky top-0 z-10 border-b border-[#e7ddcf] bg-[#f7f4ef] py-2">
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
                    const stockQty = getProductStock(product);
                    const isOutOfStock = stockQty <= 0;

                    return (
                      <button
                        key={product.id}
                        disabled={isOutOfStock}
                        onClick={() =>
                          handleAddToSacola({
                            id: product.id,
                            name: product.name,
                            price: product.price,
                            image_url: product.image_url,
                            stock: stockQty,
                          })
                        }
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
                        <div className="relative aspect-[5/4] overflow-hidden border-b border-[#f2e5d6] bg-zinc-100">
                          <Image
                            src={product.image_url || "/placeholder.svg"}
                            alt={product.name}
                            fill
                            className={`object-cover object-bottom ${
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
                            className={`mt-1.5 text-[1.36rem] font-bold leading-none tracking-[-0.02em] ${
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

      <footer className="relative flex-none bg-[#f3f1ee] pb-1 pt-2">
        <div
          className="relative border border-[#dfd1c0] bg-[#efe6d8] px-5 pb-4 pt-7 shadow-[inset_0_1px_0_rgba(255,255,255,0.48)] sm:px-6"
          style={{
            marginLeft: layoutTune.footerInsetXPx,
            marginRight: layoutTune.footerInsetXPx,
            borderTopLeftRadius: layoutTune.footerRadiusPx,
            borderTopRightRadius: layoutTune.footerRadiusPx,
          }}
        >
          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="absolute -top-6 right-8 flex items-center gap-2.5 rounded-full bg-orange-500 px-5 py-3 text-xl font-bold text-white shadow-[0_14px_28px_rgba(249,115,22,0.35)] transition hover:bg-orange-600 sm:right-10"
          >
            <ShoppingBag className="h-5 w-5" />
            <span>R$ {total.toFixed(2).replace(".", ",")}</span>
          </button>

          <div className="grid items-center gap-4 grid-cols-[11.8rem_1fr] sm:grid-cols-[12.8rem_1fr]">
            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="text-left"
              style={{ transform: `translateY(${layoutTune.bagInfoOffsetYPx}px)` }}
            >
              <p className="text-3xl font-bold tracking-[-0.02em] text-[#4a2a1d]">
                Sua sacola
              </p>
              <p className="text-sm font-medium text-zinc-600">
                {itemCount === 0
                  ? "Sua sacola está vazia"
                  : `${itemCount} item(ns) adicionados`}
              </p>
            </button>

            <div className="h-full min-h-14 border-l border-[#dac8b0]" />
          </div>
        </div>
      </footer>

      {isCartOpen && (
        <Cart
          isOpen={isCartOpen}
          onClose={() => setIsCartOpen(false)}
          onCheckout={handleCheckout}
          onRestartOrder={handleRestartOrder}
        />
      )}
    </div>
  );
}
