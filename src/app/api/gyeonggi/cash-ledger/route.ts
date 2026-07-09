import { NextRequest, NextResponse } from 'next/server'

const PLATFORM_URL = process.env.NEXT_PUBLIC_PLATFORM_URL || 'http://localhost:3000'

/** Proxy → 통합e 경기도 원클릭 전표 수집 (에이전트 자동로그인+수집→DB저장) */
export async function POST(req: NextRequest) {
  try {
    const body = await req.text()
    const res = await fetch(`${PLATFORM_URL}/api/gyeonggi/cash-ledger`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: req.headers.get('cookie') || '' },
      body,
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ error: '통합e 서버에 연결할 수 없습니다.' }, { status: 502 })
  }
}
