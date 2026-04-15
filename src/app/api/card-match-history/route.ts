import { NextRequest, NextResponse } from 'next/server'

const PLATFORM_URL = process.env.PLATFORM_URL || process.env.NEXT_PUBLIC_PLATFORM_URL || 'http://localhost:3000'

/**
 * 카드매칭 이력 API — childcare-platform 의 /api/incheon/card-match-history 로 프록시.
 * - 브라우저에서 직접 platform 호출 시 CORS 차단되므로 서버사이드 프록시 사용.
 */
export async function GET(req: NextRequest) {
  const facilityKey = req.nextUrl.searchParams.get('facilityKey') || ''
  try {
    const url = `${PLATFORM_URL}/api/incheon/card-match-history?facilityKey=${encodeURIComponent(facilityKey)}`
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
    const data = await res.json().catch(() => ({ success: false, error: '응답 파싱 실패', list: [] }))
    return NextResponse.json(data, { status: res.status })
  } catch (e) {
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : '조회 실패', list: [] }, { status: 500 })
  }
}
