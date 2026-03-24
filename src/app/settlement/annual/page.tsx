'use client'

import { useState, useMemo } from 'react'
import { incomeAccounts, expenseAccounts, accountCodeMap, subAccountCodeMap } from '@/lib/accounts'

function fmt(n: number) { return n.toLocaleString('ko-KR') }

type AccountRow = {
  code: string; name: string; budget: number; collected: number; uncollected: number; isSub?: boolean
  gwanCode?: string; gwanName?: string; hangCode?: string; hangName?: string
}

// 관-항 매핑 (수입)
const incomeGH: Record<string, { gwanCode: string; gwanName: string; hangCode: string; hangName: string }> = {
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
const expenseGH: Record<string, { gwanCode: string; gwanName: string; hangCode: string; hangName: string }> = {
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

const mockAmounts: Record<string, Partial<AccountRow>> = {
  '1111': { budget: 422168000, collected: 290187128, uncollected: 131980872 },
  '1112': { budget: 27600000, collected: 27501918, uncollected: 98082 },
  '1211': { budget: 64190800, collected: 30611019, uncollected: 33579781 },
  '1221111': { budget: 5000000, collected: 334996, uncollected: 4665004 },
  '1221112': { budget: 52942088, collected: 18104000, uncollected: 34838088 },
  '1221113': { budget: 9600000, collected: 7355989, uncollected: 2244011 },
  '1221121': { budget: 20667130, collected: 6636542, uncollected: 14030588 },
  '1221131': { budget: 0, collected: 0, uncollected: 0 },
  '1221141': { budget: 35731100, collected: 17030000, uncollected: 18701100 },
  '1311': { budget: 140941350, collected: 140941350, uncollected: 0 },
  '1312': { budget: 149048000, collected: 114751150, uncollected: 34296850 },
  '1321': { budget: 22320000, collected: 19327500, uncollected: 2992500 },
  '1323': { budget: 86280000, collected: 85335000, uncollected: 945000 },
  '1324': { budget: 150054970, collected: 150054970, uncollected: 0 },
  '1331': { budget: 0, collected: 0, uncollected: 0 },
  '1411': { budget: 2364000, collected: 1680000, uncollected: 684000 },
  '1511': { budget: 10000000, collected: 0, uncollected: 10000000 },
  '1611': { budget: 0, collected: 0, uncollected: 0 },
  '1612': { budget: 0, collected: 0, uncollected: 0 },
  '1711': { budget: 6000000, collected: 4356402, uncollected: 1643598 },
  '1811': { budget: 500000, collected: 170000, uncollected: 330000 },
  '1911': { budget: 20000, collected: 33288, uncollected: -13288 },
  '1921': { budget: 2000000, collected: 210340, uncollected: 1789660 },
  '1991': { budget: 68532450, collected: 67882450, uncollected: 650000 },
  '1992': { budget: 0, collected: 0, uncollected: 0 },
}

// accounts.ts 기반 계정 목록
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
      rows.push({ code, name: item.label, isSub: true, budget: 0, collected: 0, uncollected: 0 })
    } else {
      const code = accountCodeMap[item.value] || accountCodeMap[item.label]
      if (!code || seen.has(code)) continue
      seen.add(code)
      rows.push({ code, name: item.label, isSub: false, budget: 0, collected: 0, uncollected: 0 })
    }
  }
  rows.sort((a, b) => a.code.localeCompare(b.code))
  return rows.map(r => {
    const gh = incomeGH[r.code] || expenseGH[r.code]
    return { ...r, ...(mockAmounts[r.code] || {}), gwanCode: gh?.gwanCode, gwanName: gh?.gwanName, hangCode: gh?.hangCode, hangName: gh?.hangName }
  })
})()

const TH = 'px-2 py-2.5 text-center font-bold text-slate-600 whitespace-nowrap border-b border-r border-slate-200 text-[11px]'
const TD = 'px-2 py-2 text-center border-b border-r border-slate-100 text-xs'

