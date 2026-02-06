import React from "react"
import Link from "next/link"
import { ShoppingCart, Shield, Clock, CreditCard, UserPlus, Monitor, Fingerprint } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">
              Mr <span className="text-primary">Smart</span>
            </span>
          </div>
          <Link href="/userprofile/login">
            <Button variant="outline" size="sm">
              Entrar
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-md text-center">
          <div className="w-24 h-24 mx-auto mb-8 bg-primary/10 rounded-full flex items-center justify-center">
            <ShoppingCart className="w-12 h-12 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-4 text-balance">
            Bem-vindo ao <span className="text-primary">Mr Smart</span>
          </h1>
          <p className="text-muted-foreground mb-8 leading-relaxed">
            Faça suas compras de forma rápida e prática com nosso sistema de autoatendimento. Sem filas, sem espera.
          </p>
          <Link href="/userprofile/cadastro">
            <Button size="lg" className="w-full py-6 text-lg font-semibold">
              Criar minha conta grátis
            </Button>
          </Link>
          <p className="text-sm text-muted-foreground mt-4">
            Cadastro rápido em menos de 1 minuto
          </p>
        </div>
      </section>

      {/* Como Funciona */}
      <section className="py-12 px-4 bg-card">
        <div className="container mx-auto max-w-md">
          <h2 className="text-2xl font-bold text-center text-foreground mb-8">
            Como funciona?
          </h2>
          <div className="space-y-4">
            <StepCard
              number={1}
              icon={<UserPlus className="w-6 h-6" />}
              title="Faça seu cadastro"
              description="Informe seu nome, CPF, telefone e e-mail"
            />
            <StepCard
              number={2}
              icon={<Monitor className="w-6 h-6" />}
              title="Vá até o totem"
              description="Encontre nosso totem de autoatendimento na loja"
            />
            <StepCard
              number={3}
              icon={<Fingerprint className="w-6 h-6" />}
              title="Digite seu CPF"
              description="Identifique-se e comece a comprar imediatamente"
            />
          </div>
        </div>
      </section>

      {/* Vantagens */}
      <section className="py-12 px-4">
        <div className="container mx-auto max-w-md">
          <h2 className="text-2xl font-bold text-center text-foreground mb-8">
            Vantagens
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <AdvantageCard
              icon={<Clock className="w-6 h-6" />}
              title="Compra rápida"
              description="Sem filas ou espera"
            />
            <AdvantageCard
              icon={<Shield className="w-6 h-6" />}
              title="Dados seguros"
              description="Proteção total"
            />
            <AdvantageCard
              icon={<ShoppingCart className="w-6 h-6" />}
              title="Histórico online"
              description="Acompanhe tudo"
            />
            <AdvantageCard
              icon={<CreditCard className="w-6 h-6" />}
              title="Pagamento fácil"
              description="Várias opções"
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 bg-card border-t border-border">
        <div className="container mx-auto max-w-md text-center">
          <p className="text-sm text-muted-foreground">
            © 2026 Mr Smart. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </main>
  )
}

function StepCard({
  number,
  icon,
  title,
  description,
}: {
  number: number
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="flex items-center gap-4 p-4 bg-background rounded-xl border border-border shadow-sm transition-shadow hover:shadow-md">
      <div className="flex-shrink-0 w-12 h-12 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold text-lg">
        {number}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-primary">{icon}</span>
          <h3 className="font-semibold text-foreground">{title}</h3>
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}

function AdvantageCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="p-4 bg-card rounded-xl border border-border shadow-sm text-center transition-shadow hover:shadow-md">
      <div className="w-12 h-12 mx-auto mb-3 bg-primary/10 rounded-full flex items-center justify-center text-primary">
        {icon}
      </div>
      <h3 className="font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  )
}
