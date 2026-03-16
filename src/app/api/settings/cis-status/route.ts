import { NextResponse } from 'next/server'

const PLATFORM_URL = process.env.NEXT_PUBLIC_PLATFORM_URL || 'http://localhost:4000'

/** Proxy to childcare-platform CIS auth status */
export async function GET() {
  try {
    const res = await fetch(`${PLATFORM_URL}/api/settings/cis-auth`)
    const json = await res.json()
    return NextResponse.json(json, { status: res.status })
  } catch {
    return NextResponse.json(
      { success: false, message: '통합e 서버에 연결할 수 없습니다.' },
      { status: 502 }
    )
  }
}
