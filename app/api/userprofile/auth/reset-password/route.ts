import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const { email, code, password } = await request.json();

    if (!email || !code || !password || password.length < 6) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    const supabase = createClient();

    const { data: resets } = await (await supabase)
      .from("password_resets")
      .select("*")
      .eq("email", email)
      .eq("code", code)
      .is("used_at", null)
      .gt("expires_at", new Date().toISOString())
      .limit(1);

    if (!resets || resets.length === 0) {
      return NextResponse.json({ error: "Código inválido" }, { status: 400 });
    }

    const reset = resets[0];

    const { data: users } = await (await supabase)
      .from("users")
      .select("password_hash")
      .eq("id", reset.user_id)
      .limit(1);

    if (!users || users.length === 0) {
      return NextResponse.json({ error: "Usuário inválido" }, { status: 400 });
    }

    const isSamePassword = await bcrypt.compare(
      password,
      users[0].password_hash
    );

    if (isSamePassword) {
      return NextResponse.json(
        { error: "A nova senha não pode ser igual à anterior" },
        { status: 400 }
      );
    }

    const newHash = await bcrypt.hash(password, 10);

    await (await supabase)
      .from("users")
      .update({ password_hash: newHash })
      .eq("id", reset.user_id);

    await (await supabase)
      .from("password_resets")
      .update({ used_at: new Date().toISOString() })
      .eq("id", reset.id);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("reset-password | erro inesperado:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
