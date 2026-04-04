import { getSupabaseAdminClient } from "@/api/config/database"
import { AppError } from "@/api/utils/app-error"
import { isValidUUID } from "@/api/utils/validators"

function normalizeMovementType(value: unknown): "entrada" | "saida" | null {
  if (typeof value !== "string") return null
  const normalized = value.trim().toLowerCase()
  if (normalized === "entrada" || normalized === "saida") return normalized
  return null
}

function normalizeReason(value: unknown): string {
  if (typeof value !== "string") return ""
  return value.trim()
}

export async function ensureFridgeInStore(storeId: string, fridgeId: string) {
  const db: any = getSupabaseAdminClient()
  const { data, error } = await db
    .from("fridges")
    .select("id, store_id, status")
    .eq("id", fridgeId)
    .eq("store_id", storeId)
    .maybeSingle()

  if (error) {
    throw new AppError("Erro ao validar geladeira", 500)
  }
  if (!data) {
    throw new AppError("Geladeira nao encontrada para a loja", 404)
  }

  return data as { id: string; store_id: string; status: string }
}

export async function listFridgeInventoryProducts(storeId: string, fridgeId: string) {
  if (!isValidUUID(storeId) || !isValidUUID(fridgeId)) {
    throw new AppError("storeId/fridgeId invalidos", 400)
  }

  await ensureFridgeInStore(storeId, fridgeId)

  const db: any = getSupabaseAdminClient()
  const storeProductsResult = await db
    .from("store_products")
    .select(
      `
      product_id,
      is_active,
      products!inner (
        id,
        name,
        is_active
      )
    `,
    )
    .eq("store_id", storeId)
    .eq("is_active", true)
    .eq("products.is_active", true)

  if (storeProductsResult.error) {
    throw new AppError("Erro ao carregar produtos da loja", 500)
  }

  const storeProducts = (storeProductsResult.data as any[] | null) ?? []
  const productIds = storeProducts.map((row) => row.product_id).filter(Boolean)

  let inventoryRows: Array<{ product_id: string; quantity: number; is_active: boolean }> = []
  if (productIds.length > 0) {
    const inventoryResult = await db
      .from("fridge_inventory")
      .select("product_id, quantity, is_active")
      .eq("store_id", storeId)
      .eq("fridge_id", fridgeId)
      .in("product_id", productIds)

    if (inventoryResult.error) {
      throw new AppError("Erro ao carregar mix da geladeira", 500)
    }

    inventoryRows = (inventoryResult.data as Array<{ product_id: string; quantity: number; is_active: boolean }> | null) ?? []
  }

  const inventoryMap = new Map(inventoryRows.map((row) => [row.product_id, row]))
  return storeProducts
    .map((row) => {
      const inv = inventoryMap.get(row.product_id)
      return {
        id: String(row.products.id),
        name: String(row.products.name),
        in_mix: Boolean(inv?.is_active),
        quantity: typeof inv?.quantity === "number" ? inv.quantity : 0,
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
}

export async function listFridgeInventoryHistory(storeId: string, fridgeId: string) {
  if (!isValidUUID(storeId) || !isValidUUID(fridgeId)) {
    throw new AppError("storeId/fridgeId invalidos", 400)
  }

  await ensureFridgeInStore(storeId, fridgeId)

  const db: any = getSupabaseAdminClient()
  const { data, error } = await db
    .from("stock_movements")
    .select(
      `
      id,
      type,
      quantity,
      reason,
      created_at,
      products ( name )
    `,
    )
    .eq("store_id", storeId)
    .eq("fridge_id", fridgeId)
    .order("created_at", { ascending: false })

  if (error) {
    throw new AppError("Erro ao carregar historico da geladeira", 500)
  }

  return ((data as any[] | null) ?? []).map((item) => ({
    id: String(item.id),
    product: item.products?.name ? String(item.products.name) : "-",
    type: String(item.type),
    qty: Number(item.quantity ?? 0),
    reason: item.reason ? String(item.reason) : null,
    created_at: String(item.created_at),
  }))
}

export async function setFridgeInventoryMix(input: {
  storeId: string
  fridgeId: unknown
  productId: unknown
  inMix: unknown
}) {
  const storeId = input.storeId
  const fridgeId = typeof input.fridgeId === "string" ? input.fridgeId.trim() : ""
  const productId = typeof input.productId === "string" ? input.productId.trim() : ""
  const inMix = input.inMix === true

  if (!isValidUUID(storeId) || !isValidUUID(fridgeId) || !isValidUUID(productId)) {
    throw new AppError("storeId/fridgeId/productId invalidos", 400)
  }

  await ensureFridgeInStore(storeId, fridgeId)
  const db: any = getSupabaseAdminClient()

  const linkValidation = await db
    .from("store_products")
    .select("id")
    .eq("store_id", storeId)
    .eq("product_id", productId)
    .eq("is_active", true)
    .maybeSingle()

  if (linkValidation.error) {
    throw new AppError("Erro ao validar produto da loja", 500)
  }
  if (!linkValidation.data) {
    throw new AppError("Produto nao vinculado a loja", 404)
  }

  const existing = await db
    .from("fridge_inventory")
    .select("quantity")
    .eq("store_id", storeId)
    .eq("fridge_id", fridgeId)
    .eq("product_id", productId)
    .maybeSingle()

  if (existing.error) {
    throw new AppError("Erro ao atualizar mix da geladeira", 500)
  }

  if (!existing.data) {
    const insert = await db
      .from("fridge_inventory")
      .insert({
        store_id: storeId,
        fridge_id: fridgeId,
        product_id: productId,
        quantity: 0,
        is_active: inMix,
      })

    if (insert.error) {
      throw new AppError("Erro ao adicionar produto no mix da geladeira", 500)
    }
    return
  }

  const update = await db
    .from("fridge_inventory")
    .update({ is_active: inMix })
    .eq("store_id", storeId)
    .eq("fridge_id", fridgeId)
    .eq("product_id", productId)

  if (update.error) {
    throw new AppError("Erro ao atualizar mix da geladeira", 500)
  }
}

export async function adjustFridgeInventory(input: {
  storeId: string
  fridgeId: unknown
  productId: unknown
  type: unknown
  quantity: unknown
  reason?: unknown
}) {
  const storeId = input.storeId
  const fridgeId = typeof input.fridgeId === "string" ? input.fridgeId.trim() : ""
  const productId = typeof input.productId === "string" ? input.productId.trim() : ""
  const type = normalizeMovementType(input.type)
  const quantity = Number(input.quantity ?? 0)
  const reason = normalizeReason(input.reason)

  if (!isValidUUID(storeId) || !isValidUUID(fridgeId) || !isValidUUID(productId)) {
    throw new AppError("storeId/fridgeId/productId invalidos", 400)
  }
  if (!type || !Number.isFinite(quantity) || quantity <= 0) {
    throw new AppError("type/quantity invalidos para ajuste", 400)
  }

  await ensureFridgeInStore(storeId, fridgeId)
  const db: any = getSupabaseAdminClient()

  const inventoryRow = await db
    .from("fridge_inventory")
    .select("quantity, is_active")
    .eq("store_id", storeId)
    .eq("fridge_id", fridgeId)
    .eq("product_id", productId)
    .maybeSingle()

  if (inventoryRow.error) {
    throw new AppError("Erro ao carregar estoque da geladeira", 500)
  }

  if (!inventoryRow.data || inventoryRow.data.is_active !== true) {
    throw new AppError("Produto fora do mix da geladeira. Ative no mix antes de ajustar.", 409)
  }

  const current = Number(inventoryRow.data.quantity ?? 0)
  const nextQuantity = type === "entrada" ? current + quantity : current - quantity
  if (nextQuantity < 0) {
    throw new AppError("Estoque nao pode ficar negativo", 400)
  }

  const now = new Date().toISOString()
  const update = await db
    .from("fridge_inventory")
    .update({
      quantity: nextQuantity,
      updated_at: now,
    })
    .eq("store_id", storeId)
    .eq("fridge_id", fridgeId)
    .eq("product_id", productId)

  if (update.error) {
    throw new AppError("Erro ao ajustar estoque da geladeira", 500)
  }

  const movement = await db
    .from("stock_movements")
    .insert({
      store_id: storeId,
      fridge_id: fridgeId,
      product_id: productId,
      type,
      quantity,
      reason: reason || (type === "entrada" ? "Entrada manual geladeira" : "Saida manual geladeira"),
      user_id: null,
      created_at: now,
    })

  if (movement.error) {
    throw new AppError("Erro ao registrar movimento de estoque da geladeira", 500)
  }
}
