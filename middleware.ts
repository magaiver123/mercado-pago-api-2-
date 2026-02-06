import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const appMode = process.env.NEXT_PUBLIC_APP_MODE
  const pathname = request.nextUrl.pathname

  // Ignora arquivos internos do Next.js e arquivos públicos
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/images') ||
    pathname.startsWith('/fonts')
  ) {
    return NextResponse.next()
  }

  const isUserProfile =
    pathname.startsWith('/userprofile') ||
    pathname.startsWith('/api/userprofile')

  // Modo TOTEM → bloqueia USERPROFILE
  if (appMode === 'TOTEM' && isUserProfile) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Modo USER → bloqueia TOTEM
  if (appMode === 'USER' && !isUserProfile) {
    return NextResponse.redirect(new URL('/userprofile', request.url))
  }

  return NextResponse.next()
}
