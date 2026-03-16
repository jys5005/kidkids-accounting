import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const TONGHAP_URL = process.env.NEXT_PUBLIC_PLATFORM_URL || 'http://localhost:4000'

/** GET: SSO 콜백 — 통합e에서 토큰으로 이동 시 세션 쿠키 설정 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  const from = request.nextUrl.searchParams.get('from') || TONGHAP_URL

  if (!token) {
    // 토큰 없으면 통합e 로그인으로 리다이렉트
    return NextResponse.redirect(`${from}/login?returnTo=${encodeURIComponent(request.url)}`)
  }

  try {
    // 통합e에 토큰 검증 요청
    const verifyRes = await fetch(`${TONGHAP_URL}/api/auth/sso-token?token=${token}`)
    const result = await verifyRes.json()

    if (!verifyRes.ok || !result.valid) {
      return NextResponse.redirect(`${from}/login`)
    }

    // 세션 쿠키 설정 후 메인 페이지로 리다이렉트
    const sessionData = JSON.stringify(result.session)
    const response = NextResponse.redirect(new URL('/accounting', request.url))
    response.cookies.set('auth_session', sessionData, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 8, // 8시간
      path: '/',
    })

    return response
  } catch {
    return NextResponse.redirect(`${from}/login`)
  }
}
