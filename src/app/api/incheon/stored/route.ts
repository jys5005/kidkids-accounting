import { NextRequest, NextResponse } from 'next/server'

const PLATFORM_URL = process.env.NEXT_PUBLIC_PLATFORM_URL || 'http://localhost:3000'

/** Proxy to childcare-platform incheon stored data API */
export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams.toString()
    const res = await fetch(`${PLATFORM_URL}/api/incheon/stored?${params}`)
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json(
      { error: '통합e 서버에 연결할 수 없습니다.' },
      { status: 502 }
    )
  }
}
