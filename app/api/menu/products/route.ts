import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/* ===============================
   VALIDADOR DE UUID
=============================== */
function isValidUUID(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("category_id");

    /* ===============================
       VALIDAÇÃO ANTES DO BANCO
    =============================== */
    if (!categoryId || !isValidUUID(categoryId)) {
      return NextResponse.json(
        { error: "Categoria inválida" },
        { status: 400 }
      );
    }

    const supabase = createClient();

    const { data, error } = await (await supabase)
      .from("products")
      .select(`
        id,
        name,
        description,
        price,
        image_url,
        category_id,
        product_stock!inner ( quantity )
      `)
      .eq("is_active", true)
      .eq("category_id", categoryId);

    if (error) {
      return NextResponse.json(
        { error: "Erro ao carregar produtos" },
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
