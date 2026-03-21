'use client'

import { useState, useMemo } from 'react'
import { incomeAccounts, expenseAccounts, accountCodeMap, subAccountCodeMap } from '@/lib/accounts'

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
  '1111': { gwanCode: '01', gwanName: '보육료', hangCode: '11', hangName: '보육료' },
  '1112': { gwanCode: '01', gwanName: '보육료', hangCode: '11', hangName: '보육료' },
  '1211': { gwanCode: '02', gwanName: '수익자부담 수입', hangCode: '21', hangName: '선택적 보육활동비' },
  '1221': { gwanCode: '02', gwanName: '수익자부담 수입', hangCode: '22', hangName: '기타 필요경비' },
  '12211': { gwanCode: '02', gwanName: '수익자부담 수입', hangCode: '22', hangName: '기타 필요경비' },
  '12212': { gwanCode: '02', gwanName: '수익자부담 수입', hangCode: '22', hangName: '기타 필요경비' },
  '12213': { gwanCode: '02', gwanName: '수익자부담 수입', hangCode: '22', hangName: '기타 필요경비' },
  '12214': { gwanCode: '02', gwanName: '수익자부담 수입', hangCode: '22', hangName: '기타 필요경비' },
  '12215': { gwanCode: '02', gwanName: '수익자부담 수입', hangCode: '22', hangName: '기타 필요경비' },
  '12216': { gwanCode: '02', gwanName: '수익자부담 수입', hangCode: '22', hangName: '기타 필요경비' },
  '1311': { gwanCode: '03', gwanName: '보조금 및 지원금', hangCode: '31', hangName: '인건비 보조금' },
  '1312': { gwanCode: '03', gwanName: '보조금 및 지원금', hangCode: '32', hangName: '운영보조금' },
  '1321': { gwanCode: '03', gwanName: '보조금 및 지원금', hangCode: '32', hangName: '운영보조금' },
  '1323': { gwanCode: '03', gwanName: '보조금 및 지원금', hangCode: '32', hangName: '운영보조금' },
  '1324': { gwanCode: '03', gwanName: '보조금 및 지원금', hangCode: '32', hangName: '운영보조금' },
  '1331': { gwanCode: '03', gwanName: '보조금 및 지원금', hangCode: '33', hangName: '자본 보조금' },
  '1411': { gwanCode: '04', gwanName: '전입금', hangCode: '41', hangName: '전입금' },
  '1511': { gwanCode: '04', gwanName: '전입금', hangCode: '42', hangName: '차입금' },
  '1521': { gwanCode: '04', gwanName: '전입금', hangCode: '42', hangName: '차입금' },
  '1611': { gwanCode: '05', gwanName: '기부금', hangCode: '51', hangName: '기부금' },
  '1612': { gwanCode: '05', gwanName: '기부금', hangCode: '51', hangName: '기부금' },
  '1711': { gwanCode: '06', gwanName: '적립금', hangCode: '61', hangName: '적립금' },
  '1811': { gwanCode: '07', gwanName: '과년도 수입', hangCode: '71', hangName: '과년도 수입' },
  '1911': { gwanCode: '08', gwanName: '잡수입', hangCode: '81', hangName: '잡수입' },
  '1921': { gwanCode: '08', gwanName: '잡수입', hangCode: '81', hangName: '잡수입' },
  '1991': { gwanCode: '09', gwanName: '전년도 이월액', hangCode: '91', hangName: '전년도 이월액' },
  '1992': { gwanCode: '09', gwanName: '전년도 이월액', hangCode: '91', hangName: '전년도 이월액' },
}