function AnnualTable({ type, data, f: fmtFn }: { type: 'income' | 'expense'; data: AccountRow[]; f: (n: number) => string }) {
  const isIncome = type === 'income'
  const isExpense = type === 'expense'
  let prevGwan = '', prevHang = ''
  const totalBudget = data.reduce((s, r) => s + r.budget, 0)
  const totalCollected = data.reduce((s, r) => s + r.collected, 0)
  const totalUncollected = data.reduce((s, r) => s + r.uncollected, 0)
  const colCount = isExpense ? 10 : 9

  return (
    <div className="overflow-x-auto border border-slate-200 rounded-lg bg-white">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-slate-100 border-b border-slate-200">
            <th colSpan={6} className={`${TH}`}>과목</th>
            <th rowSpan={2} className={`${TH} w-28`}>예산액</th>
            {isExpense && <th rowSpan={2} className={`${TH} w-28`}>예산현액</th>}
            <th rowSpan={2} className={`${TH} w-28`}>{isIncome ? '수납액' : '지출액'}</th>
            <th rowSpan={2} className={`${TH} w-28 border-r-0`}>{isIncome ? '미수납액' : '잔액'}</th>
          </tr>
          <tr className="bg-slate-50 border-b border-slate-200">
            <th className={`${TH} w-12`}>관</th>
            <th className={`${TH} w-24`}></th>
            <th className={`${TH} w-12`}>항</th>
            <th className={`${TH} w-24`}></th>
            <th className={`${TH} w-16`}>목</th>
            <th className={TH}>계정과목</th>
          </tr>
        </thead>
        <tbody>
          {/* 총계 */}
          <tr className="bg-slate-50 font-bold border-b border-slate-200">
            <td colSpan={6} className={`${TD} text-center text-slate-700 font-bold`}>총계</td>
            <td className={`${TD} text-right text-slate-800 font-bold`}>{fmtFn(totalBudget)}</td>
            {isExpense && <td className={`${TD} text-right text-slate-800 font-bold`}>{fmtFn(totalBudget)}</td>}
            <td className={`${TD} text-right ${isIncome ? 'text-blue-700' : 'text-red-600'} font-bold`}>{fmtFn(totalCollected)}</td>
            <td className={`${TD} text-right text-slate-800 font-bold border-r-0`}>{fmtFn(totalUncollected)}</td>
          </tr>
          {(() => {
            let prevParentName = ''
            return data.map((row, idx) => {
              const showGwan = row.gwanCode !== prevGwan && !row.isSub
              const showHang = (row.hangCode !== prevHang || showGwan) && !row.isSub
              if (!row.isSub) { prevGwan = row.gwanCode || ''; prevHang = row.hangCode || ''; prevParentName = row.name }
              const rawCode = row.code.substring(1)
              const mokCode = row.isSub ? rawCode.substring(0, 3) + '-' + rawCode.substring(3) : rawCode
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
                  {isExpense && <td className={`${TD} text-right ${row.budget > 0 ? 'text-slate-800' : 'text-slate-300'}`}>{fmtFn(row.budget)}</td>}
                  <td className={`${TD} text-right ${row.collected > 0 ? 'text-slate-800' : 'text-slate-300'}`}>{fmtFn(row.collected)}</td>
                  <td className={`${TD} text-right border-r-0 ${row.uncollected > 0 ? 'text-slate-800' : row.uncollected < 0 ? 'text-red-600' : 'text-slate-300'}`}>{row.uncollected < 0 ? `▲${fmtFn(Math.abs(row.uncollected))}` : fmtFn(row.uncollected)}</td>
                </tr>
              )
            })
          })()}
        </tbody>
      </table>
    </div>
  )
}

