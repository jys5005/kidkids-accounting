'use client'

import { useState } from 'react'

function fmt(n: number) { return n ? n.toLocaleString('ko-KR') : '0' }

type NuriRow = {
  type: '세입' | '세출'
  name: string
  months: number[]
  total: number
}

const nuriIncome: NuriRow[] = [
  { type: '세입', name: '누리과정 기타지원금', months: Array(12).fill(0), total: 0 },
  { type: '세입', name: '누리과정 인건비보조금', months: Array(12).fill(0), total: 0 },
]

const nuriExpense: NuriRow[] = [
  { type: '세출', name: '누리과정 교직원급여', months: Array(12).fill(0), total: 0 },
  { type: '세출', name: '누리과정 퇴직금및퇴직적립금', months: Array(12).fill(0), total: 0 },
  { type: '세출', name: '누리과정 법정부담금', months: Array(12).fill(0), total: 0 },
  { type: '세출', name: '누리과정 급식비', months: Array(12).fill(0), total: 0 },
  { type: '세출', name: '누리과정 교재교구구입비', months: Array(12).fill(0), total: 0 },
  { type: '세출', name: '누리과정 행사비', months: Array(12).fill(0), total: 0 },
  { type: '세출', name: '누리과정 시설비', months: Array(12).fill(0), total: 0 },
  { type: '세출', name: '누리과정 자산취득비', months: Array(12).fill(0), total: 0 },
  { type: '세출', name: '누리과정 기타인건비', months: Array(12).fill(0), total: 0 },
  { type: '세출', name: '누리과정 교직원수당', months: Array(12).fill(0), total: 0 },
  { type: '세출', name: '누리과정 수용비 및 수수료', months: Array(12).fill(0), total: 0 },
  { type: '세출', name: '누리과정 시설장비유지비', months: Array(12).fill(0), total: 0 },
  { type: '세출', name: '누리과정 복리후생비', months: Array(12).fill(0), total: 0 },
  { type: '세출', name: '누리과정교직원연수.연구비', months: Array(12).fill(0), total: 0 },
  { type: '세출', name: '누리과정 과년도지출', months: Array(12).fill(0), total: 0 },
]

const TH = 'px-2 py-2 text-center font-bold text-slate-600 whitespace-nowrap border-b border-r border-slate-200 text-[11px] bg-teal-50'
const TD = 'px-2 py-2 text-center border-b border-r border-slate-100 text-xs'

