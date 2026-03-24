'use client'

import React, { useState } from 'react'

const fmt = (n: number) => n.toLocaleString('ko-KR')

interface BudgetRow {
  level: 'gwan' | 'hang' | 'mok' | 'semok'
  name: string
  budget: number
  current: number
  executed: number
}

// 세입 - 관 (level 0 from budget create)
const incomeGwan: BudgetRow[] = [
  { level: 'gwan', name: '보육료', budget: 186288000, current: 186288000, executed: 0 },
  { level: 'gwan', name: '수익자부담 수입', budget: 0, current: 0, executed: 0 },
  { level: 'gwan', name: '보조금 및 지원금', budget: 161791520, current: 161791520, executed: 0 },
  { level: 'gwan', name: '전입금', budget: 450000000, current: 450000000, executed: 0 },
  { level: 'gwan', name: '기부금', budget: 0, current: 0, executed: 0 },
  { level: 'gwan', name: '적립금', budget: 0, current: 0, executed: 0 },
  { level: 'gwan', name: '과년도 수입', budget: 0, current: 0, executed: 0 },
  { level: 'gwan', name: '잡수입', budget: 1000000, current: 1000000, executed: 0 },
  { level: 'gwan', name: '전년도 이월액', budget: 20000000, current: 20000000, executed: 0 },
]

// 세입 - 항 (level 1 from budget create)
const incomeHang: BudgetRow[] = [
  { level: 'hang', name: '보육료', budget: 186288000, current: 186288000, executed: 0 },
  { level: 'hang', name: '선택적 보육활동비', budget: 0, current: 0, executed: 0 },
  { level: 'hang', name: '기타 필요경비', budget: 0, current: 0, executed: 0 },
  { level: 'hang', name: '인건비 보조금', budget: 103139520, current: 103139520, executed: 0 },
  { level: 'hang', name: '운영보조금', budget: 58652000, current: 58652000, executed: 0 },
  { level: 'hang', name: '자본 보조금', budget: 0, current: 0, executed: 0 },
  { level: 'hang', name: '전입금', budget: 450000000, current: 450000000, executed: 0 },
  { level: 'hang', name: '차입금', budget: 0, current: 0, executed: 0 },
  { level: 'hang', name: '기부금', budget: 0, current: 0, executed: 0 },
  { level: 'hang', name: '적립금', budget: 0, current: 0, executed: 0 },
  { level: 'hang', name: '과년도 수입', budget: 0, current: 0, executed: 0 },
  { level: 'hang', name: '잡수입', budget: 1000000, current: 1000000, executed: 0 },
  { level: 'hang', name: '전년도 이월액', budget: 20000000, current: 20000000, executed: 0 },
]

// 세입 - 목 (level 2 from budget create)
const incomeMok: BudgetRow[] = [
  { level: 'mok', name: '정부지원 보육료', budget: 186288000, current: 186288000, executed: 0 },
  { level: 'mok', name: '부모부담 보육료', budget: 0, current: 0, executed: 0 },
  { level: 'mok', name: '특별활동비', budget: 0, current: 0, executed: 0 },
  { level: 'mok', name: '기타 필요경비', budget: 0, current: 0, executed: 0 },
  { level: 'mok', name: '인건비 보조금', budget: 103139520, current: 103139520, executed: 0 },
  { level: 'mok', name: '기관보육료', budget: 0, current: 0, executed: 0 },
  { level: 'mok', name: '연장보육료', budget: 4560000, current: 4560000, executed: 0 },
  { level: 'mok', name: '공공형 운영비', budget: 0, current: 0, executed: 0 },
  { level: 'mok', name: '그 밖의 지원금', budget: 54092000, current: 54092000, executed: 0 },
  { level: 'mok', name: '자본보조금', budget: 0, current: 0, executed: 0 },
  { level: 'mok', name: '전입금', budget: 450000000, current: 450000000, executed: 0 },
  { level: 'mok', name: '단기차입금', budget: 0, current: 0, executed: 0 },
  { level: 'mok', name: '장기차입금', budget: 0, current: 0, executed: 0 },
  { level: 'mok', name: '지정후원금', budget: 0, current: 0, executed: 0 },
  { level: 'mok', name: '비지정후원금', budget: 0, current: 0, executed: 0 },
  { level: 'mok', name: '적립금 처분 수입', budget: 0, current: 0, executed: 0 },
  { level: 'mok', name: '과년도 수입', budget: 0, current: 0, executed: 0 },
  { level: 'mok', name: '이자수입', budget: 1000000, current: 1000000, executed: 0 },
  { level: 'mok', name: '그 밖의 잡수입', budget: 0, current: 0, executed: 0 },
  { level: 'mok', name: '전년도 이월금', budget: 20000000, current: 20000000, executed: 0 },
  { level: 'mok', name: '전년도 이월사업비', budget: 0, current: 0, executed: 0 },
]

