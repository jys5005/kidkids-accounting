'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { incomeAccounts, expenseAccounts, isIncomeAccount } from '@/lib/accounts'
import { getActiveBook } from '@/lib/ilovechild-books'

interface DeletedVoucher {
  id: number
  date: string
  type?: '수입' | '지출' | '반납'
  account: string
  subAccount: string
  summary: string
  amount?: number   // 원본 VoucherRow 형태(type+amount)
  income?: number   // 구버전 호환(있으면 그대로 사용)
  expense?: number
  counterpart: string
  note: string
  deletedAt: string
  srcNo?: string   // 데이터이관 출처 시스템의 원본 전표번호(추적용)
}

/** 계정과목/세목 표시 — 공백 없이 붙여서 + 길면 폰트를 낮춰 셀 안에 들어가도록 */
function acctDisplay(name: string): { text: string; sizeCls: string } {
  const text = (name || '').replace(/\s+/g, '')
  const len = text.length
  const sizeCls = len >= 11 ? 'text-[9px]' : len >= 8 ? 'text-[10px]' : 'text-sm'
  return { text, sizeCls }
}

const fmt = (n: number) => n ? n.toLocaleString('ko-KR') : ''

/** row 하나에서 수입액/지출액 계산 — amount+type 형태 우선, income/expense 형태는 호환용 */
function incomeOf(r: DeletedVoucher): number {
  if (typeof r.income === 'number') return r.income
  return r.type === '수입' && (r.amount || 0) > 0 ? r.amount! : 0
}
function expenseOf(r: DeletedVoucher): number {
  if (typeof r.expense === 'number') return r.expense
  return r.type === '지출' && (r.amount || 0) > 0 ? r.amount! : 0
}

