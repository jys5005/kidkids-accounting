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

    const list = rows.map((r, i) => {
      const dateRaw = String(pick(r, ['PAPER_DATE', 'BALEUI_DATE', 'ESTI_DATE', 'REG_DATE', 'BILL_DATE', 'ISSUE_DATE']))
      const d8 = dateRaw.replace(/[^0-9]/g, '').slice(0, 8)
      const date = d8.length === 8 ? `${d8.slice(0, 4)}-${d8.slice(4, 6)}-${d8.slice(6, 8)}` : dateRaw
      const inAmt = num(pick(r, ['IN_MONEY', 'INMONEY', 'SUIP_MONEY']))
      const outAmt = num(pick(r, ['OUT_MONEY', 'OUTMONEY', 'JICHUL_MONEY']))
      const amt = num(pick(r, ['PAPER_MONEY', 'BILL_MONEY', 'MONEY', 'TOT_MONEY', 'AMOUNT'])) || inAmt || outAmt
      const io = String(pick(r, ['INOUT_GB', 'IO_GB', 'INOUT', 'ESTI_INOUT']))
      const type: '수입' | '지출' | '반납' = amt < 0 ? '반납' : (io === 'I' || inAmt > 0 ? '수입' : '지출')
      return {
        id: i + 1,
        date,
        type,
        account: String(pick(r, ['ACCT_NAME', 'ESTI_NAME', 'ACCOUNT_NAME', 'GYEJEONG_NM', 'ESTI_DISPLAY_ESTI_NAME_3'])),
        subAccount: String(pick(r, ['SEMOK_NAME', 'SEMOK_NM', 'SUBACCT_NAME'])),
        summary: String(pick(r, ['JUKYO', 'JEOKYO', 'SUMMARY', 'JEOKYOTEXT', 'CONTENT'])),
        amount: Math.abs(amt),
        counterpart: String(pick(r, ['GEORAECHEO', 'GEORAECHEO_NM', 'DEAL_NM', 'CUST_NM'])),
        note: String(pick(r, ['BIGO', 'NOTE', 'REMARK', 'BANK_NM'])),
        payment: String(pick(r, ['GYELJE_BANGSIK', 'PAY_TYPE', 'GYELJE_NM'])),
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
