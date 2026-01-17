import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const MERCADOPAGO_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN!;

export async function GET(request: Request) {
  console.log("🔥 ORDER-STATUS ROUTE NOVA EXECUTANDO");
  try {
    const { searchParams } = new URL(request.url);
    const mpOrderId = searchParams.get("orderId"); // ← ID do Mercado Pago

    if (!mpOrderId) {
      return NextResponse.json({ error: "orderId is required" }, { status: 400 });
    }

    // 1️⃣ LÊ DO BANCO PELO ID DO MP
    const { data: order } = await supabase
      .from("orders")
      .select("status")
      .eq("mercadopago_order_id", mpOrderId)
      .single();

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // 2️⃣ SE JÁ FINALIZOU, RETORNA DIRETO
    if (order.status !== "pending") {
      return NextResponse.json({
        orderId: mpOrderId,
        status: order.status,
        source: "database",
      });
    }

    // 3️⃣ FALLBACK: CONSULTA MP
    const response = await fetch(
      `https://api.mercadopago.com/v1/orders/${mpOrderId}`,
      {
        headers: {
          Authorization: `Bearer ${MERCADOPAGO_ACCESS_TOKEN}`,
        },
      }
    );

    const mpOrder = await response.json();

    let newStatus = "pending";

    // ✅ MAPA CORRETO DO POINT
    if (mpOrder.status === "processed") {
      newStatus = "processed";
    } else if (mpOrder.state === "CANCELED") {
      newStatus = "cancelled";
    } else if (mpOrder.state === "ERROR") {
      newStatus = "failed";
    }

    // 4️⃣ SE MUDOU, ATUALIZA O BANCO
    if (newStatus !== "pending") {
      await supabase
        .from("orders")
        .update({ status: newStatus })
        .eq("mercadopago_order_id", mpOrderId);
    }

    return NextResponse.json({
      orderId: mpOrderId,
      status: newStatus,
      source: "fallback",
    });
  } catch (error) {
    console.error("[order-status]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
