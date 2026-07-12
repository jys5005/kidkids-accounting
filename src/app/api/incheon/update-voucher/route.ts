import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 300

const PLATFORM_URL = process.env.NEXT_PUBLIC_PLATFORM_URL || 'http://localhost:3000'

/** Proxy to childcare-platform /api/incheon/update-voucher */
export async function POST(req: NextRequest) {
  try {
    const cookie = req.headers.get('cookie') || ''
    const body = await req.text()
    const res = await fetch(`${PLATFORM_URL}/api/incheon/update-voucher`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', cookie },
      body,
      signal:  AbortSignal.timeout(290_000),
    })
    const data = await res.json().catch(() => ({}))
    return NextResponse.json(data, { status: res.status })
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : '통합e 서버 연결 실패' },
      { status: 502 },
    )
  }
}
