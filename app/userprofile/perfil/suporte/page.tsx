import React from "react"
import Link from "next/link"
import { ShoppingCart, ArrowLeft, MessageCircle, Mail, Phone, HelpCircle, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function SuportePage() {
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
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
              <HelpCircle className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-xl font-bold text-foreground mb-2">Como podemos ajudar?</h1>
            <p className="text-muted-foreground">Escolha uma opção de contato abaixo</p>
          </div>

          <div className="space-y-3 mb-8">
            <ContactCard
              icon={<MessageCircle className="w-6 h-6" />}
              title="Chat ao vivo"
              description="Fale com um atendente agora"
            />
            <ContactCard
              icon={<Mail className="w-6 h-6" />}
              title="E-mail"
              description="suporte@mrsmart.com.br"
            />
            <ContactCard
              icon={<Phone className="w-6 h-6" />}
              title="Telefone"
              description="0800 123 4567"
            />
          </div>

          {/* FAQ Section */}
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-4">Perguntas frequentes</h2>
            <div className="space-y-2">
              <FaqItem question="Como usar o totem de autoatendimento?" />
              <FaqItem question="Posso cancelar um pedido?" />
              <FaqItem question="Como alterar meus dados cadastrais?" />
              <FaqItem question="Quais formas de pagamento são aceitas?" />
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

function ContactCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <button className="w-full flex items-center gap-4 p-4 bg-card rounded-xl border border-border shadow-sm transition-all hover:shadow-md hover:border-primary/30 active:scale-[0.99] text-left">
      <div className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary">
        {icon}
      </div>
      <div className="flex-1">
        <h3 className="font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <ChevronRight className="w-5 h-5 text-muted-foreground" />
    </button>
  )
}

function FaqItem({ question }: { question: string }) {
  return (
    <button className="w-full flex items-center justify-between p-4 bg-card rounded-lg border border-border text-left hover:bg-muted/50 transition-colors">
      <span className="text-sm text-foreground">{question}</span>
      <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
    </button>
  )
}
