import { NextResponse } from "next/server"
import { AppError, isAppError } from "@/api/utils/app-error"
import { logger } from "@/api/utils/logger"

export function withErrorHandler(handler: (request: Request) => Promise<NextResponse>) {
  return async (request: Request) => {
    try {
      return await handler(request)
    } catch (error) {
      if (isAppError(error)) {
        if (!error.expose) {
          logger.error(error.message)
          return NextResponse.json({ error: "Internal server error" }, { status: error.statusCode })
        }

        return NextResponse.json({ error: error.message }, { status: error.statusCode })
      }

      if (error instanceof Error) {
        logger.error(error.message)
      } else {
        logger.error("Unknown error", error)
      }

      return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
  }
}

export function ensure(value: unknown, message: string, statusCode = 400): asserts value {
  if (!value) {
    throw new AppError(message, statusCode)
  }
}

