import { NextResponse } from "next/server"
import { getAdminBypassStatusService } from "@/api/services/totem/admin-bypass-service"
import { testOpenLockService } from "@/api/services/locks/test-open-lock-service"

function getAdminBypassErrorStatus(reason: string): number {
  if (reason === "disabled") return 403
  if (reason === "invalid_store") return 404
  return 401
}

export async function testOpenLockController(request: Request) {
  const bypassStatus = await getAdminBypassStatusService(request)
  if (!bypassStatus.allowed || !bypassStatus.storeId) {
    return NextResponse.json(
      {
        error: "Acesso negado para teste de fechadura",
        reason: bypassStatus.reason,
      },
      { status: getAdminBypassErrorStatus(bypassStatus.reason) },
    )
  }

  let body: any = null
  try {
    body = await request.json()
  } catch {}

  const data = await testOpenLockService({
    storeId: bypassStatus.storeId,
    socketId: body?.socketId,
  })

  return NextResponse.json(data)
}
