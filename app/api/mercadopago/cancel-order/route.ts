import { NextResponse } from "next/server";

export async function DELETE(request: NextResponse) {
  try {
    const { searchParams } = new URL(request.url)
    const orderId = searchParams.get("orderId")

    console.log("[v0] Cancel order request received for:", orderId)

    if (!orderId) {
      console.log("[v0] Error: No order ID provided")
      return NextResponse.json({ error: "Order ID é obrigatório" }, { status: 400 })
    }

    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN

    if (!accessToken) {
      console.log("[v0] Error: Access token not configured")
      return NextResponse.json({ error: "Token de acesso não configurado" }, { status: 500 })
    }

    console.log("[v0] Sending DELETE request to Mercado Pago API...")

    // Cancela o pedido na API do Mercado Pago
    const response = await fetch(`https://api.mercadopago.com/v1/orders/${orderId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    })

    console.log("[v0] Mercado Pago API response status:", response.status)

    if (!response.ok) {
      const contentType = response.headers.get("content-type")
      let errorData

      // Verifica se a resposta é JSON ou texto
      if (contentType && contentType.includes("application/json")) {
        errorData = await response.json()
        console.log("[v0] Error response from Mercado Pago (JSON):", JSON.stringify(errorData, null, 2))
      } else {
        const errorText = await response.text()
        console.log("[v0] Error response from Mercado Pago (Text):", errorText)
        errorData = { message: errorText }
      }

      // Mensagem específica para erro 500 do Mercado Pago
      if (response.status === 500) {
        return NextResponse.json(
          {
            error: "O pedido não pode ser cancelado no momento. Ele pode já estar sendo processado no terminal.",
            details: errorData,
          },
          { status: response.status },
        )
      }

      return NextResponse.json({ error: "Erro ao cancelar pedido", details: errorData }, { status: response.status })
    }

    // Resposta de sucesso também pode ser texto ou JSON
    const contentType = response.headers.get("content-type")
    let successData

    if (contentType && contentType.includes("application/json")) {
      successData = await response.json()
      console.log("[v0] Order cancelled successfully:", JSON.stringify(successData, null, 2))
    } else {
      console.log("[v0] Order cancelled successfully (no JSON response)")
      successData = { message: "Cancelled" }
    }

    return NextResponse.json({
      success: true,
      message: "Pedido cancelado com sucesso",
    })
  } catch (error) {
    console.error("[v0] Exception while cancelling order:", error)
    return NextResponse.json(
      {
        error: "Erro ao cancelar pedido. Tente cancelar manualmente no terminal.",
      },
      { status: 500 },
    )
  }
}
