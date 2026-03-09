'use client'

import { useState } from 'react'

interface AccountRow {
  date: string
  summary: string
  accountName: string
  income: string
  expense: string
  balance: string
  memo: string
}

export default function CashLedgerPage() {
  const [memberId, setMemberId] = useState('')
  const [pw, setPw] = useState('')
  const [yearmon, setYearmon] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState<AccountRow[]>([])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [summary, setSummary] = useState<any>(null)
  const [loggedIn, setLoggedIn] = useState(false)

  const handleQuery = async () => {
    if (!memberId || !pw) { setError('아이디와 비밀번호를 입력하세요.'); return }
    setLoading(true)
    setError('')
    setData([])
    setSummary(null)

    try {
      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId, pw, startDate, endDate, yearmon }),
      })
      const json = await res.json()
      if (!json.success) { setError(json.error || '조회 실패'); return }
      setData(json.data || [])
      setSummary(json.summary || null)
      setLoggedIn(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : '네트워크 오류')
    } finally {
      setLoading(false)
    }
  }

  const handleExcel = async () => {
    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data, summary, yearmon: yearmon || startDate?.slice(0, 7) || '' }),
      })
      if (!res.ok) { alert('엑셀 다운로드 실패'); return }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `현금출납부_${yearmon || startDate?.slice(0, 7) || 'all'}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch { alert('엑셀 다운로드 실패') }
  }

  return (
    <div className="space-y-4 max-w-5xl">
      {/* 조회 조건 */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-slate-800">현금출납부 조회</h2>
          {data.length > 0 && (
            <button onClick={handleExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              엑셀 다운로드
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div>
            <label className="text-[11px] text-slate-500 mb-1 block font-medium">아이디 *</label>
            <input value={memberId} onChange={(e) => setMemberId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow" placeholder="키즈키즈 아이디" />
          </div>
          <div>
            <label className="text-[11px] text-slate-500 mb-1 block font-medium">비밀번호 *</label>
            <input type="password" value={pw} onChange={(e) => setPw(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow" placeholder="비밀번호" />
          </div>
          <div>
            <label className="text-[11px] text-slate-500 mb-1 block font-medium">년월</label>
            <input type="month" value={yearmon}
              onChange={(e) => {
                setYearmon(e.target.value)
                if (e.target.value) {
                  const [y, m] = e.target.value.split('-')
                  const lastDay = new Date(Number(y), Number(m), 0).getDate()
                  setStartDate(`${y}-${m}-01`)
                  setEndDate(`${y}-${m}-${String(lastDay).padStart(2, '0')}`)
                }
              }}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow" />
          </div>
          <div>
            <label className="text-[11px] text-slate-500 mb-1 block font-medium">시작일</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow" />
          </div>
          <div>
            <label className="text-[11px] text-slate-500 mb-1 block font-medium">종료일</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow" />
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={handleQuery} disabled={loading}
            className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                조회중...
              </span>
            ) : '조회'}
          </button>
        </div>
        {error && (
          <div className="mt-3 px-3 py-2 bg-red-50 border border-red-100 rounded-lg text-xs text-red-600">{error}</div>
        )}
      </div>

      {/* 요약 */}
      {(data.length > 0 || summary) && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-[11px] text-slate-400">이월액</p>
            <p className="text-lg font-bold text-slate-700 mt-1">{summary?.carryOver || '0'}원</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-[11px] text-slate-400">월 수입</p>
            <p className="text-lg font-bold text-blue-600 mt-1">{summary?.monthIncome || '0'}원</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-[11px] text-slate-400">월 지출</p>
            <p className="text-lg font-bold text-red-500 mt-1">{summary?.monthExpense || '0'}원</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-[11px] text-slate-400">잔액</p>
            <p className="text-lg font-bold text-slate-800 mt-1">{summary?.balance || '0'}원</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-[11px] text-slate-400">조회 건수</p>
            <p className="text-lg font-bold text-slate-700 mt-1">{data.length}건</p>
          </div>
        </div>
      )}

      {/* 거래내역 테이블 */}
      {data.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">현금출납부</h3>
            <span className="text-[11px] text-slate-400">{data.length}건</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-[11px] text-slate-500">
                  <th className="text-left px-4 py-2.5 font-semibold">일자</th>
                  <th className="text-left px-4 py-2.5 font-semibold">적요</th>
                  <th className="text-left px-4 py-2.5 font-semibold">계정과목</th>
                  <th className="text-left px-4 py-2.5 font-semibold">채주</th>
                  <th className="text-right px-4 py-2.5 font-semibold">수입</th>
                  <th className="text-right px-4 py-2.5 font-semibold">지출</th>
                  <th className="text-right px-4 py-2.5 font-semibold">잔액</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data.map((row, i) => (
                  <tr key={i} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap text-xs">{row.date}</td>
                    <td className="px-4 py-2.5 text-slate-700 font-medium text-xs">{row.summary}</td>
                    <td className="px-4 py-2.5 text-slate-500 text-[11px]">{row.accountName}</td>
                    <td className="px-4 py-2.5 text-slate-400 text-[11px]">{row.memo}</td>
                    <td className="px-4 py-2.5 text-right text-blue-600 font-medium text-xs">{row.income && row.income !== '0' ? row.income : '-'}</td>
                    <td className="px-4 py-2.5 text-right text-red-500 font-medium text-xs">{row.expense && row.expense !== '0' ? row.expense : '-'}</td>
                    <td className="px-4 py-2.5 text-right text-slate-700 font-medium text-xs">{row.balance}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 빈 상태 */}
      {loggedIn && data.length === 0 && !loading && (
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="flex flex-col items-center justify-center py-14 text-slate-300">
            <svg className="w-10 h-10 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-sm">해당 기간 거래내역이 없습니다.</p>
          </div>
        </div>
      )}

      {/* 초기 상태 */}
      {!loggedIn && !loading && data.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="flex flex-col items-center justify-center py-14 text-slate-300">
            <svg className="w-12 h-12 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <p className="text-sm text-slate-400">키즈키즈 계정으로 로그인 후 조회하세요</p>
            <p className="text-[11px] text-slate-300 mt-1">아이디, 비밀번호 입력 후 조회 버튼을 클릭하세요</p>
          </div>
        </div>
      )}
    </div>
  )
}
