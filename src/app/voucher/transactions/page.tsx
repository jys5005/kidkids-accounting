'use client'

import { useState, useEffect, useRef } from 'react'
import { incomeAccounts, expenseAccounts, accountCodeMap, subAccountCodeMap, isIncomeAccount } from '@/lib/accounts'

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
    if (activeView === '현금출납부' && !showRange) {
      if (!r.date.startsWith(filterYearMonth)) return false
    } else if (activeView === '현금출납부' && showRange) {
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
          {activeView === '현금출납부' ? (
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
          {activeView !== '현금출납부' && <div className="flex items-center gap-1.5 relative" ref={accountFilterRef}>
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
          {activeView !== '현금출납부' && <div className="flex items-center gap-1.5">
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
          {activeView !== '현금출납부' && <>
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
            <button className="px-2 py-1.5 border border-slate-300 rounded bg-white hover:bg-slate-50 text-slate-600" title="인쇄">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18.75 12h.008v.008h-.008V12zm-3 0h.008v.008h-.008V12z" /></svg>
            </button>
            <button className="px-2 py-1.5 border border-green-400 rounded bg-green-50 hover:bg-green-100 text-green-700" title="엑셀">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M14.5 1H6a2 2 0 00-2 2v18a2 2 0 002 2h12a2 2 0 002-2V6.5L14.5 1zM14 2l5 5h-5V2zM7.5 17.5L10 13l-2.5-4.5h1.8L10.8 11l1.5-2.5h1.8L11.6 13l2.5 4.5h-1.8L10.8 15l-1.5 2.5H7.5z" /></svg>
            </button>
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
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="bg-[#fffbeb] border-b border-[#f5b800]/30">
                  <th className="text-center px-4 py-2.5 font-normal text-slate-700 w-28">일자</th>
                  <th className="text-center px-4 py-2.5 font-normal text-slate-700 w-24">증빙번호</th>
                  <th className="text-left px-4 py-2.5 font-normal text-slate-700">적요</th>
                  <th className="text-right px-6 py-2.5 font-normal text-slate-700 w-32">차변(수입)</th>
                  <th className="text-right px-6 py-2.5 font-normal text-slate-700 w-32">대변(지출)</th>
                  <th className="text-right px-6 py-2.5 font-normal text-slate-700 w-32">잔액</th>
                  <th className="text-left px-4 py-2.5 font-normal text-slate-700 w-28">거래처</th>
                </tr>
              </thead>
              <tbody>
                {accountKeys.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-12 text-slate-400">거래내역이 없습니다</td></tr>
                ) : accountKeys.map(acctName => {
                  const rows = grouped[acctName]
                  const code = accountCodeMap[acctName] || ''
                  const isIncome = isIncomeAccount(acctName)
                  let balance = 0
                  const acctIncome = rows.reduce((s, r) => s + r.income, 0)
                  const acctExpense = rows.reduce((s, r) => s + r.expense, 0)
                  return (
                    <React.Fragment key={acctName}>
                      {/* 계정과목 헤더 */}
                      <tr className="bg-slate-100 border-t-2 border-[#f5b800]/40">
                        <td colSpan={7} className="px-4 py-2">
                          <span className="flex items-center gap-2">
                            <span className={`inline-block px-1 py-0 rounded border text-[10px] font-bold ${isIncome ? 'bg-blue-400 text-white border-blue-400' : 'bg-red-400 text-white border-red-400'}`}>목</span>
                            <span className={`font-bold ${isIncome ? 'text-blue-700' : 'text-red-600'}`}>{acctName}</span>
                            <span className="text-xs text-slate-400 font-mono">({code})</span>
                          </span>
                        </td>
                      </tr>
                      {/* 거래 내역 */}
                      {rows.map((row, idx) => {
                        balance += row.income - row.expense
                        return (
                          <tr key={row.id} className={`transition-colors hover:bg-[#fffbeb] ${idx % 2 === 1 ? 'bg-[#fffbeb]/30' : 'bg-white'} border-b border-[#f5b800]/20`}>
                            <td className="text-center px-4 py-2.5 text-slate-600">{row.date.slice(5)}</td>
                            <td className="text-center px-4 py-2.5 text-slate-500 text-xs font-mono">{row.docNo}</td>
                            <td className="text-left px-4 py-2.5 text-slate-600">{row.summary}</td>
                            <td className="text-right px-6 py-2.5 text-blue-600 font-medium">{fmt(row.income)}</td>
                            <td className="text-right px-6 py-2.5 text-red-600 font-medium">{fmt(row.expense)}</td>
                            <td className={`text-right px-6 py-2.5 font-medium ${balance < 0 ? 'text-red-600' : 'text-slate-700'}`}>{balance.toLocaleString('ko-KR')}</td>
                            <td className="text-left px-4 py-2.5 text-slate-500">{row.counterpart || '-'}</td>
                          </tr>
                        )
                      })}
                      {/* 계정 소계 */}
                      <tr className="bg-[#fffbeb]/60 border-b border-[#f5b800]/30">
                        <td></td>
                        <td></td>
                        <td className="text-right px-4 py-2 text-xs font-bold text-slate-500">소계</td>
                        <td className="text-right px-6 py-2 text-blue-700 font-bold">{fmt(acctIncome)}</td>
                        <td className="text-right px-6 py-2 text-red-700 font-bold">{fmt(acctExpense)}</td>
                        <td className={`text-right px-6 py-2 font-bold ${balance < 0 ? 'text-red-600' : 'text-slate-700'}`}>{balance.toLocaleString('ko-KR')}</td>
                        <td></td>
                      </tr>
                    </React.Fragment>
                  )
                })}
                {/* 총합계 */}
                <tr className="bg-[#fffbeb] border-t-2 border-[#f5b800]/40 font-medium">
                  <td></td>
                  <td></td>
                  <td className="text-right px-4 py-3 text-slate-700 font-bold">총합계</td>
                  <td className="text-right px-6 py-3 text-blue-700 font-bold">{totalIncome.toLocaleString('ko-KR')}</td>
                  <td className="text-right px-6 py-3 text-red-700 font-bold">{totalExpense.toLocaleString('ko-KR')}</td>
                  <td className={`text-right px-6 py-3 font-bold ${totalIncome - totalExpense < 0 ? 'text-red-600' : 'text-slate-700'}`}>{(totalIncome - totalExpense).toLocaleString('ko-KR')}</td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
        )
      })()}

      {/* 나머지 뷰 (준비중) */}
      {!['거래조회', '현금출납부', '총계정원장'].includes(activeView) && (
        <div className="bg-white rounded-xl border border-[#f5b800]/30 shadow-sm p-12 text-center text-slate-400 text-sm">
          {activeView} 준비중
        </div>
      )}
    </div>
  )
}
