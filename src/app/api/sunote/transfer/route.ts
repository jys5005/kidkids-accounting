import { NextRequest, NextResponse } from 'next/server'

const PLATFORM_URL = process.env.NEXT_PUBLIC_PLATFORM_URL || 'http://localhost:4000'

export const maxDuration = 60

/** Proxy to childcare-platform sunote transfer API */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const res = await fetch(`${PLATFORM_URL}/api/sunote/transfer`, {
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
        { error: '이관 처리 시간이 초과되었습니다. (10분)' },
        { status: 504 }
      )
    }
    return NextResponse.json(
      { error: '통합e 서버에 연결할 수 없습니다.' },
      { status: 502 }
    )
  }
}
