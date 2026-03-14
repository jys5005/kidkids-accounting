import { NextRequest, NextResponse } from 'next/server'

const PLATFORM_URL = 'http://localhost:4000'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const qs = searchParams.toString()
    const res = await fetch(`${PLATFORM_URL}/api/settings/program-auth${qs ? `?${qs}` : ''}`)
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
      headers: { 'Content-Type': 'application/json' },
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
    const res = await fetch(`${PLATFORM_URL}/api/settings/program-auth${qs ? `?${qs}` : ''}`, { method: 'DELETE' })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ success: false, message: '통합e 서버에 연결할 수 없습니다.' }, { status: 502 })
  }
}
