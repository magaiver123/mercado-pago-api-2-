import { getSupabaseAdminClient } from "@/api/config/database"
import { sanitizeString } from "@/api/utils/sanitize"

type StoreBaseRow = {
  slug: string | null
  name: string | null
  rua: string | null
  numero: string | null
  bairro: string | null
  cidade: string | null
  estado: string | null
}

export interface StoreReceiptInfo {
  storeSlug?: string
  storeName: string
  storeAddress: string
  storeLegalName?: string
  storeTaxId?: string
  storePhone?: string
  storeLogoPath?: string
}

function normalizeNullable(value: unknown): string | null {
  if (typeof value !== "string") return null
  const normalized = sanitizeString(value)
  return normalized && normalized.trim().length > 0 ? normalized.trim() : null
}

function isMissingColumnError(error: any): boolean {
  const code = typeof error?.code === "string" ? error.code : ""
  if (code === "PGRST204" || code === "42703") return true

  const message = String(error?.message ?? "").toLowerCase()
  return message.includes("column") && message.includes("does not exist")
}

function buildStoreAddress(base: StoreBaseRow): string {
  const parts = [base.rua, base.numero, base.bairro, base.cidade, base.estado]
    .map((part) => normalizeNullable(part))
    .filter((part): part is string => Boolean(part))

  if (parts.length === 0) {
    return "Endereço da loja não informado"
  }

  return parts.join(", ")
}

function normalizeLogoPath(value: string | null): string | undefined {
  if (!value) return undefined
  if (value.startsWith("/") || value.startsWith("http://") || value.startsWith("https://")) {
    return value
  }

  return undefined
}

async function readOptionalStoreField(storeId: string, columns: string[]): Promise<string | null> {
  const db = getSupabaseAdminClient()

  for (const column of columns) {
    const { data, error } = await db
      .from("stores")
      .select(column)
      .eq("id", storeId)
      .maybeSingle()

    if (error) {
      if (isMissingColumnError(error)) {
        continue
      }
      return null
    }

    const value = normalizeNullable(data?.[column])
    if (value) {
      return value
    }
  }

  return null
}

export async function resolveStoreReceiptInfoService(
  storeId: string,
): Promise<StoreReceiptInfo | null> {
  const db = getSupabaseAdminClient()
  const { data, error } = await db
    .from("stores")
    .select("slug, name, rua, numero, bairro, cidade, estado")
    .eq("id", storeId)
    .maybeSingle()

  if (error || !data) {
    return null
  }

  const base = data as StoreBaseRow
  const storeSlug = normalizeNullable(base.slug) ?? undefined
  const storeName = normalizeNullable(base.name) ?? "Autoatendimento"
  const storeAddress = buildStoreAddress(base)

  const [storeLegalName, storeTaxId, storePhone, logoPath] = await Promise.all([
    readOptionalStoreField(storeId, [
      "store_legal_name",
      "legal_name",
      "razao_social",
      "corporate_name",
    ]),
    readOptionalStoreField(storeId, ["cnpj", "tax_id", "store_tax_id"]),
    readOptionalStoreField(storeId, ["phone", "telefone", "store_phone"]),
    readOptionalStoreField(storeId, [
      "store_logo_path",
      "logo_path",
      "logo_url",
      "logotipo_url",
    ]),
  ])

  return {
    storeSlug,
    storeName,
    storeAddress,
    storeLegalName: storeLegalName ?? undefined,
    storeTaxId: storeTaxId ?? undefined,
    storePhone: storePhone ?? undefined,
    storeLogoPath: normalizeLogoPath(logoPath),
  }
}
