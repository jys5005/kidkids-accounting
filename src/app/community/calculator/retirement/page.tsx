'use client'
import React, { useState } from 'react'
const fmt = (n: number) => n.toLocaleString('ko-KR')
const inputCls = "border border-teal-300 rounded px-3 py-2 text-[13px] focus:outline-none focus:border-teal-500"

export default function RetirementCalculatorPage() {
  const [hireDate, setHireDate] = useState('')
  const [leaveDate, setLeaveDate] = useState('')
  const [avgSalaryStr, setAvgSalaryStr] = useState('')
  const [calc, setCalc] = useState<{ totalDays: number; years: number; months: number; days: number; dailyPay: number; retirementPay: number } | null>(null)

  const doCalc = () => {
    if (!hireDate || !leaveDate || !avgSalaryStr) return
    const d1 = new Date(hireDate)
    const d2 = new Date(leaveDate)
    const diffMs = d2.getTime() - d1.getTime()
    const totalDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))
    const years = Math.floor(totalDays / 365)
    const months = Math.floor((totalDays % 365) / 30)
    const days = totalDays % 30
    const avgSalary = Number(avgSalaryStr.replace(/[^0-9]/g, '')) || 0
    const dailyPay = Math.round(avgSalary / 30)
    const retirementPay = Math.round(avgSalary * (totalDays / 365))
    setCalc({ totalDays, years, months, days, dailyPay, retirementPay })
  }

  const reset = () => {
    setHireDate('')
    setLeaveDate('')
    setAvgSalaryStr('')
    setCalc(null)
  }

  const salaryNum = Number(avgSalaryStr.replace(/[^0-9]/g, '')) || 0

  return (
    <div className="p-3">
      <div className="bg-white rounded-xl border border-teal-400/30 shadow-sm max-w-2xl mx-auto">
        <div className="px-4 py-3 border-b border-teal-400/20">
          <span className="text-[15px] font-bold text-slate-700">퇴직금 계산기</span>
        </div>

        <div className="mx-4 mt-3 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 flex items-center gap-2">
          <span className="text-blue-600 font-bold">ⓘ</span>
          <span className="text-[12px] text-slate-600">퇴직금 = 1일 평균임금 × 30일 × (재직일수 / 365)</span>
        </div>

        <div className="p-4 space-y-4">
          <table className="w-full text-[13px] border-collapse border border-slate-200">
            <tbody>
              <tr className="border-b border-slate-200">
                <td className="px-4 py-3 bg-slate-50 font-bold text-slate-700 border-r border-slate-200 w-[130px]">입사일</td>
                <td className="px-4 py-3">
                  <input type="date" value={hireDate} onChange={e => setHireDate(e.target.value)} onKeyDown={e => e.key === 'Enter' && doCalc()} className={`${inputCls} w-48`} />
                </td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="px-4 py-3 bg-slate-50 font-bold text-slate-700 border-r border-slate-200">퇴사일</td>
                <td className="px-4 py-3">
                  <input type="date" value={leaveDate} onChange={e => setLeaveDate(e.target.value)} onKeyDown={e => e.key === 'Enter' && doCalc()} className={`${inputCls} w-48`} />
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 bg-slate-50 font-bold text-slate-700 border-r border-slate-200">평균임금(월)</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <input type="text" value={salaryNum ? salaryNum.toLocaleString('ko-KR') : ''} onChange={e => setAvgSalaryStr(e.target.value.replace(/[^0-9]/g, ''))} onKeyDown={e => e.key === 'Enter' && doCalc()} className={`${inputCls} w-48 text-right`} placeholder="0" />
                    <span className="text-[13px] text-slate-500">원</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <div className="flex items-center justify-center gap-3">
            <button onClick={doCalc} className="px-8 py-2 text-[13px] font-bold text-white bg-blue-600 hover:bg-blue-700 rounded">계산</button>
            <button onClick={reset} className="px-8 py-2 text-[13px] font-bold text-slate-600 bg-slate-200 hover:bg-slate-300 rounded">초기화</button>
          </div>

          {calc && (
            <table className="w-full text-[13px] border-collapse border border-slate-200">
              <tbody>
                <tr className="border-b border-slate-200">
                  <td className="px-4 py-3 bg-slate-50 font-bold text-slate-700 border-r border-slate-200 w-[130px]">재직기간</td>
                  <td className="px-4 py-3 font-bold text-slate-800">{calc.years}년 {calc.months}개월 {calc.days}일 <span className="text-slate-400 font-normal">(총 {fmt(calc.totalDays)}일)</span></td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="px-4 py-3 bg-slate-50 font-bold text-slate-700 border-r border-slate-200">1일 평균임금</td>
                  <td className="px-4 py-3 font-bold text-slate-800">{fmt(calc.dailyPay)}원</td>
                </tr>
                <tr className="bg-teal-50">
                  <td className="px-4 py-4 bg-teal-100 font-bold text-teal-800 border-r border-teal-200 text-[15px]">퇴직금</td>
                  <td className="px-4 py-4 font-black text-teal-700 text-xl">{fmt(calc.retirementPay)}원</td>
                </tr>
              </tbody>
            </table>
          )}

          <div className="text-[11px] text-slate-500 space-y-1">
            <p>※ 퇴직금 = 평균임금(월) × 재직일수 ÷ 365</p>
            <p>※ 1년 이상 근무한 근로자가 퇴직 시 지급받을 수 있습니다.</p>
            <p>※ 본 계산기는 참고용이며, 실제 퇴직금은 근로기준법에 따라 다를 수 있습니다.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
