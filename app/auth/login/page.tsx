"use client";

import type React from "react";
import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowLeft, Delete as DeleteIcon } from "lucide-react";

import { setAuthUser } from "@/lib/auth-store";
import { validateCPF, formatCPF } from "@/lib/cpf-validator";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const NUMBER_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

export default function LoginPage() {
  const [cpf, setCpf] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const formattedCpf = useMemo(() => formatCPF(cpf), [cpf]);

  const handleCPFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "");
    if (value.length <= 11) setCpf(value);
  };

  const handleKeypadDigit = (digit: string) => {
    setError(null);
    setCpf((previous) => (previous.length >= 11 ? previous : `${previous}${digit}`));
  };

  const handleKeypadDelete = () => {
    setError(null);
    setCpf((previous) => previous.slice(0, -1));
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (!validateCPF(cpf)) {
      setError("CPF invalido");
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

      // Mantem exatamente o mesmo comportamento anterior
      setAuthUser({
        id: data.id,
        cpf: data.cpf,
        name: data.name,
        phone: data.phone,
        email: data.email,
      });

      router.push("/menu");
    } catch (loginError: unknown) {
      setError(loginError instanceof Error ? loginError.message : "Erro ao fazer login");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-white px-4 py-6 sm:px-8 sm:py-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(249,115,22,0.12),_transparent_48%)]" />
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-52 bg-gradient-to-t from-zinc-100/70 to-transparent" />

      <section className="relative mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-xl flex-col items-center justify-between rounded-[2rem] border border-zinc-200/80 bg-white/85 px-4 py-5 shadow-[0_24px_60px_rgba(0,0,0,0.08)] backdrop-blur sm:px-8 sm:py-8">
        <header className="w-full">
          <div className="grid grid-cols-[auto_1fr_auto] items-center">
            <Link
              href="/"
              aria-label="Voltar para inicio"
              className="flex h-12 w-12 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-700 shadow-sm transition hover:border-orange-300 hover:text-orange-500"
            >
              <ArrowLeft className="h-6 w-6" />
            </Link>

            <div className="justify-self-center">
              <Image
                src="/logo.svg"
                alt="Logo Mr Smart"
                width={120}
                height={120}
                className="h-[4.4rem] w-[4.4rem] object-contain"
                priority
              />
            </div>

            <span className="h-12 w-12" aria-hidden />
          </div>
        </header>

        <form onSubmit={handleLogin} className="flex w-full flex-1 flex-col items-center justify-center">
          <div className="w-full max-w-md text-center">
            <h1 className="text-[2.05rem] font-bold leading-[1.05] tracking-[-0.02em] text-zinc-900 sm:text-[2.35rem]">
              Que bom ter você por aqui
            </h1>
            <p className="mt-3 text-base font-medium text-zinc-700 sm:text-lg">
              Informe seu CPF para iniciar sua compra
            </p>
          </div>

          <div className="mt-7 w-full max-w-md">
            <Input
              id="cpf"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder="DIGITE SEU CPF"
              required
              value={formattedCpf}
              onChange={handleCPFChange}
              className="h-16 rounded-full border-zinc-200 bg-zinc-100 px-6 text-center text-[1.35rem] font-semibold uppercase tracking-[0.02em] text-zinc-900 placeholder:text-zinc-500 focus-visible:border-orange-400 focus-visible:ring-orange-400"
              aria-label="Digita seu CPF"
            />
          </div>

          <div className="mt-7 grid w-full max-w-[17.5rem] grid-cols-3 gap-3 sm:gap-3.5">
            {NUMBER_KEYS.map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => handleKeypadDigit(digit)}
                className="h-16 rounded-full border-2 border-zinc-800 bg-white text-[1.7rem] font-semibold text-zinc-900 shadow-[0_6px_16px_rgba(0,0,0,0.06)] transition hover:border-orange-500 hover:text-orange-600 active:scale-[0.97]"
                aria-label={`Digite ${digit}`}
              >
                {digit}
              </button>
            ))}

            <button
              type="button"
              onClick={() => handleKeypadDigit("0")}
              className="h-16 rounded-full border-2 border-zinc-800 bg-white text-[1.7rem] font-semibold text-zinc-900 shadow-[0_6px_16px_rgba(0,0,0,0.06)] transition hover:border-orange-500 hover:text-orange-600 active:scale-[0.97]"
              aria-label="Digite 0"
            >
              0
            </button>

            <button
              type="button"
              onClick={handleKeypadDelete}
              className="col-span-2 flex h-16 items-center justify-center rounded-full border-2 border-zinc-800 bg-white text-zinc-900 shadow-[0_6px_16px_rgba(0,0,0,0.06)] transition hover:border-orange-500 hover:text-orange-600 active:scale-[0.97]"
              aria-label="Apagar ultimo digito"
            >
              <DeleteIcon className="h-7 w-7" />
            </button>
          </div>

          <div className="mt-7 w-full max-w-md space-y-4">
            {error && (
              <p className="rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-center text-sm font-medium text-orange-700">
                {error}
              </p>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="h-14 w-full rounded-full bg-orange-500 text-xl font-bold text-white shadow-[0_14px_28px_rgba(249,115,22,0.3)] transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoading ? "Entrando..." : "Continuar"}
            </Button>

            <Link href="/auth/register" className="block">
              <Button
                type="button"
                variant="outline"
                className="h-14 w-full rounded-full border-2 border-orange-500 bg-white text-lg font-semibold text-orange-600 transition hover:bg-orange-50"
              >
                Cadastrar
              </Button>
            </Link>
          </div>
        </form>
      </section>
    </main>
  );
}
