import { NextRequest, NextResponse } from 'next/server'

const PLATFORM_URL = process.env.NEXT_PUBLIC_PLATFORM_URL || 'http://localhost:4000'

/** Proxy to childcare-platform regional cert config API */
export async function GET() {
  try {
    const res = await fetch(`${PLATFORM_URL}/api/settings/regional-cert`)
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json(
      { success: false, message: '통합e 서버에 연결할 수 없습니다.' },
      { status: 502 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const res = await fetch(`${PLATFORM_URL}/api/settings/regional-cert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json(
      { success: false, message: '통합e 서버에 연결할 수 없습니다.' },
      { status: 502 }
    )
  }
}
