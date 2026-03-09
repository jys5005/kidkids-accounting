import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import * as XLSX from 'xlsx'

export async function POST(request: NextRequest) {
  try {
    const { data, summary, yearmon } = await request.json()

    if (!data || !Array.isArray(data)) {
      return NextResponse.json({ success: false, error: '데이터가 없습니다.' }, { status: 400 })
    }

    // 워크북 생성
    const wb = XLSX.utils.book_new()

    // 요약 시트
    const summaryRows = [
      ['키즈키즈 현금출납부', '', '', ''],
      ['조회기간', yearmon || '', '', ''],
      ['', '', '', ''],
      ['구분', '수입', '지출', '잔액'],
      ['이월액', '', '', summary?.carryOver || ''],
      ['월 계', summary?.monthIncome || '0', summary?.monthExpense || '0', ''],
      ['누 계', summary?.totalIncome || '0', summary?.totalExpense || '0', summary?.balance || '0'],
    ]
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows)
    wsSummary['!cols'] = [{ wch: 15 }, { wch: 18 }, { wch: 18 }, { wch: 18 }]
    XLSX.utils.book_append_sheet(wb, wsSummary, '요약')

    // 거래내역 시트
    const header = ['일자', '적요', '계정과목', '증빙서번호', '채주', '수입금액', '지출금액', '잔액']
    const rows = data.map((r: Record<string, string>) => [
      r.date || '',
      r.summary || '',
      r.accountName || '',
      '', // 증빙서번호는 memo에 넣었으나 원래 별도 컬럼
      r.memo || '',
      r.income || '',
      r.expense || '',
      r.balance || '',
    ])

    const wsData = XLSX.utils.aoa_to_sheet([header, ...rows])
    wsData['!cols'] = [
      { wch: 10 }, { wch: 35 }, { wch: 25 }, { wch: 12 },
      { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
    ]
    XLSX.utils.book_append_sheet(wb, wsData, '현금출납부')

    // 엑셀 파일 생성
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    const filename = `현금출납부_${yearmon || 'all'}.xlsx`

    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ success: false, error: msg })
  }
}