// 세출 - 관 (level 0 from budget create)
const expenseGwan: BudgetRow[] = [
  { level: 'gwan', name: '인건비', budget: 674804897, current: 674804897, executed: 0 },
  { level: 'gwan', name: '운영비', budget: 148970000, current: 148970000, executed: 0 },
  { level: 'gwan', name: '보육활동비', budget: 160616000, current: 160616000, executed: 0 },
  { level: 'gwan', name: '수익자 부담경비', budget: 138488000, current: 138488000, executed: 0 },
  { level: 'gwan', name: '적립금', budget: 0, current: 0, executed: 0 },
  { level: 'gwan', name: '상환·반환금', budget: 10600000, current: 10600000, executed: 0 },
  { level: 'gwan', name: '재산조성비', budget: 21000000, current: 21000000, executed: 0 },
  { level: 'gwan', name: '과년도 지출', budget: 122192144, current: 122192144, executed: 0 },
  { level: 'gwan', name: '잡지출', budget: 0, current: 0, executed: 0 },
  { level: 'gwan', name: '예비비', budget: 0, current: 0, executed: 0 },
]

// 세출 - 항 (level 1 from budget create)
const expenseHang: BudgetRow[] = [
  { level: 'hang', name: '원장인건비', budget: 78600000, current: 78600000, executed: 0 },
  { level: 'hang', name: '보육교직원인건비', budget: 493037280, current: 493037280, executed: 0 },
  { level: 'hang', name: '기타인건비', budget: 5992800, current: 5992800, executed: 0 },
  { level: 'hang', name: '기관부담금', budget: 97174817, current: 97174817, executed: 0 },
  { level: 'hang', name: '관리운영비', budget: 131770000, current: 131770000, executed: 0 },
  { level: 'hang', name: '업무추진비', budget: 17200000, current: 17200000, executed: 0 },
  { level: 'hang', name: '기본보육활동비', budget: 160616000, current: 160616000, executed: 0 },
  { level: 'hang', name: '선택적 보육활동비', budget: 53328000, current: 53328000, executed: 0 },
  { level: 'hang', name: '기타 필요경비', budget: 85160000, current: 85160000, executed: 0 },
  { level: 'hang', name: '적립금', budget: 0, current: 0, executed: 0 },
  { level: 'hang', name: '차입금 상환', budget: 10000000, current: 10000000, executed: 0 },
  { level: 'hang', name: '반환금', budget: 600000, current: 600000, executed: 0 },
  { level: 'hang', name: '시설비', budget: 9000000, current: 9000000, executed: 0 },
  { level: 'hang', name: '자산구입비', budget: 12000000, current: 12000000, executed: 0 },
  { level: 'hang', name: '과년도 지출', budget: 122192144, current: 122192144, executed: 0 },
  { level: 'hang', name: '잡지출', budget: 0, current: 0, executed: 0 },
  { level: 'hang', name: '예비비', budget: 0, current: 0, executed: 0 },
]

