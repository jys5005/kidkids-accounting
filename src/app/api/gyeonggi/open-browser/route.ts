import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 120

const PLATFORM_URL = process.env.NEXT_PUBLIC_PLATFORM_URL || 'http://localhost:3000'

/**
 * Proxy to childcare-platform 경기도(accgg) 자동로그인 API.
 * 통합e 가 저장된 cert 자격으로 에이전트(gyeonggi-cert-open-browser 잡)를 돌려 로그인된 accgg 창을 열고,
 * 완료까지 서버측에서 폴링(최대 90s)한 결과({ok, member, error, agentOffline})를 그대로 반환한다.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const res = await fetch(`${PLATFORM_URL}/api/gyeonggi/open-browser`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie: req.headers.get('cookie') || '' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(110000),
    })
    const data = await res.json().catch(() => ({}))
    return NextResponse.json(data, { status: res.status })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes('abort') || msg.includes('timeout')) {
      return NextResponse.json({ ok: false, error: '자동로그인 시간 초과' }, { status: 504 })
    }
    return NextResponse.json({ ok: false, error: '통합e 서버에 연결할 수 없습니다.' }, { status: 502 })
  }
}
