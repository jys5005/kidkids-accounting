import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 300

const PLATFORM_URL = process.env.NEXT_PUBLIC_PLATFORM_URL || 'http://localhost:3000'

/** Proxy to childcare-platform incheon login API ("로그인세션등록" 버튼용) */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const res = await fetch(`${PLATFORM_URL}/api/incheon/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie: req.headers.get('cookie') || '' },
      body: JSON.stringify(body),
      // 통합e 라우트가 로컬 에이전트 잡을 최대 280초 폴링 — 그보다 짧으면 먼저 끊김
      signal: AbortSignal.timeout(300000),
    })
    const data = await res.json().catch(() => ({}))
    return NextResponse.json(data, { status: res.status })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes('abort') || msg.includes('timeout')) {
      return NextResponse.json({ success: false, error: '로그인 시간 초과 (5분)' }, { status: 504 })
    }
    return NextResponse.json({ success: false, error: '통합e 서버에 연결할 수 없습니다.' }, { status: 502 })
  }
}
