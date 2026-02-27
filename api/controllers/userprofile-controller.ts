import { NextResponse } from "next/server"
import { getUserProfileService } from "@/api/services/userprofile/get-user-profile-service"
import { updateUserProfileService } from "@/api/services/userprofile/update-user-profile-service"

export async function getUserProfileController(request: Request) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get("userId")

  const data = await getUserProfileService(userId)
  return NextResponse.json(data)
}

export async function updateUserProfileController(request: Request) {
  let body: any = null
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Dados invalidos" }, { status: 400 })
  }

  const data = await updateUserProfileService({
    userId: body?.userId,
    name: body?.name,
    email: body?.email,
    phone: body?.phone,
  })

  return NextResponse.json(data)
}

