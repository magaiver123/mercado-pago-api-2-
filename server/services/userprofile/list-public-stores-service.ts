import { AppError } from "@/api/utils/app-error"
import { getRepositoryFactory } from "@/api/repositories/repository-factory"
import { PublicStoreRecord } from "@/api/types/domain"

type ListPublicStoresInput = {
  search: string | null
  city: string | null
  page: string | null
  pageSize: string | null
}

type PublicStoreResponseItem = {
  id: string
  name: string
  addressLine: string
  neighborhood: string | null
  city: string
  state: string
  mapsUrl: string
  visualStatus: "normal" | "manutencao" | "inauguracao"
  visualText: string | null
  overlayActive: boolean
  disableMaps: boolean
}

const DEFAULT_PAGE = 1
const DEFAULT_PAGE_SIZE = 8
const MAX_PAGE_SIZE = 1000

function parsePositiveInteger(value: string | null, fallback: number, fieldName: string) {
  if (!value || value.trim() === "") return fallback

  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new AppError(`${fieldName} inválido`, 400)
  }

  return parsed
}

function buildMapsUrlFromAddress(address: string) {
  const query = encodeURIComponent(address)
  return `https://www.google.com/maps/search/?api=1&query=${query}`
}

function normalizeSearch(value: string | null) {
  if (!value) return null
  const sanitized = value.trim()
  return sanitized.length > 0 ? sanitized : null
}

function normalizeCity(value: string | null) {
  if (!value) return null
  const sanitized = value.trim()
  return sanitized.length > 0 ? sanitized : null
}

function buildAddressLine(store: Pick<PublicStoreRecord, "rua" | "numero">) {
  const street = store.rua?.trim() ?? ""
  const number = store.numero?.trim() ?? ""

  if (street && number) return `${street}, ${number}`
  if (street) return street
  if (number) return `Numero ${number}`
  return "Endereço não informado"
}

function normalizeCityName(value: string | null) {
  const normalized = value?.trim() ?? ""
  return normalized.length > 0 ? normalized : "Cidade não informada"
}

function normalizeStateName(value: string | null) {
  const normalized = value?.trim() ?? ""
  return normalized.length > 0 ? normalized : "UF"
}

function normalizeVisualStatus(value: string | null): "normal" | "manutencao" | "inauguracao" {
  if (value === "manutencao" || value === "inauguracao") return value
  return "normal"
}

function normalizeVisualText(value: string | null) {
  const normalized = value?.trim() ?? ""
  return normalized.length > 0 ? normalized : null
}

function buildStoreSearchAddress(store: Pick<PublicStoreRecord, "rua" | "numero" | "bairro" | "cidade" | "estado" | "name">) {
  const parts = [store.rua, store.numero, store.bairro, store.cidade, store.estado, "Brasil"]
    .map((part) => (part ?? "").trim())
    .filter((part) => part.length > 0)

  if (parts.length === 0) {
    return store.name
  }

  return parts.join(", ")
}

export async function listPublicStoresService(input: ListPublicStoresInput) {
  const page = parsePositiveInteger(input.page, DEFAULT_PAGE, "page")
  const requestedPageSize = parsePositiveInteger(input.pageSize, DEFAULT_PAGE_SIZE, "pageSize")
  const pageSize = Math.min(requestedPageSize, MAX_PAGE_SIZE)

  const repositories = getRepositoryFactory()
  const stores = await repositories.store.listActivePublicStores({
    search: normalizeSearch(input.search),
    city: normalizeCity(input.city),
  })

  const transformed: PublicStoreResponseItem[] = stores.map((store) => {
    const visualStatus = normalizeVisualStatus(store.visual_status)
    const visualText = normalizeVisualText(store.visual_text)
    const overlayActive = visualStatus !== "normal" && Boolean(visualText)

    return {
      id: store.id,
      name: store.name,
      addressLine: buildAddressLine(store),
      neighborhood: store.bairro,
      city: normalizeCityName(store.cidade),
      state: normalizeStateName(store.estado),
      mapsUrl: buildMapsUrlFromAddress(buildStoreSearchAddress(store)),
      visualStatus,
      visualText,
      overlayActive,
      disableMaps: overlayActive,
    }
  })

  const total = transformed.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(page, totalPages)
  const start = (safePage - 1) * pageSize
  const end = start + pageSize

  const cities = Array.from(new Set(transformed.map((store) => store.city))).sort((a, b) => a.localeCompare(b, "pt-BR"))

  return {
    items: transformed.slice(start, end),
    page: safePage,
    pageSize,
    total,
    totalPages,
    cities,
  }
}
