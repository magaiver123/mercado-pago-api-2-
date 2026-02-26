import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false },
      })
    : null;

function parseDeviceId(body: any): string | null {
  if (!body || typeof body.deviceId !== "string") {
    return null;
  }

  const deviceId = body.deviceId.trim();
  return deviceId.length > 0 ? deviceId : null;
}

export async function POST(request: Request) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: "Supabase service role nao configurada" },
        { status: 500 }
      );
    }

    let body: any = null;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Device ID invalido" },
        { status: 400 }
      );
    }

    const deviceId = parseDeviceId(body);
    if (!deviceId) {
      return NextResponse.json(
        { error: "Device ID invalido" },
        { status: 400 }
      );
    }

    const { data: totem, error } = await supabase
      .from("totems")
      .select("id, status")
      .eq("device_id", deviceId)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { error: "Erro ao validar totem" },
        { status: 500 }
      );
    }

    if (!totem) {
      return NextResponse.json({ allowed: false, reason: "not_found" });
    }

    if (totem.status !== "active") {
      return NextResponse.json({ allowed: false, reason: "inactive" });
    }

    const now = new Date().toISOString();

    const { error: updateError } = await supabase
      .from("totems")
      .update({
        last_seen_at: now,
        updated_at: now,
      })
      .eq("id", totem.id)
      .eq("status", "active");

    if (updateError) {
      return NextResponse.json(
        { error: "Erro ao atualizar ultimo acesso do totem" },
        { status: 500 }
      );
    }

    return NextResponse.json({ allowed: true, reason: "active" });
  } catch {
    return NextResponse.json(
      { error: "Erro interno" },
      { status: 500 }
    );
  }
}
