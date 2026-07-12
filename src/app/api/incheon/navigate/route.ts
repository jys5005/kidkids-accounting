import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 300

const PLATFORM_URL = process.env.NEXT_PUBLIC_PLATFORM_URL || 'http://localhost:3000'

/**
 * Proxy to childcare-platform incheon navigate API (인천시 "바로가기" 버튼용).
 * 인천시는 공동인증서(UniSign) 로그인이라 window.open 불가 → 통합e 가 로컬 에이전트(incheon-navigate 잡)로
 * 인천시에 로그인된 상태로 상단 탭(예산관리/월회계보고/결산관리 등)까지 이동시킨다.
 * Body: { menuName, targetMonth?, facilityKey? }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const res = await fetch(`${PLATFORM_URL}/api/incheon/navigate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie: req.headers.get('cookie') || '' },
      body: JSON.stringify(body),
      // 통합e 라우트가 에이전트 잡을 최대 280초 폴링 — 그보다 짧으면 먼저 끊김
      signal: AbortSignal.timeout(300000),
    })
    const data = await res.json().catch(() => ({}))
    return NextResponse.json(data, { status: res.status })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes('abort') || msg.includes('timeout')) {
      return NextResponse.json({ success: false, error: '이동 시간 초과 (5분)' }, { status: 504 })
    }
    return NextResponse.json({ success: false, error: '통합e 서버에 연결할 수 없습니다.' }, { status: 502 })
  }
}
