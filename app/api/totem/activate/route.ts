import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { randomUUID } from 'crypto'

export async function POST(req: NextRequest) {
  const supabase = await createClient()

  try {
    const { device_id, activation_code } = await req.json()

    if (!device_id || !activation_code) {
      return NextResponse.json(
        { error: 'Dados obrigatórios faltando' },
        { status: 400 }
      )
    }

    // 1️⃣ Buscar totem inativo
    const { data: totem, error: findError } = await supabase
      .from('totems')
      .select('*')
      .eq('activation_code', activation_code)
      .eq('status', 'inactive')
      .single()

    if (findError || !totem) {
      return NextResponse.json(
        { error: 'Código inválido ou já usado' },
        { status: 401 }
      )
    }

    // 2️⃣ Ativar o totem
    const { error: updateError } = await supabase
      .from('totems')
      .update({
        device_id,
        status: 'active',
        activated_at: new Date().toISOString(),
        activation_code: null
      })
      .eq('id', totem.id)

    if (updateError) throw updateError

    // 3️⃣ Criar sessão do totem
    const sessionId = randomUUID()
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30) // 30 dias

    const { error: sessionError } = await supabase
      .from('totem_sessions')
      .insert({
        id: sessionId,
        totem_id: totem.id,
        expires_at: expiresAt.toISOString()
      })

    if (sessionError) throw sessionError

    // 4️⃣ Setar cookie httpOnly
    const response = NextResponse.json({ success: true })

    response.cookies.set('TOTEM_SESSION', sessionId, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/',
      expires: expiresAt
    })

    return response

  } catch (error) {
    console.error('Erro ao ativar totem:', error)
    return NextResponse.json(
      { error: 'Erro interno' },
      { status: 500 }
    )
  }
}
