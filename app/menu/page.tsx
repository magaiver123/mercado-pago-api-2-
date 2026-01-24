"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ShoppingBag } from "lucide-react";
import { useCartStore } from "@/lib/cart-store";
import { Cart } from "@/components/cart";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { getAuthUser, clearAuthUser } from "@/lib/auth-store";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/use-toast";

/* =====================
   TIPOS
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
  product_stock?:
    | {
        quantity: number;
      }[]
    | null;
};

export default function Home() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const { addItem, getTotal, getItemCount } = useCartStore();
  const router = useRouter();
  const supabase = createClient();
  const { clearCart } = useCartStore();
  const { toast } = useToast();

  /* =====================
     AUTH CHECK
  ====================== */
  useEffect(() => {
    const user = getAuthUser();
    if (!user) {
      router.push("/auth/login");
    }
  }, [router]);

  /* =====================
     LOAD CATEGORIES
  ====================== */
  useEffect(() => {
    async function loadCategories() {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name")
        .eq("is_active", true)
        .order("name");

      if (error) {
        console.error("Erro ao carregar categorias:", error);
        return;
      }

      setCategories(data || []);

      if (data && data.length > 0) {
        setSelectedCategory(data[0].id);
      }
    }

    loadCategories();
  }, [supabase]);

  /* =====================
     LOAD PRODUCTS
  ====================== */
  useEffect(() => {
    if (!selectedCategory) return;

    async function loadProducts() {
      const { data, error } = await supabase
        .from("products")
        .select(
          `
          id,
          name,
          description,
          price,
          image_url,
          category_id,
          product_stock!inner ( quantity )
        `
        )
        .eq("is_active", true)
        .eq("category_id", selectedCategory);

      if (error) {
        console.error("Erro ao carregar produtos:", error);
        return;
      }

      setProducts(data ?? []);
    }

    loadProducts();
  }, [selectedCategory, supabase]);

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
    <div className="h-screen flex flex-col bg-white">
      {/* Header */}
      <header className="bg-white border-b border-zinc-200 px-4 md:px-6 py-4 flex items-center justify-between">
        <div className="w-24 h-16 flex items-center justify-center">
          <Image
            src="/logologin.png"
            alt="Logo Menu"
            width={96}
            height={64}
            className="object-contain"
            priority
          />
        </div>

        <Button
          variant="outline"
          size="lg"
          className="border-2 border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white rounded-full"
          onClick={handleCancel}
        >
          Cancelar
        </Button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="hidden md:block w-60 bg-white border-r border-zinc-200 overflow-y-auto">
          <div className="p-6">
            <h2 className="font-bold text-2xl mb-6">MENU</h2>

            <nav className="space-y-2">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                    selectedCategory === category.id
                      ? "bg-orange-500 text-white font-semibold"
                      : "hover:bg-orange-100"
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 overflow-y-auto p-6 bg-white">
          {/* Categorias Mobile */}
          <div className="md:hidden mb-4">
            <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    selectedCategory === category.id
                      ? "bg-orange-500 text-white"
                      : "bg-zinc-100 text-black"
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>

          <h1 className="font-bold text-3xl mb-6">
            {categories.find((c) => c.id === selectedCategory)?.name}
          </h1>

          {products.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
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
                        stock: stockQty, // 🔥 valor real do banco
                      });

                      if (!success) {
                        toast({
                          title: "Estoque insuficiente",
                          description:
                            "Você já adicionou a quantidade máxima disponível deste produto.",
                          variant: "destructive",
                        });
                      }
                    }}
                    className={`border rounded-xl overflow-hidden transition-all text-left
                      ${
                        isOutOfStock
                          ? "opacity-50 cursor-not-allowed"
                          : "hover:ring-2 hover:ring-orange-500"
                      }
                    `}
                  >
                    <div className="aspect-square relative bg-orange-100">
                      <Image
                        src={product.image_url || "/placeholder.svg"}
                        alt={product.name}
                        fill
                        className="object-cover"
                      />
                    </div>

                    <div className="p-4">
                      <h3 className="font-semibold mb-1 line-clamp-2">
                        {product.name}
                      </h3>

                      {product.description && (
                        <p className="text-sm text-zinc-600 mb-2 line-clamp-1">
                          {product.description}
                        </p>
                      )}

                      {isOutOfStock && (
                        <span className="inline-block mb-2 text-xs font-semibold text-red-600 bg-red-100 px-2 py-1 rounded">
                          Sem estoque
                        </span>
                      )}

                      <p className="text-orange-600 font-bold text-lg">
                        R$ {product.price.toFixed(2).replace(".", ",")}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-zinc-500">Nenhum produto nesta categoria</p>
          )}
        </main>
      </div>

      {/* Footer Cart */}
      <footer
        className="bg-orange-500 hover:bg-orange-600 transition-colors px-6 py-5 cursor-pointer"
        onClick={() => itemCount > 0 && setIsCartOpen(true)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <ShoppingBag className="h-7 w-7 text-white" />
            <span className="text-white font-bold">
              {itemCount === 0
                ? "Seu carrinho está vazio"
                : `${itemCount} itens no carrinho`}
            </span>
          </div>

          {itemCount > 0 && (
            <span className="text-white font-bold text-xl">
              R$ {total.toFixed(2).replace(".", ",")}
            </span>
          )}
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
