import { NextRequest, NextResponse } from 'next/server'
import { bookField } from '@/lib/ilovechild-books'

export const maxDuration = 30
const PLATFORM_URL = process.env.NEXT_PUBLIC_PLATFORM_URL || 'http://localhost:3000'

/** GET /api/voucher/list?book= — 통합e page_data field='voucher-input'(장부별) 조회 */
export async function GET(req: NextRequest) {
  try {
    const cookie = req.headers.get('cookie') || ''
    const book = req.nextUrl.searchParams.get('book') || ''
    const field = bookField('voucher-input', book)
    const res = await fetch(`${PLATFORM_URL}/api/settings/page-data?field=${encodeURIComponent(field)}`, {
      method:  'GET',
      headers: { cookie },
      signal:  AbortSignal.timeout(20_000),
    })
    const data = await res.json().catch(() => ({}))
    return NextResponse.json(data, { status: res.status })
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : '실패', list: [] },
      { status: 502 },
    )
  }
}

/** POST /api/voucher/save — 전표 list 전체를 page_data 에 replace 저장 (장부별) */
export async function POST(req: NextRequest) {
  try {
    const cookie = req.headers.get('cookie') || ''
    const body = await req.json().catch(() => ({})) as { list?: unknown[]; book?: string }
    const list = Array.isArray(body.list) ? body.list : []
    const field = bookField('voucher-input', body.book || '')

    // 1) 기존 데이터 삭제 (replace 동작)
    await fetch(`${PLATFORM_URL}/api/settings/page-data?field=${encodeURIComponent(field)}`, {
      method:  'DELETE',
      headers: { cookie },
      signal:  AbortSignal.timeout(15_000),
    }).catch(() => {})

    // 2) 새 list 저장
    const res = await fetch(`${PLATFORM_URL}/api/settings/page-data`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', cookie },
      body:    JSON.stringify({ field, list }),
      signal:  AbortSignal.timeout(20_000),
    })
    const data = await res.json().catch(() => ({}))
    return NextResponse.json(data, { status: res.status })
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : '실패' },
      { status: 502 },
    )
  }
}
