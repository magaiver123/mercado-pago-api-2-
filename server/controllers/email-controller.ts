import { NextResponse } from "next/server"
import { processResendWebhookService } from "@/api/services/email/process-resend-webhook-service"

export async function resendWebhookController(request: Request) {
  const payload = await request.text()
  const svixId = request.headers.get("svix-id")
  const svixTimestamp = request.headers.get("svix-timestamp")
  const svixSignature = request.headers.get("svix-signature")

  const result = await processResendWebhookService({
    payload,
    svixId,
    svixTimestamp,
    svixSignature,
  })

  return NextResponse.json(result)
}

