import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateCPF } from "@/lib/cpf-validator";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  let body: any = null;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Dados inválidos" },
      { status: 400 }
    );
  }

  const { cpf, name, phone, email, password } = body;

  if (
    !cpf ||
    typeof cpf !== "string" ||
    !validateCPF(cpf) ||
    !name ||
    typeof name !== "string" ||
    !phone ||
    typeof phone !== "string" ||
    phone.length < 10 ||
    !email ||
    typeof email !== "string" ||
    !password ||
    typeof password !== "string" ||
    password.length < 6
  ) {
    return NextResponse.json(
      { error: "Dados inválidos" },
      { status: 400 }
    );
  }

  try {
    const supabase = createClient();

    /* ===============================
       1) VERIFICAR CPF
    =============================== */
    const { data: cpfExists } = await (await supabase)
      .from("users")
      .select("id")
      .eq("cpf", cpf)
      .limit(1);

    if (cpfExists && cpfExists.length > 0) {
      return NextResponse.json(
        { error: "CPF já cadastrado" },
        { status: 409 }
      );
    }

    /* ===============================
       2) VERIFICAR EMAIL
    =============================== */
    const { data: emailExists } = await (await supabase)
      .from("users")
      .select("id")
      .eq("email", email)
      .limit(1);

    if (emailExists && emailExists.length > 0) {
      return NextResponse.json(
        { error: "Email já cadastrado" },
        { status: 409 }
      );
    }

    /* ===============================
       3) VERIFICAR TELEFONE
    =============================== */
    const { data: phoneExists } = await (await supabase)
      .from("users")
      .select("id")
      .eq("phone", phone)
      .limit(1);

    if (phoneExists && phoneExists.length > 0) {
      return NextResponse.json(
        { error: "Telefone já cadastrado" },
        { status: 409 }
      );
    }

    /* ===============================
       4) GERAR HASH DA SENHA
    =============================== */
    const password_hash = await bcrypt.hash(password, 10);

    /* ===============================
       5) CRIAR USUÁRIO
    =============================== */
    const { error } = await (await supabase).from("users").insert({
      cpf,
      name,
      phone,
      email,
      password_hash,
      status: "ativo",
      created_at: new Date().toISOString(),
    });

    if (error) {
      return NextResponse.json(
        { error: "Erro ao cadastrar" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Erro interno" },
      { status: 500 }
    );
  }
}
