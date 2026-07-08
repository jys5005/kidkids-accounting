import { NextRequest, NextResponse } from 'next/server'

// 로컬 에이전트 alive 여부 프록시 — 통합e(childcare-platform)의 /api/agent/health 를 그대로 전달.
// (sunote 등 이관 작업은 로컬 에이전트가 원장 PC 에서 실행되어야 하므로, 회계앱 화면에서
//  항상 켜짐/꺼짐 상태를 바로 볼 수 있게 함)
export const dynamic = 'force-dynamic'
const PLATFORM_URL = process.env.NEXT_PUBLIC_PLATFORM_URL || 'http://localhost:3000'

export async function GET(req: NextRequest) {
  try {
    const cookie = req.headers.get('cookie') || ''
    const res = await fetch(`${PLATFORM_URL}/api/agent/health`, {
      headers: { cookie },
      signal:  AbortSignal.timeout(10_000),
      cache:   'no-store',
    })
    const data = await res.json().catch(() => ({}))
    return NextResponse.json(data, { status: res.status })
  } catch (e) {
    return NextResponse.json(
      { success: false, alive: false, error: e instanceof Error ? e.message : '실패' },
      { status: 502 }
    )
  }
}
