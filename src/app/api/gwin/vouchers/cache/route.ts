import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 30

// 걸음마 전표 "조회 결과(미리보기)" 캐시 — 새로고침/재방문해도 마지막 조회 결과 복원.
// 장부·연도별 스코프(field='gwin-vcache::{book}::{year}'). 다시 조회하면 덮어씀(replace).
const PLATFORM_URL = process.env.NEXT_PUBLIC_PLATFORM_URL || 'http://localhost:3000'
const fieldOf = (book: string, year: string) => `gwin-vcache::${book || 'subsidy'}::${year || ''}`

/** GET ?book=&year= — 저장된 조회 결과 복원 */
export async function GET(req: NextRequest) {
  try {
    const cookie = req.headers.get('cookie') || ''
    const book = req.nextUrl.searchParams.get('book') || ''
    const year = req.nextUrl.searchParams.get('year') || ''
    const field = fieldOf(book, year)
    const res = await fetch(`${PLATFORM_URL}/api/settings/page-data?field=${encodeURIComponent(field)}`, {
      method: 'GET', headers: { cookie }, signal: AbortSignal.timeout(20_000),
    })
    const data = await res.json().catch(() => ({})) as { list?: unknown[]; savedAt?: string }
    // list[0] = { rows, keys, from, to, receiptPhotos, receiptBills } (단일 스냅샷)
    const snap = Array.isArray(data.list) && data.list.length ? data.list[0] : null
    return NextResponse.json({ success: true, snapshot: snap, savedAt: data.savedAt || '' })
  } catch (e) {
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : '실패', snapshot: null })
  }
}

/** POST { book, year, rows, keys, from, to, receiptPhotos, receiptBills } — 조회 결과 저장(덮어쓰기) */
export async function POST(req: NextRequest) {
  try {
    const cookie = req.headers.get('cookie') || ''
    const body = await req.json().catch(() => ({})) as Record<string, unknown>
    const book = String(body.book || '')
    const year = String(body.year || '')
    const field = fieldOf(book, year)
    const snap = {
      rows: Array.isArray(body.rows) ? body.rows : [],
      keys: Array.isArray(body.keys) ? body.keys : [],
      from: body.from ?? '', to: body.to ?? '',
      receiptPhotos: body.receiptPhotos ?? 0, receiptBills: body.receiptBills ?? 0,
      count: Array.isArray(body.rows) ? body.rows.length : 0,
    }
    // 덮어쓰기: 기존 삭제 후 단일 스냅샷 저장
    await fetch(`${PLATFORM_URL}/api/settings/page-data?field=${encodeURIComponent(field)}`, {
      method: 'DELETE', headers: { cookie }, signal: AbortSignal.timeout(15_000),
    }).catch(() => {})
    const res = await fetch(`${PLATFORM_URL}/api/settings/page-data`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', cookie },
      body: JSON.stringify({ field, list: [snap] }), signal: AbortSignal.timeout(25_000),
    })
    const j = await res.json().catch(() => ({}))
    if (!res.ok || j?.success === false) return NextResponse.json({ success: false, error: j?.error || `저장 실패 (${res.status})` }, { status: 200 })
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : '실패' }, { status: 200 })
  }
}
