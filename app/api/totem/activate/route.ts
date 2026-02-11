import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { randomUUID } from 'crypto'

export async function POST(req: NextRequest) {
  const supabase = await createClient()

  try {
    const body = await req.json()

    console.log("🔑 RAW BODY:", body)
    console.log("🔑 RAW activation_code:", body?.activation_code)
    console.log("🔑 RAW device_id:", body?.device_id)
    console.log("🔑 activation_code TYPE:", typeof body?.activation_code)
    console.log("🔑 activation_code LENGTH:", body?.activation_code?.length)
    console.log("🔑 activation_code JSON:", JSON.stringify(body?.activation_code))

    const activation_code = body?.activation_code?.trim()
    const device_id = body?.device_id?.trim()

    console.log("🧹 CLEAN activation_code:", activation_code)
    console.log("🧹 CLEAN activation_code LENGTH:", activation_code?.length)

    if (!activation_code || !device_id) {
      console.log("❌ FALHA: código ou device_id ausente após trim")
      return NextResponse.json(
        { error: 'Dispositivo inválido ou código ausente' },
        { status: 400 }
      )
    }

    const { data: totem, error: findError } = await supabase
      .from('totems')
      .select('*')
      .eq('activation_code', activation_code)
      .eq('status', 'inactive')
      .single()

    console.log("🔎 QUERY RESULT:", totem)
    console.log("❌ QUERY ERROR:", findError)

    if (findError || !totem) {
      console.log("❌ TOTEM NÃO ENCONTRADO PARA O CÓDIGO:", activation_code)
      return NextResponse.json(
        { error: 'Código inválido ou já utilizado' },
        { status: 401 }
      )
    }

    await supabase
      .from('totems')
      .update({
        device_id,
        status: 'active',
        activated_at: new Date().toISOString(),
        activation_code: null
      })
      .eq('id', totem.id)

    const sessionId = randomUUID()
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)

    await supabase.from('totem_sessions').insert({
      id: sessionId,
      totem_id: totem.id,
      expires_at: expiresAt.toISOString()
    })

    const response = NextResponse.json({ success: true })

    response.cookies.set('TOTEM_SESSION', sessionId, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/',
      expires: expiresAt
    })

    console.log("✅ TOTEM ATIVADO COM SUCESSO:", {
      totem_id: totem.id,
      device_id,
      sessionId
    })

    return response

  } catch (err) {
    console.error("🔥 ERRO GERAL NA ATIVAÇÃO:", err)
    return NextResponse.json(
      { error: 'Erro interno ao ativar totem' },
      { status: 500 }
    )
  }
}
