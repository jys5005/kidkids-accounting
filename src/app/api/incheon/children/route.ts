import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 600

const PLATFORM_URL = process.env.NEXT_PUBLIC_PLATFORM_URL || 'http://localhost:3000'

/**
 * 통합e /api/incheon/children 프록시 — 인천시 아동/반.
 *   GET  ?year=2026 → 통합e 저장분 조회 (인천시 호출 없음, 빠름)
 *   POST { year }   → 인천시에서 가져오기 (로컬 에이전트 경유, 수십 초~수 분)
 *
 * ⚠ 쿠키는 req.headers.get('cookie') 원문을 그대로 넘긴다 — request.cookies.get(...).value 로
 *   꺼내면 값이 decode 돼서, 관리자 대행 로그인 세션(쿠키에 한글 proxyCenterName 포함)일 때
 *   HTTP 헤더(Latin1)에 못 넣고 fetch 가 통째로 던진다(2026-07-16 회계앱 사고와 동일 패턴).
 */
export async function GET(req: NextRequest) {
  try {
    const qs = req.nextUrl.searchParams.toString()
    const res = await fetch(`${PLATFORM_URL}/api/incheon/children?${qs}`, {
      headers: { cookie: req.headers.get('cookie') || '' },
      signal: AbortSignal.timeout(30000),
    })
    const data = await res.json().catch(() => ({}))
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ error: '통합e 서버에 연결할 수 없습니다.' }, { status: 502 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const res = await fetch(`${PLATFORM_URL}/api/incheon/children`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie: req.headers.get('cookie') || '' },
      body: JSON.stringify(body),
      // 통합e 라우트가 에이전트 잡을 최대 560초 폴링 — 그보다 짧으면 여기서 먼저 끊긴다
      signal: AbortSignal.timeout(590000),
    })
    const data = await res.json().catch(() => ({}))
    return NextResponse.json(data, { status: res.status })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes('abort') || msg.includes('timeout')) {
      return NextResponse.json({ error: '인천시 조회 시간 초과 (10분)' }, { status: 504 })
    }
    return NextResponse.json({ error: '통합e 서버에 연결할 수 없습니다.' }, { status: 502 })
  }
}
