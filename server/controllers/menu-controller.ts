import { NextResponse } from "next/server"
import { listCategoriesService } from "@/api/services/menu/list-categories-service"
import { listActiveMenuBannersService } from "@/api/services/menu/get-menu-banner-image-service"
import { listProductsByCategoryService } from "@/api/services/menu/list-products-by-category-service"
import { requireStoreContextFromRequest } from "@/api/utils/store-context"

export async function getMenuCategoriesController(request: Request) {
  const storeContext = requireStoreContextFromRequest(request)
  const { searchParams } = new URL(request.url)
  const fridgeId = searchParams.get("fridge_id")
  if (!fridgeId) {
    return NextResponse.json({ error: "fridge_id e obrigatorio" }, { status: 400 })
  }

  const data = await listCategoriesService(storeContext.storeId, fridgeId)
  return NextResponse.json(data)
}

export async function getMenuBannerController(request: Request) {
  const storeContext = requireStoreContextFromRequest(request)
  const data = await listActiveMenuBannersService(storeContext.storeId)
  return NextResponse.json(data)
}

export async function getMenuProductsController(request: Request) {
  const storeContext = requireStoreContextFromRequest(request)
  const { searchParams } = new URL(request.url)
  const categoryId = searchParams.get("category_id")
  const fridgeId = searchParams.get("fridge_id")

  if (!fridgeId) {
    return NextResponse.json({ error: "fridge_id e obrigatorio" }, { status: 400 })
  }

  const data = await listProductsByCategoryService(storeContext.storeId, categoryId, fridgeId)
  return NextResponse.json(data)
}
