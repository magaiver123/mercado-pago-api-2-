'use client'

import { useState, useEffect } from 'react'

function getFullyDeviceId(): string | null {
  // @ts-ignore
  if (typeof window !== 'undefined' && (window as any).fully?.getDeviceId) {
    // @ts-ignore
    return (window as any).fully.getDeviceId()
  }
  return null
}

export default function ActivateTotemPage() {
  const [code, setCode] = useState('')
  const [deviceId, setDeviceId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setDeviceId(getFullyDeviceId())
  }, [])

  async function handleActivate() {
    setLoading(true)
    setError(null)

    if (!deviceId) {
      setError('Este dispositivo não é um Totem válido.')
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/totem/activate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          activation_code: code,
          device_id: deviceId
        })
      })

      const text = await res.text()
      const data = text ? JSON.parse(text) : null

      if (!res.ok) {
        throw new Error(data?.error || 'Erro ao ativar')
      }

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
