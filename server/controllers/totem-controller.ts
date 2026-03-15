import { NextResponse } from "next/server"
import { activateTotemService } from "@/api/services/totem/activate-totem-service"
import { validateTotemStatusService } from "@/api/services/totem/validate-totem-status-service"
import {
  activateAdminBypassService,
  getAdminBypassStatusService,
} from "@/api/services/totem/admin-bypass-service"
import {
  clearAdminBypassCookie,
  getAdminBypassDeviceId,
  setAdminBypassCookie,
} from "@/api/utils/admin-bypass-context"
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

export async function activateAdminBypassController(request: Request) {
  let body: any = null
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Payload invalido" }, { status: 400 })
  }

  const data = await activateAdminBypassService(request, {
    storeSlug: body?.storeSlug,
  })

  if (!data.allowed) {
    const status =
      data.reason === "disabled"
        ? 403
        : data.reason === "invalid_store"
          ? 404
          : 401

    const response = NextResponse.json(data, { status })
    clearAdminBypassCookie(response)
    clearStoreContextCookie(response)
    return response
  }

  const response = NextResponse.json(data)
  setAdminBypassCookie(response, {
    userId: data.userId!,
    storeId: data.storeId!,
    storeSlug: data.storeSlug!,
  })
  setStoreContextCookie(response, {
    storeId: data.storeId!,
    deviceId: getAdminBypassDeviceId(data.userId!),
  })

  return response
}

export async function adminBypassStatusController(request: Request) {
  const data = await getAdminBypassStatusService(request)
  const response = NextResponse.json(data)

  if (data.allowed) {
    setAdminBypassCookie(response, {
      userId: data.userId!,
      storeId: data.storeId!,
      storeSlug: data.storeSlug!,
    })
    setStoreContextCookie(response, {
      storeId: data.storeId!,
      deviceId: getAdminBypassDeviceId(data.userId!),
    })
  } else {
    clearAdminBypassCookie(response)
    clearStoreContextCookie(response)
  }

  return response
}

export async function deactivateAdminBypassController() {
  const response = NextResponse.json({ success: true })
  clearAdminBypassCookie(response)
  clearStoreContextCookie(response)
  return response
}
