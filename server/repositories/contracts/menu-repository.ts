import { Category, MenuBannerSlide, Product } from "@/api/types/domain"

export interface MenuRepository {
  listActiveCategories(storeId: string): Promise<Category[]>
  listActiveMenuBanners(storeId: string): Promise<MenuBannerSlide[]>
  listActiveProductsByCategory(storeId: string, categoryId: string): Promise<Product[]>
  getActiveProductById(storeId: string, productId: string): Promise<Pick<Product, "id" | "name" | "price" | "is_active"> | null>
}
