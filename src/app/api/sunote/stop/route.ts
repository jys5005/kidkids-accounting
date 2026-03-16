import { NextResponse } from 'next/server'

const PLATFORM_URL = process.env.NEXT_PUBLIC_PLATFORM_URL || 'http://localhost:4000'

/** Proxy to childcare-platform sunote stop API */
export async function POST() {
  try {
    const res = await fetch(`${PLATFORM_URL}/api/sunote/stop`, {
      method: 'POST',
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json(
      { error: '통합e 서버에 연결할 수 없습니다.' },
      { status: 502 }
    )
  }
}
