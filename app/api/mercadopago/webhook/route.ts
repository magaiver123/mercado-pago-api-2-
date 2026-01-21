import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const action = body?.action;
    const mpOrderId = body?.data?.id;

    if (!action || !mpOrderId) {
      return NextResponse.json({ ok: true });
    }

    let newStatus: string | null = null;

    switch (action) {
      case "order.processed":
        newStatus = "processed";
        break;
      case "order.canceled":
        newStatus = "canceled";
        break;
      case "order.failed":
        newStatus = "failed";
        break;
      case "order.expired":
        newStatus = "expired";
        break;
      case "order.refunded":
        newStatus = "refunded";
        break;
      case "order.action_required":
        newStatus = "action_required";
        break;
    }

    if (!newStatus) {
      return NextResponse.json({ ok: true });
    }

    // 🔎 Busca pedido
    const { data: order, error } = await supabase
      .from("orders")
      .select("id, status, items")
      .eq("mercadopago_order_id", mpOrderId)
      .single();

    if (error || !order) {
      console.error("[WEBHOOK] Pedido não encontrado:", mpOrderId);
      return NextResponse.json({ ok: true });
    }

    // 🔐 TRAVA DE IDEMPOTÊNCIA REAL
    // Se já estava processed, NÃO desconta novamente
    if (order.status === "processed" && newStatus === "processed") {
      console.log("[WEBHOOK] Pedido já processado:", mpOrderId);
      return NextResponse.json({ ok: true });
    }

    // 🔴 DESCONTO DE ESTOQUE APENAS NO PROCESSADO
    if (newStatus === "processed") {
      for (const item of order.items as any[]) {
        const { data: stock } = await supabase
          .from("product_stock")
          .select("quantity")
          .eq("product_id", item.product_id)
          .single();

        if (!stock) continue;

        const newQuantity = stock.quantity - item.quantity;
        if (newQuantity < 0) continue;

        await supabase
          .from("product_stock")
          .update({
            quantity: newQuantity,
            updated_at: new Date().toISOString(),
          })
          .eq("product_id", item.product_id);

        await supabase.from("stock_movements").insert({
          product_id: item.product_id,
          type: "saida",
          quantity: item.quantity,
          reason: `Venda - Pedido ${mpOrderId}`,
          user_id: null,
          created_at: new Date().toISOString(),
        });
      }
    }

    // 🔄 Atualiza status SEMPRE por último
    await supabase
      .from("orders")
      .update({ status: newStatus })
      .eq("id", order.id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[WEBHOOK ERROR]", error);
    return NextResponse.json({ ok: true });
  }
}
