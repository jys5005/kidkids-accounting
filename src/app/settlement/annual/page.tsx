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
const expenseGH: Record<string, { gwanCode: string; gwanName: string; hangCode: string; hangName: string }> = {
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

const mockAmounts: Record<string, Partial<AccountRow>> = {
  '1111': { budget: 422168000, collected: 290187128, uncollected: 131980872 },
  '1112': { budget: 27600000, collected: 27501918, uncollected: 98082 },
  '1211': { budget: 64190800, collected: 30611019, uncollected: 33579781 },
  '12211': { budget: 5000000, collected: 334996, uncollected: 4665004 },
  '12212': { budget: 52942088, collected: 18104000, uncollected: 34838088 },
  '12213': { budget: 9600000, collected: 7355989, uncollected: 2244011 },
  '12214': { budget: 20667130, collected: 6636542, uncollected: 14030588 },
  '12215': { budget: 0, collected: 0, uncollected: 0 },
  '12216': { budget: 35731100, collected: 17030000, uncollected: 18701100 },
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

function AnnualTable({ type, data }: { type: 'income' | 'expense'; data: AccountRow[] }) {
  const isIncome = type === 'income'
  let prevGwan = '', prevHang = ''
  const totalBudget = data.reduce((s, r) => s + r.budget, 0)
  const totalCollected = data.reduce((s, r) => s + r.collected, 0)
  const totalUncollected = data.reduce((s, r) => s + r.uncollected, 0)

  return (
    <div className="overflow-x-auto border border-slate-200 rounded-lg bg-white">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-slate-100 border-b border-slate-200">
            <th colSpan={6} className={`${TH}`}>과목</th>
            <th rowSpan={2} className={`${TH} w-28`}>예산액</th>
            <th rowSpan={2} className={`${TH} w-28`}>{isIncome ? '수납액' : '지출액'}</th>
            <th rowSpan={2} className={`${TH} w-28 border-r-0`}>{isIncome ? '미수납액' : '잔액'}</th>
          </tr>
          <tr className="bg-slate-50 border-b border-slate-200">
            <th className={`${TH} w-8`}>관</th>
            <th className={`${TH} w-24`}></th>
            <th className={`${TH} w-8`}>항</th>
            <th className={`${TH} w-24`}></th>
            <th className={`${TH} w-16`}>목</th>
            <th className={TH}>계정과목</th>
          </tr>
        </thead>
        <tbody>
          {/* 총계 */}
          <tr className="bg-slate-50 font-bold border-b border-slate-200">
            <td colSpan={6} className={`${TD} text-center text-slate-700 font-bold`}>총계</td>
            <td className={`${TD} text-right text-slate-800 font-bold`}>{fmt(totalBudget)}</td>
            <td className={`${TD} text-right ${isIncome ? 'text-blue-700' : 'text-red-600'} font-bold`}>{fmt(totalCollected)}</td>
            <td className={`${TD} text-right text-slate-800 font-bold border-r-0`}>{fmt(totalUncollected)}</td>
          </tr>
          {data.map((row, idx) => {
            const showGwan = row.gwanCode !== prevGwan && !row.isSub
            const showHang = (row.hangCode !== prevHang || showGwan) && !row.isSub
            if (!row.isSub) { prevGwan = row.gwanCode || ''; prevHang = row.hangCode || '' }
            const rawCode = row.code.substring(1)
            const mokCode = row.isSub ? rawCode.substring(0, 3) + '-' + rawCode.substring(3) : rawCode
            return (
              <tr key={idx} className="hover:bg-slate-50 transition-colors">
                <td className={`${TD} text-slate-500 font-medium`}>{showGwan ? row.gwanCode : ''}</td>
                <td className={`${TD} text-left text-slate-600 text-[11px]`}>{showGwan ? row.gwanName : ''}</td>
                <td className={`${TD} text-slate-500 font-medium`}>{showHang ? row.hangCode : ''}</td>
                <td className={`${TD} text-left text-slate-600 text-[11px]`}>{showHang ? row.hangName : ''}</td>
                <td className={`${TD} font-medium ${row.isSub ? 'text-slate-400' : 'text-slate-600'}`}>{mokCode}</td>
                <td className={`${TD} text-left px-2 ${row.isSub ? 'text-slate-500 pl-4' : 'text-slate-700 font-medium'}`}>{row.name}</td>
                <td className={`${TD} text-right ${row.budget > 0 ? 'text-slate-800' : 'text-slate-300'}`}>{fmt(row.budget)}</td>
                <td className={`${TD} text-right ${row.collected > 0 ? 'text-slate-800' : 'text-slate-300'}`}>{fmt(row.collected)}</td>
                <td className={`${TD} text-right border-r-0 ${row.uncollected > 0 ? 'text-slate-800' : row.uncollected < 0 ? 'text-red-600' : 'text-slate-300'}`}>{row.uncollected < 0 ? `▲${fmt(Math.abs(row.uncollected))}` : fmt(row.uncollected)}</td>
              </tr>
            )
          })}
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

  return (
    <div className="p-6 space-y-4">
      {/* 상단 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-700">결산년도 선택</span>
          <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)} className="border border-slate-300 rounded px-2 py-1.5 text-xs">
            {yearOpts.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button className="px-3 py-1.5 text-xs font-bold text-white bg-[#f5b800] hover:bg-[#d4a000] rounded transition-colors">조회</button>
        </div>
        <div className="flex items-center gap-2">
          <button className="w-8 h-8 flex items-center justify-center bg-white hover:bg-green-50 border border-green-400 rounded transition-colors" title="엑셀다운로드">
            <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          </button>
          <button className="w-8 h-8 flex items-center justify-center bg-white hover:bg-slate-50 border border-slate-300 rounded transition-colors" title="인쇄하기">
            <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2z" /></svg>
          </button>
        </div>
      </div>

      {/* 어린이집명 + 금액단위 */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-slate-800">베르힐라온어린이집</span>
        <span className="text-xs text-slate-400">금액 단위:원</span>
      </div>

      {/* 수입 */}
      <div>
        <div className="px-1 py-1.5 flex items-center gap-3">
          <span className="text-xs font-bold text-blue-700">수입</span>
          <button onClick={() => document.getElementById('annual-expense')?.scrollIntoView({ behavior: 'smooth' })} className="text-xs font-bold text-red-500 hover:text-red-700 hover:underline transition-colors cursor-pointer">지출 ↓</button>
        </div>
        <AnnualTable type="income" data={incomeData} />
      </div>

      {/* 지출 */}
      <div id="annual-expense">
        <div className="px-1 py-1.5 flex items-center gap-3">
          <span className="text-xs font-bold text-red-700">지출</span>
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="text-xs font-bold text-blue-500 hover:text-blue-700 hover:underline transition-colors cursor-pointer">수입 ↑</button>
        </div>
        <AnnualTable type="expense" data={expenseData} />
      </div>
    </div>
  )
}
