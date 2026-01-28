import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateCPF } from "@/lib/cpf-validator";

export async function POST(request: Request) {
  try {
    let body: any = null;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "CPF inválido" }, { status: 400 });
    }

    const { cpf } = body;

    if (!cpf || typeof cpf !== "string" || !validateCPF(cpf)) {
      return NextResponse.json({ error: "CPF inválido" }, { status: 400 });
    }

    const supabase = createClient();

    const { data: users, error } = await (await supabase)
      .from("users")
      .select("*")
      .eq("cpf", cpf)
      .eq("status", "ativo")
      .limit(1);

    if (error) {
      return NextResponse.json({ error: "Erro interno" }, { status: 500 });
    }

    if (!users || users.length === 0) {
      return NextResponse.json({ error: "CPF inválido" }, { status: 401 });
    }

    const user = users[0];

    await (await supabase)
      .from("users")
      .update({ last_access_at: new Date().toISOString() })
      .eq("id", user.id);

    return NextResponse.json({
      id: user.id,
      cpf: user.cpf,
      name: user.name,
      phone: user.phone,
      email: user.email,
    });
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
