import { getRepositoryFactory } from "@/api/repositories/repository-factory"

interface ListTotemPrinterConfigsInput {
  storeId: string
}

export async function listTotemPrinterConfigsService(
  input: ListTotemPrinterConfigsInput,
) {
  const repositories = getRepositoryFactory()
  const [totems, printers] = await Promise.all([
    repositories.totem.listByStoreId(input.storeId),
    repositories.totemPrinter.listByStoreId(input.storeId),
  ])

  const printerByTotemId = new Map(printers.map((printer) => [printer.totem_id, printer]))

  return {
    totems: totems.map((totem) => ({
      id: totem.id,
      status: totem.status,
      deviceId: totem.device_id,
      maintenanceMode: Boolean(totem.maintenance_mode),
      printer: printerByTotemId.get(totem.id) ?? null,
    })),
  }
}
