import Link from "next/link"
import { ShoppingCart, ArrowLeft, Package, Calendar } from "lucide-react"

export default function PedidosPage() {
  const pedidos = [
    { id: "001234", data: "28/01/2026", itens: 5, total: "R$ 127,90", status: "Concluído" },
    { id: "001198", data: "15/01/2026", itens: 3, total: "R$ 54,50", status: "Concluído" },
    { id: "001156", data: "02/01/2026", itens: 8, total: "R$ 215,00", status: "Concluído" },
    { id: "001089", data: "18/12/2025", itens: 2, total: "R$ 32,90", status: "Concluído" },
  ]

  return (
    <main className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/perfil" className="text-primary-foreground/80 hover:text-primary-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-foreground/20 rounded-lg flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">
              Mr Smart
            </span>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 px-4 py-6">
        <div className="container mx-auto max-w-md">
          <h1 className="text-xl font-bold text-foreground mb-6">Histórico de Pedidos</h1>

          <div className="space-y-3">
            {pedidos.map((pedido) => (
              <div
                key={pedido.id}
                className="p-4 bg-card rounded-xl border border-border shadow-sm"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-primary" />
                    <span className="font-semibold text-foreground">Pedido #{pedido.id}</span>
                  </div>
                  <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">
                    {pedido.status}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <Calendar className="w-4 h-4" />
                  <span>{pedido.data}</span>
                  <span className="mx-2">•</span>
                  <span>{pedido.itens} itens</span>
                </div>
                <div className="text-lg font-bold text-foreground">
                  {pedido.total}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}
