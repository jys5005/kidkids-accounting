'use client'

import { useState, useMemo } from 'react'

function fmt(n: number) { return n.toLocaleString('ko-KR') }

function getYmOptions() {
  const now = new Date()
  const opts: string[] = []
  for (let i = -12; i < 36; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    opts.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  return opts.reverse()
}

const baseItems = ['기타 필요경비', '입학준비금', '현장학습비', '차량운행비', '부모부담행사비', '아침,저녁급식비', '기타시도특성화비']

const mockIncome: Record<string, number[]> = {
  '기타 필요경비': [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  '입학준비금': [245000, 0, 0, 0, 0, 0, 0, 45000, 0, 0, 44996, 0],
  '현장학습비': [1383000, 1410000, 1464000, 1422000, 1574000, 1612000, 1540000, 1490000, 1042000, 1326000, 1422000, 1606000],
  '차량운행비': [500000, 630000, 530000, 500000, 730000, 660000, 696000, 600000, 770000, 500000, 539939, 520000],
  '부모부담행사비': [439000, 258770, 528852, 535912, 571855, 621862, 559093, 303874, 676355, 478896, 521877, 538996],
  '아침,저녁급식비': [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  '기타시도특성화비': [1200000, 1470000, 1390000, 1400000, 1520000, 1610000, 1400000, 1400000, 1650000, 1200000, 1330000, 1320000],
  '그밖의지원금': [500000, 500000, 500000, 500000, 500000, 500000, 500000, 500000, 500000, 500000, 500000, 500000],
}

const mockExpense: Record<string, number[]> = {
  '기타 필요경비': [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  '입학준비금': [0, 1130000, 0, 0, 0, 0, 940000, 0, 0, 0, 0, 0],
  '현장학습비': [2618000, 5535530, 1810000, 4666900, 5438400, 4175200, 5035000, 5296000, 5060200, 4331000, 4540000, 4282500],
  '차량운행비': [50000, 1509400, 1709460, 250000, 1749430, 1509430, 1359430, 0, 70000, 0, 0, 140000],
  '부모부담행사비': [72000, 1769100, 164640, 1046220, 2067410, 232000, 812000, 1543000, -39100, 5779300, 2627390, 4592370],
  '아침,저녁급식비': [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  '기타시도특성화비': [1747500, 3815600, 4073000, 3495000, 2860000, 2915000, 2055000, 2810000, 2630000, 2900000, 2665000, 2945000],
  '그밖의지원금': [300000, 450000, 380000, 420000, 350000, 400000, 380000, 410000, 390000, 370000, 360000, 400000],
}

const TH = 'px-2 py-2 text-center font-bold text-slate-600 whitespace-nowrap border-b border-r border-slate-200 text-[11px] bg-teal-50'
const TD = 'px-2 py-1.5 text-center border-b border-r border-slate-100 text-[11px]'

export default function ExpensePage() {
  const now = new Date()
  const ymOpts = useMemo(() => getYmOptions(), [])
  const yearOpts = Array.from({ length: 5 }, (_, i) => String(now.getFullYear() - i))
  const [searchType, setSearchType] = useState<'year' | 'range'>('year')
  const [selectedYear, setSelectedYear] = useState(String(now.getFullYear()))
  const [halfYear, setHalfYear] = useState<'all' | 'first' | 'second'>('all')
  const [includeOther, setIncludeOther] = useState(false)
  const fiscalYear = now.getMonth() < 2 ? now.getFullYear() - 1 : now.getFullYear()
  const [ymFrom, setYmFrom] = useState(`${fiscalYear}-03`)
  const [ymTo, setYmTo] = useState(`${fiscalYear + 1}-02`)

  const monthHeaders = useMemo(() => {
    if (searchType === 'year') {
      const yr = parseInt(selectedYear)
      const all = Array.from({ length: 12 }, (_, i) => {
        const m = i + 3
        const y = m > 12 ? yr + 1 : yr
        const mo = m > 12 ? m - 12 : m
        return `${y}년 ${String(mo).padStart(2, '0')}월`
      })
      if (halfYear === 'first') return all.slice(0, 6)
      if (halfYear === 'second') return all.slice(6)
      return all
    }
    const [fy, fm] = ymFrom.split('-').map(Number)
    const [ty, tm] = ymTo.split('-').map(Number)
    const headers: string[] = []
    let y = fy, m = fm
    while (y < ty || (y === ty && m <= tm)) {
      headers.push(`${y}년 ${String(m).padStart(2, '0')}월`)
      m++
      if (m > 12) { m = 1; y++ }
    }
    return headers
  }, [searchType, selectedYear, halfYear, ymFrom, ymTo])

  const items = baseItems
  const dataOffset = searchType === 'year' && halfYear === 'second' ? 6 : 0
  const mc = monthHeaders.length
  const getRow = (data: Record<string, number[]>, name: string) => {
    const base = data[name]?.slice(dataOffset, dataOffset + mc) || Array(mc).fill(0)
    if (includeOther && name === '기타 필요경비') {
      const other = data['그밖의지원금']?.slice(dataOffset, dataOffset + mc) || Array(mc).fill(0)
      return base.map((v, i) => v + other[i])
    }
    return base
  }
  const sumRow = (rows: number[][]) => Array.from({ length: mc }, (_, i) => rows.reduce((s, r) => s + (r[i] || 0), 0))
  const rowTotal = (row: number[]) => row.reduce((s, v) => s + v, 0)

  const incomeRows = items.map(name => ({ name, data: getRow(mockIncome, name) }))
  const expenseRows = items.map(name => ({ name, data: getRow(mockExpense, name) }))
  const incomeSum = sumRow(incomeRows.map(r => r.data))
  const expenseSum = sumRow(expenseRows.map(r => r.data))
  const settlementRows = items.map((name, i) => ({
    name,
    data: Array.from({ length: mc }, (_, j) => incomeRows[i].data[j] - expenseRows[i].data[j]),
  }))
  const settlementSum = Array.from({ length: mc }, (_, i) => incomeSum[i] - expenseSum[i])

  return (
    <div className="p-6 space-y-4">
      {/* 검색 */}
      <div className="flex items-center gap-2 flex-wrap">
        <label className="flex items-center gap-0.5 text-xs text-slate-700 cursor-pointer">
          <input type="radio" name="expSearchType" checked={searchType === 'year'} onChange={() => setSearchType('year')} className="w-3 h-3 accent-blue-600" />
          <span className="font-bold">조회연도</span>
        </label>
        <label className="flex items-center gap-0.5 text-xs text-slate-700 cursor-pointer">
          <input type="radio" name="expSearchType" checked={searchType === 'range'} onChange={() => setSearchType('range')} className="w-3 h-3 accent-blue-600" />
          <span className="font-bold">구간별</span>
        </label>
        {searchType === 'year' ? (
          <>
            <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)} className="border border-slate-300 rounded px-2 py-1.5 text-xs">
              {yearOpts.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select value={halfYear} onChange={e => setHalfYear(e.target.value as 'all' | 'first' | 'second')} className="border border-slate-300 rounded px-2 py-1.5 text-xs">
              <option value="all">전체</option>
              <option value="first">상반기</option>
              <option value="second">하반기</option>
            </select>
          </>
        ) : (
          <>
            <select value={ymFrom} onChange={e => setYmFrom(e.target.value)} className="border border-slate-300 rounded px-2 py-1.5 text-xs">
              {ymOpts.map(ym => <option key={ym} value={ym}>{ym}</option>)}
            </select>
            <span className="text-xs text-slate-400">~</span>
            <select value={ymTo} onChange={e => setYmTo(e.target.value)} className="border border-slate-300 rounded px-2 py-1.5 text-xs">
              {ymOpts.map(ym => <option key={ym} value={ym}>{ym}</option>)}
            </select>
          </>
        )}
        <button className="px-4 py-1.5 text-xs font-bold text-white bg-teal-500 hover:bg-teal-600 rounded transition-colors">검색</button>
        <label className="flex items-center gap-0.5 text-xs text-slate-600 cursor-pointer">
          <input type="checkbox" checked={includeOther} onChange={e => setIncludeOther(e.target.checked)} className="w-3 h-3 accent-blue-600 rounded" />
          <span className="font-bold">그밖의지원금 포함</span>
        </label>
        <div className="relative group">
          <svg className="w-4 h-4 text-slate-400 cursor-pointer hover:text-slate-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
          <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-[9999] hidden group-hover:block pointer-events-none">
            <div className="bg-white text-slate-700 border border-slate-200 text-[11px] rounded-lg px-4 py-3 shadow-xl leading-relaxed whitespace-nowrap">
              <div className="absolute left-1/2 -translate-x-1/2 -top-1 w-2 h-2 bg-white border-l border-t border-slate-200 rotate-45" />
              <p>* 세입/세출 각 선택된 항목만 반영됩니다.</p>
              <p>* 상세등록에서 수입/지출항목에서 세부 계정을 확인할 수 있습니다.</p>
              <p>* 그밖의지원금 중 세목에 기타필요경비 값은 합산처리됩니다.</p>
            </div>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button className="w-8 h-8 flex items-center justify-center bg-white hover:bg-slate-50 border border-slate-300 rounded transition-colors" title="인쇄하기">
            <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5z" /></svg>
          </button>
          <button className="w-8 h-8 flex items-center justify-center bg-white hover:bg-green-50 border border-green-400 rounded transition-colors" title="엑셀다운로드">
            <svg className="w-4 h-4 text-green-600" viewBox="0 0 24 24" fill="currentColor"><path d="M14.2 1H5.8C4.81 1 4 1.81 4 2.8v18.4c0 .99.81 1.8 1.8 1.8h12.4c.99 0 1.8-.81 1.8-1.8V6.8L14.2 1zM15.8 19.3l-2.1-3.5-2.1 3.5H9.8l3.2-5-2.9-4.7h1.8l2.1 3.3 2-3.3h1.8l-2.9 4.7 3.2 5h-2.3z" /></svg>
          </button>
        </div>
      </div>

      {/* 테이블 */}
      <div className="overflow-x-auto border border-slate-200 rounded-lg bg-white">
        <table className="w-full border-collapse" style={{ fontSize: '11px' }}>
          <thead>
            <tr>
              <th className={`${TH} w-14`}>구분</th>
              <th className={`${TH} min-w-[110px]`}>계정과목</th>
              {monthHeaders.map(h => <th key={h} className={TH}>{h}</th>)}
              <th className={`${TH} border-r-0`}>합계</th>
            </tr>
          </thead>
          <tbody>
            {/* 세입 */}
            {incomeRows.map((row, idx) => (
              <tr key={`i-${idx}`} className="hover:bg-blue-50/30">
                {idx === 0 && <td rowSpan={items.length + 1} className={`${TD} font-bold text-blue-700 bg-blue-50/50 align-middle`}>세입</td>}
                <td className={`${TD} text-left px-2 ${idx === 0 ? 'font-medium text-slate-700' : 'text-slate-600 pl-4'}`}>{idx === 0 ? row.name : `-${row.name}`}</td>
                {row.data.map((v, i) => <td key={i} className={`${TD} text-right ${v > 0 ? 'text-blue-700' : v < 0 ? 'text-red-500' : 'text-slate-400'}`}>{fmt(v)}</td>)}
                <td className={`${TD} text-right font-medium text-blue-700 border-r-0`}>{fmt(rowTotal(row.data))}</td>
              </tr>
            ))}
            <tr className="bg-blue-50/50 font-bold">
              <td className={`${TD} text-center text-blue-700`}>수입 합계</td>
              {incomeSum.map((v, i) => <td key={i} className={`${TD} text-right text-blue-700`}>{fmt(v)}</td>)}
              <td className={`${TD} text-right text-blue-700 border-r-0`}>{fmt(rowTotal(incomeSum))}</td>
            </tr>

            {/* 세출 */}
            {expenseRows.map((row, idx) => (
              <tr key={`e-${idx}`} className="hover:bg-red-50/30">
                {idx === 0 && <td rowSpan={items.length + 1} className={`${TD} font-bold text-red-600 bg-red-50/50 align-middle`}>세출</td>}
                <td className={`${TD} text-left px-2 ${idx === 0 ? 'font-medium text-slate-700' : 'text-slate-600 pl-4'}`}>{idx === 0 ? `${row.name} 지출` : `-${row.name}`}</td>
                {row.data.map((v, i) => <td key={i} className={`${TD} text-right ${v > 0 ? 'text-red-600' : v < 0 ? 'text-blue-500' : 'text-slate-400'}`}>{fmt(v)}</td>)}
                <td className={`${TD} text-right font-medium text-red-600 border-r-0`}>{fmt(rowTotal(row.data))}</td>
              </tr>
            ))}
            <tr className="bg-red-50/50 font-bold">
              <td className={`${TD} text-center text-red-600`}>지출 합계</td>
              {expenseSum.map((v, i) => <td key={i} className={`${TD} text-right text-red-600`}>{fmt(v)}</td>)}
              <td className={`${TD} text-right text-red-600 border-r-0`}>{fmt(rowTotal(expenseSum))}</td>
            </tr>

            {/* 정산 */}
            {settlementRows.map((row, idx) => {
              const total = rowTotal(row.data)
              const incTotal = rowTotal(incomeRows[idx].data)
              const pct = incTotal !== 0 ? Math.round((total / incTotal) * -100) : 0
              return (
                <tr key={`s-${idx}`} className="hover:bg-slate-50">
                  {idx === 0 && <td rowSpan={items.length + 1} className={`${TD} font-bold text-green-700 bg-green-50/50 align-middle`}>정산</td>}
                  <td className={`${TD} text-left px-2 ${idx === 0 ? 'font-medium text-slate-700' : 'text-slate-600 pl-4'}`}>{idx === 0 ? `${row.name}` : `-${row.name}`}</td>
                  {row.data.map((v, i) => <td key={i} className={`${TD} text-right ${v > 0 ? 'text-green-700' : v < 0 ? 'text-red-500' : 'text-slate-400'}`}>{fmt(v)}</td>)}
                  <td className={`${TD} text-right font-medium border-r-0 ${total >= 0 ? 'text-green-700' : 'text-red-500'}`}>{fmt(total)}{incTotal > 0 ? ` (${pct} %)` : ''}</td>
                </tr>
              )
            })}
            <tr className="bg-green-50/50 font-bold">
              <td className={`${TD} text-center text-green-700`}>합계</td>
              {settlementSum.map((v, i) => <td key={i} className={`${TD} text-right ${v >= 0 ? 'text-green-700' : 'text-red-500'}`}>{fmt(v)}</td>)}
              <td className={`${TD} text-right border-r-0 ${rowTotal(settlementSum) >= 0 ? 'text-green-700' : 'text-red-500'}`}>{fmt(rowTotal(settlementSum))} ({rowTotal(incomeSum) !== 0 ? Math.round((rowTotal(settlementSum) / rowTotal(incomeSum)) * -100) : 0} %)</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
