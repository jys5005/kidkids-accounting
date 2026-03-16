import { NextResponse } from 'next/server'

const PLATFORM_URL = process.env.NEXT_PUBLIC_PLATFORM_URL || 'http://localhost:4000'

/** Proxy to childcare-platform cert-save config API */
export async function GET() {
  try {
    const res = await fetch(`${PLATFORM_URL}/api/settings/cert-save`)
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json(
      { success: false, message: '통합e 서버에 연결할 수 없습니다.' },
      { status: 502 }
    )
  }
}
