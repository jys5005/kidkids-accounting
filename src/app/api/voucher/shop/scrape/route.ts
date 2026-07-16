/**
 * 영수증수집하기 — 통합e 의 스크래핑 API 호출.
 * 현재 오아시스만 지원, 그 외는 501 반환.
 *
 * POST /api/voucher/shop/scrape  body: { shopType, shopId, shopPw, startYmd, endYmd }
 *   → 통합e /api/shop/oasis/orders 호출 결과 그대로 반환
 */
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PLATFORM_URL = process.env.NEXT_PUBLIC_PLATFORM_URL || 'http://localhost:3000'

export const maxDuration = 300  // Puppeteer 5분 여유

export async function POST(request: NextRequest) {
  const session = request.cookies.get('auth_session')?.value
  if (!session) return NextResponse.json({ success: false, error: '미인증' }, { status: 401 })

  const body = await request.json().catch(() => ({})) as any
  const { shopType, shopId, shopPw, startYmd, endYmd } = body

  if (shopType !== '오아시스') {
    return NextResponse.json({ success: false, message: `${shopType} 영수증 수집은 아직 준비중입니다.` }, { status: 501 })
  }
  if (!shopId || !shopPw) {
    return NextResponse.json({ success: false, message: '아이디/비밀번호 누락' }, { status: 400 })
  }

  try {
    const r = await fetch(`${PLATFORM_URL}/api/shop/oasis/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: `auth_session=${encodeURIComponent(session)}` },
      body: JSON.stringify({ id: shopId, pw: shopPw, startYmd, endYmd }),
    })
    const j = await r.json()
    return NextResponse.json(j, { status: r.status })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
