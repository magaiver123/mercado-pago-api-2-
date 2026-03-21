import { NextResponse } from "next/server"
import { getUserProfileService } from "@/api/services/userprofile/get-user-profile-service"
import { listPublicStoresService } from "@/api/services/userprofile/list-public-stores-service"
import { updateUserProfileService } from "@/api/services/userprofile/update-user-profile-service"
import { requireUserSessionFromRequest } from "@/api/utils/user-session-context"

export async function getUserProfileController(request: Request) {
  const userSession = requireUserSessionFromRequest(request)

  const data = await getUserProfileService(userSession.userId)
  return NextResponse.json(data)
}

export async function listPublicStoresController(request: Request) {
  const { searchParams } = new URL(request.url)

  const data = await listPublicStoresService({
    search: searchParams.get("search"),
    city: searchParams.get("city"),
    page: searchParams.get("page"),
    pageSize: searchParams.get("pageSize"),
  })

  return NextResponse.json(data)
}

export async function updateUserProfileController(request: Request) {
  const userSession = requireUserSessionFromRequest(request)
  let body: any = null
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })
  }

  const data = await updateUserProfileService({
    userId: userSession.userId,
    name: body?.name,
    email: body?.email,
    phone: body?.phone,
  })

  return NextResponse.json(data)
}
