import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 120

const PLATFORM_URL = process.env.NEXT_PUBLIC_PLATFORM_URL || 'http://localhost:3000'

/** 통합e 은행 거래내역 조회 API 프록시 (auth_session 쿠키 전달) */
export async function POST(req: NextRequest) {
  const s = req.cookies.get('auth_session')?.value
  const body = await req.text()
  try {
    const res = await fetch(`${PLATFORM_URL}/api/bank/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: s ? `auth_session=${s}` : '' },
      body,
      signal: AbortSignal.timeout(120000),
    })
    return NextResponse.json(await res.json(), { status: res.status })
  } catch {
    return NextResponse.json({ success: false, errMsg: '통합e 서버에 연결할 수 없습니다.', rows: [] }, { status: 502 })
  }
}
