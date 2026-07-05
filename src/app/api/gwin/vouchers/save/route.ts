import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

// 가져온 걸음마 전표(원시 행) → 전표관리(voucher-input) 저장.
// ⚠ getBillList 원시 필드명이 확정 전이라 방어적 매핑(여러 키 후보). 미리보기에서 실제 필드 확인 후 정밀화.

const num = (v: unknown) => Number(String(v ?? '').replace(/[,\s]/g, '')) || 0
const pick = (r: Record<string, unknown>, keys: string[]) => {
  for (const k of keys) { const v = r[k]; if (v !== undefined && v !== null && String(v) !== '') return v }
  return ''
}

export async function POST(req: NextRequest) {
  try {
    const { book, rows } = await req.json() as { book?: string; year?: string; rows?: Record<string, unknown>[] }
    if (!book || !Array.isArray(rows) || rows.length === 0) return NextResponse.json({ success: false, error: '저장할 전표가 없습니다.' }, { status: 400 })

    // 걸음마 billManage/getBillList 실측 필드 매핑
    const list = rows.map((r, i) => {
      const d8 = String(pick(r, ['BILL_DATE', 'BILL_ORDER_DATE'])).replace(/[^0-9]/g, '').slice(0, 8)
      const date = d8.length === 8 ? `${d8.slice(0, 4)}-${d8.slice(4, 6)}-${d8.slice(6, 8)}` : ''
      const amt = num(pick(r, ['BILL_MONEY']))
      const io = String(pick(r, ['ESTI_INOUT'])) // I=수입 / O(그 외)=지출
      const type: '수입' | '지출' | '반납' = amt < 0 ? '반납' : (io === 'I' ? '수입' : '지출')
      return {
        id: i + 1,
        date,
        type,
        account: String(pick(r, ['ESTI_NAME_3', 'ESTI_NAME', 'ESTI_DISPLAY', 'ESTI_NAME_DETAIL'])), // 목
        subAccount: String(pick(r, ['ESTI_NAME_4'])), // 세목
        summary: String(pick(r, ['BILL_MEMO'])), // 적요
        amount: Math.abs(amt),
        counterpart: String(pick(r, ['CREDITOR', 'CRED_NAME_BIZRNO'])), // 거래처
        note: String(pick(r, ['BILL_BIGO'])), // 비고
        payment: String(pick(r, ['SETLE_MTHD_NAME'])), // 결제방식
        bankAccount: String(pick(r, ['ACCOUNT_NICKNAME'])), // 통장구분
        isSupport: String(pick(r, ['BILL_SUPPORT_AT'])) === 'Y', // 보조금
        isNuri: String(pick(r, ['BILL_NURI_AT'])) === 'Y', // 누리지원
      }
    })

    const platformBase = process.env.NEXT_PUBLIC_PLATFORM_URL || 'http://localhost:3000'
    void platformBase // /api/voucher/list 가 통합e 로 프록시하므로 상대경로 사용
    const origin = req.nextUrl.origin
    const res = await fetch(`${origin}/api/voucher/list`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: req.headers.get('cookie') || '' },
      body: JSON.stringify({ list, book }),
    })
    const j = await res.json().catch(() => ({}))
    if (!res.ok || j?.success === false) return NextResponse.json({ success: false, error: j?.error || `저장 실패 (${res.status})` }, { status: 200 })
    return NextResponse.json({ success: true, saved: list.length })
  } catch (e) {
    return NextResponse.json({ success: false, error: `전표 저장 오류: ${e instanceof Error ? e.message : String(e)}` }, { status: 200 })
  }
}
