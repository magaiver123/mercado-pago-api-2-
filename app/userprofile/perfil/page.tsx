"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShoppingCart,
  User,
  ClipboardList,
  UserCog,
  Headphones,
  ChevronRight,
  LogOut,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  clearUserprofileAuthUser,
  getUserprofileAuthUser,
  setUserprofileAuthUser,
  type UserprofileUser,
} from "@/lib/userprofile-auth-store";

export default function PerfilPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserprofileUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const currentUser = getUserprofileAuthUser();
    if (!currentUser) {
      router.replace("/userprofile/login");
      return;
    }

    const userId = currentUser.id;
    setUser(currentUser);

    async function loadUser() {
      try {
        const response = await fetch(`/api/userprofile/me?userId=${userId}`);
        const data = await response.json().catch(() => null);

        if (response.status === 401 || response.status === 404) {
          clearUserprofileAuthUser();
          router.replace("/userprofile/login");
          return;
        }

        if (!response.ok) return;

        const refreshedUser: UserprofileUser = {
          id: data.id,
          name: data.name ?? null,
          cpf: data.cpf ?? null,
          phone: data.phone ?? null,
          email: data.email,
        };

        setUser(refreshedUser);
        setUserprofileAuthUser(refreshedUser);
      } finally {
        setIsLoading(false);
      }
    }

    loadUser();
  }, [router]);

  const handleLogout = () => {
    clearUserprofileAuthUser();
    router.replace("/userprofile");
  };

  if (isLoading && !user) {
    return null;
  }

  return (
    <main className="min-h-screen bg-background flex flex-col">
      <header className="bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-foreground/20 rounded-lg flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">Mr Smart</span>
          </div>
        </div>

        <div className="container mx-auto px-4 pb-8 pt-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-primary-foreground/20 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-primary-foreground" />
            </div>
            <div>
              <p className="text-primary-foreground/80">Ola,</p>
              <h1 className="text-2xl font-bold">{user?.name || "Cliente"}</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 px-4 py-6 -mt-2">
        <div className="container mx-auto max-w-md space-y-5">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Minha Conta
          </h2>

          <div className="mb-4">
            <MenuCard
              icon={<ClipboardList className="w-6 h-6" />}
              title="Historico de Pedidos"
              description="Veja seus pedidos anteriores"
              href="/userprofile/perfil/pedidos"
            />
          </div>

          <div className="mb-4">
            <MenuCard
              icon={<UserCog className="w-6 h-6" />}
              title="Dados Cadastrais"
              description="Suas informacoes pessoais"
              href="/userprofile/perfil/dados"
            />
          </div>

          <div>
            <MenuCard
              icon={<Headphones className="w-6 h-6" />}
              title="Suporte"
              description="Precisa de ajuda? Fale conosco"
              href="/userprofile/perfil/suporte"
            />
          </div>
        </div>
      </div>

      <div className="px-4 py-6 bg-card border-t border-border">
        <div className="container mx-auto max-w-md space-y-5">
          <Button
            variant="outline"
            size="lg"
            className="w-full py-5 gap-2 bg-transparent"
            onClick={handleLogout}
          >
            <LogOut className="w-5 h-5" />
            Sair da conta
          </Button>

          <button className="w-full text-center text-destructive text-sm font-medium hover:underline flex items-center justify-center gap-2 mt-2">
            <Trash2 className="w-4 h-4" />
            Excluir minha conta
          </button>
        </div>
      </div>
    </main>
  );
}

function MenuCard({
  icon,
  title,
  description,
  href,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
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
  );
}
