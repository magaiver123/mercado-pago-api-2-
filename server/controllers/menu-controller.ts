import { NextResponse } from "next/server"
import { listCategoriesService } from "@/api/services/menu/list-categories-service"
import { listProductsByCategoryService } from "@/api/services/menu/list-products-by-category-service"

export async function getMenuCategoriesController() {
  const data = await listCategoriesService()
  return NextResponse.json(data)
}

export async function getMenuProductsController(request: Request) {
  const { searchParams } = new URL(request.url)
  const categoryId = searchParams.get("category_id")

  const data = await listProductsByCategoryService(categoryId)
  return NextResponse.json(data)
}

