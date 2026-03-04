import { NextResponse } from "next/server"
import { listCategoriesService } from "@/api/services/menu/list-categories-service"
import { listProductsByCategoryService } from "@/api/services/menu/list-products-by-category-service"
import { requireStoreContextFromRequest } from "@/api/utils/store-context"

export async function getMenuCategoriesController(request: Request) {
  const storeContext = requireStoreContextFromRequest(request)
  const data = await listCategoriesService(storeContext.storeId)
  return NextResponse.json(data)
}

export async function getMenuProductsController(request: Request) {
  const storeContext = requireStoreContextFromRequest(request)
  const { searchParams } = new URL(request.url)
  const categoryId = searchParams.get("category_id")

  const data = await listProductsByCategoryService(storeContext.storeId, categoryId)
  return NextResponse.json(data)
}
