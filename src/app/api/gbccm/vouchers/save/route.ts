import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 30

/**
 * 경상북도(gbccm) → 통합e 전표관리(voucher-input) 직접 저장.
 * ⚠ 걸음마회계(gwin)의 /api/gwin/vouchers/save 와 달리 삭제 후 재저장(전체 교체)이 아니라
 * **추가(append)** 방식 사용 — 기존에 저장된 다른 달/다른 출처 전표를 지우지 않기 위함.
 * page_data 의 append 동작은 JSON.stringify 완전일치 dedupe 라, 같은 내용을 다시 저장해도
 * 중복 쌓이지 않음(단, 완전히 똑같은 행일 때만 — 필드 하나라도 다르면 별개 행으로 추가됨에 주의).
 *
 * body: { rows: CashLedgerRow[] } — 데이터이관 화면에 이미 매핑되어 보이는 그 행들을 그대로 받음
 * (accountCode 는 이미 gbccm.ts 에서 sunote 코드로 변환 완료된 상태 그대로 사용).
 */

const PLATFORM_URL = process.env.NEXT_PUBLIC_PLATFORM_URL || 'http://localhost:3000'

interface IncomingRow {
  date: string          // YYYYMMDD
  docNo?: string
  accountCode: string
  accountName: string
  subAccountName?: string
  summary: string
  income: number
  expense: number
  demandCoName?: string
  _note?: string
  _paymentMethod?: string
  _bankbookName?: string
}

function toIsoDate(d: string): string {
  const digits = String(d || '').replace(/[^0-9]/g, '')
  return digits.length === 8 ? `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}` : ''
}

function mapRow(r: IncomingRow, i: number) {
  const isIncome = r.income > 0
  // ⚠ 출처 추적용 — 전표관리(voucher-input)엔 원본 증빙번호를 담을 전용 칸이 없어서,
  // 적요 앞에 "[gbccm#402]" 형태로 붙여 나중에 어느 gbccm 전표에서 왔는지 역추적 가능하게 함.
  const summary = r.docNo ? `[gbccm#${r.docNo}] ${r.summary || ''}` : (r.summary || '')
  return {
    id: i + 1,
    date: toIsoDate(r.date),
    type: (isIncome ? '수입' : '지출') as '수입' | '지출',
    account: r.accountName || '',
    subAccount: r.subAccountName || '',
    summary,
    amount: isIncome ? r.income : r.expense,
    counterpart: r.demandCoName || '',
    note: r._paymentMethod || '',   // 결제방식 — voucher/input 의 "결제방식" 드롭다운이 note 필드를 읽음
    approved: false,
    inputMethod: '일괄' as const,
    accountCode: r.accountCode || '',
    payment: r._paymentMethod || '',
    bankAccount: r._bankbookName || '',
  }
}

export async function POST(req: NextRequest) {
  try {
    const cookie = req.headers.get('cookie') || ''
    const { rows } = await req.json() as { rows?: IncomingRow[] }
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ success: false, error: '저장할 전표가 없습니다.' }, { status: 400 })
    }

    const list = rows.map((r, i) => mapRow(r, i))
    const field = 'voucher-input'

    // 추가(append) — 기존 저장분 보존, 완전 동일한 행만 중복 제거됨
    const res = await fetch(`${PLATFORM_URL}/api/settings/page-data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie },
      body: JSON.stringify({ field, list }),
      signal: AbortSignal.timeout(30_000),
    })
    const j = await res.json().catch(() => ({}))
    if (!res.ok || j?.success === false) {
      return NextResponse.json({ success: false, error: j?.error || `저장 실패 (${res.status})` }, { status: 200 })
    }
    return NextResponse.json({ success: true, saved: list.length })
  } catch (e) {
    return NextResponse.json({ success: false, error: `전표 저장 오류: ${e instanceof Error ? e.message : String(e)}` }, { status: 200 })
  }
}