// 관-항 매핑 (지출)
const expenseGwanHang: Record<string, { gwanCode: string; gwanName: string; hangCode: string; hangName: string }> = {
  '2111': { gwanCode: '01', gwanName: '인건비', hangCode: '11', hangName: '원장인건비' },
  '2112': { gwanCode: '01', gwanName: '인건비', hangCode: '11', hangName: '원장인건비' },
  '2121': { gwanCode: '01', gwanName: '인건비', hangCode: '12', hangName: '보육교직원인건비' },
  '2122': { gwanCode: '01', gwanName: '인건비', hangCode: '12', hangName: '보육교직원인건비' },
  '2131': { gwanCode: '01', gwanName: '인건비', hangCode: '13', hangName: '기타인건비' },
  '2141': { gwanCode: '01', gwanName: '인건비', hangCode: '14', hangName: '법정부담금·퇴직금' },
  '2142': { gwanCode: '01', gwanName: '인건비', hangCode: '14', hangName: '법정부담금·퇴직금' },
  '21423': { gwanCode: '01', gwanName: '인건비', hangCode: '14', hangName: '법정부담금·퇴직금' },
  '21424': { gwanCode: '01', gwanName: '인건비', hangCode: '14', hangName: '법정부담금·퇴직금' },
  '2211': { gwanCode: '02', gwanName: '관리운영비', hangCode: '21', hangName: '기관운영비' },
  '2212': { gwanCode: '02', gwanName: '관리운영비', hangCode: '21', hangName: '기관운영비' },
  '2213': { gwanCode: '02', gwanName: '관리운영비', hangCode: '21', hangName: '기관운영비' },
  '2214': { gwanCode: '02', gwanName: '관리운영비', hangCode: '21', hangName: '기관운영비' },
  '2215': { gwanCode: '02', gwanName: '관리운영비', hangCode: '21', hangName: '기관운영비' },
  '2216': { gwanCode: '02', gwanName: '관리운영비', hangCode: '21', hangName: '기관운영비' },
  '2217': { gwanCode: '02', gwanName: '관리운영비', hangCode: '21', hangName: '기관운영비' },
  '22171': { gwanCode: '02', gwanName: '관리운영비', hangCode: '21', hangName: '기관운영비' },
  '22172': { gwanCode: '02', gwanName: '관리운영비', hangCode: '21', hangName: '기관운영비' },
  '2218': { gwanCode: '02', gwanName: '관리운영비', hangCode: '22', hangName: '업무추진비' },
  '2219': { gwanCode: '02', gwanName: '관리운영비', hangCode: '22', hangName: '업무추진비' },
  '2220': { gwanCode: '02', gwanName: '관리운영비', hangCode: '22', hangName: '업무추진비' },
  '2311': { gwanCode: '03', gwanName: '보육활동비', hangCode: '31', hangName: '보육활동운영비' },
  '2312': { gwanCode: '03', gwanName: '보육활동비', hangCode: '31', hangName: '보육활동운영비' },
  '2313': { gwanCode: '03', gwanName: '보육활동비', hangCode: '31', hangName: '보육활동운영비' },
  '2314': { gwanCode: '03', gwanName: '보육활동비', hangCode: '31', hangName: '보육활동운영비' },
  '2315': { gwanCode: '03', gwanName: '보육활동비', hangCode: '31', hangName: '보육활동운영비' },
  '2411': { gwanCode: '04', gwanName: '수익자부담 지출', hangCode: '41', hangName: '특별활동비' },
  '2421': { gwanCode: '04', gwanName: '수익자부담 지출', hangCode: '42', hangName: '기타필요경비지출' },
  '24211': { gwanCode: '04', gwanName: '수익자부담 지출', hangCode: '42', hangName: '기타필요경비지출' },
  '24212': { gwanCode: '04', gwanName: '수익자부담 지출', hangCode: '42', hangName: '기타필요경비지출' },
  '24213': { gwanCode: '04', gwanName: '수익자부담 지출', hangCode: '42', hangName: '기타필요경비지출' },
  '24214': { gwanCode: '04', gwanName: '수익자부담 지출', hangCode: '42', hangName: '기타필요경비지출' },
  '24215': { gwanCode: '04', gwanName: '수익자부담 지출', hangCode: '42', hangName: '기타필요경비지출' },
  '2511': { gwanCode: '05', gwanName: '적립금', hangCode: '51', hangName: '적립금' },
  '2611': { gwanCode: '06', gwanName: '상환금', hangCode: '61', hangName: '차입금상환' },
  '2621': { gwanCode: '06', gwanName: '상환금', hangCode: '61', hangName: '차입금상환' },
  '2631': { gwanCode: '06', gwanName: '상환금', hangCode: '62', hangName: '반환금' },
  '2632': { gwanCode: '06', gwanName: '상환금', hangCode: '62', hangName: '반환금' },
  '2641': { gwanCode: '06', gwanName: '상환금', hangCode: '63', hangName: '전출금' },
  '2711': { gwanCode: '07', gwanName: '시설비', hangCode: '71', hangName: '시설비' },
  '2712': { gwanCode: '07', gwanName: '시설비', hangCode: '71', hangName: '시설비' },
  '2721': { gwanCode: '07', gwanName: '시설비', hangCode: '72', hangName: '자산취득비' },
  '27211': { gwanCode: '07', gwanName: '시설비', hangCode: '72', hangName: '자산취득비' },
  '27212': { gwanCode: '07', gwanName: '시설비', hangCode: '72', hangName: '자산취득비' },
  '2811': { gwanCode: '08', gwanName: '과년도 지출', hangCode: '81', hangName: '과년도 지출' },
  '2911': { gwanCode: '09', gwanName: '잡지출·예비비', hangCode: '91', hangName: '잡지출·예비비' },
  '2991': { gwanCode: '09', gwanName: '잡지출·예비비', hangCode: '91', hangName: '잡지출·예비비' },
}

