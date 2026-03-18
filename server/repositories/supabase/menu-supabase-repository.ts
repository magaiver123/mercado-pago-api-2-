import { AppError } from "@/api/utils/app-error"
import { Category, MenuBannerSlide, Product } from "@/api/types/domain"
import { MenuRepository } from "@/api/repositories/contracts/menu-repository"
import { BaseSupabaseRepository } from "@/api/repositories/supabase/base-supabase-repository"

export class MenuSupabaseRepository extends BaseSupabaseRepository implements MenuRepository {
  async listActiveCategories(storeId: string): Promise<Category[]> {
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

    const categories =
      (data ?? [])
        .map((row: any) => ({
          id: row.categories.id,
          name: row.categories.name,
        }))
        .sort((a: Category, b: Category) => a.name.localeCompare(b.name, "pt-BR")) ?? []

    return categories
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

  async listActiveProductsByCategory(storeId: string, categoryId: string): Promise<Product[]> {
    const { data: storeProducts, error: storeProductsError } = await this.db
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

    if (storeProductsError) throw new AppError("Erro ao carregar produtos", 500)

    const productIds = (storeProducts ?? [])
      .map((row: any) => row.product_id)
      .filter(Boolean)

    if (productIds.length === 0) return []

    const { data: stockRows, error: stockError } = await this.db
      .from("product_stock")
      .select("product_id, quantity")
      .eq("store_id", storeId)
      .in("product_id", productIds)

    if (stockError) throw new AppError("Erro ao carregar estoque", 500)

    const stockMap = new Map(
      ((stockRows as Array<{ product_id: string; quantity: number }> | null) ?? []).map(
        (row) => [row.product_id, row.quantity],
      ),
    )

    const products = (storeProducts ?? []).map((row: any) => ({
      id: row.products.id,
      name: row.products.name,
      description: row.products.description,
      image_url: row.products.image_url,
      category_id: row.products.category_id,
      price: Number(row.price),
      is_active: row.products.is_active,
      product_stock: [{ quantity: stockMap.get(row.product_id) ?? 0 }],
    }))

    return (products as Product[] | null) ?? []
  }

  async getActiveProductById(
    storeId: string,
    productId: string,
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

    return {
      id: data.products.id,
      name: data.products.name,
      price: Number(data.price),
      is_active: data.products.is_active,
    }
  }
}
