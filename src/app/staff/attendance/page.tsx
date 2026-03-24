'use client'
import React, { useState } from 'react'

const staffNames = ['홍길동','김미영','이수진','박정은','최영희','정하나','한지민','오세라','강민지']
const statusMap: Record<string, string> = { 'O': 'text-blue-600', 'X': 'text-red-500', '반': 'text-orange-500', '휴': 'text-purple-500', '연': 'text-green-600' }

export default function AttendancePage() {
  const [month, setMonth] = useState('2026-03')
  const year = parseInt(month.split('-')[0])
  const mon = parseInt(month.split('-')[1])
  const daysInMonth = new Date(year, mon, 0).getDate()
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  const [data] = useState(() => {
    const d: Record<string, Record<number, string>> = {}
    staffNames.forEach(name => {
      d[name] = {}
      days.forEach(day => { d[name][day] = '' })
    })
    return d
  })

  return (
    <div className="p-3 space-y-3">
      <div className="bg-white rounded-xl border border-teal-400/30 shadow-sm">
        <div className="px-4 py-3 border-b border-teal-400/20 flex items-center gap-2">
          <span className="text-sm font-bold text-slate-700">출근부</span>
          <span className="text-xs text-slate-400">월별 교직원 출근 현황을 관리합니다.</span>
        </div>
        <div className="px-4 py-3 flex items-center gap-2">
          <span className="text-xs font-bold text-slate-700">출근월</span>
          <input type="month" value={month} onChange={e => setMonth(e.target.value)} className="border border-teal-300 rounded px-2 py-1 text-xs" />
          <button className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded">조회</button>
          <div className="ml-auto flex items-center gap-1.5">
            <button onClick={() => window.print()} className="flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 rounded text-xs text-slate-600">
              <svg className="w-3.5 h-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5z" /></svg>인쇄</button>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3 text-[10px] text-slate-500">
        <span><span className="text-blue-600 font-bold">O</span> 출근</span>
        <span><span className="text-red-500 font-bold">X</span> 결근</span>
        <span><span className="text-orange-500 font-bold">반</span> 반차</span>
        <span><span className="text-purple-500 font-bold">휴</span> 휴가</span>
        <span><span className="text-green-600 font-bold">연</span> 연차</span>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table className="text-[10px] border-collapse min-w-[900px]">
          <thead>
            <tr className="bg-teal-50 border-b border-slate-300">
              <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-200 sticky left-0 bg-teal-50 z-10 w-[60px]">직책</th>
              <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-200 sticky left-[60px] bg-teal-50 z-10 w-[60px]">성명</th>
              {days.map(d => {
                const dow = new Date(year, mon - 1, d).getDay()
                const isWeekend = dow === 0 || dow === 6
                return <th key={d} className={`px-1 py-2 text-center font-bold border-r border-slate-200 w-[28px] ${isWeekend ? 'text-red-400 bg-red-50/50' : 'text-slate-600'}`}>{d}</th>
              })}
              <th className="px-2 py-2 text-center font-bold text-slate-600 w-[40px]">합계</th>
            </tr>
          </thead>
          <tbody>
            {staffNames.map(name => {
              const count = days.filter(d => data[name]?.[d] === 'O').length
              return (
                <tr key={name} className="border-b border-slate-100 hover:bg-blue-50/30">
                  <td className="px-2 py-1.5 text-slate-700 font-medium border-r border-slate-100 sticky left-0 bg-white z-10">{name}</td>
                  {days.map(d => {
                    const dow = new Date(year, mon - 1, d).getDay()
                    const isWeekend = dow === 0 || dow === 6
                    const val = data[name]?.[d] || ''
                    return <td key={d} className={`px-1 py-1.5 text-center border-r border-slate-100 font-bold ${isWeekend ? 'bg-red-50/30' : ''} ${statusMap[val] || 'text-slate-300'}`}>{val}</td>
                  })}
                  <td className="px-2 py-1.5 text-center font-bold text-blue-700">{count}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
