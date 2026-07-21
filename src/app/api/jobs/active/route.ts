import { NextRequest, NextResponse } from 'next/server'

const PLATFORM_URL = process.env.NEXT_PUBLIC_PLATFORM_URL || 'http://localhost:3000'

/** Proxy to childcare-platform — 진행 중인 에이전트 작업의 progress (조회 중 폴링용) */
export async function GET(req: NextRequest) {
  try {
    const type = req.nextUrl.searchParams.get('type') || ''
    const url = `${PLATFORM_URL}/api/jobs/active${type ? `?type=${encodeURIComponent(type)}` : ''}`
    const res = await fetch(url, { headers: { cookie: req.headers.get('cookie') || '' } })
    const data = await res.json().catch(() => ({}))
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ success: false, error: '통합e 서버에 연결할 수 없습니다.' }, { status: 502 })
  }
}
