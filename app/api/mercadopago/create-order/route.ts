import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const MERCADOPAGO_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN
const MERCADOPAGO_TERMINAL_ID = process.env.MERCADOPAGO_TERMINAL_ID
const TOTEM_API_KEY = process.env.TOTEM_API_KEY

interface OrderItem {
  productId: string
  quantity: number
}

interface OrderRequest {
  externalReference: string
  description: string
  items: OrderItem[]
  paymentMethodId?: string
}

function isValidOrderRequest(body: any): body is OrderRequest {
  if (!body) return false

  if (typeof body.externalReference !== "string" || body.externalReference.trim() === "") {
    return false
  }

  if (typeof body.description !== "string" || body.description.trim() === "") {
    return false
  }

  if (!Array.isArray(body.items) || body.items.length === 0) {
    return false
  }

  for (const item of body.items) {
    if (typeof item.productId !== "string" || item.productId.trim() === "") {
      return false
    }

    if (typeof item.quantity !== "number" || item.quantity <= 0) {
      return false
    }
  }

  if (body.paymentMethodId && typeof body.paymentMethodId !== "string") {
    return false
  }

  return true
}

export async function POST(request: Request) {
  try {
    /* ===============================
       1) VALIDAR SISTEMA (TOTEM)
    =============================== */
    const totemKey = request.headers.get("x-totem-key")

    if (!TOTEM_API_KEY || !totemKey || totemKey !== TOTEM_API_KEY) {
      return NextResponse.json(
        { error: "Sistema não autorizado" },
        { status: 401 },
      )
    }

    /* ===============================
       2) VALIDAR CONFIGURAÇÕES
    =============================== */
    if (!MERCADOPAGO_ACCESS_TOKEN || !MERCADOPAGO_TERMINAL_ID) {
      return NextResponse.json(
        { error: "Mercado Pago credentials not configured" },
        { status: 500 },
      )
    }

    /* ===============================
       3) VALIDAR PAYLOAD
    =============================== */
    const body = await request.json()

    if (!isValidOrderRequest(body)) {
      return NextResponse.json(
        { error: "Invalid request payload" },
        { status: 400 },
      )
    }

    const { externalReference, description, items, paymentMethodId } = body

    /* ===============================
       4) CALCULAR TOTAL NO BACKEND
    =============================== */
    const supabase = createClient()

    let totalAmount = 0

    for (const item of items) {
      const { data: product, error } = await (await supabase)
        .from("products")
        .select("price, is_active")
        .eq("id", item.productId)
        .single()

      if (error || !product || !product.is_active) {
        return NextResponse.json(
          { error: "Produto inválido ou inativo" },
          { status: 400 },
        )
      }

      totalAmount += product.price * item.quantity
    }

    if (totalAmount <= 0) {
      return NextResponse.json(
        { error: "Valor total inválido" },
        { status: 400 },
      )
    }

    /* ===============================
       5) CRIAR PEDIDO NO MERCADO PAGO
    =============================== */
    const mappedPaymentMethod = paymentMethodId === "pix" ? "qr" : paymentMethodId

    const orderPayload = {
      type: "point",
      external_reference: externalReference,
      description,
      expiration_time: "PT30M",
      transactions: {
        payments: [
          {
            amount: totalAmount.toFixed(2),
          },
        ],
      },
      config: {
        point: {
          terminal_id: MERCADOPAGO_TERMINAL_ID,
          print_on_terminal: "no_ticket",
        },
        ...(mappedPaymentMethod && {
          payment_method: {
            default_type: mappedPaymentMethod,
          },
        }),
      },
    }

    const idempotencyKey = `order-${externalReference}`

    const response = await fetch("https://api.mercadopago.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${MERCADOPAGO_ACCESS_TOKEN}`,
        "X-Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(orderPayload),
    })

    const data = await response.json()

    if (!response.ok) {
      if (data?.errors?.[0]?.code === "already_queued_order_on_terminal") {
        return NextResponse.json(
          {
            error:
              "Já existe um pedido pendente no terminal. Cancele manualmente no terminal e tente novamente.",
          },
          { status: 409 },
        )
      }

      return NextResponse.json(
        { error: data?.message || "Erro ao criar pedido no Mercado Pago" },
        { status: response.status },
      )
    }

    return NextResponse.json({
      orderId: data.id,
      status: data.status,
      externalReference: data.external_reference,
      totalAmount: totalAmount.toFixed(2),
    })
  } catch (error) {
    console.error("[create-order] Internal error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}
