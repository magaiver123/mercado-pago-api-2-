"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShoppingCart, ArrowLeft, Package, Calendar } from "lucide-react";
import {
  clearUserprofileAuthUser,
  getUserprofileAuthUser,
  type UserprofileUser,
} from "@/lib/userprofile-auth-store";

type Order = {
  id: string;
  order_number: number | null;
  status: string;
  total_amount: number | string;
  created_at: string;
  item_count: number;
};

function getStatusPresentation(status: string) {
  const key = status.toLowerCase();

  switch (key) {
    case "processed":
      return { label: "Concluido", className: "bg-green-100 text-green-700" };
    case "pending":
    case "processing":
      return { label: "Pendente", className: "bg-yellow-100 text-yellow-700" };
    case "canceled":
    case "cancelled":
      return { label: "Cancelado", className: "bg-red-100 text-red-700" };
    case "failed":
    case "error":
      return { label: "Falhou", className: "bg-red-100 text-red-700" };
    case "expired":
      return { label: "Expirado", className: "bg-orange-100 text-orange-700" };
    case "action_required":
      return {
        label: "Acao necessaria",
        className: "bg-yellow-100 text-yellow-700",
      };
    case "refunded":
      return { label: "Reembolsado", className: "bg-slate-100 text-slate-700" };
    default:
      return {
        label: key.charAt(0).toUpperCase() + key.slice(1),
        className: "bg-slate-100 text-slate-700",
      };
  }
}

function formatCurrency(value: number | string) {
  const numeric =
    typeof value === "number" ? value : Number(String(value).replace(",", "."));

  if (!Number.isFinite(numeric)) {
    return "R$ 0,00";
  }

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(numeric);
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--/--/----";

  return new Intl.DateTimeFormat("pt-BR").format(date);
}

function formatOrderNumber(order: Order) {
  if (typeof order.order_number === "number") {
    return String(order.order_number).padStart(6, "0");
  }

  return order.id.slice(0, 6).toUpperCase();
}

export default function PedidosPage() {
  const router = useRouter();
  const [authUser, setAuthUser] = useState<UserprofileUser | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const currentUser = getUserprofileAuthUser();
    if (!currentUser) {
      router.replace("/userprofile/login");
      return;
    }

    const userId = currentUser.id;
    setAuthUser(currentUser);

    async function loadOrders() {
      try {
        const response = await fetch(
          `/api/userprofile/orders?userId=${userId}`
        );
        const data = await response.json().catch(() => null);

        if (response.status === 401 || response.status === 404) {
          clearUserprofileAuthUser();
          router.replace("/userprofile/login");
          return;
        }

        if (!response.ok || !Array.isArray(data)) {
          setError("Nao foi possivel carregar seus pedidos.");
          return;
        }

        setOrders(data as Order[]);
      } catch {
        setError("Nao foi possivel carregar seus pedidos.");
      } finally {
        setIsLoading(false);
      }
    }

    loadOrders();
  }, [router]);

  if (isLoading && !authUser) {
    return null;
  }

  return (
    <main className="min-h-screen bg-background flex flex-col">
      <header className="bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Link
            href="/userprofile/perfil"
            className="text-primary-foreground/80 hover:text-primary-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-foreground/20 rounded-lg flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">Mr Smart</span>
          </div>
        </div>
      </header>

      <div className="flex-1 px-4 py-6">
        <div className="container mx-auto max-w-md">
          <h1 className="text-xl font-bold text-foreground mb-6">
            Historico de Pedidos
          </h1>

          {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

          {!isLoading && orders.length === 0 ? (
            <p className="text-muted-foreground">Voce ainda nao possui pedidos.</p>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => {
                const status = getStatusPresentation(order.status);
                return (
                  <div
                    key={order.id}
                    className="p-4 bg-card rounded-xl border border-border shadow-sm"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Package className="w-5 h-5 text-primary" />
                        <span className="font-semibold text-foreground">
                          Pedido #{formatOrderNumber(order)}
                        </span>
                      </div>
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${status.className}`}
                      >
                        {status.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(order.created_at)}</span>
                      <span className="mx-2">-</span>
                      <span>{order.item_count} itens</span>
                    </div>
                    <div className="text-lg font-bold text-foreground">
                      {formatCurrency(order.total_amount)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
