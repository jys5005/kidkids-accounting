import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const TONGHAP_URL = process.env.NEXT_PUBLIC_PLATFORM_URL || 'http://localhost:3000'

/** GET: SSO 콜백 — 통합e에서 토큰으로 이동 시 세션 쿠키 설정
 *  silent=1: redirect 없이 쿠키만 set 하고 200 JSON 반환 (통합e 로그인 직후 백그라운드 iframe 호출용) */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  const from = request.nextUrl.searchParams.get('from') || TONGHAP_URL
  const silent = request.nextUrl.searchParams.get('silent') === '1'

  if (!token) {
    if (silent) return NextResponse.json({ ok: false, reason: 'no-token' }, { status: 401 })
    return NextResponse.redirect(`${from}/login?returnTo=${encodeURIComponent(request.url)}`)
  }

  try {
    const verifyRes = await fetch(`${TONGHAP_URL}/api/auth/sso-token?token=${token}`)
    const result = await verifyRes.json()

    if (!verifyRes.ok || !result.valid) {
      if (silent) return NextResponse.json({ ok: false, reason: 'invalid-token' }, { status: 401 })
      return NextResponse.redirect(`${from}/login`)
    }

    const sessionData = JSON.stringify(result.session)
    const response = silent
      ? NextResponse.json({ ok: true })
      : NextResponse.redirect(new URL('/accounting', request.url))
    response.cookies.set('auth_session', sessionData, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 8,
      path: '/',
    })

    return response
  } catch {
    if (silent) return NextResponse.json({ ok: false, reason: 'error' }, { status: 500 })
    return NextResponse.redirect(`${from}/login`)
  }
}
