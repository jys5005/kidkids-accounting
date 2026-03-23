'use client'

import { useState, useEffect, useRef } from 'react'
import { incomeAccounts, expenseAccounts, accountCodeMap, subAccountCodeMap, isIncomeAccount } from '@/lib/accounts'

interface DeletedVoucher {
  id: number
  date: string
  account: string
  subAccount: string
  summary: string
  income: number
  expense: number
  counterpart: string
  note: string
  deletedAt: string
}

const sampleData: DeletedVoucher[] = [
  { id: 101, date: '2026-03-03', account: '정부지원 보육료', subAccount: '', summary: '3월 정부지원 보육료 입금 (중복)', income: 15524000, expense: 0, counterpart: '사회보장정보원', note: '자동이체', deletedAt: '2026-03-15' },
  { id: 102, date: '2026-03-05', account: '보육교직원급여', subAccount: '', summary: '3월 교직원 기본급(중복 입력)', income: 0, expense: 4404593, counterpart: '교직원', note: '자동이체', deletedAt: '2026-03-16' },
  { id: 103, date: '2026-03-05', account: '수용비 및 수수료', subAccount: '', summary: '사무용품 구입(네이버)', income: 0, expense: 125000, counterpart: '네이버', note: '카드결제', deletedAt: '2026-03-18' },
  { id: 104, date: '2026-03-06', account: '수용비 및 수수료', subAccount: '', summary: '복사용지 구입', income: 0, expense: 45000, counterpart: '오피스디포', note: '카드결제', deletedAt: '2026-03-18' },
  { id: 105, date: '2026-03-06', account: '급식·간식재료비', subAccount: '', summary: '급간식 식재료(오입력)', income: 0, expense: 320000, counterpart: '쿠팡', note: '카드결제', deletedAt: '2026-03-17' },
  { id: 106, date: '2026-03-07', account: '공공요금 및 제세공과금', subAccount: '', summary: '2월 전기요금(중복)', income: 0, expense: 487600, counterpart: '한국전력', note: '자동이체', deletedAt: '2026-03-18' },
  { id: 107, date: '2026-03-08', account: '수용비 및 수수료', subAccount: '', summary: '11번가 구입', income: 0, expense: 55000, counterpart: '11번가', note: '카드결제', deletedAt: '2026-03-19' },
  { id: 108, date: '2026-03-10', account: '부모부담 보육료', subAccount: '', summary: '3월 보육료(오입력 정정)', income: 2340000, expense: 0, counterpart: '학부모', note: '계좌이체', deletedAt: '2026-03-17' },
  { id: 109, date: '2026-03-10', account: '기타 필요경비', subAccount: '차량운행비', summary: '3월 차량운행비(계정 오류)', income: 780000, expense: 0, counterpart: '학부모', note: '계좌이체', deletedAt: '2026-03-18' },
  { id: 110, date: '2026-03-11', account: '여비', subAccount: '', summary: '출장비 지급', income: 0, expense: 150000, counterpart: '교직원', note: '계좌이체', deletedAt: '2026-03-19' },
  { id: 111, date: '2026-03-12', account: '교재·교구 구입비', subAccount: '', summary: '교재 구입(취소)', income: 0, expense: 280000, counterpart: '교보문고', note: '카드결제', deletedAt: '2026-03-18' },
  { id: 112, date: '2026-03-13', account: '기타 운영비', subAccount: '', summary: '소독비(중복)', income: 0, expense: 200000, counterpart: '소독업체', note: '계좌이체', deletedAt: '2026-03-19' },
  { id: 113, date: '2026-03-14', account: '업무추진비', subAccount: '', summary: '원장 업무추진비', income: 0, expense: 300000, counterpart: '', note: '카드결제', deletedAt: '2026-03-19' },
  { id: 114, date: '2026-03-15', account: '복리후생비', subAccount: '', summary: '건강검진비(정정)', income: 0, expense: 350000, counterpart: '건강검진센터', note: '카드결제', deletedAt: '2026-03-19' },
  { id: 115, date: '2026-03-16', account: '급식·간식재료비', subAccount: '', summary: '식재료 추가(계정변경)', income: 0, expense: 670000, counterpart: '농협하나로마트', note: '카드결제', deletedAt: '2026-03-19' },
]

