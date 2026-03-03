import { NextResponse } from "next/server"
import { listActiveSlidesService } from "@/api/services/kiosk/list-active-slides-service"

export async function getKioskSlidesController() {
  const slides = await listActiveSlidesService()
  return NextResponse.json(slides)
}

