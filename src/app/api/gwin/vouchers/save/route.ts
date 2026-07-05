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
// 걸음마 BILL_MEMO 는 여러 줄 덩어리(목적/거래처/금액/결제방법)로 옴 → 라벨별 파싱.
//   목적: 요리활동 기구 정리용 ...
//   거래처: 주식회사 아성
//   금액: 20,000원
//   결제방법: 카드결제
function parseMemo(memo: string): Record<string, string> {
  const o: Record<string, string> = {}
  for (const line of String(memo || '').split(/\r?\n/)) {
    const m = line.match(/^\s*(목적|적요|거래처|거래처명|금액|결제방법|결제방식)\s*[:：]\s*(.+?)\s*$/)
    if (m) o[m[1]] = m[2]
  }
  return o
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
      const memo = String(pick(r, ['BILL_MEMO']))
      const mp = parseMemo(memo)
      const firstLine = memo.split(/\r?\n/)[0]?.trim() || ''
      // 적요 = "목적:" 줄 우선, 없으면 첫 줄, 없으면 통째
      const summary = mp['목적'] || mp['적요'] || firstLine || memo
      // 거래처 = CREDITOR 필드 우선(비어있는 경우 많음) → 메모의 "거래처:" → TRANS_MEMO
      const counterpart = String(pick(r, ['CREDITOR', 'CRED_NAME_BIZRNO'])) || mp['거래처'] || mp['거래처명'] || String(pick(r, ['TRANS_MEMO']))
      // 결제방식 = SETLE_MTHD_NAME 필드 우선(비어있는 경우 많음) → 메모의 "결제방법:" → 비고(BILL_BIGO=[신한체]원신한)
      const payment = String(pick(r, ['SETLE_MTHD_NAME'])) || mp['결제방법'] || mp['결제방식'] || String(pick(r, ['BILL_BIGO']))
      return {
        id: i + 1,
        date,
        type,
        account: String(pick(r, ['ESTI_NAME_3', 'ESTI_NAME', 'ESTI_DISPLAY'])),      // 목
        subAccount: String(pick(r, ['ESTI_NAME_4', 'ESTI_NAME_DETAIL'])),            // 세목
        summary,                                                                     // 적요(목적)
        amount: Math.abs(amt),
        counterpart,                                                                 // 거래처
        note: String(pick(r, ['BILL_BIGO'])),                                        // 비고(카드/계좌)
        approved: false,
        inputMethod: '일괄' as const,
        accountCode: String(pick(r, ['ESTI_IDX'])),
        // 참고 필드(전표입력 표엔 없지만 보존)
        payment,
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
