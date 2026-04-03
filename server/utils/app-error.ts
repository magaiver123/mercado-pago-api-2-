export class AppError extends Error {
  statusCode: number
  code: string
  expose: boolean
  retryable: boolean | null
  metadata: Record<string, unknown> | null

  constructor(
    message: string,
    statusCode = 500,
    code = "APP_ERROR",
    expose = true,
    retryable: boolean | null = null,
    metadata: Record<string, unknown> | null = null,
  ) {
    super(message)
    this.name = "AppError"
    this.statusCode = statusCode
    this.code = code
    this.expose = expose
    this.retryable = retryable
    this.metadata = metadata
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError
}
