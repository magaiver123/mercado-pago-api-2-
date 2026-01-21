import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      persistSession: false,
    },
  }
);

export async function POST(request: Request) {
  try {
    const body = await request.json();

    console.log("[WEBHOOK RECEIVED]", JSON.stringify(body, null, 2));

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

    // ===============================
    // ✅ PEDIDO PAGO → DESCONTA ESTOQUE
    // ===============================
    if (newStatus === "processed") {
      const { data: order, error } = await supabase
        .from("orders")
        .select("id, items, stock_processed")
        .eq("mercadopago_order_id", mpOrderId)
        .single();

      if (error || !order) {
        console.error("[WEBHOOK] Pedido não encontrado:", mpOrderId);
        return NextResponse.json({ ok: true });
      }

      // evita desconto duplicado
      if (order.stock_processed) {
        console.log("[WEBHOOK] Estoque já processado:", mpOrderId);
        return NextResponse.json({ ok: true });
      }

      for (const item of order.items as any[]) {
        console.log("[WEBHOOK ITEM]", item);

        const productId = item.id;
        const quantity = item.quantity;

        if (!productId || !quantity) {
          console.error("[WEBHOOK] Item inválido:", item);
          continue;
        }

        const { data: stock, error: stockError } = await supabase
          .from("product_stock")
          .select("quantity")
          .eq("product_id", productId)
          .single();

        if (stockError || !stock) {
          console.error("[WEBHOOK] Estoque não encontrado:", productId);
          continue;
        }

        const newQuantity = stock.quantity - quantity;

        if (newQuantity < 0) {
          console.error("[WEBHOOK] Estoque negativo evitado:", productId);
          continue;
        }

        await supabase
          .from("product_stock")
          .update({
            quantity: newQuantity,
            updated_at: new Date().toISOString(),
          })
          .eq("product_id", productId);

        await supabase.from("stock_movements").insert({
          product_id: productId,
          type: "saida",
          quantity,
          reason: `Venda - Pedido ${mpOrderId}`,
          user_id: null,
          created_at: new Date().toISOString(),
        });
      }

      await supabase
        .from("orders")
        .update({
          status: "processed",
          stock_processed: true,
        })
        .eq("id", order.id);

      console.log("[WEBHOOK] Estoque descontado com sucesso:", mpOrderId);
    } else if (newStatus) {
      await supabase
        .from("orders")
        .update({ status: newStatus })
        .eq("mercadopago_order_id", mpOrderId);

      console.log("[WEBHOOK UPDATED]", mpOrderId, newStatus);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[WEBHOOK ERROR]", error);
    return NextResponse.json({ ok: true });
  }
}
