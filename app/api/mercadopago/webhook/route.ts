import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const body = await request.json()

    console.log("[WEBHOOK RECEIVED]", JSON.stringify(body, null, 2))

    const action = body.action
    const mpOrderId = body?.data?.id

    if (!action || !mpOrderId) {
      return NextResponse.json({ ok: true })
    }

    let newStatus: string | null = null

    switch (action) {
      case "order.processed":
        newStatus = "processed"
        break
      case "order.canceled":
        newStatus = "canceled"
        break
      case "order.failed":
        newStatus = "failed"
        break
      case "order.expired":
        newStatus = "expired"
        break
      case "order.refunded":
        newStatus = "refunded"
        break
      case "order.action_required":
        newStatus = "action_required"
        break
    }

    if (newStatus) {
      await supabase
        .from("orders")
        .update({ status: newStatus })
        .eq("mercadopago_order_id", mpOrderId)

      console.log("[WEBHOOK UPDATED]", mpOrderId, newStatus)
    }

    // ⚠️ SEMPRE 200
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[WEBHOOK ERROR]", error)
    // ⚠️ Mesmo com erro, sempre 200
    return NextResponse.json({ ok: true })
  }
}
