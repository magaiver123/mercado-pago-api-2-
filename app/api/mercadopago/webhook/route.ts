import { type NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { orderStatusStore } from "@/lib/order-status-store"

export async function POST(request: NextRequest) {
  try {
    // Get headers
    const xSignature = request.headers.get("x-signature")
    const xRequestId = request.headers.get("x-request-id")

    // Get the request body
    const body = await request.json()

    console.log("[v0] Webhook received:", JSON.stringify(body, null, 2))

    // Validate webhook signature (uncomment when you configure the secret)
    // const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET
    // if (secret && xSignature && xRequestId) {
    //   const isValid = validateWebhookSignature(xSignature, xRequestId, body, secret)
    //   if (!isValid) {
    //     console.log('[v0] Invalid webhook signature')
    //     return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    //   }
    // }

    const { state, payment, id: orderId } = body

    if (orderId) {
      orderStatusStore.set(orderId, {
        orderId,
        state,
        payment,
        updatedAt: new Date(),
      })

      console.log("[v0] Stored order status:", orderId, "State:", state)
    }

    // Return 200 to acknowledge receipt
    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error("[v0] Error processing webhook:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Helper function to validate webhook signature
function validateWebhookSignature(xSignature: string, xRequestId: string, body: any, secret: string): boolean {
  try {
    // Parse x-signature header
    const parts = xSignature.split(",")
    let ts: string | undefined
    let hash: string | undefined

    parts.forEach((part) => {
      const [key, value] = part.split("=")
      if (key?.trim() === "ts") ts = value?.trim()
      if (key?.trim() === "v1") hash = value?.trim()
    })

    if (!ts || !hash) return false

    // Build manifest string
    const dataId = body.id || ""
    const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`

    // Calculate HMAC
    const hmac = crypto.createHmac("sha256", secret)
    hmac.update(manifest)
    const calculatedHash = hmac.digest("hex")

    return calculatedHash === hash
  } catch (error) {
    console.error("[v0] Error validating signature:", error)
    return false
  }
}
