import { AppError } from "@/api/utils/app-error"
import { Category, Product } from "@/api/types/domain"
import { MenuRepository } from "@/api/repositories/contracts/menu-repository"
import { BaseSupabaseRepository } from "@/api/repositories/supabase/base-supabase-repository"

export class MenuSupabaseRepository extends BaseSupabaseRepository implements MenuRepository {
  async listActiveCategories(): Promise<Category[]> {
    const { data, error } = await this.db.from("categories").select("id, name").eq("is_active", true).order("name")
    if (error) throw new AppError("Erro ao carregar categorias", 500)
    return (data as Category[] | null) ?? []
  }

  async listActiveProductsByCategory(categoryId: string): Promise<Product[]> {
    const { data, error } = await this.db
      .from("products")
      .select(`
        id,
        name,
        description,
        price,
        image_url,
        category_id,
        product_stock!inner ( quantity )
      `)
      .eq("is_active", true)
      .eq("category_id", categoryId)

    if (error) throw new AppError("Erro ao carregar produtos", 500)
    return (data as Product[] | null) ?? []
  }

  async getActiveProductById(productId: string): Promise<Pick<Product, "id" | "price" | "is_active"> | null> {
    const { data, error } = await this.db.from("products").select("id, price, is_active").eq("id", productId).single()
    if (error) return null
    return (data as Pick<Product, "id" | "price" | "is_active"> | null) ?? null
  }
}

