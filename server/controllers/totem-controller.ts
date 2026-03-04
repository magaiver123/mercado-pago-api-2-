import { NextResponse } from "next/server"
import { activateTotemService } from "@/api/services/totem/activate-totem-service"
import { validateTotemStatusService } from "@/api/services/totem/validate-totem-status-service"
import {
  clearStoreContextCookie,
  setStoreContextCookie,
} from "@/api/utils/store-context"

export async function activateTotemController(request: Request) {
  let body: any = null
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Payload invalido" }, { status: 400 })
  }

  const data = await activateTotemService({
    activationCode: body?.activationCode,
    deviceId: body?.deviceId,
  })

  return NextResponse.json(data)
}

export async function totemStatusController(request: Request) {
  let body: any = null
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Device ID invalido" }, { status: 400 })
  }

  const data = await validateTotemStatusService(body?.deviceId)
  const response = NextResponse.json(data)

  if (data.allowed === true && data.storeId && typeof body?.deviceId === "string") {
    setStoreContextCookie(response, {
      storeId: data.storeId,
      deviceId: body.deviceId,
    })
  } else {
    clearStoreContextCookie(response)
  }

  return response
}
