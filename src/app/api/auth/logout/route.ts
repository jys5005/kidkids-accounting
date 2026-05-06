import { NextResponse } from 'next/server'

// 로그인은 통합e 가 prod 에서 domain '.cert24.kr' 로 set 하므로 동일 도메인으로 expire 시켜야 진짜 삭제됨.
// 호환성: 도메인 명시 / 도메인 미명시 둘 다 expire (이전 버전 잔존 쿠키 cleanup)
export async function POST() {
  const response = NextResponse.json({ success: true })
  const isProd = process.env.NODE_ENV === 'production'
  const baseExpire = {
    expires: new Date(0),
    maxAge: 0,
    path: '/',
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax' as const,
  }
  if (isProd) {
    response.cookies.set('auth_session', '', { ...baseExpire, domain: '.cert24.kr' })
    response.cookies.set('auth_session', '', { ...baseExpire })
  } else {
    response.cookies.delete('auth_session')
  }
  return response
}

export async function GET() {
  return POST()
}
