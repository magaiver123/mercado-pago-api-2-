import { NextResponse } from "next/server"
import { createMercadoPagoOrderService } from "@/api/services/mercadopago/create-mercadopago-order-service"
import { cancelMercadoPagoOrderService } from "@/api/services/mercadopago/cancel-mercadopago-order-service"
import { processMercadoPagoWebhookService } from "@/api/services/mercadopago/process-mercadopago-webhook-service"
import { getOrderStatusService } from "@/api/services/orders/get-order-status-service"

export async function createMercadoPagoOrderController(request: Request) {
  let body: any = null
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 })
  }

  const data = await createMercadoPagoOrderService(body)
  return NextResponse.json(data)
}

export async function cancelMercadoPagoOrderController(request: Request) {
  const { searchParams } = new URL(request.url)
  const orderId = searchParams.get("orderId")

  const result = await cancelMercadoPagoOrderService(orderId)
  return NextResponse.json(result.body, { status: result.status })
}

export async function getMercadoPagoOrderStatusController(request: Request) {
  const { searchParams } = new URL(request.url)
  const orderId = searchParams.get("orderId")
  const data = await getOrderStatusService(orderId)
  return NextResponse.json(data)
}

export async function mercadopagoWebhookController(request: Request) {
  let body: any = null
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: true })
  }

  await processMercadoPagoWebhookService(body)
  return NextResponse.json({ ok: true })
}

