import { NextResponse } from 'next/server'

const PLATFORM_URL = process.env.NEXT_PUBLIC_PLATFORM_URL || 'http://localhost:3000'

/** GET: 통합e에서 CIS 설정(appCd, userId, userPw) 가져오기 */
export async function GET() {
  try {
    const res = await fetch(`${PLATFORM_URL}/api/settings/exweb-config`)
    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ success: false, error: '통합e 서버에 연결할 수 없습니다.' }, { status: 502 })
  }
}
