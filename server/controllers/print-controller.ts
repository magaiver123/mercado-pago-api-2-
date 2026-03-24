import { NextResponse } from "next/server"
import { AppError } from "@/api/utils/app-error"
import { getAdminBypassStatusService } from "@/api/services/totem/admin-bypass-service"
import { requireActiveAdminSessionService } from "@/api/services/auth/require-active-admin-session-service"
import { requireStoreContextFromRequest } from "@/api/utils/store-context"
import { requireUserSessionFromRequest } from "@/api/utils/user-session-context"
import { getPrintAdminEnv } from "@/api/config/env"
import { isValidUUID } from "@/api/utils/validators"
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
import { getPrintGlobalSettingsService } from "@/api/services/printing/get-print-global-settings-service"
import { updatePrintGlobalSettingsService } from "@/api/services/printing/update-print-global-settings-service"
import { listGlobalPrinterStatusService } from "@/api/services/printing/list-global-printer-status-service"
import { authenticatePrintAgentRequest } from "@/api/services/printing/agent-auth-service"

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

async function requireGlobalAdminAccess(request: Request) {
  await requireActiveAdminSessionService(request)
}

function getStoreIdFromBody(body: unknown): string | null {
  const candidate =
    typeof body === "object" && body !== null && typeof (body as any).storeId === "string"
      ? (body as any).storeId
      : null

  if (!candidate) return null
  const normalized = candidate.trim()
  if (!isValidUUID(normalized)) return null
  return normalized
}

function getStoreIdFromQuery(request: Request): string | null {
  const { searchParams } = new URL(request.url)
  const candidate = searchParams.get("storeId") ?? searchParams.get("store_id")
  if (!candidate) return null
  const normalized = candidate.trim()
  if (!isValidUUID(normalized)) return null
  return normalized
}

function hasValidPrintAdminToken(request: Request): boolean {
  const { apiToken } = getPrintAdminEnv()
  const token = request.headers.get("x-print-admin-token")
  return Boolean(token && token === apiToken)
}

async function requirePrintingStoreAdminAccess(request: Request, body?: unknown): Promise<string> {
  if (hasValidPrintAdminToken(request)) {
    const storeId = getStoreIdFromBody(body) ?? getStoreIdFromQuery(request)
    if (!storeId) {
      throw new AppError("storeId invalido", 400, "STORE_CONTEXT_MISMATCH", true, false)
    }
    return storeId
  }

  return requireAdminStoreIdFromBypass(request)
}

async function requirePrintingGlobalAdminAccess(request: Request) {
  if (hasValidPrintAdminToken(request)) return
  await requireGlobalAdminAccess(request)
}

async function parseJsonOrThrow(
  request: Request,
  code = "RECEIPT_PAYLOAD_INVALID",
): Promise<{ raw: string; body: any }> {
  let raw = ""
  try {
    raw = await request.text()
  } catch {
    throw new AppError("Payload invalido", 400, code, true, false)
  }

  if (!raw || raw.trim() === "") {
    throw new AppError("Payload invalido", 400, code, true, false)
  }

  try {
    return { raw, body: JSON.parse(raw) }
  } catch {
    throw new AppError("Payload invalido", 400, code, true, false)
  }
}

export async function listTotemPrinterConfigsController(request: Request) {
  const storeId = await requirePrintingStoreAdminAccess(request)
  const data = await listTotemPrinterConfigsService({ storeId })
  return NextResponse.json(data)
}

export async function getPrintGlobalSettingsController(request: Request) {
  await requirePrintingGlobalAdminAccess(request)
  const data = await getPrintGlobalSettingsService()
  return NextResponse.json(data)
}

export async function updatePrintGlobalSettingsController(request: Request) {
  await requirePrintingGlobalAdminAccess(request)
  const parsed = await parseJsonOrThrow(request)
  const body = parsed.body

  const data = await updatePrintGlobalSettingsService({
    defaultConnectionType: body?.defaultConnectionType ?? body?.default_connection_type,
    defaultPort: body?.defaultPort ?? body?.default_port,
    defaultEscposProfile: body?.defaultEscposProfile ?? body?.default_escpos_profile,
    defaultPaperWidthMm: body?.defaultPaperWidthMm ?? body?.default_paper_width_mm,
    queueClaimIntervalMs: body?.queueClaimIntervalMs ?? body?.queue_claim_interval_ms,
    heartbeatIntervalMs: body?.heartbeatIntervalMs ?? body?.heartbeat_interval_ms,
    maxRetryAttempts: body?.maxRetryAttempts ?? body?.max_retry_attempts,
  })
  return NextResponse.json(data)
}

export async function listGlobalPrinterStatusController(request: Request) {
  await requirePrintingGlobalAdminAccess(request)
  const { searchParams } = new URL(request.url)
  const data = await listGlobalPrinterStatusService({
    limit: searchParams.get("limit"),
  })
  return NextResponse.json(data)
}

