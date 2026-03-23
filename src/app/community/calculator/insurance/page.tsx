'use client'
import React, { useState } from 'react'
const fmt = (n: number) => n.toLocaleString('ko-KR')
const inputCls = "border border-teal-300 rounded px-3 py-2 text-[13px] text-right focus:outline-none focus:border-teal-500"

const RATES = {
  pension: { total: 0.09, worker: 0.045, employer: 0.045 },
  health: { total: 0.0709, worker: 0.03545, employer: 0.03545 },
  longterm: { total: 0.009082, worker: 0.004541, employer: 0.004541 },
  employ150: { total: 0.019, worker: 0.009, employer: 0.01 },
  employ150_1000: { total: 0.0215, worker: 0.009, employer: 0.0125 },
  employ1000: { total: 0.0235, worker: 0.009, employer: 0.0145 },
  employPriority: { total: 0.021, worker: 0.009, employer: 0.012 },
}

type Tab = 'all' | 'pension' | 'health' | 'employ' | 'injury'

export default function InsuranceCalcPage() {
  const [tab, setTab] = useState<Tab>('all')
  const [salary, setSalary] = useState(0)
  const [workerSize, setWorkerSize] = useState<'under150' | 'over150' | 'over150_1000' | 'over1000'>('under150')

  const employRate = workerSize === 'under150' ? RATES.employ150
    : workerSize === 'over150' ? RATES.employPriority
    : workerSize === 'over150_1000' ? RATES.employ150_1000
    : RATES.employ1000

  const calc = {
    pension: { total: Math.round(salary * RATES.pension.total), worker: Math.round(salary * RATES.pension.worker), employer: Math.round(salary * RATES.pension.employer) },
    health: { total: Math.round(salary * RATES.health.total), worker: Math.round(salary * RATES.health.worker), employer: Math.round(salary * RATES.health.employer) },
    longterm: { total: Math.round(salary * RATES.longterm.total), worker: Math.round(salary * RATES.longterm.worker), employer: Math.round(salary * RATES.longterm.employer) },
    employ: { total: Math.round(salary * employRate.total), worker: Math.round(salary * employRate.worker), employer: Math.round(salary * employRate.employer) },
  }

  const totals = {
    total: calc.pension.total + calc.health.total + calc.longterm.total + calc.employ.total,
    worker: calc.pension.worker + calc.health.worker + calc.longterm.worker + calc.employ.worker,
    employer: calc.pension.employer + calc.health.employer + calc.longterm.employer + calc.employ.employer,
  }

  const reset = () => { setSalary(0); setWorkerSize('under150') }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'all', label: '전체' }, { key: 'pension', label: '국민연금' }, { key: 'health', label: '건강보험' }, { key: 'employ', label: '고용보험' }, { key: 'injury', label: '산재보험' },
  ]

  return (
    <div className="p-3 space-y-3">
      <div className="bg-white rounded-xl border border-teal-400/30 shadow-sm">
        <div className="px-4 py-3 border-b border-teal-400/20 flex items-center justify-between">
          <span className="text-lg font-black text-slate-800">4대사회보험료 모의계산</span>
        </div>

        {/* 탭 */}
        <div className="px-4 pt-4 flex items-center gap-0">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} className={`px-5 py-2 text-[13px] font-bold border transition-colors ${tab === t.key ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}>{t.label}</button>
          ))}
        </div>

        {/* 안내 */}
        <div className="mx-4 mt-3 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 flex items-center gap-2">
          <span className="text-blue-600 font-bold">ⓘ</span>
          <span className="text-[12px] text-slate-600">2026년 기준(계산내용은 모의계산이기 때문에 실제와 다를 수 있습니다.)</span>
        </div>

        {/* 입력 */}
        <div className="px-4 mt-4 flex items-center gap-3">
          <span className="text-[13px] font-bold text-slate-700">월 급여</span>
          <input type="text" value={salary || ''} onChange={e => setSalary(Number(e.target.value.replace(/[^0-9]/g, '')))} className={`${inputCls} w-80`} placeholder="0" />
          <span className="text-[13px] text-slate-500">원</span>
          <button onClick={() => {}} className="px-4 py-2 text-[13px] font-bold text-white bg-blue-600 hover:bg-blue-700 rounded">계산</button>
          <button onClick={reset} className="px-4 py-2 text-[13px] font-bold text-slate-600 bg-slate-200 hover:bg-slate-300 rounded">초기화</button>
        </div>

        {/* 근로자수 */}
        <div className="px-4 mt-3 flex items-start gap-3">
          <span className="text-[13px] font-bold text-slate-700 pt-0.5">근로자수</span>
          <div className="grid grid-cols-2 gap-x-8 gap-y-1">
            <label className="text-[12px] text-slate-600"><input type="radio" name="size" checked={workerSize === 'under150'} onChange={() => setWorkerSize('under150')} className="mr-1" />150인 미만 기업</label>
            <label className="text-[12px] text-slate-600"><input type="radio" name="size" checked={workerSize === 'over150'} onChange={() => setWorkerSize('over150')} className="mr-1" />150인 이상 (우선지원 대상기업)</label>
            <label className="text-[12px] text-slate-600"><input type="radio" name="size" checked={workerSize === 'over150_1000'} onChange={() => setWorkerSize('over150_1000')} className="mr-1" />150인 이상 1,000인 미만 기업</label>
            <label className="text-[12px] text-slate-600"><input type="radio" name="size" checked={workerSize === 'over1000'} onChange={() => setWorkerSize('over1000')} className="mr-1" />1,000인 이상 기업, 국가 지방자치단체</label>
          </div>
        </div>

        {/* 결과 테이블 */}
        <div className="px-4 mt-5 mb-4">
          <table className="w-full text-[13px] border-collapse border border-slate-200">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-center font-bold text-slate-700 border-r border-slate-200 w-[120px]">구분</th>
                <th className="px-4 py-3 text-center font-bold text-slate-700 border-r border-slate-200">보험료 총액</th>
                <th className="px-4 py-3 text-center font-bold text-slate-700 border-r border-slate-200">근로자 부담금</th>
                <th className="px-4 py-3 text-center font-bold text-slate-700">사업주 부담금</th>
              </tr>
            </thead>
            <tbody>
              {[
                { label: '국민연금', data: calc.pension },
                { label: '건강보험', data: calc.health },
                { label: '건강보험\n(장기요양)', data: calc.longterm },
                { label: '고용보험', data: calc.employ },
              ].map((row, i) => (
                <tr key={i} className="border-b border-slate-200">
                  <td className="px-4 py-3 text-center text-slate-700 border-r border-slate-200 whitespace-pre-line">{row.label}</td>
                  <td className="px-4 py-3 border-r border-slate-200"><div className="flex items-center gap-1 justify-end"><input type="text" readOnly value={fmt(row.data.total)} className={`${inputCls} flex-1 bg-slate-50`} /><span className="text-slate-500">원</span></div></td>
                  <td className="px-4 py-3 border-r border-slate-200"><div className="flex items-center gap-1 justify-end"><input type="text" readOnly value={fmt(row.data.worker)} className={`${inputCls} flex-1 bg-slate-50`} /><span className="text-slate-500">원</span></div></td>
                  <td className="px-4 py-3"><div className="flex items-center gap-1 justify-end"><input type="text" readOnly value={fmt(row.data.employer)} className={`${inputCls} flex-1 bg-slate-50`} /><span className="text-slate-500">원</span></div></td>
                </tr>
              ))}
              <tr className="bg-slate-50 font-bold">
                <td className="px-4 py-3 text-center text-slate-800 border-r border-slate-200">합 계</td>
                <td className="px-4 py-3 border-r border-slate-200"><div className="flex items-center gap-1 justify-end"><input type="text" readOnly value={fmt(totals.total)} className={`${inputCls} flex-1 bg-slate-100 font-bold`} /><span className="text-slate-500">원</span></div></td>
                <td className="px-4 py-3 border-r border-slate-200"><div className="flex items-center gap-1 justify-end"><input type="text" readOnly value={fmt(totals.worker)} className={`${inputCls} flex-1 bg-slate-100 font-bold`} /><span className="text-slate-500">원</span></div></td>
                <td className="px-4 py-3"><div className="flex items-center gap-1 justify-end"><input type="text" readOnly value={fmt(totals.employer)} className={`${inputCls} flex-1 bg-slate-100 font-bold`} /><span className="text-slate-500">원</span></div></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="px-4 mb-2">
          <p className="text-[11px] text-red-500 font-bold">※ 산재보험료는 별도로 확인하시기 바랍니다.</p>
          <button className="mt-1 px-3 py-1.5 text-[11px] text-slate-600 bg-white border border-slate-300 rounded hover:bg-slate-50">산재보험료율 및 산재보험료 알아보기</button>
        </div>

        <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-center gap-3">
          <button onClick={() => window.print()} className="px-8 py-2 text-[13px] font-bold text-white bg-slate-700 hover:bg-slate-800 rounded">출력</button>
          <button className="px-8 py-2 text-[13px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded">닫기</button>
        </div>
      </div>
    </div>
  )
}
