import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/api/auth', '/api/by24', '/api/wisean', '/api/kidshome', '/api/sunote', '/api/settings', '/api/incheon', '/api/ifriends', '/api/cert-config', '/api/cis-config', '/api/auto-login']
const TONGHAP_URL = process.env.NEXT_PUBLIC_PLATFORM_URL || 'http://localhost:3000'

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p))

  if (isPublic) return NextResponse.next()

  // 로컬 개발 환경에서는 인증 우회
  if (process.env.NODE_ENV === 'development') {
    return NextResponse.next()
  }

  const session = request.cookies.get('auth_session')?.value
  if (!session) {
    // 통합e 로그인 페이지로 리다이렉트 (returnTo 포함)
    // nginx reverse proxy 뒤에서는 request.url 의 host 가 internal(localhost:4001)이라
    // X-Forwarded-Host / Host 헤더로 외부 url 재구성 (sso/route.ts 와 동일 패턴)
    const fwdHost = request.headers.get('x-forwarded-host') || request.headers.get('host') || ''
    const fwdProto = request.headers.get('x-forwarded-proto') || 'https'
    const externalUrl = fwdHost
      ? `${fwdProto}://${fwdHost}${request.nextUrl.pathname}${request.nextUrl.search}`
      : request.url
    const returnTo = encodeURIComponent(externalUrl)
    return NextResponse.redirect(`${TONGHAP_URL}/login?returnTo=${returnTo}`)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|ico)).*)'],
}
