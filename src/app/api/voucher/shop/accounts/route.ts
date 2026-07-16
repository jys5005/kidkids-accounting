/**
 * 현재 로그인 사용자의 사업장에 등록된 쇼핑몰 계정 조회.
 * - 통합e /api/auth/me 로 bizNo 받아옴
 * - childcare /api/sunote/shop-accounts/save?bizNo= 로 필터링
 * - shopType 옵션: 미지정 → 전체, 지정 → 해당 쇼핑몰만
 */
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PLATFORM_URL = process.env.NEXT_PUBLIC_PLATFORM_URL || 'http://localhost:3000'

async function getBizNo(session: string): Promise<string | null> {
  try {
    const res = await fetch(`${PLATFORM_URL}/api/auth/me`, {
      headers: { Cookie: `auth_session=${encodeURIComponent(session)}` },
      cache: 'no-store',
    })
    if (!res.ok) return null
    const me = await res.json()
    const profile = (me.profile ?? {}) as Record<string, unknown>
    return (profile.bizNo as string) || (me.bizNo as string) || null
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  const session = request.cookies.get('auth_session')?.value
  if (!session) return NextResponse.json({ success: false, error: '미인증' }, { status: 401 })

  const bizNo = await getBizNo(session)
  if (!bizNo) return NextResponse.json({ success: true, accounts: [], counts: {}, bizNo: null })

  const sp = request.nextUrl.searchParams
  const shopType = sp.get('shopType') || ''
  const wantCounts = sp.get('counts') === '1'

  try {
    if (wantCounts) {
      const url = `${PLATFORM_URL}/api/sunote/shop-accounts/save?counts=1&bizNo=${encodeURIComponent(bizNo)}`
      const r = await fetch(url, { headers: { Cookie: `auth_session=${encodeURIComponent(session)}` }, cache: 'no-store' })
      const j = await r.json()
      return NextResponse.json({ ...j, bizNo })
    }
    const u = new URL(`${PLATFORM_URL}/api/sunote/shop-accounts/save`)
    u.searchParams.set('bizNo', bizNo)
    if (shopType) u.searchParams.set('shopType', shopType)
    const r = await fetch(u.toString(), { headers: { Cookie: `auth_session=${encodeURIComponent(session)}` }, cache: 'no-store' })
    const j = await r.json()
    return NextResponse.json({ ...j, bizNo })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
