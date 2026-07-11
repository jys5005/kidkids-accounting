import { NextRequest, NextResponse } from 'next/server'
import { bookField } from '@/lib/ilovechild-books'

export const maxDuration = 30
const PLATFORM_URL = process.env.NEXT_PUBLIC_PLATFORM_URL || 'http://localhost:3000'

/**
 * 삭제된 전표(휴지통) — /api/voucher/list 와 동일 패턴, field='voucher-deleted'(장부별).
 * 전표입력에서 [삭제] 시 이 목록에 보관(deletedAt 포함) → 삭제전표 화면에서 조회/복구.
 */

/** GET /api/voucher/deleted-list?book= */
export async function GET(req: NextRequest) {
  try {
    const cookie = req.headers.get('cookie') || ''
    const book = req.nextUrl.searchParams.get('book') || ''
    const field = bookField('voucher-deleted', book)
    const res = await fetch(`${PLATFORM_URL}/api/settings/page-data?field=${encodeURIComponent(field)}`, {
      method: 'GET',
      headers: { cookie },
      signal: AbortSignal.timeout(20_000),
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

/** POST /api/voucher/deleted-list — { list, book } 전체를 replace 저장 */
export async function POST(req: NextRequest) {
  try {
    const cookie = req.headers.get('cookie') || ''
    const body = await req.json().catch(() => ({})) as { list?: unknown[]; book?: string }
    const list = Array.isArray(body.list) ? body.list : []
    const field = bookField('voucher-deleted', body.book || '')

    await fetch(`${PLATFORM_URL}/api/settings/page-data?field=${encodeURIComponent(field)}`, {
      method: 'DELETE',
      headers: { cookie },
      signal: AbortSignal.timeout(15_000),
    }).catch(() => {})

    const res = await fetch(`${PLATFORM_URL}/api/settings/page-data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie },
      body: JSON.stringify({ field, list }),
      signal: AbortSignal.timeout(20_000),
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
