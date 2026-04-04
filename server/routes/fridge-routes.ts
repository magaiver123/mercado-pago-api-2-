import { withErrorHandler } from "@/api/middlewares/with-error-handler"
import {
  adjustAdminFridgeInventoryController,
  createAdminFridgeController,
  createAdminLockController,
  getNextFridgeCodeController,
  inactivateAdminFridgeController,
  listAdminFridgeInventoryController,
  listAdminFridgesController,
  listAdminLockDiagnosticsController,
  listAdminLocksController,
  listOperationalFridgesController,
  setAdminFridgeInventoryMixController,
  testAdminLockOpenController,
  updateAdminFridgeController,
  updateAdminLockController,
} from "@/api/controllers/fridge-controller"

export const listAdminFridgesRoute = withErrorHandler(listAdminFridgesController)
export const getNextFridgeCodeRoute = withErrorHandler(getNextFridgeCodeController)
export const createAdminFridgeRoute = withErrorHandler(createAdminFridgeController)
export const updateAdminFridgeRoute = withErrorHandler(updateAdminFridgeController)
export const inactivateAdminFridgeRoute = withErrorHandler(inactivateAdminFridgeController)

export const listOperationalFridgesRoute = withErrorHandler(listOperationalFridgesController)

export const listAdminLocksRoute = withErrorHandler(listAdminLocksController)
export const createAdminLockRoute = withErrorHandler(createAdminLockController)
export const updateAdminLockRoute = withErrorHandler(updateAdminLockController)
export const testAdminLockOpenRoute = withErrorHandler(testAdminLockOpenController)
export const listAdminLockDiagnosticsRoute = withErrorHandler(listAdminLockDiagnosticsController)

export const listAdminFridgeInventoryRoute = withErrorHandler(listAdminFridgeInventoryController)
export const setAdminFridgeInventoryMixRoute = withErrorHandler(setAdminFridgeInventoryMixController)
export const adjustAdminFridgeInventoryRoute = withErrorHandler(adjustAdminFridgeInventoryController)
