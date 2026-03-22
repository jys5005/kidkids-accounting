'use client'

import { useState } from 'react'
import { incomeAccounts, expenseAccounts } from '@/lib/accounts'

function fmt(n: number) { return n ? n.toLocaleString('ko-KR') : '0' }

type LedgerRow = {
  id: number; date: string; docNo: string; account: string; summary: string
  income: number; expense: number; counterpart: string; note: string
}

const mockGeneral: LedgerRow[] = [
  { id: 1, date: '2026-03-01', docNo: 'A000001', account: '전년도 이월금', summary: '전년도이월금', income: 117139911, expense: 0, counterpart: '', note: '' },
  { id: 2, date: '2026-03-03', docNo: 'A000001', account: '정부지원 보육료', summary: 'KB78411191', income: 1289872, expense: 0, counterpart: 'KB78411191', note: '' },
  { id: 3, date: '2026-03-03', docNo: 'A000002', account: '계정미지정', summary: '이찬용', income: 450000, expense: 0, counterpart: '이찬용', note: '' },
  { id: 4, date: '2026-03-03', docNo: 'B000001', account: '계정미지정', summary: '도깨비식자재마트', income: 0, expense: 35860, counterpart: '도깨비식자재마트', note: '' },
  { id: 5, date: '2026-03-03', docNo: 'A000003', account: '계정미지정', summary: '김현승', income: 180000, expense: 0, counterpart: '김현승', note: '' },
]

const TH = 'px-2 py-2.5 text-center font-bold text-slate-600 whitespace-nowrap border-b border-slate-200 text-[11px] bg-orange-50'
const TD = 'px-2 py-2 text-center border-b border-slate-100 text-xs'

