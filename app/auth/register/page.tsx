"use client";

import Link from "next/link";
import { QRCodeCanvas } from "qrcode.react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function RegisterPage() {
  const qrUrl = "http://localhost:3000/userprofile/cadastro";

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-zinc-100 px-4 sm:px-6">
      <div className="w-full max-w-md">
        <Card className="bg-white border-zinc-200">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-black">
              Crie sua conta
            </CardTitle>
            <p className="text-zinc-600 text-sm mt-2">
              Faça seu cadastro pelo celular para continuar
            </p>
          </CardHeader>

          <CardContent>
            <div className="flex flex-col gap-6 items-center text-center">
              {/* INSTRUÇÕES */}
              <ol className="text-sm text-zinc-700 space-y-2">
                <li>
                  <strong>1.</strong> Escaneie o QR Code com seu smartphone
                </li>
                <li>
                  <strong>2.</strong> Preencha suas informações no site
                </li>
                <li>
                  <strong>3.</strong> Cadastro realizado! Faça login e boas
                  compras
                </li>
              </ol>

              {/* QR CODE */}
              <div className="p-4 bg-zinc-100 rounded-lg">
                <QRCodeCanvas
                  value={qrUrl}
                  size={180}
                  bgColor="#ffffff"
                  fgColor="#f97316"
                  level="M"
                />
              </div>

              <p className="text-xs text-zinc-500 break-all">{qrUrl}</p>

              {/* AÇÃO OPCIONAL */}
              <Link href="/auth/login">
                <Button variant="ghost" className="w-full">
                  Já tenho cadastro
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
