'use client'

import { useEffect } from 'react'

export default function TestFully() {
  useEffect(() => {
    // @ts-ignore
    console.log('fully:', (window as any).fully)
    // @ts-ignore
    console.log('deviceId:', (window as any).fully?.getDeviceId?.())
  }, [])

  return <div>Veja o console</div>
}
