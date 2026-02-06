'use client'

import { useState } from 'react'

export default function ActivateTotemPage() {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleActivate() {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/totem/activate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          activation_code: code,
          // device_id NÃO vem do frontend
          // ele já é resolvido no backend via Fully
        })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao ativar')
      }

      // Redireciona para o sistema do totem
      window.location.href = '/'
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{ maxWidth: 400, width: '100%' }}>
        <h1>Ativar Totem</h1>

        <input
          type="text"
          placeholder="Código de ativação"
          value={code}
          onChange={e => setCode(e.target.value)}
          style={{ width: '100%', padding: 12, marginTop: 12 }}
        />

        <button
          onClick={handleActivate}
          disabled={loading}
          style={{ width: '100%', padding: 12, marginTop: 12 }}
        >
          {loading ? 'Ativando...' : 'Ativar'}
        </button>

        {error && (
          <p style={{ color: 'red', marginTop: 12 }}>
            {error}
          </p>
        )}
      </div>
    </div>
  )
}
