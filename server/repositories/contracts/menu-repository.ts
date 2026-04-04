import { Category, MenuBannerSlide, Product } from "@/api/types/domain"

export interface MenuRepository {
  listActiveCategories(storeId: string, fridgeId?: string | null): Promise<Category[]>
  listActiveMenuBanners(storeId: string): Promise<MenuBannerSlide[]>
  listActiveProductsByCategory(storeId: string, categoryId: string, fridgeId?: string | null): Promise<Product[]>
  getActiveProductById(
    storeId: string,
    productId: string,
    fridgeId?: string | null,
  ): Promise<Pick<Product, "id" | "name" | "price" | "is_active"> | null>
}
