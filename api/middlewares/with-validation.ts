import { AppError } from "@/api/utils/app-error"
import { ZodSchema } from "zod"

export async function parseJson<T>(request: Request, schema: ZodSchema<T>, invalidMessage = "Dados invalidos"): Promise<T> {
  let body: unknown = null
  try {
    body = await request.json()
  } catch {
    throw new AppError(invalidMessage, 400)
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    throw new AppError(invalidMessage, 400)
  }

  return parsed.data
}