// 세출 - 목 (level 2 from budget create)
const expenseMok: BudgetRow[] = [
  { level: 'mok', name: '원장급여', budget: 78000000, current: 78000000, executed: 0 },
  { level: 'mok', name: '원장수당', budget: 600000, current: 600000, executed: 0 },
  { level: 'mok', name: '보육교직원급여', budget: 476237280, current: 476237280, executed: 0 },
  { level: 'mok', name: '보육교직원수당', budget: 16800000, current: 16800000, executed: 0 },
  { level: 'mok', name: '기타 인건비', budget: 5992800, current: 5992800, executed: 0 },
  { level: 'mok', name: '법정부담금', budget: 57488377, current: 57488377, executed: 0 },
  { level: 'mok', name: '퇴직금 및 퇴직적립금', budget: 39686440, current: 39686440, executed: 0 },
  { level: 'mok', name: '수용비 및 수수료', budget: 67260000, current: 67260000, executed: 0 },
  { level: 'mok', name: '공공요금 및 제세공과금', budget: 22600000, current: 22600000, executed: 0 },
  { level: 'mok', name: '연료비', budget: 0, current: 0, executed: 0 },
  { level: 'mok', name: '여비', budget: 0, current: 0, executed: 0 },
  { level: 'mok', name: '차량비', budget: 10200000, current: 10200000, executed: 0 },
  { level: 'mok', name: '복리후생비', budget: 10110000, current: 10110000, executed: 0 },
  { level: 'mok', name: '기타 운영비', budget: 21600000, current: 21600000, executed: 0 },
  { level: 'mok', name: '업무추진비', budget: 4200000, current: 4200000, executed: 0 },
  { level: 'mok', name: '직책급', budget: 12000000, current: 12000000, executed: 0 },
  { level: 'mok', name: '회의비', budget: 1000000, current: 1000000, executed: 0 },
  { level: 'mok', name: '교직원연수·연구비', budget: 6000000, current: 6000000, executed: 0 },
  { level: 'mok', name: '교재·교구 구입비', budget: 40120000, current: 40120000, executed: 0 },
  { level: 'mok', name: '행사비', budget: 9840000, current: 9840000, executed: 0 },
  { level: 'mok', name: '영유아복리비', budget: 1000000, current: 1000000, executed: 0 },
  { level: 'mok', name: '급식·간식재료비', budget: 103656000, current: 103656000, executed: 0 },
  { level: 'mok', name: '특별활동비지출', budget: 53328000, current: 53328000, executed: 0 },
  { level: 'mok', name: '기타 필요경비 지출', budget: 85160000, current: 85160000, executed: 0 },
  { level: 'mok', name: '적립금', budget: 0, current: 0, executed: 0 },
  { level: 'mok', name: '단기 차입금 상환', budget: 10000000, current: 10000000, executed: 0 },
  { level: 'mok', name: '장기 차입금 상환', budget: 0, current: 0, executed: 0 },
  { level: 'mok', name: '보조금 반환금', budget: 300000, current: 300000, executed: 0 },
  { level: 'mok', name: '보호자 반환금', budget: 300000, current: 300000, executed: 0 },
  { level: 'mok', name: '법인회계 전출금', budget: 0, current: 0, executed: 0 },
  { level: 'mok', name: '시설비', budget: 3000000, current: 3000000, executed: 0 },
  { level: 'mok', name: '시설장비 유지비', budget: 6000000, current: 6000000, executed: 0 },
  { level: 'mok', name: '자산취득비', budget: 12000000, current: 12000000, executed: 0 },
  { level: 'mok', name: '과년도 지출', budget: 122192144, current: 122192144, executed: 0 },
  { level: 'mok', name: '잡지출', budget: 0, current: 0, executed: 0 },
  { level: 'mok', name: '예비비', budget: 0, current: 0, executed: 0 },
]

