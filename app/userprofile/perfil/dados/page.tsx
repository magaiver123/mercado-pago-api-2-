"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShoppingCart,
  ArrowLeft,
  User,
  Mail,
  Phone,
  CreditCard,
  Camera,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  clearUserprofileAuthUser,
  getUserprofileAuthUser,
  setUserprofileAuthUser,
  type UserprofileUser,
} from "@/lib/userprofile-auth-store";

function formatCpf(value: string | null) {
  if (!value) return "";
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 11) return value;
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length <= 10) {
    return digits.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3").trim();
  }
  return digits.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3").trim();
}

export default function DadosPage() {
  const router = useRouter();
  const [authUser, setAuthUser] = useState<UserprofileUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [cpf, setCpf] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    const currentUser = getUserprofileAuthUser();
    if (!currentUser) {
      router.replace("/userprofile/login");
      return;
    }

    const userId = currentUser.id;
    setAuthUser(currentUser);

    async function loadUserData() {
      try {
        const response = await fetch(`/api/userprofile/me?userId=${userId}`);
        const data = await response.json().catch(() => null);

        if (response.status === 401 || response.status === 404) {
          clearUserprofileAuthUser();
          router.replace("/userprofile/login");
          return;
        }

        if (!response.ok || !data) {
          setError("Nao foi possivel carregar seus dados.");
          return;
        }

        setName(data.name ?? "");
        setCpf(formatCpf(data.cpf ?? ""));
        setPhone(data.phone ?? "");
        setEmail(data.email ?? "");
      } catch {
        setError("Nao foi possivel carregar seus dados.");
      } finally {
        setIsLoading(false);
      }
    }

    loadUserData();
  }, [router]);

  const handlePhoneChange = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length <= 11) {
      setPhone(digits);
    }
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!authUser) {
      router.replace("/userprofile/login");
      return;
    }

    try {
      setIsSaving(true);
      const response = await fetch("/api/userprofile/me", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: authUser.id,
          name,
          phone,
          email,
        }),
      });

      const data = await response.json().catch(() => null);

      if (response.status === 401 || response.status === 404) {
        clearUserprofileAuthUser();
        router.replace("/userprofile/login");
        return;
      }

      if (!response.ok) {
        setError(data?.error || "Nao foi possivel salvar alteracoes.");
        return;
      }

      const updatedUser: UserprofileUser = {
        id: data.user.id,
        name: data.user.name ?? null,
        cpf: data.user.cpf ?? null,
        phone: data.user.phone ?? null,
        email: data.user.email,
      };

      setAuthUser(updatedUser);
      setUserprofileAuthUser(updatedUser);
      setSuccess("Alteracoes salvas com sucesso.");
    } catch {
      setError("Nao foi possivel salvar alteracoes.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return null;
  }

  return (
    <main className="min-h-screen bg-background flex flex-col">
      <header className="bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Link
            href="/userprofile/perfil"
            className="text-primary-foreground/80 hover:text-primary-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-foreground/20 rounded-lg flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">Mr Smart</span>
          </div>
        </div>
      </header>

      <div className="flex-1 px-4 py-6">
        <div className="container mx-auto max-w-sm">
          <h1 className="text-xl font-bold text-foreground mb-6">
            Dados Cadastrais
          </h1>

          <form className="space-y-4" onSubmit={handleSave}>
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
              <p className="text-xs text-muted-foreground mt-2">
                Toque para adicionar uma foto
              </p>
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
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="pl-10 py-6"
                  required
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
                  value={cpf}
                  className="pl-10 py-6 bg-muted"
                  disabled
                />
              </div>
              <p className="text-xs text-muted-foreground">
                O CPF nao pode ser alterado
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="telefone"
                  type="tel"
                  value={formatPhone(phone)}
                  onChange={(event) => handlePhoneChange(event.target.value)}
                  className="pl-10 py-6"
                  required
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
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="pl-10 py-6"
                  required
                />
              </div>
            </div>

            {error && <p className="text-sm text-red-600 text-center">{error}</p>}
            {success && (
              <p className="text-sm text-green-700 text-center">{success}</p>
            )}

            <div className="pt-4">
              <Button
                size="lg"
                className="w-full py-6 text-lg font-semibold"
                disabled={isSaving}
              >
                {isSaving ? "Salvando..." : "Salvar alteracoes"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
