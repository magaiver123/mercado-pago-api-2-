"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShoppingCart, Mail, Lock, ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Mode = "login" | "forgot-email" | "forgot-code" | "forgot-reset";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [code, setCode] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 🔹 CONTROLE DE REENVIO
  const [resendCooldown, setResendCooldown] = useState(0);
  const canResendCode = resendCooldown === 0;

  const router = useRouter();

  /* =====================
     TIMER DE REENVIO
  ===================== */
  useEffect(() => {
    if (resendCooldown === 0) return;

    const timer = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [resendCooldown]);

  /* =====================
     LOGIN NORMAL
  ===================== */
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/userprofile/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Erro ao fazer login");
        return;
      }

      router.push("/userprofile/perfil");
    } catch {
      setError("Erro ao fazer login");
    } finally {
      setIsLoading(false);
    }
  }

  /* =====================
     ESQUECI SENHA - EMAIL
  ===================== */
  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const res = await fetch("/api/userprofile/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const data = await res.json();

    setIsLoading(false);

    if (!data.success) {
      setError(
        "Não foi possível enviar o código. Verifique o e-mail informado."
      );
      return;
    }

    setResendCooldown(60);
    setMode("forgot-code");
  }

  /* =====================
     REENVIAR CÓDIGO
  ===================== */
  async function handleResendCode() {
    if (!canResendCode) return;

    setIsLoading(true);
    setError(null);

    const res = await fetch("/api/userprofile/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const data = await res.json();

    setIsLoading(false);

    if (!data.success) {
      setError(
        "Não foi possível reenviar o código. Tente novamente mais tarde."
      );
      return;
    }

    setResendCooldown(60);
  }

  /* =====================
     VALIDAR CÓDIGO
  ===================== */
  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const res = await fetch("/api/userprofile/auth/verify-reset-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code }),
    });

    const data = await res.json();

    setIsLoading(false);

    if (!data.valid) {
      setError("Código inválido");
      return;
    }

    setMode("forgot-reset");
  }

  /* =====================
     RESETAR SENHA
  ===================== */
  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (password !== confirmPassword) {
      setError("As senhas não coincidem");
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/userprofile/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erro ao atualizar senha");
        setIsLoading(false);
        return;
      }

      setMode("login");
      setPassword("");
      setConfirmPassword("");
      setCode("");
    } catch {
      setError("Erro inesperado");
    } finally {
      setIsLoading(false);
    }
  }

  /* =====================
     RENDER
  ===================== */
  return (
    <main className="min-h-screen bg-background flex flex-col">
      <header className="bg-card border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Link
            href="/"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">
              Mr <span className="text-primary">Smart</span>
            </span>
          </div>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
              <Lock className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              {mode === "login" ? "Entrar" : "Recuperar senha"}
            </h1>
            <p className="text-muted-foreground">
              {mode === "login"
                ? "Acesse sua conta Mr Smart"
                : "Siga os passos para redefinir sua senha"}
            </p>
          </div>

          {error && (
            <p className="text-sm text-destructive text-center mb-4">
              {error}
            </p>
          )}

          {mode === "login" && (
            <form className="space-y-4" onSubmit={handleLogin}>
              <Label>E-mail</Label>
              <Input
                type="email"
                className="py-6"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <Label>Senha</Label>
              <Input
                type="password"
                className="py-6"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              <Button className="w-full py-6" disabled={isLoading}>
                Entrar
              </Button>
            </form>
          )}

          {mode === "forgot-email" && (
            <form className="space-y-4" onSubmit={handleSendCode}>
              <Label>E-mail</Label>
              <Input
                type="email"
                className="py-6"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Button className="w-full py-6" disabled={isLoading}>
                Enviar código
              </Button>
            </form>
          )}

          {mode === "forgot-code" && (
            <form className="space-y-4" onSubmit={handleVerifyCode}>
              <Label>Código recebido</Label>
              <Input
                className="py-6"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />

              <Button className="w-full py-6" disabled={isLoading}>
                Validar código
              </Button>

              <div className="text-center text-sm text-muted-foreground">
                {canResendCode ? (
                  <button
                    type="button"
                    onClick={handleResendCode}
                    className="text-primary hover:underline"
                  >
                    Enviar código novamente
                  </button>
                ) : (
                  <span>Reenviar código em {resendCooldown}s</span>
                )}
              </div>
            </form>
          )}

          {mode === "forgot-reset" && (
            <form className="space-y-4" onSubmit={handleResetPassword}>
              <Label>Nova senha</Label>
              <Input
                type="password"
                className="py-6"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              <Label>Confirmar nova senha</Label>
              <Input
                type="password"
                className="py-6"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />

              <Button className="w-full py-6" disabled={isLoading}>
                Atualizar senha
              </Button>
            </form>
          )}

          <div className="mt-6 text-center">
            {mode === "login" ? (
              <button
                onClick={() => setMode("forgot-email")}
                className="text-sm text-muted-foreground hover:text-primary"
              >
                Esqueci minha senha
              </button>
            ) : (
              <button
                onClick={() => {
                  setMode("login");
                  setCode("");
                  setResendCooldown(0);
                  setError(null);
                }}
                className="text-sm text-muted-foreground hover:text-primary"
              >
                Voltar ao login
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
