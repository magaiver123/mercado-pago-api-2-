import Link from "next/link"
import { ShoppingCart, ArrowLeft, User, Mail, Phone, CreditCard, Camera } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"

export default function DadosPage() {
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
        <div className="container mx-auto max-w-sm">
          <h1 className="text-xl font-bold text-foreground mb-6">Dados Cadastrais</h1>

          <form className="space-y-4">
            {/* Profile Photo Upload */}
            <div className="flex flex-col items-center mb-6">
              <Label className="mb-3 text-center">Foto de perfil</Label>
              <div className="relative">
                <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center border-2 border-dashed border-border overflow-hidden">
                  <User className="w-10 h-10 text-muted-foreground" />
                </div>
                <button
                  type="button"
                  className="absolute bottom-0 right-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground shadow-md hover:bg-primary/90 transition-colors"
                  aria-label="Adicionar foto"
                >
                  <Camera className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Toque para adicionar uma foto</p>
              {/* Hidden file input for future functionality */}
              <input
                type="file"
                id="profile-photo"
                accept="image/*"
                className="hidden"
                aria-label="Upload de foto de perfil"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nome">Nome completo</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="nome"
                  type="text"
                  defaultValue="Magaiver Silva"
                  className="pl-10 py-6"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cpf">CPF</Label>
              <div className="relative">
                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="cpf"
                  type="text"
                  defaultValue="123.456.789-00"
                  className="pl-10 py-6 bg-muted"
                  disabled
                />
              </div>
              <p className="text-xs text-muted-foreground">O CPF não pode ser alterado</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="telefone"
                  type="tel"
                  defaultValue="(11) 99999-9999"
                  className="pl-10 py-6"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  defaultValue="magaiver@email.com"
                  className="pl-10 py-6"
                />
              </div>
            </div>

            <div className="pt-4">
              <Button size="lg" className="w-full py-6 text-lg font-semibold">
                Salvar alterações
              </Button>
            </div>
          </form>
        </div>
      </div>
    </main>
  )
}
