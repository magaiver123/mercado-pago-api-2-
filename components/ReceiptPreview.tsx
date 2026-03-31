import Image from "next/image"
import { ReceiptData } from "@/lib/receipt-types"
import { formatOrderNumberOrFallback } from "@/lib/order-number"

interface ReceiptPreviewProps {
  receipt: ReceiptData
  className?: string
}

function formatCurrency(value: number) {
  return `R$ ${value.toFixed(2).replace(".", ",")}`
}

function formatDate(value: string) {
  const asDate = new Date(value)
  if (Number.isNaN(asDate.getTime())) {
    return "Data não informada"
  }

  return asDate.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function ReceiptPreview({ receipt, className }: ReceiptPreviewProps) {
  const itemsTotal = receipt.items.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0,
  )

  const subtotal =
    typeof receipt.subtotal === "number" && receipt.subtotal > 0
      ? receipt.subtotal
      : itemsTotal

  const discounts = receipt.discounts ?? 0
  const orderNumber = formatOrderNumberOrFallback(
    receipt.orderNumber,
    receipt.orderId,
  )
  const logoPath =
    receipt.storeLogoPath && receipt.storeLogoPath.startsWith("/")
      ? receipt.storeLogoPath
      : "/logo.svg"

  const storeLegalName = receipt.storeLegalName || receipt.storeName
  const storeAddress = receipt.storeAddress || "Endereço da loja não informado"
  const storeTaxId = receipt.storeTaxId || "CNPJ não informado"
  const storePhone = receipt.storePhone || "Telefone não informado"

  return (
    <div
      className={`mx-auto w-full max-w-[360px] rounded-xl border border-black/15 bg-white p-4 font-mono text-[11px] text-black shadow-[0_12px_32px_rgba(0,0,0,0.08)] ${
        className ?? ""
      }`}
    >
      <div className="mb-3 flex flex-col items-center text-center">
        <Image
          src={logoPath}
          alt="Logo da loja"
          width={120}
          height={42}
          className="h-9 w-auto"
        />
        <div className="mt-2 text-[13px] font-bold uppercase tracking-wide">
          {storeLegalName}
        </div>
        <div className="text-[10px] text-black/75">{storeTaxId}</div>
        <div className="text-[10px] text-black/75">{storeAddress}</div>
        <div className="text-[10px] text-black/75">{storePhone}</div>
      </div>

      <div className="mb-3 border-y border-dashed border-black/25 py-2 text-[10px]">
        <div className="flex items-center justify-between gap-2">
          <span>Pedido</span>
          <span className="font-semibold">{orderNumber}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span>Data</span>
          <span>{formatDate(receipt.createdAt)}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span>Cliente</span>
          <span className="max-w-[65%] truncate text-right">
            {receipt.customerName || "Consumidor não informado"}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span>Documento</span>
          <span className="max-w-[65%] truncate text-right">
            {receipt.customerDocument || "Não informado"}
          </span>
        </div>
      </div>

      <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-black/70">
        Itens do pedido
      </div>
      <div className="mb-2 border-b border-dashed border-black/25 pb-2 text-[10px]">
        <div className="grid grid-cols-12 gap-2 font-bold text-black/80">
          <span className="col-span-5">Item</span>
          <span className="col-span-2 text-right">Qtd</span>
          <span className="col-span-2 text-right">Un</span>
          <span className="col-span-3 text-right">Total</span>
        </div>

        <div className="mt-1 space-y-1">
          {receipt.items.map((item, index) => (
            <div key={`${item.name}-${index}`} className="grid grid-cols-12 gap-2">
              <div className="col-span-5 leading-tight">{item.name}</div>
              <div className="col-span-2 text-right">{item.quantity}</div>
              <div className="col-span-2 text-right">
                {item.unitPrice.toFixed(2).replace(".", ",")}
              </div>
              <div className="col-span-3 text-right font-semibold">
                {(item.unitPrice * item.quantity).toFixed(2).replace(".", ",")}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-3 border-b border-dashed border-black/25 pb-2 text-[11px]">
        <div className="flex items-center justify-between">
          <span>Subtotal</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Descontos</span>
          <span>{discounts > 0 ? `- ${formatCurrency(discounts)}` : "R$ 0,00"}</span>
        </div>
        <div className="mt-1 flex items-center justify-between text-[12px] font-bold">
          <span>Valor final</span>
          <span>{formatCurrency(receipt.total)}</span>
        </div>
      </div>

      <div className="mb-3 text-[10px]">
        <div className="flex items-center justify-between">
          <span>Pagamento</span>
          <span className="font-semibold">{receipt.paymentMethod}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Código autorização</span>
          <span>{receipt.authorizationCode || "Não informado"}</span>
        </div>
        <div className="flex items-start justify-between gap-2 pt-1">
          <span>Chave acesso</span>
          <span className="max-w-[70%] break-all text-right">
            {receipt.accessKey || "Não informado"}
          </span>
        </div>
      </div>

      <div className="border-t border-dashed border-black/25 pt-2 text-center text-[10px] text-black/70">
        Obrigado pela preferencia!
        <br />
        {receipt.additionalMessage ||
          "Este comprovante foi emitido pelo autoatendimento."}
      </div>
    </div>
  )
}
