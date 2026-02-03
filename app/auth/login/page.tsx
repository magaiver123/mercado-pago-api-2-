"use client";

import type React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

import { setAuthUser } from "@/lib/auth-store";
import { validateCPF, formatCPF } from "@/lib/cpf-validator";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const [cpf, setCpf] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleCPFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "");
    if (value.length <= 11) setCpf(value);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (!validateCPF(cpf)) {
      setError("CPF inválido");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ cpf }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Erro ao fazer login");
        setIsLoading(false);
        return;
      }

      // Mantém exatamente o mesmo comportamento anterior
      setAuthUser({
        id: data.id,
        cpf: data.cpf,
        name: data.name,
        phone: data.phone,
        email: data.email,
      });

      router.push("/menu");
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Erro ao fazer login");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-zinc-100 px-4 sm:px-6">
      <div className="w-full max-w-md">
        <Card className="bg-white border border-zinc-200 shadow-lg">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-25 w-25 rounded-xl flex items-center justify-center">
              <Image
                src="/logologin.png"
                alt="Logo Mr Smart"
                width={120}
                height={120}
                className="object-contain sm:w-[150px] sm:h-[150px]"
              />
            </div>

            <CardTitle className="text-2xl text-black">Login</CardTitle>
            <p className="text-zinc-600 text-sm mt-2">
              Digite seu CPF para acessar
            </p>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleLogin}>
              <div className="flex flex-col gap-6">
                <div className="grid gap-2">
                  <Label htmlFor="cpf" className="text-black">
                    CPF
                  </Label>
                  <Input
                    id="cpf"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="000.000.000-00"
                    required
                    value={formatCPF(cpf)}
                    onChange={handleCPFChange}
                    className="bg-white border-zinc-300 text-black focus:border-orange-500 focus:ring-orange-500"
                  />
                </div>

                {error && (
                  <p className="text-sm text-orange-600 text-center">{error}</p>
                )}

                <Button
                  type="submit"
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                  disabled={isLoading}
                >
                  {isLoading ? "Entrando..." : "Entrar"}
                </Button>

                <div className="text-center">
                  <Link href="/auth/register">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full border-orange-500 text-orange-500 hover:bg-orange-50"
                    >
                      Cadastrar
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
