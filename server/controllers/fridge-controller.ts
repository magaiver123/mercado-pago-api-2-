import { NextResponse } from "next/server"
import { AppError } from "@/api/utils/app-error"
import { requireStoreAdminAccess } from "@/api/utils/server-admin-token"
import {
  createAdminFridge,
  getNextFridgeCodePreview,
  inactivateAdminFridge,
  listAdminFridgesByStore,
  listOperationalFridgesForKiosk,
  updateAdminFridge,
} from "@/api/services/fridges/admin-fridges-service"
import {
  adjustFridgeInventory,
  listFridgeInventoryHistory,
  listFridgeInventoryProducts,
  setFridgeInventoryMix,
} from "@/api/services/fridges/admin-fridge-inventory-service"
import {
  createAdminLock,
  listAdminLockDiagnostics,
  listAdminLocksByStore,
  testAdminLockOpen,
  updateAdminLock,
} from "@/api/services/locks/admin-locks-service"
import { requireStoreContextFromRequest } from "@/api/utils/store-context"

async function parseJsonOrThrow(request: Request): Promise<any> {
  try {
    return await request.json()
  } catch {
    throw new AppError("Payload invalido", 400)
  }
}

export async function listAdminFridgesController(request: Request) {
  const storeId = await requireStoreAdminAccess(request)
  const data = await listAdminFridgesByStore(storeId)
  return NextResponse.json({ fridges: data })
}

export async function getNextFridgeCodeController(request: Request) {
  await requireStoreAdminAccess(request)
  const code = await getNextFridgeCodePreview()
  return NextResponse.json({ code })
}

export async function createAdminFridgeController(request: Request) {
  const body = await parseJsonOrThrow(request)
  const storeId = await requireStoreAdminAccess(request, body)
  const result = await createAdminFridge({
    storeId,
    name: body?.name,
    lockId: body?.lockId ?? body?.lock_id,
    expectedCode: body?.expectedCode ?? body?.expected_code,
  })
  return NextResponse.json(result, { status: result.conflict ? 409 : 200 })
}

export async function updateAdminFridgeController(request: Request) {
  const body = await parseJsonOrThrow(request)
  const storeId = await requireStoreAdminAccess(request, body)
  await updateAdminFridge({
    storeId,
    fridgeId: body?.fridgeId ?? body?.fridge_id,
    name: body?.name,
    status: body?.status,
    lockId: body?.lockId ?? body?.lock_id,
    isPrimary: body?.isPrimary ?? body?.is_primary,
  })
  return NextResponse.json({ success: true })
}

export async function inactivateAdminFridgeController(request: Request) {
  const body = await parseJsonOrThrow(request)
  const storeId = await requireStoreAdminAccess(request, body)
  const fridgeId = typeof (body?.fridgeId ?? body?.fridge_id) === "string"
    ? (body?.fridgeId ?? body?.fridge_id)
    : ""
  await inactivateAdminFridge(storeId, fridgeId)
  return NextResponse.json({ success: true })
}

export async function listOperationalFridgesController(request: Request) {
  const storeContext = requireStoreContextFromRequest(request)
  const fridges = await listOperationalFridgesForKiosk(storeContext.storeId)
  return NextResponse.json({ fridges })
}

export async function listAdminLocksController(request: Request) {
  const storeId = await requireStoreAdminAccess(request)
  const data = await listAdminLocksByStore(storeId)
  return NextResponse.json({ locks: data })
}

export async function createAdminLockController(request: Request) {
  const body = await parseJsonOrThrow(request)
  const storeId = await requireStoreAdminAccess(request, body)
  const lock = await createAdminLock({
    storeId,
    deviceId: body?.deviceId ?? body?.device_id,
    status: body?.status,
    isPrimary: body?.isPrimary ?? body?.is_primary,
  })
  return NextResponse.json({ lock })
}

export async function updateAdminLockController(request: Request) {
  const body = await parseJsonOrThrow(request)
  const storeId = await requireStoreAdminAccess(request, body)
  const lock = await updateAdminLock({
    storeId,
    lockId: body?.lockId ?? body?.lock_id ?? body?.id,
    deviceId: body?.deviceId ?? body?.device_id,
    status: body?.status,
    isPrimary: body?.isPrimary ?? body?.is_primary,
  })
  return NextResponse.json({ lock })
}

export async function testAdminLockOpenController(request: Request) {
  const body = await parseJsonOrThrow(request)
  const storeId = await requireStoreAdminAccess(request, body)
  const result = await testAdminLockOpen({
    storeId,
    lockId: body?.lockId ?? body?.lock_id,
    socketId: body?.socketId ?? body?.socket_id,
  })
  return NextResponse.json(result)
}

export async function listAdminLockDiagnosticsController(request: Request) {
  const storeId = await requireStoreAdminAccess(request)
  const { searchParams } = new URL(request.url)
  const diagnostics = await listAdminLockDiagnostics({
    storeId,
    limit: searchParams.get("limit"),
  })
  return NextResponse.json({ diagnostics })
}

export async function listAdminFridgeInventoryController(request: Request) {
  const storeId = await requireStoreAdminAccess(request)
  const { searchParams } = new URL(request.url)
  const fridgeId = searchParams.get("fridge_id")
  const mode = (searchParams.get("mode") ?? "products").toLowerCase()

  if (!fridgeId) {
    throw new AppError("fridge_id e obrigatorio", 400)
  }

  if (mode === "history") {
    const history = await listFridgeInventoryHistory(storeId, fridgeId)
    return NextResponse.json({ history })
  }

  const products = await listFridgeInventoryProducts(storeId, fridgeId)
  return NextResponse.json({ products })
}

export async function setAdminFridgeInventoryMixController(request: Request) {
  const body = await parseJsonOrThrow(request)
  const storeId = await requireStoreAdminAccess(request, body)
  await setFridgeInventoryMix({
    storeId,
    fridgeId: body?.fridgeId ?? body?.fridge_id,
    productId: body?.productId ?? body?.product_id,
    inMix: body?.inMix ?? body?.in_mix,
  })
  return NextResponse.json({ success: true })
}

export async function adjustAdminFridgeInventoryController(request: Request) {
  const body = await parseJsonOrThrow(request)
  const storeId = await requireStoreAdminAccess(request, body)
  await adjustFridgeInventory({
    storeId,
    fridgeId: body?.fridgeId ?? body?.fridge_id,
    productId: body?.productId ?? body?.product_id,
    type: body?.type,
    quantity: body?.quantity,
    reason: body?.reason,
  })
  return NextResponse.json({ success: true })
}
