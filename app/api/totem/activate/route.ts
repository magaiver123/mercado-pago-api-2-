import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  try {
    const { activation_code, device_id } = await req.json();

    if (!activation_code || !device_id) {
      return NextResponse.json(
        { error: "Dispositivo inválido ou código ausente" },
        { status: 400 }
      );
    }

    const { data: totem, error: findError } = await supabase
      .from("totems")
      .select("*")
      .eq("activation_code", activation_code)
      .single();

    if (!totem || totem.activation_code === null) {
      return NextResponse.json(
        { error: "Código inválido ou já utilizado" },
        { status: 401 }
      );
    }

    if (findError || !totem) {
      return NextResponse.json(
        { error: "Código inválido ou já utilizado" },
        { status: 401 }
      );
    }

    await supabase
      .from("totems")
      .update({
        device_id,
        status: "active",
        activated_at: new Date().toISOString(),
        activation_code: null,
      })
      .eq("id", totem.id);

    const sessionId = randomUUID();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);

    await supabase.from("totem_sessions").insert({
      id: sessionId,
      totem_id: totem.id,
      expires_at: expiresAt.toISOString(),
    });

    const response = NextResponse.json({ success: true });

    response.cookies.set("TOTEM_SESSION", sessionId, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      path: "/",
      expires: expiresAt,
    });

    return response;
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Erro interno ao ativar totem" },
      { status: 500 }
    );
  }
}
