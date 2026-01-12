import { NextResponse } from "next/server"

const MERCADOPAGO_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN
const MERCADOPAGO_TERMINAL_ID = process.env.MERCADOPAGO_TERMINAL_ID

interface OrderRequest {
  externalReference: string
  title: string
  description: string
  totalAmount: number
  paymentMethodId?: string
}

export async function POST(request: Request) {
  try {
    if (!MERCADOPAGO_ACCESS_TOKEN || !MERCADOPAGO_TERMINAL_ID) {
      return NextResponse.json({ error: "Mercado Pago credentials not configured" }, { status: 500 })
    }

    const body: OrderRequest = await request.json()
    const { externalReference, description, totalAmount, paymentMethodId } = body

    // Users should manually cancel pending orders on the terminal if needed

    const mappedPaymentMethod = paymentMethodId === "pix" ? "qr" : paymentMethodId

    const orderPayload = {
      type: "point",
      external_reference: externalReference,
      description: description,
      expiration_time: "PT30M",
      transactions: {
        payments: [
          {
            amount: totalAmount.toString(),
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

    const idempotencyKey = `${externalReference}-${Date.now()}`

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
      if (data.errors?.[0]?.code === "already_queued_order_on_terminal") {
        return NextResponse.json(
          { error: "Já existe um pedido pendente no terminal. Cancele manualmente no terminal e tente novamente." },
          { status: 409 },
        )
      }

      return NextResponse.json(
        { error: data.message || "Erro ao criar pedido no Mercado Pago" },
        { status: response.status },
      )
    }

    return NextResponse.json({
      orderId: data.id,
      status: data.status,
      externalReference: data.external_reference,
    })
  } catch (error) {
    console.error("[v0] Error in create-order route:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