export default function SettlementReconciliationPage() {
  const now = new Date()
  const yearOpts = Array.from({ length: 5 }, (_, i) => String(now.getFullYear() - i))
  const [selectedYear, setSelectedYear] = useState(yearOpts[0])
  const toDateStr = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const [dateFrom, setDateFrom] = useState(monthStart)
  const [dateTo, setDateTo] = useState(toDateStr(now))
  const [docType, setDocType] = useState('전체')
  const [filterAccount, setFilterAccount] = useState('전체')
  const [keyword, setKeyword] = useState('')
  const [printTitle, setPrintTitle] = useState('')
  const [generalChecked, setGeneralChecked] = useState<Set<number>>(new Set())
  const [subsidyChecked, setSubsidyChecked] = useState<Set<number>>(new Set())
  const [subsidyData, setSubsidyData] = useState<LedgerRow[]>([])
  const [generalData, setGeneralData] = useState<LedgerRow[]>(mockGeneral)

  const moveToSubsidy = () => {
    if (generalChecked.size === 0) return
    const moving = generalData.filter(r => generalChecked.has(r.id))
    setSubsidyData(prev => [...prev, ...moving])
    setGeneralData(prev => prev.filter(r => !generalChecked.has(r.id)))
    setGeneralChecked(new Set())
  }

  const moveToGeneral = () => {
    if (subsidyChecked.size === 0) return
    const moving = subsidyData.filter(r => subsidyChecked.has(r.id))
    setGeneralData(prev => [...prev, ...moving].sort((a, b) => a.id - b.id))
    setSubsidyData(prev => prev.filter(r => !subsidyChecked.has(r.id)))
    setSubsidyChecked(new Set())
  }
  const subsidyIncome = subsidyData.reduce((s, r) => s + r.income, 0)
  const subsidyExpense = subsidyData.reduce((s, r) => s + r.expense, 0)

  const allAccounts = ['전체', ...incomeAccounts.filter(a => !a.isSub).map(a => a.label), ...expenseAccounts.filter(a => !a.isSub).map(a => a.label)]

  return (
    <div className="p-6 space-y-4">
      {/* 검색 */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-bold text-slate-700">회계년도</span>
        <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)} className="border border-slate-300 rounded px-2 py-1.5 text-xs">
          {yearOpts.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <span className="text-xs font-bold text-slate-600">발행기간</span>
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="border border-amber-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-blue-400" />
        <span className="text-xs text-slate-400">~</span>
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="border border-amber-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-blue-400" />
        <span className="text-xs font-bold text-slate-600">계정과목</span>
        <select value={filterAccount} onChange={e => setFilterAccount(e.target.value)} className="border border-slate-300 rounded px-2 py-1.5 text-xs min-w-[120px]">
          {allAccounts.map(a => <option key={a} value={a}>{a === '전체' ? '::전체::' : a}</option>)}
        </select>
        <span className="text-xs font-bold text-slate-600">결제방식</span>
        <select value={docType} onChange={e => setDocType(e.target.value)} className="border border-slate-300 rounded px-2 py-1.5 text-xs">
          <option>::전체::</option>
          <option>영수증</option>
          <option>세금계산서</option>
          <option>이체</option>
        </select>
        <input type="text" value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="적요" className="border border-slate-300 rounded px-2 py-1.5 text-xs w-36 focus:outline-none focus:border-blue-400 placeholder:text-slate-300" />
        <button className="px-4 py-1.5 text-xs font-bold text-white bg-[#f5b800] hover:bg-[#d4a000] rounded transition-colors">조회</button>
      </div>

      {/* 요약 */}
      <div className="bg-white rounded-xl border border-slate-200 px-4 py-2.5 flex items-center gap-6 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-600">조회기간 :</span>
          <span className="text-xs text-slate-800">{dateFrom} ~ {dateTo}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-600">정산서 수입금액 :</span>
          <span className="text-sm font-bold text-blue-700">{fmt(subsidyIncome)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-600">정산서 지출금액 :</span>
          <span className="text-sm font-bold text-red-600">{fmt(subsidyExpense)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <input type="text" value={printTitle} onChange={e => setPrintTitle(e.target.value)} placeholder="보조금거래내역 제목" className="border border-slate-300 rounded px-2 py-1 text-xs w-36 placeholder:text-slate-300 focus:outline-none focus:border-blue-400" />
          <button className="px-3 py-1 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors">저장</button>
          <div className="relative group">
            <svg className="w-4 h-4 text-slate-400 cursor-pointer hover:text-slate-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
            <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-[9999] hidden group-hover:block pointer-events-none">
              <div className="bg-white text-slate-700 border border-slate-200 text-[11px] rounded-lg px-4 py-3 shadow-xl leading-relaxed whitespace-nowrap">
                <div className="absolute left-1/2 -translate-x-1/2 -top-1 w-2 h-2 bg-white border-l border-t border-slate-200 rotate-45" />
                <p>정산서 작성하고 싶은 전표를 선택 후</p>
                <p>보조금거래내역으로 이동 후 제목 기재 후 출력바랍니다.</p>
              </div>
            </div>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <button className="w-8 h-8 flex items-center justify-center bg-white hover:bg-slate-50 border border-slate-300 rounded transition-colors" title="인쇄하기">
            <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2z" /></svg>
          </button>
          <button className="w-8 h-8 flex items-center justify-center bg-white hover:bg-green-50 border border-green-400 rounded transition-colors" title="엑셀다운로드">
            <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          </button>
        </div>
      </div>

      {/* 보조금거래 테이블 */}
      <div className="overflow-x-auto border border-slate-200 rounded-lg bg-white">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr>
              <th className={`${TH} w-8`}><input type="checkbox" checked={subsidyData.length > 0 && subsidyData.every(r => subsidyChecked.has(r.id))} onChange={e => { if (e.target.checked) setSubsidyChecked(new Set(subsidyData.map(r => r.id))); else setSubsidyChecked(new Set()) }} className="w-3 h-3 rounded" /></th>
              <th className={TH}>발행일</th>
              <th className={TH}>증빙서번호</th>
              <th className={TH}>계정과목</th>
              <th className={`${TH} min-w-[200px]`}>적요</th>
              <th className={TH}>수입액</th>
              <th className={TH}>지출액</th>
              <th className={TH}>거래처</th>
              <th className={TH}>비고</th>
            </tr>
          </thead>
          <tbody>
            {subsidyData.map((row, idx) => (
              <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                <td className={TD}><input type="checkbox" checked={subsidyChecked.has(row.id)} onChange={e => { const n = new Set(subsidyChecked); e.target.checked ? n.add(row.id) : n.delete(row.id); setSubsidyChecked(n) }} className="w-3 h-3 rounded" /></td>
                <td className={TD}>{row.date}</td>
                <td className={TD}>{row.docNo}</td>
                <td className={`${TD} text-blue-600 font-medium`}>{row.account}</td>
                <td className={`${TD} text-left px-3`}>{row.summary}</td>
                <td className={`${TD} text-right font-medium ${row.income > 0 ? 'text-slate-800' : 'text-slate-300'}`}>{fmt(row.income)}</td>
                <td className={`${TD} text-right font-medium ${row.expense > 0 ? 'text-slate-800' : 'text-slate-300'}`}>{fmt(row.expense)}</td>
                <td className={TD}>{row.counterpart}</td>
                <td className={TD}>{row.note}</td>
              </tr>
            ))}
            {subsidyData.length === 0 && (
              <tr><td colSpan={9} className="text-center py-8 text-slate-400 text-xs">보조금거래 내역이 없습니다.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 이동 버튼 */}
      <div className="flex items-center justify-center gap-3">
        <button onClick={moveToSubsidy} className="px-3 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-300 rounded transition-colors">보조금거래 ↑</button>
        <span className="text-xs text-slate-500">* 이동할 항목을 선택 후 클릭하세요.</span>
        <button onClick={moveToGeneral} className="px-3 py-1.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-300 rounded transition-colors">일반거래 ↓</button>
      </div>

      {/* 일반거래 테이블 */}
      <div className="overflow-x-auto border border-slate-200 rounded-lg bg-white">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr>
              <th className={`${TH} w-8`}><input type="checkbox" checked={generalData.length > 0 && generalData.every(r => generalChecked.has(r.id))} onChange={e => { if (e.target.checked) setGeneralChecked(new Set(generalData.map(r => r.id))); else setGeneralChecked(new Set()) }} className="w-3 h-3 rounded" /></th>
              <th className={TH}>발행일</th>
              <th className={`${TH} w-20`}>증빙서<br />번호</th>
              <th className={TH}>계정과목</th>
              <th className={`${TH} min-w-[200px]`}>적요</th>
              <th className={TH}>수입액</th>
              <th className={TH}>지출액</th>
              <th className={TH}>거래처</th>
              <th className={TH}>비고</th>
            </tr>
          </thead>
          <tbody>
            {generalData.map((row, idx) => (
              <tr key={idx} className="hover:bg-slate-50 transition-colors">
                <td className={TD}><input type="checkbox" checked={generalChecked.has(row.id)} onChange={e => { const n = new Set(generalChecked); e.target.checked ? n.add(row.id) : n.delete(row.id); setGeneralChecked(n) }} className="w-3 h-3 rounded" /></td>
                <td className={TD}>{row.date}</td>
                <td className={TD}>{row.docNo}</td>
                <td className={`${TD} text-blue-600 font-medium`}>{row.account}</td>
                <td className={`${TD} text-left px-3`}>{row.summary}</td>
                <td className={`${TD} text-right font-medium ${row.income > 0 ? 'text-slate-800' : 'text-slate-300'}`}>{fmt(row.income)}</td>
                <td className={`${TD} text-right font-medium ${row.expense > 0 ? 'text-slate-800' : 'text-slate-300'}`}>{fmt(row.expense)}</td>
                <td className={TD}>{row.counterpart}</td>
                <td className={TD}>{row.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
