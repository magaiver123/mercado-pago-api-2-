import type React from "react"
import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import { IdleProvider } from "@/components/IdleProvider"

const _geist = Inter ({ subsets: ["latin"] })
const _geistMono = Inter ({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Alabama Comidaria - Sistema de Pedidos",
  description: "Sistema de pedidos integrado com Mercado Pago Point",
  generator: "v0.app",
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <IdleProvider>
          {children}
        </IdleProvider>

        <Analytics />
      </body>
    </html>
  )
}

