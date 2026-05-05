import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const TONGHAP_URL = process.env.NEXT_PUBLIC_PLATFORM_URL || 'http://localhost:3000'

/** GET: SSO 콜백 — 통합e에서 토큰으로 이동 시 세션 쿠키 설정
 *  silent=1: redirect 없이 쿠키만 set 하고 200 JSON 반환 (통합e 로그인 직후 백그라운드 iframe 호출용) */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  const from = request.nextUrl.searchParams.get('from') || TONGHAP_URL
  const silent = request.nextUrl.searchParams.get('silent') === '1'

  // nginx reverse proxy 뒤에서는 request.url 의 host 가 internal(localhost:4001)이라
  // 외부 client 에 location 헤더 그대로 전달 시 ERR_CONNECTION_REFUSED 발생.
  // X-Forwarded-Host / Host 헤더로 외부 url 재구성.
  const fwdHost = request.headers.get('x-forwarded-host') || request.headers.get('host') || ''
  const fwdProto = request.headers.get('x-forwarded-proto') || 'https'
  const externalBase = fwdHost ? `${fwdProto}://${fwdHost}` : ''
  const externalSelfUrl = externalBase
    ? `${externalBase}${request.nextUrl.pathname}${request.nextUrl.search}`
    : request.url
  const externalAccountingUrl = externalBase ? `${externalBase}/accounting` : new URL('/accounting', request.url).toString()

  if (!token) {
    if (silent) return NextResponse.json({ ok: false, reason: 'no-token' }, { status: 401 })
    return NextResponse.redirect(`${from}/login?returnTo=${encodeURIComponent(externalSelfUrl)}`)
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
      : NextResponse.redirect(externalAccountingUrl)
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