export async function upsertTotemPrinterConfigController(request: Request) {
  const parsed = await parseJsonOrThrow(request)
  const body = parsed.body
  const storeId = await requirePrintingStoreAdminAccess(request, body)

  const data = await upsertTotemPrinterConfigService({
    storeId,
    totemId: body?.totemId ?? body?.totem_id,
    connectionType: body?.connectionType ?? body?.connection_type,
    ip: body?.ip,
    port: body?.port,
    model: body?.model,
    escposProfile: body?.escposProfile ?? body?.escpos_profile,
    paperWidthMm: body?.paperWidthMm ?? body?.paper_width_mm,
    isActive: body?.isActive ?? body?.is_active,
  })

  return NextResponse.json(data)
}

export async function createTestPrintJobController(request: Request) {
  const parsed = await parseJsonOrThrow(request)
  const body = parsed.body
  const storeId = await requirePrintingStoreAdminAccess(request, body)

  const data = await createTestPrintJobService({
    storeId,
    totemId: body?.totemId ?? body?.totem_id,
  })

  return NextResponse.json(data)
}

export async function listRecentPrintJobsController(request: Request) {
  const storeId = await requirePrintingStoreAdminAccess(request)
  const { searchParams } = new URL(request.url)
  const data = await listRecentPrintJobsService({
    storeId,
    limit: searchParams.get("limit"),
    status: searchParams.get("status"),
    totemId: searchParams.get("totemId") ?? searchParams.get("totem_id"),
  })
  return NextResponse.json(data)
}

export async function createReceiptPrintJobController(request: Request) {
  const storeContext = requireStoreContextFromRequest(request)
  const userSession = requireUserSessionFromRequest(request)
  if (userSession.source !== "kiosk") {
    throw new AppError(
      "Somente sessoes de totem podem criar impressao de comprovante",
      403,
      "KIOSK_SESSION_INVALID",
      true,
      false,
    )
  }

  const parsed = await parseJsonOrThrow(request, "RECEIPT_PAYLOAD_INVALID")
  const body = parsed.body

  const data = await createReceiptPrintJobService({
    storeId: storeContext.storeId,
    deviceId: storeContext.deviceId,
    orderId: body?.orderId,
    receipt: body?.receipt,
  })

  return NextResponse.json(data)
}

export async function printAgentHeartbeatController(request: Request) {
  const parsed = await parseJsonOrThrow(request, "RECEIPT_PAYLOAD_INVALID")
  const auth = authenticatePrintAgentRequest({
    request,
    bodyText: parsed.raw,
    body: parsed.body,
  })
  const body = parsed.body

  const data = await agentHeartbeatService({
    deviceId: auth.deviceId,
    agentId: auth.agentId ?? body?.agentId,
    status: body?.status,
    error: body?.error,
    agentVersion: auth.agentVersion ?? body?.agentVersion,
  })

  return NextResponse.json(data)
}

export async function printAgentClaimNextJobController(request: Request) {
  const parsed = await parseJsonOrThrow(request, "RECEIPT_PAYLOAD_INVALID")
  const auth = authenticatePrintAgentRequest({
    request,
    bodyText: parsed.raw,
    body: parsed.body,
  })
  const body = parsed.body

  const data = await agentClaimNextPrintJobService({
    deviceId: auth.deviceId,
    agentId: auth.agentId ?? body?.agentId,
    agentVersion: auth.agentVersion ?? body?.agentVersion,
  })

  return NextResponse.json(data)
}

export async function printAgentAckSuccessController(request: Request) {
  const parsed = await parseJsonOrThrow(request, "RECEIPT_PAYLOAD_INVALID")
  const auth = authenticatePrintAgentRequest({
    request,
    bodyText: parsed.raw,
    body: parsed.body,
  })
  const body = parsed.body

  const data = await agentAckPrintJobSuccessService({
    deviceId: auth.deviceId,
    agentId: auth.agentId ?? body?.agentId,
    jobId: body?.jobId,
  })

  return NextResponse.json(data)
}

export async function printAgentAckFailureController(request: Request) {
  const parsed = await parseJsonOrThrow(request, "RECEIPT_PAYLOAD_INVALID")
  const auth = authenticatePrintAgentRequest({
    request,
    bodyText: parsed.raw,
    body: parsed.body,
  })
  const body = parsed.body

  const data = await agentAckPrintJobFailureService({
    deviceId: auth.deviceId,
    agentId: auth.agentId ?? body?.agentId,
    jobId: body?.jobId,
    error: body?.error,
    errorCode: body?.errorCode ?? body?.error_code,
    retryable: body?.retryable,
  })

  return NextResponse.json(data)
}
