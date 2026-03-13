import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 300 // 5분

const PLATFORM_URL = 'http://localhost:4000'

/** Proxy to childcare-platform kidshome cash-ledger API */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const res = await fetch(`${PLATFORM_URL}/api/kidshome/cash-ledger`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(300000), // 5분 (스크래핑 소요)
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (e) {
    const msg = e instanceof Error && e.name === 'TimeoutError'
      ? '스크래핑 시간 초과 (5분). 기간을 줄여서 다시 시도하세요.'
      : '통합e 서버(localhost:4000)에 연결할 수 없습니다.'
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
