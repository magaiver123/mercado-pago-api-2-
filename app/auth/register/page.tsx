"use client";

import type React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { createClient } from "@/lib/supabase/client";
import { validateCPF, formatCPF } from "@/lib/cpf-validator";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function RegisterPage() {
  const [cpf, setCpf] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleCPFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "");
    if (value.length <= 11) setCpf(value);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "");
    if (value.length <= 11) setPhone(value);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (!validateCPF(cpf)) {
      setError("CPF inválido");
      setIsLoading(false);
      return;
    }

    if (phone.length < 10) {
      setError("Telefone inválido");
      setIsLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("A senha deve ter no mínimo 6 dígitos");
      setIsLoading(false);
      return;
    }

    try {
      const supabase = createClient();

      const { data: existingUsers } = await supabase
        .from("users")
        .select("id")
        .eq("cpf", cpf)
        .limit(1);

      if (existingUsers && existingUsers.length > 0) {
        setError("CPF já cadastrado");
        setIsLoading(false);
        return;
      }

      const { error: insertError } = await supabase.from("users").insert({
        cpf,
        name,
        phone,
        email,
        password_hash: password,
        status: "ativo",
      });

      if (insertError) throw insertError;

      router.push("/auth/login?registered=true");
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Erro ao cadastrar");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-zinc-100 px-4 sm:px-6">
      <div className="w-full max-w-md">
        <Card className="bg-white border-zinc-200">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-black">Cadastro</CardTitle>
            <p className="text-zinc-600 text-sm mt-2">
              Preencha seus dados para cadastrar
            </p>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleRegister}>
              <div className="flex flex-col gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="cpf">CPF</Label>
                  <Input
                    id="cpf"
                    value={formatCPF(cpf)}
                    onChange={handleCPFChange}
                  />
                </div>

                <div className="grid gap-2">
                  <Label>Nome Completo</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} />
                </div>

                <div className="grid gap-2">
                  <Label>Telefone</Label>
                  <Input
                    value={phone.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3")}
                    onChange={handlePhoneChange}
                  />
                </div>

                <div className="grid gap-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div className="grid gap-2">
                  <Label>Senha</Label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                {error && (
                  <p className="text-sm text-red-600 text-center">{error}</p>
                )}

                <Button
                  type="submit"
                  className="w-full bg-orange-500 text-white"
                  disabled={isLoading}
                >
                  {isLoading ? "Cadastrando..." : "Cadastrar"}
                </Button>

                <Link href="/auth/login">
                  <Button variant="ghost" className="w-full">
                    Já tem cadastro? Fazer login
                  </Button>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
