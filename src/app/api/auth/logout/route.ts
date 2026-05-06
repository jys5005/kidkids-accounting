import { NextResponse } from 'next/server'

/**
 * 로그아웃 — .cert24.kr 도메인 + 도메인 미명시 둘 다 expire.
 * Next.js cookies.set 은 같은 name 두 번 호출 시 마지막만 반영 → raw Set-Cookie append 사용.
 */
function buildExpiredCookies(isProd: boolean): string[] {
  if (!isProd) {
    return [`auth_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; HttpOnly; SameSite=Lax`]
  }
  return [
    `auth_session=; Domain=.cert24.kr; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; Secure; HttpOnly; SameSite=Lax`,
    `auth_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; Secure; HttpOnly; SameSite=Lax`,
  ]
}

function applyExpire(response: NextResponse) {
  const isProd = process.env.NODE_ENV === 'production'
  for (const c of buildExpiredCookies(isProd)) {
    response.headers.append('Set-Cookie', c)
  }
}

export async function POST() {
  const response = NextResponse.json({ success: true })
  applyExpire(response)
  return response
}

export async function GET() {
  const response = NextResponse.json({ success: true })
  applyExpire(response)
  return response
}