// 세입 - 세목 (목 + 세목 혼합, level 2+3)
const incomeSemok: BudgetRow[] = [
  { level: 'mok', name: '정부지원 보육료', budget: 186288000, current: 186288000, executed: 0 },
  { level: 'mok', name: '부모부담 보육료', budget: 0, current: 0, executed: 0 },
  { level: 'mok', name: '특별활동비', budget: 0, current: 0, executed: 0 },
  { level: 'mok', name: '기타 필요경비', budget: 0, current: 0, executed: 0 },
  { level: 'semok', name: '입학준비금', budget: 0, current: 0, executed: 0 },
  { level: 'semok', name: '현장학습비', budget: 0, current: 0, executed: 0 },
  { level: 'semok', name: '차량운행비', budget: 0, current: 0, executed: 0 },
  { level: 'semok', name: '부모부담행사비', budget: 0, current: 0, executed: 0 },
  { level: 'semok', name: '아침.저녁급식비', budget: 0, current: 0, executed: 0 },
  { level: 'semok', name: '기타시도특성화비', budget: 0, current: 0, executed: 0 },
  { level: 'mok', name: '인건비 보조금', budget: 103139520, current: 103139520, executed: 0 },
  { level: 'mok', name: '기관보육료', budget: 0, current: 0, executed: 0 },
  { level: 'mok', name: '연장보육료', budget: 4560000, current: 4560000, executed: 0 },
  { level: 'mok', name: '공공형 운영비', budget: 0, current: 0, executed: 0 },
  { level: 'mok', name: '그 밖의 지원금', budget: 54092000, current: 54092000, executed: 0 },
  { level: 'mok', name: '자본보조금', budget: 0, current: 0, executed: 0 },
  { level: 'mok', name: '전입금', budget: 450000000, current: 450000000, executed: 0 },
  { level: 'mok', name: '단기차입금', budget: 0, current: 0, executed: 0 },
  { level: 'mok', name: '장기차입금', budget: 0, current: 0, executed: 0 },
  { level: 'mok', name: '지정후원금', budget: 0, current: 0, executed: 0 },
  { level: 'mok', name: '비지정후원금', budget: 0, current: 0, executed: 0 },
  { level: 'mok', name: '적립금 처분 수입', budget: 0, current: 0, executed: 0 },
  { level: 'mok', name: '과년도 수입', budget: 0, current: 0, executed: 0 },
  { level: 'mok', name: '이자수입', budget: 1000000, current: 1000000, executed: 0 },
  { level: 'mok', name: '그 밖의 잡수입', budget: 0, current: 0, executed: 0 },
  { level: 'mok', name: '전년도 이월금', budget: 20000000, current: 20000000, executed: 0 },
  { level: 'mok', name: '전년도 이월사업비', budget: 0, current: 0, executed: 0 },
]

// 세출 - 세목 (목 + 세목, level 2+3 - 현재 세출에 세목 없으므로 목과 동일)
const expenseSemok = expenseMok

type ViewLevel = 'gwan' | 'hang' | 'mok' | 'semok'

function getIncomeData(level: ViewLevel) {
  if (level === 'gwan') return incomeGwan
  if (level === 'hang') return incomeHang
  if (level === 'semok') return incomeSemok
  return incomeMok
}

function getExpenseData(level: ViewLevel) {
  if (level === 'gwan') return expenseGwan
  if (level === 'hang') return expenseHang
  if (level === 'semok') return expenseSemok
  return expenseMok
}

function getLevelLabel(level: ViewLevel) {
  if (level === 'gwan') return '관'
  if (level === 'hang') return '항'
  if (level === 'mok') return '목'
  return '세목'
}

function getRowLabel(row: BudgetRow) {
  if (row.level === 'gwan') return '관'
  if (row.level === 'hang') return '항'
  if (row.level === 'mok') return '목'
  return '세목'
}

