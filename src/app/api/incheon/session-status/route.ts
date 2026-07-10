import { NextRequest, NextResponse } from 'next/server'

const PLATFORM_URL = process.env.NEXT_PUBLIC_PLATFORM_URL || 'http://localhost:3000'

/** Proxy to childcare-platform incheon session-status API ("로그인세션등록" 상태 배지용) */
export async function GET(req: NextRequest) {
  try {
    const res = await fetch(`${PLATFORM_URL}/api/incheon/session-status`, {
      headers: { cookie: req.headers.get('cookie') || '' },
    })
    const data = await res.json().catch(() => ({}))
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ success: false, error: '통합e 서버에 연결할 수 없습니다.' }, { status: 502 })
  }
}
