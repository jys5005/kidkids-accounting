'use client'

import { useState, useMemo } from 'react'

function fmt(n: number) { return n.toLocaleString('ko-KR') }

function getYmOptions() {
  const now = new Date()
  const opts: string[] = []
  for (let i = -12; i < 36; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    opts.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  return opts.reverse()
}

const mockIncomeBase = [2283000, 2553000, 2487000, 2452000, 2724000, 2794000, 2400019, 2556000, 3101000, 2215000, 2386000, 2660000]
const mockExpenseBase = [2070000, 6834000, 5012000, 6520000, 7198000, 5118000, 5151000, 5184000, 3813000, 6651000, 3886800, 6753000]
const mockOtherIncome = [300000, 300000, 300000, 300000, 300000, 300000, 300000, 300000, 300000, 300000, 300000, 300000]
const mockOtherExpense = [200000, 250000, 220000, 230000, 210000, 240000, 220000, 230000, 210000, 240000, 220000, 230000]

const TH = 'px-2 py-2 text-center font-bold text-slate-600 whitespace-nowrap border-b border-r border-slate-200 text-[11px] bg-teal-50'
const TD = 'px-2 py-2 text-center border-b border-r border-slate-100 text-xs'

export default function ActivityPage() {
  const now = new Date()
  const ymOpts = useMemo(() => getYmOptions(), [])
  const yearOpts = Array.from({ length: 5 }, (_, i) => String(now.getFullYear() - i))
  const [searchType, setSearchType] = useState<'year' | 'range'>('year')
  const [selectedYear, setSelectedYear] = useState(String(now.getFullYear()))
  const [halfYear, setHalfYear] = useState<'all' | 'first' | 'second'>('all')
  const fiscalYear = now.getMonth() < 2 ? now.getFullYear() - 1 : now.getFullYear()
  const [ymFrom, setYmFrom] = useState(`${fiscalYear}-03`)
  const [ymTo, setYmTo] = useState(`${fiscalYear + 1}-02`)
  const [includeOther, setIncludeOther] = useState(false)

  const monthHeaders = useMemo(() => {
    if (searchType === 'year') {
      const yr = parseInt(selectedYear)
      const all = Array.from({ length: 12 }, (_, i) => {
        const m = i + 3
        const y = m > 12 ? yr + 1 : yr
        const mo = m > 12 ? m - 12 : m
        return `${y}년 ${String(mo).padStart(2, '0')}월`
      })
      if (halfYear === 'first') return all.slice(0, 6)
      if (halfYear === 'second') return all.slice(6)
      return all
    }
    const [fy, fm] = ymFrom.split('-').map(Number)
    const [ty, tm] = ymTo.split('-').map(Number)
    const headers: string[] = []
    let y = fy, m = fm
    while (y < ty || (y === ty && m <= tm)) {
      headers.push(`${y}년 ${String(m).padStart(2, '0')}월`)
      m++
      if (m > 12) { m = 1; y++ }
    }
    return headers
  }, [searchType, selectedYear, halfYear, ymFrom, ymTo])

  const dataOffset = searchType === 'year' && halfYear === 'second' ? 6 : 0
  const mc = monthHeaders.length
  const getSlice = (arr: number[]) => arr.slice(dataOffset, dataOffset + mc)

  const income = getSlice(includeOther ? mockIncomeBase.map((v, i) => v + mockOtherIncome[i]) : mockIncomeBase)
  const expense = getSlice(includeOther ? mockExpenseBase.map((v, i) => v + mockOtherExpense[i]) : mockExpenseBase)
  const incomeTotal = income.reduce((s, v) => s + v, 0)
  const expenseTotal = expense.reduce((s, v) => s + v, 0)

  return (
    <div className="p-6 space-y-4">
      {/* 검색 */}
      <div className="flex items-center gap-2 flex-wrap">
        <label className="flex items-center gap-0.5 text-xs text-slate-700 cursor-pointer">
          <input type="radio" name="actSearchType" checked={searchType === 'year'} onChange={() => setSearchType('year')} className="w-3 h-3 accent-blue-600" />
          <span className="font-bold">조회연도</span>
        </label>
        <label className="flex items-center gap-0.5 text-xs text-slate-700 cursor-pointer">
          <input type="radio" name="actSearchType" checked={searchType === 'range'} onChange={() => setSearchType('range')} className="w-3 h-3 accent-blue-600" />
          <span className="font-bold">구간별</span>
        </label>
        {searchType === 'year' ? (
          <>
            <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)} className="border border-slate-300 rounded px-2 py-1.5 text-xs">
              {yearOpts.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select value={halfYear} onChange={e => setHalfYear(e.target.value as 'all' | 'first' | 'second')} className="border border-slate-300 rounded px-2 py-1.5 text-xs">
              <option value="all">전체</option>
              <option value="first">상반기</option>
              <option value="second">하반기</option>
            </select>
          </>
        ) : (
          <>
            <select value={ymFrom} onChange={e => setYmFrom(e.target.value)} className="border border-slate-300 rounded px-2 py-1.5 text-xs">
              {ymOpts.map(ym => <option key={ym} value={ym}>{ym}</option>)}
            </select>
            <span className="text-xs text-slate-400">~</span>
            <select value={ymTo} onChange={e => setYmTo(e.target.value)} className="border border-slate-300 rounded px-2 py-1.5 text-xs">
              {ymOpts.map(ym => <option key={ym} value={ym}>{ym}</option>)}
            </select>
          </>
        )}
        <button className="px-4 py-1.5 text-xs font-bold text-white bg-teal-500 hover:bg-teal-600 rounded transition-colors">검색</button>
        <label className="flex items-center gap-0.5 text-xs text-slate-600 cursor-pointer">
          <input type="checkbox" checked={includeOther} onChange={e => setIncludeOther(e.target.checked)} className="w-3 h-3 accent-blue-600 rounded" />
          <span className="font-bold">그밖의지원금 포함</span>
        </label>
        <div className="relative group">
          <svg className="w-4 h-4 text-slate-400 cursor-pointer hover:text-slate-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
          <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-[9999] hidden group-hover:block pointer-events-none">
            <div className="bg-white text-slate-700 border border-slate-200 text-[11px] rounded-lg px-4 py-3 shadow-xl leading-relaxed whitespace-nowrap">
              <div className="absolute left-1/2 -translate-x-1/2 -top-1 w-2 h-2 bg-white border-l border-t border-slate-200 rotate-45" />
              <p>* 세입/세출 각 선택된 항목만 반영됩니다.</p>
              <p>* 상세등록에서 수입/지출항목에서 세부 계정을 확인할 수 있습니다.</p>
              <p>* 그밖의지원금 중 세목에 특별활동비 값은 합산처리됩니다.</p>
            </div>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
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
              <th className={`${TH} w-14`}>구분</th>
              <th className={`${TH} min-w-[110px]`}>계정과목</th>
              {monthHeaders.map(h => <th key={h} className={TH}>{h}</th>)}
              <th className={`${TH} border-r-0`}>합계</th>
            </tr>
          </thead>
          <tbody>
            {/* 세입 */}
            <tr className="hover:bg-blue-50/30">
              <td rowSpan={2} className={`${TD} font-bold text-blue-700 bg-blue-50/50 align-middle`}>세입</td>
              <td className={`${TD} text-left px-2 font-medium text-slate-700`}>특별활동비</td>
              {income.map((v, i) => <td key={i} className={`${TD} text-right ${v > 0 ? 'text-blue-700' : 'text-slate-400'}`}>{fmt(v)}</td>)}
              <td className={`${TD} text-right font-bold text-blue-700 border-r-0`}>{fmt(incomeTotal)}</td>
            </tr>
            <tr className="bg-blue-50/50 font-bold">
              <td className={`${TD} text-center text-blue-700`}>수입 합계</td>
              {income.map((v, i) => <td key={i} className={`${TD} text-right text-blue-700`}>{fmt(v)}</td>)}
              <td className={`${TD} text-right text-blue-700 border-r-0`}>{fmt(incomeTotal)}</td>
            </tr>

            {/* 세출 */}
            <tr className="hover:bg-red-50/30">
              <td rowSpan={2} className={`${TD} font-bold text-red-600 bg-red-50/50 align-middle`}>세출</td>
              <td className={`${TD} text-left px-2 font-medium text-slate-700`}>특별활동비지출</td>
              {expense.map((v, i) => <td key={i} className={`${TD} text-right ${v > 0 ? 'text-red-600' : 'text-slate-400'}`}>{fmt(v)}</td>)}
              <td className={`${TD} text-right font-bold text-red-600 border-r-0`}>{fmt(expenseTotal)}</td>
            </tr>
            <tr className="bg-red-50/50 font-bold">
              <td className={`${TD} text-center text-red-600`}>지출 합계</td>
              {expense.map((v, i) => <td key={i} className={`${TD} text-right text-red-600`}>{fmt(v)}</td>)}
              <td className={`${TD} text-right text-red-600 border-r-0`}>{fmt(expenseTotal)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
