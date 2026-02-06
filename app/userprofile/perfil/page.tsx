import React from "react"
import Link from "next/link"
import { ShoppingCart, User, ClipboardList, UserCog, Headphones, ChevronRight, LogOut, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function PerfilPage() {
  return (
    <main className="min-h-screen bg-background flex flex-col">
      {/* Header com fundo laranja */}
      <header className="bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-foreground/20 rounded-lg flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">
              Mr Smart
            </span>
          </div>
        </div>

        {/* User Greeting */}
        <div className="container mx-auto px-4 pb-8 pt-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-primary-foreground/20 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-primary-foreground" />
            </div>
            <div>
              <p className="text-primary-foreground/80">Olá,</p>
              <h1 className="text-2xl font-bold">Magaiver</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Menu Options */}
      <div className="flex-1 px-4 py-6 -mt-2">
        <div className="container mx-auto max-w-md space-y-5">
          <h2 className="text-lg font-semibold text-foreground mb-4">Minha Conta</h2>

          <div className="mb-4">
            <MenuCard
              icon={<ClipboardList className="w-6 h-6" />}
              title="Histórico de Pedidos"
              description="Veja seus pedidos anteriores"
              href="/perfil/pedidos"
            />
          </div>

          <div className="mb-4">
            <MenuCard
              icon={<UserCog className="w-6 h-6" />}
              title="Dados Cadastrais"
              description="Suas informações pessoais"
              href="/perfil/dados"
            />
          </div>

          <div>
            <MenuCard
              icon={<Headphones className="w-6 h-6" />}
              title="Suporte"
              description="Precisa de ajuda? Fale conosco"
              href="/perfil/suporte"
            />
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="px-4 py-6 bg-card border-t border-border">
        <div className="container mx-auto max-w-md space-y-5">
          <Link href="/userprofile">
            <Button variant="outline" size="lg" className="w-full py-5 gap-2 bg-transparent">
              <LogOut className="w-5 h-5" />
              Sair da conta
            </Button>
          </Link>

          <button className="w-full text-center text-destructive text-sm font-medium hover:underline flex items-center justify-center gap-2 mt-2">
            <Trash2 className="w-4 h-4" />
            Excluir minha conta
          </button>
        </div>
      </div>
    </main>
  )
}

function MenuCard({
  icon,
  title,
  description,
  href,
}: {
  icon: React.ReactNode
  title: string
  description: string
  href: string
}) {
  return (
    <Link href={href}>
      <div className="flex items-center gap-4 p-4 bg-card rounded-xl border border-border shadow-sm transition-all hover:shadow-md hover:border-primary/30 active:scale-[0.99]">
        <div className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary">
          {icon}
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <ChevronRight className="w-5 h-5 text-muted-foreground" />
      </div>
    </Link>
  )
}
