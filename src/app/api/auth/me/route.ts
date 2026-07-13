import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PLATFORM_URL = process.env.NEXT_PUBLIC_PLATFORM_URL || 'http://localhost:3000'

// ⚠ 이 라우트는 항상 최신 프로필을 반환해야 함 — Next.js는 서버측 fetch()를 기본적으로 캐싱하므로
// (Data Cache), no-store 를 빼먹으면 "가입 직후(정보 비어있던 시점)"의 응답이 영구히 캐시되어
// 이후 DB에 어린이집명/원장명이 채워져도 화면엔 계속 옛 빈 값이 나가는 버그가 생김
// (2026-07 실사례: DB엔 centerName/principalName 다 있는데 헤더 팝업엔 빈칸+휴대폰번호만 표시).
export const dynamic = 'force-dynamic'
export const revalidate = 0

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
        cache: 'no-store',
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
      // ⚠ 진단용 — 통합e 응답이 !ok 이면 그냥 원시 세션(data, profile 없음)으로 조용히 떨어져
      // 헤더 팝업이 전부 빈값으로 보이는 버그(2026-07-13 조사 중) — 실제 status/PLATFORM_URL 로그로 남김.
      console.error('[api/auth/me] 통합e 응답 !ok — 원시 세션으로 폴백:', res.status, PLATFORM_URL)
    } catch (e) {
      console.error('[api/auth/me] 통합e fetch 예외 — 원시 세션으로 폴백:', e instanceof Error ? e.message : e, PLATFORM_URL)
    }

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
      cache: 'no-store',
    })
    const j = await res.json().catch(() => ({}))
    return NextResponse.json(j, { status: res.status })
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 })
  }
}
