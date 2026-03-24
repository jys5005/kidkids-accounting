'use client'
import React, { useState } from 'react'
const fmt = (n: number) => n.toLocaleString('ko-KR')
const payroll = [
  { name: '홍길동', position: '원장', basic: 6500000, allowance: 300000, overtime: 0, pension: 292500, health: 224250, employ: 58500, income: 385000, net: 5840750 },
  { name: '김미영', position: '보육교사', basic: 2800000, allowance: 200000, overtime: 150000, pension: 135000, health: 103500, employ: 27000, income: 52000, net: 2832500 },
  { name: '이수진', position: '보육교사', basic: 2600000, allowance: 200000, overtime: 100000, pension: 126000, health: 96600, employ: 25200, income: 38000, net: 2614200 },
  { name: '박정은', position: '보육교사', basic: 3200000, allowance: 250000, overtime: 0, pension: 148500, health: 113850, employ: 29700, income: 85000, net: 3072950 },
  { name: '최영희', position: '보육교사', basic: 2400000, allowance: 150000, overtime: 200000, pension: 117000, health: 89700, employ: 23400, income: 28000, net: 2491900 },
  { name: '정하나', position: '보육교사', basic: 2300000, allowance: 150000, overtime: 100000, pension: 108000, health: 82800, employ: 21600, income: 22000, net: 2315600 },
  { name: '한지민', position: '보육교사', basic: 3500000, allowance: 300000, overtime: 0, pension: 162000, health: 124200, employ: 32400, income: 115000, net: 3366400 },
  { name: '오세라', position: '보조교사', basic: 2100000, allowance: 100000, overtime: 50000, pension: 96750, health: 74175, employ: 19350, income: 15000, net: 2044725 },
  { name: '강민지', position: '조리사', basic: 2200000, allowance: 100000, overtime: 0, pension: 99000, health: 75900, employ: 19800, income: 18000, net: 2087300 },
]
export default function PayrollLedgerPage() {
  const [month, setMonth] = useState('2026-03')
  const totalBasic = payroll.reduce((s,r) => s+r.basic, 0)
  const totalNet = payroll.reduce((s,r) => s+r.net, 0)
  return (
    <div className="p-3 space-y-3">
      <div className="bg-white rounded-xl border border-teal-400/30 shadow-sm">
        <div className="px-4 py-3 border-b border-teal-400/20 flex items-center gap-2">
          <span className="text-sm font-bold text-slate-700">급여대장</span>
          <span className="text-xs text-slate-400">월별 교직원 급여 내역을 관리합니다.</span>
        </div>
        <div className="px-4 py-3 flex items-center gap-2">
          <span className="text-xs font-bold text-slate-700">급여월</span>
          <input type="month" value={month} onChange={e => setMonth(e.target.value)} className="border border-teal-300 rounded px-2 py-1.5 text-xs" />
          <button className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded">조회</button>
          <div className="ml-auto flex items-center gap-1.5">
            <button className="flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 rounded text-xs text-slate-600">
              <svg className="w-3.5 h-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5z" /></svg>인쇄</button>
            <button className="flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-green-50 border border-green-400 rounded text-xs text-green-600">
              <svg className="w-3.5 h-3.5 text-green-600" viewBox="0 0 24 24" fill="currentColor"><path d="M14.2 1H5.8C4.81 1 4 1.81 4 2.8v18.4c0 .99.81 1.8 1.8 1.8h12.4c.99 0 1.8-.81 1.8-1.8V6.8L14.2 1zM15.8 19.3l-2.1-3.5-2.1 3.5H9.8l3.2-5-2.9-4.7h1.8l2.1 3.3 2-3.3h1.8l-2.9 4.7 3.2 5h-2.3z" /></svg>엑셀</button>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-[10px]">
          <thead><tr className="bg-teal-50 border-b border-slate-300">
            <th className="px-2 py-2 font-bold text-slate-600 border-r border-slate-200">No</th>
            <th className="px-2 py-2 font-bold text-slate-600 border-r border-slate-200">이름</th>
            <th className="px-2 py-2 font-bold text-slate-600 border-r border-slate-200">직위</th>
            <th className="px-2 py-2 font-bold text-slate-600 border-r border-slate-200">기본급</th>
            <th className="px-2 py-2 font-bold text-slate-600 border-r border-slate-200">수당</th>
            <th className="px-2 py-2 font-bold text-slate-600 border-r border-slate-200">시간외</th>
            <th className="px-2 py-2 font-bold text-slate-600 border-r border-slate-200">국민연금</th>
            <th className="px-2 py-2 font-bold text-slate-600 border-r border-slate-200">건강보험</th>
            <th className="px-2 py-2 font-bold text-slate-600 border-r border-slate-200">고용보험</th>
            <th className="px-2 py-2 font-bold text-slate-600 border-r border-slate-200">소득세</th>
            <th className="px-2 py-2 font-bold text-slate-600">실지급액</th>
          </tr></thead>
          <tbody>
            {payroll.map((r,i) => (
              <tr key={i} className="border-b border-slate-100 hover:bg-blue-50/40">
                <td className="px-2 py-1.5 text-center text-slate-500 border-r border-slate-100">{i+1}</td>
                <td className="px-2 py-1.5 text-slate-700 font-medium border-r border-slate-100">{r.name}</td>
                <td className="px-2 py-1.5 text-center text-slate-600 border-r border-slate-100">{r.position}</td>
                <td className="px-2 py-1.5 text-right text-slate-700 border-r border-slate-100">{fmt(r.basic)}</td>
                <td className="px-2 py-1.5 text-right text-slate-700 border-r border-slate-100">{fmt(r.allowance)}</td>
                <td className="px-2 py-1.5 text-right text-slate-700 border-r border-slate-100">{fmt(r.overtime)}</td>
                <td className="px-2 py-1.5 text-right text-red-600 border-r border-slate-100">{fmt(r.pension)}</td>
                <td className="px-2 py-1.5 text-right text-red-600 border-r border-slate-100">{fmt(r.health)}</td>
                <td className="px-2 py-1.5 text-right text-red-600 border-r border-slate-100">{fmt(r.employ)}</td>
                <td className="px-2 py-1.5 text-right text-red-600 border-r border-slate-100">{fmt(r.income)}</td>
                <td className="px-2 py-1.5 text-right text-blue-700 font-bold">{fmt(r.net)}</td>
              </tr>
            ))}
            <tr className="bg-teal-50 font-bold">
              <td colSpan={3} className="px-2 py-2 text-center text-slate-700 border-r border-slate-200">합계</td>
              <td className="px-2 py-2 text-right text-slate-700 border-r border-slate-200">{fmt(totalBasic)}</td>
              <td colSpan={6} className="px-2 py-2 border-r border-slate-200"></td>
              <td className="px-2 py-2 text-right text-blue-700">{fmt(totalNet)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
