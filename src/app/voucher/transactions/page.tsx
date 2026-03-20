'use client'

import React, { useState, useEffect, useRef } from 'react'
import { incomeAccounts, expenseAccounts, accountCodeMap, subAccountCodeMap, isIncomeAccount } from '@/lib/accounts'
import PrintModal from '@/components/PrintModal'

interface Transaction {
  id: number
  date: string
  docNo: string
  account: string
  subAccount: string
  summary: string
  income: number
  expense: number
  counterpart: string
  note: string
}

const sampleData: Transaction[] = [
  { id: 1, date: '2026-03-01', docNo: 'A000001', account: '전년도 이월금', subAccount: '', summary: '전년도이월금', income: 0, expense: 0, counterpart: '', note: '' },
  { id: 2, date: '2026-03-01', docNo: 'A000002', account: '특별활동비', subAccount: '', summary: '특별활동비 국이안 10', income: 10, expense: 0, counterpart: '', note: '' },
  { id: 3, date: '2026-03-02', docNo: 'A000003', account: '기타 필요경비', subAccount: '현장학습비', summary: '현장학습비 국이안 10', income: 10, expense: 0, counterpart: '', note: '' },
  { id: 4, date: '2026-03-03', docNo: 'A000004', account: '기타 필요경비', subAccount: '부모부담행사비', summary: '행사비 국이안 10', income: 10, expense: 0, counterpart: '', note: '' },
  { id: 5, date: '2026-03-03', docNo: 'A000005', account: '정부지원 보육료', subAccount: '', summary: '3월 정부지원 보육료 입금', income: 15524000, expense: 0, counterpart: '사회보장정보원', note: '' },
  { id: 6, date: '2026-03-03', docNo: 'A000006', account: '인건비 보조금', subAccount: '', summary: '3월 인건비 보조금 입금', income: 8594960, expense: 0, counterpart: '구청', note: '' },
  { id: 7, date: '2026-03-03', docNo: 'A000007', account: '기관보육료', subAccount: '', summary: '3월 기관보육료 입금', income: 3200000, expense: 0, counterpart: '사회보장정보원', note: '' },
  { id: 8, date: '2026-03-03', docNo: 'A000008', account: '연장보육료', subAccount: '', summary: '3월 연장보육료', income: 1450000, expense: 0, counterpart: '사회보장정보원', note: '' },
  { id: 9, date: '2026-03-05', docNo: 'A000009', account: '보육교직원급여', subAccount: '', summary: '3월 교직원 기본급 지급', income: 0, expense: 4404593, counterpart: '교직원', note: '자동이체' },
  { id: 10, date: '2026-03-05', docNo: 'A000010', account: '보육교직원급여', subAccount: '', summary: '3월 교직원 기본급(2)', income: 0, expense: 3850000, counterpart: '교직원', note: '자동이체' },
  { id: 11, date: '2026-03-05', docNo: 'A000011', account: '보육교직원수당', subAccount: '', summary: '3월 직책수당 지급', income: 0, expense: 850000, counterpart: '교직원', note: '계좌이체' },
  { id: 12, date: '2026-03-05', docNo: 'A000012', account: '법정부담금', subAccount: '', summary: '3월 국민연금 사업주부담금', income: 0, expense: 396450, counterpart: '국민연금공단', note: '현금결제' },
  { id: 13, date: '2026-03-05', docNo: 'A000013', account: '법정부담금', subAccount: '', summary: '3월 건강보험 사업주부담금', income: 0, expense: 310270, counterpart: '건강보험공단', note: '지로' },
  { id: 14, date: '2026-03-05', docNo: 'A000014', account: '퇴직금 및 퇴직적립금', subAccount: '퇴직적립금', summary: '3월 퇴직적립금', income: 0, expense: 650000, counterpart: '퇴직연금', note: '자동이체' },
  { id: 15, date: '2026-03-06', docNo: 'A000015', account: '급식·간식재료비', subAccount: '', summary: '3월 급간식 식재료 구입(쿠팡)', income: 0, expense: 1850000, counterpart: '쿠팡', note: '카드결제' },
  { id: 16, date: '2026-03-06', docNo: 'A000016', account: '수용비 및 수수료', subAccount: '', summary: '사무용품 구입(네이버)', income: 0, expense: 125000, counterpart: '네이버', note: '카드결제' },
  { id: 17, date: '2026-03-07', docNo: 'A000017', account: '공공요금 및 제세공과금', subAccount: '', summary: '2월 전기요금 납부', income: 0, expense: 487600, counterpart: '한국전력', note: '자동이체' },
  { id: 18, date: '2026-03-07', docNo: 'A000018', account: '공공요금 및 제세공과금', subAccount: '', summary: '2월 수도요금 납부', income: 0, expense: 156000, counterpart: '수도사업소', note: '자동이체' },
  { id: 19, date: '2026-03-07', docNo: 'A000019', account: '이자수입', subAccount: '', summary: '보통예금 이자', income: 8320, expense: 0, counterpart: '국민은행', note: '' },
  { id: 20, date: '2026-03-10', docNo: 'A000020', account: '부모부담 보육료', subAccount: '', summary: '3월 부모부담 보육료(1차)', income: 2340000, expense: 0, counterpart: '학부모', note: '' },
  { id: 21, date: '2026-03-10', docNo: 'A000021', account: '기타 필요경비', subAccount: '차량운행비', summary: '3월 차량운행비 수납', income: 780000, expense: 0, counterpart: '학부모', note: '' },
  { id: 22, date: '2026-03-11', docNo: 'A000022', account: '여비', subAccount: '', summary: '출장비 지급', income: 0, expense: 150000, counterpart: '교직원', note: '계좌이체' },
  { id: 23, date: '2026-03-12', docNo: 'A000023', account: '교재·교구 구입비', subAccount: '', summary: '교재 구입', income: 0, expense: 280000, counterpart: '교보문고', note: '카드결제' },
  { id: 24, date: '2026-03-13', docNo: 'A000024', account: '영유아복리비', subAccount: '', summary: '영유아 간식 지원', income: 0, expense: 180000, counterpart: '마트', note: '카드결제' },
  { id: 25, date: '2026-03-14', docNo: 'A000025', account: '그 밖의 지원금', subAccount: '', summary: '특별지원금 입금', income: 500000, expense: 0, counterpart: '구청', note: '' },
  { id: 26, date: '2026-03-15', docNo: 'A000026', account: '교직원연수·연구비', subAccount: '', summary: '교사 연수비', income: 0, expense: 250000, counterpart: '연수원', note: '계좌이체' },
  { id: 27, date: '2026-03-16', docNo: 'A000027', account: '급식·간식재료비', subAccount: '', summary: '식재료 추가 구입', income: 0, expense: 670000, counterpart: '농협하나로마트', note: '카드결제' },
  { id: 28, date: '2026-03-17', docNo: 'A000028', account: '원장급여', subAccount: '', summary: '3월 원장 급여', income: 0, expense: 3500000, counterpart: '원장', note: '자동이체' },
  { id: 29, date: '2026-03-18', docNo: 'A000029', account: '연료비', subAccount: '', summary: '난방유 구입', income: 0, expense: 450000, counterpart: '에너지업체', note: '계좌이체' },
  { id: 30, date: '2026-03-19', docNo: 'A000030', account: '비지정후원금', subAccount: '', summary: '후원금 입금', income: 100000, expense: 0, counterpart: '후원자', note: '' },
]

const fmt = (n: number) => n ? n.toLocaleString('ko-KR') : ''

const views = ['거래조회', '현금출납부', '총계정원장', '계정과목별총괄표', '월별수입지출합계', '합계잔액시산표', '월별비교'] as const

