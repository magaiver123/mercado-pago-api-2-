import { AppError } from "@/api/utils/app-error"
import { isValidUUID } from "@/api/utils/validators"
import { getRepositoryFactory } from "@/api/repositories/repository-factory"

function getItemCount(items: unknown) {
  if (!Array.isArray(items)) return 0

  return items.reduce((total, item) => {
    if (typeof item !== "object" || item === null) {
      return total
    }

    const quantity = (item as { quantity?: unknown }).quantity
    if (typeof quantity === "number" && Number.isFinite(quantity)) {
      return total + Math.max(0, quantity)
    }

    if (typeof quantity === "string") {
      const parsed = Number(quantity)
      if (Number.isFinite(parsed)) {
        return total + Math.max(0, parsed)
      }
    }

    return total + 1
  }, 0)
}

export async function listUserOrdersService(userId: string | null) {
  if (!userId || !isValidUUID(userId)) {
    throw new AppError("Usuario invalido", 400)
  }

  const repositories = getRepositoryFactory()

  const user = await repositories.user.findActiveById(userId)
  if (!user) {
    throw new AppError("Usuario nao encontrado", 404)
  }

  const data = await repositories.order.listByUserId(userId)
  return data.map((order) => ({
    ...order,
    item_count: getItemCount(order.items),
  }))
}