// mock 금액
const mockAmounts: Record<string, Partial<AccountRow>> = {
  '1111': { budget: 415512000, prevAccum: 115448356, thisMonth: 23240823, balance: 276822821 },
  '1112': { budget: 0, prevAccum: 12047988, thisMonth: 1699936, balance: -13747924 },
  '1211': { budget: 33936000, prevAccum: 12499000, thisMonth: 2794000, balance: 18643000 },
  '1221': { budget: 123940318, prevAccum: 49461527, thisMonth: 0, balance: 74478791 },
  '12211': { budget: 5000000, prevAccum: 245000, thisMonth: 0, balance: 4755000 },
  '12212': { budget: 31344000, prevAccum: 7266000, thisMonth: 1612000, balance: 22466000 },
  '12213': { budget: 7200000, prevAccum: 3020000, thisMonth: 660000, balance: 3520000 },
  '12214': { budget: 14400000, prevAccum: 2384389, thisMonth: 621862, balance: 11393749 },
  '12215': { budget: 0, prevAccum: 0, thisMonth: 0, balance: 0 },
  '12216': { budget: 25920000, prevAccum: 7140000, thisMonth: 1610000, balance: 17170000 },
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
  '21423': { budget: 9000000, prevAccum: 8250000, thisMonth: 750000, balance: 0 },
  '21424': { budget: 9000000, prevAccum: 8250000, thisMonth: 750000, balance: 0 },
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

function AccountTable({ type, data }: { type: 'income' | 'expense'; data: AccountRow[] }) {
  const isIncome = type === 'income'
  const color = isIncome ? 'blue' : 'red'
  let prevGwan = '', prevHang = ''

  return (
    <div className="overflow-x-auto border border-slate-200 rounded-lg bg-white">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className={`bg-${color}-50 border-b border-${color}-200`}>
            <th className={`${TH} w-8`}>관</th>
            <th className={`${TH} w-24`}></th>
            <th className={`${TH} w-8`}>항</th>
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
            if (!row.isSub) { prevGwan = row.gwanCode || ''; prevHang = row.hangCode || '' }
            const rawCode = row.code.substring(1)
            const mokCode = row.isSub ? rawCode.substring(0, 3) + '-' + rawCode.substring(3) : rawCode
            const neg = row.balance < 0
            return (
              <tr key={idx} className="hover:bg-slate-50 transition-colors">
                <td className={`${TD} text-slate-500 font-medium`}>{showGwan ? row.gwanCode : ''}</td>
                <td className={`${TD} text-left text-slate-600 text-[11px]`}>{showGwan ? row.gwanName : ''}</td>
                <td className={`${TD} text-slate-500 font-medium`}>{showHang ? row.hangCode : ''}</td>
                <td className={`${TD} text-left text-slate-600 text-[11px]`}>{showHang ? row.hangName : ''}</td>
                <td className={`${TD} font-medium ${row.isSub ? 'text-slate-400' : 'text-slate-600'}`}>{mokCode}</td>
                <td className={`${TD} text-left px-2 ${row.isSub ? 'text-slate-500 pl-4' : 'text-slate-700 font-medium'}`}>{row.name}</td>
                <td className={`${TD} text-right ${row.budget > 0 ? 'text-slate-800' : 'text-slate-300'}`}>{fmt(row.budget)}</td>
                <td className={`${TD} text-right ${row.prevAccum > 0 ? 'text-slate-800' : 'text-slate-300'}`}>{fmt(row.prevAccum)}</td>
                <td className={`${TD} text-right ${row.thisMonth > 0 ? (isIncome ? 'text-blue-700 font-medium' : 'text-red-600 font-medium') : 'text-slate-300'}`}>{row.thisMonth > 0 ? fmt(row.thisMonth) : ''}</td>
                <td className={`${TD} text-right font-medium ${neg ? 'text-red-600' : row.balance > 0 ? 'text-slate-800' : 'text-slate-300'}`}>{neg ? `▲${fmt(Math.abs(row.balance))}` : fmt(row.balance)}</td>
                <td className={`${TD} border-r-0`}></td>
              </tr>
            )
          })}
          <tr className="bg-slate-50 font-bold">
            <td colSpan={6} className={`${TD} text-center text-slate-700`}>합계</td>
            <td className={`${TD} text-right text-slate-800`}>{fmt(data.reduce((s, r) => s + r.budget, 0))}</td>
            <td className={`${TD} text-right text-slate-800`}>{fmt(data.reduce((s, r) => s + r.prevAccum, 0))}</td>
            <td className={`${TD} text-right ${isIncome ? 'text-blue-700' : 'text-red-600'}`}>{fmt(data.reduce((s, r) => s + r.thisMonth, 0))}</td>
            <td className={`${TD} text-right text-slate-800`}>{fmt(data.reduce((s, r) => s + r.balance, 0))}</td>
            <td className={`${TD} border-r-0`}></td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