function getRowBadgeColor(row: BudgetRow) {
  if (row.level === 'gwan') return 'bg-blue-500'
  if (row.level === 'hang') return 'bg-teal-500'
  if (row.level === 'mok') return 'bg-purple-500'
  return 'bg-green-500'
}

export default function BudgetExecutionPage() {
  const [month, setMonth] = useState('2026년 03월')
  const [viewLevel, setViewLevel] = useState<ViewLevel>('gwan')
  const [tab, setTab] = useState<'monthly' | 'compare'>('monthly')

  const incomeRows = getIncomeData(viewLevel)
  const expenseRows = getExpenseData(viewLevel)

  const incomeTotal = incomeRows.reduce((s, r) => s + r.budget, 0)
  const incomeTotalCurrent = incomeRows.reduce((s, r) => s + r.current, 0)
  const incomeTotalExecuted = incomeRows.reduce((s, r) => s + r.executed, 0)

  const expenseTotal = expenseRows.reduce((s, r) => s + r.budget, 0)
  const expenseTotalCurrent = expenseRows.reduce((s, r) => s + r.current, 0)
  const expenseTotalExecuted = expenseRows.reduce((s, r) => s + r.executed, 0)

  const levelLabel = getLevelLabel(viewLevel)
  const isIncome = (type: 'income' | 'expense') => type === 'income'

  return (
    <div className="p-3 space-y-3">
      {/* 상단 조건 */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-bold text-slate-700">회계연도</span>
        <select className="border border-slate-300 rounded px-2 py-1.5 text-xs">
          <option>2026년</option>
          <option>2025년</option>
        </select>
        <span className="text-xs font-bold text-slate-700">예산구분</span>
        <select className="border border-slate-300 rounded px-2 py-1.5 text-xs">
          <option>본예산</option>
        </select>
        {tab === 'monthly' && (
          <select value={month} onChange={e => setMonth(e.target.value)} className="border border-slate-300 rounded px-2 py-1.5 text-xs">
            {Array.from({ length: 12 }, (_, i) => {
              const m = String(i + 1).padStart(2, '0')
              return <option key={m} value={`2026년 ${m}월`}>2026년 {m}월</option>
            })}
          </select>
        )}
        <div className="flex items-center gap-2">
          {(['gwan', 'hang', 'mok', 'semok'] as const).map(level => (
            <label key={level} className="flex items-center gap-1 text-xs text-slate-600 cursor-pointer">
              <input type="radio" name="viewLevel" checked={viewLevel === level} onChange={() => setViewLevel(level)} className="w-3 h-3 accent-blue-600" />
              {getLevelLabel(level)}
            </label>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-0.5">
          <button onClick={() => setTab('monthly')} className={`px-4 py-1.5 text-xs font-bold rounded transition-colors ${tab === 'monthly' ? 'text-white bg-blue-600' : 'text-slate-600 bg-white border border-slate-300 hover:bg-slate-50'}`}>월별</button>
          <button onClick={() => setTab('compare')} className={`px-4 py-1.5 text-xs font-bold rounded transition-colors ${tab === 'compare' ? 'text-white bg-blue-600' : 'text-slate-600 bg-white border border-slate-300 hover:bg-slate-50'}`}>연별</button>
        </div>
        <button className="flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 rounded text-xs text-slate-600 transition-colors" title="인쇄하기">
          <svg className="w-3.5 h-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5z" /></svg>
          인쇄
        </button>
      </div>

      {tab === 'monthly' ? (
        <>
          {/* 월별예산집행대비표 */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-[11px] border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300">
                  <th className="w-[30px] border-r border-slate-200 px-1 py-2.5"></th>
                  <th className="border-r border-slate-200 px-3 py-2.5 text-center font-bold text-slate-600 w-[220px]">계정과목</th>
                  <th className="border-r border-slate-200 px-3 py-2.5 text-center font-bold text-slate-600 w-[140px]">예산액</th>
                  <th className="border-r border-slate-200 px-3 py-2.5 text-center font-bold text-slate-600 w-[140px]">예산현액</th>
                  <th className="border-r border-slate-200 px-3 py-2.5 text-center font-bold text-slate-600 w-[120px]">집행금액</th>
                  <th className="border-r border-slate-200 px-3 py-2.5 text-center font-bold text-slate-600 w-[140px]">잔액</th>
                  <th className="px-3 py-2.5 text-center font-bold text-slate-600 w-[100px]">집행률</th>
                </tr>
              </thead>
              <tbody>
                {incomeRows.map((row, i) => {
                  const balance = row.current - row.executed
                  const rate = row.current > 0 ? ((row.executed / row.current) * 100).toFixed(2) : '0.00'
                  return (
                    <tr key={`i-${i}`} className="border-b border-slate-100 hover:bg-blue-50/30 transition-colors">
                      <td className="border-r border-slate-100 px-1 py-2 text-center">
                        <button className="w-5 h-5 flex items-center justify-center rounded-full bg-blue-100 text-blue-600 text-[10px] font-bold hover:bg-blue-200 transition-colors">+</button>
                      </td>
                      <td className="border-r border-slate-100 px-3 py-2 text-slate-700">
                        <span className={`text-[9px] font-bold text-white px-1 py-0.5 rounded mr-1.5 ${getRowBadgeColor(row)}`}>{getRowLabel(row)}</span>
                        {row.name}
                      </td>
                      <td className="border-r border-slate-100 px-3 py-2 text-right text-slate-700">{fmt(row.budget)}</td>
                      <td className="border-r border-slate-100 px-3 py-2 text-right text-slate-700">{fmt(row.current)}</td>
                      <td className="border-r border-slate-100 px-3 py-2 text-right text-blue-600">{fmt(row.executed)}</td>
                      <td className="border-r border-slate-100 px-3 py-2 text-right text-slate-700">{fmt(balance)}</td>
                      <td className="px-3 py-2 text-right text-slate-500">{rate}%</td>
                    </tr>
                  )
                })}
                <tr className="bg-teal-50 font-bold border-b border-slate-200">
                  <td className="border-r border-slate-200 px-1 py-2 text-center"><button className="w-5 h-5 flex items-center justify-center rounded-full bg-teal-200 text-teal-700 text-[10px] font-bold">+</button></td>
                  <td className="border-r border-slate-200 px-3 py-2 text-slate-800">세입 합계 ({incomeRows.length}건)</td>
                  <td className="border-r border-slate-200 px-3 py-2 text-right text-slate-800">{fmt(incomeTotal)}</td>
                  <td className="border-r border-slate-200 px-3 py-2 text-right text-slate-800">{fmt(incomeTotalCurrent)}</td>
                  <td className="border-r border-slate-200 px-3 py-2 text-right text-blue-700">{fmt(incomeTotalExecuted)}</td>
                  <td className="border-r border-slate-200 px-3 py-2 text-right text-slate-800">{fmt(incomeTotalCurrent - incomeTotalExecuted)}</td>
                  <td className="px-3 py-2 text-right text-slate-500 bg-green-50">0.00%</td>
                </tr>
                {expenseRows.map((row, i) => {
                  const balance = row.current - row.executed
                  const rate = row.current > 0 ? ((row.executed / row.current) * 100).toFixed(2) : '0.00'
                  return (
                    <tr key={`e-${i}`} className="border-b border-slate-100 hover:bg-red-50/30 transition-colors">
                      <td className="border-r border-slate-100 px-1 py-2 text-center">
                        <button className="w-5 h-5 flex items-center justify-center rounded-full bg-red-100 text-red-600 text-[10px] font-bold hover:bg-red-200 transition-colors">-</button>
                      </td>
                      <td className="border-r border-slate-100 px-3 py-2 text-slate-700">
                        <span className={`text-[9px] font-bold text-white px-1 py-0.5 rounded mr-1.5 ${getRowBadgeColor(row)}`}>{getRowLabel(row)}</span>
                        {row.name}
                      </td>
                      <td className="border-r border-slate-100 px-3 py-2 text-right text-slate-700">{fmt(row.budget)}</td>
                      <td className="border-r border-slate-100 px-3 py-2 text-right text-slate-700">{fmt(row.current)}</td>
                      <td className="border-r border-slate-100 px-3 py-2 text-right text-red-600">{fmt(row.executed)}</td>
                      <td className="border-r border-slate-100 px-3 py-2 text-right text-slate-700">{fmt(balance)}</td>
                      <td className="px-3 py-2 text-right text-slate-500">{rate}%</td>
                    </tr>
                  )
                })}
                <tr className="bg-teal-50 font-bold border-b border-slate-200">
                  <td className="border-r border-slate-200 px-1 py-2 text-center"><button className="w-5 h-5 flex items-center justify-center rounded-full bg-teal-200 text-teal-700 text-[10px] font-bold">+</button></td>
                  <td className="border-r border-slate-200 px-3 py-2 text-slate-800">세출 합계 ({expenseRows.length}건)</td>
                  <td className="border-r border-slate-200 px-3 py-2 text-right text-slate-800">{fmt(expenseTotal)}</td>
                  <td className="border-r border-slate-200 px-3 py-2 text-right text-slate-800">{fmt(expenseTotalCurrent)}</td>
                  <td className="border-r border-slate-200 px-3 py-2 text-right text-red-700">{fmt(expenseTotalExecuted)}</td>
                  <td className="border-r border-slate-200 px-3 py-2 text-right text-slate-800">{fmt(expenseTotalCurrent - expenseTotalExecuted)}</td>
                  <td className="px-3 py-2 text-right text-slate-500 bg-green-50">0.00%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <>
          {/* 예산집행대비표 (연별) */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
            <table className="w-full text-[10px] border-collapse min-w-[1200px]">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300">
                  <th className="border-r border-slate-200 px-2 py-2 text-center font-bold text-slate-600 w-[160px] sticky left-0 bg-slate-100 z-10">계정과목</th>
                  <th className="border-r border-slate-200 px-2 py-2 text-center font-bold text-slate-600 w-[100px]">예산액</th>
                  {[3,4,5,6,7,8,9,10,11,12,1,2].map(m => (
                    <th key={m} className="border-r border-slate-200 px-1 py-2 text-center font-bold text-slate-600 w-[75px]">{m}월</th>
                  ))}
                  <th className="border-r border-slate-200 px-2 py-2 text-center font-bold text-slate-600 w-[100px]">집행합계</th>
                  <th className="border-r border-slate-200 px-2 py-2 text-center font-bold text-slate-600 w-[100px]">잔액</th>
                  <th className="px-2 py-2 text-center font-bold text-slate-600 w-[60px]">집행률</th>
                </tr>
              </thead>
              <tbody>
                {/* 세입 */}
                {incomeRows.map((row, i) => (
                  <tr key={`ci-${i}`} className="border-b border-slate-100 hover:bg-blue-50/30">
                    <td className="border-r border-slate-100 px-2 py-1.5 text-slate-700 sticky left-0 bg-white z-10">
                      <span className={`text-[8px] font-bold text-white px-1 py-0.5 rounded mr-1 ${getRowBadgeColor(row)}`}>{getRowLabel(row)}</span>
                      {row.name}
                    </td>
                    <td className="border-r border-slate-100 px-2 py-1.5 text-right text-slate-700">{fmt(row.budget)}</td>
                    {Array.from({ length: 12 }, (_, m) => (
                      <td key={m} className="border-r border-slate-100 px-1 py-1.5 text-right text-slate-400">0</td>
                    ))}
                    <td className="border-r border-slate-100 px-2 py-1.5 text-right text-blue-600 font-bold">0</td>
                    <td className="border-r border-slate-100 px-2 py-1.5 text-right text-slate-700">{fmt(row.budget)}</td>
                    <td className="px-2 py-1.5 text-right text-slate-500">0.00%</td>
                  </tr>
                ))}
                <tr className="bg-teal-50 font-bold border-b border-slate-200">
                  <td className="border-r border-slate-200 px-2 py-2 text-slate-800 sticky left-0 bg-teal-50 z-10">세입 합계</td>
                  <td className="border-r border-slate-200 px-2 py-2 text-right text-slate-800">{fmt(incomeTotal)}</td>
                  {Array.from({ length: 12 }, (_, m) => (
                    <td key={m} className="border-r border-slate-200 px-1 py-2 text-right text-slate-400">0</td>
                  ))}
                  <td className="border-r border-slate-200 px-2 py-2 text-right text-blue-700">0</td>
                  <td className="border-r border-slate-200 px-2 py-2 text-right text-slate-800">{fmt(incomeTotal)}</td>
                  <td className="px-2 py-2 text-right text-slate-500 bg-green-50">0.00%</td>
                </tr>
                {/* 세출 */}
                {expenseRows.map((row, i) => (
                  <tr key={`ce-${i}`} className="border-b border-slate-100 hover:bg-red-50/30">
                    <td className="border-r border-slate-100 px-2 py-1.5 text-slate-700 sticky left-0 bg-white z-10">
                      <span className={`text-[8px] font-bold text-white px-1 py-0.5 rounded mr-1 ${getRowBadgeColor(row)}`}>{getRowLabel(row)}</span>
                      {row.name}
                    </td>
                    <td className="border-r border-slate-100 px-2 py-1.5 text-right text-slate-700">{fmt(row.budget)}</td>
                    {Array.from({ length: 12 }, (_, m) => (
                      <td key={m} className="border-r border-slate-100 px-1 py-1.5 text-right text-slate-400">0</td>
                    ))}
                    <td className="border-r border-slate-100 px-2 py-1.5 text-right text-red-600 font-bold">0</td>
                    <td className="border-r border-slate-100 px-2 py-1.5 text-right text-slate-700">{fmt(row.budget)}</td>
                    <td className="px-2 py-1.5 text-right text-slate-500">0.00%</td>
                  </tr>
                ))}
                <tr className="bg-teal-50 font-bold border-b border-slate-200">
                  <td className="border-r border-slate-200 px-2 py-2 text-slate-800 sticky left-0 bg-teal-50 z-10">세출 합계</td>
                  <td className="border-r border-slate-200 px-2 py-2 text-right text-slate-800">{fmt(expenseTotal)}</td>
                  {Array.from({ length: 12 }, (_, m) => (
                    <td key={m} className="border-r border-slate-200 px-1 py-2 text-right text-slate-400">0</td>
                  ))}
                  <td className="border-r border-slate-200 px-2 py-2 text-right text-red-700">0</td>
                  <td className="border-r border-slate-200 px-2 py-2 text-right text-slate-800">{fmt(expenseTotal)}</td>
                  <td className="px-2 py-2 text-right text-slate-500 bg-green-50">0.00%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* 하단 안내 */}
      <div className="space-y-0.5 text-[10px]">
        <p className="text-red-600">❗ 예산액 : 본예산</p>
        <p className="text-green-700">❗ 위 예산현액은 예산에 미 반영된 과목전용금액이 포함된 금액이며, 이를 기준으로 잔액 및 집행률이 표시됩니다.</p>
        <p className="text-red-600">❗ 출력물을 파일로 저장할 경우 문서 종류에 따라 양식이 틀어질 수 있습니다.</p>
      </div>
    </div>
  )
}
