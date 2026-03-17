import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PLATFORM_URL = process.env.NEXT_PUBLIC_PLATFORM_URL || 'http://localhost:4000'

export async function GET(request: NextRequest) {
  const session = request.cookies.get('auth_session')?.value
  if (!session) {
    return NextResponse.json({ error: '미인증' }, { status: 401 })
  }
  try {
    const data = JSON.parse(session)

    // 통합e에서 displayName, centerName 가져오기
    if (!data.displayName) {
      try {
        const res = await fetch(`${PLATFORM_URL}/api/auth/me`, {
          headers: { Cookie: `auth_session=${session}` },
        })
        if (res.ok) {
          const me = await res.json()
          if (me.displayName) data.displayName = me.displayName
          if (me.centerName) data.centerName = me.centerName
        }
      } catch {}
    }

    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: '세션 오류' }, { status: 401 })
  }
}