export default function NuriPage() {
  const now = new Date()
  const yearOpts = Array.from({ length: 5 }, (_, i) => String(now.getFullYear() - i))
  const [selectedYear, setSelectedYear] = useState(yearOpts[0])
  const [periodType, setPeriodType] = useState<'fiscal' | 'calendar' | 'detail'>('fiscal')

  // 회계연도: 3월~다음해 2월 / 해당연도: 1월~12월
  const yr = parseInt(selectedYear)
  const monthHeaders = periodType === 'fiscal'
    ? Array.from({ length: 12 }, (_, i) => {
        const m = i + 3
        const y = m > 12 ? yr + 1 : yr
        const mo = m > 12 ? m - 12 : m
        return `${y}-${String(mo).padStart(2, '0')}`
      })
    : Array.from({ length: 12 }, (_, i) => `${yr}-${String(i + 1).padStart(2, '0')}`)

  // 상세정산서용
  const now2 = new Date()
  const toDateStr = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const monthStart = `${now2.getFullYear()}-${String(now2.getMonth() + 1).padStart(2, '0')}-01`
  const [dateFrom, setDateFrom] = useState(monthStart)
  const [dateTo, setDateTo] = useState(toDateStr(now2))
  const [detailAccount, setDetailAccount] = useState('전체')
  const nuriAccounts = [
    '::전체::', '계정미지정', '수입 전체', '지출 전체',
    '수입: 누리과정 기타지원금', '수입: 누리과정 인건비보조금',
    ...nuriExpense.map(r => `지출: ${r.name}`),
  ]

  const sumMonths = (rows: NuriRow[]) => Array.from({ length: 12 }, (_, i) => rows.reduce((s, r) => s + r.months[i], 0))
  const incomeMonthTotals = sumMonths(nuriIncome)
  const expenseMonthTotals = sumMonths(nuriExpense)

  return (
    <div className="p-6 space-y-4">
      {/* 상단 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-0.5 text-xs text-slate-700 cursor-pointer">
            <input type="radio" name="nuriPeriod" checked={periodType === 'fiscal'} onChange={() => setPeriodType('fiscal')} className="w-3 h-3 accent-blue-600" />
            <span className="font-bold">회계연도</span>
          </label>
          <label className="flex items-center gap-0.5 text-xs text-slate-700 cursor-pointer">
            <input type="radio" name="nuriPeriod" checked={periodType === 'calendar'} onChange={() => setPeriodType('calendar')} className="w-3 h-3 accent-blue-600" />
            <span className="font-bold">해당연도</span>
          </label>
          <label className="flex items-center gap-0.5 text-xs text-slate-700 cursor-pointer">
            <input type="radio" name="nuriPeriod" checked={periodType === 'detail'} onChange={() => setPeriodType('detail')} className="w-3 h-3 accent-blue-600" />
            <span className="font-bold">상세정산서</span>
          </label>
          <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)} className="border border-slate-300 rounded px-2 py-1.5 text-xs">
            {yearOpts.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors">조회</button>
        </div>
      </div>

      {/* 상세정산서 뷰 */}
      {periodType === 'detail' ? (
        <div className="space-y-4">
          {/* 검색 */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-600">발행기간</span>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="border border-teal-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-blue-400" />
            <span className="text-xs text-slate-400">~</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="border border-teal-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-blue-400" />
            <span className="text-xs font-bold text-slate-600">계정과목</span>
            <select value={detailAccount} onChange={e => setDetailAccount(e.target.value)} className="border border-slate-300 rounded px-2 py-1.5 text-xs min-w-[180px]">
              {nuriAccounts.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <input type="text" placeholder="적요" className="border border-slate-300 rounded px-2 py-1.5 text-xs w-36 placeholder:text-slate-300 focus:outline-none focus:border-blue-400" />
            <button className="px-4 py-1.5 text-xs font-bold text-white bg-slate-700 hover:bg-slate-800 rounded transition-colors">검색</button>
          </div>

          {/* 요약 */}
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-2.5 flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-600">{dateFrom} ~ {dateTo}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600">수입합계 :</span>
              <span className="text-sm font-bold text-blue-700">0</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600">지출합계 :</span>
              <span className="text-sm font-bold text-red-600">0</span>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <button className="h-7 px-2 flex items-center gap-1 bg-white hover:bg-slate-50 border border-slate-300 rounded transition-colors" title="결의서 인쇄">
                <svg className="w-3.5 h-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5z" /></svg>
                <span className="text-[10px] font-bold text-slate-600">결의서</span>
              </button>
              <button className="w-8 h-8 flex items-center justify-center bg-white hover:bg-slate-50 border border-slate-300 rounded transition-colors" title="인쇄하기">
                <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5z" /></svg>
              </button>
              <button className="w-8 h-8 flex items-center justify-center bg-white hover:bg-green-50 border border-green-400 rounded transition-colors" title="엑셀저장">
                <svg className="w-4 h-4 text-green-600" viewBox="0 0 24 24" fill="currentColor"><path d="M14.2 1H5.8C4.81 1 4 1.81 4 2.8v18.4c0 .99.81 1.8 1.8 1.8h12.4c.99 0 1.8-.81 1.8-1.8V6.8L14.2 1zM15.8 19.3l-2.1-3.5-2.1 3.5H9.8l3.2-5-2.9-4.7h1.8l2.1 3.3 2-3.3h1.8l-2.9 4.7 3.2 5h-2.3z" /></svg>
              </button>
            </div>
          </div>

          {/* 테이블 */}
          <div className="overflow-x-auto border border-slate-200 rounded-lg bg-white">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr>
                  <th className={`${TH} w-8`}><input type="checkbox" className="w-3 h-3 rounded" /></th>
                  <th className={TH}>발행일</th>
                  <th className={TH}>계정과목</th>
                  <th className={`${TH} min-w-[240px]`}>적요</th>
                  <th className={TH}>수입액</th>
                  <th className={TH}>지출액</th>
                  <th className={TH}>거래처</th>
                  <th className={TH}>비고</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-slate-50 font-bold">
                  <td className={TD}></td>
                  <td className={`${TD} text-slate-700`}>합계</td>
                  <td className={TD}></td>
                  <td className={TD}></td>
                  <td className={`${TD} text-right text-blue-700`}>0</td>
                  <td className={`${TD} text-right text-red-600`}>0</td>
                  <td className={TD}></td>
                  <td className={TD}></td>
                </tr>
                <tr><td colSpan={8} className="text-center py-8 text-slate-400 text-xs">조회된 내역이 없습니다.</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      ) : (
      /* 월별 테이블 */
      <div className="overflow-x-auto border border-slate-200 rounded-lg bg-white">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr>
              <th className={`${TH} w-14`}>구분</th>
              <th className={`${TH} min-w-[180px]`}>계정과목</th>
              {monthHeaders.map(h => <th key={h} className={TH}>{h}</th>)}
              <th className={`${TH} border-r-0`}>합계</th>
            </tr>
          </thead>
          <tbody>
            {/* 세입 */}
            {nuriIncome.map((row, idx) => (
              <tr key={`i-${idx}`} className="hover:bg-slate-50">
                <td className={`${TD} font-bold text-blue-600`}>{row.type}</td>
                <td className={`${TD} text-left px-3 text-slate-700`}>{row.name}</td>
                {row.months.map((v, mi) => <td key={mi} className={`${TD} text-right ${v > 0 ? 'text-blue-700 font-medium' : 'text-slate-400'}`}>{fmt(v)}</td>)}
                <td className={`${TD} text-right font-bold text-blue-700 border-r-0`}>{fmt(row.total)}</td>
              </tr>
            ))}
            {/* 세입월합계 */}
            <tr className="bg-slate-50 font-bold">
              <td colSpan={2} className={`${TD} text-center text-slate-700`}>세입월합계</td>
              {incomeMonthTotals.map((v, i) => <td key={i} className={`${TD} text-right text-blue-700`}>{fmt(v)}</td>)}
              <td className={`${TD} text-right text-blue-700 border-r-0`}>{fmt(incomeMonthTotals.reduce((s, v) => s + v, 0))}</td>
            </tr>
            {/* 세입누계 */}
            <tr className="bg-slate-100 font-bold">
              <td colSpan={2} className={`${TD} text-center text-slate-700`}>세입누계</td>
              {incomeMonthTotals.map((_, i) => <td key={i} className={`${TD} text-right text-blue-700`}>{fmt(incomeMonthTotals.slice(0, i + 1).reduce((s, v) => s + v, 0))}</td>)}
              <td className={`${TD} text-right text-blue-700 border-r-0`}>{fmt(incomeMonthTotals.reduce((s, v) => s + v, 0))}</td>
            </tr>

            {/* 세출 */}
            {nuriExpense.map((row, idx) => (
              <tr key={`e-${idx}`} className="hover:bg-slate-50">
                <td className={`${TD} font-bold text-red-600`}>{row.type}</td>
                <td className={`${TD} text-left px-3 text-slate-700`}>{row.name}</td>
                {row.months.map((v, mi) => <td key={mi} className={`${TD} text-right ${v > 0 ? 'text-red-600 font-medium' : 'text-slate-400'}`}>{fmt(v)}</td>)}
                <td className={`${TD} text-right font-bold text-red-600 border-r-0`}>{fmt(row.total)}</td>
              </tr>
            ))}
            {/* 세출월합계 */}
            <tr className="bg-slate-50 font-bold">
              <td colSpan={2} className={`${TD} text-center text-slate-700`}>세출월합계</td>
              {expenseMonthTotals.map((v, i) => <td key={i} className={`${TD} text-right text-red-600`}>{fmt(v)}</td>)}
              <td className={`${TD} text-right text-red-600 border-r-0`}>{fmt(expenseMonthTotals.reduce((s, v) => s + v, 0))}</td>
            </tr>
            {/* 세출누계 */}
            <tr className="bg-slate-100 font-bold">
              <td colSpan={2} className={`${TD} text-center text-slate-700`}>세출누계</td>
              {expenseMonthTotals.map((_, i) => <td key={i} className={`${TD} text-right text-red-600`}>{fmt(expenseMonthTotals.slice(0, i + 1).reduce((s, v) => s + v, 0))}</td>)}
              <td className={`${TD} text-right text-red-600 border-r-0`}>{fmt(expenseMonthTotals.reduce((s, v) => s + v, 0))}</td>
            </tr>
          </tbody>
        </table>
      </div>
      )}
    </div>
  )
}
