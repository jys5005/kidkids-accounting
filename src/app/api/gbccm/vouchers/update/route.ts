import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 90

const PLATFORM_URL = process.env.NEXT_PUBLIC_PLATFORM_URL || 'http://localhost:3000'

/** Proxy to childcare-platform gbccm 전표수정(결제방식) API — 원본번호(PRF_NO) 기준 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const res = await fetch(`${PLATFORM_URL}/api/gbccm/vouchers/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie: req.headers.get('cookie') || '' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(80000),
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json(
      { success: false, error: '통합e 서버에 연결할 수 없습니다.' },
      { status: 502 }
    )
  }
}
