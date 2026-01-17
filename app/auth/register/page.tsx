"use client";

import type React from "react";

import { createClient } from "@/lib/supabase/client";
import { validateCPF, formatCPF } from "@/lib/cpf-validator";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { NOMEM } from "dns";

export default function RegisterPage() {
  const [cpf, setCpf] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleCPFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "");
    if (value.length <= 11) {
      setCpf(value);
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "");
    if (value.length <= 11) {
      setPhone(value);
    }
  };

  const [password, setPassword] = useState("");

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
        .select("cpf")
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
    <div className="flex min-h-screen w-full items-center justify-center bg-white p-6">
      <div className="w-full max-w-md">
        <Card className="bg-white border-zinc-200">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-20 w-20 bg-orange-500 rounded-lg flex items-center justify-center">
              <div className="text-white font-bold text-xs">
                ALABAMA
                <br />
                COMIDARIA
                <br />
                <span className="text-black">Delivery</span>
              </div>
            </div>
            <CardTitle className="text-2xl text-black">Cadastro</CardTitle>
            <p className="text-zinc-600 text-sm mt-2">
              Preencha seus dados para cadastrar
            </p>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleRegister}>
              <div className="flex flex-col gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="cpf" className="text-black">
                    CPF
                  </Label>
                  <Input
                    id="cpf"
                    type="text"
                    placeholder="000.000.000-00"
                    required
                    value={formatCPF(cpf)}
                    onChange={handleCPFChange}
                    className="bg-white border-zinc-300 text-black"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="name" className="text-black">
                    Nome Completo
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="João da Silva"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-white border-zinc-300 text-black"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="phone" className="text-black">
                    Telefone
                  </Label>
                  <Input
                    id="phone"
                    type="text"
                    placeholder="(00) 00000-0000"
                    required
                    value={phone.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3")}
                    onChange={handlePhoneChange}
                    className="bg-white border-zinc-300 text-black"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="email" className="text-black">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seuemail@exemplo.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-white border-zinc-300 text-black"
                  />
                </div>

                {error && (
                  <p className="text-sm text-red-600 text-center">{error}</p>
                )}

                <div className="grid gap-2">
                  <Label htmlFor="password" className="text-black">
                    Senha
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-white border-zinc-300 text-black"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                  disabled={isLoading}
                >
                  {isLoading ? "Cadastrando..." : "Cadastrar"}
                </Button>

                <div className="text-center">
                  <Link href="/auth/login">
                    <Button
                      type="button"
                      variant="ghost"
                      className="text-zinc-600 hover:text-orange-500"
                    >
                      Já tem cadastro? Fazer login
                    </Button>
                  </Link>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
