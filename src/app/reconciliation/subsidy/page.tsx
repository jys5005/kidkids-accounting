'use client'

import { useState } from 'react'

function fmt(n: number) { return n.toLocaleString('ko-KR') }

type SubsidyRow = {
  date: string
  name: string
  amount: number
  org: string
  basis: string
}

const mockData: SubsidyRow[] = [
  { date: '2026-03-11', name: '기관보육료', amount: 11391000, org: '기관보육료', basis: '기관보육료' },
  { date: '2026-03-18', name: '연장보육료', amount: 1141000, org: '연장보육료', basis: '연장보육료' },
]

const TH = 'px-3 py-2.5 text-center font-bold text-slate-600 whitespace-nowrap border-b border-slate-200 text-[11px] bg-orange-50'
const TD = 'px-3 py-2.5 text-center border-b border-slate-100 text-xs'

export default function SubsidyPage() {
  const now = new Date()
  const yearOpts = Array.from({ length: 5 }, (_, i) => String(now.getFullYear() - i))
  const [selectedYear, setSelectedYear] = useState(yearOpts[0])
  const toDateStr = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const [dateFrom, setDateFrom] = useState(monthStart)
  const [dateTo, setDateTo] = useState(toDateStr(now))

  const totalAmount = mockData.reduce((s, r) => s + r.amount, 0)

  return (
    <div className="p-6 space-y-4">
      {/* 검색 */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded">회계년도</span>
          <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)} className="border border-slate-300 rounded px-2 py-1.5 text-xs">
            {yearOpts.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-600">발행기간 :</span>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="border border-amber-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-blue-400" />
          <span className="text-xs text-slate-400">~</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="border border-amber-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-blue-400" />
        </div>
        <button className="px-4 py-1.5 text-xs font-bold text-white bg-slate-700 hover:bg-slate-800 rounded transition-colors">검색</button>
      </div>

      {/* 요약 + 버튼 */}
      <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600">검색기간 :</span>
            <span className="text-xs text-slate-800">{dateFrom} ~ {dateTo}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600">보조금합계 :</span>
            <span className="text-sm font-bold text-blue-700">{fmt(totalAmount)}</span>
            <div className="relative group">
              <svg className="w-4 h-4 text-slate-400 cursor-pointer hover:text-slate-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
              <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-[9999] hidden group-hover:block pointer-events-none">
                <div className="bg-white text-slate-700 border border-slate-200 text-[11px] rounded-lg px-4 py-3 shadow-xl leading-relaxed whitespace-nowrap">
                  <div className="absolute left-1/2 -translate-x-1/2 -top-1 w-2 h-2 bg-white border-l border-t border-slate-200 rotate-45" />
                  <p className="font-bold text-slate-600 mb-1">정부보조금 항목</p>
                  <p>기관보육료, 연장보육료, 그밖의지원금, 자본보조금</p>
                </div>
              </div>
            </div>
          </div>
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

      {/* 테이블 */}
      <div className="overflow-x-auto border border-slate-200 rounded-lg bg-white">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr>
              <th className={TH}>수령일자</th>
              <th className={`${TH} min-w-[200px]`}>보조내역</th>
              <th className={TH}>금액</th>
              <th className={TH}>보조기관</th>
              <th className={TH}>산출기초</th>
            </tr>
          </thead>
          <tbody>
            {mockData.map((row, idx) => (
              <tr key={idx} className="hover:bg-slate-50 transition-colors">
                <td className={TD}>{row.date}</td>
                <td className={`${TD} text-left px-4 text-blue-600 font-medium`}>{row.name}</td>
                <td className={`${TD} text-right font-medium text-slate-800`}>{fmt(row.amount)}</td>
                <td className={TD}>{row.org}</td>
                <td className={TD}>{row.basis}</td>
              </tr>
            ))}
            {mockData.length === 0 && (
              <tr><td colSpan={5} className="text-center py-12 text-slate-400 text-xs">조회된 보조금 내역이 없습니다.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 페이징 */}
      <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
        <button className="hover:text-slate-700">이전</button>
        <span className="text-blue-600 font-bold">1</span>
        <button className="hover:text-slate-700">다음</button>
      </div>
    </div>
  )
}
