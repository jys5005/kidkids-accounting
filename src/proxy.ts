import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/api/auth', '/api/by24', '/api/kidshome', '/api/sunote', '/api/settings', '/api/incheon']
const TONGHAP_URL = process.env.TONGHAP_URL || 'http://localhost:4000'

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p))

  if (isPublic) return NextResponse.next()

  const session = request.cookies.get('auth_session')?.value
  if (!session) {
    // 통합e 로그인 페이지로 리다이렉트 (returnTo 포함)
    const returnTo = encodeURIComponent(request.url)
    return NextResponse.redirect(`${TONGHAP_URL}/login?returnTo=${returnTo}`)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|ico)).*)'],
}
