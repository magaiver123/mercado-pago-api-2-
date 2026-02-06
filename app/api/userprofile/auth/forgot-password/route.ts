import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendResetCodeEmail } from "@/lib/email/send-reset-code";

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const CODE_EXPIRATION_MS = 60_000; // 1 minuto

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ success: false });
    }

    const supabase = createClient();

    const { data: users, error } = await (await supabase)
      .from("users")
      .select("id, email, status")
      .eq("email", email)
      .limit(1);

    if (error) {
      console.error("forgot-password | erro ao buscar usuário:", error);
      return NextResponse.json({ success: false });
    }

    if (!users || users.length === 0) {
      return NextResponse.json({ success: false });
    }

    const user = users[0];

    if (user.status !== "ativo") {
      return NextResponse.json({ success: false });
    }

    const now = new Date();

    /* =====================================================
       1️⃣ EXPIRAR TODOS OS CÓDIGOS ATIVOS ANTERIORES
    ===================================================== */
    await (await supabase)
      .from("password_resets")
      .update({ used_at: now.toISOString() })
      .eq("user_id", user.id)
      .is("used_at", null);

    /* =====================================================
       2️⃣ CRIAR NOVO CÓDIGO (1 MINUTO)
    ===================================================== */
    const code = generateCode();
    const expiresAt = new Date(Date.now() + CODE_EXPIRATION_MS);

    const { error: insertError } = await (await supabase)
      .from("password_resets")
      .insert({
        user_id: user.id,
        email: user.email,
        code,
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      console.error("forgot-password | erro ao criar reset:", insertError);
      return NextResponse.json({ success: false });
    }

    await sendResetCodeEmail("mrstoreoficial051@gmail.com", code);

    return NextResponse.json({
      success: true,
      cooldown: Math.ceil(CODE_EXPIRATION_MS / 1000),
    });
  } catch (err) {
    console.error("forgot-password | erro inesperado:", err);
    return NextResponse.json({ success: false });
  }
}
