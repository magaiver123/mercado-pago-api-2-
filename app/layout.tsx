import type React from "react";
import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { IdleProvider } from "@/components/IdleProvider";
import { Toaster } from "@/components/ui/toaster";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Mr Smart Autoatendimento",
  description: "Sistema de autoatendimento integrado com Mercado Pago Point",
  icons: {
    icon: "/logo.svg",
    apple: "/logo.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className={`${poppins.className} antialiased`}>
        <IdleProvider>
          {children}
        </IdleProvider>

        <Toaster />
        <Analytics />
      </body>
    </html>
  );
}
