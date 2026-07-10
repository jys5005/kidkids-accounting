import { NextRequest, NextResponse } from 'next/server'

const PLATFORM_URL = process.env.NEXT_PUBLIC_PLATFORM_URL || 'http://localhost:3000'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const qs = searchParams.toString()
    // 쿠키 전달 필수 — 통합e 측이 로그인한 시설(ownerKey) 기준으로 격리된 데이터만 반환한다.
    const res = await fetch(`${PLATFORM_URL}/api/settings/program-auth${qs ? `?${qs}` : ''}`, {
      headers: { cookie: req.headers.get('cookie') || '' },
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ success: false, message: '통합e 서버에 연결할 수 없습니다.' }, { status: 502 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const res = await fetch(`${PLATFORM_URL}/api/settings/program-auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie: req.headers.get('cookie') || '' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ success: false, message: '통합e 서버에 연결할 수 없습니다.' }, { status: 502 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const qs = searchParams.toString()
    const res = await fetch(`${PLATFORM_URL}/api/settings/program-auth${qs ? `?${qs}` : ''}`, {
      method: 'DELETE',
      headers: { cookie: req.headers.get('cookie') || '' },
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ success: false, message: '통합e 서버에 연결할 수 없습니다.' }, { status: 502 })
  }
}
