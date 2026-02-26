import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function isValidUUID(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function getItemCount(items: unknown) {
  if (!Array.isArray(items)) return 0;

  return items.reduce((total, item) => {
    if (typeof item !== "object" || item === null) {
      return total;
    }

    const quantity = (item as { quantity?: unknown }).quantity;
    if (typeof quantity === "number" && Number.isFinite(quantity)) {
      return total + Math.max(0, quantity);
    }

    if (typeof quantity === "string") {
      const parsed = Number(quantity);
      if (Number.isFinite(parsed)) {
        return total + Math.max(0, parsed);
      }
    }

    return total + 1;
  }, 0);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId || !isValidUUID(userId)) {
      return NextResponse.json(
        { error: "Usuario invalido" },
        { status: 400 }
      );
    }

    const supabase = createClient();

    const { data: user, error: userError } = await (await supabase)
      .from("users")
      .select("id, status")
      .eq("id", userId)
      .eq("status", "ativo")
      .maybeSingle();

    if (userError) {
      return NextResponse.json(
        { error: "Erro ao validar usuario" },
        { status: 500 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { error: "Usuario nao encontrado" },
        { status: 404 }
      );
    }

    const { data, error } = await (await supabase)
      .from("orders")
      .select("id, order_number, status, total_amount, items, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: "Erro ao carregar pedidos" },
        { status: 500 }
      );
    }

    const orders = (data ?? []).map((order) => ({
      ...order,
      item_count: getItemCount(order.items),
    }));

    return NextResponse.json(orders);
  } catch {
    return NextResponse.json(
      { error: "Erro interno" },
      { status: 500 }
    );
  }
}
