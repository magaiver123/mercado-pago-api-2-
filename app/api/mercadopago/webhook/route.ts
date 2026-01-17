import { NextResponse } from "next/server"
import crypto from "crypto"
import { createClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // obrigatório aqui
)

export async function POST(request: Request) {
  try {
    const body = await request.json()

    console.log("[webhook] received:", body)

    const { id: mercadopagoOrderId, state, payment } = body

    if (!mercadopagoOrderId) {
      return NextResponse.json({ ok: true })
    }

    // Mapeamento Mercado Pago → seu sistema
    let newStatus = "pending"

    if (state === "FINISHED" && payment?.state === "processed") {
      newStatus = "processed"
    } else if (state === "CANCELED") {
      newStatus = "cancelled"
    } else if (state === "ERROR") {
      newStatus = "failed"
    }

    await supabase
      .from("orders")
      .update({ status: newStatus })
      .eq("mercadopago_order_id", mercadopagoOrderId)

    console.log(
      "[webhook] order updated:",
      mercadopagoOrderId,
      "status:",
      newStatus
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[webhook] error:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
