import { NextRequest, NextResponse } from 'next/server'

const PLATFORM_URL = process.env.NEXT_PUBLIC_PLATFORM_URL || 'http://localhost:3000'

/** 세션 쿠키로 통합e me 를 호출해 시설명(centerName) 해석 — 클라이언트 값 의존 제거 */
async function resolveCenterName(req: NextRequest): Promise<string> {
  try {
    const res = await fetch(`${PLATFORM_URL}/api/auth/me`, {
      headers: { cookie: req.headers.get('cookie') || '' }, cache: 'no-store',
    })
    if (!res.ok) return ''
    const me = await res.json()
    return String(me?.centerName || me?.profile?.centerName || '').trim()
  } catch { return '' }
}

/** Proxy → 통합e 경기도 자격증명 캐시 상태 조회 (facilityKey 없으면 세션 시설명으로 자동 해석) */
export async function GET(req: NextRequest) {
  try {
    let facilityKey = (req.nextUrl.searchParams.get('facilityKey') || '').trim()
    if (!facilityKey) facilityKey = await resolveCenterName(req)
    if (!facilityKey) return NextResponse.json({ success: false, error: '시설명을 확인할 수 없습니다.' }, { status: 400 })
    const res = await fetch(`${PLATFORM_URL}/api/gyeonggi/cert-creds?facilityKey=${encodeURIComponent(facilityKey)}`, {
      headers: { cookie: req.headers.get('cookie') || '' },
      cache: 'no-store',
    })
    const data = await res.json()
    return NextResponse.json({ ...data, facilityKey }, { status: res.status })
  } catch {
    return NextResponse.json({ success: false, error: '통합e 서버에 연결할 수 없습니다.' }, { status: 502 })
  }
}
