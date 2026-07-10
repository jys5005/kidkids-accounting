import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 300

const PLATFORM_URL = process.env.NEXT_PUBLIC_PLATFORM_URL || 'http://localhost:3000'

/** Proxy to childcare-platform jangbunara(장부나라) cash-ledger API */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const res = await fetch(`${PLATFORM_URL}/api/jangbunara/cash-ledger`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie: req.headers.get('cookie') || '' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(300000), // 5분
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json(
      { error: '통합e 서버에 연결할 수 없습니다.' },
      { status: 502 }
    )
  }
}
