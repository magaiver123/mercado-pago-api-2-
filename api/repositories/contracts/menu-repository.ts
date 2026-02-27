import { Category, Product } from "@/api/types/domain"

export interface MenuRepository {
  listActiveCategories(): Promise<Category[]>
  listActiveProductsByCategory(categoryId: string): Promise<Product[]>
  getActiveProductById(productId: string): Promise<Pick<Product, "id" | "price" | "is_active"> | null>
}

