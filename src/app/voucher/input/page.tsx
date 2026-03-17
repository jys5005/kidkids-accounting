'use client'

import React, { useState, useRef, useCallback } from 'react'

interface VoucherRow {
  id: number
  date: string
  type: '수입' | '지출'
  account: string
  subAccount: string
  summary: string
  amount: number
  counterpart: string
  note: string
  approved: boolean
}

const sampleData: VoucherRow[] = [
  { id: 1, date: '2026-03-03', type: '수입', account: '보육료', subAccount: '정부지원 보육료', summary: '3월 정부지원 보육료 입금', amount: 15524000, counterpart: '사회보장정보원', note: '', approved: true },
  { id: 2, date: '2026-03-03', type: '수입', account: '보조금', subAccount: '인건비 보조금', summary: '3월 인건비 보조금 입금', amount: 8594960, counterpart: '구청', note: '', approved: true },
  { id: 3, date: '2026-03-05', type: '지출', account: '인건비', subAccount: '기본급', summary: '3월 교직원 기본급 지급', amount: 4404593, counterpart: '교직원', note: '급여이체', approved: true },
  { id: 4, date: '2026-03-05', type: '지출', account: '인건비', subAccount: '제수당', summary: '3월 직책수당 지급', amount: 850000, counterpart: '교직원', note: '', approved: true },
  { id: 5, date: '2026-03-05', type: '지출', account: '4대보험', subAccount: '국민연금', summary: '3월 국민연금 사업주부담금', amount: 396450, counterpart: '국민연금공단', note: '', approved: false },
  { id: 6, date: '2026-03-05', type: '지출', account: '4대보험', subAccount: '건강보험', summary: '3월 건강보험 사업주부담금', amount: 310270, counterpart: '건강보험공단', note: '', approved: false },
  { id: 7, date: '2026-03-06', type: '지출', account: '운영비', subAccount: '급간식비', summary: '3월 급간식 식재료 구입', amount: 1850000, counterpart: '(주)푸드마트', note: '세금계산서', approved: true },
  { id: 8, date: '2026-03-06', type: '지출', account: '운영비', subAccount: '소모품비', summary: '사무용품 구입', amount: 125000, counterpart: '오피스디포', note: '카드결제', approved: false },
  { id: 9, date: '2026-03-07', type: '수입', account: '기타수입', subAccount: '이자수입', summary: '보통예금 이자', amount: 8320, counterpart: '국민은행', note: '', approved: true },
  { id: 10, date: '2026-03-07', type: '지출', account: '운영비', subAccount: '공공요금', summary: '2월 전기요금 납부', amount: 487600, counterpart: '한국전력', note: '자동이체', approved: true },
]

const accountOptions = ['보육료', '보조금', '인건비', '4대보험', '운영비', '기타수입', '전입금', '차입금']
const subAccountMap: Record<string, string[]> = {
  '보육료': ['정부지원 보육료', '부모부담 보육료'],
  '보조금': ['인건비 보조금', '기관보육료', '연장보육료', '그 밖의 지원금'],
  '인건비': ['기본급', '제수당', '일용잡급', '퇴직급여'],
  '4대보험': ['국민연금', '건강보험', '고용보험', '산재보험'],
  '운영비': ['급간식비', '소모품비', '공공요금', '여비교통비', '수용비', '차량유지비'],
  '기타수입': ['이자수입', '그 밖의 잡수입'],
  '전입금': ['전입금'],
  '차입금': ['단기차입금', '장기차입금'],
}

const fmt = (n: number) => n.toLocaleString('ko-KR')

