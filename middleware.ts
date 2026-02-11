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

  // Ignorar arquivos estáticos
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/images")
  ) {
    return NextResponse.next();
  }

  // Detectar ambiente
  const userAgent = req.headers.get("user-agent") || "";
  const isFully = userAgent.includes("wv") || userAgent.includes("Fully");

  // 1️⃣ Rotas públicas do totem
  if (PUBLIC_TOTEM_ROUTES.some(route => pathname.startsWith(route))) {
    // Usuário comum NÃO pode acessar
    if (!isFully) {
      return NextResponse.redirect(new URL("/userprofile", req.url));
    }
    return NextResponse.next();
  }

  // 2️⃣ Verificar se é rota do USERPROFILE
  const isUserProfileRoute =
    USERPROFILE_PATHS.some(p => pathname.startsWith(p)) ||
    USERPROFILE_API.some(p => pathname.startsWith(p));

  // 3️⃣ Cookie do TOTEM
  const totemSession = req.cookies.get("TOTEM_SESSION")?.value;

  // 4️⃣ USERPROFILE nunca pode virar TOTEM
  if (isUserProfileRoute) {
    return NextResponse.next();
  }

  // 5️⃣ A partir daqui é fluxo de TOTEM
  // Usuário comum nunca entra
  if (!isFully) {
    return NextResponse.redirect(new URL("/userprofile", req.url));
  }

  // 6️⃣ Sem cookie → vai para ativação
  if (!totemSession) {
    return NextResponse.redirect(new URL("/activate-totem", req.url));
  }

  // 7️⃣ Validar sessão existente
  const supabase = await createClient();

  const { data: session } = await supabase
    .from("totem_sessions")
    .select("id, expires_at")
    .eq("id", totemSession)
    .maybeSingle();

  if (!session) {
    return NextResponse.redirect(new URL("/activate-totem", req.url));
  }

  if (new Date(session.expires_at) < new Date()) {
    return NextResponse.redirect(new URL("/activate-totem", req.url));
  }

  // ✅ Sessão válida
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|favicon.ico).*)"],
};
