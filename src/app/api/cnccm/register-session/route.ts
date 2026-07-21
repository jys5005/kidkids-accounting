import { NextRequest, NextResponse } from 'next/server'

const PLATFORM_URL = process.env.NEXT_PUBLIC_PLATFORM_URL || 'http://localhost:3000'

/** Proxy to childcare-platform cnccm(충남농협) session cookie register/status/delete API */
export async function GET(req: NextRequest) {
  try {
    const res = await fetch(`${PLATFORM_URL}/api/cnccm/register-session`, {
      headers: { cookie: req.headers.get('cookie') || '' },
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ error: '통합e 서버에 연결할 수 없습니다.' }, { status: 502 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const res = await fetch(`${PLATFORM_URL}/api/cnccm/register-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie: req.headers.get('cookie') || '' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ error: '통합e 서버에 연결할 수 없습니다.' }, { status: 502 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const res = await fetch(`${PLATFORM_URL}/api/cnccm/register-session`, {
      method: 'DELETE',
      headers: { cookie: req.headers.get('cookie') || '' },
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ error: '통합e 서버에 연결할 수 없습니다.' }, { status: 502 })
  }
}