const fmt = (n: number) => n ? n.toLocaleString('ko-KR') : ''

export default function DeletedVoucherPage() {
  const [data] = useState<DeletedVoucher[]>(sampleData)
  const [checked, setChecked] = useState<Set<number>>(new Set())
  const [filterYearMonth, setFilterYearMonth] = useState('2026-03')
  const [startDate, setStartDate] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
  })
  const [endDate, setEndDate] = useState(() => {
    const d = new Date()
    return d.toISOString().slice(0, 10)
  })
  const [filterAccount, setFilterAccount] = useState('전체')
  const [filterEvidence, setFilterEvidence] = useState('전체')
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
  const [searchSummary, setSearchSummary] = useState('')

  const filtered = data.filter(r => {
    if (startDate && r.date < startDate) return false
    if (endDate && r.date > endDate) return false
    if (filterAccount !== '전체' && r.account !== filterAccount) return false
    if (filterEvidence !== '전체' && r.note !== filterEvidence) return false
    if (searchSummary && !r.summary.includes(searchSummary)) return false
    return true
  })

  const toggleCheck = (id: number) => {
    setChecked(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }
  const toggleAll = () => {
    if (checked.size === filtered.length) setChecked(new Set())
    else setChecked(new Set(filtered.map(r => r.id)))
  }

  const allAccountsWithSub = [...incomeAccounts, ...expenseAccounts]

  const yearMonthOptions: { value: string; label: string }[] = []
  for (let y = 2024; y <= 2028; y++) {
    for (let m = 1; m <= 12; m++) {
      yearMonthOptions.push({ value: `${y}-${String(m).padStart(2, '0')}`, label: `${y}년 ${m}월` })
    }
  }

  const inputCls = "px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-medium text-slate-700"
  const labelCls = "text-xs text-slate-500 font-medium whitespace-nowrap"

  return (
    <div className="space-y-3">
      {/* 필터 */}
      <div className="bg-white rounded-xl border border-teal-400/30 shadow-sm">
        <div className="px-4 py-3 border-b border-teal-400/20 flex items-center gap-2">
          <span className="text-sm font-bold text-slate-700">삭제 전표 목록</span>
          <span className="text-xs text-slate-400">삭제된 전표를 조회하고 복구할 수 있습니다</span>
        </div>
        <div className="px-4 py-3 flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className={labelCls}>발행기간</span>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={`${inputCls} w-36`} />
            <span className="text-slate-400 text-xs">~</span>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={`${inputCls} w-36`} />
          </div>
          <div className="flex items-center gap-1.5 relative" ref={accountFilterRef}>
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
                  const isSelected = filterAccount === a.value
                  return (
                    <button key={a.value} onClick={() => { setFilterAccount(a.value); setShowAccountFilter(false) }}
                      className={`w-full text-left px-3 py-1.5 text-xs transition-colors hover:bg-${color}-50 ${isSelected ? `bg-${color}-100 font-bold text-${color}-700` : `text-${color}-600`} ${a.isSub ? 'pl-5' : ''}`}>
                      <span className="flex items-center gap-1">
                        <span className={`inline-block px-1 py-0 rounded border text-[10px] font-bold ${a.isSub ? `bg-${color}-500 text-white border-${color}-500` : `bg-${color}-400 text-white border-${color}-400`}`}>{a.isSub ? '세목' : '목'}</span>
                        {a.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <span className={labelCls}>결제방식</span>
            <select value={filterEvidence} onChange={e => setFilterEvidence(e.target.value)} className={`${inputCls} w-28`}>
              <option value="전체">::전체::</option>
              <option value="카드결제">카드결제</option>
              <option value="아이행복카드">아이행복카드</option>
              <option value="계좌이체">계좌이체</option>
              <option value="자동이체">자동이체</option>
              <option value="지로">지로</option>
              <option value="현금결제">현금결제</option>
              <option value="기타">기타</option>
            </select>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={labelCls}>적요</span>
            <input type="text" value={searchSummary} onChange={e => setSearchSummary(e.target.value)} placeholder="" className={`${inputCls} w-52`} />
          </div>
          <button className="px-5 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 ml-auto">조회</button>
        </div>
      </div>

      {/* 테이블 */}
      <div className="bg-white rounded-xl border border-teal-400/30 shadow-sm">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-teal-400/20">
          <span className="text-xs text-slate-400">{filtered.length}건</span>
          <button
            disabled={checked.size === 0}
            className={`px-5 py-1.5 text-xs font-bold rounded-lg ${checked.size > 0 ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
          >
            복구하기
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-teal-50 border-b border-teal-400/30">
                <th className="text-center px-3 py-2 w-10">
                  <input type="checkbox" className="rounded border-slate-300 w-4 h-4" checked={checked.size === filtered.length && filtered.length > 0} onChange={toggleAll} />
                </th>
                <th className="text-center px-4 py-2.5 font-normal text-slate-700 w-28">발행일</th>
                <th className="text-center px-4 py-2.5 font-normal text-slate-700 w-40">계정과목</th>
                <th className="text-center px-4 py-2.5 font-normal text-slate-700 w-28">세목</th>
                <th className="text-left px-4 py-2.5 font-normal text-slate-700">적요</th>
                <th className="text-right px-6 py-2.5 font-normal text-slate-700 w-36">수입액</th>
                <th className="text-right px-6 py-2.5 font-normal text-slate-700 w-36 pr-[50px]">지출액</th>
                <th className="text-left px-6 py-2.5 font-normal text-slate-700 w-32">거래처</th>
                <th className="text-left px-4 py-2.5 font-normal text-slate-700 w-24">결제방식</th>
                <th className="text-center px-4 py-2.5 font-normal text-slate-700 w-28">삭제일</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={10} className="text-center py-12 text-slate-400">삭제된 전표가 없습니다</td></tr>
              ) : filtered.map((row, idx) => (
                <tr key={row.id} className={`transition-colors hover:bg-teal-50 ${checked.has(row.id) ? 'bg-teal-50/60' : idx % 2 === 1 ? 'bg-teal-50/30' : 'bg-white'} border-b border-slate-50`}>
                  <td className="text-center px-3 py-2">
                    <input type="checkbox" className="rounded border-slate-300 w-4 h-4" checked={checked.has(row.id)} onChange={() => toggleCheck(row.id)} />
                  </td>
                  <td className="text-center px-4 py-2.5 text-slate-600">{row.date.slice(5)}</td>
                  <td className="text-center px-4 py-2.5">
                    <span className={`font-medium ${isIncomeAccount(row.account) ? 'text-blue-700' : 'text-red-600'}`}>{row.account}</span>
                  </td>
                  <td className="text-center px-4 py-2.5">
                    <span className="text-slate-600 text-sm">{row.subAccount || '-'}</span>
                  </td>
                  <td className="text-left px-4 py-2.5 text-slate-600">{row.summary}</td>
                  <td className="text-right px-6 py-2.5 text-blue-600 font-medium">{fmt(row.income)}</td>
                  <td className="text-right px-6 py-2.5 text-red-600 font-medium pr-[50px]">{fmt(row.expense)}</td>
                  <td className="text-left px-6 py-2.5 text-slate-500">{row.counterpart || '-'}</td>
                  <td className="text-left px-4 py-2.5 text-slate-400 text-xs">{row.note || '-'}</td>
                  <td className="text-center px-4 py-2.5 text-slate-400">{row.deletedAt.slice(5)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