export default function SettlementMonthlyPage() {
  const ymOpts = useMemo(() => getYmOptions(), [])
  const [selectedYm, setSelectedYm] = useState(ymOpts[1])

  const incomeData = accountData.filter(r => r.code.startsWith('1'))
  const expenseData = accountData.filter(r => r.code.startsWith('2'))

  return (
    <div className="p-6 space-y-4">
      {/* 상단 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-700">결산연월</span>
          <select value={selectedYm} onChange={e => setSelectedYm(e.target.value)} className="border border-slate-300 rounded px-2 py-1.5 text-xs">
            {ymOpts.map(ym => <option key={ym} value={ym}>{ym}</option>)}
          </select>
          <button className="px-3 py-1.5 text-xs font-bold text-white bg-[#f5b800] hover:bg-[#d4a000] rounded transition-colors">조회</button>
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
              <td className={`${TD} text-right font-bold text-slate-800`}>{fmt(incomeData.reduce((s, r) => s + r.budget, 0))}</td>
              <td className={`${TD} text-right font-bold text-slate-800`}>{fmt(incomeData.reduce((s, r) => s + r.prevAccum, 0))}</td>
              <td className={`${TD} text-right font-bold text-blue-700`}>{fmt(incomeData.reduce((s, r) => s + r.thisMonth, 0))}</td>
              <td className={`${TD} text-right font-bold text-slate-800 border-r-0`}>{fmt(incomeData.reduce((s, r) => s + r.balance, 0))}</td>
            </tr>
            <tr className="border-b border-slate-100">
              <td className={`${TD} font-bold text-red-600`}>세출 합계</td>
              <td className={`${TD} text-right font-bold text-slate-800`}>{fmt(expenseData.reduce((s, r) => s + r.budget, 0))}</td>
              <td className={`${TD} text-right font-bold text-slate-800`}>{fmt(expenseData.reduce((s, r) => s + r.prevAccum, 0))}</td>
              <td className={`${TD} text-right font-bold text-red-600`}>{fmt(expenseData.reduce((s, r) => s + r.thisMonth, 0))}</td>
              <td className={`${TD} text-right font-bold text-slate-800 border-r-0`}>{fmt(expenseData.reduce((s, r) => s + r.balance, 0))}</td>
            </tr>
            <tr>
              <td className={`${TD} font-bold text-green-700`}>차액 (세입-세출)</td>
              <td className={`${TD} text-right font-bold text-green-700`}>{fmt(incomeData.reduce((s, r) => s + r.budget, 0) - expenseData.reduce((s, r) => s + r.budget, 0))}</td>
              <td className={`${TD} text-right font-bold text-green-700`}>{fmt(incomeData.reduce((s, r) => s + r.prevAccum, 0) - expenseData.reduce((s, r) => s + r.prevAccum, 0))}</td>
              <td className={`${TD} text-right font-bold text-green-700`}>{fmt(incomeData.reduce((s, r) => s + r.thisMonth, 0) - expenseData.reduce((s, r) => s + r.thisMonth, 0))}</td>
              <td className={`${TD} text-right font-bold text-green-700 border-r-0`}>{fmt(incomeData.reduce((s, r) => s + r.balance, 0) - expenseData.reduce((s, r) => s + r.balance, 0))}</td>
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
          <div className="flex items-center gap-2">
            <button className="w-8 h-8 flex items-center justify-center bg-white hover:bg-slate-50 border border-slate-300 rounded transition-colors" title="인쇄하기">
              <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2z" /></svg>
            </button>
            <button className="w-8 h-8 flex items-center justify-center bg-white hover:bg-green-50 border border-green-400 rounded transition-colors" title="엑셀다운로드">
              <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </button>
          </div>
        </div>
        <AccountTable type="income" data={incomeData} />
      </div>

      {/* 지출 */}
      <div id="expense-section">
        <div className="px-1 py-1.5 flex items-center gap-3">
          <span className="text-xs font-bold text-red-700">지출</span>
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="text-xs font-bold text-blue-500 hover:text-blue-700 hover:underline transition-colors cursor-pointer">수입 ↑</button>
        </div>
        <AccountTable type="expense" data={expenseData} />
      </div>
    </div>
  )
}