export default function TransactionsPage() {
  const [data] = useState<Transaction[]>(sampleData)
  const [checked, setChecked] = useState<Set<number>>(new Set())
  const [activeView, setActiveView] = useState<typeof views[number]>('거래조회')
  const [showRange, setShowRange] = useState(false)
  const [showAllLedger, setShowAllLedger] = useState(false)
  const [editRow, setEditRow] = useState<Transaction | null>(null)
  const [editDropdown, setEditDropdown] = useState<'income' | 'expense' | null>(null)
  const [rangeStartYm, setRangeStartYm] = useState('2026-03')
  const [rangeEndYm, setRangeEndYm] = useState('2026-03')
  const [filterYearMonth, setFilterYearMonth] = useState(() => {
    const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
  })
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [filterAccount, setFilterAccount] = useState('전체')
  const [filterPayment, setFilterPayment] = useState('전체')
  const [amountFrom, setAmountFrom] = useState('')
  const [amountTo, setAmountTo] = useState('')
  const [searchSummary, setSearchSummary] = useState('')
  const [showAccountFilter, setShowAccountFilter] = useState(false)
  const accountFilterRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!showAccountFilter) return
    const handler = (e: MouseEvent) => {
      if (accountFilterRef.current && !accountFilterRef.current.contains(e.target as Node)) setShowAccountFilter(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showAccountFilter])

  const allAccountsWithSub = [...incomeAccounts, ...expenseAccounts]

  const yearMonthOptions: { value: string; label: string }[] = []
  for (let y = 2024; y <= 2028; y++) {
    for (let m = 1; m <= 12; m++) {
      yearMonthOptions.push({ value: `${y}-${String(m).padStart(2, '0')}`, label: `${y}년 ${m}월` })
    }
  }

  const filtered = data.filter(r => {
    if ((activeView === '현금출납부' || activeView === '총계정원장' || activeView === '계정과목별총괄표' || activeView === '월별수입지출합계') && !showRange) {
      if (!r.date.startsWith(filterYearMonth)) return false
    } else if ((activeView === '현금출납부' || activeView === '총계정원장' || activeView === '계정과목별총괄표' || activeView === '월별수입지출합계') && showRange) {
      const ym = r.date.substring(0, 7)
      if (ym < rangeStartYm || ym > rangeEndYm) return false
    } else {
      if (startDate && r.date < startDate) return false
      if (endDate && r.date > endDate) return false
    }
    if (filterAccount !== '전체' && r.account !== filterAccount && !(r.subAccount && filterAccount.includes(r.subAccount))) return false
    if (filterPayment !== '전체' && r.note !== filterPayment) return false
    if (amountFrom) { const v = Number(amountFrom.replace(/,/g, '')); if (v && (r.income || r.expense) < v) return false }
    if (amountTo) { const v = Number(amountTo.replace(/,/g, '')); if (v && (r.income || r.expense) > v) return false }
    if (searchSummary && !r.summary.includes(searchSummary)) return false
    return true
  })

  const totalIncome = filtered.reduce((s, r) => s + r.income, 0)
  const totalExpense = filtered.reduce((s, r) => s + r.expense, 0)

  const toggleCheck = (id: number) => {
    setChecked(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next })
  }
  const toggleAll = () => {
    if (checked.size === filtered.length) setChecked(new Set())
    else setChecked(new Set(filtered.map(r => r.id)))
  }

  const inputCls = "px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-medium text-slate-700"
  const labelCls = "text-xs text-slate-500 font-medium whitespace-nowrap"

  return (
    <div className="space-y-1">
      {/* 라디오 뷰 선택 */}
      <div className="bg-white rounded-xl border border-[#f5b800]/30 shadow-sm">
        <div className="px-4 py-3 flex items-center gap-1.5 flex-wrap">
          {views.map(v => (
            <button key={v} onClick={() => setActiveView(v)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors ${
                activeView === v
                  ? 'bg-[#f5b800] text-white border-[#f5b800]'
                  : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
              }`}>
              {v}
            </button>
          ))}
        </div>

        {/* 출납년월 + 필터 */}
        <div className="px-4 py-3 border-t border-[#f5b800]/20 flex items-center gap-3 flex-wrap">
          {(activeView === '합계잔액시산표' || activeView === '월별비교') ? (
            <div className="flex items-center gap-3">
              <span className={labelCls}>출납년월</span>
              <select value={filterYearMonth} onChange={e => setFilterYearMonth(e.target.value)}
                className="px-3 py-1.5 border-2 border-slate-400 rounded-lg text-xs font-medium text-slate-700">
                {yearMonthOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <button className="px-5 py-1.5 text-xs font-bold text-white bg-[#f5b800] rounded-lg hover:bg-[#e5ab00]">조회</button>
            </div>
          ) : (activeView === '계정과목별총괄표' || activeView === '월별수입지출합계') ? (
            <div className="flex items-center gap-3">
              <span className={labelCls}>출납년도</span>
              <label className="flex items-center gap-1 cursor-pointer">
                <input type="checkbox" checked={showRange} onChange={e => setShowRange(e.target.checked)} className="rounded border-slate-300 w-3.5 h-3.5 accent-[#f5b800]" />
                <span className="text-xs text-slate-600 font-medium">구간별</span>
              </label>
              <select value={filterYearMonth.split('-')[0]} onChange={e => setFilterYearMonth(`${e.target.value}-03`)}
                className="px-3 py-1.5 border-2 border-slate-400 rounded-lg text-xs font-medium text-slate-700">
                {Array.from({ length: 5 }, (_, i) => 2024 + i).map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              {showRange && <>
                <div className="w-px h-5 bg-slate-300"></div>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                  className="px-3 py-1.5 border-2 border-slate-400 rounded-lg text-xs font-medium text-slate-700 w-36" />
                <span className="text-slate-400 text-xs">~</span>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                  className="px-3 py-1.5 border-2 border-slate-400 rounded-lg text-xs font-medium text-slate-700 w-36" />
              </>}
              <button className="px-5 py-1.5 text-xs font-bold text-white bg-[#f5b800] rounded-lg hover:bg-[#e5ab00]">조회</button>
            </div>
          ) : (activeView === '현금출납부' || activeView === '총계정원장') ? (
            <div className="flex items-center gap-1.5">
              <span className={labelCls}>출납연월</span>
              <label className="flex items-center gap-1 cursor-pointer">
                <input type="checkbox" checked={showRange} onChange={e => setShowRange(e.target.checked)} className="rounded border-slate-300 w-3.5 h-3.5 accent-[#f5b800]" />
                <span className="text-xs text-slate-600 font-medium">구간별</span>
              </label>
              {!showRange && <select value={filterYearMonth} onChange={e => setFilterYearMonth(e.target.value)}
                className="px-3 py-1.5 border-2 border-slate-400 rounded-lg text-xs font-medium text-slate-700">
                {yearMonthOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>}
              {activeView === '총계정원장' && <label className="flex items-center gap-1 cursor-pointer">
                <input type="checkbox" checked={showAllLedger} onChange={e => setShowAllLedger(e.target.checked)} className="rounded border-slate-300 w-3.5 h-3.5 accent-[#f5b800]" />
                <span className="text-xs text-slate-600 font-medium">원장전체보기</span>
              </label>}
              {showRange && <>
                <select value={rangeStartYm} onChange={e => setRangeStartYm(e.target.value)}
                  className="px-3 py-1.5 border-2 border-slate-400 rounded-lg text-xs font-medium text-slate-700 ml-2">
                  {yearMonthOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <span className="text-slate-400 text-xs">~</span>
                <select value={rangeEndYm} onChange={e => setRangeEndYm(e.target.value)}
                  className="px-3 py-1.5 border-2 border-slate-400 rounded-lg text-xs font-medium text-slate-700">
                  {yearMonthOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <button onClick={() => { const d = new Date(); const s = new Date(d.getFullYear(), d.getMonth() - 2, 1); setRangeStartYm(`${s.getFullYear()}-${String(s.getMonth() + 1).padStart(2, '0')}`); setRangeEndYm(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`) }}
                  className="px-2 py-1 text-[10px] font-bold bg-[#f5b800] text-white rounded hover:bg-[#e5ab00]">3개월</button>
                <button onClick={() => { const d = new Date(); const s = new Date(d.getFullYear(), d.getMonth() - 5, 1); setRangeStartYm(`${s.getFullYear()}-${String(s.getMonth() + 1).padStart(2, '0')}`); setRangeEndYm(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`) }}
                  className="px-2 py-1 text-[10px] font-bold bg-[#f5b800] text-white rounded hover:bg-[#e5ab00]">6개월</button>
                <button onClick={() => { const y = new Date().getFullYear() - 1; setRangeStartYm(`${y}-03`); setRangeEndYm(`${y + 1}-02`) }}
                  className="px-2 py-1 text-[10px] font-bold bg-[#f5b800] text-white rounded hover:bg-[#e5ab00]">과년도</button>
              </>}
              <button className="px-5 py-1.5 text-xs font-bold text-white bg-[#f5b800] rounded-lg hover:bg-[#e5ab00] ml-2">조회</button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className={labelCls}>출납기간</span>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={`${inputCls} w-36`} />
              <span className="text-slate-400 text-xs">~</span>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={`${inputCls} w-36`} />
              <button onClick={() => { const d = new Date(); setStartDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`); setEndDate(d.toISOString().slice(0, 10)) }}
                className="px-2 py-1 text-[10px] font-bold bg-[#f5b800] text-white rounded hover:bg-[#e5ab00]">이번달</button>
              <button onClick={() => { const d = new Date(); d.setMonth(d.getMonth() - 1); setStartDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`); setEndDate(new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10)) }}
                className="px-2 py-1 text-[10px] font-bold bg-[#f5b800] text-white rounded hover:bg-[#e5ab00]">이전달</button>
              <button onClick={() => { const y = new Date().getFullYear() - 1; setStartDate(`${y}-03-01`); setEndDate(`${y + 1}-02-28`) }}
                className="px-2 py-1 text-[10px] font-bold bg-[#f5b800] text-white rounded hover:bg-[#e5ab00]">과년도</button>
            </div>
          )}
          {activeView !== '현금출납부' && activeView !== '총계정원장' && activeView !== '계정과목별총괄표' && activeView !== '월별수입지출합계' && activeView !== '합계잔액시산표' && activeView !== '월별비교' && <div className="flex items-center gap-1.5 relative" ref={accountFilterRef}>
            <span className={labelCls}>계정과목</span>
            <button type="button" onClick={() => setShowAccountFilter(!showAccountFilter)}
              className={`${inputCls} w-44 text-left cursor-pointer flex items-center justify-between ${showAccountFilter ? 'ring-1 ring-slate-400' : ''}`}>
              <span className={filterAccount === '전체' ? 'text-slate-400' : ''}>{filterAccount === '전체' ? '::전체::' : filterAccount}</span>
              <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
            </button>
            {showAccountFilter && (
              <div className="absolute top-full left-12 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-[100] w-[240px] max-h-[320px] overflow-y-auto">
                <button onClick={() => { setFilterAccount('전체'); setShowAccountFilter(false) }}
                  className={`w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 ${filterAccount === '전체' ? 'bg-slate-100 font-bold' : 'text-slate-600'}`}>::전체::</button>
                {allAccountsWithSub.map(a => {
                  const isIncome = incomeAccounts.includes(a)
                  const color = isIncome ? 'blue' : 'red'
                  return (
                    <button key={a.value} onClick={() => { setFilterAccount(a.value); setShowAccountFilter(false) }}
                      className={`w-full text-left px-3 py-1.5 text-xs transition-colors hover:bg-${color}-50 text-${color}-600 ${filterAccount === a.value ? `bg-${color}-100 font-bold text-${color}-700` : ''} ${a.isSub ? 'pl-5' : ''}`}>
                      <span className="flex items-center gap-1">
                        <span className={`inline-block px-1 py-0 rounded border text-[10px] font-bold ${a.isSub ? `bg-${color}-500 text-white border-${color}-500` : `bg-${color}-400 text-white border-${color}-400`}`}>{a.isSub ? '세목' : '목'}</span>
                        {a.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>}
          {activeView !== '현금출납부' && activeView !== '총계정원장' && activeView !== '계정과목별총괄표' && activeView !== '월별수입지출합계' && activeView !== '합계잔액시산표' && activeView !== '월별비교' && <div className="flex items-center gap-1.5">
            <span className={labelCls}>결제방식</span>
            <select value={filterPayment} onChange={e => setFilterPayment(e.target.value)} className={`${inputCls} w-24`}>
              <option value="전체">::전체::</option>
              <option value="카드결제">카드결제</option>
              <option value="아이행복카드">아이행복카드</option>
              <option value="계좌이체">계좌이체</option>
              <option value="자동이체">자동이체</option>
              <option value="지로">지로</option>
              <option value="현금결제">현금결제</option>
              <option value="기타">기타</option>
            </select>
          </div>}
          {activeView !== '현금출납부' && activeView !== '총계정원장' && activeView !== '계정과목별총괄표' && activeView !== '월별수입지출합계' && activeView !== '합계잔액시산표' && activeView !== '월별비교' && <>
            <div className="w-px h-6 bg-slate-300 mx-1"></div>
            <div className="flex items-center gap-1.5">
              <span className={labelCls}>금액</span>
              <input type="text" value={amountFrom} onChange={e => { const v = e.target.value.replace(/[^0-9]/g, ''); setAmountFrom(v ? Number(v).toLocaleString('ko-KR') : '') }} placeholder="원" className={`${inputCls} w-24 text-right`} />
              <span className="text-slate-400 text-xs">~</span>
              <input type="text" value={amountTo} onChange={e => { const v = e.target.value.replace(/[^0-9]/g, ''); setAmountTo(v ? Number(v).toLocaleString('ko-KR') : '') }} placeholder="원" className={`${inputCls} w-24 text-right`} />
            </div>
            <div className="w-px h-6 bg-slate-300 mx-1"></div>
            <div className="flex items-center gap-1.5">
              <span className={labelCls}>품목(적요)</span>
              <input type="text" value={searchSummary} onChange={e => setSearchSummary(e.target.value)} className={`${inputCls} w-40`} />
              <button className="px-5 py-1.5 text-xs font-bold text-white bg-[#f5b800] rounded-lg hover:bg-[#e5ab00]">조회</button>
            </div>
          </>}
        </div>

        {/* 요약 */}
        <div className="px-4 py-2 border-t border-[#f5b800]/20 flex items-center justify-between">
          <div className="flex items-center gap-6 text-xs">
            <span className="text-slate-500">수입합계: <span className="font-bold text-blue-700">{totalIncome.toLocaleString('ko-KR')}</span></span>
            <span className="text-slate-500">지출합계: <span className="font-bold text-red-600">{totalExpense.toLocaleString('ko-KR')}</span></span>
            <span className="text-slate-500">전표개수: <span className="font-bold text-slate-700">{filtered.length}</span> (<span className="text-blue-600">수입 {filtered.filter(r => r.income > 0).length}</span> / <span className="text-red-600">지출 {filtered.filter(r => r.expense > 0).length}</span>)</span>
          </div>
          <div className="flex items-center gap-2">
            {activeView === '총계정원장' ? (<>
              <button className="px-3 py-1.5 text-[11px] font-bold border border-slate-300 rounded bg-white hover:bg-slate-50 text-slate-600 flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18.75 12h.008v.008h-.008V12zm-3 0h.008v.008h-.008V12z" /></svg>
                거래처
              </button>
              <button className="px-2 py-1.5 border border-green-400 rounded bg-green-50 hover:bg-green-100 text-green-700">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M14.5 1H6a2 2 0 00-2 2v18a2 2 0 002 2h12a2 2 0 002-2V6.5L14.5 1zM14 2l5 5h-5V2zM7.5 17.5L10 13l-2.5-4.5h1.8L10.8 11l1.5-2.5h1.8L11.6 13l2.5 4.5h-1.8L10.8 15l-1.5 2.5H7.5z" /></svg>
              </button>
              <button className="px-3 py-1.5 text-[11px] font-bold border border-slate-300 rounded bg-white hover:bg-slate-50 text-slate-600 flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18.75 12h.008v.008h-.008V12zm-3 0h.008v.008h-.008V12z" /></svg>
                증빙서번호
              </button>
              <button className="px-2 py-1.5 border border-green-400 rounded bg-green-50 hover:bg-green-100 text-green-700">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M14.5 1H6a2 2 0 00-2 2v18a2 2 0 002 2h12a2 2 0 002-2V6.5L14.5 1zM14 2l5 5h-5V2zM7.5 17.5L10 13l-2.5-4.5h1.8L10.8 11l1.5-2.5h1.8L11.6 13l2.5 4.5h-1.8L10.8 15l-1.5 2.5H7.5z" /></svg>
              </button>
              <div className="w-px h-6 bg-slate-300 mx-1"></div>
              <button className="px-3 py-1.5 text-[11px] font-bold rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-600 flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18.75 12h.008v.008h-.008V12zm-3 0h.008v.008h-.008V12z" /></svg>
                거래처<span className="px-1.5 py-0.5 bg-[#e5ab00] text-white rounded text-[9px] font-bold">총괄</span>
              </button>
              <button className="px-3 py-1.5 text-[11px] font-bold rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-600 flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18.75 12h.008v.008h-.008V12zm-3 0h.008v.008h-.008V12z" /></svg>
                증빙서번호<span className="px-1.5 py-0.5 bg-[#e5ab00] text-white rounded text-[9px] font-bold">총괄</span>
              </button>
            </>) : (<>
              <button className="px-2 py-1.5 border border-slate-300 rounded bg-white hover:bg-slate-50 text-slate-600" title="인쇄">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18.75 12h.008v.008h-.008V12zm-3 0h.008v.008h-.008V12z" /></svg>
              </button>
              <button className="px-2 py-1.5 border border-green-400 rounded bg-green-50 hover:bg-green-100 text-green-700" title="엑셀">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M14.5 1H6a2 2 0 00-2 2v18a2 2 0 002 2h12a2 2 0 002-2V6.5L14.5 1zM14 2l5 5h-5V2zM7.5 17.5L10 13l-2.5-4.5h1.8L10.8 11l1.5-2.5h1.8L11.6 13l2.5 4.5h-1.8L10.8 15l-1.5 2.5H7.5z" /></svg>
              </button>
            </>)}
          </div>
        </div>
      </div>

      {/* 거래조회 / 현금출납부 테이블 */}
      {(activeView === '거래조회' || activeView === '현금출납부') && (
        <div className="bg-white rounded-xl border border-[#f5b800]/30 shadow-sm overflow-auto max-h-[calc(100vh-220px)]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="bg-[#fffbeb] border-b border-[#f5b800]/30">
                <th className="text-center px-3 py-2.5 w-10">
                  <input type="checkbox" className="rounded border-slate-300 w-4 h-4" checked={checked.size === filtered.length && filtered.length > 0} onChange={toggleAll} />
                </th>
                <th className="text-center px-4 py-2.5 font-normal text-slate-700 w-28">발행일</th>
                <th className="text-center px-4 py-2.5 font-normal text-slate-700 w-24">증빙번호</th>
                <th className="text-center px-4 py-2.5 font-normal text-slate-700 w-36">계정과목</th>
                <th className="text-center px-4 py-2.5 font-normal text-slate-700 w-28">세목</th>
                <th className="text-left px-4 py-2.5 font-normal text-slate-700">적요</th>
                <th className="text-right px-6 py-2.5 font-normal text-slate-700 w-32">수입액</th>
                <th className="text-right px-6 py-2.5 font-normal text-slate-700 w-32">지출액</th>
                <th className="text-left px-4 py-2.5 font-normal text-slate-700 w-28">거래처</th>
                <th className="text-left px-4 py-2.5 font-normal text-slate-700 w-24">결제방식</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={10} className="text-center py-12 text-slate-400">거래내역이 없습니다</td></tr>
              ) : filtered.map((row, idx) => (
                <tr key={row.id} className={`transition-colors hover:bg-[#fffbeb] ${checked.has(row.id) ? 'bg-[#fffbeb]/60' : idx % 2 === 1 ? 'bg-[#fffbeb]/30' : 'bg-white'} border-b border-[#f5b800]/20`}>
                  <td className="text-center px-3 py-2.5">
                    <input type="checkbox" className="rounded border-slate-300 w-4 h-4" checked={checked.has(row.id)} onChange={() => toggleCheck(row.id)} />
                  </td>
                  <td className="text-center px-4 py-2.5 text-slate-600">{row.date.slice(5)}</td>
                  <td className="text-center px-4 py-2.5 text-slate-500 text-xs font-mono">{row.docNo}</td>
                  <td className="text-center px-4 py-2.5">
                    <span className={`font-medium ${isIncomeAccount(row.account) ? 'text-blue-700' : 'text-red-600'}`}>{row.account}</span>
                  </td>
                  <td className="text-center px-4 py-2.5">
                    <span className="text-slate-600 text-sm">{row.subAccount || '-'}</span>
                  </td>
                  <td className="text-left px-4 py-2.5 text-slate-600">{row.summary}</td>
                  <td className="text-right px-6 py-2.5 text-blue-600 font-medium">{fmt(row.income)}</td>
                  <td className="text-right px-6 py-2.5 text-red-600 font-medium">{fmt(row.expense)}</td>
                  <td className="text-left px-4 py-2.5 text-slate-500">{row.counterpart || '-'}</td>
                  <td className="text-left px-4 py-2.5 text-slate-400 text-xs">{row.note || '-'}</td>
                </tr>
              ))}
              <tr className="bg-[#fffbeb] border-t-2 border-[#f5b800]/40 font-medium">
                <td></td>
                <td className="text-center px-4 py-3 text-slate-700">합계</td>
                <td></td><td></td><td></td><td></td>
                <td className="text-right px-6 py-3 text-blue-700 font-bold">{totalIncome.toLocaleString('ko-KR')}</td>
                <td className="text-right px-6 py-3 text-red-700 font-bold">{totalExpense.toLocaleString('ko-KR')}</td>
                <td></td><td></td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* 총계정원장 */}
      {activeView === '총계정원장' && (() => {
        // 계정과목별 그룹핑
        const grouped: Record<string, Transaction[]> = {}
        filtered.forEach(r => {
          const key = r.account
          if (!grouped[key]) grouped[key] = []
          grouped[key].push(r)
        })
        const accountKeys = Object.keys(grouped).sort((a, b) => {
          const codeA = accountCodeMap[a] || '9999'
          const codeB = accountCodeMap[b] || '9999'
          return codeA.localeCompare(codeB)
        })
        return (
          <div className="bg-white rounded-xl border border-[#f5b800]/30 shadow-sm overflow-auto max-h-[calc(100vh-220px)]">
            {accountKeys.length === 0 ? (
              <div className="text-center py-12 text-slate-400">거래내역이 없습니다</div>
            ) : accountKeys.map(acctName => {
              const rows = grouped[acctName]
              const code = accountCodeMap[acctName] || ''
              const isIncome = isIncomeAccount(acctName)
              let balance = 0
              const acctIncome = rows.reduce((s, r) => s + r.income, 0)
              const acctExpense = rows.reduce((s, r) => s + r.expense, 0)
              // 세목별 그룹
              const subGroups: Record<string, Transaction[]> = {}
              rows.forEach(r => {
                const sk = r.subAccount || '(없음)'
                if (!subGroups[sk]) subGroups[sk] = []
                subGroups[sk].push(r)
              })
              return (
                <div key={acctName} className="mb-4">
                  {/* 계정과목 헤더: 목/항/관 */}
                  <div className="px-4 py-2 border-b border-[#f5b800]/20 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1.5">
                        <span className={`inline-block px-1 py-0 rounded border text-[10px] font-bold ${isIncome ? 'bg-blue-400 text-white border-blue-400' : 'bg-red-400 text-white border-red-400'}`}>목</span>
                        <span className={`font-bold ${isIncome ? 'text-blue-700' : 'text-red-600'}`}>{acctName}</span>
                      </span>
                      <span className="text-xs text-slate-400">항) {isIncome ? '보육료' : '인건비'}</span>
                      <span className="text-xs text-slate-400">관) {isIncome ? '보육료' : '인건비'}</span>
                    </div>
                    <span className="text-xs text-slate-400 font-mono">{code}</span>
                  </div>
                  {/* 테이블 */}
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[#fffbeb] border-b border-[#f5b800]/30">
                        <th className="text-center px-4 py-2 font-normal text-slate-700 w-16">월일</th>
                        <th className="text-center px-4 py-2 font-normal text-slate-700 w-28">세목</th>
                        <th className="text-left px-4 py-2 font-normal text-slate-700 w-48">적요</th>
                        <th className="text-left px-4 py-2 font-normal text-slate-700 w-36">거래처</th>
                        <th className="text-center px-4 py-2 font-normal text-slate-700 w-24">증빙서번호</th>
                        <th className="text-right px-4 py-2 font-normal text-slate-700 w-28">예산액</th>
                        <th className="text-right px-4 py-2 font-normal text-slate-700 w-28">수입금액</th>
                        <th className="text-right px-4 py-2 font-normal text-slate-700 w-28">지출금액</th>
                        <th className="text-right px-4 py-2 font-normal text-slate-700 w-28">잔액</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* 전월이월 */}
                      <tr className="bg-white border-b border-[#f5b800]/20">
                        <td className="text-center px-4 py-2.5 text-slate-600"></td>
                        <td className="text-center px-4 py-2.5 text-slate-600"></td>
                        <td className="text-left px-4 py-2.5 text-slate-600 font-medium">전월이월</td>
                        <td className="text-left px-4 py-2.5 text-slate-500"></td>
                        <td className="text-center px-4 py-2.5 text-slate-500"></td>
                        <td className="text-right px-4 py-2.5 text-slate-600">0</td>
                        <td className="text-right px-4 py-2.5 text-blue-600">0</td>
                        <td className="text-right px-4 py-2.5 text-red-600"></td>
                        <td className="text-right px-4 py-2.5 text-slate-700">0</td>
                      </tr>
                      {/* 세목별 그룹핑 */}
                      {(() => {
                        const subKeys = Object.keys(subGroups).sort()
                        return subKeys.map(subName => {
                          const subRows = subGroups[subName]
                          const subIncome = subRows.reduce((s, r) => s + r.income, 0)
                          const subExpense = subRows.reduce((s, r) => s + r.expense, 0)
                          const hasSubAccount = subName !== '(없음)'
                          return (
                            <React.Fragment key={subName}>
                              {/* 세목 헤더 */}
                              {hasSubAccount && (
                                <tr className="bg-slate-50/50 border-b border-[#f5b800]/20">
                                  <td colSpan={9} className="px-4 py-1.5">
                                    <span className="flex items-center gap-1.5">
                                      <span className={`inline-block px-1 py-0 rounded border text-[10px] font-bold ${isIncome ? 'bg-blue-500 text-white border-blue-500' : 'bg-red-500 text-white border-red-500'}`}>세목</span>
                                      <span className={`text-xs font-medium ${isIncome ? 'text-blue-600' : 'text-red-500'}`}>{subName}</span>
                                      <span className="text-[10px] text-slate-400 font-mono">({subAccountCodeMap[subName] || ''})</span>
                                    </span>
                                  </td>
                                </tr>
                              )}
                              {/* 거래 내역 */}
                              {subRows.map((row, idx) => {
                                balance += row.income - row.expense
                                return (
                                  <tr key={row.id} className={`transition-colors hover:bg-[#fffbeb] ${idx % 2 === 0 ? 'bg-[#fffbeb]/30' : 'bg-white'} border-b border-[#f5b800]/20`}>
                                    <td className="text-center px-4 py-2.5 text-slate-600">{row.date.slice(5)}</td>
                                    <td className="text-center px-4 py-2.5 text-slate-600 text-xs">{row.subAccount || '-'}</td>
                                    <td className="text-left px-4 py-2.5 text-slate-600">
                                      <div className="flex items-center gap-1">
                                        <button onClick={() => { setEditRow({...row}); setEditDropdown(null) }} className="px-1.5 py-0.5 text-[10px] font-medium border border-slate-300 rounded bg-white hover:bg-slate-50 text-slate-500">수정</button>
                                        {row.summary}
                                      </div>
                                    </td>
                                    <td className="text-left px-4 py-2.5 text-slate-500">{row.counterpart || '-'}</td>
                                    <td className="text-center px-4 py-2.5 text-slate-500 text-xs font-mono">{row.docNo}</td>
                                    <td className="text-right px-4 py-2.5 text-slate-400"></td>
                                    <td className="text-right px-4 py-2.5 text-blue-600 font-medium">{fmt(row.income)}</td>
                                    <td className="text-right px-4 py-2.5 text-red-600 font-medium">{fmt(row.expense)}</td>
                                    <td className={`text-right px-4 py-2.5 font-medium ${balance < 0 ? 'text-red-600' : 'text-slate-700'}`}>{balance.toLocaleString('ko-KR')}</td>
                                  </tr>
                                )
                              })}
                              {/* 세목 소계 */}
                              {hasSubAccount && (
                                <tr className="bg-slate-50/30 border-b border-[#f5b800]/20">
                                  <td></td><td></td>
                                  <td className="text-left px-4 py-1.5 text-[10px] font-bold text-slate-400">세목 소계</td>
                                  <td></td><td></td><td></td>
                                  <td className="text-right px-4 py-1.5 text-blue-600 text-xs font-bold">{fmt(subIncome)}</td>
                                  <td className="text-right px-4 py-1.5 text-red-600 text-xs font-bold">{fmt(subExpense)}</td>
                                  <td className={`text-right px-4 py-1.5 text-xs font-bold ${subIncome - subExpense < 0 ? 'text-red-600' : 'text-slate-600'}`}>{(subIncome - subExpense).toLocaleString('ko-KR')}</td>
                                </tr>
                              )}
                            </React.Fragment>
                          )
                        })
                      })()}
                      {/* 목 소계 */}
                      <tr className="bg-[#fffbeb] border-b border-[#f5b800]/30 font-medium">
                        <td></td><td></td>
                        <td className="text-left px-4 py-2 text-xs font-bold text-slate-500">목 소계</td>
                        <td></td><td></td><td></td>
                        <td className="text-right px-4 py-2 text-blue-700 font-bold">{fmt(acctIncome)}</td>
                        <td className="text-right px-4 py-2 text-red-700 font-bold">{fmt(acctExpense)}</td>
                        <td className={`text-right px-4 py-2 font-bold ${balance < 0 ? 'text-red-600' : 'text-slate-700'}`}>{balance.toLocaleString('ko-KR')}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )
            })}
            {/* 총합계 */}
            <div className="px-4 py-3 bg-[#fffbeb] border-t-2 border-[#f5b800]/40 flex items-center justify-end gap-8 text-sm font-bold">
              <span className="text-slate-700">총합계</span>
              <span className="text-blue-700">수입 {totalIncome.toLocaleString('ko-KR')}</span>
              <span className="text-red-700">지출 {totalExpense.toLocaleString('ko-KR')}</span>
              <span className={totalIncome - totalExpense < 0 ? 'text-red-600' : 'text-slate-700'}>잔액 {(totalIncome - totalExpense).toLocaleString('ko-KR')}</span>
            </div>
          </div>
        )
      })()}

      {/* 계정과목별총괄표 */}
      {activeView === '계정과목별총괄표' && showRange && (() => {
        // 구간별: 계정과목 / 입금액 / 출금액 / 잔액
        const rangeFiltered = data.filter(r => {
          if (startDate && r.date < startDate) return false
          if (endDate && r.date > endDate) return false
          return true
        })
        const acctMap = new Map<string, { income: number; expense: number }>()
        rangeFiltered.forEach(r => {
          const key = r.account
          const prev = acctMap.get(key) || { income: 0, expense: 0 }
          acctMap.set(key, { income: prev.income + r.income, expense: prev.expense + r.expense })
        })
        const rows = Array.from(acctMap.entries())
          .map(([name, val]) => ({ name, code: accountCodeMap[name] || '', isIncome: isIncomeAccount(name), ...val }))
          .sort((a, b) => a.code.localeCompare(b.code))
        let runBalance = 0
        const totalIn = rows.reduce((s, r) => s + r.income, 0)
        const totalOut = rows.reduce((s, r) => s + r.expense, 0)
        return (
          <div className="bg-white rounded-xl border border-[#f5b800]/30 shadow-sm overflow-auto max-h-[calc(100vh-220px)]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="bg-[#fffbeb] border-b border-[#f5b800]/30">
                  <th className="text-left px-6 py-2.5 font-normal text-slate-700">계정과목</th>
                  <th className="text-right px-6 py-2.5 font-normal text-slate-700 w-36">입금액</th>
                  <th className="text-right px-6 py-2.5 font-normal text-slate-700 w-36">출금액</th>
                  <th className="text-right px-6 py-2.5 font-normal text-slate-700 w-36">잔액</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, idx) => {
                  runBalance += r.income - r.expense
                  return (
                    <tr key={r.name} className={`border-b border-[#f5b800]/20 hover:bg-[#fffbeb] ${idx % 2 === 1 ? 'bg-[#fffbeb]/30' : 'bg-white'}`}>
                      <td className="text-left px-6 py-2.5 text-slate-700">{r.name}</td>
                      <td className="text-right px-6 py-2.5 text-slate-700">{r.income ? fmt(r.income) : ''}</td>
                      <td className="text-right px-6 py-2.5 text-slate-700">{r.expense ? fmt(r.expense) : ''}</td>
                      <td className="text-right px-6 py-2.5 text-slate-700">{runBalance.toLocaleString('ko-KR')}</td>
                    </tr>
                  )
                })}
                <tr className="bg-[#fffbeb] border-t-2 border-[#f5b800]/40 font-medium">
                  <td className="text-center px-6 py-2.5 text-slate-700 font-bold">합계</td>
                  <td className="text-right px-6 py-2.5 text-slate-700 font-bold">{fmt(totalIn)}</td>
                  <td className="text-right px-6 py-2.5 text-slate-700 font-bold">{fmt(totalOut)}</td>
                  <td className="text-right px-6 py-2.5 text-slate-700 font-bold">{(totalIn - totalOut).toLocaleString('ko-KR')}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )
      })()}
      {activeView === '계정과목별총괄표' && !showRange && (() => {
        // 회계연도 월 목록
        const fiscalYear = Number(filterYearMonth.split('-')[0])
        const allMonths: string[] = []
        for (let m = 3; m <= 12; m++) allMonths.push(`${fiscalYear}-${String(m).padStart(2, '0')}`)
        allMonths.push(`${fiscalYear + 1}-01`, `${fiscalYear + 1}-02`)
        // 구간별이면 선택 범위만
        const months = showRange ? allMonths.filter(m => m >= rangeStartYm && m <= rangeEndYm) : allMonths

        // 전체 계정과목 (목+세목, 코드순)
        const allAccts: { code: string; name: string; isIncome: boolean; isSub: boolean }[] = []
        const addAccts = (list: typeof incomeAccounts, isInc: boolean) => {
          list.forEach(a => {
            const code = a.isSub ? (subAccountCodeMap[a.label] || '') : (accountCodeMap[a.value] || '')
            allAccts.push({ code, name: a.isSub ? a.label : a.value, isIncome: isInc, isSub: !!a.isSub })
          })
        }
        addAccts(incomeAccounts, true)
        addAccts(expenseAccounts, false)
        allAccts.sort((a, b) => a.code.localeCompare(b.code))

        // 월별 집계 (목 + 세목)
        const monthlyData: Record<string, Record<string, number>> = {}
        data.forEach(r => {
          const ym = r.date.substring(0, 7)
          // 목 집계
          const mKey = r.account
          if (!monthlyData[mKey]) monthlyData[mKey] = {}
          monthlyData[mKey][ym] = (monthlyData[mKey][ym] || 0) + r.income + r.expense
          // 세목 집계
          if (r.subAccount) {
            const sKey = r.subAccount
            if (!monthlyData[sKey]) monthlyData[sKey] = {}
            monthlyData[sKey][ym] = (monthlyData[sKey][ym] || 0) + r.income + r.expense
          }
        })

        return (
          <div className="bg-white rounded-xl border border-[#f5b800]/30 shadow-sm overflow-auto max-h-[calc(100vh-220px)]">
            <table className="text-xs" style={{ minWidth: '1400px' }}>
              <thead className="sticky top-0 z-10">
                <tr className="bg-[#fffbeb] border-b border-[#f5b800]/30">
                  <th className="text-center px-4 py-2.5 font-normal text-slate-700 w-16 sticky left-0 bg-[#fffbeb] z-20">계정</th>
                  <th className="text-left px-4 py-2.5 font-normal text-slate-700 w-44 sticky left-16 bg-[#fffbeb] z-20 whitespace-nowrap">계정과목</th>
                  <th className="text-right px-4 py-2.5 font-normal text-slate-700 w-28">예산액</th>
                  <th className="text-right px-4 py-2.5 font-normal text-slate-700 w-28">총합계</th>
                  <th className="text-center px-3 py-2.5 font-normal text-slate-700 w-14">비율</th>
                  {months.map(m => (
                    <th key={m} className="text-right px-3 py-2.5 font-normal text-slate-700 w-24">{m}</th>
                  ))}
                  <th className="text-right px-4 py-2.5 font-normal text-slate-700 w-28">합계</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const incomeAccts = allAccts.filter(a => a.isIncome)
                  const expenseAccts = allAccts.filter(a => !a.isIncome)
                  const renderRows = (rows: typeof allAccts) => rows.map((acct, idx) => {
                    const mData = monthlyData[acct.name] || {}
                    const total = months.reduce((s, m) => s + (mData[m] || 0), 0)
                    const budget = 0
                    const ratio = budget > 0 ? Math.round((total / budget) * 100) : 0
                    return (
                      <tr key={acct.code + acct.name} className={`border-b border-[#f5b800]/20 hover:bg-[#fffbeb] ${idx % 2 === 1 ? 'bg-[#fffbeb]/30' : 'bg-white'}`}>
                        <td className="text-center px-4 py-2.5 text-slate-600 font-mono sticky left-0 bg-inherit z-10">{acct.code}</td>
                        <td className="text-left px-4 py-2.5 sticky left-16 bg-inherit z-10 whitespace-nowrap">
                          <span className="flex items-center gap-1">
                            <span className={`inline-block px-1 py-0 rounded border text-[9px] font-bold ${acct.isSub ? (acct.isIncome ? 'bg-blue-500 text-white border-blue-500' : 'bg-red-500 text-white border-red-500') : (acct.isIncome ? 'bg-blue-400 text-white border-blue-400' : 'bg-red-400 text-white border-red-400')}`}>{acct.isSub ? '세목' : '목'}</span>
                            <span className={`${acct.isSub ? 'text-xs' : 'font-medium'} ${acct.isIncome ? 'text-blue-700' : 'text-red-600'}`}>{acct.name}</span>
                          </span>
                        </td>
                        <td className="text-right px-4 py-2.5 text-slate-600">{fmt(budget)}</td>
                        <td className="text-right px-4 py-2.5 text-slate-700 font-medium">{fmt(total)}</td>
                        <td className="text-center px-3 py-2.5 text-slate-400">{ratio}%</td>
                        {months.map(m => (
                          <td key={m} className="text-right px-3 py-2.5 text-slate-600">{fmt(mData[m] || 0)}</td>
                        ))}
                        <td className="text-right px-4 py-2.5 text-slate-700 font-medium">{fmt(total)}</td>
                      </tr>
                    )
                  })
                  const sectionTotal = (rows: typeof allAccts, label: string, color: string) => {
                    const totals = months.map(m => rows.filter(a => !a.isSub).reduce((s, a) => s + ((monthlyData[a.name] || {})[m] || 0), 0))
                    const grandTotal = totals.reduce((s, v) => s + v, 0)
                    return (
                      <tr className="bg-[#fffbeb] border-b border-[#f5b800]/30 font-medium">
                        <td className="sticky left-0 bg-[#fffbeb] z-10"></td>
                        <td className={`text-left px-3 py-2 text-xs font-bold sticky left-16 bg-[#fffbeb] z-10 ${color}`}>{label} 소계</td>
                        <td className="text-right px-3 py-2 text-slate-400">0</td>
                        <td className={`text-right px-3 py-2 font-bold ${color}`}>{fmt(grandTotal)}</td>
                        <td className="text-center px-2 py-2 text-slate-400"></td>
                        {totals.map((v, i) => <td key={i} className={`text-right px-2 py-2 font-bold ${color}`}>{fmt(v)}</td>)}
                        <td className={`text-right px-3 py-2 font-bold ${color}`}>{fmt(grandTotal)}</td>
                      </tr>
                    )
                  }
                  return (<>
                    {/* 수입 헤더 */}
                    <tr className="bg-blue-50/50 border-b border-[#f5b800]/30">
                      <td colSpan={5 + months.length + 1} className="px-3 py-1.5 text-xs font-bold text-blue-700 sticky left-0 bg-blue-50/50 z-10">수입</td>
                    </tr>
                    {renderRows(incomeAccts)}
                    {sectionTotal(incomeAccts, '수입', 'text-blue-700')}
                    {/* 지출 헤더 */}
                    <tr className="bg-red-50/50 border-b border-[#f5b800]/30 border-t-2 border-t-[#f5b800]/40">
                      <td colSpan={5 + months.length + 1} className="px-3 py-1.5 text-xs font-bold text-red-600 sticky left-0 bg-red-50/50 z-10">지출</td>
                    </tr>
                    {renderRows(expenseAccts)}
                    {sectionTotal(expenseAccts, '지출', 'text-red-600')}
                  </>)
                })()}
              </tbody>
            </table>
          </div>
        )
      })()}

      {/* 월별수입지출합계 */}
      {activeView === '월별수입지출합계' && (() => {
        const fiscalYear = Number(filterYearMonth.split('-')[0])
        const months: string[] = []
        for (let m = 3; m <= 12; m++) months.push(`${fiscalYear}-${String(m).padStart(2, '0')}`)
        months.push(`${fiscalYear + 1}-01`, `${fiscalYear + 1}-02`)

        const monthlyIncome: Record<string, number> = {}
        const monthlyExpense: Record<string, number> = {}
        data.forEach(r => {
          const ym = r.date.substring(0, 7)
          monthlyIncome[ym] = (monthlyIncome[ym] || 0) + r.income
          monthlyExpense[ym] = (monthlyExpense[ym] || 0) + r.expense
        })

        let runBalance = 0
        const totalIn = months.reduce((s, m) => s + (monthlyIncome[m] || 0), 0)
        const totalOut = months.reduce((s, m) => s + (monthlyExpense[m] || 0), 0)

        return (
          <div className="bg-white rounded-xl border border-[#f5b800]/30 shadow-sm overflow-auto max-h-[calc(100vh-220px)]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="bg-[#fffbeb] border-b border-[#f5b800]/30">
                  <th className="text-center px-6 py-2.5 font-normal text-slate-700 w-32">월구분</th>
                  <th className="text-right px-6 py-2.5 font-normal text-slate-700 w-40">수입액</th>
                  <th className="text-right px-6 py-2.5 font-normal text-slate-700 w-40">지출액</th>
                  <th className="text-right px-6 py-2.5 font-normal text-slate-700 w-40">차이액</th>
                  <th className="text-right px-6 py-2.5 font-normal text-slate-700 w-40">월잔액</th>
                </tr>
              </thead>
              <tbody>
                {months.map((m, idx) => {
                  const inc = monthlyIncome[m] || 0
                  const exp = monthlyExpense[m] || 0
                  const diff = inc - exp
                  runBalance += diff
                  return (
                    <tr key={m} className={`border-b border-[#f5b800]/20 hover:bg-[#fffbeb] ${idx % 2 === 1 ? 'bg-[#fffbeb]/30' : 'bg-white'}`}>
                      <td className="text-center px-6 py-2.5 text-slate-700 font-medium">{m}</td>
                      <td className="text-right px-6 py-2.5 text-slate-700">{fmt(inc)}</td>
                      <td className="text-right px-6 py-2.5 text-slate-700">{fmt(exp)}</td>
                      <td className="text-right px-6 py-2.5 text-slate-700">{fmt(diff)}</td>
                      <td className={`text-right px-6 py-2.5 font-medium ${runBalance < 0 ? 'text-red-600' : 'text-slate-700'}`}>{runBalance.toLocaleString('ko-KR')}</td>
                    </tr>
                  )
                })}
                <tr className="bg-[#fffbeb] border-t-2 border-[#f5b800]/40 font-medium">
                  <td className="text-center px-6 py-2.5 text-slate-700 font-bold">누계</td>
                  <td className="text-right px-6 py-2.5 text-slate-700 font-bold">{fmt(totalIn)}</td>
                  <td className="text-right px-6 py-2.5 text-slate-700 font-bold">{fmt(totalOut)}</td>
                  <td className="text-right px-6 py-2.5 text-slate-700 font-bold">{fmt(totalIn - totalOut)}</td>
                  <td className={`text-right px-6 py-2.5 font-bold ${runBalance < 0 ? 'text-red-600' : 'text-slate-700'}`}>{runBalance.toLocaleString('ko-KR')}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )
      })()}

      {/* 합계잔액시산표 */}
      {activeView === '합계잔액시산표' && (() => {
        // 계정별 수입/지출 누적 집계
        const acctMap = new Map<string, { income: number; expense: number }>()
        // 해당 월까지 누적
        const ymFilter = filterYearMonth
        data.forEach(r => {
          const ym = r.date.substring(0, 7)
          if (ym > ymFilter) return
          const key = r.account
          const prev = acctMap.get(key) || { income: 0, expense: 0 }
          acctMap.set(key, { income: prev.income + r.income, expense: prev.expense + r.expense })
        })
        // 당월 합계
        const monthMap = new Map<string, { income: number; expense: number }>()
        data.forEach(r => {
          if (!r.date.startsWith(ymFilter)) return
          const key = r.account
          const prev = monthMap.get(key) || { income: 0, expense: 0 }
          monthMap.set(key, { income: prev.income + r.income, expense: prev.expense + r.expense })
        })

        const allAcctNames = [...incomeAccounts.filter(a => !a.isSub), ...expenseAccounts.filter(a => !a.isSub)]
        const rows = allAcctNames.map(a => {
          const cum = acctMap.get(a.value) || { income: 0, expense: 0 }
          const mon = monthMap.get(a.value) || { income: 0, expense: 0 }
          return { name: a.value, code: accountCodeMap[a.value] || '', isIncome: isIncomeAccount(a.value), cumIncome: cum.income, cumExpense: cum.expense, monIncome: mon.income, monExpense: mon.expense }
        }).sort((a, b) => a.code.localeCompare(b.code))

        const totalCumIn = rows.reduce((s, r) => s + r.cumIncome, 0)
        const totalMonIn = rows.reduce((s, r) => s + r.monIncome, 0)
        const totalCumOut = rows.reduce((s, r) => s + r.cumExpense, 0)
        const totalMonOut = rows.reduce((s, r) => s + r.monExpense, 0)

        return (
          <div className="bg-white rounded-xl border border-[#f5b800]/30 shadow-sm overflow-auto max-h-[calc(100vh-220px)]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="bg-[#fffbeb] border-b border-[#f5b800]/30">
                  <th className="text-right px-6 py-2.5 font-normal text-slate-700 w-36">수입 누계</th>
                  <th className="text-right px-6 py-2.5 font-normal text-slate-700 w-36">수입 합계</th>
                  <th className="text-center px-6 py-2.5 font-normal text-slate-700">계정과목</th>
                  <th className="text-right px-6 py-2.5 font-normal text-slate-700 w-36">지출 합계</th>
                  <th className="text-right px-6 py-2.5 font-normal text-slate-700 w-36">지출 누계</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, idx) => (
                  <tr key={r.name} className={`border-b border-[#f5b800]/20 hover:bg-[#fffbeb] ${idx % 2 === 1 ? 'bg-[#fffbeb]/30' : 'bg-white'}`}>
                    <td className="text-right px-6 py-2.5 text-slate-700">{fmt(r.cumIncome)}</td>
                    <td className="text-right px-6 py-2.5 text-slate-700">{fmt(r.monIncome)}</td>
                    <td className="text-center px-6 py-2.5">
                      <span className={`font-medium ${r.isIncome ? 'text-blue-700' : 'text-red-600'}`}>{r.name}</span>
                    </td>
                    <td className="text-right px-6 py-2.5 text-slate-700">{fmt(r.monExpense)}</td>
                    <td className="text-right px-6 py-2.5 text-slate-700">{fmt(r.cumExpense)}</td>
                  </tr>
                ))}
                <tr className="bg-[#fffbeb] border-t-2 border-[#f5b800]/40 font-medium">
                  <td className="text-right px-6 py-2.5 text-slate-700 font-bold">{fmt(totalCumIn)}</td>
                  <td className="text-right px-6 py-2.5 text-slate-700 font-bold">{fmt(totalMonIn)}</td>
                  <td className="text-center px-6 py-2.5 text-slate-700 font-bold">합계</td>
                  <td className="text-right px-6 py-2.5 text-slate-700 font-bold">{fmt(totalMonOut)}</td>
                  <td className="text-right px-6 py-2.5 text-slate-700 font-bold">{fmt(totalCumOut)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )
      })()}

      {/* 월별비교 */}
      {activeView === '월별비교' && (() => {
        const [baseY, baseM] = filterYearMonth.split('-').map(Number)
        const nextDate = new Date(baseY, baseM, 1)
        const nextYm = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`
        const baseData = data.filter(r => r.date.startsWith(filterYearMonth)).sort((a, b) => a.date.localeCompare(b.date))
        const nextData = data.filter(r => r.date.startsWith(nextYm)).sort((a, b) => a.date.localeCompare(b.date))

        // 계정별 그룹핑
        const allAcctNames = new Set<string>()
        baseData.forEach(r => allAcctNames.add(r.account))
        nextData.forEach(r => allAcctNames.add(r.account))
        const acctKeys = [...allAcctNames].sort((a, b) => (accountCodeMap[a] || '9999').localeCompare(accountCodeMap[b] || '9999'))

        return (
          <div className="bg-white rounded-xl border border-[#f5b800]/30 shadow-sm overflow-auto max-h-[calc(100vh-220px)]">
            <table className="w-full text-sm" style={{ minWidth: '1200px' }}>
              <thead className="sticky top-0 z-10">
                <tr className="bg-[#fffbeb] border-b border-[#f5b800]/30">
                  <th colSpan={4} className="text-center px-4 py-2.5 font-normal text-slate-700 border-r border-[#f5b800]/20">{filterYearMonth} 거래내역</th>
                  <th colSpan={4} className="text-center px-4 py-2.5 font-normal text-slate-700">{nextYm} 거래내역</th>
                </tr>
                <tr className="bg-[#fffbeb] border-b border-[#f5b800]/30">
                  <th className="text-center px-2 py-2 font-normal text-slate-700 w-12">일자</th>
                  <th className="text-left px-3 py-2 font-normal text-slate-700">적요</th>
                  <th className="text-right px-4 py-2 font-normal text-slate-700 w-28">수입액</th>
                  <th className="text-right px-4 py-2 font-normal text-slate-700 w-28 border-r border-[#f5b800]/20">지출액</th>
                  <th className="text-center px-2 py-2 font-normal text-slate-700 w-12">일자</th>
                  <th className="text-left px-3 py-2 font-normal text-slate-700">적요</th>
                  <th className="text-right px-4 py-2 font-normal text-slate-700 w-28">수입액</th>
                  <th className="text-right px-4 py-2 font-normal text-slate-700 w-28">지출액</th>
                </tr>
              </thead>
              <tbody>
                {acctKeys.map(acctName => {
                  const isIncome = isIncomeAccount(acctName)
                  const left = baseData.filter(r => r.account === acctName)
                  const right = nextData.filter(r => r.account === acctName)
                  const maxRows = Math.max(left.length, right.length, 1)
                  return (
                    <React.Fragment key={acctName}>
                      <tr className="bg-slate-50/50 border-b border-[#f5b800]/20">
                        <td colSpan={8} className="px-4 py-1.5">
                          <span className="flex items-center gap-1.5">
                            <span className={`inline-block px-1 py-0 rounded border text-[9px] font-bold ${isIncome ? 'bg-blue-400 text-white border-blue-400' : 'bg-red-400 text-white border-red-400'}`}>목</span>
                            <span className={`font-medium ${isIncome ? 'text-blue-700' : 'text-red-600'}`}>{acctName}</span>
                          </span>
                        </td>
                      </tr>
                      {Array.from({ length: maxRows }, (_, i) => {
                        const l = left[i]
                        const r = right[i]
                        return (
                          <tr key={i} className={`border-b border-[#f5b800]/20 hover:bg-[#fffbeb] ${i % 2 === 1 ? 'bg-[#fffbeb]/30' : 'bg-white'}`}>
                            <td className="text-center px-2 py-2 text-slate-600">{l?.date.slice(8) || ''}</td>
                            <td className="text-left px-3 py-2 text-slate-600 text-xs">{l?.summary || ''}</td>
                            <td className="text-right px-4 py-2 text-blue-600">{l?.income ? fmt(l.income) : ''}</td>
                            <td className="text-right px-4 py-2 text-red-600 border-r border-[#f5b800]/20">{l?.expense ? fmt(l.expense) : ''}</td>
                            <td className="text-center px-2 py-2 text-slate-600">{r?.date.slice(8) || ''}</td>
                            <td className="text-left px-3 py-2 text-slate-600 text-xs">{r?.summary || ''}</td>
                            <td className="text-right px-4 py-2 text-blue-600">{r?.income ? fmt(r.income) : ''}</td>
                            <td className="text-right px-4 py-2 text-red-600">{r?.expense ? fmt(r.expense) : ''}</td>
                          </tr>
                        )
                      })}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      })()}
      {/* 수정 팝업 */}
      {editRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setEditRow(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-[800px] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-3 border-b border-[#f5b800]/20 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-700">전표 수정</h3>
              <span className="text-xs text-slate-400">증빙번호: {editRow.docNo}</span>
            </div>
            <div className="p-5 space-y-4">
              {/* 1행: 발의일자, 발행일자, 계정과목+세목, 수입계정, 지출계정 */}
              <div className="flex items-end gap-3 flex-wrap">
                <div className="w-28">
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">발의일자</label>
                  <input type="date" value={editRow.date}
                    min={`${filterYearMonth}-01`}
                    max={`${filterYearMonth}-${new Date(Number(filterYearMonth.split('-')[0]), Number(filterYearMonth.split('-')[1]), 0).getDate()}`}
                    onChange={e => setEditRow(prev => prev ? {...prev, date: e.target.value} : prev)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                </div>
                <div className="w-28">
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">발행일자</label>
                  <input type="date" value={editRow.date}
                    min={`${filterYearMonth}-01`}
                    max={`${filterYearMonth}-${new Date(Number(filterYearMonth.split('-')[0]), Number(filterYearMonth.split('-')[1]), 0).getDate()}`}
                    onChange={e => setEditRow(prev => prev ? {...prev, date: e.target.value} : prev)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                </div>
                <div className="flex gap-1">
                  <div className="w-40">
                    <label className="text-xs font-semibold text-slate-500 mb-1 block">계정과목</label>
                    <div className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 flex items-center gap-1">
                      {editRow.account ? (
                        <span className={`font-bold ${isIncomeAccount(editRow.account) ? 'text-blue-600' : 'text-red-600'}`}>{editRow.account}</span>
                      ) : <span className="text-slate-300">미선택</span>}
                    </div>
                  </div>
                  <div className="w-28">
                    <label className="text-xs font-semibold text-slate-500 mb-1 block">세목</label>
                    <div className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50">
                      {editRow.subAccount || <span className="text-slate-300">-</span>}
                    </div>
                  </div>
                </div>
                <div className="relative">
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">수입계정</label>
                  <button type="button" onClick={() => setEditDropdown(editDropdown === 'income' ? null : 'income')}
                    className={`w-full px-3 py-2 rounded-lg text-sm text-left cursor-pointer font-bold text-white bg-blue-500 hover:bg-blue-600 ${editDropdown === 'income' ? 'ring-2 ring-blue-300' : ''}`}>
                    계정선택
                  </button>
                  {editDropdown === 'income' && (
                    <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-[100] w-[240px] max-h-[280px] overflow-y-auto">
                      {incomeAccounts.map(a => (
                        <button key={a.value} onClick={() => {
                          if (a.isSub) {
                            const idx = incomeAccounts.indexOf(a); let parent = ''
                            for (let i = idx - 1; i >= 0; i--) { if (!incomeAccounts[i].isSub) { parent = incomeAccounts[i].value; break } }
                            setEditRow(prev => prev ? {...prev, account: parent, subAccount: a.label, income: prev.income || prev.expense, expense: 0} : prev)
                          } else {
                            setEditRow(prev => prev ? {...prev, account: a.value, subAccount: '', income: prev.income || prev.expense, expense: 0} : prev)
                          }
                          setEditDropdown(null)
                        }} className={`w-full text-left px-3 py-1.5 text-xs transition-colors hover:bg-blue-50 text-blue-600 ${a.isSub ? 'pl-5' : ''}`}>
                          <span className="flex items-center gap-1">
                            <span className={`inline-block px-1 py-0 rounded border text-[10px] font-bold ${a.isSub ? 'bg-blue-500 text-white border-blue-500' : 'bg-blue-400 text-white border-blue-400'}`}>{a.isSub ? '세목' : '목'}</span>
                            {a.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="relative">
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">지출계정</label>
                  <button type="button" onClick={() => setEditDropdown(editDropdown === 'expense' ? null : 'expense')}
                    className={`w-full px-3 py-2 rounded-lg text-sm text-left cursor-pointer font-bold text-white bg-red-500 hover:bg-red-600 ${editDropdown === 'expense' ? 'ring-2 ring-red-300' : ''}`}>
                    계정선택
                  </button>
                  {editDropdown === 'expense' && (
                    <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-[100] w-[240px] max-h-[280px] overflow-y-auto">
                      {expenseAccounts.map(a => (
                        <button key={a.value} onClick={() => {
                          if (a.isSub) {
                            const idx = expenseAccounts.indexOf(a); let parent = ''
                            for (let i = idx - 1; i >= 0; i--) { if (!expenseAccounts[i].isSub) { parent = expenseAccounts[i].value; break } }
                            setEditRow(prev => prev ? {...prev, account: parent, subAccount: a.label, expense: prev.expense || prev.income, income: 0} : prev)
                          } else {
                            setEditRow(prev => prev ? {...prev, account: a.value, subAccount: '', expense: prev.expense || prev.income, income: 0} : prev)
                          }
                          setEditDropdown(null)
                        }} className={`w-full text-left px-3 py-1.5 text-xs transition-colors hover:bg-red-50 text-red-600 ${a.isSub ? 'pl-5' : ''}`}>
                          <span className="flex items-center gap-1">
                            <span className={`inline-block px-1 py-0 rounded border text-[10px] font-bold ${a.isSub ? 'bg-red-500 text-white border-red-500' : 'bg-red-400 text-white border-red-400'}`}>{a.isSub ? '세목' : '목'}</span>
                            {a.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {/* 2행: 금액, 적요, 거래처, 결제방식 */}
              <div className="flex items-end gap-3">
                <div className="w-28">
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">금액</label>
                  <input type="text" value={fmt(editRow.income || editRow.expense)}
                    onChange={e => {
                      const v = Number(e.target.value.replace(/[^0-9]/g, '')) || 0
                      setEditRow(prev => prev ? {...prev, ...(prev.income > 0 ? {income: v} : {expense: v})} : prev)
                    }}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-right font-medium" />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">적요</label>
                  <input type="text" value={editRow.summary} onChange={e => setEditRow(prev => prev ? {...prev, summary: e.target.value} : prev)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                </div>
                <div className="w-28">
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">거래처</label>
                  <input type="text" value={editRow.counterpart} onChange={e => setEditRow(prev => prev ? {...prev, counterpart: e.target.value} : prev)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                </div>
                <div className="w-28">
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">결제방식</label>
                  <select value={editRow.note} onChange={e => setEditRow(prev => prev ? {...prev, note: e.target.value} : prev)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
                    <option value="">선택</option>
                    <option value="카드결제">카드결제</option>
                    <option value="아이행복카드">아이행복카드</option>
                    <option value="계좌이체">계좌이체</option>
                    <option value="자동이체">자동이체</option>
                    <option value="지로">지로</option>
                    <option value="현금결제">현금결제</option>
                    <option value="기타">기타</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button onClick={() => setEditRow(null)}
                className="px-4 py-1.5 text-xs font-bold border border-slate-300 rounded-lg bg-white hover:bg-slate-50 text-slate-600">취소</button>
              <button onClick={() => { /* TODO: save */ setEditRow(null) }}
                className="px-4 py-1.5 text-xs font-bold border border-amber-400 rounded-lg bg-amber-500 hover:bg-amber-600 text-white">수정</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
