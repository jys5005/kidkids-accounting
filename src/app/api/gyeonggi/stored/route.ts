import { NextRequest, NextResponse } from 'next/server'

const PLATFORM_URL = process.env.NEXT_PUBLIC_PLATFORM_URL || 'http://localhost:3000'

/**
 * Proxy → 통합e 저장된 경기도 전표(raw chit) 조회.
 * userId 파라미터(=collectKey=시설명) 로 page_data['gyeonggi-vouchers-raw'] 를 읽어온다.
 * 반환: { success, list } (raw chit 배열 — 페이지에서 parseAccggChits 로 표 변환)
 */
export async function GET(req: NextRequest) {
  try {
    const key = req.nextUrl.searchParams.get('userId') || req.nextUrl.searchParams.get('collectKey') || ''
    if (!key) return NextResponse.json({ success: false, error: 'userId 필요', list: [] }, { status: 400 })
    const res = await fetch(`${PLATFORM_URL}/api/gyeonggi/browser-collect?collectKey=${encodeURIComponent(key)}`, {
      headers: { cookie: req.headers.get('cookie') || '' },
      cache: 'no-store',
    })
    const data = await res.json()
    return NextResponse.json({ success: !!data.success, list: data.list || [], count: data.count, savedAt: data.savedAt }, { status: res.status })
  } catch {
    return NextResponse.json({ success: false, error: '통합e 서버에 연결할 수 없습니다.', list: [] }, { status: 502 })
  }
}
