import { NextRequest, NextResponse } from 'next/server'

const PLATFORM_URL = process.env.NEXT_PUBLIC_PLATFORM_URL || 'http://localhost:3000'

/** 통합e 은행 계좌 저장 API 프록시 (auth_session 쿠키 전달) */
function cookie(req: NextRequest): string {
  const s = req.cookies.get('auth_session')?.value
  return s ? `auth_session=${s}` : ''
}

export async function GET(req: NextRequest) {
  const qs = req.nextUrl.searchParams.toString()
  const res = await fetch(`${PLATFORM_URL}/api/bank/accounts?${qs}`, { headers: { Cookie: cookie(req) } })
  return NextResponse.json(await res.json(), { status: res.status })
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const res = await fetch(`${PLATFORM_URL}/api/bank/accounts`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookie(req) }, body,
  })
  return NextResponse.json(await res.json(), { status: res.status })
}

export async function DELETE(req: NextRequest) {
  const qs = req.nextUrl.searchParams.toString()
  const res = await fetch(`${PLATFORM_URL}/api/bank/accounts?${qs}`, { method: 'DELETE', headers: { Cookie: cookie(req) } })
  return NextResponse.json(await res.json(), { status: res.status })
}