export default function SettlementAnnualPage() {
  const now = new Date()
  const yearOpts = Array.from({ length: 5 }, (_, i) => String(now.getFullYear() - i))
  const [selectedYear, setSelectedYear] = useState(yearOpts[0])

  const incomeData = accountData.filter(r => r.code.startsWith('1'))
  const expenseData = accountData.filter(r => r.code.startsWith('2'))
  const [unit, setUnit] = useState<'won' | 'thousand'>('won')
  const [printArea, setPrintArea] = useState({ cover: true, overview: true, income: true, expense: true })
  const [overview, setOverview] = useState({
    depositor: '', institution: '',
    periodFromY: '', periodFromM: '', periodFromD: '',
    periodToY: '', periodToM: '', periodToD: '',
    generalA: '0', generalB: '0', generalC: '0', generalTotal: '0',
    retireA: '0', retireB: '0', retireC: '0', retireTotal: '0',
  })
  const f = (n: number) => unit === 'thousand' ? fmt(Math.round(n / 1000)) : fmt(n)

  return (
    <div className="p-3 space-y-3">
      {/* 상단 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-700">결산년도 선택</span>
          <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)} className="border border-slate-300 rounded px-2 py-1.5 text-xs">
            {yearOpts.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors">조회</button>
        </div>
      </div>

      {/* 세입세출결산 총괄설명서 */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700">세입/세출 외 적립금 결산 보고</span>
            <div className="relative group">
              <svg className="w-4 h-4 text-slate-400 cursor-pointer hover:text-slate-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
              <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-[9999] hidden group-hover:block pointer-events-none">
                <div className="bg-white text-slate-700 border border-slate-200 text-[11px] rounded-lg px-4 py-3 shadow-xl leading-relaxed whitespace-nowrap">
                  <div className="absolute left-1/2 -translate-x-1/2 -top-1 w-2 h-2 bg-white border-l border-t border-slate-200 rotate-45" />
                  <p>A. 전 회계연도 결산 시 누적적립액</p>
                  <p className="mt-1">B. 당해 회계연도 내 적립금(511)으로 실제 집행된 적립금 누계액</p>
                  <p className="mt-1">C. 적립금 사용을 위해 인출한 금액으로 적립금 처분 수입(611)으로 편성된 금액</p>
                </div>
              </div>
            </div>
          </div>
          <button className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors">저장</button>
        </div>
        <div className="p-4">
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr>
                  <th className="px-3 py-2 border border-slate-200 bg-slate-50 font-bold text-slate-600" colSpan={2}>구분</th>
                  <th className="px-3 py-2 border border-slate-200 bg-slate-50 font-bold text-slate-600 w-36">전 회계연도 적립액<br />(A)</th>
                  <th className="px-3 py-2 border border-slate-200 bg-slate-50 font-bold text-slate-600 w-36">당 회계연도 적립액<br />(B)</th>
                  <th className="px-3 py-2 border border-slate-200 bg-slate-50 font-bold text-slate-600 w-36">인출액<br />(C)</th>
                  <th className="px-3 py-2 border border-slate-200 bg-slate-50 font-bold text-slate-600 w-36">누적 적립액<br />(A)+(B)-(C)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="px-3 py-2 border border-slate-200 bg-slate-50 font-bold text-slate-600 text-center w-20">예금주</td>
                  <td className="px-2 py-1.5 border border-slate-200" colSpan={5}>
                    <div className="flex items-center gap-4">
                      <input type="text" value={overview.depositor} onChange={e => setOverview(p => ({ ...p, depositor: e.target.value }))} className="w-48 px-2 py-1 border border-teal-300 rounded text-xs focus:outline-none focus:border-blue-400" />
                      <span className="text-xs font-bold text-slate-600">적립기관</span>
                      <input type="text" value={overview.institution} onChange={e => setOverview(p => ({ ...p, institution: e.target.value }))} className="w-48 px-2 py-1 border border-teal-300 rounded text-xs focus:outline-none focus:border-blue-400" />
                      <span className="text-xs font-bold text-slate-600">적립기간</span>
                      <div className="flex items-center gap-0.5 text-xs">
                        <input type="text" value={overview.periodFromY} onChange={e => setOverview(p => ({ ...p, periodFromY: e.target.value }))} className="w-10 px-1 py-1 border border-teal-300 rounded text-center focus:outline-none focus:border-blue-400" />년
                        <input type="text" value={overview.periodFromM} onChange={e => setOverview(p => ({ ...p, periodFromM: e.target.value }))} className="w-7 px-1 py-1 border border-teal-300 rounded text-center focus:outline-none focus:border-blue-400" />월
                        <input type="text" value={overview.periodFromD} onChange={e => setOverview(p => ({ ...p, periodFromD: e.target.value }))} className="w-7 px-1 py-1 border border-teal-300 rounded text-center focus:outline-none focus:border-blue-400" />일~
                        <input type="text" value={overview.periodToY} onChange={e => setOverview(p => ({ ...p, periodToY: e.target.value }))} className="w-10 px-1 py-1 border border-teal-300 rounded text-center focus:outline-none focus:border-blue-400" />년
                        <input type="text" value={overview.periodToM} onChange={e => setOverview(p => ({ ...p, periodToM: e.target.value }))} className="w-7 px-1 py-1 border border-teal-300 rounded text-center focus:outline-none focus:border-blue-400" />월
                        <input type="text" value={overview.periodToD} onChange={e => setOverview(p => ({ ...p, periodToD: e.target.value }))} className="w-7 px-1 py-1 border border-teal-300 rounded text-center focus:outline-none focus:border-blue-400" />일
                      </div>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td rowSpan={2} className="px-3 py-2 border border-slate-200 bg-slate-50 font-bold text-slate-600 text-center">적립금</td>
                  <td className="px-3 py-2 border border-slate-200 bg-slate-50 font-bold text-slate-600 text-center">일반적립금</td>
                  <td className="px-2 py-1.5 border border-slate-200">
                    <input type="text" value={overview.generalA} onChange={e => setOverview(p => ({ ...p, generalA: e.target.value }))} className="w-full px-2 py-1 border border-teal-300 rounded text-right focus:outline-none focus:border-blue-400" />
                  </td>
                  <td className="px-2 py-1.5 border border-slate-200">
                    <input type="text" value={overview.generalB} onChange={e => setOverview(p => ({ ...p, generalB: e.target.value }))} className="w-full px-2 py-1 border border-teal-300 rounded text-right focus:outline-none focus:border-blue-400" />
                  </td>
                  <td className="px-2 py-1.5 border border-slate-200">
                    <input type="text" value={overview.generalC} onChange={e => setOverview(p => ({ ...p, generalC: e.target.value }))} className="w-full px-2 py-1 border border-teal-300 rounded text-right focus:outline-none focus:border-blue-400" />
                  </td>
                  <td className="px-2 py-1.5 border border-slate-200">
                    <input type="text" value={overview.generalTotal} onChange={e => setOverview(p => ({ ...p, generalTotal: e.target.value }))} className="w-full px-2 py-1 border border-teal-300 rounded text-right focus:outline-none focus:border-blue-400" />
                  </td>
                </tr>
                <tr>
                  <td className="px-3 py-2 border border-slate-200 bg-slate-50 font-bold text-slate-600 text-center">퇴직적립금</td>
                  <td className="px-2 py-1.5 border border-slate-200">
                    <input type="text" value={overview.retireA} onChange={e => setOverview(p => ({ ...p, retireA: e.target.value }))} className="w-full px-2 py-1 border border-teal-300 rounded text-right focus:outline-none focus:border-blue-400" />
                  </td>
                  <td className="px-2 py-1.5 border border-slate-200">
                    <input type="text" value={overview.retireB} onChange={e => setOverview(p => ({ ...p, retireB: e.target.value }))} className="w-full px-2 py-1 border border-teal-300 rounded text-right focus:outline-none focus:border-blue-400" />
                  </td>
                  <td className="px-2 py-1.5 border border-slate-200">
                    <input type="text" value={overview.retireC} onChange={e => setOverview(p => ({ ...p, retireC: e.target.value }))} className="w-full px-2 py-1 border border-teal-300 rounded text-right focus:outline-none focus:border-blue-400" />
                  </td>
                  <td className="px-2 py-1.5 border border-slate-200">
                    <input type="text" value={overview.retireTotal} onChange={e => setOverview(p => ({ ...p, retireTotal: e.target.value }))} className="w-full px-2 py-1 border border-teal-300 rounded text-right focus:outline-none focus:border-blue-400" />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 수입 */}
      <div>
        <div className="px-1 py-1.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-blue-700">수입</span>
            <button onClick={() => document.getElementById('annual-expense')?.scrollIntoView({ behavior: 'smooth' })} className="text-xs font-bold text-red-500 hover:text-red-700 hover:underline transition-colors cursor-pointer">지출 ↓</button>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-1.5 border border-slate-200 rounded-lg px-2 py-1">
              <label className="flex items-center gap-0.5 text-[10px] text-slate-600 cursor-pointer">
                <input type="checkbox" checked={printArea.cover} onChange={e => setPrintArea(p => ({ ...p, cover: e.target.checked }))} className="w-3 h-3 accent-slate-600 rounded" />
                <span className="font-bold">표지</span>
              </label>
              <label className="flex items-center gap-0.5 text-[10px] text-slate-600 cursor-pointer">
                <input type="checkbox" checked={printArea.overview} onChange={e => setPrintArea(p => ({ ...p, overview: e.target.checked }))} className="w-3 h-3 accent-slate-600 rounded" />
                <span className="font-bold">총괄설명서</span>
              </label>
              <label className="flex items-center gap-0.5 text-[10px] text-slate-600 cursor-pointer">
                <input type="checkbox" checked={printArea.income} onChange={e => setPrintArea(p => ({ ...p, income: e.target.checked }))} className="w-3 h-3 accent-blue-600 rounded" />
                <span className="font-bold text-blue-600">세입</span>
              </label>
              <label className="flex items-center gap-0.5 text-[10px] text-slate-600 cursor-pointer">
                <input type="checkbox" checked={printArea.expense} onChange={e => setPrintArea(p => ({ ...p, expense: e.target.checked }))} className="w-3 h-3 accent-red-600 rounded" />
                <span className="font-bold text-red-600">세출</span>
              </label>
              <div className="w-px h-4 bg-slate-200 mx-0.5" />
              <button onClick={() => setPrintArea({ cover: true, overview: true, income: true, expense: true })} className="text-[10px] font-bold text-slate-500 hover:text-slate-700 transition-colors">전체</button>
              <div className="w-px h-4 bg-slate-200 mx-0.5" />
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
                <input type="radio" name="annualUnit" checked={unit === 'won'} onChange={() => setUnit('won')} className="w-3 h-3 accent-blue-600" />
                <span>원</span>
              </label>
              <label className="flex items-center gap-0.5 text-[10px] text-slate-500 cursor-pointer">
                <input type="radio" name="annualUnit" checked={unit === 'thousand'} onChange={() => setUnit('thousand')} className="w-3 h-3 accent-blue-600" />
                <span>천원</span>
              </label>
            </div>
          </div>
        </div>
        <AnnualTable type="income" data={incomeData} f={f} />
      </div>

      {/* 지출 */}
      <div id="annual-expense">
        <div className="px-1 py-1.5 flex items-center gap-3">
          <span className="text-xs font-bold text-red-700">지출</span>
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="text-xs font-bold text-blue-500 hover:text-blue-700 hover:underline transition-colors cursor-pointer">수입 ↑</button>
        </div>
        <AnnualTable type="expense" data={expenseData} f={f} />
      </div>
    </div>
  )
}
