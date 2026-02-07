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
  if (PUBLIC_TOTEM_ROUTES.some(route => pathname.startsWith(route))) {
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
    USERPROFILE_PATHS.some(p => pathname.startsWith(p)) ||
    USERPROFILE_API.some(p => pathname.startsWith(p));

  // 2️⃣ Verificar cookie do TOTEM
  const totemSession = req.cookies.get("TOTEM_SESSION")?.value;

  // 3️⃣ Se for USERPROFILE → bloquear TOTEM
  if (isUserProfileRoute && totemSession) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // 4️⃣ Rotas do TOTEM exigem sessão válida
  if (!isUserProfileRoute) {
    if (!totemSession) {
      return NextResponse.redirect(new URL("/activate-totem", req.url));
    }

    const supabase = await createClient();

    const { data: session } = await supabase
      .from("totem_sessions")
      .select(`
        id,
        expires_at,
        totems (
          id,
          status
        )
      `)
      .eq("id", totemSession)
      .maybeSingle();

    // Sessão inexistente ou sem totem
    if (!session || !session.totems?.length) {
      return NextResponse.redirect(new URL("/activate-totem", req.url));
    }

    const totem = session.totems[0];

    // 🔴 Totem desativado → bloqueio imediato
    if (totem.status !== "active") {
      return NextResponse.redirect(new URL("/activate-totem", req.url));
    }

    // Sessão expirada
    if (new Date(session.expires_at) < new Date()) {
      return NextResponse.redirect(new URL("/activate-totem", req.url));
    }

    // ✅ Tudo OK
    return NextResponse.next();
  }

  // 5️⃣ USERPROFILE normal
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|favicon.ico).*)"],
};
