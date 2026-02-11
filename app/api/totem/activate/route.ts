import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { randomUUID } from 'crypto'

export async function POST(req: NextRequest) {
  const supabase = await createClient()

  try {
    const { activation_code } = await req.json()

    if (!activation_code) {
      return NextResponse.json(
        { error: 'Código de ativação obrigatório' },
        { status: 400 }
      )
    }

    // 🔑 device_id provisório (até integrar Fully corretamente)
    const device_id = req.headers.get('user-agent') || 'UNKNOWN_DEVICE'

    const { data: totem, error: findError } = await supabase
      .from('totems')
      .select('*')
      .eq('activation_code', activation_code)
      .eq('status', 'inactive')
      .single()

    if (findError || !totem) {
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

    return response

  } catch (err) {
    console.error(err)
    return NextResponse.json(
      { error: 'Erro interno ao ativar totem' },
      { status: 500 }
    )
  }
}
