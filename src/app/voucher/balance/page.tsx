'use client'

import { useState } from 'react'

interface MonthlyBalance {
  month: string
  label: string
  bankAmounts: Record<string, number>
  bankTotal: number
  accountBalance: number
  diff: number
  matched: boolean
}

const banks = ['신한은행', '국민은행', '농협', '우리은행']

const sampleData: MonthlyBalance[] = [
  { month: '2026-03', label: '2026년 03월', bankAmounts: { '신한은행': 39069438, '국민은행': 0, '농협': 0, '우리은행': 0 }, bankTotal: 39069438, accountBalance: -3469148, diff: 42538586, matched: false },
  { month: '2026-04', label: '2026년 04월', bankAmounts: { '신한은행': 0, '국민은행': 0, '농협': 0, '우리은행': 0 }, bankTotal: 0, accountBalance: 0, diff: 0, matched: true },
  { month: '2026-05', label: '2026년 05월', bankAmounts: { '신한은행': 0, '국민은행': 0, '농협': 0, '우리은행': 0 }, bankTotal: 0, accountBalance: 0, diff: 0, matched: true },
  { month: '2026-06', label: '2026년 06월', bankAmounts: { '신한은행': 0, '국민은행': 0, '농협': 0, '우리은행': 0 }, bankTotal: 0, accountBalance: 0, diff: 0, matched: true },
  { month: '2026-07', label: '2026년 07월', bankAmounts: { '신한은행': 0, '국민은행': 0, '농협': 0, '우리은행': 0 }, bankTotal: 0, accountBalance: 0, diff: 0, matched: true },
  { month: '2026-08', label: '2026년 08월', bankAmounts: { '신한은행': 0, '국민은행': 0, '농협': 0, '우리은행': 0 }, bankTotal: 0, accountBalance: 0, diff: 0, matched: true },
  { month: '2026-09', label: '2026년 09월', bankAmounts: { '신한은행': 0, '국민은행': 0, '농협': 0, '우리은행': 0 }, bankTotal: 0, accountBalance: 0, diff: 0, matched: true },
  { month: '2026-10', label: '2026년 10월', bankAmounts: { '신한은행': 0, '국민은행': 0, '농협': 0, '우리은행': 0 }, bankTotal: 0, accountBalance: 0, diff: 0, matched: true },
  { month: '2026-11', label: '2026년 11월', bankAmounts: { '신한은행': 0, '국민은행': 0, '농협': 0, '우리은행': 0 }, bankTotal: 0, accountBalance: 0, diff: 0, matched: true },
  { month: '2026-12', label: '2026년 12월', bankAmounts: { '신한은행': 0, '국민은행': 0, '농협': 0, '우리은행': 0 }, bankTotal: 0, accountBalance: 0, diff: 0, matched: true },
  { month: '2027-01', label: '2027년 01월', bankAmounts: { '신한은행': 0, '국민은행': 0, '농협': 0, '우리은행': 0 }, bankTotal: 0, accountBalance: 0, diff: 0, matched: true },
  { month: '2027-02', label: '2027년 02월', bankAmounts: { '신한은행': 0, '국민은행': 0, '농협': 0, '우리은행': 0 }, bankTotal: 0, accountBalance: 0, diff: 0, matched: true },
]

const fmt = (n: number) => n ? n.toLocaleString('ko-KR') : '0'

const tabs = ['회계잔액 비교'] as const
const subTabs = ['월별 통장잔고 비교', '월별 통장잔고 검증', '일별 통장잔고 검증'] as const

