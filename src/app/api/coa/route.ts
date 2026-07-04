import { NextRequest, NextResponse } from 'next/server'

// 회계계정관리 — 장부(계정)·연도별 계정과목표(chart of accounts) 저장/조회.
// page_data field = `coa::{book}::{year}`  (헤더=공통 템플릿은 book='template')
export const maxDuration = 30
const PLATFORM_URL = process.env.NEXT_PUBLIC_PLATFORM_URL || 'http://localhost:3000'

function coaField(book: string, year: string): string {
  return `coa::${book || 'template'}::${year}`
}

/** GET /api/coa?book=&year= — 계정과목표 조회 */
export async function GET(req: NextRequest) {
  try {
    const cookie = req.headers.get('cookie') || ''
    const book = req.nextUrl.searchParams.get('book') || 'template'
    const year = req.nextUrl.searchParams.get('year') || ''
    const res = await fetch(`${PLATFORM_URL}/api/settings/page-data?field=${encodeURIComponent(coaField(book, year))}`, {
      headers: { cookie },
      signal:  AbortSignal.timeout(20_000),
    })
    const data = await res.json().catch(() => ({}))
    return NextResponse.json(data, { status: res.status })
  } catch (e) {
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : '실패', list: [] }, { status: 502 })
  }
}

/** POST /api/coa { book, year, list } — 계정과목표 replace 저장 */
export async function POST(req: NextRequest) {
  try {
    const cookie = req.headers.get('cookie') || ''
    const body = await req.json().catch(() => ({})) as { book?: string; year?: string; list?: unknown[] }
    const field = coaField(body.book || 'template', body.year || '')
    const list = Array.isArray(body.list) ? body.list : []

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
