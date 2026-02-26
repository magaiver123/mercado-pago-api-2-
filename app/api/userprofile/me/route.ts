import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function isValidUUID(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "");
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId || !isValidUUID(userId)) {
      return NextResponse.json(
        { error: "Usuario invalido" },
        { status: 400 }
      );
    }

    const supabase = createClient();

    const { data: user, error } = await (await supabase)
      .from("users")
      .select(
        "id, name, cpf, phone, email, created_at, last_access_at, status, role"
      )
      .eq("id", userId)
      .eq("status", "ativo")
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { error: "Erro ao buscar usuario" },
        { status: 500 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { error: "Usuario nao encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(user);
  } catch {
    return NextResponse.json(
      { error: "Erro interno" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    let body: any = null;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Dados invalidos" },
        { status: 400 }
      );
    }

    const userId = typeof body?.userId === "string" ? body.userId.trim() : "";
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const email = typeof body?.email === "string" ? body.email.trim() : "";
    const phone =
      typeof body?.phone === "string" ? normalizePhone(body.phone) : "";

    if (
      !userId ||
      !isValidUUID(userId) ||
      !name ||
      !email ||
      !isValidEmail(email) ||
      phone.length < 10 ||
      phone.length > 11
    ) {
      return NextResponse.json(
        { error: "Dados invalidos" },
        { status: 400 }
      );
    }

    const supabase = createClient();

    const { data: existingUser, error: existingUserError } = await (
      await supabase
    )
      .from("users")
      .select("id, status")
      .eq("id", userId)
      .maybeSingle();

    if (existingUserError) {
      return NextResponse.json(
        { error: "Erro ao validar usuario" },
        { status: 500 }
      );
    }

    if (!existingUser || existingUser.status !== "ativo") {
      return NextResponse.json(
        { error: "Usuario nao encontrado" },
        { status: 404 }
      );
    }

    const { data: emailUser, error: emailUserError } = await (await supabase)
      .from("users")
      .select("id")
      .eq("email", email)
      .neq("id", userId)
      .limit(1);

    if (emailUserError) {
      return NextResponse.json(
        { error: "Erro ao validar email" },
        { status: 500 }
      );
    }

    if (emailUser && emailUser.length > 0) {
      return NextResponse.json(
        { error: "Email ja cadastrado" },
        { status: 409 }
      );
    }

    const { data: updatedUser, error: updateError } = await (await supabase)
      .from("users")
      .update({
        name,
        email,
        phone,
      })
      .eq("id", userId)
      .select("id, name, cpf, phone, email")
      .maybeSingle();

    if (updateError) {
      if (updateError.code === "23505") {
        return NextResponse.json(
          { error: "Email ja cadastrado" },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: "Erro ao salvar alteracoes" },
        { status: 500 }
      );
    }

    if (!updatedUser) {
      return NextResponse.json(
        { error: "Usuario nao encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user: updatedUser,
    });
  } catch {
    return NextResponse.json(
      { error: "Erro interno" },
      { status: 500 }
    );
  }
}
