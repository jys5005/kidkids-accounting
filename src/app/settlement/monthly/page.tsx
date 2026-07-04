'use client'

import { useState, useMemo, useEffect } from 'react'
import { incomeAccounts, expenseAccounts, accountCodeMap, subAccountCodeMap } from '@/lib/accounts'
import { getActiveBook, BOOK_CHANGE_EVENT, bookLabel } from '@/lib/ilovechild-books'

function fmt(n: number) { return n.toLocaleString('ko-KR') }

function getYmOptions() {
  const now = new Date()
  const opts: string[] = []
  for (let i = 0; i < 24; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    opts.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  return opts
}

type AccountRow = {
  code: string; name: string; budget: number; prevAccum: number; thisMonth: number; balance: number; isSub?: boolean
  gwanCode?: string; gwanName?: string; hangCode?: string; hangName?: string
}

// 관-항 매핑 (수입)
const incomeGwanHang: Record<string, { gwanCode: string; gwanName: string; hangCode: string; hangName: string }> = {
  '1111': { gwanCode: '01', gwanName: '보육료', hangCode: '110', hangName: '보육료' },
  '1112': { gwanCode: '01', gwanName: '보육료', hangCode: '110', hangName: '보육료' },
  '1211': { gwanCode: '02', gwanName: '수익자부담 수입', hangCode: '210', hangName: '선택적 보육활동비' },
  '1221': { gwanCode: '02', gwanName: '수익자부담 수입', hangCode: '220', hangName: '기타 필요경비' },
  '1221111': { gwanCode: '02', gwanName: '수익자부담 수입', hangCode: '220', hangName: '기타 필요경비' },
  '1221112': { gwanCode: '02', gwanName: '수익자부담 수입', hangCode: '220', hangName: '기타 필요경비' },
  '1221113': { gwanCode: '02', gwanName: '수익자부담 수입', hangCode: '220', hangName: '기타 필요경비' },
  '1221121': { gwanCode: '02', gwanName: '수익자부담 수입', hangCode: '220', hangName: '기타 필요경비' },
  '1221131': { gwanCode: '02', gwanName: '수익자부담 수입', hangCode: '220', hangName: '기타 필요경비' },
  '1221141': { gwanCode: '02', gwanName: '수익자부담 수입', hangCode: '220', hangName: '기타 필요경비' },
  '1311': { gwanCode: '03', gwanName: '보조금 및 지원금', hangCode: '310', hangName: '인건비 보조금' },
  '1312': { gwanCode: '03', gwanName: '보조금 및 지원금', hangCode: '320', hangName: '운영보조금' },
  '1321': { gwanCode: '03', gwanName: '보조금 및 지원금', hangCode: '320', hangName: '운영보조금' },
  '1323': { gwanCode: '03', gwanName: '보조금 및 지원금', hangCode: '320', hangName: '운영보조금' },
  '1324': { gwanCode: '03', gwanName: '보조금 및 지원금', hangCode: '320', hangName: '운영보조금' },
  '1331': { gwanCode: '03', gwanName: '보조금 및 지원금', hangCode: '330', hangName: '자본 보조금' },
  '1411': { gwanCode: '04', gwanName: '전입금', hangCode: '410', hangName: '전입금' },
  '1511': { gwanCode: '04', gwanName: '전입금', hangCode: '420', hangName: '차입금' },
  '1521': { gwanCode: '04', gwanName: '전입금', hangCode: '420', hangName: '차입금' },
  '1611': { gwanCode: '05', gwanName: '기부금', hangCode: '510', hangName: '기부금' },
  '1612': { gwanCode: '05', gwanName: '기부금', hangCode: '510', hangName: '기부금' },
  '1711': { gwanCode: '06', gwanName: '적립금', hangCode: '610', hangName: '적립금' },
  '1811': { gwanCode: '07', gwanName: '과년도 수입', hangCode: '710', hangName: '과년도 수입' },
  '1911': { gwanCode: '08', gwanName: '잡수입', hangCode: '810', hangName: '잡수입' },
  '1921': { gwanCode: '08', gwanName: '잡수입', hangCode: '810', hangName: '잡수입' },
  '1991': { gwanCode: '09', gwanName: '전년도 이월액', hangCode: '910', hangName: '전년도 이월액' },
  '1992': { gwanCode: '09', gwanName: '전년도 이월액', hangCode: '910', hangName: '전년도 이월액' },
}

// 관-항 매핑 (지출)
const expenseGwanHang: Record<string, { gwanCode: string; gwanName: string; hangCode: string; hangName: string }> = {
  '2111': { gwanCode: '01', gwanName: '인건비', hangCode: '110', hangName: '원장인건비' },
  '2112': { gwanCode: '01', gwanName: '인건비', hangCode: '110', hangName: '원장인건비' },
  '2121': { gwanCode: '01', gwanName: '인건비', hangCode: '120', hangName: '보육교직원인건비' },
  '2122': { gwanCode: '01', gwanName: '인건비', hangCode: '120', hangName: '보육교직원인건비' },
  '2131': { gwanCode: '01', gwanName: '인건비', hangCode: '130', hangName: '기타인건비' },
  '2141': { gwanCode: '01', gwanName: '인건비', hangCode: '140', hangName: '법정부담금·퇴직금' },
  '2142': { gwanCode: '01', gwanName: '인건비', hangCode: '140', hangName: '법정부담금·퇴직금' },
  '2142311': { gwanCode: '01', gwanName: '인건비', hangCode: '140', hangName: '법정부담금·퇴직금' },
  '2142411': { gwanCode: '01', gwanName: '인건비', hangCode: '140', hangName: '법정부담금·퇴직금' },
  '2211': { gwanCode: '02', gwanName: '관리운영비', hangCode: '210', hangName: '기관운영비' },
  '2212': { gwanCode: '02', gwanName: '관리운영비', hangCode: '210', hangName: '기관운영비' },
  '2213': { gwanCode: '02', gwanName: '관리운영비', hangCode: '210', hangName: '기관운영비' },
  '2214': { gwanCode: '02', gwanName: '관리운영비', hangCode: '210', hangName: '기관운영비' },
  '2215': { gwanCode: '02', gwanName: '관리운영비', hangCode: '210', hangName: '기관운영비' },
  '2216': { gwanCode: '02', gwanName: '관리운영비', hangCode: '210', hangName: '기관운영비' },
  '2217': { gwanCode: '02', gwanName: '관리운영비', hangCode: '210', hangName: '기관운영비' },
  '2217111': { gwanCode: '02', gwanName: '관리운영비', hangCode: '210', hangName: '기관운영비' },
  '2217211': { gwanCode: '02', gwanName: '관리운영비', hangCode: '210', hangName: '기관운영비' },
  '2218': { gwanCode: '02', gwanName: '관리운영비', hangCode: '220', hangName: '업무추진비' },
  '2219': { gwanCode: '02', gwanName: '관리운영비', hangCode: '220', hangName: '업무추진비' },
  '2220': { gwanCode: '02', gwanName: '관리운영비', hangCode: '220', hangName: '업무추진비' },
  '2311': { gwanCode: '03', gwanName: '보육활동비', hangCode: '310', hangName: '보육활동운영비' },
  '2312': { gwanCode: '03', gwanName: '보육활동비', hangCode: '310', hangName: '보육활동운영비' },
  '2313': { gwanCode: '03', gwanName: '보육활동비', hangCode: '310', hangName: '보육활동운영비' },
  '2314': { gwanCode: '03', gwanName: '보육활동비', hangCode: '310', hangName: '보육활동운영비' },
  '2315': { gwanCode: '03', gwanName: '보육활동비', hangCode: '310', hangName: '보육활동운영비' },
  '2411': { gwanCode: '04', gwanName: '수익자부담 지출', hangCode: '410', hangName: '특별활동비' },
  '2421': { gwanCode: '04', gwanName: '수익자부담 지출', hangCode: '420', hangName: '기타필요경비지출' },
  '2421111': { gwanCode: '04', gwanName: '수익자부담 지출', hangCode: '420', hangName: '기타필요경비지출' },
  '2421112': { gwanCode: '04', gwanName: '수익자부담 지출', hangCode: '420', hangName: '기타필요경비지출' },
  '2421113': { gwanCode: '04', gwanName: '수익자부담 지출', hangCode: '420', hangName: '기타필요경비지출' },
  '2421121': { gwanCode: '04', gwanName: '수익자부담 지출', hangCode: '420', hangName: '기타필요경비지출' },
  '2421131': { gwanCode: '04', gwanName: '수익자부담 지출', hangCode: '420', hangName: '기타필요경비지출' },
  '2511': { gwanCode: '05', gwanName: '적립금', hangCode: '510', hangName: '적립금' },
  '2611': { gwanCode: '06', gwanName: '상환금', hangCode: '610', hangName: '차입금상환' },
  '2621': { gwanCode: '06', gwanName: '상환금', hangCode: '610', hangName: '차입금상환' },
  '2631': { gwanCode: '06', gwanName: '상환금', hangCode: '620', hangName: '반환금' },
  '2632': { gwanCode: '06', gwanName: '상환금', hangCode: '620', hangName: '반환금' },
  '2641': { gwanCode: '06', gwanName: '상환금', hangCode: '630', hangName: '전출금' },
  '2711': { gwanCode: '07', gwanName: '시설비', hangCode: '710', hangName: '시설비' },
  '2712': { gwanCode: '07', gwanName: '시설비', hangCode: '710', hangName: '시설비' },
  '2721': { gwanCode: '07', gwanName: '시설비', hangCode: '720', hangName: '자산취득비' },
  '2721111': { gwanCode: '07', gwanName: '시설비', hangCode: '720', hangName: '자산취득비' },
  '2721211': { gwanCode: '07', gwanName: '시설비', hangCode: '720', hangName: '자산취득비' },
  '2811': { gwanCode: '08', gwanName: '과년도 지출', hangCode: '810', hangName: '과년도 지출' },
  '2911': { gwanCode: '09', gwanName: '잡지출·예비비', hangCode: '910', hangName: '잡지출·예비비' },
  '2991': { gwanCode: '09', gwanName: '잡지출·예비비', hangCode: '910', hangName: '잡지출·예비비' },
}

// mock 금액
const mockAmounts: Record<string, Partial<AccountRow>> = {
  '1111': { budget: 415512000, prevAccum: 115448356, thisMonth: 23240823, balance: 276822821 },
  '1112': { budget: 0, prevAccum: 12047988, thisMonth: 1699936, balance: -13747924 },
  '1211': { budget: 33936000, prevAccum: 12499000, thisMonth: 2794000, balance: 18643000 },
  '1221': { budget: 123940318, prevAccum: 49461527, thisMonth: 0, balance: 74478791 },
  '1221111': { budget: 5000000, prevAccum: 245000, thisMonth: 0, balance: 4755000 },
  '1221112': { budget: 31344000, prevAccum: 7266000, thisMonth: 1612000, balance: 22466000 },
  '1221113': { budget: 7200000, prevAccum: 3020000, thisMonth: 660000, balance: 3520000 },
  '1221121': { budget: 14400000, prevAccum: 2384389, thisMonth: 621862, balance: 11393749 },
  '1221131': { budget: 0, prevAccum: 0, thisMonth: 0, balance: 0 },
  '1221141': { budget: 25920000, prevAccum: 7140000, thisMonth: 1610000, balance: 17170000 },
  '1311': { budget: 112064400, prevAccum: 57386800, thisMonth: 12659840, balance: 42017760 },
  '1312': { budget: 144792000, prevAccum: 44725750, thisMonth: 8756000, balance: 91310250 },
  '1321': { budget: 10440000, prevAccum: 7629000, thisMonth: 1587500, balance: 1223500 },
  '1323': { budget: 65280000, prevAccum: 34965000, thisMonth: 6850000, balance: 23465000 },
  '1324': { budget: 134066930, prevAccum: 63696280, thisMonth: 13106790, balance: 57263860 },
  '1331': { budget: 0, prevAccum: 0, thisMonth: 0, balance: 0 },
  '1411': { budget: 2364000, prevAccum: 700000, thisMonth: 140000, balance: 1524000 },
  '1511': { budget: 10000000, prevAccum: 0, thisMonth: 0, balance: 10000000 },
  '1611': { budget: 0, prevAccum: 0, thisMonth: 0, balance: 0 },
  '1612': { budget: 0, prevAccum: 0, thisMonth: 0, balance: 0 },
  '1711': { budget: 2000000, prevAccum: 4356402, thisMonth: 0, balance: -2356402 },
  '1811': { budget: 500000, prevAccum: 170000, thisMonth: 0, balance: 330000 },
  '1911': { budget: 20000, prevAccum: 33288, thisMonth: 0, balance: -13288 },
  '1921': { budget: 2000000, prevAccum: 210340, thisMonth: 1805772, balance: -16112 },
  '1991': { budget: 68532450, prevAccum: 67882450, thisMonth: 0, balance: 650000 },
  '1992': { budget: 0, prevAccum: 0, thisMonth: 0, balance: 0 },
  '2111': { budget: 48000000, prevAccum: 44000000, thisMonth: 4000000, balance: 0 },
  '2121': { budget: 180000000, prevAccum: 165000000, thisMonth: 15000000, balance: 0 },
  '2122': { budget: 24000000, prevAccum: 22000000, thisMonth: 2000000, balance: 0 },
  '2141': { budget: 36000000, prevAccum: 33000000, thisMonth: 3000000, balance: 0 },
  '2142': { budget: 18000000, prevAccum: 16500000, thisMonth: 1500000, balance: 0 },
  '2142311': { budget: 9000000, prevAccum: 8250000, thisMonth: 750000, balance: 0 },
  '2142411': { budget: 9000000, prevAccum: 8250000, thisMonth: 750000, balance: 0 },
  '2211': { budget: 24000000, prevAccum: 21500000, thisMonth: 2100000, balance: 400000 },
  '2212': { budget: 18000000, prevAccum: 16800000, thisMonth: 1500000, balance: -300000 },
  '2315': { budget: 48000000, prevAccum: 44000000, thisMonth: 4000000, balance: 0 },
}

// accounts.ts 기반 계정 목록 생성
const accountData: AccountRow[] = (() => {
  const rows: AccountRow[] = []
  const allItems = [...incomeAccounts, ...expenseAccounts]
  const seen = new Set<string>()

  for (const item of allItems) {
    if (item.isSub) {
      const valueKey = item.value.replace('세목:', '').replace('필:', '')
      const code = subAccountCodeMap[valueKey] || subAccountCodeMap[item.label] || subAccountCodeMap[item.label.replace('(지출)', '')]
      if (!code || seen.has(code)) continue
      seen.add(code)
      rows.push({ code, name: item.label, isSub: true, budget: 0, prevAccum: 0, thisMonth: 0, balance: 0 })
    } else {
      const code = accountCodeMap[item.value] || accountCodeMap[item.label]
      if (!code || seen.has(code)) continue
      seen.add(code)
      rows.push({ code, name: item.label, isSub: false, budget: 0, prevAccum: 0, thisMonth: 0, balance: 0 })
    }
  }

  rows.sort((a, b) => a.code.localeCompare(b.code))

  return rows.map(r => {
    const gh = incomeGwanHang[r.code] || expenseGwanHang[r.code]
    return { ...r, ...(mockAmounts[r.code] || {}), gwanCode: gh?.gwanCode, gwanName: gh?.gwanName, hangCode: gh?.hangCode, hangName: gh?.hangName }
  })
})()

const TH = 'px-2 py-2.5 text-center font-bold text-slate-600 whitespace-nowrap border-b border-r border-slate-200 text-[11px]'
const TD = 'px-2 py-2 text-center border-b border-r border-slate-100 text-xs'

function AccountTable({ type, data, f: fmtFn }: { type: 'income' | 'expense'; data: AccountRow[]; f: (n: number) => string }) {
  const isIncome = type === 'income'
  const color = isIncome ? 'blue' : 'red'
  let prevGwan = '', prevHang = '', prevParentName = ''

  return (
    <div className="overflow-x-auto border border-slate-200 rounded-lg bg-white">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className={`bg-${color}-50 border-b border-${color}-200`}>
            <th className={`${TH} w-12`}>관</th>
            <th className={`${TH} w-24`}></th>
            <th className={`${TH} w-12`}>항</th>
            <th className={`${TH} w-24`}></th>
            <th className={`${TH} w-16`}>목</th>
            <th className={TH}>계정과목</th>
            <th className={`${TH} w-28`}>예산액</th>
            <th className={`${TH} w-28`}>전월누계액</th>
            <th className={`${TH} w-28`}>{isIncome ? '수납액' : '지출액'}</th>
            <th className={`${TH} w-28`}>잔액</th>
            <th className={`${TH} w-12 border-r-0`}>비고</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => {
            const showGwan = row.gwanCode !== prevGwan && !row.isSub
            const showHang = (row.hangCode !== prevHang || showGwan) && !row.isSub
            if (!row.isSub) { prevGwan = row.gwanCode || ''; prevHang = row.hangCode || ''; prevParentName = row.name }
            const rawCode = row.code.substring(1)
            const mokCode = row.isSub ? rawCode.substring(0, 3) + '-' + rawCode.substring(3) : rawCode
            const neg = row.balance < 0
            const displayName = row.isSub ? `[${prevParentName}] ${row.name}` : row.name
            return (
              <tr key={idx} className="hover:bg-slate-50 transition-colors">
                <td className={`${TD} text-slate-500 font-medium`}>{showGwan ? row.gwanCode : ''}</td>
                <td className={`${TD} text-left text-slate-600 text-[11px]`}>{showGwan ? row.gwanName : ''}</td>
                <td className={`${TD} text-slate-500 font-medium`}>{showHang ? row.hangCode : ''}</td>
                <td className={`${TD} text-left text-slate-600 text-[11px]`}>{showHang ? row.hangName : ''}</td>
                <td className={`${TD} font-medium ${row.isSub ? 'text-slate-400' : 'text-slate-600'}`}>{mokCode}</td>
                <td className={`${TD} text-left px-2 ${row.isSub ? 'text-slate-500 pl-4' : 'text-slate-700 font-medium'}`}>{displayName}</td>
                <td className={`${TD} text-right ${row.budget > 0 ? 'text-slate-800' : 'text-slate-300'}`}>{fmtFn(row.budget)}</td>
                <td className={`${TD} text-right ${row.prevAccum > 0 ? 'text-slate-800' : 'text-slate-300'}`}>{fmtFn(row.prevAccum)}</td>
                <td className={`${TD} text-right ${row.thisMonth > 0 ? (isIncome ? 'text-blue-700 font-medium' : 'text-red-600 font-medium') : 'text-slate-300'}`}>{row.thisMonth > 0 ? fmtFn(row.thisMonth) : ''}</td>
                <td className={`${TD} text-right font-medium ${neg ? 'text-red-600' : row.balance > 0 ? 'text-slate-800' : 'text-slate-300'}`}>{neg ? `▲${fmtFn(Math.abs(row.balance))}` : fmtFn(row.balance)}</td>
                <td className={`${TD} border-r-0`}></td>
              </tr>
            )
          })}
          <tr className="bg-slate-50 font-bold">
            <td colSpan={6} className={`${TD} text-center text-slate-700`}>합계</td>
            <td className={`${TD} text-right text-slate-800`}>{fmtFn(data.reduce((s, r) => s + r.budget, 0))}</td>
            <td className={`${TD} text-right text-slate-800`}>{fmtFn(data.reduce((s, r) => s + r.prevAccum, 0))}</td>
            <td className={`${TD} text-right ${isIncome ? 'text-blue-700' : 'text-red-600'}`}>{fmtFn(data.reduce((s, r) => s + r.thisMonth, 0))}</td>
            <td className={`${TD} text-right text-slate-800`}>{fmtFn(data.reduce((s, r) => s + r.balance, 0))}</td>
            <td className={`${TD} border-r-0`}></td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function SettlementMonthlyLegacy() {
  const ymOpts = useMemo(() => getYmOptions(), [])
  const [selectedYm, setSelectedYm] = useState(ymOpts[1])
  const [unit, setUnit] = useState<'won' | 'thousand'>('won')
  const [printArea, setPrintArea] = useState({ income: true, expense: true })
  const f = (n: number) => unit === 'thousand' ? fmt(Math.round(n / 1000)) : fmt(n)

  const incomeData = accountData.filter(r => r.code.startsWith('1'))
  const expenseData = accountData.filter(r => r.code.startsWith('2'))

  return (
    <div className="p-3 space-y-3">
      {/* 상단 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-700">결산연월</span>
          <select value={selectedYm} onChange={e => setSelectedYm(e.target.value)} className="border border-slate-300 rounded px-2 py-1.5 text-xs">
            {ymOpts.map(ym => <option key={ym} value={ym}>{ym}</option>)}
          </select>
          <button className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors">조회</button>
        </div>
      </div>


      {/* 세입·세출 요약 */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className={`${TH} w-40`}></th>
              <th className={`${TH} w-28`}>예산액</th>
              <th className={`${TH} w-28`}>전월누계액</th>
              <th className={`${TH} w-28`}>당월액</th>
              <th className={`${TH} w-28 border-r-0`}>잔액</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-100">
              <td className={`${TD} font-bold text-blue-700`}>세입 합계</td>
              <td className={`${TD} text-right font-bold text-slate-800`}>{f(incomeData.reduce((s, r) => s + r.budget, 0))}</td>
              <td className={`${TD} text-right font-bold text-slate-800`}>{f(incomeData.reduce((s, r) => s + r.prevAccum, 0))}</td>
              <td className={`${TD} text-right font-bold text-blue-700`}>{f(incomeData.reduce((s, r) => s + r.thisMonth, 0))}</td>
              <td className={`${TD} text-right font-bold text-slate-800 border-r-0`}>{f(incomeData.reduce((s, r) => s + r.balance, 0))}</td>
            </tr>
            <tr className="border-b border-slate-100">
              <td className={`${TD} font-bold text-red-600`}>세출 합계</td>
              <td className={`${TD} text-right font-bold text-slate-800`}>{f(expenseData.reduce((s, r) => s + r.budget, 0))}</td>
              <td className={`${TD} text-right font-bold text-slate-800`}>{f(expenseData.reduce((s, r) => s + r.prevAccum, 0))}</td>
              <td className={`${TD} text-right font-bold text-red-600`}>{f(expenseData.reduce((s, r) => s + r.thisMonth, 0))}</td>
              <td className={`${TD} text-right font-bold text-slate-800 border-r-0`}>{f(expenseData.reduce((s, r) => s + r.balance, 0))}</td>
            </tr>
            <tr>
              <td className={`${TD} font-bold text-green-700`}>차액 (세입-세출)</td>
              <td className={`${TD} text-right font-bold text-green-700`}>{f(incomeData.reduce((s, r) => s + r.budget, 0) - expenseData.reduce((s, r) => s + r.budget, 0))}</td>
              <td className={`${TD} text-right font-bold text-green-700`}>{f(incomeData.reduce((s, r) => s + r.prevAccum, 0) - expenseData.reduce((s, r) => s + r.prevAccum, 0))}</td>
              <td className={`${TD} text-right font-bold text-green-700`}>{f(incomeData.reduce((s, r) => s + r.thisMonth, 0) - expenseData.reduce((s, r) => s + r.thisMonth, 0))}</td>
              <td className={`${TD} text-right font-bold text-green-700 border-r-0`}>{f(incomeData.reduce((s, r) => s + r.balance, 0) - expenseData.reduce((s, r) => s + r.balance, 0))}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 수입 */}
      <div>
        <div className="px-1 py-1.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-blue-700">수입</span>
            <button onClick={() => document.getElementById('expense-section')?.scrollIntoView({ behavior: 'smooth' })} className="text-xs font-bold text-red-500 hover:text-red-700 hover:underline transition-colors cursor-pointer">지출 ↓</button>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-1 border border-slate-200 rounded-lg px-2 py-1">
              <label className="flex items-center gap-0.5 text-[10px] text-slate-600 cursor-pointer">
                <input type="checkbox" checked={printArea.income} onChange={e => setPrintArea(p => ({ ...p, income: e.target.checked }))} className="w-3 h-3 accent-blue-600 rounded" />
                <span className="font-bold text-blue-600">세입</span>
              </label>
              <label className="flex items-center gap-0.5 text-[10px] text-slate-600 cursor-pointer">
                <input type="checkbox" checked={printArea.expense} onChange={e => setPrintArea(p => ({ ...p, expense: e.target.checked }))} className="w-3 h-3 accent-red-600 rounded" />
                <span className="font-bold text-red-600">세출</span>
              </label>
              <div className="w-px h-4 bg-slate-200 mx-1" />
              <button className="h-6 px-2 flex items-center gap-1 bg-white hover:bg-slate-50 border border-slate-300 rounded transition-colors" title="인쇄하기">
                <svg className="w-3.5 h-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5z" /></svg>
              </button>
              <button className="h-6 px-2 flex items-center gap-1 bg-white hover:bg-green-50 border border-green-400 rounded transition-colors" title="엑셀다운로드">
                <svg className="w-3.5 h-3.5 text-green-600" viewBox="0 0 24 24" fill="currentColor"><path d="M14.2 1H5.8C4.81 1 4 1.81 4 2.8v18.4c0 .99.81 1.8 1.8 1.8h12.4c.99 0 1.8-.81 1.8-1.8V6.8L14.2 1zM15.8 19.3l-2.1-3.5-2.1 3.5H9.8l3.2-5-2.9-4.7h1.8l2.1 3.3 2-3.3h1.8l-2.9 4.7 3.2 5h-2.3z" /></svg>
              </button>
            </div>
            <div className="flex items-center gap-2 ml-2">
              <span className="text-[10px] text-slate-400">단위:</span>
              <label className="flex items-center gap-0.5 text-[10px] text-slate-500 cursor-pointer">
                <input type="radio" name="unit" checked={unit === 'won'} onChange={() => setUnit('won')} className="w-3 h-3 accent-blue-600" />
                <span>원</span>
              </label>
              <label className="flex items-center gap-0.5 text-[10px] text-slate-500 cursor-pointer">
                <input type="radio" name="unit" checked={unit === 'thousand'} onChange={() => setUnit('thousand')} className="w-3 h-3 accent-blue-600" />
                <span>천원</span>
              </label>
            </div>
          </div>
        </div>
        <AccountTable type="income" data={incomeData} f={f} />
      </div>

      {/* 지출 */}
      <div id="expense-section">
        <div className="px-1 py-1.5 flex items-center gap-3">
          <span className="text-xs font-bold text-red-700">지출</span>
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="text-xs font-bold text-blue-500 hover:text-blue-700 hover:underline transition-colors cursor-pointer">수입 ↑</button>
        </div>
        <AccountTable type="expense" data={expenseData} f={f} />
      </div>
    </div>
  )
}

/* ══════════ 아이사랑꿈터 — coa 기반 월별결산서 (예산 vs 당월 vs 누적) ══════════ */
interface MCoaMok { code: string; name: string }
interface MCoaHang { code: string; name: string; moks?: MCoaMok[] }
interface MCoaGwan { gubun: string; code: string; name: string; hangs?: MCoaHang[] }
type MRow = { gwanCode: string; gwanName: string; hangCode: string; hangName: string; code: string; name: string; budget: number; month: number; cumul: number }

function mCoaRows(tree: MCoaGwan[], gubun: '세입' | '세출', budget: Record<string, { total?: number }[]>, byMonth: Record<string, number>, byCumul: Record<string, number>): MRow[] {
  const rows: MRow[] = []
  const pf = gubun === '세출' ? 'E' : ''
  for (const g of tree || []) {
    if (g.gubun !== gubun) continue
    for (const h of g.hangs || []) {
      for (const m of h.moks || []) {
        const key = pf + m.code
        const b = (budget[key] || []).reduce((s, it) => s + (it.total || 0), 0)
        rows.push({ gwanCode: g.code, gwanName: g.name, hangCode: h.code, hangName: h.name, code: m.code, name: m.name, budget: b, month: byMonth[key] || 0, cumul: byCumul[key] || 0 })
      }
    }
  }
  return rows
}

// 연속 관/항 그룹의 rowSpan 계산 (셀병합용)
function withSpans<T extends { gwanCode: string; hangCode: string }>(rows: T[]) {
  return rows.map((r, i) => {
    const firstG = i === 0 || rows[i - 1].gwanCode !== r.gwanCode
    const firstH = firstG || rows[i - 1].hangCode !== r.hangCode
    let gSpan = 1, hSpan = 1
    if (firstG) { let j = i + 1; while (j < rows.length && rows[j].gwanCode === r.gwanCode) j++; gSpan = j - i }
    if (firstH) { let j = i + 1; while (j < rows.length && rows[j].gwanCode === r.gwanCode && rows[j].hangCode === r.hangCode) j++; hSpan = j - i }
    return { r, firstG, firstH, gSpan, hSpan }
  })
}
const GWAN_BADGE = 'text-[9px] font-bold text-violet-700 bg-violet-100 rounded px-1 py-px'
const HANG_BADGE = 'text-[9px] font-bold text-sky-700 bg-sky-100 rounded px-1 py-px'
const MOK_BADGE = 'text-[9px] font-bold text-emerald-700 bg-emerald-100 rounded px-1 py-px'

function MonthlySettleTable({ title, rows, tone }: { title: string; rows: MRow[]; tone: 'income' | 'expense' }) {
  const f = (n: number) => n.toLocaleString('ko-KR')
  const tB = rows.reduce((s, r) => s + r.budget, 0), tM = rows.reduce((s, r) => s + r.month, 0), tC = rows.reduce((s, r) => s + r.cumul, 0)
  const head = tone === 'income' ? 'bg-blue-50 text-blue-700' : 'bg-rose-50 text-rose-700'
  const spans = withSpans(rows)
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className={`px-4 py-2 font-bold text-sm ${head}`}>{title} <span className="text-xs font-normal text-slate-500">· 예산 {f(tB)} / 당월 {f(tM)} / 누적 {f(tC)} / 잔액 {f(tB - tC)}</span></div>
      <div className="overflow-x-auto">
        <table className="w-full text-[11px] border-collapse">
          <thead>
            <tr className="bg-slate-100 text-slate-600 font-bold">
              <th colSpan={3} className="px-2 py-1.5 border border-slate-200">계정과목</th>
              <th rowSpan={2} className="px-2 py-1.5 border border-slate-200 text-right w-[100px]">예산액</th>
              <th rowSpan={2} className="px-2 py-1.5 border border-slate-200 text-right w-[100px]">당월결산</th>
              <th rowSpan={2} className="px-2 py-1.5 border border-slate-200 text-right w-[100px]">누적결산</th>
              <th rowSpan={2} className="px-2 py-1.5 border border-slate-200 text-right w-[100px]">잔액</th>
              <th rowSpan={2} className="px-2 py-1.5 border border-slate-200 text-right w-[60px]">집행률</th>
            </tr>
            <tr className="bg-slate-50 text-slate-500 font-bold">
              <th className="px-2 py-1.5 border border-slate-200 w-[80px]">관</th>
              <th className="px-2 py-1.5 border border-slate-200 w-[110px]">항</th>
              <th className="px-2 py-1.5 border border-slate-200 text-left">목</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={8} className="px-2 py-8 text-center text-slate-400">계정과목이 없습니다. (설정 › 회계계정관리)</td></tr>}
            {spans.map(({ r, firstG, firstH, gSpan, hSpan }, i) => {
              const rem = r.budget - r.cumul
              const rate = r.budget > 0 ? Math.round(r.cumul / r.budget * 100) : 0
              return (
                <tr key={i} className="hover:bg-slate-50/60">
                  {firstG && <td rowSpan={gSpan} className="px-1 py-1.5 border border-slate-200 text-center align-middle bg-violet-50/40"><div className="flex flex-col items-center gap-0.5"><span className={GWAN_BADGE}>관</span><span className="font-bold text-slate-700">{r.gwanCode}</span><span className="text-[10px] text-slate-600 leading-tight">{r.gwanName}</span></div></td>}
                  {firstH && <td rowSpan={hSpan} className="px-1 py-1.5 border border-slate-200 text-center align-middle bg-sky-50/40"><div className="flex flex-col items-center gap-0.5"><span className={HANG_BADGE}>항</span><span className="font-semibold text-slate-600">{r.hangCode}</span><span className="text-[10px] text-slate-600 leading-tight">{r.hangName}</span></div></td>}
                  <td className="px-2 py-1.5 border border-slate-200"><div className="flex items-center gap-1"><span className={MOK_BADGE}>목</span><span className="font-bold text-slate-700">{r.code}</span><span className="text-slate-600">{r.name}</span></div></td>
                  <td className="px-2 py-1.5 border border-slate-200 text-right">{r.budget ? f(r.budget) : ''}</td>
                  <td className="px-2 py-1.5 border border-slate-200 text-right text-slate-700">{r.month ? f(r.month) : ''}</td>
                  <td className="px-2 py-1.5 border border-slate-200 text-right font-bold text-slate-800">{r.cumul ? f(r.cumul) : ''}</td>
                  <td className={`px-2 py-1.5 border border-slate-200 text-right ${rem < 0 ? 'text-rose-600' : 'text-slate-600'}`}>{r.budget || r.cumul ? f(rem) : ''}</td>
                  <td className={`px-2 py-1.5 border border-slate-200 text-right ${rate > 100 ? 'text-rose-600' : 'text-blue-600'}`}>{r.budget ? `${rate}%` : ''}</td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="bg-yellow-50 font-bold text-slate-700">
              <td colSpan={3} className="px-2 py-2 border border-slate-200 text-right">합계</td>
              <td className="px-2 py-2 border border-slate-200 text-right">{f(tB)}</td>
              <td className="px-2 py-2 border border-slate-200 text-right">{f(tM)}</td>
              <td className="px-2 py-2 border border-slate-200 text-right text-blue-700">{f(tC)}</td>
              <td className="px-2 py-2 border border-slate-200 text-right">{f(tB - tC)}</td>
              <td className="px-2 py-2 border border-slate-200 text-right">{tB > 0 ? `${Math.round(tC / tB * 100)}%` : ''}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

function SettlementMonthlyCoa() {
  const now = useMemo(() => {
    const opts: string[] = []
    for (const y of [2026, 2025, 2024]) for (let m = 12; m >= 1; m--) opts.push(`${y}-${String(m).padStart(2, '0')}`)
    return opts
  }, [])
  const [ym, setYm] = useState('2026-06')
  const [book, setBook] = useState('')
  const [tree, setTree] = useState<MCoaGwan[]>([])
  const [budget, setBudget] = useState<Record<string, { total?: number }[]>>({})
  const [vouchers, setVouchers] = useState<{ type?: string; amount?: number; accountCode?: string; date?: string }[]>([])
  const [loading, setLoading] = useState(false)
  const year = ym.slice(0, 4)

  useEffect(() => {
    setBook(getActiveBook())
    const onCh = (e: Event) => setBook(((e as CustomEvent).detail as string) || '')
    window.addEventListener(BOOK_CHANGE_EVENT, onCh)
    return () => window.removeEventListener(BOOK_CHANGE_EVENT, onCh)
  }, [])

  useEffect(() => {
    if (!book) return
    let alive = true
    setLoading(true)
    Promise.all([
      fetch(`/api/coa?book=${encodeURIComponent(book)}&year=${year}`).then(r => r.json()).catch(() => ({})),
      fetch(`/api/budget?book=${encodeURIComponent(book)}&year=${year}`).then(r => r.json()).catch(() => ({})),
      fetch(`/api/voucher/list?book=${encodeURIComponent(book)}`, { credentials: 'include' }).then(r => r.json()).catch(() => ({})),
    ]).then(([c, b, v]) => {
      if (!alive) return
      setTree(Array.isArray(c?.list) ? c.list : [])
      setBudget((Array.isArray(b?.list) && b.list[0] && (b.list[0] as { basisByMok?: Record<string, { total?: number }[]> }).basisByMok) || {})
      setVouchers(Array.isArray(v?.list) ? v.list : [])
    }).finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [book, year])

  const { byMonth, byCumul } = useMemo(() => {
    const bm: Record<string, number> = {}, bc: Record<string, number> = {}
    for (const vc of vouchers) {
      if (!vc.accountCode || !vc.date) continue
      const d = String(vc.date), dYm = d.slice(0, 7)
      if (d.slice(0, 4) !== year) continue
      const k = (vc.type === '수입' ? '' : 'E') + vc.accountCode
      const amt = Number(vc.amount) || 0
      if (dYm <= ym) bc[k] = (bc[k] || 0) + amt          // 누적(연초~선택월)
      if (dYm === ym) bm[k] = (bm[k] || 0) + amt         // 당월
    }
    return { byMonth: bm, byCumul: bc }
  }, [vouchers, ym, year])

  const incomeRows = useMemo(() => mCoaRows(tree, '세입', budget, byMonth, byCumul), [tree, budget, byMonth, byCumul])
  const expenseRows = useMemo(() => mCoaRows(tree, '세출', budget, byMonth, byCumul), [tree, budget, byMonth, byCumul])

  return (
    <div className="p-3 space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-bold text-slate-700">출납년월</span>
        <select value={ym} onChange={e => setYm(e.target.value)} className="border border-slate-300 rounded px-2 py-1.5 text-xs">
          {now.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <span className="ml-2 text-[11px] text-slate-400">· 장부(<b className="text-slate-600">{bookLabel(book)}</b>) · 결산액=전표입력 집계(당월/누적) · 예산액=예산작성 {loading && <span>· 불러오는 중…</span>}</span>
      </div>
      <MonthlySettleTable title="세입 결산" rows={incomeRows} tone="income" />
      <MonthlySettleTable title="세출 결산" rows={expenseRows} tone="expense" />
    </div>
  )
}

export default function SettlementMonthlyPage() {
  const [itype, setItype] = useState<string | null>(null)
  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json())
      .then(d => setItype((d?.institutionType || d?.profile?.institutionType || 'childcare') as string))
      .catch(() => setItype('childcare'))
  }, [])
  if (itype === null) return null
  if (itype === 'ilovechild') return <SettlementMonthlyCoa />
  return <SettlementMonthlyLegacy />
}
