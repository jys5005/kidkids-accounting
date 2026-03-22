'use client'

import { useState } from 'react'

function fmt(n: number) { return n ? n.toLocaleString('ko-KR') : '0' }

type Row = {
  id: number; docNo: string; date: string; summary: string
  income: number; expense: number; code: string; account: string; counterpart: string
}

const mockData: Row[] = [
  { id: 1, docNo: 'A000016', date: '2026-03-04', summary: '이송이환3월차량비', income: 60000, expense: 0, code: '221-113', account: '기타 필요경비 (차량운행비)', counterpart: '이송이환3월차량비' },
  { id: 2, docNo: 'A000020', date: '2026-03-05', summary: '3월 입소료 경울', income: 100000, expense: 0, code: '221-111', account: '기타 필요경비 (입학준비금)', counterpart: '3월 입소료 경울' },
  { id: 3, docNo: 'A000035', date: '2026-03-10', summary: '이한이준이나입학비', income: 300000, expense: 0, code: '221-111', account: '기타 필요경비 (입학준비금)', counterpart: '이한이준이나입학비' },
  { id: 4, docNo: 'A000043', date: '2026-03-14', summary: '푸른바다이진우차량비', income: 30000, expense: 0, code: '221-113', account: '기타 필요경비 (차량운행비)', counterpart: '푸른바다이진우차량비' },
  { id: 5, docNo: 'B000035', date: '2026-03-16', summary: '오르프악기건성회', income: 0, expense: 1160000, code: '411', account: '특별활동비지출', counterpart: '오르프악기건성회' },
  { id: 6, docNo: 'B000036', date: '2026-03-16', summary: '도자기휴체험건성회', income: 0, expense: 1525000, code: '421-112', account: '기타 필요경비 지출 (현장학습비)', counterpart: '도자기휴체험건성회' },
  { id: 7, docNo: 'B000037', date: '2026-03-16', summary: '특성화건성회', income: 0, expense: 855000, code: '421-141', account: '기타 필요경비 지출 (기타시도특성화비)', counterpart: '특성화건성회' },
]

const TH = 'px-2 py-2 text-center font-bold text-slate-600 whitespace-nowrap border-b border-r border-slate-200 text-[11px] bg-orange-50'
const TD = 'px-2 py-2 text-center border-b border-r border-slate-100 text-xs'