export default function DeletedVoucherPage() {
  const [data, setData] = useState<DeletedVoucher[]>([])
  const [loading, setLoading] = useState(true)
  const [restoring, setRestoring] = useState(false)
  const [resultMsg, setResultMsg] = useState('')
  const bookRef = useRef('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const me = await fetch('/api/auth/me').then(r => r.json()).catch(() => null)
      const itype = me?.institutionType || me?.profile?.institutionType || 'childcare'
      const book = itype === 'ilovechild' ? getActiveBook() : ''
      bookRef.current = book
      const j = await fetch(`/api/voucher/deleted-list?book=${encodeURIComponent(book)}`, { credentials: 'include' }).then(r => r.json())
      setData(j.success && Array.isArray(j.list) ? (j.list as DeletedVoucher[]) : [])
    } catch {
      setData([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const [checked, setChecked] = useState<Set<number>>(new Set())
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

  /** 체크된 삭제 전표를 전표관리(voucher-input) 목록으로 되돌리고, 삭제목록에서 제거 */
  const handleRestore = async () => {
    if (checked.size === 0) return
    setRestoring(true)
    setResultMsg('')
    try {
      const book = bookRef.current
      const toRestore = data.filter(r => checked.has(r.id))
      const remaining = data.filter(r => !checked.has(r.id))

      const activeJ = await fetch(`/api/voucher/list?book=${encodeURIComponent(book)}`, { credentials: 'include' }).then(r => r.json())
      const activeList: Array<{ id: number } & Record<string, unknown>> = activeJ.success && Array.isArray(activeJ.list) ? activeJ.list : []
      const maxId = activeList.reduce((m, r) => Math.max(m, Number(r.id) || 0), 0)

      const restoredRows = toRestore.map((r, i) => {
        const { deletedAt: _deletedAt, income, expense, ...rest } = r as DeletedVoucher & Record<string, unknown>
        void _deletedAt
        const type = rest.type || (typeof income === 'number' && income > 0 ? '수입' : '지출')
        const amount = typeof rest.amount === 'number' ? rest.amount : (type === '수입' ? (income || 0) : (expense || 0))
        return { ...rest, id: maxId + i + 1, type, amount }
      })

      await fetch('/api/voucher/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ list: [...activeList, ...restoredRows], book }),
      })
      await fetch('/api/voucher/deleted-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ list: remaining, book }),
      })

      setData(remaining)
      setChecked(new Set())
      setResultMsg(`✅ ${toRestore.length}건 복구 완료 — 전표관리에서 확인하세요.`)
    } catch {
      setResultMsg('❌ 복구 중 오류가 발생했습니다. 다시 시도해주세요.')
    } finally {
      setRestoring(false)
      setTimeout(() => setResultMsg(''), 4000)
    }
  }

  /** 체크된 삭제 전표를 휴지통(deleted-list)에서 영구히 지움 — DB 에서 완전히 사라짐, 복구 불가 */
  const handlePurge = async () => {
    if (checked.size === 0) return
    if (!confirm(`선택한 ${checked.size}건을 완전히 삭제합니다.\n삭제하면 다시 복구할 수 없습니다. 계속할까요?`)) return
    setRestoring(true)
    setResultMsg('')
    try {
      const book = bookRef.current
      const remaining = data.filter(r => !checked.has(r.id))
      await fetch('/api/voucher/deleted-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ list: remaining, book }),
      })
      setData(remaining)
      setChecked(new Set())
      setResultMsg(`✅ ${data.length - remaining.length}건 완전 삭제 완료`)
    } catch {
      setResultMsg('❌ 완전 삭제 중 오류가 발생했습니다. 다시 시도해주세요.')
    } finally {
      setRestoring(false)
      setTimeout(() => setResultMsg(''), 4000)
    }
  }

  const allAccountsWithSub = [...incomeAccounts, ...expenseAccounts]

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
              <option value="국민행복카드">국민행복카드</option>
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
          <button onClick={load} className="px-5 py-1.5 bg-teal-500 text-white text-xs font-bold rounded-lg hover:bg-teal-600 ml-auto">
            {loading ? '조회 중…' : '조회'}
          </button>
        </div>
      </div>

      {resultMsg && (
        <div className={`px-4 py-2 rounded-lg text-xs font-medium ${resultMsg.startsWith('✅') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {resultMsg}
        </div>
      )}

      {/* 테이블 */}
      <div className="bg-white rounded-xl border border-teal-400/30 shadow-sm">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-teal-400/20">
          <span className="text-xs text-slate-400">{loading ? '불러오는 중…' : `${filtered.length}건`}</span>
          <div className="flex items-center gap-2">
            <button
              disabled={checked.size === 0 || restoring}
              onClick={handleRestore}
              className={`px-5 py-1.5 text-xs font-bold rounded-lg ${checked.size > 0 && !restoring ? 'bg-teal-500 hover:bg-teal-600 text-white' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
            >
              {restoring ? '복구 중…' : '복구하기'}
            </button>
            <button
              disabled={checked.size === 0 || restoring}
              onClick={handlePurge}
              className={`px-5 py-1.5 text-xs font-bold rounded-lg ${checked.size > 0 && !restoring ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
              title="휴지통에서 완전히 삭제(복구 불가)"
            >
              완전삭제
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="bg-teal-50 border-b border-teal-400/30">
                <th className="text-center px-3 py-2 w-10">
                  <input type="checkbox" className="rounded border-slate-300 w-4 h-4" checked={checked.size === filtered.length && filtered.length > 0} onChange={toggleAll} />
                </th>
                <th className="text-center px-4 py-2.5 font-normal text-slate-700 w-28">발행일</th>
                <th className="text-center px-4 py-2.5 font-normal text-slate-700 w-40">계정과목</th>
                <th className="text-center px-4 py-2.5 font-normal text-slate-700 w-28">세목</th>
                <th className="text-left px-4 py-2.5 font-normal text-slate-700">적요</th>
                <th className="text-center px-3 py-2.5 font-normal text-slate-700 w-20">원본번호</th>
                <th className="text-right px-6 py-2.5 font-normal text-slate-700 w-36">수입액</th>
                <th className="text-right px-6 py-2.5 font-normal text-slate-700 w-36 pr-[50px]">지출액</th>
                <th className="text-left px-6 py-2.5 font-normal text-slate-700 w-32">거래처</th>
                <th className="text-left px-4 py-2.5 font-normal text-slate-700 w-24">결제방식</th>
                <th className="text-center px-4 py-2.5 font-normal text-slate-700 w-28">삭제일</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={11} className="text-center py-12 text-slate-400">{loading ? '불러오는 중…' : '삭제된 전표가 없습니다'}</td></tr>
              ) : filtered.map((row, idx) => (
                <tr key={row.id} className={`transition-colors hover:bg-teal-50 ${checked.has(row.id) ? 'bg-teal-50/60' : idx % 2 === 1 ? 'bg-teal-50/30' : 'bg-white'} border-b border-slate-50`}>
                  <td className="text-center px-3 py-2">
                    <input type="checkbox" className="rounded border-slate-300 w-4 h-4" checked={checked.has(row.id)} onChange={() => toggleCheck(row.id)} />
                  </td>
                  <td className="text-center px-4 py-2.5 text-slate-600">{row.date?.slice(5)}</td>
                  <td className="text-center px-4 py-2.5">
                    <span className={`font-medium ${isIncomeAccount(row.account) ? 'text-blue-700' : 'text-red-600'} ${acctDisplay(row.account).sizeCls}`}>{acctDisplay(row.account).text}</span>
                  </td>
                  <td className="text-center px-4 py-2.5">
                    <span className={`text-slate-600 ${acctDisplay(row.subAccount || '-').sizeCls}`}>{row.subAccount ? acctDisplay(row.subAccount).text : '-'}</span>
                  </td>
                  <td className="text-left px-4 py-2.5 text-slate-600">{row.summary}</td>
                  <td className="text-center px-3 py-2.5 text-[10px] text-slate-400 font-mono">{row.srcNo || '-'}</td>
                  <td className="text-right px-6 py-2.5 text-blue-600 font-medium">{fmt(incomeOf(row))}</td>
                  <td className="text-right px-6 py-2.5 text-red-600 font-medium pr-[50px]">{fmt(expenseOf(row))}</td>
                  <td className="text-left px-6 py-2.5 text-slate-500">{row.counterpart || '-'}</td>
                  <td className="text-left px-4 py-2.5 text-slate-400 text-xs">{row.note || '-'}</td>
                  <td className="text-center px-4 py-2.5 text-slate-400">{row.deletedAt?.slice(5, 16).replace('T', ' ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
