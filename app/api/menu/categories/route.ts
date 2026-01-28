import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = createClient();

    const { data, error } = await (await supabase)
      .from("categories")
      .select("id, name")
      .eq("is_active", true)
      .order("name");

    if (error) {
      return NextResponse.json(
        { error: "Erro ao carregar categorias" },
        { status: 500 }
      );
    }

    return NextResponse.json(data ?? []);
  } catch {
    return NextResponse.json(
      { error: "Erro interno" },
      { status: 500 }
    );
  }
}
