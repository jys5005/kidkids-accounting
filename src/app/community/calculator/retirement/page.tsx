'use client'
import React, { useState } from 'react'
const fmt = (n: number) => n.toLocaleString('ko-KR')

export default function RetirementCalculatorPage() {
  const [hireDate, setHireDate] = useState('2020-03-01')
  const [leaveDate, setLeaveDate] = useState('2026-03-31')
  const [avgSalary, setAvgSalary] = useState(3000000)

  const d1 = new Date(hireDate)
  const d2 = new Date(leaveDate)
  const diffMs = d2.getTime() - d1.getTime()
  const totalDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))
  const years = Math.floor(totalDays / 365)
  const months = Math.floor((totalDays % 365) / 30)
  const days = totalDays % 30
  const retirement = Math.round((avgSalary / 30) * totalDays / 365 * 365 / 365)
  const retirementPay = Math.round(avgSalary * (totalDays / 365))

  return (
    <div className="p-3 space-y-3">
      <div className="bg-white rounded-xl border border-teal-400/30 shadow-sm">
        <div className="px-4 py-3 border-b border-teal-400/20">
          <span className="text-sm font-bold text-slate-700">퇴직금 계산기</span>
          <span className="text-xs text-slate-400 ml-2">입사일, 퇴사일, 평균임금을 입력하여 퇴직금을 계산합니다.</span>
        </div>
        <div className="p-4 space-y-4 max-w-lg">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-700 w-20">입사일</span>
            <input type="date" value={hireDate} onChange={e => setHireDate(e.target.value)} className="border border-teal-300 rounded px-2 py-1.5 text-xs" />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-700 w-20">퇴사일</span>
            <input type="date" value={leaveDate} onChange={e => setLeaveDate(e.target.value)} className="border border-teal-300 rounded px-2 py-1.5 text-xs" />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-700 w-20">평균임금(월)</span>
            <input type="number" value={avgSalary} onChange={e => setAvgSalary(Number(e.target.value))} className="border border-teal-300 rounded px-2 py-1.5 text-xs w-40 text-right" />
            <span className="text-xs text-slate-500">원</span>
          </div>
          <div className="border-t border-slate-200 pt-4 space-y-2">
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-600 w-20">재직기간</span>
              <span className="text-xs font-bold text-slate-800">{years}년 {months}개월 {days}일 (총 {totalDays}일)</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-600 w-20">1일 평균임금</span>
              <span className="text-xs font-bold text-slate-800">{fmt(Math.round(avgSalary / 30))}원</span>
            </div>
            <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
              <span className="text-sm font-bold text-slate-800 w-20">퇴직금</span>
              <span className="text-xl font-black text-teal-700">{fmt(retirementPay)}원</span>
            </div>
            <p className="text-[10px] text-slate-400">* 퇴직금 = 평균임금(월) x 재직일수 / 365</p>
          </div>
        </div>
      </div>
    </div>
  )
}
