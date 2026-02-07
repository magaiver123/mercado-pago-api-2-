import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const USERPROFILE_PATHS = ["/userprofile"];
const USERPROFILE_API = ["/api/userprofile"];

// ✅ Rotas públicas do totem (ativação / diagnóstico)
const PUBLIC_TOTEM_ROUTES = ["/activate-totem", "/test-fully"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 🔒 NUNCA interceptar APIs
  if (pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  // ✅ Permitir rotas públicas do totem
  if (PUBLIC_TOTEM_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Ignorar arquivos estáticos
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/images")
  ) {
    return NextResponse.next();
  }

  // 1️⃣ Verificar se é rota do USERPROFILE
  const isUserProfileRoute =
    USERPROFILE_PATHS.some((p) => pathname.startsWith(p)) ||
    USERPROFILE_API.some((p) => pathname.startsWith(p));

  // 2️⃣ Verificar cookie do TOTEM
  const totemSession = req.cookies.get("TOTEM_SESSION")?.value;

  // 3️⃣ Se for USERPROFILE → bloquear TOTEM
  if (isUserProfileRoute && totemSession) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // 4️⃣ Se NÃO for USERPROFILE (rotas do TOTEM)
  if (!isUserProfileRoute) {
    // 🔁 Tentar auto-recuperar sessão se não houver cookie
    if (!totemSession) {
      try {
        const autoSessionRes = await fetch(
          new URL("/api/totem/auto-session", req.url),
          {
            headers: {
              "user-agent": req.headers.get("user-agent") || "",
            },
          }
        );

        if (autoSessionRes.ok) {
          return NextResponse.next();
        }
      } catch (err) {
        console.error("Erro ao tentar auto-session do totem:", err);
      }

      return NextResponse.redirect(new URL("/activate-totem", req.url));
    }

    // 🔎 Validar sessão + status do totem
    const supabase = await createClient();

    const { data: session } = await supabase
      .from("totem_sessions")
      .select(
        `
        id,
        expires_at,
        totems (
          id,
          status
        )
      `
      )
      .eq("id", totemSession)
      .maybeSingle();

    // Sessão inexistente
    if (!session || !session.totems) {
      return NextResponse.redirect(new URL("/activate-totem", req.url));
    }

    // 🔴 Totem desativado → bloqueia IMEDIATAMENTE

    const totem = session.totems[0];

    if (!totem || totem.status !== "active") {
      return NextResponse.redirect(new URL("/activate-totem", req.url));
    }

    // Sessão expirada
    if (new Date(session.expires_at) < new Date()) {
      return NextResponse.redirect(new URL("/activate-totem", req.url));
    }

    // ✅ Sessão válida + totem ativo
    return NextResponse.next();
  }

  // 5️⃣ USERPROFILE normal → libera
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|favicon.ico).*)"],
};
