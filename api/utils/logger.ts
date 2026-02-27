type LogLevel = "info" | "warn" | "error"

function write(level: LogLevel, message: string, details?: unknown) {
  const prefix = `[api:${level}]`
  if (details === undefined) {
    console[level](`${prefix} ${message}`)
    return
  }

  console[level](`${prefix} ${message}`, details)
}

export const logger = {
  info(message: string, details?: unknown) {
    write("info", message, details)
  },
  warn(message: string, details?: unknown) {
    write("warn", message, details)
  },
  error(message: string, details?: unknown) {
    write("error", message, details)
  },
}

