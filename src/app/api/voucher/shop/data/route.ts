/**
 * 사용자별 쇼핑몰 스크랩 데이터 조회.
 * 통합e page_data 테이블에서 field='shop-{shopType}' 로 저장된 row 들 조회.
 *
 * GET /api/voucher/shop/data?shopType=오아시스
 *   → { success, list: [{ shopId, queryCount, lastQueryTime, accountStatus, errorMessage, buyerName, dateRange, orders[] }] }
 *
 * 통합e 가 user_id 단위로 저장하므로 auth_session 쿠키만 패스스루하면 본인 데이터만 옴.
 */
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PLATFORM_URL = process.env.NEXT_PUBLIC_PLATFORM_URL || 'http://localhost:3000'

const SHOP_TYPE_TO_FIELD: Record<string, string> = {
  '오아시스': 'shop-oasis',
  '쿠팡':     'shop-coupang',
  '지마켓':   'shop-gmarket',
  '옥션':     'shop-auction',
  '11번가':   'shop-11st',
  '네이버':   'shop-naver',
}

export async function GET(request: NextRequest) {
  const session = request.cookies.get('auth_session')?.value
  if (!session) return NextResponse.json({ success: false, error: '미인증' }, { status: 401 })

  const sp = request.nextUrl.searchParams
  const shopType = sp.get('shopType') || ''
  const field = SHOP_TYPE_TO_FIELD[shopType] || ''
  if (!field) return NextResponse.json({ success: true, list: [] })

  try {
    const url = `${PLATFORM_URL}/api/settings/page-data?field=${encodeURIComponent(field)}`
    const r = await fetch(url, { headers: { Cookie: `auth_session=${session}` }, cache: 'no-store' })
    const j = await r.json()
    return NextResponse.json(j)
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
