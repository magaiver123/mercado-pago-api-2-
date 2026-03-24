import { withErrorHandler } from "@/api/middlewares/with-error-handler"
import {
  activatePrintAgentEnrollmentController,
  createPrintAgentEnrollmentController,
  createReceiptPrintJobController,
  createTestPrintJobController,
  getPrintGlobalSettingsController,
  listPrintAgentDevicesController,
  listGlobalPrinterStatusController,
  listRecentPrintJobsController,
  listTotemPrinterConfigsController,
  printAgentAckFailureController,
  printAgentAckSuccessController,
  printAgentClaimNextJobController,
  printAgentHeartbeatController,
  revokePrintAgentDeviceController,
  updatePrintGlobalSettingsController,
  upsertTotemPrinterConfigController,
} from "@/api/controllers/print-controller"

export const createReceiptPrintJobRoute = withErrorHandler(createReceiptPrintJobController)

export const listTotemPrinterConfigsRoute = withErrorHandler(listTotemPrinterConfigsController)
export const upsertTotemPrinterConfigRoute = withErrorHandler(upsertTotemPrinterConfigController)
export const createTestPrintJobRoute = withErrorHandler(createTestPrintJobController)
export const listRecentPrintJobsRoute = withErrorHandler(listRecentPrintJobsController)
export const getPrintGlobalSettingsRoute = withErrorHandler(getPrintGlobalSettingsController)
export const updatePrintGlobalSettingsRoute = withErrorHandler(updatePrintGlobalSettingsController)
export const listGlobalPrinterStatusRoute = withErrorHandler(listGlobalPrinterStatusController)
export const listPrintAgentDevicesRoute = withErrorHandler(listPrintAgentDevicesController)
export const createPrintAgentEnrollmentRoute = withErrorHandler(createPrintAgentEnrollmentController)
export const activatePrintAgentEnrollmentRoute = withErrorHandler(activatePrintAgentEnrollmentController)
export const revokePrintAgentDeviceRoute = withErrorHandler(revokePrintAgentDeviceController)

export const printAgentHeartbeatRoute = withErrorHandler(printAgentHeartbeatController)
export const printAgentClaimNextJobRoute = withErrorHandler(printAgentClaimNextJobController)
export const printAgentAckSuccessRoute = withErrorHandler(printAgentAckSuccessController)
export const printAgentAckFailureRoute = withErrorHandler(printAgentAckFailureController)
