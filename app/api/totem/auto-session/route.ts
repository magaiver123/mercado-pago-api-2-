import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    // 1️⃣ Garantir que está rodando dentro do Fully
    const userAgent = req.headers.get("user-agent") || "";

    const isFully =
      userAgent.includes("wv") || userAgent.includes("Fully");

    if (!isFully) {
      return NextResponse.json(
        { error: "Não é um dispositivo Fully" },
        { status: 401 }
      );
    }

    // 2️⃣ Receber device_id REAL enviado pelo frontend
    const { device_id } = await req.json();

    if (!device_id) {
      return NextResponse.json(
        { error: "Device ID não informado" },
        { status: 400 }
      );
    }

    // 3️⃣ Buscar totem ATIVO com esse device_id
    const { data: totem } = await supabase
      .from("totems")
      .select("id")
      .eq("device_id", device_id)
      .eq("status", "active")
      .maybeSingle();

    if (!totem) {
      return NextResponse.json(
        { error: "Totem não reconhecido" },
        { status: 404 }
      );
    }

    // 4️⃣ Criar nova sessão
    const sessionId = randomUUID();
    const expiresAt = new Date(
      Date.now() + 1000 * 60 * 60 * 24 * 30
    ); // 30 dias

    const { error: sessionError } = await supabase
      .from("totem_sessions")
      .insert({
        id: sessionId,
        totem_id: totem.id,
        expires_at: expiresAt.toISOString(),
      });

    if (sessionError) throw sessionError;

    // 5️⃣ Setar cookie novamente (compatível com Android WebView)
    const response = NextResponse.json({ success: true });

    response.cookies.set("TOTEM_SESSION", sessionId, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      expires: expiresAt,
    });

    return response;

  } catch (error) {
    console.error("Erro no auto-session do totem:", error);
    return NextResponse.json(
      { error: "Erro interno" },
      { status: 500 }
    );
  }
}
