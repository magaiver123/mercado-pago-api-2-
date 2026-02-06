'use client'

import { useEffect, useState } from 'react'

export default function TestFully() {
  const [info, setInfo] = useState<any>({})

  useEffect(() => {
    // @ts-ignore
    const fullyObj = (window as any).fully
    // @ts-ignore
    const deviceId = fullyObj?.getDeviceId?.()

    setInfo({
      fullyExists: !!fullyObj,
      deviceId: deviceId || 'NÃO ENCONTRADO'
    })
  }, [])

  return (
    <div style={{ padding: 20 }}>
      <h1>Teste Fully</h1>
      <pre>{JSON.stringify(info, null, 2)}</pre>
    </div>
  )
}
