'use client'
import React, { useState } from 'react'
const fmt = (n: number) => n.toLocaleString('ko-KR')
const inputCls = "border border-teal-300 rounded px-2 py-1 text-[12px] text-right focus:outline-none focus:border-teal-500 w-16"

const ranges = [
  { range: '0원 ~ 999원', result: '단가기준 미달' },
  { range: '1,000원 ~ 1,499원', result: '확인요망' },
  { range: '1,500원 ~ 2,000원', result: '적정수준' },
  { range: '2,001원 ~ 2,999원', result: '확인요망' },
  { range: '3,000원 이상 ~', result: '단가기준 초과' },
]

export default function MealCalculatorPage() {
  const [rows, setRows] = useState([
    { label: '영아', count: 0, unitPrice: 1900, days: 0 },
    { label: '유아', count: 0, unitPrice: 2400, days: 0 },
    { label: '교직원', count: 0, unitPrice: 2400, days: 0 },
  ])

  const update = (i: number, field: string, val: number) => {
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: val } : r))
  }

  const total = rows.reduce((s, r) => s + r.count * r.unitPrice * r.days, 0)

  return (
    <div className="p-3 space-y-3">
      <div className="bg-white rounded-xl border border-teal-400/30 shadow-sm">
        <div className="px-4 py-3 border-b border-teal-400/20">
          <span className="text-sm font-bold text-slate-700">급간식 계산기</span>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-[12px]">
          <thead><tr className="bg-slate-100 border-b border-slate-300">
            <th className="px-3 py-2 text-center font-bold text-slate-600 border-r border-slate-200 w-[100px]">구분</th>
            <th className="px-3 py-2 text-center font-bold text-slate-600 border-r border-slate-200 w-[140px]">급식인원</th>
            <th className="px-3 py-2 text-center font-bold text-slate-600 border-r border-slate-200 w-[140px]">급식단가</th>
            <th className="px-3 py-2 text-center font-bold text-slate-600 border-r border-slate-200 w-[140px]">보육일수</th>
            <th className="px-3 py-2 text-center font-bold text-slate-600">월 급간식비 합계</th>
          </tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-slate-100">
                <td className="px-3 py-2 text-center text-slate-700 border-r border-slate-100">{r.label}</td>
                <td className="px-3 py-2 text-center border-r border-slate-100">
                  <input type="number" value={r.count} onChange={e => update(i, 'count', Number(e.target.value))} className={inputCls} /> <span className="text-slate-500">(명)</span>
                </td>
                <td className="px-3 py-2 text-center border-r border-slate-100">
                  <input type="number" value={r.unitPrice} onChange={e => update(i, 'unitPrice', Number(e.target.value))} className={inputCls} /> <span className="text-slate-500">(원)</span>
                </td>
                <td className="px-3 py-2 text-center border-r border-slate-100">
                  {i === 0 ? <><input type="number" value={r.days} onChange={e => { const v = Number(e.target.value); setRows(prev => prev.map(row => ({ ...row, days: v }))) }} className={inputCls} /> <span className="text-slate-500">(일)</span></> : ''}
                </td>
                <td className="px-3 py-2 text-right text-slate-700 font-medium">{fmt(r.count * r.unitPrice * r.days)} 원</td>
              </tr>
            ))}
            <tr className="bg-slate-50 font-bold">
              <td className="px-3 py-2 text-center text-slate-700 border-r border-slate-100">합계</td>
              <td colSpan={3} className="border-r border-slate-100"></td>
              <td className="px-3 py-2 text-right text-blue-700">{fmt(total)} 원</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="text-[10px] text-slate-500 space-y-0.5">
        <p>1. 보육일수는 공휴일을 제외한 법정 보육 가능일수가 입력됩니다.</p>
        <p>2. 급간식비 단가를 기준으로 한 검증 결과를 확인할 수 있습니다.(아래 표에서 급간식비 단가기준 및 범위를 확인하세요.)</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-[12px]">
          <thead><tr className="bg-slate-100 border-b border-slate-300">
            <th className="px-3 py-2 text-center font-bold text-slate-600 border-r border-slate-200 w-[160px]">기준단가</th>
            <th className="px-3 py-2 text-center font-bold text-slate-600 border-r border-slate-200">급간식비 단가범위</th>
            <th className="px-3 py-2 text-center font-bold text-slate-600 w-[120px]">결과</th>
          </tr></thead>
          <tbody>
            {ranges.map((r, i) => (
              <tr key={i} className="border-b border-slate-100">
                {i === 0 && <td rowSpan={ranges.length} className="px-3 py-2 text-center text-slate-700 border-r border-slate-100">{fmt(rows[0].unitPrice)}원</td>}
                <td className="px-3 py-2 text-center text-slate-600 border-r border-slate-100">{r.range}</td>
                <td className="px-3 py-2 text-center text-slate-700">{r.result}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
