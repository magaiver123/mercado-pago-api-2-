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

function sanitizeString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const sanitized = value.trim();
  return sanitized.length > 0 ? sanitized : null;
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
        { error: "Payload invalido" },
        { status: 400 }
      );
    }

    const activationCode = sanitizeString(body?.activationCode);
    const deviceId = sanitizeString(body?.deviceId);

    if (!activationCode || !deviceId) {
      return NextResponse.json(
        { error: "Codigo de ativacao e device ID sao obrigatorios" },
        { status: 400 }
      );
    }

    const { data: existingByDevice, error: existingByDeviceError } =
      await supabase
        .from("totems")
        .select("id, status")
        .eq("device_id", deviceId)
        .maybeSingle();

    if (existingByDeviceError) {
      return NextResponse.json(
        { error: "Erro ao validar dispositivo" },
        { status: 500 }
      );
    }

    if (existingByDevice?.status === "active") {
      return NextResponse.json(
        { error: "Este dispositivo ja esta ativado" },
        { status: 409 }
      );
    }

    const { data: totem, error: totemError } = await supabase
      .from("totems")
      .select("id, status, device_id")
      .eq("activation_code", activationCode)
      .maybeSingle();

    if (totemError) {
      return NextResponse.json(
        { error: "Erro ao validar codigo de ativacao" },
        { status: 500 }
      );
    }

    if (!totem) {
      return NextResponse.json(
        { error: "Codigo de ativacao nao encontrado" },
        { status: 404 }
      );
    }

    if (totem.status === "active") {
      return NextResponse.json(
        { error: "Codigo de ativacao ja utilizado" },
        { status: 409 }
      );
    }

    if (totem.device_id && totem.device_id !== deviceId) {
      return NextResponse.json(
        { error: "Codigo de ativacao nao aplicavel para este dispositivo" },
        { status: 422 }
      );
    }

    if (existingByDevice && existingByDevice.id !== totem.id) {
      return NextResponse.json(
        { error: "Dispositivo vinculado a outro totem" },
        { status: 422 }
      );
    }

    const now = new Date().toISOString();

    const { data: updated, error: updateError } = await supabase
      .from("totems")
      .update({
        device_id: deviceId,
        status: "active",
        activation_code: null,
        activated_at: now,
        last_seen_at: now,
        updated_at: now,
      })
      .eq("id", totem.id)
      .eq("status", "inactive")
      .eq("activation_code", activationCode)
      .select("id");

    if (updateError) {
      if (updateError.code === "23505") {
        return NextResponse.json(
          { error: "Dispositivo ja vinculado a outro totem" },
          { status: 422 }
        );
      }

      return NextResponse.json(
        { error: "Nao foi possivel ativar o totem" },
        { status: 500 }
      );
    }

    if (!updated || updated.length === 0) {
      return NextResponse.json(
        { error: "Codigo de ativacao ja utilizado ou totem inativo" },
        { status: 409 }
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
