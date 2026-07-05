import { NextRequest, NextResponse } from 'next/server'
import { bookField } from '@/lib/ilovechild-books'

export const runtime = 'nodejs'
export const maxDuration = 30

// 가져온 걸음마 전표(원시 행) → 전표관리(voucher-input) 저장.
// ⚠ 자기 서버(origin) self-fetch 금지 — VPS 에선 https 자기도메인 재요청이 DNS/TLS 로 'fetch failed'.
//    통합e page-data 로 직접 저장(voucher/list POST 와 동일 패턴: DELETE → POST = replace).

const PLATFORM_URL = process.env.NEXT_PUBLIC_PLATFORM_URL || 'http://localhost:3000'
const num = (v: unknown) => Number(String(v ?? '').replace(/[,\s]/g, '')) || 0
const pick = (r: Record<string, unknown>, keys: string[]) => {
  for (const k of keys) { const v = r[k]; if (v !== undefined && v !== null && String(v) !== '') return v }
  return ''
}

// 걸음마 getBillList 실측 필드 → VoucherRow 매핑. ⚠ 적요/거래처/결제방식은 실제 컬럼 그대로(강제 분리 금지).
function mapRow(r: Record<string, unknown>, i: number) {
  const d8 = String(pick(r, ['BILL_DATE', 'BILL_ORDER_DATE'])).replace(/[^0-9]/g, '').slice(0, 8)
  const date = d8.length === 8 ? `${d8.slice(0, 4)}-${d8.slice(4, 6)}-${d8.slice(6, 8)}` : ''
  const amt = num(pick(r, ['BILL_MONEY']))
  const io = String(pick(r, ['ESTI_INOUT'])) // I=수입 / O(그 외)=지출
  // ⚠ 반납은 별도 타입이 아니라 '수입/지출 행의 음수 금액'(앱 관례) → 타입은 수입/지출 유지, 금액 부호 보존(음수=반납)
  const type: '수입' | '지출' = io === 'I' ? '수입' : '지출'
  return {
    id: i + 1,
    date,
    type,
    account: String(pick(r, ['ESTI_NAME_3', 'ESTI_NAME', 'ESTI_DISPLAY'])),      // 목
    subAccount: String(pick(r, ['ESTI_NAME_4', 'ESTI_NAME_DETAIL'])),            // 세목
    summary: String(pick(r, ['BILL_MEMO'])),                                     // 적요(원본 통째)
    amount: amt,                                                                 // 부호 유지(음수=반납)
    counterpart: String(pick(r, ['CREDITOR'])),                                  // 거래처(실제 컬럼)
    note: String(pick(r, ['BILL_BIGO'])),                                        // 비고(카드/계좌)
    approved: false,
    inputMethod: '일괄' as const,
    accountCode: String(pick(r, ['ESTI_IDX'])),
    receiptImage: String(pick(r, ['_receiptImage'])) || undefined,           // 영수증 사진(첫 장, /api/receipt-file/…)
    receiptImages: String(pick(r, ['_receiptImages'])) || undefined,         // 영수증 여러 장(콤마 구분)
    payment: String(pick(r, ['SETLE_MTHD_NAME'])),                               // 결제방식(실제 컬럼)
    bankAccount: String(pick(r, ['ACCOUNT_NICKNAME'])),                          // 통장구분
    isSupport: String(pick(r, ['BILL_SUPPORT_AT'])) === 'Y',
    isNuri: String(pick(r, ['BILL_NURI_AT'])) === 'Y',
  }
}

async function saveBook(cookie: string, book: string, rows: Record<string, unknown>[]): Promise<number> {
  const list = rows.map(mapRow)
  const field = bookField('voucher-input', book)
  // 덮어쓰기: 기존 삭제 후 저장
  await fetch(`${PLATFORM_URL}/api/settings/page-data?field=${encodeURIComponent(field)}`, {
    method: 'DELETE', headers: { cookie }, signal: AbortSignal.timeout(15_000),
  }).catch(() => {})
  const res = await fetch(`${PLATFORM_URL}/api/settings/page-data`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', cookie },
    body: JSON.stringify({ field, list }), signal: AbortSignal.timeout(30_000),
  })
  const j = await res.json().catch(() => ({}))
  if (!res.ok || j?.success === false) throw new Error(j?.error || `저장 실패 (${res.status})`)
  return list.length
}

export async function POST(req: NextRequest) {
  try {
    const cookie = req.headers.get('cookie') || ''
    const { book, rows } = await req.json() as { book?: string; year?: string; rows?: Record<string, unknown>[] }
    if (!Array.isArray(rows) || rows.length === 0) return NextResponse.json({ success: false, error: '저장할 전표가 없습니다.' }, { status: 400 })

    // 행에 _book 태그 있으면 장부별 그룹핑 저장, 없으면 body.book 로 단일 저장
    const groups = new Map<string, Record<string, unknown>[]>()
    for (const r of rows) {
      const bk = String(r._book || book || 'subsidy')
      ;(groups.get(bk) || groups.set(bk, []).get(bk)!).push(r)
    }

    const perBook: { book: string; saved: number }[] = []
    let total = 0
    for (const [bk, grpRows] of groups) {
      const n = await saveBook(cookie, bk, grpRows)
      perBook.push({ book: bk, saved: n }); total += n
    }
    return NextResponse.json({ success: true, saved: total, perBook })
  } catch (e) {
    return NextResponse.json({ success: false, error: `전표 저장 오류: ${e instanceof Error ? e.message : String(e)}` }, { status: 200 })
  }
}
