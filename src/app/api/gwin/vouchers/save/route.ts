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

export async function POST(req: NextRequest) {
  try {
    const cookie = req.headers.get('cookie') || ''
    const { book, rows } = await req.json() as { book?: string; year?: string; rows?: Record<string, unknown>[] }
    if (!book || !Array.isArray(rows) || rows.length === 0) return NextResponse.json({ success: false, error: '저장할 전표가 없습니다.' }, { status: 400 })

    // 걸음마 billManage/getBillList 실측 필드 → VoucherRow 매핑
    const list = rows.map((r, i) => {
      const d8 = String(pick(r, ['BILL_DATE', 'BILL_ORDER_DATE'])).replace(/[^0-9]/g, '').slice(0, 8)
      const date = d8.length === 8 ? `${d8.slice(0, 4)}-${d8.slice(4, 6)}-${d8.slice(6, 8)}` : ''
      const amt = num(pick(r, ['BILL_MONEY']))
      const io = String(pick(r, ['ESTI_INOUT'])) // I=수입 / O(그 외)=지출
      const type: '수입' | '지출' | '반납' = amt < 0 ? '반납' : (io === 'I' ? '수입' : '지출')
      // ⚠ 적요/거래처/결제방식은 걸음마 실제 컬럼 그대로 저장(강제 분리·파싱 금지).
      //    BILL_MEMO 안에 목적·거래처·결제방법이 일부러 함께 담겨 있으면 그대로 적요에 통째로 넣는다.
      return {
        id: i + 1,
        date,
        type,
        account: String(pick(r, ['ESTI_NAME_3', 'ESTI_NAME', 'ESTI_DISPLAY'])),      // 목
        subAccount: String(pick(r, ['ESTI_NAME_4', 'ESTI_NAME_DETAIL'])),            // 세목
        summary: String(pick(r, ['BILL_MEMO'])),                                     // 적요(원본 통째)
        amount: Math.abs(amt),
        counterpart: String(pick(r, ['CREDITOR'])),                                  // 거래처(실제 컬럼)
        note: String(pick(r, ['BILL_BIGO'])),                                        // 비고(카드/계좌)
        approved: false,
        inputMethod: '일괄' as const,
        accountCode: String(pick(r, ['ESTI_IDX'])),
        // 참고 필드(전표입력 표엔 없지만 보존)
        payment: String(pick(r, ['SETLE_MTHD_NAME'])),                               // 결제방식(실제 컬럼)
        bankAccount: String(pick(r, ['ACCOUNT_NICKNAME'])),                          // 통장구분
        hasAttachment: String(pick(r, ['BILL_ATCH_TYPE'])) !== '' || num(pick(r, ['MAPPNGCNT'])) > 0, // 영수증 첨부 유무(사진은 별도 조회 필요)
        isSupport: String(pick(r, ['BILL_SUPPORT_AT'])) === 'Y',
        isNuri: String(pick(r, ['BILL_NURI_AT'])) === 'Y',
      }
    })

    const field = bookField('voucher-input', book)

    // 1) 기존 데이터 삭제 (replace)
    await fetch(`${PLATFORM_URL}/api/settings/page-data?field=${encodeURIComponent(field)}`, {
      method: 'DELETE', headers: { cookie }, signal: AbortSignal.timeout(15_000),
    }).catch(() => {})

    // 2) 새 list 저장
    const res = await fetch(`${PLATFORM_URL}/api/settings/page-data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie },
      body: JSON.stringify({ field, list }),
      signal: AbortSignal.timeout(25_000),
    })
    const j = await res.json().catch(() => ({}))
    if (!res.ok || j?.success === false) return NextResponse.json({ success: false, error: j?.error || `저장 실패 (${res.status})` }, { status: 200 })
    return NextResponse.json({ success: true, saved: list.length })
  } catch (e) {
    return NextResponse.json({ success: false, error: `전표 저장 오류: ${e instanceof Error ? e.message : String(e)}` }, { status: 200 })
  }
}
