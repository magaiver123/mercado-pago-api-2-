"use client";

import Link from "next/link";
import Image from "next/image";
import { QRCodeCanvas } from "qrcode.react";

import { Button } from "@/components/ui/button";

export default function RegisterPage() {
  const qrUrl = "mrsmart.com.br";

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f3f1ee] px-4 py-6 sm:px-8 sm:py-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(249,115,22,0.14),_transparent_45%)]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-52 bg-gradient-to-t from-orange-100/40 to-transparent" />

      <section className="relative mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-5xl flex-col overflow-hidden rounded-[2rem] border border-[#dfd1c0] bg-white/90 shadow-[0_24px_60px_rgba(0,0,0,0.1)] backdrop-blur lg:flex-row">
        <div className="flex flex-1 flex-col justify-between bg-[#f7f4ef] px-6 py-7 sm:px-8 sm:py-8">
          <div>
            <div className="inline-flex rounded-full bg-orange-100 px-4 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-orange-700">
              Cadastro pelo celular
            </div>

            <h1 className="mt-4 text-[2rem] font-bold leading-[1.05] tracking-[-0.02em] text-[#3b2417] sm:text-[2.5rem]">
              Crie sua conta
              <span className="text-orange-500">.</span>
            </h1>
            <p className="mt-3 max-w-xl text-base font-medium text-zinc-700 sm:text-lg">
              Faça seu cadastro pelo smartphone e volte para continuar seu pedido no totem.
            </p>

            <ol className="mt-7 space-y-3">
              <li className="flex items-start gap-3 rounded-2xl border border-[#eadbca] bg-white px-4 py-3 text-sm font-medium text-zinc-700 sm:text-base">
                <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-orange-500 text-sm font-bold text-white">
                  1
                </span>
                Escaneie o QR Code com seu smartphone.
              </li>
              <li className="flex items-start gap-3 rounded-2xl border border-[#eadbca] bg-white px-4 py-3 text-sm font-medium text-zinc-700 sm:text-base">
                <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-orange-500 text-sm font-bold text-white">
                  2
                </span>
                Preencha suas informações no site.
              </li>
              <li className="flex items-start gap-3 rounded-2xl border border-[#eadbca] bg-white px-4 py-3 text-sm font-medium text-zinc-700 sm:text-base">
                <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-orange-500 text-sm font-bold text-white">
                  3
                </span>
                Cadastro realizado. Faça login e boas compras.
              </li>
            </ol>
          </div>

          <div className="mt-8 flex items-center gap-3 rounded-2xl border border-[#e6d8c7] bg-white px-4 py-3">
            <Image
              src="/logo.svg"
              alt="Logo Mr Smart"
              width={48}
              height={48}
              className="h-12 w-12 object-contain"
              priority
            />
            <p className="text-sm font-medium text-zinc-600 sm:text-base">
              Depois do cadastro no celular, toque em <strong>Já tenho cadastro</strong> para entrar.
            </p>
          </div>
        </div>

        <div className="flex w-full flex-col items-center justify-center gap-5 border-t border-[#eadfce] bg-white px-6 py-7 text-center sm:px-8 sm:py-8 lg:w-[25rem] lg:border-l lg:border-t-0">
          <div className="rounded-[1.8rem] border border-orange-200 bg-orange-50 p-4 shadow-[0_12px_26px_rgba(249,115,22,0.14)] sm:p-5">
            <div className="rounded-[1.1rem] bg-white p-4 sm:p-5">
              <QRCodeCanvas
                value={qrUrl}
                size={195}
                bgColor="#ffffff"
                fgColor="#f97316"
                level="M"
              />
            </div>
          </div>

          <p className="max-w-sm break-all text-xs font-medium text-zinc-500">
            {qrUrl}
          </p>

          <Link href="/auth/login" className="w-full max-w-xs">
            <Button className="h-14 w-full rounded-full bg-orange-500 text-lg font-bold text-white shadow-[0_14px_28px_rgba(249,115,22,0.3)] transition hover:bg-orange-600">
              Já tenho cadastro
            </Button>
          </Link>
        </div>
      </section>
    </main>
  );
}
