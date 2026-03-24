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

const TH = 'px-2 py-2 text-center font-bold text-slate-600 whitespace-nowrap border-b border-r border-slate-200 text-[11px] bg-teal-50'
const TD = 'px-2 py-2 text-center border-b border-r border-slate-100 text-xs'

export default function RequiredExpensePage() {
  const now = new Date()
  const toDateStr = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const [dateFrom, setDateFrom] = useState(monthStart)
  const [dateTo, setDateTo] = useState(toDateStr(now))
  const [filterAccount, setFilterAccount] = useState('전체')
  const [unmatched, setUnmatched] = useState(false)
  const [subTab, setSubTab] = useState('개인별 필요경비정산')
  const [keyword, setKeyword] = useState('')
  const [checked, setChecked] = useState<Set<number>>(new Set())
  const [matchRow, setMatchRow] = useState<Row | null>(null)
  const [matchChecked, setMatchChecked] = useState<Set<string>>(new Set())
  const [matchMode, setMatchMode] = useState<'simple' | 'detail'>('simple')
  const [matchResult, setMatchResult] = useState<Record<number, string[]>>({})
  const [showSplit, setShowSplit] = useState(false)
  const [splitOverride, setSplitOverride] = useState<string | null>(null)
  const [splitMode, setSplitMode] = useState<'equal' | 'custom'>('equal')
  const [showRateSummary, setShowRateSummary] = useState(false)
  const [showRateSection, setShowRateSection] = useState(false)
  const [viewLevel, setViewLevel] = useState<'mok' | 'semok'>('semok')
  const [showLawChild, setShowLawChild] = useState(false)
  const [selectedLawChild, setSelectedLawChild] = useState('')

  const childList = [
    { name: '곽이안', className: '예쁜반21세아반' },
    { name: '김다솜', className: '수리반12세아반' },
    { name: '김도하', className: '초롱반1연령혼합반(1,2세)' },
    { name: '김준민', className: '초롱반21세아반' },
    { name: '민이랑', className: '예쁜반21세아반' },
    { name: '정해인', className: '예쁜반11세아반' },
    { name: '조연서', className: '수리반12세아반' },
  ]

  const toggleMatch = (name: string) => {
    const next = new Set(matchChecked)
    next.has(name) ? next.delete(name) : next.add(name)
    setMatchChecked(next)
    setSplitOverride(null) // 체크 변경 시 차액적용 초기화
  }

  const data = unmatched ? mockData.filter(r => !matchResult[r.id]) : mockData
  const totalIncome = data.reduce((s, r) => s + r.income, 0)
  const totalExpense = data.reduce((s, r) => s + r.expense, 0)
  const allChecked = data.length > 0 && data.every(r => checked.has(r.id))

  return (
    <div className="p-6 space-y-4">
      {/* 매칭 팝업 - 원아별 세목 금액 입력 */}
      {matchRow && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => setMatchRow(null)}>
          <div className={`bg-white rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto transition-all w-[650px]`} onClick={e => e.stopPropagation()}>
            <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-[14px] font-bold text-slate-800">원아 매칭</span>
                <div className="flex items-center bg-slate-200 rounded-full p-0.5">
                  <button onClick={() => setMatchMode('simple')} className={`px-3 py-1 text-[11px] font-bold rounded-full transition-colors ${matchMode === 'simple' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500'}`}>간편</button>
                  <button onClick={() => setMatchMode('detail')} className={`px-3 py-1 text-[11px] font-bold rounded-full transition-colors ${matchMode === 'detail' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500'}`}>상세</button>
                </div>
              </div>
              <button onClick={() => setMatchRow(null)} className="text-slate-400 hover:text-slate-600 text-lg">&times;</button>
            </div>
            <div className="px-5 py-3">
              <div className="bg-blue-50 border border-blue-200 rounded px-3 py-2 mb-3 text-[12px]">
                <p><span className="font-bold text-slate-700">전표:</span> {matchRow.docNo} | {matchRow.date} | <span className="font-bold text-slate-700">적요:</span> {matchRow.summary} | <span className="font-bold text-slate-700">금액:</span> {matchRow.income > 0 ? <span className="text-blue-700">수입 {fmt(matchRow.income)}원</span> : <span className="text-red-600">지출 {fmt(matchRow.expense)}원</span>}</p>
              </div>
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <div className="flex items-center gap-1">
                  <span className="text-[11px] font-bold text-slate-700">반선택</span>
                  <select className="border border-amber-300 rounded px-2 py-1 text-[11px]">
                    <option>선택</option>
                    {[...new Set(childList.map(c => c.className))].map(cn => <option key={cn}>{cn}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[11px] font-bold text-slate-700">원아명/반</span>
                  <input className="border border-amber-300 rounded px-2 py-1 text-[11px] w-28" />
                  <button className="px-2 py-1 text-[10px] font-bold text-white bg-blue-600 rounded">검색</button>
                </div>
                <div className="flex items-center gap-2 ml-auto">
                  <label className="text-[11px] font-bold"><input type="radio" name="matchSplit" checked={splitMode === 'equal'} onChange={() => { setSplitMode('equal'); setSplitOverride(null) }} className="mr-0.5" />균등분할</label>
                  <label className="text-[11px] font-bold"><input type="radio" name="matchSplit" checked={splitMode === 'custom'} onChange={() => { setSplitMode('custom'); setSplitOverride(null) }} className="mr-0.5" />개별금액분할</label>
                </div>
              </div>
              {/* 간편 모드 */}
              {matchMode === 'simple' && (() => {
                const totalAmount = matchRow ? (matchRow.income || matchRow.expense) : 0
                const checkedCount = matchChecked.size
                const perChild = checkedCount >= 2 ? Math.floor(totalAmount / checkedCount) : 0
                return (
                <table className="w-full text-[12px] border-collapse border border-slate-200">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-2 py-2 border-r border-slate-200 w-[30px]"><input type="checkbox" checked={matchChecked.size === childList.length} onChange={() => matchChecked.size === childList.length ? setMatchChecked(new Set()) : setMatchChecked(new Set(childList.map(c => c.name)))} /></th>
                      <th className="px-3 py-2 text-left font-bold text-slate-600 border-r border-slate-200">원아명</th>
                      <th className="px-3 py-2 text-left font-bold text-slate-600 border-r border-slate-200">반</th>
                      <th className="px-3 py-2 text-center font-bold text-slate-600 border-r border-slate-200">생년월일</th>
                      <th className="px-3 py-2 text-center font-bold text-slate-600 border-r border-slate-200">적용월</th>
                      {(checkedCount >= 2 || (checkedCount >= 1 && splitMode === 'custom')) && <th className="px-3 py-2 text-center font-bold text-slate-600 border-r border-slate-200">금액</th>}
                      {checkedCount >= 2 && splitMode === 'equal' && <th className="px-3 py-2 text-center font-bold text-slate-600"></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {childList.map(c => {
                      const birth = c.name === '곽이안' ? '2023-10-28' : c.name === '김다솜' ? '2022-11-10' : c.name === '김도하' ? '2022-11-15' : c.name === '김준민' ? '2023-09-03' : c.name === '민이랑' ? '2024-01-03' : c.name === '정해인' ? '2023-04-08' : '2022-10-18'
                      const isChecked = matchChecked.has(c.name)
                      return (
                        <tr key={c.name} className={`border-b border-slate-100 hover:bg-blue-50/30 cursor-pointer ${isChecked ? 'bg-blue-50/50' : ''}`} onClick={() => toggleMatch(c.name)}>
                          <td className="px-2 py-1.5 text-center border-r border-slate-100"><input type="checkbox" checked={isChecked} onChange={() => toggleMatch(c.name)} /></td>
                          <td className="px-3 py-1.5 border-r border-slate-100">{c.name}</td>
                          <td className="px-3 py-1.5 text-[11px] text-slate-500 border-r border-slate-100">{c.className}</td>
                          <td className="px-3 py-1.5 text-center text-slate-500 border-r border-slate-100">{birth}</td>
                          <td className="px-3 py-1.5 text-center border-r border-slate-100" onClick={e => e.stopPropagation()}>
                            <select className="border border-slate-200 rounded px-1 py-0.5 text-[11px]">
                              <option>2026-03</option><option>2026-04</option>
                            </select>
                          </td>
                          {(checkedCount >= 2 || (splitMode === 'custom' && isChecked)) && <td className="px-1 py-1 border-r border-slate-100" onClick={e => e.stopPropagation()}>
                            {isChecked && splitMode === 'equal' && <input value={splitOverride === c.name ? perChild + (totalAmount % checkedCount) : perChild} readOnly className="border border-amber-300 rounded px-2 py-1 text-[11px] text-right w-[70px] bg-white" />}
                            {isChecked && splitMode === 'custom' && <input defaultValue="" placeholder="0" className="border border-amber-300 rounded px-2 py-1 text-[11px] text-right w-[70px]" />}
                          </td>}
                          {checkedCount >= 2 && splitMode === 'equal' && <td className="px-1 py-1.5 text-center" onClick={e => e.stopPropagation()}>
                            {isChecked && !splitOverride && (totalAmount % checkedCount !== 0) && <button onClick={() => setSplitOverride(c.name)} className="text-[10px] font-bold text-white bg-orange-500 px-1.5 py-0.5 rounded whitespace-nowrap">차액<br/>적용</button>}
                          </td>}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                )
              })()}
              {/* 상세 모드 - 분리적용 */}
              {matchMode === 'detail' && (() => {
                const selected = childList.filter(c => matchChecked.has(c.name))
                const totalAmount = matchRow ? (matchRow.income || matchRow.expense) : 0
                const perChild = selected.length > 0 ? Math.floor(totalAmount / selected.length) : 0
                return (
                  <div>
                    <div className="bg-yellow-50 border border-yellow-300 rounded px-3 py-2 mb-3 text-[12px] text-yellow-800 space-y-1">
                      <p className="font-bold">[참조] 분리적용할 원아금액을 확인하신 후 저장을 클릭하세요.</p>
                      <p className="text-red-600 font-bold">[분리할 금액] {fmt(totalAmount)}원을 균등분할로 처리합니다.</p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-[11px] border-collapse border border-slate-200 min-w-[1000px]">
                        <thead>
                          <tr className="bg-slate-100 border-b border-slate-300">
                            <th className="px-2 py-2 font-bold text-slate-600 border-r border-slate-200">이름</th>
                            <th className="px-2 py-2 font-bold text-slate-600 border-r border-slate-200">반</th>
                            <th className="px-2 py-2 font-bold text-slate-600 border-r border-slate-200">기타<br/>필요경비</th>
                            <th className="px-2 py-2 font-bold text-slate-600 border-r border-slate-200">입학<br/>준비금</th>
                            <th className="px-2 py-2 font-bold text-slate-600 border-r border-slate-200">현장<br/>학습비</th>
                            <th className="px-2 py-2 font-bold text-slate-600 border-r border-slate-200">차량<br/>운행비</th>
                            <th className="px-2 py-2 font-bold text-slate-600 border-r border-slate-200">행사비</th>
                            <th className="px-2 py-2 font-bold text-slate-600 border-r border-slate-200">조석식비</th>
                            <th className="px-2 py-2 font-bold text-slate-600 border-r border-slate-200">특성화비</th>
                            <th className="px-2 py-2 font-bold text-slate-600 border-r border-slate-200">특별<br/>활동비</th>
                            <th className="px-2 py-2 font-bold text-slate-600 border-r border-slate-200">적용월<br/>(등록시적용)</th>
                            <th className="px-2 py-2 font-bold text-slate-600 border-r border-slate-200">금액</th>
                            <th className="px-2 py-2 font-bold text-slate-600">차액적용</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selected.map(c => (
                            <tr key={c.name} className="border-b border-slate-100">
                              <td className="px-2 py-1.5 border-r border-slate-100 whitespace-nowrap">{c.name}</td>
                              <td className="px-2 py-1.5 border-r border-slate-100 text-[10px]">{c.className}</td>
                              <td className="px-2 py-1.5 text-center border-r border-slate-100">0</td>
                              <td className="px-2 py-1.5 text-center border-r border-slate-100">0</td>
                              <td className="px-2 py-1.5 text-center border-r border-slate-100">0</td>
                              <td className="px-2 py-1.5 text-center border-r border-slate-100">0</td>
                              <td className="px-2 py-1.5 text-center border-r border-slate-100">0</td>
                              <td className="px-2 py-1.5 text-center border-r border-slate-100">0</td>
                              <td className="px-2 py-1.5 text-center border-r border-slate-100">0</td>
                              <td className="px-2 py-1.5 text-center border-r border-slate-100">0</td>
                              <td className="px-2 py-1.5 text-center border-r border-slate-100">
                                <select className="border border-slate-200 rounded px-1 py-0.5 text-[10px]">
                                  <option>2026-03</option><option>2026-04</option>
                                </select>
                              </td>
                              <td className="px-1 py-1 border-r border-slate-100">
                                <input defaultValue={perChild} className="border border-amber-300 rounded px-2 py-1 text-[11px] text-right w-[70px]" />
                              </td>
                              <td className="px-2 py-1.5 text-center">
                                <button className="text-[10px] font-bold text-white bg-orange-500 px-2 py-0.5 rounded">차액적용</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="text-right text-[12px] text-green-700 mt-2">
                      (원금액-분리증금액=차액) : {fmt(totalAmount)} - {fmt(perChild * selected.length)} = {fmt(totalAmount - perChild * selected.length)}
                    </div>
                  </div>
                )
              })()}
            </div>
            <div className="px-5 py-3 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-slate-500">{matchChecked.size}명 선택</span>
                <div className="flex gap-2">
                  <button onClick={() => {
                    if (matchChecked.size === 0) { alert('원아를 선택해주세요.'); return }
                    setMatchResult(prev => ({ ...prev, [matchRow!.id]: [...matchChecked] }))
                    setMatchRow(null)
                  }} className="px-6 py-1.5 text-[12px] font-bold text-white bg-teal-600 rounded hover:bg-teal-700">저장</button>
                  {matchResult[matchRow!.id] && <button onClick={() => { setMatchResult(prev => { const next = { ...prev }; delete next[matchRow!.id]; return next }); setMatchChecked(new Set()) }} className="px-6 py-1.5 text-[12px] font-bold text-red-500 bg-red-50 border border-red-300 rounded hover:bg-red-100">삭제</button>}
                  <button onClick={() => setMatchRow(null)} className="px-6 py-1.5 text-[12px] font-bold text-slate-600 bg-slate-100 border border-slate-300 rounded hover:bg-slate-200">취소</button>
                </div>
              </div>
              {matchChecked.size >= 2 && (() => {
                const totalAmount = matchRow ? (matchRow.income || matchRow.expense) : 0
                const perChild = Math.floor(totalAmount / matchChecked.size)
                const splitTotal = splitOverride ? totalAmount : perChild * matchChecked.size
                const diff = totalAmount - splitTotal
                return <p className={`text-right text-[12px] mt-2 ${diff === 0 ? 'text-green-700' : 'text-red-600'}`}>(원금액-분리중금액=차액) : &nbsp; {fmt(totalAmount)} - {fmt(splitTotal)} = {fmt(diff)}</p>
              })()}
            </div>
          </div>
        </div>
      )}
      {/* 하단 서브 탭 */}
      <div className="flex items-center gap-0 border-b border-slate-200 overflow-x-auto">
        {['개인별 필요경비정산','개인별세출(요율)정산서','세출요율정산서','법정아동필요경비정산','필요경비정산서정리','인천시원아별지원내역관리'].map(t => (
          <button key={t} onClick={() => setSubTab(t)} className={`px-3 py-2 text-[11px] font-bold whitespace-nowrap border-b-2 transition-colors relative group ${subTab === t ? 'text-teal-700 border-teal-500' : 'text-slate-400 border-transparent hover:text-slate-600 hover:border-slate-300'}`}>
            {t}
            {t === '개인별세출(요율)정산서' && (
              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-3 py-2 text-[10px] text-white bg-slate-800 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                필요경비의 수입부 매칭 과 지출부의 요율을 구해서 정산서가 출력됩니다.
                <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></span>
              </span>
            )}
          </button>
        ))}
      </div>

      {subTab === '개인별세출(요율)정산서' && (<>
        {/* 필터 */}
        <div className="bg-white rounded border border-slate-200 px-4 py-3 text-[12px]">
          <div className="flex items-center gap-3 flex-wrap">
            <label className="text-[12px]"><input type="checkbox" className="mr-1" />삭제원아포함</label>
            <span className="font-bold text-slate-600">반선택</span>
            <select className="border border-slate-300 rounded px-2 py-1.5 text-[12px] min-w-[180px]"><option>선택</option></select>
            <select className="border border-slate-300 rounded px-2 py-1.5 text-[12px]">
              <option>2026-01</option><option>2026-02</option><option>2026-03</option>
            </select>
            <span>~</span>
            <select className="border border-slate-300 rounded px-2 py-1.5 text-[12px]">
              <option>2026-12</option><option>2026-03</option>
            </select>
            <span className="font-bold text-slate-600 ml-3">원아상태</span>
            <select className="border border-slate-300 rounded px-2 py-1.5 text-[12px]"><option>전체</option><option>현원</option><option>퇴소</option></select>
            <input className="border border-slate-300 rounded px-2 py-1.5 text-[12px] w-32 ml-2" placeholder="원아/보육반" />
            <button className="px-4 py-1.5 text-[11px] font-bold text-white bg-blue-600 rounded">검색</button>
          </div>
        </div>
        {/* 테이블 */}
        <div className="bg-white rounded border border-slate-200 overflow-x-auto">
          <table className="w-full text-[10px] border-collapse min-w-[1400px]">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200">
                <th rowSpan={2} className="px-1 py-2 border-r border-slate-200 w-[25px]"><input type="checkbox" /></th>
                <th rowSpan={2} className="px-2 py-2 font-bold text-slate-700 border-r border-slate-200">원아명</th>
                <th rowSpan={2} className="px-2 py-2 font-bold text-slate-700 border-r border-slate-200">생년월일</th>
                <th rowSpan={2} className="px-2 py-2 font-bold text-slate-700 border-r border-slate-200">소속반</th>
                <th rowSpan={2} className="px-2 py-2 font-bold text-slate-700 border-r border-slate-200">입소일</th>
                <th rowSpan={2} className="px-2 py-2 font-bold text-slate-700 border-r border-slate-200">퇴소일</th>
                <th rowSpan={2} className="px-2 py-2 font-bold text-slate-700 border-r border-slate-200">상태</th>
                <th colSpan={3} className="px-2 py-1 font-bold text-slate-700 border-r border-slate-200 border-b border-slate-200 bg-slate-100">필요경비수입</th>
                <th colSpan={3} className="px-2 py-1 font-bold text-slate-700 border-r border-slate-200 border-b border-slate-200 bg-slate-100">필요경비지출</th>
                <th colSpan={3} className="px-2 py-1 font-bold text-slate-700 border-r border-slate-200 border-b border-slate-200 bg-slate-100">차이액</th>
                <th rowSpan={2} className="px-2 py-2 font-bold text-slate-700 border-r border-slate-200 text-[9px]">관리운영비<br/>사용가능금액</th>
                <th rowSpan={2} className="px-2 py-2 font-bold text-slate-700 text-[9px]">기타필요경비<br/>(14%)</th>
              </tr>
              <tr className="bg-slate-100 border-b border-slate-200">
                <th className="px-1 py-1 font-bold text-slate-700 border-r border-slate-200">합계</th>
                <th className="px-1 py-1 font-bold text-slate-700 border-r border-slate-200 text-[9px]">기타필요<br/>경비</th>
                <th className="px-1 py-1 font-bold text-slate-700 border-r border-slate-200 text-[9px]">특별활<br/>동비</th>
                <th className="px-1 py-1 font-bold text-slate-700 border-r border-slate-200">합계</th>
                <th className="px-1 py-1 font-bold text-slate-700 border-r border-slate-200 text-[9px]">기타필요<br/>경비</th>
                <th className="px-1 py-1 font-bold text-slate-700 border-r border-slate-200 text-[9px]">특별활<br/>동비</th>
                <th className="px-1 py-1 font-bold text-slate-700 border-r border-slate-200">합계</th>
                <th className="px-1 py-1 font-bold text-slate-700 border-r border-slate-200 text-[9px]">기타필요<br/>경비</th>
                <th className="px-1 py-1 font-bold text-slate-700 border-r border-slate-200 text-[9px]">특별활<br/>동비</th>
              </tr>
            </thead>
            <tbody>
              {[
                { name: 'ANARKHANGAI(214770)', birth: '2023-08-30', nursery: '2025풀일반연령혼합반(1.2세)', className: '2025풀일반연령혼합반(1.2세)', enter: '2025-03-10', leave: '', status: '현원' },
                { name: 'BAT YERUULT ANAND(181233)', birth: '2020-09-03', nursery: '예쁜들꽃2세아반', className: '예쁜들꽃2세아반', enter: '2022-07-11', leave: '', status: '현원' },
                { name: 'BAYASGALANTENUUN(181276)', birth: '2023-05-01', nursery: '아기구름0세아반', className: '아기구름0세아반', enter: '2024-04-02', leave: '', status: '현원' },
                { name: '강나윤(161100)', birth: '2019-11-17', nursery: '예쁜들꽃2세아반', className: '예쁜들꽃2세아반', enter: '2021-10-05', leave: '', status: '현원' },
                { name: '경한울(219900)', birth: '2022-10-01', nursery: '2025향기2세아반', className: '2025향기2세아반', enter: '2025-10-20', leave: '', status: '현원' },
                { name: '고나경(181235)', birth: '2020-07-13', nursery: '파란하늘반3세아반', className: '파란하늘반3세아반', enter: '2022-11-09', leave: '', status: '현원' },
                { name: '권서현(214768)', birth: '2022-07-06', nursery: '2025향기2세아반', className: '2025향기2세아반', enter: '2025-03-01', leave: '', status: '현원' },
                { name: '김민(181263)', birth: '2020-07-14', nursery: '맑은샘물누리장애아반', className: '맑은샘물누리장애아반', enter: '2023-08-22', leave: '', status: '현원' },
              ].map(r => (
                <tr key={r.name} className="border-b border-slate-100 hover:bg-blue-50/20">
                  <td className="px-1 py-1.5 text-center border-r border-slate-100"><input type="checkbox" /></td>
                  <td className="px-2 py-1.5 border-r border-slate-100 whitespace-nowrap">{r.name}</td>
                  <td className="px-2 py-1.5 text-center border-r border-slate-100">{r.birth}</td>
                  <td className="px-2 py-1.5 border-r border-slate-100 text-[9px]">{r.className}</td>
                  <td className="px-2 py-1.5 text-center border-r border-slate-100">{r.enter}</td>
                  <td className="px-2 py-1.5 text-center border-r border-slate-100">{r.leave || '-'}</td>
                  <td className="px-2 py-1.5 text-center border-r border-slate-100"><span className={`font-bold ${r.status === '현원' ? 'text-blue-600' : 'text-red-500'}`}>{r.status}</span></td>
                  <td className="px-2 py-1.5 text-right border-r border-slate-100 bg-blue-50/30">0</td>
                  <td className="px-2 py-1.5 text-right border-r border-slate-100 bg-blue-50/30">0</td>
                  <td className="px-2 py-1.5 text-right border-r border-slate-100 bg-blue-50/30">0</td>
                  <td className="px-2 py-1.5 text-right border-r border-slate-100 bg-red-50/30">0</td>
                  <td className="px-2 py-1.5 text-right border-r border-slate-100 bg-red-50/30">0</td>
                  <td className="px-2 py-1.5 text-right border-r border-slate-100 bg-red-50/30">0</td>
                  <td className="px-2 py-1.5 text-right border-r border-slate-100">0</td>
                  <td className="px-2 py-1.5 text-right border-r border-slate-100">0</td>
                  <td className="px-2 py-1.5 text-right border-r border-slate-100">0</td>
                  <td className="px-2 py-1.5 text-right border-r border-slate-100">0</td>
                  <td className="px-2 py-1.5 text-right">0</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>)}

      {subTab === '세출요율정산서' && (<>
        {/* 필터 */}
        <div className="bg-white rounded border border-slate-200 px-4 py-3 text-[12px] space-y-2">
          <div className="flex items-center gap-3">
            <span className="font-bold text-slate-700">회계연도</span>
            <select className="border border-slate-300 rounded px-2 py-1.5 text-[12px]"><option>2026</option><option>2025</option></select>
            <div className="flex items-center gap-2 ml-auto">
            <div className="flex items-center bg-slate-200 rounded-full p-0.5">
              <button onClick={() => setViewLevel('mok')} className={`px-3 py-1 text-[11px] font-bold rounded-full transition-colors ${viewLevel === 'mok' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500'}`}>목</button>
              <button onClick={() => setViewLevel('semok')} className={`px-3 py-1 text-[11px] font-bold rounded-full transition-colors ${viewLevel === 'semok' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500'}`}>세목</button>
            </div>
            <div className="relative ml-2">
              <button onClick={() => { setShowRateSummary(v => !v); setShowRateSection(false) }} className={`px-3 py-1.5 text-[11px] font-bold rounded border transition-colors ${showRateSummary ? 'text-teal-700 bg-teal-50 border-teal-400' : 'text-slate-500 bg-white border-slate-300 hover:bg-slate-50'}`}>요율</button>
              {showRateSummary && (<>
                <div className="fixed inset-0 z-10" onClick={() => setShowRateSummary(false)} />
                <div className="absolute top-full right-0 mt-2 bg-white border-2 border-slate-300 rounded-lg shadow-2xl z-20 w-[750px] overflow-hidden">
                  <div className="px-3 py-2 bg-slate-700 text-white text-[12px] font-bold flex items-center justify-between">요율 요약 <button onClick={() => setShowRateSummary(false)} className="text-slate-300 hover:text-white text-lg leading-none">&times;</button></div>
                  <div className="overflow-x-auto">
                  <table className="w-full text-[11px] border-collapse">
                    <thead><tr className="bg-slate-100 border-b border-slate-300">
                      <th className="px-2 py-2 font-bold text-slate-700 border-r border-slate-300 w-[45px]">구분</th>
                      <th className="px-2 py-2 font-bold text-slate-700 border-r border-slate-300 text-left">계정과목</th>
                      <th className="px-2 py-2 font-bold text-slate-700 text-right border-r border-slate-300">상반기</th>
                      <th className="px-2 py-2 font-bold text-slate-700 text-right border-r border-slate-300">하반기</th>
                      <th className="px-2 py-2 font-bold text-slate-700 text-right">연단위</th>
                    </tr></thead>
                    <tbody>
                      {['세입','세출','요율'].map(group => (
                        ['입학준비금','현장학습비','차량운행비','부모부담행사비','아침.저녁급식비','기타시도특성화비','특별활동비'].map((item, i) => (
                          <tr key={`${group}-${item}`} className={`border-b ${i === 6 ? 'border-slate-300' : 'border-slate-100'}`}>
                            {i === 0 && <td rowSpan={7} className="px-2 py-1.5 text-center font-bold text-slate-700 border-r border-slate-300">{group}</td>}
                            <td className="px-2 py-1.5 border-r border-slate-300 text-left">기타 필요경비 &gt; {item}</td>
                            <td className="px-2 py-1.5 text-right border-r border-slate-300">{group === '요율' ? '0%' : '0'}</td>
                            <td className="px-2 py-1.5 text-right border-r border-slate-300">{group === '요율' ? '0%' : '0'}</td>
                            <td className="px-2 py-1.5 text-right">{group === '요율' ? '0%' : '0'}</td>
                          </tr>
                        ))
                      ))}
                    </tbody>
                  </table>
                  </div>
                </div>
              </>)}
            </div>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <label className="text-[12px]"><input type="radio" name="half" defaultChecked className="mr-1" />상반기</label>
            <label className="text-[12px]"><input type="radio" name="half" className="mr-1" />하반기(26년09월~27년02월)</label>
            <label className="text-[12px]"><input type="radio" name="half" className="mr-1" />연단위</label>
            <label className="text-[12px] ml-2"><input type="checkbox" className="mr-1" />삭제원아포함</label>
            <span className="font-bold text-slate-600">반선택</span>
            <select className="border border-slate-300 rounded px-2 py-1.5 text-[12px] min-w-[180px]"><option>선택</option></select>
            <span className="font-bold text-slate-600">원아상태</span>
            <select className="border border-slate-300 rounded px-2 py-1.5 text-[12px]"><option>전체</option><option>현원</option><option>퇴소</option></select>
            <input className="border border-slate-300 rounded px-2 py-1.5 text-[12px] w-32" placeholder="원아/보육반" />
            <button className="px-4 py-1.5 text-[11px] font-bold text-white bg-blue-600 rounded">조회</button>
            <div className="flex items-center gap-1 ml-auto">
              {[
                { icon: 'print', color: 'blue', label: '' },
                { icon: 'excel', color: 'green', label: '' },
                { icon: 'print', color: 'blue', label: '인천' },
                { icon: 'excel', color: 'green', label: '인천' },
                { icon: 'print', color: 'blue', label: '2' },
                { icon: 'excel', color: 'green', label: '2' },
              ].map((b, i) => (
                <button key={i} className="px-3 py-1.5 text-[10px] font-bold text-slate-600 bg-white border border-slate-300 rounded flex items-center gap-1 hover:bg-slate-50">
                  {b.icon === 'print' ? (
                    <svg className={`w-3.5 h-3.5 text-${b.color}-600`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5z" /></svg>
                  ) : (
                    <svg className={`w-3.5 h-3.5 text-${b.color}-600`} viewBox="0 0 24 24" fill="currentColor"><path d="M14.2 1H5.8C4.81 1 4 1.81 4 2.8v18.4c0 .99.81 1.8 1.8 1.8h12.4c.99 0 1.8-.81 1.8-1.8V6.8L14.2 1zM15.8 19.3l-2.1-3.5-2.1 3.5H9.8l3.2-5-2.9-4.7h1.8l2.1 3.3 2-3.3h1.8l-2.9 4.7 3.2 5h-2.3z" /></svg>
                  )}
                  {b.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        {/* 구간별 출력월 + 버튼 */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-[12px] font-bold text-slate-700">구간별 출력월</span>
          <select className="border border-slate-300 rounded px-2 py-1.5 text-[12px]"><option>2026-03</option></select>
          <span>~</span>
          <select className="border border-slate-300 rounded px-2 py-1.5 text-[12px]"><option>2026-03</option></select>
          <div className="relative group">
            <button className="px-3 py-1.5 text-[11px] font-bold text-amber-700 bg-amber-100 border border-amber-300 rounded">구간세팅</button>
            <span className="absolute bottom-full left-0 mb-1 px-3 py-2 text-[10px] text-white bg-slate-800 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              구간별 출력월 세팅 후 &quot;구간세팅&quot; 버튼 클릭 후 인쇄 또는 엑셀 버튼클릭하세요
              <span className="absolute top-full left-4 border-4 border-transparent border-t-slate-800"></span>
            </span>
          </div>
          <div className="relative">
            <button onClick={() => { setShowRateSection(v => !v); setShowRateSummary(false) }} className={`px-3 py-1.5 text-[11px] font-bold rounded border transition-colors ${showRateSection ? 'text-teal-700 bg-teal-50 border-teal-400' : 'text-slate-500 bg-white border-slate-300 hover:bg-slate-50'}`}>요율</button>
            {showRateSection && (<>
              <div className="fixed inset-0 z-10" onClick={() => setShowRateSection(false)} />
              <div className="absolute top-full left-0 mt-2 bg-white border-2 border-slate-300 rounded-lg shadow-2xl z-20 w-[500px] overflow-hidden">
                <div className="px-3 py-2 bg-slate-700 text-white text-[12px] font-bold flex items-center justify-between">구간별 요율 <span className="text-slate-300 font-normal">2026-03 ~ 2026-03</span> <button onClick={() => setShowRateSection(false)} className="text-slate-300 hover:text-white text-lg leading-none">&times;</button></div>
                <table className="w-full text-[11px] border-collapse">
                  <thead><tr className="bg-slate-100 border-b border-slate-300">
                    <th className="px-2 py-1.5 font-bold text-slate-700 border-r border-slate-300 w-[45px]">구분</th>
                    <th className="px-2 py-1.5 font-bold text-slate-700 border-r border-slate-300">계정과목</th>
                    <th className="px-2 py-1.5 font-bold text-slate-700 text-right border-r border-slate-300">구간</th>
                  </tr></thead>
                  <tbody>
                    <tr className="border-b border-slate-200"><td rowSpan={2} className="px-2 py-1.5 text-center font-bold border-r border-slate-300">세입</td><td className="px-2 py-1.5 border-r border-slate-300">기타 필요경비</td><td className="px-2 py-1.5 text-right">490,000</td></tr>
                    <tr className="border-b border-slate-300"><td className="px-2 py-1.5 border-r border-slate-300">특별활동비</td><td className="px-2 py-1.5 text-right">0</td></tr>
                    <tr className="border-b border-slate-200"><td rowSpan={2} className="px-2 py-1.5 text-center font-bold border-r border-slate-300">세출</td><td className="px-2 py-1.5 border-r border-slate-300">기타 필요경비</td><td className="px-2 py-1.5 text-right">2,380,000</td></tr>
                    <tr className="border-b border-slate-300"><td className="px-2 py-1.5 border-r border-slate-300">특별활동비</td><td className="px-2 py-1.5 text-right">1,160,000</td></tr>
                    <tr className="border-b border-slate-200"><td rowSpan={2} className="px-2 py-1.5 text-center font-bold border-r border-slate-300">요율</td><td className="px-2 py-1.5 border-r border-slate-300">기타 필요경비</td><td className="px-2 py-1.5 text-right">485.71%</td></tr>
                    <tr><td className="px-2 py-1.5 border-r border-slate-300">특별활동비</td><td className="px-2 py-1.5 text-right">0%</td></tr>
                  </tbody>
                </table>
              </div>
            </>)}
          </div>
          <div className="flex items-center gap-1 ml-auto">
          {[
            { icon: 'print', color: 'blue', label: '인천' },
            { icon: 'excel', color: 'green', label: '인천' },
            { icon: 'print', color: 'blue', label: '2' },
            { icon: 'excel', color: 'green', label: '2' },
          ].map((b, i) => (
            <button key={i} className="px-3 py-1.5 text-[10px] font-bold text-slate-600 bg-white border border-slate-300 rounded flex items-center gap-1 hover:bg-slate-50">
              {b.icon === 'print' ? (
                <svg className={`w-3.5 h-3.5 text-${b.color}-600`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5z" /></svg>
              ) : (
                <svg className={`w-3.5 h-3.5 text-${b.color}-600`} viewBox="0 0 24 24" fill="currentColor"><path d="M14.2 1H5.8C4.81 1 4 1.81 4 2.8v18.4c0 .99.81 1.8 1.8 1.8h12.4c.99 0 1.8-.81 1.8-1.8V6.8L14.2 1zM15.8 19.3l-2.1-3.5-2.1 3.5H9.8l3.2-5-2.9-4.7h1.8l2.1 3.3 2-3.3h1.8l-2.9 4.7 3.2 5h-2.3z" /></svg>
              )}
              {b.label}
            </button>
          ))}
          </div>
        </div>
        {/* 원아별 테이블 바로 시작 - 요율 요약은 팝업으로 이동 */}
        {false && <div className="bg-white rounded border border-slate-200 overflow-hidden">
          <table className="w-full text-[12px] border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200">
                <th className="px-3 py-2 font-bold text-slate-700 border-r border-slate-200 w-[80px]">구분</th>
                <th className="px-3 py-2 font-bold text-slate-700 border-r border-slate-200">계정과목</th>
                <th className="px-3 py-2 font-bold text-slate-700 text-right">2026-03 ~ 2026-08</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-100"><td rowSpan={2} className="px-3 py-2 text-center font-bold text-slate-700 border-r border-slate-200">세입</td><td className="px-3 py-2 border-r border-slate-200">기타 필요경비</td><td className="px-3 py-2 text-right">490,000</td></tr>
              <tr className="border-b border-slate-100"><td className="px-3 py-2 border-r border-slate-200">특별활동비</td><td className="px-3 py-2 text-right">0</td></tr>
              <tr className="border-b border-slate-100"><td rowSpan={2} className="px-3 py-2 text-center font-bold text-slate-700 border-r border-slate-200">세출</td><td className="px-3 py-2 border-r border-slate-200">기타 필요경비</td><td className="px-3 py-2 text-right">2,380,000</td></tr>
              <tr className="border-b border-slate-200"><td className="px-3 py-2 border-r border-slate-200">특별활동비</td><td className="px-3 py-2 text-right text-blue-600">1,160,000</td></tr>
              <tr className="bg-slate-100 border-b border-slate-200">
                <th className="px-3 py-2 font-bold text-slate-700 border-r border-slate-200">구분</th>
                <th className="px-3 py-2 font-bold text-slate-700 border-r border-slate-200">계정과목</th>
                <th className="px-3 py-2 font-bold text-slate-700 text-right">2026-03 ~ 2026-08</th>
              </tr>
              <tr className="border-b border-slate-100"><td rowSpan={2} className="px-3 py-2 text-center font-bold text-slate-700 border-r border-slate-200">요율</td><td className="px-3 py-2 border-r border-slate-200">기타 필요경비</td><td className="px-3 py-2 text-right">485.71 %</td></tr>
              <tr><td className="px-3 py-2 border-r border-slate-200">특별활동비</td><td className="px-3 py-2 text-right">0 %</td></tr>
            </tbody>
          </table>
        </div>}
        {/* 원아별 테이블 */}
        {(() => {
          const semokCols = ['입학<br/>준비금','현장<br/>학습비','차량<br/>운행비','부모부담<br/>행사비','아침.저녁<br/>급식비','기타시도<br/>특성화비','특별활<br/>동비']
          const mokCols = ['합계','기타필요<br/>경비','특별활<br/>동비']
          const cols = viewLevel === 'semok' ? semokCols : mokCols
          const colCount = cols.length
          const sampleRows = [
            { name: 'ANARKHANGAI', birth: '2023-08-30', nursery: '2025풀일반연령혼합반(1.2세)', className: '2025풀일반연령혼합반(1.2세)', enter: '2025-03-10', status: '현원' },
            { name: 'BAT YERUULT ANAND', birth: '2020-09-03', nursery: '예쁜들꽃2세아반', className: '예쁜들꽃2세아반', enter: '2022-07-11', status: '현원' },
            { name: '강나윤', birth: '2019-11-17', nursery: '예쁜들꽃2세아반', className: '예쁜들꽃2세아반', enter: '2021-10-05', status: '현원' },
            { name: '경한울', birth: '2022-10-01', nursery: '2025향기2세아반', className: '2025향기2세아반', enter: '2025-10-20', status: '현원' },
            { name: '고나경', birth: '2020-07-13', nursery: '파란하늘반3세아반', className: '파란하늘반3세아반', enter: '2022-11-09', status: '현원' },
            { name: '권서현', birth: '2022-07-06', nursery: '2025향기2세아반', className: '2025향기2세아반', enter: '2025-03-01', status: '현원' },
          ]
          return (
        <div className="bg-white rounded border border-slate-200 overflow-auto max-h-[calc(100vh-280px)]">
          <table className={`w-full text-[10px] border-collapse ${viewLevel === 'semok' ? 'min-w-[2200px]' : 'min-w-[1400px]'}`}>
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-100 border-b border-slate-200">
                <th rowSpan={2} className="px-1 py-2 border-r border-slate-200 w-[25px]"><input type="checkbox" /></th>
                <th rowSpan={2} className="px-2 py-2 font-bold text-slate-700 border-r border-slate-200">원아명</th>
                <th rowSpan={2} className="px-2 py-2 font-bold text-slate-700 border-r border-slate-200">생년월일</th>
                <th rowSpan={2} className="px-2 py-2 font-bold text-slate-700 border-r border-slate-200">소속반</th>
                <th rowSpan={2} className="px-2 py-2 font-bold text-slate-700 border-r border-slate-200">입소일</th>
                <th rowSpan={2} className="px-2 py-2 font-bold text-slate-700 border-r border-slate-200">퇴소일</th>
                <th rowSpan={2} className="px-2 py-2 font-bold text-slate-700 border-r border-slate-200">상태</th>
                <th colSpan={colCount} className="px-2 py-1 font-bold text-slate-700 border-r border-slate-200 border-b border-slate-200">필요경비수입</th>
                <th colSpan={colCount} className="px-2 py-1 font-bold text-slate-700 border-r border-slate-200 border-b border-slate-200">필요경비지출</th>
                <th colSpan={colCount} className="px-2 py-1 font-bold text-slate-700 border-r border-slate-200 border-b border-slate-200">차이액</th>
                <th rowSpan={2} className="px-2 py-2 font-bold text-slate-700 text-[9px]">관리운영비<br/>사용가능금액</th>
                {viewLevel === 'semok' && <th rowSpan={2} className="px-2 py-2 font-bold text-slate-700 text-[9px]">기타필요경비<br/>(14%)</th>}
              </tr>
              <tr className="bg-slate-100 border-b border-slate-200">
                {[0,1,2].map(g => cols.map((c, i) => (
                  <th key={`${g}-${i}`} className="px-1 py-1 font-bold text-slate-700 border-r border-slate-200 text-[9px]" dangerouslySetInnerHTML={{__html: c}} />
                )))}
              </tr>
            </thead>
            <tbody>
              {sampleRows.map(r => (
                <tr key={r.name} className="border-b border-slate-100 hover:bg-blue-50/20">
                  <td className="px-1 py-1.5 text-center border-r border-slate-100"><input type="checkbox" /></td>
                  <td className="px-2 py-1.5 border-r border-slate-100 whitespace-nowrap">{r.name}</td>
                  <td className="px-2 py-1.5 text-center border-r border-slate-100">{r.birth}</td>
                  <td className="px-2 py-1.5 border-r border-slate-100 text-[9px]">{r.className}</td>
                  <td className="px-2 py-1.5 text-center border-r border-slate-100">{r.enter}</td>
                  <td className="px-2 py-1.5 text-center border-r border-slate-100">-</td>
                  <td className="px-2 py-1.5 text-center border-r border-slate-100"><span className="font-bold text-blue-600">{r.status}</span></td>
                  {Array(colCount * 3).fill(0).map((_, i) => (
                    <td key={i} className="px-2 py-1.5 text-right border-r border-slate-100">0</td>
                  ))}
                  <td className="px-2 py-1.5 text-right border-r border-slate-100">0</td>
                  {viewLevel === 'semok' && <td className="px-2 py-1.5 text-right">0</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
          )
        })()}
      </>)}

      {/* 법정아동필요경비정산 */}
      {subTab === '법정아동필요경비정산' && (<>
        <div className="bg-white rounded border border-slate-200 px-4 py-3 text-[12px]">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-bold text-slate-700">계정</span>
            <select className="border border-slate-300 rounded px-2 py-1.5 text-[12px] min-w-[220px]">
              <option>::전체::</option>
              <option disabled className="font-bold">── 수입계정 ──</option>
              <option>수입: 특별활동비</option>
              <option>수입: 기타 필요경비</option>
              <option>수입: [세목] 입학준비금</option>
              <option>수입: [세목] 현장학습비</option>
              <option>수입: [세목] 차량운행비</option>
              <option>수입: [세목] 부모부담행사비</option>
              <option>수입: [세목] 아침.저녁급식비</option>
              <option>수입: [세목] 기타시도특성화비</option>
              <option>수입: [세목]법정아동필요경비</option>
              <option disabled className="font-bold">── 지출계정 ──</option>
              <option>지출전체</option>
              <option>지출: 특별활동비지출</option>
              <option>지출: 기타 필요경비 지출</option>
              <option>지출: [세목] 입학준비금</option>
              <option>지출: [세목] 현장학습비</option>
              <option>지출: [세목] 차량운행비</option>
              <option>지출: [세목] 부모부담행사비</option>
              <option>지출: [세목] 아침.저녁급식비</option>
              <option>지출: [세목] 기타시도특성화비</option>
            </select>
            <span className="font-bold text-slate-600">기간</span>
            <input type="date" defaultValue="2026-03-01" className="border border-slate-300 rounded px-2 py-1.5 text-[12px]" />
            <span>~</span>
            <input type="date" defaultValue="2026-03-24" className="border border-slate-300 rounded px-2 py-1.5 text-[12px]" />
            <button className="px-3 py-1.5 text-[11px] font-bold text-amber-700 bg-amber-100 border border-amber-300 rounded">과년도</button>
            <span className="font-bold text-slate-600">적요</span>
            <input className="border border-slate-300 rounded px-2 py-1.5 text-[12px] w-32" />
            <button className="px-4 py-1.5 text-[11px] font-bold text-white bg-blue-600 rounded">조회</button>
            <span className="font-bold text-slate-600">원아별 매칭</span>
            {selectedLawChild && <span className="text-[11px] text-teal-700 font-bold">{selectedLawChild}</span>}
            <div className="relative">
              <button onClick={() => setShowLawChild(v => !v)} className="px-2 py-1.5 text-[11px] border border-slate-300 rounded hover:bg-slate-50">
                <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </button>
              {showLawChild && (<>
                <div className="fixed inset-0 z-10" onClick={() => setShowLawChild(false)} />
                <div className="absolute top-full left-0 mt-1 bg-white border-2 border-slate-300 rounded-lg shadow-2xl z-20 w-[700px] max-h-[500px] overflow-hidden">
                  <div className="px-3 py-2 bg-slate-700 text-white text-[12px] font-bold flex items-center justify-between">
                    원아 선택
                    <button onClick={() => setShowLawChild(false)} className="text-slate-300 hover:text-white text-lg">&times;</button>
                  </div>
                  <div className="px-3 py-2 flex items-center gap-2 border-b border-slate-200 text-[11px]">
                    <span className="font-bold">반선택</span>
                    <select className="border border-slate-300 rounded px-2 py-1 text-[11px]"><option>선택</option></select>
                    <label><input type="checkbox" className="mr-0.5" />법정지원아동만 노출</label>
                    <span className="font-bold ml-2">원아명</span>
                    <input className="border border-slate-300 rounded px-2 py-1 text-[11px] w-24" />
                    <button className="px-2 py-1 text-[10px] font-bold text-white bg-blue-600 rounded">검색</button>
                  </div>
                  <div className="overflow-y-auto max-h-[380px]">
                    <table className="w-full text-[11px] border-collapse">
                      <thead className="sticky top-0"><tr className="bg-slate-100 border-b border-slate-200">
                        <th className="px-2 py-1.5 font-bold text-slate-700 border-r border-slate-200">이름</th>
                        <th className="px-2 py-1.5 font-bold text-slate-700 border-r border-slate-200">반</th>
                        <th className="px-2 py-1.5 font-bold text-slate-700 border-r border-slate-200">생년월일</th>
                        <th className="px-2 py-1.5 font-bold text-slate-700 border-r border-slate-200">입소일</th>
                        <th className="px-2 py-1.5 font-bold text-slate-700 border-r border-slate-200">퇴소일</th>
                        <th className="px-2 py-1.5 font-bold text-slate-700">선택</th>
                      </tr></thead>
                      <tbody>
                        {childList.map(c => {
                          const birth = c.name === '곽이안' ? '2023-10-28' : c.name === '김다솜' ? '2022-11-10' : c.name === '김도하' ? '2022-11-15' : c.name === '김준민' ? '2023-09-03' : c.name === '민이랑' ? '2024-01-03' : c.name === '정해인' ? '2023-04-08' : '2022-10-18'
                          return (
                            <tr key={c.name} className="border-b border-slate-100 hover:bg-blue-50/30">
                              <td className="px-2 py-1.5 border-r border-slate-100">{c.name}</td>
                              <td className="px-2 py-1.5 border-r border-slate-100 text-[10px]">{c.className}</td>
                              <td className="px-2 py-1.5 text-center border-r border-slate-100">{birth}</td>
                              <td className="px-2 py-1.5 text-center border-r border-slate-100">-</td>
                              <td className="px-2 py-1.5 text-center border-r border-slate-100">-</td>
                              <td className="px-2 py-1.5 text-center"><button onClick={() => { setSelectedLawChild(c.name); setShowLawChild(false) }} className="text-[10px] font-bold text-white bg-blue-500 px-2 py-0.5 rounded">선택</button></td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>)}
            </div>
            <button className="px-3 py-1.5 text-[11px] font-bold text-white bg-amber-500 rounded">매칭하기</button>
            <button className="px-3 py-1.5 text-[11px] font-bold text-slate-600 bg-slate-100 border border-slate-300 rounded">원아지우기</button>
            <button className="px-3 py-1.5 text-[11px] font-bold text-slate-600 bg-slate-100 border border-slate-300 rounded">매칭초기화</button>
          </div>
        </div>
        <div className="bg-white rounded border border-slate-200 overflow-x-auto">
          <table className="w-full text-[11px] border-collapse min-w-[1200px]">
            <thead><tr className="bg-slate-100 border-b border-slate-200">
              <th className="px-1 py-2 border-r border-slate-200 w-[25px]"><input type="checkbox" /></th>
              <th className="px-2 py-2 font-bold text-slate-700 border-r border-slate-200">번호</th>
              <th className="px-2 py-2 font-bold text-slate-700 border-r border-slate-200">일자</th>
              <th className="px-2 py-2 font-bold text-slate-700 border-r border-slate-200">적요</th>
              <th className="px-2 py-2 font-bold text-slate-700 border-r border-slate-200">수입액</th>
              <th className="px-2 py-2 font-bold text-slate-700 border-r border-slate-200">지출액</th>
              <th className="px-2 py-2 font-bold text-slate-700 border-r border-slate-200">코드</th>
              <th className="px-2 py-2 font-bold text-slate-700 border-r border-slate-200">계정과목</th>
              <th className="px-2 py-2 font-bold text-slate-700 border-r border-slate-200">거래처</th>
              <th className="px-2 py-2 font-bold text-slate-700">매칭</th>
            </tr></thead>
            <tbody>
              {mockData.map(row => (
                <tr key={row.id} className="border-b border-slate-100 hover:bg-blue-50/20">
                  <td className="px-1 py-1.5 text-center border-r border-slate-100"><input type="checkbox" /></td>
                  <td className="px-2 py-1.5 text-center border-r border-slate-100">{row.docNo}</td>
                  <td className="px-2 py-1.5 text-center border-r border-slate-100">{row.date}</td>
                  <td className="px-2 py-1.5 border-r border-slate-100">{row.summary}</td>
                  <td className={`px-2 py-1.5 text-right border-r border-slate-100 ${row.income > 0 ? 'text-blue-700' : 'text-slate-300'}`}>{fmt(row.income)}</td>
                  <td className={`px-2 py-1.5 text-right border-r border-slate-100 ${row.expense > 0 ? 'text-red-600' : 'text-slate-300'}`}>{fmt(row.expense)}</td>
                  <td className="px-2 py-1.5 text-center border-r border-slate-100">{row.code}</td>
                  <td className="px-2 py-1.5 border-r border-slate-100 text-blue-600">{row.account}</td>
                  <td className="px-2 py-1.5 border-r border-slate-100">{row.counterpart}</td>
                  <td className="px-2 py-1.5 text-center">
                    {matchResult[row.id] ? (
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-teal-700 font-bold">{matchResult[row.id].length === 1 ? matchResult[row.id][0] : `${matchResult[row.id][0]} 외 ${matchResult[row.id].length - 1}명`}</span>
                        <button onClick={() => { setMatchRow(row); setMatchChecked(new Set(matchResult[row.id])); setMatchMode('simple'); setSplitOverride(null) }} className="text-[10px] text-slate-400 hover:text-slate-600">✎</button>
                      </div>
                    ) : (
                      <button onClick={() => { setMatchRow(row); setMatchChecked(new Set()); setMatchMode('simple'); setSplitOverride(null) }} className="text-[10px] font-bold text-slate-500 px-1.5 py-0.5 border border-slate-300 bg-slate-50 rounded">매칭</button>
                    )}
                  </td>
                </tr>
              ))}
              <tr className="bg-slate-50 font-bold border-t border-slate-300">
                <td colSpan={4} className="px-2 py-2 text-center border-r border-slate-200">합계</td>
                <td className="px-2 py-2 text-right border-r border-slate-200 text-blue-700">{fmt(mockData.reduce((s,r) => s+r.income, 0))}</td>
                <td className="px-2 py-2 text-right border-r border-slate-200 text-red-600">{fmt(mockData.reduce((s,r) => s+r.expense, 0))}</td>
                <td colSpan={5}></td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-slate-500">총 {mockData.length}개의 전표가 있습니다. 적요색상 : <span className="text-blue-600">건별등록</span>, <span className="text-amber-600">일괄등록</span>, <span className="text-green-600">엑셀등록</span>, 은행등록, <span className="text-red-500">분리전표</span></p>
      </>)}

      {/* 필요경비정산서정리 */}
      {subTab === '필요경비정산서정리' && (<>
        <div className="bg-yellow-50 border border-yellow-300 rounded px-4 py-2 text-[11px] text-yellow-800 space-y-1">
          <p>* 삭제된 전표와 연계된 필요경비/특별활동비 정산서와 연계된 전표만 정리합니다. 해당 일자를 검색하시면 , 자동으로 삭제합니다.</p>
          <p>* 삭제는 각각의 페이지를 이동하셔야합니다.</p>
        </div>
        <div className="bg-white rounded border border-slate-200 px-4 py-3 text-[12px]">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-bold text-slate-700">계정</span>
            <select className="border border-slate-300 rounded px-2 py-1.5 text-[12px] min-w-[150px]"><option>::전체::</option></select>
            <span className="font-bold text-slate-600">기간</span>
            <input type="date" defaultValue="2026-03-01" className="border border-slate-300 rounded px-2 py-1.5 text-[12px]" />
            <span>~</span>
            <input type="date" defaultValue="2026-03-24" className="border border-slate-300 rounded px-2 py-1.5 text-[12px]" />
            <span className="font-bold text-slate-600">원아명</span>
            <input className="border border-slate-300 rounded px-2 py-1.5 text-[12px] w-28" />
            <button className="px-4 py-1.5 text-[11px] font-bold text-white bg-blue-600 rounded">조회</button>
            <button className="px-4 py-1.5 text-[11px] font-bold text-slate-600 bg-slate-200 border border-slate-300 rounded">매칭삭제하기</button>
          </div>
        </div>
        <div className="bg-white rounded border border-slate-200 overflow-x-auto">
          <table className="w-full text-[11px] border-collapse">
            <thead><tr className="bg-slate-100 border-b border-slate-200">
              <th className="px-1 py-2 border-r border-slate-200 w-[25px]"><input type="checkbox" /></th>
              <th className="px-2 py-2 font-bold text-slate-700 border-r border-slate-200">번호</th>
              <th className="px-2 py-2 font-bold text-slate-700 border-r border-slate-200">매칭원아</th>
              <th className="px-2 py-2 font-bold text-slate-700 border-r border-slate-200">일자</th>
              <th className="px-2 py-2 font-bold text-slate-700 border-r border-slate-200">적요</th>
              <th className="px-2 py-2 font-bold text-slate-700 border-r border-slate-200">수입액</th>
              <th className="px-2 py-2 font-bold text-slate-700 border-r border-slate-200">지출액</th>
              <th className="px-2 py-2 font-bold text-slate-700 border-r border-slate-200">코드</th>
              <th className="px-2 py-2 font-bold text-slate-700 border-r border-slate-200">계정과목</th>
              <th className="px-2 py-2 font-bold text-slate-700">거래처</th>
            </tr></thead>
            <tbody>
              <tr className="bg-slate-50 font-bold border-t border-slate-300">
                <td colSpan={5} className="px-2 py-2 text-center border-r border-slate-200">합계</td>
                <td className="px-2 py-2 text-right border-r border-slate-200">0</td>
                <td className="px-2 py-2 text-right border-r border-slate-200">0</td>
                <td colSpan={3} className="px-2 py-2 text-right">삭제매칭: <strong>0건</strong></td>
              </tr>
            </tbody>
          </table>
        </div>
        <button className="px-4 py-2 text-[11px] font-bold text-slate-600 bg-slate-200 border border-slate-300 rounded">매칭삭제하기</button>
        <p className="text-[11px] text-slate-500">총 0개의 전표가 있습니다. 적요색상 : <span className="text-blue-600">건별등록</span>, <span className="text-amber-600">일괄등록</span>, <span className="text-green-600">엑셀등록</span>, 은행등록, <span className="text-red-500">분리전표</span></p>
      </>)}

      {/* 인천시원아별지원내역관리 */}
      {subTab === '인천시원아별지원내역관리' && (<>
        {/* 엑셀 업로드 */}
        <div className="bg-white rounded border border-slate-200 px-4 py-3 text-[12px] space-y-2">
          <div className="bg-slate-100 px-3 py-2 rounded font-bold text-[13px] text-slate-700 text-center">엑셀 파일 업로드</div>
          <div className="text-[11px] text-slate-500">
            <p><span className="font-bold">양식 예)</span> 순서 : No, 사업자격명, 이름, 거주지역, 주민등록지, 구분, 지원일수(*), 단가(*), 금액(*), 사유, 비고, 대상월, 입소(임용)일, 퇴소(면직)일, 반, 생년월일</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">엑셀 파일</span>
            <label className="px-3 py-1 text-[11px] font-bold text-slate-600 bg-slate-100 border border-slate-300 rounded cursor-pointer hover:bg-slate-200">파일 선택<input type="file" className="hidden" /></label>
            <span className="text-[11px] text-slate-400">선택된 파일 없음</span>
          </div>
          <p className="text-[10px] text-red-500">* 엑셀파일이 제대로 등록되지 않을경우 엑셀파일을 여신 후 다른이름으로 저장 &gt; 저장 대화창에서 &quot;파일형식(T)&quot; 에서 &quot; Excel 97 - 2003 통합문서 (*.xls)&quot; 를 선택하신 후 저장하셔서 등록하세요.</p>
          <div className="flex justify-center gap-3">
            <button className="px-8 py-2 text-[12px] font-bold text-white bg-blue-600 rounded">등록</button>
            <button className="px-8 py-2 text-[12px] font-bold text-slate-600 bg-slate-200 border border-slate-300 rounded">취소</button>
          </div>
        </div>
        {/* 집행률 */}
        <div className="bg-white rounded border border-slate-200 px-4 py-3">
          <div className="text-center font-bold text-[13px] text-slate-700 mb-2">집행율</div>
          <div className="flex items-center justify-center gap-4 flex-wrap text-[12px]">
            {['특별활동비','입학준비금','현장학습비','부모부담행사비','시도특성화비','차량운행비'].map(item => (
              <div key={item} className="flex items-center gap-1">
                <span className="text-slate-600">{item}</span>
                <input defaultValue="100" className="border border-amber-300 rounded px-2 py-1 text-[12px] text-right w-[50px]" />
                <span className="text-slate-500">%</span>
              </div>
            ))}
            <button className="px-4 py-1.5 text-[11px] font-bold text-white bg-blue-600 rounded">저장</button>
          </div>
          <p className="text-[10px] text-red-500 mt-1 text-center">* 24년 정산서에만 적용됩니다.</p>
        </div>
        {/* 검색 + 버튼 */}
        <div className="flex items-center gap-3 flex-wrap">
          <input type="date" defaultValue="2026-03-01" className="border border-slate-300 rounded px-2 py-1.5 text-[12px]" />
          <span>~</span>
          <input type="date" defaultValue="2026-03-24" className="border border-slate-300 rounded px-2 py-1.5 text-[12px]" />
          <input className="border border-slate-300 rounded px-2 py-1.5 text-[12px] w-20" placeholder="금액" />
          <input className="border border-slate-300 rounded px-2 py-1.5 text-[12px] w-28" placeholder="이름" />
          <button className="px-4 py-1.5 text-[11px] font-bold text-white bg-teal-600 rounded">검색</button>
          <button className="px-4 py-1.5 text-[11px] font-bold text-slate-600 bg-slate-200 border border-slate-300 rounded">삭제</button>
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          <button className="px-3 py-1.5 text-[10px] font-bold text-white bg-blue-600 rounded">법정아동 필요경비정산서</button>
          <button className="px-3 py-1.5 text-[10px] font-bold text-white bg-teal-600 rounded">만5세 필요경비정산서</button>
          <button className="px-3 py-1.5 text-[10px] font-bold text-white bg-amber-600 rounded">24년 법정아동 필요경비정산서</button>
          <button className="px-3 py-1.5 text-[10px] font-bold text-white bg-amber-500 rounded">24년 만5세 필요경비정산서</button>
          <button className="px-3 py-1.5 text-[10px] font-bold text-white bg-purple-600 rounded">24년 외국인아동 필요경비정산서</button>
        </div>
        {/* 테이블 */}
        <div className="bg-white rounded border border-slate-200 overflow-x-auto">
          <table className="w-full text-[10px] border-collapse min-w-[1600px]">
            <thead><tr className="bg-slate-100 border-b border-slate-200">
              <th className="px-2 py-2 font-bold text-slate-700 border-r border-slate-200 w-[35px]">No</th>
              <th className="px-2 py-2 font-bold text-slate-700 border-r border-slate-200">사업자격명</th>
              <th className="px-2 py-2 font-bold text-slate-700 border-r border-slate-200">이름</th>
              <th className="px-2 py-2 font-bold text-slate-700 border-r border-slate-200">거주지역</th>
              <th className="px-2 py-2 font-bold text-slate-700 border-r border-slate-200">주민등록지</th>
              <th className="px-2 py-2 font-bold text-slate-700 border-r border-slate-200">구분</th>
              <th className="px-2 py-2 font-bold text-slate-700 border-r border-slate-200">지원일수</th>
              <th className="px-2 py-2 font-bold text-slate-700 border-r border-slate-200">단가</th>
              <th className="px-2 py-2 font-bold text-slate-700 border-r border-slate-200">금액</th>
              <th className="px-2 py-2 font-bold text-slate-700 border-r border-slate-200">사유</th>
              <th className="px-2 py-2 font-bold text-slate-700 border-r border-slate-200">비고</th>
              <th className="px-2 py-2 font-bold text-slate-700 border-r border-slate-200">대상월</th>
              <th className="px-2 py-2 font-bold text-slate-700 border-r border-slate-200">입소(임용)일</th>
              <th className="px-2 py-2 font-bold text-slate-700 border-r border-slate-200">퇴소(면직)일</th>
              <th className="px-2 py-2 font-bold text-slate-700 border-r border-slate-200">반</th>
              <th className="px-2 py-2 font-bold text-slate-700">생년월일</th>
            </tr></thead>
            <tbody>
              {[
                { no: 764, cert: '기관보육료지원어린이집 특별활동비', name: '강나윤', area: '인천광역시 계양구', reg: '인천광역시 계양구', type: '누리(만3~5세) 5세', days: 1, price: 68000, amount: 68000, month: '2025-08', enter: '2021-10-05', cls: '2025푸른바다(5세아 반)', birth: '2019-11-17' },
                { no: 763, cert: '부모부담행사비', name: '강나윤', area: '인천광역시 계양구', reg: '인천광역시 계양구', type: '누리(만3~5세) 5세', days: 1, price: 15000, amount: 15000, month: '2025-08', enter: '2021-10-05', cls: '2025푸른바다(5세아 반)', birth: '2019-11-17' },
                { no: 762, cert: '시도특성화비용', name: '강나윤', area: '인천광역시 계양구', reg: '인천광역시 계양구', type: '누리(만3~5세) 5세', days: 1, price: 40000, amount: 40000, month: '2025-08', enter: '2021-10-05', cls: '2025푸른바다(5세아 반)', birth: '2019-11-17' },
                { no: 761, cert: '차량운행비', name: '강나윤', area: '인천광역시 계양구', reg: '인천광역시 계양구', type: '누리(만3~5세) 5세', days: 1, price: 33000, amount: 33000, month: '2025-08', enter: '2021-10-05', cls: '2025푸른바다(5세아 반)', birth: '2019-11-17' },
                { no: 760, cert: '현장학습비', name: '강나윤', area: '인천광역시 계양구', reg: '인천광역시 계양구', type: '누리(만3~5세) 5세', days: 1, price: 38000, amount: 38000, month: '2025-08', enter: '2021-10-05', cls: '2025푸른바다(5세아 반)', birth: '2019-11-17' },
              ].map(r => (
                <tr key={r.no} className="border-b border-slate-100 hover:bg-blue-50/20">
                  <td className="px-2 py-1.5 text-center border-r border-slate-100">{r.no}</td>
                  <td className="px-2 py-1.5 border-r border-slate-100">{r.cert}</td>
                  <td className="px-2 py-1.5 text-center border-r border-slate-100">{r.name}</td>
                  <td className="px-2 py-1.5 border-r border-slate-100">{r.area}</td>
                  <td className="px-2 py-1.5 border-r border-slate-100">{r.reg}</td>
                  <td className="px-2 py-1.5 border-r border-slate-100">{r.type}</td>
                  <td className="px-2 py-1.5 text-center border-r border-slate-100">{r.days}</td>
                  <td className="px-2 py-1.5 text-right border-r border-slate-100">{fmt(r.price)}</td>
                  <td className="px-2 py-1.5 text-right border-r border-slate-100">{fmt(r.amount)}</td>
                  <td className="px-2 py-1.5 border-r border-slate-100"></td>
                  <td className="px-2 py-1.5 border-r border-slate-100"></td>
                  <td className="px-2 py-1.5 text-center border-r border-slate-100">{r.month}</td>
                  <td className="px-2 py-1.5 text-center border-r border-slate-100">{r.enter}</td>
                  <td className="px-2 py-1.5 text-center border-r border-slate-100"></td>
                  <td className="px-2 py-1.5 border-r border-slate-100 text-[9px]">{r.cls}</td>
                  <td className="px-2 py-1.5 text-center">{r.birth}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>)}

      {subTab === '개인별 필요경비정산' && <>
      {/* 검색 */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-bold text-slate-600">계정</span>
        <select value={filterAccount} onChange={e => setFilterAccount(e.target.value)} className="border border-slate-300 rounded px-2 py-1.5 text-xs min-w-[200px]">
          <option>::전체::</option>
          <option disabled className="font-bold">──────────</option>
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
          <option disabled className="font-bold text-slate-400">수입: 그 밖의 지원금</option>
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
          <option>수입: [세목] 법정아동필요경비</option>
          <option>수입: [세목] 특별활동비</option>
          <option>수입: [세목] 입학준비금</option>
          <option>수입: [세목] 현장학습비</option>
          <option>수입: [세목] 차량운행비</option>
          <option>수입: [세목] 부모부담행사비</option>
          <option>수입: [세목] 조석식비</option>
          <option>수입: [세목] 특성화비</option>
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
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="border border-teal-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-blue-400" />
        <span className="text-xs text-slate-400">~</span>
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="border border-teal-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-blue-400" />
        <input type="text" value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="적요" className="border border-slate-300 rounded px-2 py-1.5 text-xs w-28 placeholder:text-slate-300 focus:outline-none focus:border-blue-400" />
        <button className="px-4 py-1.5 text-xs font-bold text-white bg-teal-500 hover:bg-teal-600 rounded transition-colors">조회</button>
        <span className="text-xs font-bold text-slate-600">원아별 매칭</span>
        <div className="w-px h-5 bg-slate-200" />
        <button className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors">매칭하기</button>
        <button className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded transition-colors">원아지우기</button>
        <button className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded transition-colors">매칭초기화</button>
        <div className="w-px h-5 bg-slate-200" />
        <button className="w-8 h-8 flex items-center justify-center bg-white hover:bg-slate-50 border border-slate-300 rounded transition-colors" title="인쇄하기">
          <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5z" /></svg>
        </button>
        <button className="w-8 h-8 flex items-center justify-center bg-white hover:bg-green-50 border border-green-400 rounded transition-colors" title="엑셀저장">
          <svg className="w-4 h-4 text-green-600" viewBox="0 0 24 24" fill="currentColor"><path d="M14.2 1H5.8C4.81 1 4 1.81 4 2.8v18.4c0 .99.81 1.8 1.8 1.8h12.4c.99 0 1.8-.81 1.8-1.8V6.8L14.2 1zM15.8 19.3l-2.1-3.5-2.1 3.5H9.8l3.2-5-2.9-4.7h1.8l2.1 3.3 2-3.3h1.8l-2.9 4.7 3.2 5h-2.3z" /></svg>
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
              <th className={`${TH} border-r-0`}>매칭</th>
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
                <td className={`${TD} border-r-0`}>
                  {matchResult[row.id] ? (
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-teal-700 font-bold">
                        {matchResult[row.id].length === 1 ? matchResult[row.id][0] : `${matchResult[row.id][0]} 외 ${matchResult[row.id].length - 1}명`}
                      </span>
                      <button onClick={() => { setMatchRow(row); setMatchChecked(new Set(matchResult[row.id])); setMatchMode('simple'); setSplitOverride(null) }} className="text-[10px] text-slate-400 hover:text-slate-600" title="수정">✎</button>
                    </div>
                  ) : (
                    <>
                      <button onClick={() => { setMatchRow(row); setMatchChecked(new Set()); setMatchMode('simple') }} className="text-[10px] font-bold text-slate-500 hover:text-slate-700 px-1.5 py-0.5 border border-slate-300 bg-slate-50 hover:bg-slate-100 rounded transition-colors">매칭</button>
                      {row.expense > 0 && <button onClick={() => {
                    setMatchRow(row)
                    setMatchChecked(new Set(childList.map(c => c.name)))
                    setSplitMode('equal')
                    setSplitOverride(null)
                    setMatchMode('simple')
                  }} className="text-[10px] font-bold text-white px-1.5 py-0.5 bg-blue-500 hover:bg-blue-600 rounded transition-colors ml-0.5">일괄</button>}
                    </>
                  )}
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
      </>}
    </div>
  )
}