export default function RequiredExpensePage() {
  const now = new Date()
  const toDateStr = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const [dateFrom, setDateFrom] = useState(monthStart)
  const [dateTo, setDateTo] = useState(toDateStr(now))
  const [filterAccount, setFilterAccount] = useState('전체')
  const [unmatched, setUnmatched] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [checked, setChecked] = useState<Set<number>>(new Set())

  const data = mockData
  const totalIncome = data.reduce((s, r) => s + r.income, 0)
  const totalExpense = data.reduce((s, r) => s + r.expense, 0)
  const allChecked = data.length > 0 && data.every(r => checked.has(r.id))

  return (
    <div className="p-6 space-y-4">
      {/* 검색 */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-bold text-slate-600">계정</span>
        <select value={filterAccount} onChange={e => setFilterAccount(e.target.value)} className="border border-slate-300 rounded px-2 py-1.5 text-xs min-w-[200px]">
          <option>::전체::</option>
          <option disabled className="font-bold">──────────</option>
          <option>계정미지정</option>
          <option>수입 전체</option>
          <option>지출 전체</option>
          <option disabled className="font-bold">── 수입계정 ──</option>
          <option>수입: 특별활동비</option>
          <option>수입: 기타 필요경비</option>
          <option>수입: [세목] 입학준비금</option>
          <option>수입: [세목] 현장학습비</option>
          <option>수입: [세목] 차량운행비</option>
          <option>수입: [세목] 부모부담행사비</option>
          <option>수입: [세목] 아침,저녁급식비</option>
          <option>수입: [세목] 기타시도특성화비</option>
          <option>수입: 그 밖의 지원금</option>
          <option>수입: [인천] 법정 아동 특별활동비 지원</option>
          <option>수입: [인천] 법정 아동기타필요경비 지원(현장학습비)</option>
          <option>수입: [인천] 법정 아동기타필요경비 지원(부모부담 행사비)</option>
          <option>수입: [인천] 법정 아동기타필요경비 지원(시도특성화비)</option>
          <option>수입: [인천] 법정 아동기타필요경비 지원(차량운행비)</option>
          <option>수입: [인천] 만5세아 특별활동비 지원</option>
          <option>수입: [인천] 만5세아 기타필요경비 지원(입학준비금)</option>
          <option>수입: [인천] 만5세아 기타필요경비 지원(현장학습비)</option>
          <option>수입: [인천] 만5세아 기타필요경비 지원(부모부담 행사비)</option>
          <option>수입: [인천] 만5세아 기타필요경비 지원(시도특성화비)</option>
          <option>수입: [인천] 만5세아 기타필요경비 지원(차량운행비)</option>
          <option>수입: [인천] 외국인 특별활동비 지원</option>
          <option>수입: [인천] 외국인 기타필요경비 지원(입학준비금)</option>
          <option>수입: [인천] 외국인 기타필요경비 지원(현장학습비)</option>
          <option>수입: [인천] 외국인 기타필요경비 지원(부모부담 행사비)</option>
          <option>수입: [인천] 외국인 기타필요경비 지원(시도특성화비)</option>
          <option>수입: [인천] 외국인 기타필요경비 지원(차량운행비)</option>
          <option>수입: [세목] 누리과정기타지원금</option>
          <option>수입: [세목] 법정아동필요경비</option>
          <option>수입: 전입금</option>
          <option>수입: [세목] 특별활동비</option>
          <option>수입: [세목] 입학준비금</option>
          <option>수입: [세목] 현장학습비</option>
          <option>수입: [세목] 차량운행비</option>
          <option>수입: [세목] 부모부담행사비</option>
          <option>수입: [세목] 조석식비</option>
          <option>수입: [세목] 특성화비</option>
          <option>수입: [세목] 기타경비</option>
          <option disabled className="font-bold">── 지출계정 ──</option>
          <option>지출: 수용비 및 수수료</option>
          <option>지출: [세목] 누리과정수용비및수수료</option>
          <option>지출: [세목] 특별활동비</option>
          <option>지출: [세목] 입학준비금</option>
          <option>지출: [세목] 현장학습비</option>
          <option>지출: [세목] 차량운행비</option>
          <option>지출: [세목] 부모부담행사비</option>
          <option>지출: [세목] 조석식비</option>
          <option>지출: [세목] 특성화비</option>
          <option>지출: [세목] 기타경비</option>
          <option>지출: 특별활동비지출</option>
          <option>지출: 기타 필요경비 지출</option>
          <option>지출: [세목] 입학준비금</option>
          <option>지출: [세목] 현장학습비</option>
          <option>지출: [세목] 차량운행비</option>
          <option>지출: [세목] 부모부담행사비</option>
          <option>지출: [세목] 아침,저녁급식비</option>
          <option>지출: [세목] 기타시도특성화비</option>
        </select>
        <label className="flex items-center gap-0.5 text-xs text-slate-600 cursor-pointer">
          <input type="checkbox" checked={unmatched} onChange={e => setUnmatched(e.target.checked)} className="w-3 h-3 rounded" />
          <span>미매칭</span>
        </label>
        <span className="text-xs font-bold text-slate-600">기간</span>
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="border border-amber-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-blue-400" />
        <span className="text-xs text-slate-400">~</span>
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="border border-amber-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-blue-400" />
        <input type="text" value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="적요" className="border border-slate-300 rounded px-2 py-1.5 text-xs w-28 placeholder:text-slate-300 focus:outline-none focus:border-blue-400" />
        <button className="px-4 py-1.5 text-xs font-bold text-white bg-[#f5b800] hover:bg-[#d4a000] rounded transition-colors">검색</button>
        <span className="text-xs font-bold text-slate-600">원아별 매칭</span>
        <div className="w-px h-5 bg-slate-200" />
        <button className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors">매칭하기</button>
        <button className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors">원아지키기</button>
        <button className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded transition-colors">매칭초기화</button>
        <button className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded transition-colors">일괄분리</button>
        <div className="w-px h-5 bg-slate-200" />
        <button className="w-8 h-8 flex items-center justify-center bg-white hover:bg-slate-50 border border-slate-300 rounded transition-colors" title="인쇄하기">
          <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2z" /></svg>
        </button>
        <button className="w-8 h-8 flex items-center justify-center bg-white hover:bg-green-50 border border-green-400 rounded transition-colors" title="엑셀저장">
          <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
        </button>
      </div>

      {/* 테이블 */}
      <div className="overflow-x-auto border border-slate-200 rounded-lg bg-white">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr>
              <th className={`${TH} w-8`}><input type="checkbox" checked={allChecked} onChange={e => { if (e.target.checked) setChecked(new Set(data.map(r => r.id))); else setChecked(new Set()) }} className="w-3 h-3 rounded" /></th>
              <th className={TH}>번호</th>
              <th className={TH}>일자</th>
              <th className={`${TH} min-w-[200px]`}>적요</th>
              <th className={TH}>수입액</th>
              <th className={TH}>지출액</th>
              <th className={TH}>코드</th>
              <th className={`${TH} min-w-[200px]`}>계정과목</th>
              <th className={TH}>거래처</th>
              <th className={TH}>비고</th>
              <th className={TH}>분리</th>
              <th className={`${TH} border-r-0`}>원아</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                <td className={TD}><input type="checkbox" checked={checked.has(row.id)} onChange={e => { const n = new Set(checked); e.target.checked ? n.add(row.id) : n.delete(row.id); setChecked(n) }} className="w-3 h-3 rounded" /></td>
                <td className={TD}>{row.docNo}</td>
                <td className={TD}>{row.date}</td>
                <td className={`${TD} text-left px-3`}>{row.summary}</td>
                <td className={`${TD} text-right ${row.income > 0 ? 'text-blue-700 font-medium' : 'text-slate-300'}`}>{fmt(row.income)}</td>
                <td className={`${TD} text-right ${row.expense > 0 ? 'text-red-600 font-medium' : 'text-slate-300'}`}>{fmt(row.expense)}</td>
                <td className={`${TD} text-slate-500`}>{row.code}</td>
                <td className={`${TD} text-left px-2 text-blue-600 font-medium`}>{row.account}</td>
                <td className={`${TD} text-left px-2`}>{row.counterpart}</td>
                <td className={TD}></td>
                <td className={TD}>
                  <button className="text-[10px] font-bold text-blue-600 hover:text-blue-800 px-1.5 py-0.5 border border-blue-300 bg-blue-50 hover:bg-blue-100 rounded transition-colors">관리</button>
                </td>
                <td className={`${TD} border-r-0`}>
                  <button className="text-[10px] font-bold text-slate-500 hover:text-slate-700 px-1.5 py-0.5 border border-slate-300 bg-slate-50 hover:bg-slate-100 rounded transition-colors">원아</button>
                </td>
              </tr>
            ))}
            {/* 합계 */}
            <tr className="bg-slate-50 font-bold">
              <td colSpan={4} className={`${TD} text-center text-slate-700`}>합계</td>
              <td className={`${TD} text-right text-blue-700`}>{fmt(totalIncome)}</td>
              <td className={`${TD} text-right text-red-600`}>{fmt(totalExpense)}</td>
              <td colSpan={6} className={`${TD} border-r-0`}></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
