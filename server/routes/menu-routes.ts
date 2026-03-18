import { withErrorHandler } from "@/api/middlewares/with-error-handler"
import { getMenuBannerController, getMenuCategoriesController, getMenuProductsController } from "@/api/controllers/menu-controller"

export const getMenuBannerRoute = withErrorHandler(getMenuBannerController)
export const getMenuCategoriesRoute = withErrorHandler(getMenuCategoriesController)
export const getMenuProductsRoute = withErrorHandler(getMenuProductsController)
