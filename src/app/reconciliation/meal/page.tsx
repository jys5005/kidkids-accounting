'use client'

import { useState, useMemo } from 'react'

function fmt(n: number) { return n.toLocaleString('ko-KR') }

function getYmOptions() {
  const now = new Date()
  const opts: string[] = []
  for (let i = 0; i < 36; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    opts.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  return opts.reverse()
}

const mockData = {
  공동구매급식비: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  개별구매급식비: [4485710, 5037730, 4968040, 4447010, 769650, 8444630, 5200610, 546200, 5253850, 11037826, 807200, 10934020],
}

const TH = 'px-2 py-2.5 text-center font-bold text-slate-600 whitespace-nowrap border-b border-r border-slate-200 text-[11px] bg-teal-50'
const TD = 'px-2 py-2 text-center border-b border-r border-slate-100 text-xs'

export default function MealPage() {
  const ymOpts = useMemo(() => getYmOptions(), [])
  const [ymFrom, setYmFrom] = useState('2025-03')
  const [ymTo, setYmTo] = useState('2026-02')

  // 기간에 따른 월 헤더
  const monthHeaders = useMemo(() => {
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
  }, [ymFrom, ymTo])

  const joint = mockData.공동구매급식비.slice(0, monthHeaders.length)
  const individual = mockData.개별구매급식비.slice(0, monthHeaders.length)
  const totals = joint.map((v, i) => v + individual[i])
  const ratios = totals.map((t, i) => t > 0 ? Math.round((joint[i] / t) * 100) : 0)

  return (
    <div className="p-6 space-y-4">
      {/* 검색 */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-bold text-slate-700">조회연월</span>
        <select value={ymFrom} onChange={e => setYmFrom(e.target.value)} className="border border-slate-300 rounded px-2 py-1.5 text-xs">
          {ymOpts.map(ym => <option key={ym} value={ym}>{ym}</option>)}
        </select>
        <span className="text-xs text-slate-400">~</span>
        <select value={ymTo} onChange={e => setYmTo(e.target.value)} className="border border-slate-300 rounded px-2 py-1.5 text-xs">
          {ymOpts.map(ym => <option key={ym} value={ym}>{ym}</option>)}
        </select>
        <button className="px-4 py-1.5 text-xs font-bold text-white bg-teal-500 hover:bg-teal-600 rounded transition-colors">검색</button>
        <button onClick={() => { const d = new Date(); d.setMonth(d.getMonth() - 1); const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; setYmFrom(ym); setYmTo(ym) }} className="px-2 py-1 text-[10px] font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded transition-colors">지난달</button>
        <button onClick={() => { const y = new Date().getFullYear() - 1; setYmFrom(`${y}-03`); setYmTo(`${y + 1}-02`) }} className="px-2 py-1 text-[10px] font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded transition-colors">과년도</button>
        <div className="relative group">
          <svg className="w-4 h-4 text-slate-400 cursor-pointer hover:text-slate-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
          <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-[9999] hidden group-hover:block pointer-events-none">
            <div className="bg-white text-slate-700 border border-slate-200 text-[11px] rounded-lg px-4 py-3 shadow-xl leading-relaxed whitespace-nowrap">
              <div className="absolute left-1/2 -translate-x-1/2 -top-1 w-2 h-2 bg-white border-l border-t border-slate-200 rotate-45" />
              <p>공동구매급식비는 급식·간식재료비 세목 청정급식비 입니다.</p>
            </div>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button className="w-8 h-8 flex items-center justify-center bg-white hover:bg-slate-50 border border-slate-300 rounded transition-colors" title="인쇄하기">
            <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5z" /></svg>
          </button>
          <button className="w-8 h-8 flex items-center justify-center bg-white hover:bg-green-50 border border-green-400 rounded transition-colors" title="엑셀다운로드">
            <svg className="w-4 h-4 text-green-600" viewBox="0 0 24 24" fill="currentColor"><path d="M14.2 1H5.8C4.81 1 4 1.81 4 2.8v18.4c0 .99.81 1.8 1.8 1.8h12.4c.99 0 1.8-.81 1.8-1.8V6.8L14.2 1zM15.8 19.3l-2.1-3.5-2.1 3.5H9.8l3.2-5-2.9-4.7h1.8l2.1 3.3 2-3.3h1.8l-2.9 4.7 3.2 5h-2.3z" /></svg>
          </button>
        </div>
      </div>

      {/* 테이블 */}
      <div className="overflow-x-auto border border-slate-200 rounded-lg bg-white">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr>
              <th className={`${TH} min-w-[120px]`}>계정과목</th>
              {monthHeaders.map(h => <th key={h} className={TH}>{h}</th>)}
              <th className={`${TH} border-r-0`}>합계</th>
            </tr>
          </thead>
          <tbody>
            <tr className="hover:bg-slate-50">
              <td className={`${TD} font-bold text-slate-700`}>공동구매급식비</td>
              {joint.map((v, i) => <td key={i} className={`${TD} text-right ${v > 0 ? 'text-slate-800' : 'text-slate-400'}`}>{fmt(v)}</td>)}
              <td className={`${TD} text-right font-bold text-slate-800 border-r-0`}>{fmt(joint.reduce((s, v) => s + v, 0))}</td>
            </tr>
            <tr className="hover:bg-slate-50">
              <td className={`${TD} font-bold text-slate-700`}>개별구매급식비</td>
              {individual.map((v, i) => <td key={i} className={`${TD} text-right ${v > 0 ? 'text-blue-700 font-medium' : 'text-slate-400'}`}>{fmt(v)}</td>)}
              <td className={`${TD} text-right font-bold text-blue-700 border-r-0`}>{fmt(individual.reduce((s, v) => s + v, 0))}</td>
            </tr>
            <tr className="bg-slate-50 font-bold">
              <td className={`${TD} text-slate-700`}>합계</td>
              {totals.map((v, i) => <td key={i} className={`${TD} text-right text-slate-800`}>{fmt(v)}</td>)}
              <td className={`${TD} text-right text-slate-800 border-r-0`}>{fmt(totals.reduce((s, v) => s + v, 0))}</td>
            </tr>
            <tr className="hover:bg-slate-50">
              <td className={`${TD} font-bold text-slate-700`}>공동구매비율</td>
              {ratios.map((v, i) => <td key={i} className={`${TD} text-right text-slate-500`}>{v} %</td>)}
              <td className={`${TD} text-right text-slate-500 border-r-0`}>{totals.reduce((s, v) => s + v, 0) > 0 ? Math.round((joint.reduce((s, v) => s + v, 0) / totals.reduce((s, v) => s + v, 0)) * 100) : 0} %</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
