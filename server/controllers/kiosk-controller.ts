import { NextResponse } from "next/server"
import { listActiveSlidesService } from "@/api/services/kiosk/list-active-slides-service"
import { requireStoreContextFromRequest } from "@/api/utils/store-context"

export async function getKioskSlidesController(request: Request) {
  const storeContext = requireStoreContextFromRequest(request)
  const slides = await listActiveSlidesService(storeContext.storeId)
  return NextResponse.json(slides)
}
