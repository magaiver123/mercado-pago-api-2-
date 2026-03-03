export class AppError extends Error {
  statusCode: number
  code: string
  expose: boolean

  constructor(message: string, statusCode = 500, code = "APP_ERROR", expose = true) {
    super(message)
    this.name = "AppError"
    this.statusCode = statusCode
    this.code = code
    this.expose = expose
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError
}
