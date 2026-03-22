import { NextResponse } from "next/server"
import { AppError } from "@/api/utils/app-error"
import { getAdminBypassStatusService } from "@/api/services/totem/admin-bypass-service"
import { requireStoreContextFromRequest } from "@/api/utils/store-context"
import { requireUserSessionFromRequest } from "@/api/utils/user-session-context"
import { upsertTotemPrinterConfigService } from "@/api/services/printing/upsert-totem-printer-config-service"
import { listTotemPrinterConfigsService } from "@/api/services/printing/list-totem-printer-configs-service"
import { createTestPrintJobService } from "@/api/services/printing/create-test-print-job-service"
import { listRecentPrintJobsService } from "@/api/services/printing/list-recent-print-jobs-service"
import { createReceiptPrintJobService } from "@/api/services/printing/create-receipt-print-job-service"
import { agentHeartbeatService } from "@/api/services/printing/agent-heartbeat-service"
import { agentClaimNextPrintJobService } from "@/api/services/printing/agent-claim-next-print-job-service"
import {
  agentAckPrintJobFailureService,
  agentAckPrintJobSuccessService,
} from "@/api/services/printing/agent-ack-print-job-service"

function getAdminBypassErrorStatus(reason: string): number {
  if (reason === "disabled") return 403
  if (reason === "invalid_store") return 404
  return 401
}

async function requireAdminStoreIdFromBypass(request: Request): Promise<string> {
  const bypassStatus = await getAdminBypassStatusService(request)
  if (!bypassStatus.allowed || !bypassStatus.storeId) {
    throw new AppError(
      "Acesso negado para configuracao de impressoras",
      getAdminBypassErrorStatus(bypassStatus.reason),
    )
  }

  return bypassStatus.storeId
}

async function safeParseJson(request: Request): Promise<any> {
  try {
    return await request.json()
  } catch {
    return null
  }
}

export async function listTotemPrinterConfigsController(request: Request) {
  const storeId = await requireAdminStoreIdFromBypass(request)
  const data = await listTotemPrinterConfigsService({ storeId })
  return NextResponse.json(data)
}

export async function upsertTotemPrinterConfigController(request: Request) {
  const storeId = await requireAdminStoreIdFromBypass(request)
  const body = await safeParseJson(request)
  if (!body) {
    return NextResponse.json({ error: "Payload invalido" }, { status: 400 })
  }

  const data = await upsertTotemPrinterConfigService({
    storeId,
    totemId: body?.totemId,
    connectionType: body?.connectionType,
    ip: body?.ip,
    port: body?.port,
    model: body?.model,
    escposProfile: body?.escposProfile,
    paperWidthMm: body?.paperWidthMm,
    isActive: body?.isActive,
  })

  return NextResponse.json(data)
}

export async function createTestPrintJobController(request: Request) {
  const storeId = await requireAdminStoreIdFromBypass(request)
  const body = await safeParseJson(request)
  if (!body) {
    return NextResponse.json({ error: "Payload invalido" }, { status: 400 })
  }

  const data = await createTestPrintJobService({
    storeId,
    totemId: body?.totemId,
  })

  return NextResponse.json(data)
}

export async function listRecentPrintJobsController(request: Request) {
  const storeId = await requireAdminStoreIdFromBypass(request)
  const { searchParams } = new URL(request.url)
  const data = await listRecentPrintJobsService({
    storeId,
    limit: searchParams.get("limit"),
  })
  return NextResponse.json(data)
}

export async function createReceiptPrintJobController(request: Request) {
  const storeContext = requireStoreContextFromRequest(request)
  const userSession = requireUserSessionFromRequest(request)
  if (userSession.source !== "kiosk") {
    throw new AppError("Somente sessoes de totem podem criar impressao de comprovante", 403)
  }

  const body = await safeParseJson(request)
  if (!body) {
    return NextResponse.json({ error: "Payload invalido" }, { status: 400 })
  }

  const data = await createReceiptPrintJobService({
    storeId: storeContext.storeId,
    deviceId: storeContext.deviceId,
    orderId: body?.orderId,
    receipt: body?.receipt,
  })

  return NextResponse.json(data)
}

export async function printAgentHeartbeatController(request: Request) {
  const body = await safeParseJson(request)
  if (!body) {
    return NextResponse.json({ error: "Payload invalido" }, { status: 400 })
  }

  const data = await agentHeartbeatService({
    deviceId: body?.deviceId,
    status: body?.status,
    error: body?.error,
    agentVersion: body?.agentVersion,
  })

  return NextResponse.json(data)
}

export async function printAgentClaimNextJobController(request: Request) {
  const body = await safeParseJson(request)
  if (!body) {
    return NextResponse.json({ error: "Payload invalido" }, { status: 400 })
  }

  const data = await agentClaimNextPrintJobService({
    deviceId: body?.deviceId,
    agentId: body?.agentId,
    agentVersion: body?.agentVersion,
  })

  return NextResponse.json(data)
}

export async function printAgentAckSuccessController(request: Request) {
  const body = await safeParseJson(request)
  if (!body) {
    return NextResponse.json({ error: "Payload invalido" }, { status: 400 })
  }

  const data = await agentAckPrintJobSuccessService({
    deviceId: body?.deviceId,
    jobId: body?.jobId,
  })

  return NextResponse.json(data)
}

export async function printAgentAckFailureController(request: Request) {
  const body = await safeParseJson(request)
  if (!body) {
    return NextResponse.json({ error: "Payload invalido" }, { status: 400 })
  }

  const data = await agentAckPrintJobFailureService({
    deviceId: body?.deviceId,
    jobId: body?.jobId,
    error: body?.error,
    retryable: body?.retryable,
  })

  return NextResponse.json(data)
}
