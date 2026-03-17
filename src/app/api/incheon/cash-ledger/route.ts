import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60

const PLATFORM_URL = process.env.NEXT_PUBLIC_PLATFORM_URL || 'http://localhost:4000'

/** Proxy to childcare-platform incheon cash-ledger API */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const res = await fetch(`${PLATFORM_URL}/api/incheon/cash-ledger`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10 * 60 * 1000),
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes('abort') || msg.includes('timeout')) {
      return NextResponse.json(
        { error: '스크래핑 시간 초과 (10분)' },
        { status: 504 }
      )
    }
    return NextResponse.json(
      { error: '통합e 서버에 연결할 수 없습니다.' },
      { status: 502 }
    )
  }
}
