import { NextRequest, NextResponse } from 'next/server'

const PLATFORM_URL = process.env.NEXT_PUBLIC_PLATFORM_URL || 'http://localhost:3000'

/** 통합e 저장된 계좌내역 조회 프록시 (auth_session 쿠키 전달) */
export async function GET(req: NextRequest) {
  const s = req.cookies.get('auth_session')?.value
  const qs = req.nextUrl.searchParams.toString()
  try {
    const res = await fetch(`${PLATFORM_URL}/api/bank/saved?${qs}`, { headers: { Cookie: s ? `auth_session=${s}` : '' } })
    return NextResponse.json(await res.json(), { status: res.status })
  } catch {
    return NextResponse.json({ rows: [] }, { status: 502 })
  }
}

export async function DELETE(req: NextRequest) {
  const s = req.cookies.get('auth_session')?.value
  const qs = req.nextUrl.searchParams.toString()
  try {
    const res = await fetch(`${PLATFORM_URL}/api/bank/saved?${qs}`, { method: 'DELETE', headers: { Cookie: s ? `auth_session=${s}` : '' } })
    return NextResponse.json(await res.json(), { status: res.status })
  } catch {
    return NextResponse.json({ success: false }, { status: 502 })
  }
}
