import { NextResponse } from "next/server"
import { createMercadoPagoOrderService } from "@/api/services/mercadopago/create-mercadopago-order-service"
import { cancelMercadoPagoOrderService } from "@/api/services/mercadopago/cancel-mercadopago-order-service"
import { refundMercadoPagoOrderService } from "@/api/services/mercadopago/refund-mercadopago-order-service"
import { processMercadoPagoWebhookService } from "@/api/services/mercadopago/process-mercadopago-webhook-service"
import { getOrderStatusService } from "@/api/services/orders/get-order-status-service"
import { getMercadoPagoWebhookEnv } from "@/api/config/env"
import { validateMercadoPagoWebhookSignatureService } from "@/api/services/mercadopago/validate-mercadopago-webhook-signature-service"
import { requireStoreContextFromRequest } from "@/api/utils/store-context"

export async function createMercadoPagoOrderController(request: Request) {
  const storeContext = requireStoreContextFromRequest(request)

  let body: any = null
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 })
  }

  const data = await createMercadoPagoOrderService(body, storeContext.storeId)
  return NextResponse.json(data)
}

export async function cancelMercadoPagoOrderController(request: Request) {
  const { searchParams } = new URL(request.url)
  const orderId = searchParams.get("orderId")

  const result = await cancelMercadoPagoOrderService(orderId)
  return NextResponse.json(result.body, { status: result.status })
}

export async function refundMercadoPagoOrderController(request: Request) {
  const { searchParams } = new URL(request.url)
  const orderId = searchParams.get("orderId")

  const result = await refundMercadoPagoOrderService(orderId)
  return NextResponse.json(result.body, { status: result.status })
}

export async function getMercadoPagoOrderStatusController(request: Request) {
  const { searchParams } = new URL(request.url)
  const orderId = searchParams.get("orderId")
  const data = await getOrderStatusService(orderId)
  return NextResponse.json(data)
}

export async function mercadopagoWebhookController(request: Request) {
  const { searchParams } = new URL(request.url)
  const dataIdFromQuery = searchParams.get("data.id")
  const xSignature = request.headers.get("x-signature")
  const xRequestId = request.headers.get("x-request-id")

  const { webhookSecret } = getMercadoPagoWebhookEnv()
  const isSignatureValid = validateMercadoPagoWebhookSignatureService({
    xSignature,
    xRequestId,
    dataIdFromQuery,
    secret: webhookSecret,
  })

  if (!isSignatureValid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }

  let body: any = null
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: true })
  }

  await processMercadoPagoWebhookService({
    ...body,
    mercadopagoOrderId: dataIdFromQuery ?? body?.data?.id ?? null,
  })
  return NextResponse.json({ ok: true })
}
