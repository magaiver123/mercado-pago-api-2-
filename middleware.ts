import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const USERPROFILE_PATHS = ["/userprofile"];
const USERPROFILE_API = ["/api/userprofile"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 🔒 NUNCA interceptar APIs
  if (pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  // Permitir tela de ativação do totem
  if (pathname === "/activate-totem") {
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
    // 🔴 ALTERAÇÃO PRINCIPAL AQUI
    // Antes: redirecionava para /userprofile
    // Agora: redireciona para /activate-totem
    if (!totemSession) {
      return NextResponse.redirect(new URL("/activate-totem", req.url));
    }

    // Validar sessão no banco
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

    // Sessão válida → libera
    return NextResponse.next();
  }

  // 5️⃣ USERPROFILE normal → libera
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|favicon.ico).*)"],
};
