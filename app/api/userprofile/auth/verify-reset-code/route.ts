import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const EXTEND_EXPIRATION_MS = 3 * 60 * 1000; // 3 minutos

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const email = typeof body.email === "string" ? body.email.trim() : null;
    const code = typeof body.code === "string" ? body.code.trim() : null;

    if (!email || !code) {
      return NextResponse.json({ valid: false });
    }

    const supabase = createClient();

    const { data, error } = await (await supabase)
      .from("password_resets")
      .select("id")
      .eq("email", email)
      .eq("code", code)
      .is("used_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) {
      console.error("verify-reset-code | erro supabase:", error);
      return NextResponse.json({ valid: false });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ valid: false });
    }

    /* =====================================================
       ✅ ESTENDER VALIDADE DO CÓDIGO APÓS VALIDAÇÃO
    ===================================================== */
    const newExpiresAt = new Date(Date.now() + EXTEND_EXPIRATION_MS);

    await (await supabase)
      .from("password_resets")
      .update({ expires_at: newExpiresAt.toISOString() })
      .eq("id", data[0].id);

    return NextResponse.json({ valid: true });
  } catch (err) {
    console.error("verify-reset-code | erro geral:", err);
    return NextResponse.json({ valid: false });
  }
}
