/**
 * 정상여부 체크 — 통합e 의 /api/shop/oasis/login-check 호출.
 * scrape 보다 가벼운 동작 (로그인 + buyerName 만, 5~15초)
 */
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PLATFORM_URL = process.env.NEXT_PUBLIC_PLATFORM_URL || 'http://localhost:3000'

export const maxDuration = 60

export async function POST(request: NextRequest) {
  const session = request.cookies.get('auth_session')?.value
  if (!session) return NextResponse.json({ success: false, error: '미인증' }, { status: 401 })

  const body = await request.json().catch(() => ({})) as any
  const { shopType, shopId, shopPw } = body

  if (shopType !== '오아시스') {
    return NextResponse.json({ success: false, message: `${shopType} 정상여부 체크는 아직 준비중입니다.` }, { status: 501 })
  }
  if (!shopId || !shopPw) {
    return NextResponse.json({ success: false, message: '아이디/비밀번호 누락' }, { status: 400 })
  }

  try {
    const r = await fetch(`${PLATFORM_URL}/api/shop/oasis/login-check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: `auth_session=${session}` },
      body: JSON.stringify({ id: shopId, pw: shopPw }),
    })
    const j = await r.json()
    return NextResponse.json(j, { status: r.status })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || '연결 실패' }, { status: 500 })
  }
}