export default function VoucherInputPage() {
  const [rows, setRows] = useState<VoucherRow[]>(sampleData)
  const [checked, setChecked] = useState<Set<number>>(new Set())
  const [filterType, setFilterType] = useState<'전체' | '수입' | '지출'>('전체')
  const [filterMonth, setFilterMonth] = useState('2026-03')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [listeningRowId, setListeningRowId] = useState<number | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)

  const startVoice = useCallback((rowId: number) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) { alert('이 브라우저는 음성인식을 지원하지 않습니다'); return }
    if (listeningRowId === rowId) { recognitionRef.current?.stop(); return }

    const recognition = new SR()
    recognition.lang = 'ko-KR'
    recognition.interimResults = false
    recognition.continuous = false

    recognition.onstart = () => setListeningRowId(rowId)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (e: any) => {
      const text = e.results[0][0].transcript as string
      setRows(prev => prev.map(r => r.id === rowId ? { ...r, summary: r.summary ? `${r.summary} ${text}` : text } : r))
    }
    recognition.onend = () => { setListeningRowId(null); recognitionRef.current = null }
    recognition.onerror = () => { setListeningRowId(null); recognitionRef.current = null }

    recognitionRef.current = recognition
    recognition.start()
  }, [listeningRowId])

  const nextId = () => Math.max(...rows.map(r => r.id), 0) + 1

  const filtered = rows.filter(r => {
    if (filterType !== '전체' && r.type !== filterType) return false
    if (!r.date.startsWith(filterMonth)) return false
    return true
  })

  const totalIncome = filtered.filter(r => r.type === '수입').reduce((s, r) => s + r.amount, 0)
  const totalExpense = filtered.filter(r => r.type === '지출').reduce((s, r) => s + r.amount, 0)

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

  const addRow = () => {
    const newRow: VoucherRow = {
      id: nextId(),
      date: new Date().toISOString().slice(0, 10),
      type: '지출',
      account: '운영비',
      subAccount: '소모품비',
      summary: '',
      amount: 0,
      counterpart: '',
      note: '',
      approved: false,
    }
    setRows(prev => [...prev, newRow])
    setEditingId(newRow.id)
  }

  const deleteRows = () => {
    if (checked.size === 0) return
    setRows(prev => prev.filter(r => !checked.has(r.id)))
    setChecked(new Set())
  }

  const updateRow = (id: number, field: keyof VoucherRow, value: string | number | boolean) => {
    setRows(prev => prev.map(r => {
      if (r.id !== id) return r
      const updated = { ...r, [field]: value }
      if (field === 'account') {
        const subs = subAccountMap[value as string]
        updated.subAccount = subs?.[0] || ''
      }
      return updated
    }))
  }

  return (
    <div className="space-y-4 max-w-6xl">
      {/* 상단 조건부 */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 hover:bg-slate-50/50 transition-colors">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <label className="text-[11px] text-slate-500 block mb-1 font-medium">회계구분</label>
              <select className="px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-700">
                <option>표준재무회계</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] text-slate-500 block mb-1 font-medium">출납년월</label>
              <input
                type="month"
                value={filterMonth}
                onChange={e => setFilterMonth(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-700"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-500 block mb-1 font-medium">구분</label>
              <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
                {(['전체', '수입', '지출'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setFilterType(t)}
                    className={`px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors ${
                      filterType === t ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <button className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">조회</button>
        </div>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-blue-200 p-4 hover:bg-blue-50/50 transition-colors">
          <p className="text-[11px] text-blue-500 mb-1">수입합계</p>
          <p className="text-lg font-bold text-blue-700">{fmt(totalIncome)}원</p>
        </div>
        <div className="bg-white rounded-xl border border-red-200 p-4 hover:bg-red-50/50 transition-colors">
          <p className="text-[11px] text-red-500 mb-1">지출합계</p>
          <p className="text-lg font-bold text-red-600">{fmt(totalExpense)}원</p>
        </div>
        <div className="bg-white rounded-xl border border-emerald-200 p-4 hover:bg-emerald-50/50 transition-colors">
          <p className="text-[11px] text-emerald-500 mb-1">잔액</p>
          <p className="text-lg font-bold text-emerald-700">{fmt(totalIncome - totalExpense)}원</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 hover:bg-slate-50/50 transition-colors">
          <p className="text-[11px] text-slate-500 mb-1">전표건수</p>
          <p className="text-lg font-bold text-slate-700">{filtered.length}건</p>
        </div>
      </div>

      {/* 기능키 툴바 */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 flex items-center overflow-visible">
        {/* 전표 그룹 */}
        <div className="flex items-center gap-1 relative group/slip">
          <span className="px-2 py-1.5 text-[11px] font-bold whitespace-nowrap text-amber-700 bg-amber-100 rounded cursor-default">
            <svg className="w-3.5 h-3.5 inline -mt-0.5 mr-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>
            전표
          </span>
          <div className="absolute left-0 bottom-full mb-1 w-64 bg-amber-50 text-slate-700 text-[11px] rounded-lg p-3 shadow-xl border border-amber-200 z-50 hidden group-hover/slip:block leading-relaxed">
            <p><strong className="text-amber-700">등록</strong> : 수기로 전표를 추가시 사용</p>
            <p><strong className="text-amber-700">합산</strong> : 동일날짜 2개이상 전표를 선택후 합산처리</p>
            <p><strong className="text-amber-700">삭제</strong> : 등록된 전표를 삭제시 사용</p>
            <p><strong className="text-amber-700">일괄분리</strong> : 금액이 같은 전표를 다량으로 분리</p>
            <p><strong className="text-amber-700">미계정전환</strong> : 기 지정된 전표를 미계정으로 전환시 사용</p>
          </div>
          <button onClick={addRow} className="px-3 py-1.5 text-[12px] font-bold whitespace-nowrap border border-slate-300 rounded bg-white hover:bg-slate-50 text-slate-700 sub-tab-hover">등록</button>
          <button className="px-3 py-1.5 text-[12px] font-bold whitespace-nowrap border border-slate-300 rounded bg-white hover:bg-slate-50 text-slate-700 sub-tab-hover">합산</button>
          <button onClick={deleteRows} className="px-3 py-1.5 text-[12px] font-bold whitespace-nowrap border border-slate-300 rounded bg-white hover:bg-slate-50 text-slate-700 sub-tab-hover">삭제</button>
          <button className="px-3 py-1.5 text-[12px] font-bold whitespace-nowrap border border-slate-300 rounded bg-white hover:bg-slate-50 text-slate-700 sub-tab-hover">일괄분리</button>
          <button className="px-3 py-1.5 text-[12px] font-bold whitespace-nowrap border border-slate-300 rounded bg-white hover:bg-slate-50 text-slate-700 sub-tab-hover">미계정전환</button>
        </div>
        <div className="w-px h-7 bg-slate-300 mx-2 flex-shrink-0" />
        {/* 적요 그룹 */}
        <div className="flex items-center gap-1">
          <span className="px-2 py-1.5 text-[11px] font-bold whitespace-nowrap text-slate-400 bg-slate-100 rounded cursor-default" title="적요 관련 기능">
            <svg className="w-3.5 h-3.5 inline -mt-0.5 mr-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>
            적요
          </span>
          <button className="px-3 py-1.5 text-[12px] font-bold whitespace-nowrap border border-slate-300 rounded bg-white hover:bg-slate-50 text-slate-700 sub-tab-hover">삭제</button>
          <button className="px-3 py-1.5 text-[12px] font-bold whitespace-nowrap border border-slate-300 rounded bg-white hover:bg-slate-50 text-slate-700 sub-tab-hover">치환</button>
          <button className="px-3 py-1.5 text-[12px] font-bold whitespace-nowrap border border-slate-300 rounded bg-white hover:bg-slate-50 text-slate-700 sub-tab-hover">세목추가</button>
        </div>
        <div className="w-px h-7 bg-slate-300 mx-2 flex-shrink-0" />
        {/* 매핑 그룹 */}
        <div className="flex items-center gap-1">
          <span className="px-2 py-1.5 text-[11px] font-bold whitespace-nowrap text-pink-400 bg-pink-50 rounded cursor-default" title="매핑 관련 기능">
            <svg className="w-3.5 h-3.5 inline -mt-0.5 mr-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>
            매핑
          </span>
          <button className="px-3 py-1.5 text-[12px] font-bold whitespace-nowrap border border-slate-300 rounded bg-white hover:bg-slate-50 text-slate-700 sub-tab-hover">원아경비</button>
          <button className="px-3 py-1.5 text-[12px] font-bold whitespace-nowrap border border-slate-300 rounded bg-white hover:bg-slate-50 text-slate-700 sub-tab-hover">거래처.적요.결제방식</button>
        </div>
        <div className="w-px h-7 bg-slate-300 mx-2 flex-shrink-0" />
        {/* 정렬 그룹 */}
        <div className="flex items-center gap-1">
          <span className="px-2 py-1.5 text-[11px] font-bold whitespace-nowrap text-green-400 bg-green-50 rounded cursor-default" title="정렬 관련 기능">
            <svg className="w-3.5 h-3.5 inline -mt-0.5 mr-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>
            정렬
          </span>
          <button className="px-3 py-1.5 text-[12px] font-bold whitespace-nowrap border border-slate-300 rounded bg-white hover:bg-slate-50 text-slate-700 sub-tab-hover">수입부우선</button>
          <button className="px-3 py-1.5 text-[12px] font-bold whitespace-nowrap border border-slate-300 rounded bg-white hover:bg-slate-50 text-slate-700 sub-tab-hover">전표번호</button>
          <button className="px-3 py-1.5 text-[12px] font-bold whitespace-nowrap border border-slate-300 rounded bg-white hover:bg-slate-50 text-slate-700 sub-tab-hover">전체</button>
        </div>
        <div className="w-px h-7 bg-slate-300 mx-2 flex-shrink-0" />
        {/* 출력 그룹 */}
        <div className="flex items-center gap-1 ml-auto">
          <button className="px-3 py-1.5 text-[12px] font-bold whitespace-nowrap border border-blue-300 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 sub-tab-hover">엑셀</button>
          <button className="px-3 py-1.5 text-[12px] font-bold whitespace-nowrap border border-slate-300 rounded bg-white hover:bg-slate-50 text-slate-700 sub-tab-hover">출력</button>
          <button className="px-3 py-1.5 text-[12px] font-bold whitespace-nowrap border border-amber-400 rounded bg-amber-500 hover:bg-amber-600 text-white sub-tab-hover">저장</button>
        </div>
      </div>

      {/* 전표 테이블 */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
        <div className="overflow-x-auto">
          <table className="w-full text-xs table-fixed">
            <colgroup>
              <col className="w-[36px]" />
              <col className="w-[40px]" />
              <col className="w-[100px]" />
              <col className="w-[50px]" />
              <col className="w-[100px]" />
              <col className="w-[100px]" />
              <col />
              <col className="w-[120px]" />
              <col className="w-[100px]" />
              <col className="w-[80px]" />
              <col className="w-[50px]" />
            </colgroup>
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-center px-2 py-3 font-semibold text-slate-500">
                  <input type="checkbox" className="rounded border-slate-300" checked={checked.size === filtered.length && filtered.length > 0} onChange={toggleAll} />
                </th>
                <th className="text-center px-2 py-3 font-semibold text-slate-500">No</th>
                <th className="text-center px-2 py-3 font-semibold text-slate-500">전표일자</th>
                <th className="text-center px-2 py-3 font-semibold text-slate-500">구분</th>
                <th className="text-center px-2 py-3 font-semibold text-slate-500">계정과목</th>
                <th className="text-center px-2 py-3 font-semibold text-slate-500">세부과목</th>
                <th className="text-center px-2 py-3 font-semibold text-slate-500">적요</th>
                <th className="text-right px-3 py-3 font-semibold text-slate-500">금액</th>
                <th className="text-center px-2 py-3 font-semibold text-slate-500">거래처</th>
                <th className="text-center px-2 py-3 font-semibold text-slate-500">비고</th>
                <th className="text-center px-2 py-3 font-semibold text-slate-500">승인</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((row, idx) => {
                const isEditing = editingId === row.id
                return (
                  <tr
                    key={row.id}
                    className={`transition-colors cursor-pointer ${
                      checked.has(row.id) ? 'bg-blue-50/60' : 'hover:bg-slate-50/80'
                    }`}
                    onDoubleClick={() => setEditingId(isEditing ? null : row.id)}
                  >
                    <td className="text-center px-2 py-2">
                      <input type="checkbox" className="rounded border-slate-300" checked={checked.has(row.id)} onChange={() => toggleCheck(row.id)} />
                    </td>
                    <td className="text-center px-2 py-2 text-slate-400">{idx + 1}</td>

                    {/* 전표일자 */}
                    <td className="text-center px-2 py-2">
                      {isEditing ? (
                        <input type="date" value={row.date} onChange={e => updateRow(row.id, 'date', e.target.value)}
                          className="w-full px-1 py-0.5 border border-blue-300 rounded text-xs text-center focus:ring-1 focus:ring-blue-500 outline-none" />
                      ) : (
                        <span className="text-slate-700">{row.date.slice(5)}</span>
                      )}
                    </td>

                    {/* 구분 */}
                    <td className="text-center px-2 py-2">
                      {isEditing ? (
                        <select value={row.type} onChange={e => updateRow(row.id, 'type', e.target.value)}
                          className="w-full px-1 py-0.5 border border-blue-300 rounded text-xs text-center focus:ring-1 focus:ring-blue-500 outline-none">
                          <option>수입</option>
                          <option>지출</option>
                        </select>
                      ) : (
                        <span className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          row.type === '수입' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                        }`}>{row.type}</span>
                      )}
                    </td>

                    {/* 계정과목 */}
                    <td className="text-center px-2 py-2">
                      {isEditing ? (
                        <select value={row.account} onChange={e => updateRow(row.id, 'account', e.target.value)}
                          className="w-full px-1 py-0.5 border border-blue-300 rounded text-xs focus:ring-1 focus:ring-blue-500 outline-none">
                          {accountOptions.map(a => <option key={a}>{a}</option>)}
                        </select>
                      ) : (
                        <span className="text-slate-700 font-medium">{row.account}</span>
                      )}
                    </td>

                    {/* 세부과목 */}
                    <td className="text-center px-2 py-2">
                      {isEditing ? (
                        <select value={row.subAccount} onChange={e => updateRow(row.id, 'subAccount', e.target.value)}
                          className="w-full px-1 py-0.5 border border-blue-300 rounded text-xs focus:ring-1 focus:ring-blue-500 outline-none">
                          {(subAccountMap[row.account] || []).map(s => <option key={s}>{s}</option>)}
                        </select>
                      ) : (
                        <span className="text-slate-600 text-[11px]">{row.subAccount}</span>
                      )}
                    </td>

                    {/* 적요 */}
                    <td className="px-2 py-2">
                      <div className="flex items-center gap-0.5">
                        <input type="text" value={row.summary} onChange={e => updateRow(row.id, 'summary', e.target.value)}
                          className="flex-1 min-w-0 px-1 py-0.5 border border-transparent hover:border-slate-300 focus:border-blue-400 rounded text-xs text-slate-700 focus:ring-1 focus:ring-blue-500 outline-none bg-transparent focus:bg-white transition-colors" />
                        <button
                          onClick={(e) => { e.stopPropagation(); startVoice(row.id) }}
                          className={`shrink-0 w-5 h-5 flex items-center justify-center rounded-full transition-all ${
                            listeningRowId === row.id
                              ? 'bg-red-500 animate-pulse'
                              : 'bg-slate-200 hover:bg-blue-500 group'
                          }`}
                          title="음성 입력"
                        >
                          <svg className={`w-2.5 h-2.5 ${listeningRowId === row.id ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                          </svg>
                        </button>
                      </div>
                    </td>

                    {/* 금액 */}
                    <td className="text-right px-3 py-2">
                      {isEditing ? (
                        <input type="text" value={fmt(row.amount)}
                          onChange={e => updateRow(row.id, 'amount', Number(e.target.value.replace(/,/g, '')) || 0)}
                          className="w-full px-1 py-0.5 border border-blue-300 rounded text-xs text-right focus:ring-1 focus:ring-blue-500 outline-none" />
                      ) : (
                        <span className={`font-medium ${row.type === '수입' ? 'text-blue-700' : 'text-red-600'}`}>{fmt(row.amount)}</span>
                      )}
                    </td>

                    {/* 거래처 */}
                    <td className="text-center px-2 py-2">
                      {isEditing ? (
                        <input type="text" value={row.counterpart} onChange={e => updateRow(row.id, 'counterpart', e.target.value)}
                          className="w-full px-1 py-0.5 border border-blue-300 rounded text-xs text-center focus:ring-1 focus:ring-blue-500 outline-none" />
                      ) : (
                        <span className="text-slate-600 text-[11px] truncate block">{row.counterpart}</span>
                      )}
                    </td>

                    {/* 비고 */}
                    <td className="text-center px-2 py-2">
                      {isEditing ? (
                        <input type="text" value={row.note} onChange={e => updateRow(row.id, 'note', e.target.value)}
                          className="w-full px-1 py-0.5 border border-blue-300 rounded text-xs text-center focus:ring-1 focus:ring-blue-500 outline-none" />
                      ) : (
                        <span className="text-slate-400 text-[11px]">{row.note || '-'}</span>
                      )}
                    </td>

                    {/* 승인 */}
                    <td className="text-center px-2 py-2">
                      <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${
                        row.approved ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'
                      }`}>
                        {row.approved ? '✓' : '-'}
                      </span>
                    </td>
                  </tr>
                )
              })}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={11} className="py-16 text-center text-slate-400 text-sm">
                    해당 조건의 전표가 없습니다
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 하단 합계 */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-[11px] text-slate-500">전체 <strong className="text-slate-700">{filtered.length}</strong>건</span>
            <span className="text-[11px] text-slate-400">|</span>
            <span className="text-[11px] text-slate-500">수입 <strong className="text-blue-700">{fmt(totalIncome)}</strong></span>
            <span className="text-[11px] text-slate-400">|</span>
            <span className="text-[11px] text-slate-500">지출 <strong className="text-red-600">{fmt(totalExpense)}</strong></span>
            <span className="text-[11px] text-slate-400">|</span>
            <span className="text-[11px] text-slate-500">잔액 <strong className="text-emerald-700">{fmt(totalIncome - totalExpense)}</strong></span>
          </div>
          <span className="text-[10px] text-slate-400">더블클릭으로 편집 | ESC로 편집 종료</span>
        </div>
      </div>
    </div>
  )
}
