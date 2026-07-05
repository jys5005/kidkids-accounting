import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PLATFORM_URL = process.env.NEXT_PUBLIC_PLATFORM_URL || 'http://localhost:3000'

export async function GET(request: NextRequest) {
  const session = request.cookies.get('auth_session')?.value
  if (!session) {
    return NextResponse.json({ error: '미인증' }, { status: 401 })
  }
  try {
    const data = JSON.parse(session)

    // 통합e me 호출 — displayName/centerName 외에 profile(phone/email/주소 등) 까지 모두 가져옴.
    // 통합e 응답이 우선 (centerName 은 facilities 테이블 기준이라 신뢰값).
    try {
      const res = await fetch(`${PLATFORM_URL}/api/auth/me`, {
        headers: { Cookie: `auth_session=${session}` },
      })
      if (res.ok) {
        const me = await res.json()
        const profile = (me.profile ?? {}) as Record<string, unknown>
        return NextResponse.json({
          ...data,
          ...me,
          phone: (me.phone as string)
            || (profile.phone as string)
            || (profile.hpNo as string)
            || (profile.mobile as string)
            || (profile.tel as string)
            || '',
          email: (me.email as string) || (profile.email as string) || '',
          centerName: me.centerName || (profile.centerName as string) || data.centerName || '',
        })
      }
    } catch {}

    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: '세션 오류' }, { status: 401 })
  }
}

// 기본정보 수정 — 통합e PUT /api/auth/me 로 전달({profile, newPassword}). updateUser 가 profile 머지.
export async function PUT(request: NextRequest) {
  const session = request.cookies.get('auth_session')?.value
  if (!session) return NextResponse.json({ success: false, error: '미인증' }, { status: 401 })
  try {
    const body = await request.text()
    const res = await fetch(`${PLATFORM_URL}/api/auth/me`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: `auth_session=${session}` },
      body,
    })
    const j = await res.json().catch(() => ({}))
    return NextResponse.json(j, { status: res.status })
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 })
  }
}
