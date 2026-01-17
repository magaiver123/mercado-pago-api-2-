import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const body = await request.json();

    console.log("[WEBHOOK RECEIVED]", body);

    const mpOrderId = body?.data?.id;
    const status = body?.data?.status;

    if (!mpOrderId || !status) {
      // ⚠️ Mesmo inválido, RESPONDE 200
      return NextResponse.json({ ok: true });
    }

    let newStatus = "pending";

    if (status === "processed") {
      newStatus = "processed";
    } else if (status === "canceled" || status === "cancelled") {
      newStatus = "cancelled";
    } else if (status === "error" || status === "failed") {
      newStatus = "failed";
    }

    await supabase
      .from("orders")
      .update({ status: newStatus })
      .eq("mercadopago_order_id", mpOrderId);

    console.log("[WEBHOOK UPDATED]", mpOrderId, newStatus);

    // ✅ SEMPRE 200
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[WEBHOOK ERROR]", err);

    // ⚠️ MESMO COM ERRO, RETORNE 200
    return NextResponse.json({ ok: true });
  }
}
