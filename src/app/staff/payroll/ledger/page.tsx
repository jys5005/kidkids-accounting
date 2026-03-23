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
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2z" /></svg>인쇄</button>
            <button className="flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-green-50 border border-green-400 rounded text-xs text-green-600">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>엑셀</button>
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
