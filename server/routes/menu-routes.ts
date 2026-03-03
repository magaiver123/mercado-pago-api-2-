import { withErrorHandler } from "@/api/middlewares/with-error-handler"
import { getMenuCategoriesController, getMenuProductsController } from "@/api/controllers/menu-controller"

export const getMenuCategoriesRoute = withErrorHandler(getMenuCategoriesController)
export const getMenuProductsRoute = withErrorHandler(getMenuProductsController)

