import { NextRequest, NextResponse } from 'next/server'

const PLATFORM_URL = process.env.NEXT_PUBLIC_PLATFORM_URL || 'http://localhost:3000'

/** Proxy → 통합e 경기도 자격증명 캐시 상태 조회 (등록 여부/일시만) */
export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams.toString()
    const res = await fetch(`${PLATFORM_URL}/api/gyeonggi/cert-creds?${params}`, {
      headers: { cookie: req.headers.get('cookie') || '' },
      cache: 'no-store',
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ success: false, error: '통합e 서버에 연결할 수 없습니다.' }, { status: 502 })
  }
}
