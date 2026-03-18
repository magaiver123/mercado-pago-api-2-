import { Category, Product } from "@/api/types/domain"

export interface MenuRepository {
  listActiveCategories(storeId: string): Promise<Category[]>
  getMenuBannerImageUrl(storeId: string): Promise<string | null>
  listActiveProductsByCategory(storeId: string, categoryId: string): Promise<Product[]>
  getActiveProductById(storeId: string, productId: string): Promise<Pick<Product, "id" | "name" | "price" | "is_active"> | null>
}
