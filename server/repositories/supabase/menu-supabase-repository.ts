import { AppError } from "@/api/utils/app-error"
import { Category, MenuBannerSlide, Product } from "@/api/types/domain"
import { MenuRepository } from "@/api/repositories/contracts/menu-repository"
import { BaseSupabaseRepository } from "@/api/repositories/supabase/base-supabase-repository"

type StoreProductRow = {
  product_id: string
  price: number
  is_active: boolean
  products: {
    id: string
    name: string
    description: string | null
    image_url: string | null
    category_id: string
    is_active: boolean
    categories?: {
      id: string
      name: string
      is_active: boolean
    } | null
  }
}

export class MenuSupabaseRepository extends BaseSupabaseRepository implements MenuRepository {
  private async listActiveCategoriesLegacy(storeId: string): Promise<Category[]> {
    const { data, error } = await this.db
      .from("store_categories")
      .select(
        `
        category_id,
        is_active,
        categories!inner (
          id,
          name,
          is_active
        )
      `,
      )
      .eq("store_id", storeId)
      .eq("is_active", true)
      .eq("categories.is_active", true)

    if (error) throw new AppError("Erro ao carregar categorias", 500)

    return (
      (data ?? [])
        .map((row: any) => ({
          id: row.categories.id,
          name: row.categories.name,
        }))
        .sort((a: Category, b: Category) => a.name.localeCompare(b.name, "pt-BR")) ?? []
    )
  }

  private async listStoreProductsByCategory(
    storeId: string,
    categoryId: string,
  ): Promise<StoreProductRow[]> {
    const { data, error } = await this.db
      .from("store_products")
      .select(
        `
        product_id,
        price,
        is_active,
        products!inner (
          id,
          name,
          description,
          image_url,
          category_id,
          is_active
        )
      `,
      )
      .eq("store_id", storeId)
      .eq("is_active", true)
      .eq("products.is_active", true)
      .eq("products.category_id", categoryId)

    if (error) throw new AppError("Erro ao carregar produtos", 500)
    return (data as StoreProductRow[] | null) ?? []
  }

  private async getStockFromProductStock(
    storeId: string,
    productIds: string[],
  ): Promise<Map<string, number>> {
    if (productIds.length === 0) return new Map()

    const { data, error } = await this.db
      .from("product_stock")
      .select("product_id, quantity")
      .eq("store_id", storeId)
      .in("product_id", productIds)

    if (error) throw new AppError("Erro ao carregar estoque", 500)

    return new Map(
      ((data as Array<{ product_id: string; quantity: number }> | null) ?? []).map((row) => [
        row.product_id,
        row.quantity,
      ]),
    )
  }

  private async getStockFromFridgeInventory(
    storeId: string,
    fridgeId: string,
    productIds: string[],
  ): Promise<Map<string, number> | null> {
    if (productIds.length === 0) return new Map()

    const result = await this.db
      .from("fridge_inventory")
      .select("product_id, quantity")
      .eq("store_id", storeId)
      .eq("fridge_id", fridgeId)
      .eq("is_active", true)
      .in("product_id", productIds)

    if (result.error) {
      if (result.error.code === "42P01" || result.error.code === "42703") {
        return null
      }
      throw new AppError("Erro ao carregar mix da geladeira", 500)
    }

    const rows = (result.data as Array<{ product_id: string; quantity: number }> | null) ?? []
    return new Map(rows.map((row) => [row.product_id, row.quantity]))
  }

  async listActiveCategories(storeId: string, fridgeId?: string | null): Promise<Category[]> {
    if (!fridgeId) {
      return this.listActiveCategoriesLegacy(storeId)
    }

    const { data, error } = await this.db
      .from("store_products")
      .select(
        `
        product_id,
        is_active,
        products!inner (
          id,
          is_active,
          categories!inner (
            id,
            name,
            is_active
          )
        )
      `,
      )
      .eq("store_id", storeId)
      .eq("is_active", true)
      .eq("products.is_active", true)
      .eq("products.categories.is_active", true)

    if (error) {
      throw new AppError("Erro ao carregar categorias", 500)
    }

    const storeProductRows = (data as Array<{ product_id: string; products: any }> | null) ?? []
    const productIds = storeProductRows.map((row) => row.product_id).filter(Boolean)
    const stockMap = await this.getStockFromFridgeInventory(storeId, fridgeId, productIds)
    if (stockMap === null) {
      return this.listActiveCategoriesLegacy(storeId)
    }

    const categoriesMap = new Map<string, Category>()
    for (const row of storeProductRows) {
      if (!stockMap.has(row.product_id)) continue
      const category = row.products?.categories
      if (!category?.id || !category?.name) continue
      categoriesMap.set(category.id, {
        id: category.id,
        name: category.name,
      })
    }

    return Array.from(categoriesMap.values()).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
  }

  async listActiveMenuBanners(storeId: string): Promise<MenuBannerSlide[]> {
    const { data, error } = await this.db
      .from("menu_banners")
      .select("id, image_url, duration")
      .eq("store_id", storeId)
      .eq("active", true)
      .order("order", { ascending: true })

    if (error) throw new AppError("Erro ao carregar banner do menu", 500)
    return (data as MenuBannerSlide[] | null) ?? []
  }

  async listActiveProductsByCategory(
    storeId: string,
    categoryId: string,
    fridgeId?: string | null,
  ): Promise<Product[]> {
    const storeProducts = await this.listStoreProductsByCategory(storeId, categoryId)
    const productIds = storeProducts.map((row) => row.product_id).filter(Boolean)
    if (productIds.length === 0) return []

    const stockMap =
      fridgeId
        ? await this.getStockFromFridgeInventory(storeId, fridgeId, productIds)
        : null

    const finalStockMap =
      stockMap === null
        ? await this.getStockFromProductStock(storeId, productIds)
        : stockMap

    const products: Product[] = []
    for (const row of storeProducts) {
      if (!finalStockMap.has(row.product_id)) continue

      products.push({
        id: row.products.id,
        name: row.products.name,
        description: row.products.description,
        image_url: row.products.image_url,
        category_id: row.products.category_id,
        price: Number(row.price),
        is_active: row.products.is_active,
        product_stock: [{ quantity: finalStockMap.get(row.product_id) ?? 0 }],
      })
    }

    return products
  }

  async getActiveProductById(
    storeId: string,
    productId: string,
    fridgeId?: string | null,
  ): Promise<Pick<Product, "id" | "name" | "price" | "is_active"> | null> {
    const { data, error } = await this.db
      .from("store_products")
      .select(
        `
        product_id,
        price,
        is_active,
        products!inner (
          id,
          name,
          is_active
        )
      `,
      )
      .eq("store_id", storeId)
      .eq("product_id", productId)
      .eq("is_active", true)
      .eq("products.is_active", true)
      .maybeSingle()

    if (error || !data) return null

    if (fridgeId) {
      const mixRow = await this.db
        .from("fridge_inventory")
        .select("id")
        .eq("store_id", storeId)
        .eq("fridge_id", fridgeId)
        .eq("product_id", productId)
        .eq("is_active", true)
        .maybeSingle()

      if (mixRow.error) {
        if (mixRow.error.code !== "42P01" && mixRow.error.code !== "42703") {
          throw new AppError("Erro ao validar mix da geladeira", 500)
        }
      } else if (!mixRow.data) {
        return null
      }
    }

    return {
      id: data.products.id,
      name: data.products.name,
      price: Number(data.price),
      is_active: data.products.is_active,
    }
  }
}
