import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    let body: any = null;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Dados inválidos" },
        { status: 400 }
      );
    }

    const { email, password } = body;

    if (
      !email ||
      typeof email !== "string" ||
      !password ||
      typeof password !== "string"
    ) {
      return NextResponse.json(
        { error: "Dados inválidos" },
        { status: 400 }
      );
    }

    const supabase = createClient();

    /* ===============================
       1) BUSCAR USUÁRIO PELO EMAIL
    =============================== */
    const { data: users, error } = await (await supabase)
      .from("users")
      .select("*")
      .eq("email", email)
      .limit(1);

    if (error) {
      return NextResponse.json(
        { error: "Erro interno" },
        { status: 500 }
      );
    }

    if (!users || users.length === 0) {
      return NextResponse.json(
        { error: "Email ou senha inválidos" },
        { status: 401 }
      );
    }

    const user = users[0];

    /* ===============================
       2) VERIFICAR STATUS
    =============================== */
    if (user.status !== "ativo") {
      return NextResponse.json(
        { error: "Usuário bloqueado" },
        { status: 403 }
      );
    }

    /* ===============================
       3) COMPARAR SENHA COM HASH
    =============================== */
    const passwordMatch = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!passwordMatch) {
      return NextResponse.json(
        { error: "Email ou senha inválidos" },
        { status: 401 }
      );
    }

    /* ===============================
       4) ATUALIZAR ÚLTIMO ACESSO
    =============================== */
    await (await supabase)
      .from("users")
      .update({ last_access_at: new Date().toISOString() })
      .eq("id", user.id);

    /* ===============================
       5) RETORNO
    =============================== */
    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      cpf: user.cpf,
    });
  } catch {
    return NextResponse.json(
      { error: "Erro interno" },
      { status: 500 }
    );
  }
}
