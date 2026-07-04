import { NextRequest, NextResponse } from 'next/server'

// 예산작성 입력값(목별 산출기초/금액) 장부·연도별 저장/조회.
// page_data field = `budget::{book}::{year}`  (data = [{ basisByMok: {목code: BasisItem[]} }])
export const maxDuration = 30
const PLATFORM_URL = process.env.NEXT_PUBLIC_PLATFORM_URL || 'http://localhost:3000'

function budgetField(book: string, year: string): string {
  return `budget::${book || 'default'}::${year}`
}

/** GET /api/budget?book=&year= — 예산 입력값 조회 */
export async function GET(req: NextRequest) {
  try {
    const cookie = req.headers.get('cookie') || ''
    const book = req.nextUrl.searchParams.get('book') || ''
    const year = req.nextUrl.searchParams.get('year') || ''
    const res = await fetch(`${PLATFORM_URL}/api/settings/page-data?field=${encodeURIComponent(budgetField(book, year))}`, {
      headers: { cookie },
      signal:  AbortSignal.timeout(20_000),
    })
    const data = await res.json().catch(() => ({}))
    return NextResponse.json(data, { status: res.status })
  } catch (e) {
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : '실패', list: [] }, { status: 502 })
  }
}

/** POST /api/budget { book, year, basisByMok } — 예산 입력값 replace 저장 */
export async function POST(req: NextRequest) {
  try {
    const cookie = req.headers.get('cookie') || ''
    const body = await req.json().catch(() => ({})) as { book?: string; year?: string; basisByMok?: unknown }
    const field = budgetField(body.book || '', body.year || '')
    const list = [{ basisByMok: body.basisByMok ?? {} }]

    await fetch(`${PLATFORM_URL}/api/settings/page-data?field=${encodeURIComponent(field)}`, {
      method: 'DELETE', headers: { cookie }, signal: AbortSignal.timeout(15_000),
    }).catch(() => {})

    const res = await fetch(`${PLATFORM_URL}/api/settings/page-data`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', cookie },
      body:    JSON.stringify({ field, list }),
      signal:  AbortSignal.timeout(20_000),
    })
    const data = await res.json().catch(() => ({}))
    return NextResponse.json(data, { status: res.status })
  } catch (e) {
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : '실패' }, { status: 502 })
  }
}
