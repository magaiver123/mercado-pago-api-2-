import { NextResponse } from "next/server"
import { orderStatusStore } from "@/lib/order-status-store"

export const dynamic = "force-dynamic";

const MERCADOPAGO_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN

export async function GET(request: Request) {
  try {
    if (!MERCADOPAGO_ACCESS_TOKEN) {
      return NextResponse.json({ error: "Mercado Pago access token not configured" }, { status: 500 })
    }

    const { searchParams } = new URL(request.url)
    const orderId = searchParams.get("orderId")

    if (!orderId) {
      return NextResponse.json({ error: "Order ID is required" }, { status: 400 })
    }

    const cachedStatus = orderStatusStore.get(orderId)
    if (cachedStatus) {
      console.log("[v0] Returning cached status from webhook:", cachedStatus)

      // Map webhook states to order status format
      let status = cachedStatus.state.toLowerCase()
      let statusDetail = ""

      if (cachedStatus.state === "FINISHED" && cachedStatus.payment?.state === "approved") {
        status = "processed"
        statusDetail = "accredited"
      } else if (cachedStatus.state === "CANCELED") {
        status = "cancelled"
      } else if (cachedStatus.state === "ERROR") {
        status = "error"
      }

      return NextResponse.json({
        orderId: cachedStatus.orderId,
        status,
        statusDetail,
        payment: cachedStatus.payment,
        source: "webhook",
      })
    }

    const response = await fetch(`https://api.mercadopago.com/v1/orders/${orderId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${MERCADOPAGO_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
    })

    const data = await response.json()

    if (!response.ok) {
      console.error("[v0] Mercado Pago API error:", data)
      return NextResponse.json(
        { error: data.message || "Erro ao consultar status do pedido" },
        { status: response.status },
      )
    }

    return NextResponse.json({
      orderId: data.id,
      status: data.status,
      statusDetail: data.status_detail,
      transactions: data.transactions,
      externalReference: data.external_reference,
      source: "api",
    })
  } catch (error) {
    console.error("[v0] Error in order-status route:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
