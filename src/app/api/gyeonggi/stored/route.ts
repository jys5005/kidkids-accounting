import { NextRequest, NextResponse } from 'next/server'

const PLATFORM_URL = process.env.NEXT_PUBLIC_PLATFORM_URL || 'http://localhost:3000'

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

/**
 * Proxy → 통합e 저장된 경기도 전표(raw chit) 조회.
 * userId(=collectKey=시설명) 없으면 세션 시설명으로 자동 해석.
 */
export async function GET(req: NextRequest) {
  try {
    let key = (req.nextUrl.searchParams.get('userId') || req.nextUrl.searchParams.get('collectKey') || '').trim()
    if (!key) key = await resolveCenterName(req)
    if (!key) return NextResponse.json({ success: false, error: '시설명을 확인할 수 없습니다.', list: [] }, { status: 400 })
    const res = await fetch(`${PLATFORM_URL}/api/gyeonggi/browser-collect?collectKey=${encodeURIComponent(key)}`, {
      headers: { cookie: req.headers.get('cookie') || '' },
      cache: 'no-store',
    })
    const data = await res.json()
    return NextResponse.json({ success: !!data.success, list: data.list || [], count: data.count, savedAt: data.savedAt, facilityKey: key }, { status: res.status })
  } catch {
    return NextResponse.json({ success: false, error: '통합e 서버에 연결할 수 없습니다.', list: [] }, { status: 502 })
  }
}
