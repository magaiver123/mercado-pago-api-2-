import { ReceiptData } from "@/lib/receipt-types"

interface ReceiptPreviewProps {
  receipt: ReceiptData
  className?: string
}

export function ReceiptPreview({ receipt, className }: ReceiptPreviewProps) {
  const itemsTotal = receipt.items.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0,
  )

  const discounts = receipt.discounts ?? 0

  return (
    <div
      className={`mx-auto w-full max-w-sm rounded-lg border border-gray-300 bg-white p-6 text-black shadow-sm ${
        className ?? ""
      }`}
    >
      <div className="mb-4 text-center">
        <div className="text-lg font-bold">{receipt.storeName}</div>
        {receipt.storeAddress && (
          <div className="text-xs text-black/70">{receipt.storeAddress}</div>
        )}
      </div>

      <div className="mb-4 border-y border-dashed border-gray-300 py-2 text-xs">
        <div className="flex justify-between">
          <span>Nº do pedido</span>
          <span>
            {receipt.orderNumber != null ? receipt.orderNumber : receipt.orderId}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Data</span>
          <span>
            {new Date(receipt.createdAt).toLocaleString("pt-BR", {
              day: "2-digit",
              month: "2-digit",
              year: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
        {receipt.customerName && (
          <div className="mt-1 flex justify-between">
            <span>Cliente</span>
            <span className="max-w-[60%] truncate text-right">
              {receipt.customerName}
            </span>
          </div>
        )}
      </div>

      <div className="mb-4">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-black/70">
          Itens
        </div>
        <div className="space-y-1 text-xs">
          {receipt.items.map((item, index) => (
            <div key={`${item.name}-${index}`} className="flex justify-between">
              <div className="max-w-[65%]">
                <div className="truncate">{item.name}</div>
                <div className="text-[10px] text-black/60">
                  {item.quantity}x R${" "}
                  {item.unitPrice.toFixed(2).replace(".", ",")}
                </div>
              </div>
              <div className="text-right font-semibold">
                R${" "}
                {(item.unitPrice * item.quantity)
                  .toFixed(2)
                  .replace(".", ",")}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-4 border-t border-dashed border-gray-300 pt-3 text-xs">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>
            R$ {itemsTotal.toFixed(2).replace(".", ",")}
          </span>
        </div>
        {discounts > 0 && (
          <div className="flex justify-between text-green-700">
            <span>Descontos</span>
            <span>
              - R$ {discounts.toFixed(2).replace(".", ",")}
            </span>
          </div>
        )}
        <div className="mt-2 flex justify-between text-sm font-bold">
          <span>Total</span>
          <span>
            R$ {receipt.total.toFixed(2).replace(".", ",")}
          </span>
        </div>
      </div>

      <div className="mb-4 text-xs">
        <div className="flex justify-between">
          <span>Forma de pagamento</span>
          <span className="font-semibold">{receipt.paymentMethod}</span>
        </div>
      </div>

      <div className="border-t border-dashed border-gray-300 pt-3 text-center text-[11px] text-black/70">
        Obrigado pela preferência!
        <br />
        Este não é um comprovante fiscal.
      </div>
    </div>
  )
}