export default function BalancePage() {
  const [year, setYear] = useState(2026)
  const [activeTab, setActiveTab] = useState<typeof tabs[number]>('회계잔액 비교')
  const [activeSubTab, setActiveSubTab] = useState<typeof subTabs[number]>('월별 통장잔고 비교')

  const yearOptions = Array.from({ length: 5 }, (_, i) => 2024 + i)

  return (
    <div className="space-y-3">
      {/* 상단 탭 + 회계년 선택 */}
      <div className="bg-white rounded-xl border border-[#f5b800]/30 shadow-sm">
        <div className="px-4 py-3 flex items-center gap-3 border-b border-[#f5b800]/20 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500 font-medium">회계년 선택</span>
            <select value={year} onChange={e => setYear(Number(e.target.value))}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-medium text-slate-700">
              {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <span className="text-xs text-slate-400">년도</span>
          </div>
          <span className="text-sm font-bold text-slate-700 ml-4">회계잔액 비교</span>
          <div className="relative group ml-auto">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg cursor-help">
              <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
              </svg>
              <span className="text-xs text-blue-600 font-medium">참고</span>
            </div>
            <div className="hidden group-hover:block absolute top-full right-0 mt-2 bg-white text-slate-700 text-[11px] rounded-xl px-4 py-3 z-50 w-[440px] shadow-xl border border-blue-200">
              <p className="mb-1.5 flex items-start gap-1"><span className="text-red-500 font-bold">*</span> 계좌잔액 합계잔고(A)와 회계잔액(B)는 반드시 일치해야 합니다</p>
              <p className="flex items-start gap-1"><span className="text-red-500 font-bold">*</span> 계좌잔액(A)와 회계잔액(B)는 미일치시는 통장등록(추가분) 여부 또는 수기입력(전년도이월금,반납전표 등) 반드시 체크바랍니다</p>
              <div className="absolute -top-1.5 right-5 w-3 h-3 bg-white border-l border-t border-blue-200 rotate-45"></div>
            </div>
          </div>
        </div>

        {/* 서브탭 */}
        <div className="px-4 py-2 flex items-center gap-2 border-b border-slate-100">
          {subTabs.map(sub => (
            <button key={sub} onClick={() => setActiveSubTab(sub)}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                activeSubTab === sub
                  ? 'bg-[#fffbeb] text-[#f5b800] border-b-2 border-[#f5b800] font-bold'
                  : 'text-slate-500 hover:text-slate-700'
              }`}>
              {sub}
            </button>
          ))}
        </div>

      </div>

      {/* 테이블 */}
      <div className="bg-white rounded-xl border border-[#f5b800]/30 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#fffbeb] border-b border-[#f5b800]/30">
              <th rowSpan={2} className="text-center px-4 py-2.5 font-normal text-slate-700 w-32 border-r border-slate-300">입금일자</th>
              <th colSpan={banks.length + 1} className="text-center px-4 py-2 font-normal text-slate-700 border-r border-slate-300">계좌잔액</th>
              <th rowSpan={2} className="text-center px-4 py-2.5 font-normal text-slate-700 w-36 border-r border-slate-300">회계잔액(B)</th>
              <th rowSpan={2} className="text-center px-4 py-2.5 font-normal text-slate-700 w-40 border-r border-slate-300">비교차액(A)-(B)</th>
              <th rowSpan={2} className="text-center px-4 py-2.5 font-normal text-slate-700 w-20">확인</th>
            </tr>
            <tr className="bg-[#fffbeb] border-b border-[#f5b800]/30">
              {banks.map(bank => (
                <th key={bank} className="text-center px-4 py-2 font-normal text-slate-600 w-32 border-r border-slate-200">{bank}</th>
              ))}
              <th className="text-center px-4 py-2 font-normal text-blue-700 w-32 border-r border-slate-300 underline">합계</th>
            </tr>
          </thead>
          <tbody>
            {sampleData.map((row, idx) => {
              const isLastRow = idx === sampleData.length - 1
              return (
                <tr key={row.month} className={`border-b border-[#f5b800]/20 hover:bg-[#fffbeb] ${idx % 2 === 1 ? 'bg-[#fffbeb]/30' : 'bg-white'}`}>
                  <td className="text-center px-4 py-3 font-medium text-slate-700 border-r border-slate-100">{row.label}</td>
                  {banks.map(bank => (
                    <td key={bank} className="text-right px-4 py-3 text-slate-600 border-r border-slate-100">{fmt(row.bankAmounts[bank])} 원</td>
                  ))}
                  <td className="text-right px-4 py-3 text-slate-700 font-medium border-r border-slate-100">{fmt(row.bankTotal)} 원</td>
                  <td className={`text-right px-4 py-3 font-medium border-r border-slate-100 ${row.accountBalance < 0 ? 'text-red-600' : 'text-slate-700'}`}>{fmt(row.accountBalance)} 원</td>
                  <td className="text-right px-4 py-3 text-slate-700 font-medium border-r border-slate-100">{fmt(row.diff)} 원</td>
                  <td className="text-center px-4 py-3">
                    {!row.matched && row.diff !== 0 ? (
                      <span className="text-red-500 font-bold text-xs">불일치</span>
                    ) : null}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="pb-40"></div>
    </div>
  )
}
