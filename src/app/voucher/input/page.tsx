'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'

interface VoucherRow {
  id: number
  date: string
  type: '수입' | '지출' | '반납'
  account: string
  subAccount: string
  summary: string
  amount: number
  counterpart: string
  note: string
  approved: boolean
  evidence?: ('세금계산서' | '계산서' | '현금영수증' | '쿠팡' | '네이버' | '11번가' | '지마켓' | '옥션' | '오아시스' | '4대보험')[]
}

const sampleData: VoucherRow[] = [
  { id: 1, date: '2026-03-03', type: '수입', account: '정부지원 보육료', subAccount: '', summary: '3월 정부지원 보육료 입금', amount: 15524000, counterpart: '사회보장정보원', note: '', approved: true },
  { id: 2, date: '2026-03-03', type: '수입', account: '인건비 보조금', subAccount: '', summary: '3월 인건비 보조금 입금', amount: 8594960, counterpart: '구청', note: '', approved: true },
  { id: 3, date: '2026-03-05', type: '지출', account: '보육교직원급여', subAccount: '', summary: '3월 교직원 기본급 지급', amount: 4404593, counterpart: '교직원', note: '지출-자동이체', approved: true, evidence: ['세금계산서'] },
  { id: 4, date: '2026-03-05', type: '지출', account: '보육교직원수당', subAccount: '', summary: '3월 직책수당 지급', amount: 850000, counterpart: '교직원', note: '지출-계좌이체', approved: true, evidence: ['계산서'] },
  { id: 5, date: '2026-03-05', type: '지출', account: '법정부담금', subAccount: '', summary: '3월 국민연금 사업주부담금', amount: 396450, counterpart: '국민연금공단', note: '지출-현금결제', approved: false, evidence: ['현금영수증'] },
  { id: 6, date: '2026-03-05', type: '지출', account: '법정부담금', subAccount: '', summary: '3월 건강보험 사업주부담금', amount: 310270, counterpart: '건강보험공단', note: '지출-지로', approved: false, evidence: ['4대보험'] },
  { id: 7, date: '2026-03-06', type: '지출', account: '급식·간식재료비', subAccount: '', summary: '3월 급간식 식재료 구입(쿠팡)', amount: 1850000, counterpart: '쿠팡', note: '지출-카드결제', approved: true, evidence: ['쿠팡'] },
  { id: 8, date: '2026-03-06', type: '지출', account: '수용비 및 수수료', subAccount: '', summary: '사무용품 구입(네이버)', amount: 125000, counterpart: '네이버', note: '지출-카드결제', approved: false, evidence: ['네이버'] },
  { id: 11, date: '2026-03-08', type: '지출', account: '수용비 및 수수료', subAccount: '', summary: '11번가 구입', amount: 55000, counterpart: '11번가', note: '지출-카드결제', approved: false, evidence: ['11번가'] },
  { id: 12, date: '2026-03-08', type: '지출', account: '수용비 및 수수료', subAccount: '', summary: '지마켓 구입', amount: 33000, counterpart: '지마켓', note: '지출-카드결제', approved: false, evidence: ['지마켓'] },
  { id: 13, date: '2026-03-08', type: '지출', account: '수용비 및 수수료', subAccount: '', summary: '옥션 구입', amount: 22000, counterpart: '옥션', note: '지출-카드결제', approved: false, evidence: ['옥션'] },
  { id: 14, date: '2026-03-08', type: '지출', account: '급식·간식재료비', subAccount: '', summary: '오아시스 식재료', amount: 88000, counterpart: '오아시스', note: '지출-카드결제', approved: true, evidence: ['오아시스'] },
  { id: 9, date: '2026-03-07', type: '수입', account: '이자수입', subAccount: '', summary: '보통예금 이자', amount: 8320, counterpart: '국민은행', note: '', approved: true },
  { id: 10, date: '2026-03-07', type: '지출', account: '공공요금 및 제세공과금', subAccount: '', summary: '2월 전기요금 납부', amount: 487600, counterpart: '한국전력', note: '자동이체', approved: true },
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

// 계정과목 필터 목록 (세목은 isSub: true)
interface AccItem { value: string; label: string; isSub?: boolean }
const incomeAccounts: AccItem[] = [
  { value: '정부지원 보육료', label: '정부지원 보육료' },
  { value: '부모부담 보육료', label: '부모부담 보육료' },
  { value: '특별활동비', label: '특별활동비' },
  { value: '기타 필요경비', label: '기타 필요경비' },
  { value: '세목:입학준비금', label: '입학준비금', isSub: true },
  { value: '세목:현장학습비', label: '현장학습비', isSub: true },
  { value: '세목:차량운행비', label: '차량운행비', isSub: true },
  { value: '세목:부모부담행사비', label: '부모부담행사비', isSub: true },
  { value: '세목:조석식비', label: '조석식비', isSub: true },
  { value: '필:특성화비', label: '특성화비', isSub: true },
  { value: '인건비 보조금', label: '인건비 보조금' },
  { value: '기관보육료', label: '기관보육료' },
  { value: '연장보육료', label: '연장보육료' },
  { value: '공공형 운영비', label: '공공형 운영비' },
  { value: '그 밖의 지원금', label: '그 밖의 지원금' },
  { value: '자본보조금', label: '자본보조금' },
  { value: '전입금', label: '전입금' },
  { value: '단기차입금', label: '단기차입금' },
  { value: '장기차입금', label: '장기차입금' },
  { value: '지정후원금', label: '지정후원금' },
  { value: '비지정후원금', label: '비지정후원금' },
  { value: '적립금 처분 수입', label: '적립금 처분 수입' },
  { value: '과년도 수입', label: '과년도 수입' },
  { value: '이자수입', label: '이자수입' },
  { value: '그 밖의 잡수입', label: '그 밖의 잡수입' },
  { value: '전년도 이월금', label: '전년도 이월금' },
  { value: '전년도 이월사업비', label: '전년도 이월사업비' },
]
const expenseAccounts: AccItem[] = [
  { value: '원장급여', label: '원장급여' },
  { value: '원장수당', label: '원장수당' },
  { value: '보육교직원급여', label: '보육교직원급여' },
  { value: '보육교직원수당', label: '보육교직원수당' },
  { value: '기타 인건비', label: '기타 인건비' },
  { value: '법정부담금', label: '법정부담금' },
  { value: '퇴직금 및 퇴직적립금', label: '퇴직금 및 퇴직적립금' },
  { value: '수용비 및 수수료', label: '수용비 및 수수료' },
  { value: '공공요금 및 제세공과금', label: '공공요금 및 제세공과금' },
  { value: '연료비', label: '연료비' },
  { value: '여비', label: '여비' },
  { value: '차량비', label: '차량비' },
  { value: '복리후생비', label: '복리후생비' },
  { value: '기타 운영비', label: '기타 운영비' },
  { value: '세목:임대료', label: '임대료', isSub: true },
  { value: '세목:건물융자금의이자', label: '건물융자금의이자', isSub: true },
  { value: '업무추진비', label: '업무추진비' },
  { value: '직책급', label: '직책급' },
  { value: '회의비', label: '회의비' },
  { value: '교직원연수·연구비', label: '교직원연수·연구비' },
  { value: '교재·교구 구입비', label: '교재·교구 구입비' },
  { value: '행사비', label: '행사비' },
  { value: '영유아복리비', label: '영유아복리비' },
  { value: '급식·간식재료비', label: '급식·간식재료비' },
  { value: '특별활동비지출', label: '특별활동비지출' },
  { value: '기타 필요경비 지출', label: '기타 필요경비 지출' },
  { value: '세목:입학준비금(지출)', label: '입학준비금', isSub: true },
  { value: '세목:현장학습비(지출)', label: '현장학습비', isSub: true },
  { value: '세목:차량운행비(지출)', label: '차량운행비', isSub: true },
  { value: '세목:부모부담행사비(지출)', label: '부모부담행사비', isSub: true },
  { value: '세목:조석식비(지출)', label: '조석식비', isSub: true },
  { value: '필:특성화비(지출)', label: '특성화비', isSub: true },
  { value: '적립금', label: '적립금' },
  { value: '단기 차입금 상환', label: '단기 차입금 상환' },
  { value: '장기 차입금 상환', label: '장기 차입금 상환' },
  { value: '보조금 반환금', label: '보조금 반환금' },
  { value: '보호자 반환금', label: '보호자 반환금' },
  { value: '법인회계 전출금', label: '법인회계 전출금' },
  { value: '시설비', label: '시설비' },
  { value: '시설장비 유지비', label: '시설장비 유지비' },
  { value: '자산취득비', label: '자산취득비' },
  { value: '세목:차량할부금', label: '차량할부금', isSub: true },
  { value: '세목:자산취득비(세목)', label: '자산취득비', isSub: true },
  { value: '과년도 지출', label: '과년도 지출' },
  { value: '잡지출', label: '잡지출' },
  { value: '예비비', label: '예비비' },
]

const fmt = (n: number) => n.toLocaleString('ko-KR')

export default function VoucherInputPage() {
  const [rows, setRows] = useState<VoucherRow[]>(sampleData)
  const [checked, setChecked] = useState<Set<number>>(new Set())
  const [filterType, setFilterType] = useState<'전체' | '수입' | '지출' | '반납'>('전체')
  const [filterAccountGroup, setFilterAccountGroup] = useState<'전체' | '수입' | '지출'>('전체')
  const [filterAccount, setFilterAccount] = useState('전체')
  const [filterInputMethod, setFilterInputMethod] = useState('전체')
  const [filterAmountFrom, setFilterAmountFrom] = useState('')
  const [filterAmountTo, setFilterAmountTo] = useState('')
  const [searchKey, setSearchKey] = useState<'적요' | '계정' | '결제방식' | '전표번호'>('적요')
  const [searchText, setSearchText] = useState('')
  const [filterYearMonth, setFilterYearMonth] = useState('2026-03')
  const [filterDayFrom, setFilterDayFrom] = useState(0) // 0 = 전체
  const [filterDayTo, setFilterDayTo] = useState(0)
  const [showToolbar, setShowToolbar] = useState(false)
  const [showColumnSettings, setShowColumnSettings] = useState(false)
  const columnSettingsRef = useRef<HTMLDivElement>(null)
  const [visibleColumns, setVisibleColumns] = useState({
    no: false, date: true, type: false, summary: true,
    income: true, expense: true, account: true, sub: true,
    counterpart: false, payment: false, sort: false,
  })
  const [showCalendar, setShowCalendar] = useState(false)
  const [showAccountDropdown, setShowAccountDropdown] = useState(false)
  const calendarRef = useRef<HTMLDivElement>(null)
  const accountDropdownRef = useRef<HTMLDivElement>(null)
  const [editingCell, setEditingCell] = useState<{ rowId: number; field: string } | null>(null)
  const [listeningRowId, setListeningRowId] = useState<number | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)

  // 팝업 외부 클릭 시 닫기
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(e.target as Node)) {
        setShowCalendar(false)
      }
      if (accountDropdownRef.current && !accountDropdownRef.current.contains(e.target as Node)) {
        setShowAccountDropdown(false)
      }
      if (columnSettingsRef.current && !columnSettingsRef.current.contains(e.target as Node)) {
        setShowColumnSettings(false)
      }
      // 셀 편집 중 외부 클릭 시 닫기 (날짜 달력 포함)
      if (editingCell) {
        const target = e.target as HTMLElement
        if (!target.closest('td')) {
          setEditingCell(null)
        }
      }
    }
    if (showCalendar || showAccountDropdown || showColumnSettings || editingCell) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showCalendar, showAccountDropdown, showColumnSettings, editingCell])

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
    if (!r.date.startsWith(filterYearMonth)) return false
    if (filterAccount !== '전체' && r.account !== filterAccount) return false
    if (filterDayFrom > 0 && filterDayTo > 0) {
      const day = parseInt(r.date.slice(8, 10), 10)
      if (day < filterDayFrom || day > filterDayTo) return false
    }
    const amtFrom = filterAmountFrom ? Number(filterAmountFrom.replace(/,/g, '')) : 0
    const amtTo = filterAmountTo ? Number(filterAmountTo.replace(/,/g, '')) : 0
    if (amtFrom > 0 && r.amount < amtFrom) return false
    if (amtTo > 0 && r.amount > amtTo) return false
    if (searchText) {
      const keyword = searchText.toLowerCase()
      let target = ''
      if (searchKey === '적요') target = r.summary
      else if (searchKey === '계정') target = `${r.account} ${r.subAccount}`
      else if (searchKey === '결제방식') target = r.note
      else if (searchKey === '전표번호') target = String(r.id)
      if (!target.toLowerCase().includes(keyword)) return false
    }
    return true
  })

  // 년월 드롭다운 옵션 생성 (2024-03 ~ 2028-02, 회계연도 기준)
  const yearMonthOptions: { value: string; label: string }[] = []
  for (let y = 2024; y <= 2028; y++) {
    for (let m = 1; m <= 12; m++) {
      const val = `${y}-${String(m).padStart(2, '0')}`
      yearMonthOptions.push({ value: val, label: `${y}년 ${m}월` })
    }
  }

  // 해당 월의 일수 계산
  const [fYear, fMonth] = filterYearMonth.split('-').map(Number)
  const daysInMonth = new Date(fYear, fMonth, 0).getDate()

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
    setEditingCell({ rowId: newRow.id, field: 'summary' })
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
    <div className="space-y-4">
      {/* 상단 조건부 */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 hover:bg-slate-50/50 transition-colors">
        <div className="flex items-end gap-4 flex-wrap">
            <div>
              <label className="text-[11px] text-slate-500 block mb-1 font-medium">출납년월</label>
              <select
                value={filterYearMonth}
                onChange={e => { setFilterYearMonth(e.target.value); setFilterDayFrom(0); setFilterDayTo(0) }}
                className="px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-700"
              >
                {yearMonthOptions.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="relative" ref={calendarRef}>
              <label className="text-[11px] text-slate-500 block mb-1 font-medium">일자</label>
              <button
                onClick={() => setShowCalendar(!showCalendar)}
                className="px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
                {filterDayFrom > 0 && filterDayTo > 0
                  ? `${filterDayFrom}일 ~ ${filterDayTo}일`
                  : filterDayFrom > 0
                    ? `${filterDayFrom}일 ~ ?`
                    : '전체'}
              </button>
              {showCalendar && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg p-3 z-50 w-[240px]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-700">
                      {fYear}년 {fMonth}월
                    </span>
                    {(filterDayFrom > 0 || filterDayTo > 0) && (
                      <button
                        onClick={() => { setFilterDayFrom(0); setFilterDayTo(0) }}
                        className="text-[10px] text-red-500 hover:text-red-700 font-medium"
                      >초기화</button>
                    )}
                  </div>
                  <div className="grid grid-cols-7 gap-0.5 mb-1">
                    {['일','월','화','수','목','금','토'].map(d => (
                      <div key={d} className={`text-center text-[10px] font-semibold py-1 ${d === '일' ? 'text-red-400' : d === '토' ? 'text-blue-400' : 'text-slate-400'}`}>{d}</div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-0.5">
                    {/* 첫째 주 빈칸 */}
                    {Array.from({ length: new Date(fYear, fMonth - 1, 1).getDay() }, (_, i) => (
                      <div key={`empty-${i}`} />
                    ))}
                    {Array.from({ length: daysInMonth }, (_, i) => {
                      const d = i + 1
                      const isFrom = d === filterDayFrom
                      const isTo = d === filterDayTo
                      const inRange = filterDayFrom > 0 && filterDayTo > 0 && d >= filterDayFrom && d <= filterDayTo
                      const dayOfWeek = new Date(fYear, fMonth - 1, d).getDay()
                      // 마지막일 선택 단계에서 시작일 이전은 비활성화
                      const isPickingEnd = filterDayFrom > 0 && filterDayTo === 0
                      const disabled = isPickingEnd && d < filterDayFrom
                      return (
                        <button
                          key={d}
                          disabled={disabled}
                          onClick={() => {
                            if (filterDayFrom === 0 || (filterDayFrom > 0 && filterDayTo > 0)) {
                              setFilterDayFrom(d)
                              setFilterDayTo(0)
                            } else {
                              setFilterDayTo(d)
                              setShowCalendar(false)
                            }
                          }}
                          className={`h-7 rounded text-[11px] font-medium transition-colors ${
                            disabled
                              ? 'text-slate-300 cursor-not-allowed'
                              : isFrom || isTo
                                ? 'bg-blue-600 text-white'
                                : inRange
                                  ? 'bg-blue-100 text-blue-700'
                                  : dayOfWeek === 0
                                    ? 'text-red-500 hover:bg-slate-100'
                                    : dayOfWeek === 6
                                      ? 'text-blue-500 hover:bg-slate-100'
                                      : 'text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {d}
                        </button>
                      )
                    })}
                  </div>
                  {filterDayFrom > 0 && filterDayTo === 0 && (
                    <p className="text-[10px] text-blue-500 mt-2 text-center">마지막 일자를 클릭하세요</p>
                  )}
                </div>
              )}
            </div>
            <div className="relative" ref={accountDropdownRef}>
              <label className="text-[11px] text-slate-500 block mb-1 font-medium">계정과목</label>
              <div className="flex items-center gap-1">
                <div className="flex items-center gap-0.5 bg-slate-100 rounded-lg p-0.5">
                  {(['전체', '수입', '지출'] as const).map(g => (
                    <button
                      key={g}
                      onClick={() => {
                        setFilterAccountGroup(g)
                        setFilterAccount(g === '전체' ? '전체' : g === '수입' ? '수입전체' : '지출전체')
                        setShowAccountDropdown(true)
                      }}
                      className={`px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-colors ${
                        filterAccountGroup === g ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
              {showAccountDropdown && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 w-[220px] max-h-[320px] overflow-y-auto">
                  {filterAccountGroup === '전체' && ['전체', '계정별전체', '계정미지정', '세목미지정'].map(v => (
                    <button key={v} onClick={() => { setFilterAccount(v); setShowAccountDropdown(false) }}
                      className={`w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 transition-colors ${filterAccount === v ? 'bg-slate-100 font-bold text-blue-700' : 'text-slate-700'}`}
                    >{v}</button>
                  ))}
                  {filterAccountGroup === '수입' && <>
                    {['수입전체', '수입미지정'].map(v => (
                      <button key={v} onClick={() => { setFilterAccount(v); setShowAccountDropdown(false) }}
                        className={`w-full text-left px-3 py-1.5 text-xs hover:bg-sky-50 transition-colors ${filterAccount === v ? 'bg-sky-100 font-bold text-sky-700' : 'text-sky-600'}`}
                      >{v}</button>
                    ))}
                    {incomeAccounts.map(a => (
                      <button key={a.value} onClick={() => { setFilterAccount(a.value); setShowAccountDropdown(false) }}
                        className={`w-full text-left text-xs hover:bg-sky-50 transition-colors ${filterAccount === a.value ? 'bg-sky-100 font-bold text-sky-700' : 'text-sky-600'} ${a.isSub ? 'pl-6 py-1' : 'px-3 py-1.5'}`}
                      >
                        {a.isSub ? (
                          <span className="flex items-center gap-1">
                            <span className="inline-block px-1 py-0 rounded bg-sky-200 text-sky-700 text-[9px] font-bold">세목</span>
                            {a.label}
                          </span>
                        ) : a.label}
                      </button>
                    ))}
                  </>}
                  {filterAccountGroup === '지출' && <>
                    {['지출전체', '지출미지정'].map(v => (
                      <button key={v} onClick={() => { setFilterAccount(v); setShowAccountDropdown(false) }}
                        className={`w-full text-left px-3 py-1.5 text-xs hover:bg-rose-50 transition-colors ${filterAccount === v ? 'bg-rose-100 font-bold text-rose-700' : 'text-rose-600'}`}
                      >{v}</button>
                    ))}
                    {expenseAccounts.map(a => (
                      <button key={a.value} onClick={() => { setFilterAccount(a.value); setShowAccountDropdown(false) }}
                        className={`w-full text-left text-xs hover:bg-rose-50 transition-colors ${filterAccount === a.value ? 'bg-rose-100 font-bold text-rose-700' : 'text-rose-600'} ${a.isSub ? 'pl-6 py-1' : 'px-3 py-1.5'}`}
                      >
                        {a.isSub ? (
                          <span className="flex items-center gap-1">
                            <span className="inline-block px-1 py-0 rounded bg-rose-200 text-rose-700 text-[9px] font-bold">세목</span>
                            {a.label}
                          </span>
                        ) : a.label}
                      </button>
                    ))}
                  </>}
                </div>
              )}
            </div>
            <div>
              <label className="text-[11px] text-slate-500 block mb-1 font-medium">입력방식</label>
              <select
                value={filterInputMethod}
                onChange={e => setFilterInputMethod(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-700"
              >
                <option value="전체">전체</option>
                <option value="은행입력">은행입력</option>
                <option value="수기입력">수기입력</option>
                <option value="일괄입력">일괄입력</option>
                <option value="엑셀입력">엑셀입력</option>
                <option value="전표분리">전표분리</option>
                <option value="은행비등록">은행비등록</option>
                <option value="은행미등록">은행미등록</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] text-slate-500 block mb-1 font-medium">금액</label>
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={filterAmountFrom}
                  onChange={e => setFilterAmountFrom(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="최소"
                  className="w-20 px-2 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 text-right"
                />
                <span className="text-slate-400 text-xs">~</span>
                <input
                  type="text"
                  value={filterAmountTo}
                  onChange={e => setFilterAmountTo(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="최대"
                  className="w-20 px-2 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 text-right"
                />
              </div>
            </div>
            <div>
              <label className="text-[11px] text-slate-500 block mb-1 font-medium">검색</label>
              <div className="flex items-center gap-0">
                <select
                  value={searchKey}
                  onChange={e => setSearchKey(e.target.value as '적요' | '계정' | '결제방식' | '전표번호')}
                  className="px-2 py-2 border border-slate-200 rounded-l-lg text-xs font-medium text-slate-700 border-r-0 bg-slate-50"
                >
                  <option value="적요">적요</option>
                  <option value="계정">계정</option>
                  <option value="결제방식">결제방식</option>
                  <option value="전표번호">전표번호</option>
                </select>
                <input
                  type="text"
                  value={searchText}
                  onChange={e => setSearchText(e.target.value)}
                  placeholder="검색어 입력"
                  className="w-28 px-2 py-2 border border-slate-200 rounded-r-lg text-xs font-medium text-slate-700"
                />
              </div>
            </div>
          <button className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors ml-auto">조회</button>
        </div>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-blue-200 p-4 hover:bg-blue-50/50 transition-colors">
          <p className="text-xs font-bold text-blue-500 mb-1">수입합계</p>
          <p className="text-xl font-bold text-blue-700">{fmt(totalIncome)}원</p>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-xs text-slate-500">전표 <strong className="text-blue-600">{filtered.filter(r => r.type === '수입').length}</strong></span>
            <span className="text-xs text-slate-500">정상 <strong className="text-blue-600">{filtered.filter(r => r.type === '수입' && r.amount >= 0).length}</strong></span>
            <span className="text-xs text-slate-500">반납 <strong className="text-amber-600">{filtered.filter(r => r.type === '수입' && r.amount < 0).length}</strong></span>
            <span className="text-xs text-slate-500">삭제 <strong className="text-slate-400">0</strong></span>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-red-200 p-4 hover:bg-red-50/50 transition-colors">
          <p className="text-xs font-bold text-red-500 mb-1">지출합계</p>
          <p className="text-xl font-bold text-red-600">{fmt(totalExpense)}원</p>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-xs text-slate-500">전표 <strong className="text-red-600">{filtered.filter(r => r.type === '지출').length}</strong></span>
            <span className="text-xs text-slate-500">정상 <strong className="text-red-600">{filtered.filter(r => r.type === '지출' && r.amount >= 0).length}</strong></span>
            <span className="text-xs text-slate-500">반납 <strong className="text-amber-600">{filtered.filter(r => r.type === '지출' && r.amount < 0).length}</strong></span>
            <span className="text-xs text-slate-500">삭제 <strong className="text-slate-400">0</strong></span>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-emerald-200 p-4 hover:bg-emerald-50/50 transition-colors">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-bold text-emerald-500">회계잔액</p>
            {totalIncome - totalExpense === totalIncome - totalExpense ? (
              <span className="text-[10px] font-normal text-sky-600 bg-sky-100 px-2 py-0.5 rounded-full">계좌잔액 일치</span>
            ) : (
              <span className="text-[10px] font-normal text-red-600 bg-red-100 px-2 py-0.5 rounded-full">계좌 불일치</span>
            )}
          </div>
          <p className="text-xl font-bold text-emerald-700">{fmt(totalIncome - totalExpense)}원</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 hover:bg-slate-50/50 transition-colors">
          <p className="text-xs font-bold text-slate-500 mb-1">계좌잔액</p>
          <p className="text-xl font-bold text-slate-700">{fmt(totalIncome - totalExpense)}원</p>
          <div className="flex flex-col gap-1 mt-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-500">국민 1234-56</span>
              <span className="text-[10px] font-bold text-slate-700">{fmt(totalIncome - totalExpense)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-500">농협 9876-54</span>
              <span className="text-[10px] font-bold text-slate-700">0</span>
            </div>
          </div>
        </div>
      </div>

      {/* 기능키 툴바 */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 flex items-center overflow-visible">
        <button
          onClick={() => setShowToolbar(!showToolbar)}
          className={`px-2.5 py-1.5 text-[11px] font-bold whitespace-nowrap rounded transition-colors flex items-center gap-1 ${
            showToolbar ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
          </svg>
          기능키
        </button>
        {showToolbar && <>
          <div className="w-px h-7 bg-slate-300 mx-2 flex-shrink-0" />
          {/* 전표 그룹 */}
          <div className="flex items-center gap-1">
            <span className="px-2 py-1.5 text-[11px] font-bold whitespace-nowrap text-amber-700 bg-amber-100 rounded cursor-default">전표</span>
            <button onClick={addRow} data-tip="신규전표를 수기로 등록" className="px-3 py-1.5 text-[12px] font-bold whitespace-nowrap border border-slate-300 rounded bg-white hover:bg-slate-50 text-slate-700 sub-tab-hover">등록</button>
            <button data-tip="동일날짜에 선택된 전표를 1개 전표로 합산" className="px-3 py-1.5 text-[12px] font-bold whitespace-nowrap border border-slate-300 rounded bg-white hover:bg-slate-50 text-slate-700 sub-tab-hover">합산</button>
            <button onClick={deleteRows} data-tip="선택한 전표를 삭제처리" className="px-3 py-1.5 text-[12px] font-bold whitespace-nowrap border border-slate-300 rounded bg-white hover:bg-slate-50 text-slate-700 sub-tab-hover">삭제</button>
            <button data-tip="동일금액의 전표를 동일한 금액으로 분리" className="px-3 py-1.5 text-[12px] font-bold whitespace-nowrap border border-slate-300 rounded bg-white hover:bg-slate-50 text-slate-700 sub-tab-hover">일괄분리</button>
            <button data-tip="선택된 전표를 미계정상태로 전환" className="px-3 py-1.5 text-[12px] font-bold whitespace-nowrap border border-slate-300 rounded bg-white hover:bg-slate-50 text-slate-700 sub-tab-hover">미계정전환</button>
          </div>
          <div className="w-px h-7 bg-slate-300 mx-2 flex-shrink-0" />
          {/* 적요 그룹 */}
          <div className="flex items-center gap-1">
            <span className="px-2 py-1.5 text-[11px] font-bold whitespace-nowrap text-amber-700 bg-amber-100 rounded cursor-default">적요</span>
            <button data-tip="선택된 전표의 적요를 삭제" className="px-3 py-1.5 text-[12px] font-bold whitespace-nowrap border border-slate-300 rounded bg-white hover:bg-slate-50 text-slate-700 sub-tab-hover">삭제</button>
            <button data-tip="선택된 전표의 적요를 치환처리" className="px-3 py-1.5 text-[12px] font-bold whitespace-nowrap border border-slate-300 rounded bg-white hover:bg-slate-50 text-slate-700 sub-tab-hover">치환</button>
            <button data-tip="세목지정된 전표적요에 세목내용추가" className="px-3 py-1.5 text-[12px] font-bold whitespace-nowrap border border-slate-300 rounded bg-white hover:bg-slate-50 text-slate-700 sub-tab-hover">세목추가</button>
          </div>
          <div className="w-px h-7 bg-slate-300 mx-2 flex-shrink-0" />
          {/* 매핑 그룹 */}
          <div className="flex items-center gap-1">
            <span className="px-2 py-1.5 text-[11px] font-bold whitespace-nowrap text-pink-600 bg-pink-100 rounded cursor-default">매핑</span>
            <button data-tip="아동관리에 등록아동과 전표에 아동의 필요경비를 자동 매핑" className="tip-pink px-3 py-1.5 text-[12px] font-bold whitespace-nowrap border border-slate-300 rounded bg-white hover:bg-slate-50 text-slate-700 sub-tab-hover">원아경비</button>
            <button data-tip="기 설정된 조건에 부합하는 계정으로 동시매핑" className="tip-pink px-3 py-1.5 text-[12px] font-bold whitespace-nowrap border border-slate-300 rounded bg-white hover:bg-slate-50 text-slate-700 sub-tab-hover">거래처.적요.결제방식</button>
          </div>
          <div className="w-px h-7 bg-slate-300 mx-2 flex-shrink-0" />
          {/* 정렬 그룹 */}
          <div className="flex items-center gap-1">
            <span className="px-2 py-1.5 text-[11px] font-bold whitespace-nowrap text-green-600 bg-green-100 rounded cursor-default">정렬</span>
            <button data-tip="동일날짜에 수입전표가 먼저 정렬처리" className="tip-green px-3 py-1.5 text-[12px] font-bold whitespace-nowrap border border-slate-300 rounded bg-white hover:bg-slate-50 text-slate-700 sub-tab-hover">수입부우선</button>
            <button data-tip="전표번호를 순서대로 다시 번호배열처리" className="tip-green px-3 py-1.5 text-[12px] font-bold whitespace-nowrap border border-slate-300 rounded bg-white hover:bg-slate-50 text-slate-700 sub-tab-hover">전표번호</button>
            <button data-tip="페이지로 노출된 전표를 1페이지에 모두 노출처리" className="tip-green px-3 py-1.5 text-[12px] font-bold whitespace-nowrap border border-slate-300 rounded bg-white hover:bg-slate-50 text-slate-700 sub-tab-hover">전체</button>
          </div>
        </>}
        <div className="w-px h-7 bg-slate-300 mx-2 flex-shrink-0" />
        {/* 출력 그룹 - 항상 표시 */}
        <div className="flex items-center gap-1 ml-auto">
          <button data-tip="엑셀 다운로드" className="px-2 py-1.5 border border-green-400 rounded bg-green-50 hover:bg-green-100 text-green-700 sub-tab-hover">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M14.5 1H6a2 2 0 00-2 2v18a2 2 0 002 2h12a2 2 0 002-2V6.5L14.5 1zM14 2l5 5h-5V2zM7.5 17.5L10 13l-2.5-4.5h1.8L10.8 11l1.5-2.5h1.8L11.6 13l2.5 4.5h-1.8L10.8 15l-1.5 2.5H7.5z" />
            </svg>
          </button>
          <button data-tip="인쇄" className="px-2 py-1.5 border border-slate-300 rounded bg-white hover:bg-slate-50 text-slate-700 sub-tab-hover">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18.75 12h.008v.008h-.008V12zm-3 0h.008v.008h-.008V12z" />
            </svg>
          </button>
          <button className="px-3 py-1.5 text-[12px] font-bold whitespace-nowrap border border-amber-400 rounded bg-amber-500 hover:bg-amber-600 text-white sub-tab-hover">저장</button>
        </div>
      </div>

      {/* 전표 테이블 */}
      <div className="flex items-center justify-end mb-1 relative" ref={columnSettingsRef}>
        <button onClick={() => setShowColumnSettings(!showColumnSettings)}
          className={`p-1.5 rounded transition-colors ${showColumnSettings ? 'bg-blue-100 text-blue-600' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-600'}`} data-tip="컬럼 설정">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
        {showColumnSettings && (
          <div className="absolute top-full right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg p-3 z-50 w-[180px]">
            <p className="text-[11px] font-bold text-slate-700 mb-2">컬럼 표시 설정</p>
            {([
              ['no', '전표번호'],
              ['date', '전표일자'],
              ['type', '구분'],
              ['summary', '적요'],
              ['income', '수입금액'],
              ['expense', '지출금액'],
              ['account', '계정과목'],
              ['sub', '세목'],
              ['counterpart', '거래처'],
              ['payment', '결제방식'],
              ['sort', '정렬'],
            ] as [string, string][]).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 py-1 cursor-pointer hover:bg-slate-50 rounded px-1">
                <input type="checkbox"
                  checked={visibleColumns[key as keyof typeof visibleColumns]}
                  onChange={() => setVisibleColumns(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }))}
                  className="rounded border-slate-300 text-blue-600 w-3.5 h-3.5" />
                <span className="text-xs text-slate-700">{label}</span>
              </label>
            ))}
            <button onClick={() => setShowColumnSettings(false)}
              className="w-full mt-2 py-1 text-[11px] font-medium text-slate-500 hover:text-slate-700 border-t border-slate-100 pt-2">닫기</button>
          </div>
        )}
      </div>
      <div className="bg-white rounded-xl border border-slate-200 hover:shadow-md transition-shadow">
        <div className="overflow-x-auto">
          <table className="text-xs w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-center px-1 py-2 font-semibold text-slate-500 w-[30px]">
                  <input type="checkbox" className="rounded border-slate-300" checked={checked.size === filtered.length && filtered.length > 0} onChange={toggleAll} />
                </th>
                {visibleColumns.no && <th className="text-center px-1 py-2 font-semibold text-slate-500 w-[36px]">번호</th>}
                {visibleColumns.date && <th className="text-center px-1 py-2 font-semibold text-slate-500 w-[70px]">일자</th>}
                {visibleColumns.type && <th className="text-center px-1 py-2 font-semibold text-slate-500 w-[36px]">구분</th>}
                {visibleColumns.summary && <th className="text-center px-1 py-2 font-semibold text-slate-500 w-[150px]">적요</th>}
                <th className="text-center px-1 py-2 font-semibold text-slate-500 w-[32px]">영수</th>
                <th className="text-center px-1 py-2 font-semibold text-slate-500 w-[32px]">이체</th>
                <th className="text-center px-1 py-2 font-semibold text-slate-500 w-[32px]">은행</th>
                <th className="text-center px-1 py-2 font-semibold text-slate-500 w-[40px] relative group cursor-help"><span className="whitespace-nowrap">증빙<span className="text-blue-400 text-[9px]">ⓘ</span></span>
                  <div className="hidden group-hover:block absolute top-full left-1/2 -translate-x-1/2 mt-1 bg-slate-800 text-white text-[10px] font-normal rounded-lg px-3 py-2 z-50 w-[140px] shadow-lg">
                    <p className="font-bold mb-1">국세청</p>
                    <p>세금계산서 · 계산서 · 현금영수증</p>
                    <p className="font-bold mt-1.5 mb-1">쇼핑몰</p>
                    <p>쿠팡 · 네이버 · 11번가 · 지마켓 · 옥션 · 오아시스</p>
                    <p className="font-bold mt-1.5 mb-1">4대보험</p>
                    <p>국민연금 · 건강보험 · 고용보험 · 산재보험</p>
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 rotate-45"></div>
                  </div>
                </th>
                <th className="text-center px-1 py-2 font-semibold text-slate-500 w-[32px]">등록</th>
                <th className="text-center px-1 py-2 font-semibold text-slate-500 w-[32px]">첨부</th>
                {visibleColumns.income && <th className="text-center px-1 py-2 font-semibold text-slate-500 w-[90px]">수입금액</th>}
                {visibleColumns.expense && <th className="text-center px-1 py-2 font-semibold text-slate-500 w-[90px]">지출금액</th>}
                <th className="text-center px-0 py-2 font-semibold text-slate-500 w-[28px]">복사</th>
                {visibleColumns.account && <th className="text-center px-1 py-2 font-semibold text-slate-500 w-[80px]">계정과목</th>}
                {visibleColumns.sub && <th className="text-center px-1 py-2 font-semibold text-slate-500 w-[70px]">세목</th>}
                <th className="text-center px-1 py-2 font-semibold text-slate-500 w-[32px]">분리</th>
                <th className="text-center px-0 py-2 font-semibold text-slate-500 w-[50px]">반납</th>
                <th className="text-center px-1 py-2 font-semibold text-slate-500 w-[36px]">수수료</th>
                {visibleColumns.counterpart && <th className="text-center px-1 py-2 font-semibold text-slate-500 w-[70px]">거래처</th>}
                {visibleColumns.payment && <th className="text-left px-1 py-2 font-semibold text-slate-500 w-[70px]">결제방식</th>}
                <th className="text-center px-0 py-2 font-semibold text-slate-500 w-[32px]">원아</th>
                {visibleColumns.sort && <th className="text-center px-0 py-2 font-semibold text-slate-500 w-[32px]">정렬</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((row, idx) => {
                const isCell = (field: string) => editingCell?.rowId === row.id && editingCell?.field === field
                const cellClick = (field: string) => (e: React.MouseEvent) => {
                  e.stopPropagation()
                  setEditingCell(isCell(field) ? null : { rowId: row.id, field })
                }
                const displayType = row.amount < 0 ? '반납' : row.type
                return (
                  <tr
                    key={row.id}
                    className={`transition-colors ${
                      editingCell?.rowId === row.id ? 'bg-amber-50/70' : checked.has(row.id) ? 'bg-blue-50/60' : 'hover:bg-slate-50/80'
                    }`}
                  >
                    <td className="text-center px-2 py-2">
                      <input type="checkbox" className="rounded border-slate-300" checked={checked.has(row.id)} onChange={() => toggleCheck(row.id)} />
                    </td>
                    {visibleColumns.no && <td className="text-center px-2 py-2 text-slate-400">{idx + 1}</td>}

                    {/* 전표일자 */}
                    {visibleColumns.date && <td className="text-center px-2 py-2 cursor-pointer relative" onClick={cellClick('date')}>
                      <span className={`text-slate-700 ${isCell('date') ? 'font-extrabold text-slate-900 bg-white px-1.5 py-0.5 rounded' : ''}`}>{row.date.slice(5)}</span>
                      {isCell('date') && (() => {
                        const [cy, cm] = row.date.split('-').map(Number)
                        const dim = new Date(cy, cm, 0).getDate()
                        const firstDay = new Date(cy, cm - 1, 1).getDay()
                        const cd = parseInt(row.date.slice(8, 10), 10)
                        return (
                          <div className="absolute top-1/2 -translate-y-1/2 left-full ml-2 bg-white border border-slate-200 rounded-xl shadow-lg p-3 z-50 w-[220px]"
                            onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between mb-2">
                              <button onClick={() => {
                                const prev = cm === 1 ? new Date(cy - 1, 11, cd > 31 ? 28 : cd) : new Date(cy, cm - 2, Math.min(cd, new Date(cy, cm - 1, 0).getDate()))
                                updateRow(row.id, 'date', prev.toISOString().slice(0, 10))
                              }} className="text-slate-400 hover:text-slate-700 px-1">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
                              </button>
                              <span className="text-xs font-bold text-slate-700">{cy}년 {cm}월</span>
                              <button onClick={() => {
                                const next = cm === 12 ? new Date(cy + 1, 0, Math.min(cd, 31)) : new Date(cy, cm, Math.min(cd, new Date(cy, cm + 1, 0).getDate()))
                                updateRow(row.id, 'date', next.toISOString().slice(0, 10))
                              }} className="text-slate-400 hover:text-slate-700 px-1">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
                              </button>
                            </div>
                            <div className="grid grid-cols-7 gap-0.5 mb-1">
                              {['일','월','화','수','목','금','토'].map(d => (
                                <div key={d} className={`text-center text-[10px] font-semibold py-0.5 ${d === '일' ? 'text-red-400' : d === '토' ? 'text-blue-400' : 'text-slate-400'}`}>{d}</div>
                              ))}
                            </div>
                            <div className="grid grid-cols-7 gap-0.5">
                              {Array.from({ length: firstDay }, (_, i) => <div key={`e-${i}`} />)}
                              {Array.from({ length: dim }, (_, i) => {
                                const d = i + 1
                                const dow = new Date(cy, cm - 1, d).getDay()
                                return (
                                  <button key={d}
                                    onClick={() => {
                                      const newDate = `${cy}-${String(cm).padStart(2,'0')}-${String(d).padStart(2,'0')}`
                                      updateRow(row.id, 'date', newDate)
                                      setEditingCell(null)
                                    }}
                                    className={`h-6 rounded text-[11px] font-medium transition-colors ${
                                      d === cd ? 'bg-blue-600 text-white' : dow === 0 ? 'text-red-500 hover:bg-slate-100' : dow === 6 ? 'text-blue-500 hover:bg-slate-100' : 'text-slate-700 hover:bg-slate-100'
                                    }`}
                                  >{d}</button>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })()}
                    </td>}

                    {/* 구분 */}
                    {visibleColumns.type && <td className="text-center px-2 py-2">
                      <span className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        displayType === '수입' ? 'bg-blue-100 text-blue-700' : displayType === '지출' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-900 font-extrabold'
                      }`}>{displayType}</span>
                    </td>}

                    {/* 적요 */}
                    {visibleColumns.summary && <td className="px-2 py-2 cursor-pointer" onClick={cellClick('summary')}>
                      {isCell('summary') ? (
                        <div onClick={e => e.stopPropagation()}>
                          <textarea value={row.summary} autoFocus rows={3}
                            onChange={e => updateRow(row.id, 'summary', e.target.value)}
                            className="w-full px-2 py-1.5 border border-blue-300 rounded text-xs text-slate-700 focus:ring-1 focus:ring-blue-500 outline-none resize-none bg-white" />
                          <div className="flex items-center justify-end mt-1 gap-2">
                            <span className="text-[10px] text-slate-400">{row.summary.length}자</span>
                            <button onClick={() => setEditingCell(null)} className="text-[10px] text-slate-400 hover:text-slate-700 font-medium">닫기</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); startVoice(row.id) }}
                            className={`shrink-0 w-4 h-4 flex items-center justify-center rounded-full transition-all ${
                              listeningRowId === row.id
                                ? 'bg-red-500 animate-pulse'
                                : 'bg-slate-200 hover:bg-blue-500 group'
                            }`}
                          >
                            <svg className={`w-2.5 h-2.5 ${listeningRowId === row.id ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                            </svg>
                          </button>
                          <span className="text-slate-700 text-xs truncate">{row.summary || '-'}</span>
                        </div>
                      )}
                    </td>}

                    {/* 영수 - 현금결제/지로 */}
                    <td className="text-center px-0 py-2">
                      {(row.note.includes('현금') || row.note.includes('지로')) && (
                        <svg className="w-3.5 h-3.5 mx-auto text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" /></svg>
                      )}
                    </td>
                    {/* 이체 - 계좌이체/자동이체 */}
                    <td className="text-center px-0 py-2">
                      {row.note.includes('이체') && (
                        <svg className="w-3.5 h-3.5 mx-auto text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" /></svg>
                      )}
                    </td>
                    {/* 은행 - 이체와 같은 아이콘 */}
                    <td className="text-center px-0 py-2">
                      {row.approved && (
                        <svg className="w-3.5 h-3.5 mx-auto text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" /></svg>
                      )}
                    </td>
                    {/* 증빙 - evidence 배열 기반 뱃지 */}
                    <td className="text-center px-0 py-1">
                      {row.evidence && row.evidence.length > 0 && (
                        <div className="flex flex-wrap items-center justify-center gap-0.5">
                          {row.evidence.map(ev => {
                            const labels: Record<string, [string, string]> = {
                              '세금계산서': ['세금', 'bg-blue-100 text-blue-700'],
                              '계산서': ['계산', 'bg-indigo-100 text-indigo-700'],
                              '현금영수증': ['현금', 'bg-emerald-100 text-emerald-700'],
                              '쿠팡': ['C', 'bg-rose-100 text-rose-600'],
                              '네이버': ['N', 'bg-green-100 text-green-700'],
                              '11번가': ['11', 'bg-red-100 text-red-600'],
                              '지마켓': ['G', 'bg-green-100 text-green-700'],
                              '옥션': ['A', 'bg-orange-100 text-orange-600'],
                              '오아시스': ['O', 'bg-lime-100 text-lime-700'],
                              '4대보험': ['보험', 'bg-teal-100 text-teal-700'],
                            }
                            const l = labels[ev]
                            if (!l) return null
                            return <span key={ev} className={`inline-block px-1 py-0 rounded text-[7px] font-bold ${l[1]}`} title={ev}>{l[0]}</span>
                          })}
                        </div>
                      )}
                    </td>
                    {/* 등록 - 임시: 승인된 건은 등록 데이터 있는 것으로 표시 */}
                    <td className="text-center px-0 py-2">
                      <div className="flex items-center justify-center gap-0.5">
                        {row.approved ? (<>
                          <button onClick={e => e.stopPropagation()} className="text-blue-600 font-bold">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                          </button>
                          <span className="text-[9px] font-bold text-blue-600">1</span>
                          <button onClick={e => e.stopPropagation()} className="text-blue-400 hover:text-blue-600" data-tip="미리보기">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
                          </button>
                        </>) : (
                          <button onClick={e => e.stopPropagation()} className="text-slate-300 hover:text-blue-600 transition-colors">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                          </button>
                        )}
                      </div>
                    </td>
                    {/* 첨부 */}
                    <td className="text-center px-0 py-2">
                      <div className="flex items-center justify-center gap-0.5">
                        {row.approved ? (<>
                          <button onClick={e => e.stopPropagation()} className="text-blue-600 font-bold">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" /></svg>
                          </button>
                          <span className="text-[9px] font-bold text-blue-600">2</span>
                          <button onClick={e => e.stopPropagation()} className="text-blue-400 hover:text-blue-600" data-tip="미리보기">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
                          </button>
                        </>) : (
                          <button onClick={e => e.stopPropagation()} className="text-slate-300 hover:text-blue-600 transition-colors">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" /></svg>
                          </button>
                        )}
                      </div>
                    </td>

                    {/* 수입금액 */}
                    {visibleColumns.income && <td className="text-right px-3 py-2 cursor-pointer" onClick={row.type === '수입' ? cellClick('amount') : undefined}>
                      {row.type === '수입' ? (
                        isCell('amount') ? (
                          <input type="text" value={fmt(row.amount)} autoFocus
                            onChange={e => updateRow(row.id, 'amount', Number(e.target.value.replace(/,/g, '')) || 0)}
                            onBlur={() => setEditingCell(null)}
                            onClick={e => e.stopPropagation()}
                            className="w-full px-1 py-0.5 border border-blue-300 rounded text-xs text-right focus:ring-1 focus:ring-blue-500 outline-none" />
                        ) : (
                          <span className="font-medium text-blue-700">{fmt(row.amount)}</span>
                        )
                      ) : null}
                    </td>}

                    {/* 지출금액 */}
                    {visibleColumns.expense && <td className="text-right px-3 py-2 cursor-pointer" onClick={row.type === '지출' ? cellClick('amount') : undefined}>
                      {row.type === '지출' ? (
                        isCell('amount') ? (
                          <input type="text" value={fmt(row.amount)} autoFocus
                            onChange={e => updateRow(row.id, 'amount', Number(e.target.value.replace(/,/g, '')) || 0)}
                            onBlur={() => setEditingCell(null)}
                            onClick={e => e.stopPropagation()}
                            className="w-full px-1 py-0.5 border border-blue-300 rounded text-xs text-right focus:ring-1 focus:ring-blue-500 outline-none" />
                        ) : (
                          <span className="font-medium text-red-600">{fmt(row.amount)}</span>
                        )
                      ) : null}
                    </td>}

                    {/* 복사선택 */}
                    <td className="text-center px-1 py-2">
                      <input type="checkbox" className="rounded border-slate-300 w-3.5 h-3.5" />
                    </td>

                    {/* 계정과목 */}
                    {visibleColumns.account && <td className="text-center px-2 py-2 cursor-pointer" onClick={cellClick('account')}>
                      {isCell('account') ? (
                        <select value={row.subAccount || row.account}
                          ref={el => { if (el) { el.focus(); try { el.showPicker() } catch {} } }}
                          onChange={e => {
                            const val = e.target.value
                            const list = row.type === '수입' ? incomeAccounts : expenseAccounts
                            const item = list.find(a => a.value === val)
                            if (item?.isSub) {
                              updateRow(row.id, 'subAccount', val)
                            } else {
                              updateRow(row.id, 'account', val)
                              updateRow(row.id, 'subAccount', '')
                            }
                            setEditingCell(null)
                          }}
                          onClick={e => e.stopPropagation()}
                          className={`w-full px-1 py-0.5 border border-blue-300 rounded text-xs focus:ring-1 focus:ring-blue-500 outline-none ${row.type === '수입' ? 'text-sky-600' : 'text-rose-600'}`}>
                          {(row.type === '수입' ? incomeAccounts : expenseAccounts).map(a => (
                            <option key={a.value} value={a.value}>{a.isSub ? `  ㄴ ${a.label}` : a.label}</option>
                          ))}
                        </select>
                      ) : (
                        <span className={`font-medium ${row.type === '수입' ? 'text-sky-600' : 'text-rose-600'}`}>{row.account}</span>
                      )}
                    </td>}

                    {/* 세목 */}
                    {visibleColumns.sub && <td className="text-center px-2 py-2">
                      <span className="text-slate-600 text-[11px]">{row.subAccount || '-'}</span>
                    </td>}

                    {/* 분리 */}
                    <td className="text-center px-1 py-2">
                      <button onClick={e => e.stopPropagation()} className="px-1.5 py-0.5 text-[10px] font-medium border border-slate-300 rounded bg-white hover:bg-slate-50 text-slate-600">분리</button>
                    </td>

                    {/* 반납 */}
                    <td className="text-center px-1 py-1">
                      <div className="flex flex-col gap-0.5">
                        <input type="text" placeholder="전표"
                          onClick={e => e.stopPropagation()}
                          className="w-full px-1 py-0 border border-amber-300 rounded text-[9px] text-center text-amber-700 bg-amber-50/50 focus:ring-1 focus:ring-amber-400 outline-none" />
                        <input type="text" placeholder="계정"
                          onClick={e => e.stopPropagation()}
                          className="w-full px-1 py-0 border border-amber-300 rounded text-[9px] text-center text-amber-700 bg-amber-50/50 focus:ring-1 focus:ring-amber-400 outline-none" />
                      </div>
                    </td>

                    {/* 수수료 */}
                    <td className="text-center px-1 py-2">
                      <button onClick={e => e.stopPropagation()} className="px-1.5 py-0.5 text-[10px] font-medium border border-slate-300 rounded bg-white hover:bg-slate-50 text-slate-600">수수료</button>
                    </td>

                    {/* 거래처 */}
                    {visibleColumns.counterpart && <td className="text-center px-2 py-2 cursor-pointer" onClick={cellClick('counterpart')}>
                      {isCell('counterpart') ? (
                        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                          <input type="text" value={row.counterpart} autoFocus
                            onChange={e => updateRow(row.id, 'counterpart', e.target.value)}
                            className="flex-1 min-w-0 px-1 py-0.5 border border-blue-300 rounded text-xs text-center focus:ring-1 focus:ring-blue-500 outline-none" />
                          <button
                            onClick={() => {/* 거래처 검색 팝업 */}}
                            className="shrink-0 px-1.5 py-0.5 border border-slate-300 rounded bg-slate-50 hover:bg-slate-100 text-[10px] font-medium text-slate-600"
                          >선택</button>
                        </div>
                      ) : (
                        <span className="text-slate-600 text-[11px] truncate block">{row.counterpart || '-'}</span>
                      )}
                    </td>}

                    {/* 결제방식 */}
                    {visibleColumns.payment && <td className="text-left px-2 py-2 cursor-pointer" onClick={cellClick('note')}>
                      {isCell('note') ? (
                        <select value={row.note} autoFocus
                          onChange={e => { updateRow(row.id, 'note', e.target.value); setEditingCell(null) }}
                          onBlur={() => setEditingCell(null)}
                          onClick={e => e.stopPropagation()}
                          className="w-full px-1 py-0.5 border border-blue-300 rounded text-xs text-left focus:ring-1 focus:ring-blue-500 outline-none">
                          <option value="">::선택::</option>
                          {row.type === '수입' ? <>
                            <option value="수입-카드결제">카드결제</option>
                            <option value="수입-아이행복카드">아이행복카드</option>
                            <option value="수입-계좌이체">계좌이체</option>
                            <option value="수입-자동이체">자동이체</option>
                            <option value="수입-지로">지로</option>
                            <option value="수입-현금결제">현금결제</option>
                            <option value="수입-기타">기타</option>
                            <option value="수입-보조금">보조금</option>
                            <option value="수입-전입금">전입금</option>
                            <option value="수입-지정후원금">지정후원금</option>
                            <option value="수입-비지정후원금">비지정후원금</option>
                          </> : <>
                            <option value="지출-카드결제">카드결제</option>
                            <option value="지출-아이행복카드">아이행복카드</option>
                            <option value="지출-계좌이체">계좌이체</option>
                            <option value="지출-자동이체">자동이체</option>
                            <option value="지출-지로">지로</option>
                            <option value="지출-현금결제">현금결제</option>
                            <option value="지출-기타">기타</option>
                            <option value="지출-보조금">보조금</option>
                            <option value="지출-자동이체반납">자동이체반납</option>
                          </>}
                        </select>
                      ) : (
                        <span className="text-slate-400 text-[11px]">{row.note || '-'}</span>
                      )}
                    </td>}

                    {/* 원아 */}
                    <td className="text-center px-1 py-2">
                      {['부모부담 보육료', '특별활동비', '기타 필요경비', '기타 필요경비 지출'].includes(row.account) || row.account.startsWith('세목:') ? (
                        <span className="text-[10px] text-pink-600 font-medium truncate block">-</span>
                      ) : null}
                    </td>

                    {/* 정렬 */}
                    {visibleColumns.sort && (() => {
                      const sameDateRows = filtered.filter(r => r.date === row.date)
                      const dateIdx = sameDateRows.findIndex(r => r.id === row.id)
                      const canUp = dateIdx > 0
                      const canDown = dateIdx < sameDateRows.length - 1
                      return (
                        <td className="text-center px-1 py-2">
                          <div className="flex flex-col items-center gap-0.5">
                            {canUp && (
                              <button onClick={(e) => { e.stopPropagation(); setRows(prev => {
                                const next = [...prev]
                                const fi = next.findIndex(r => r.id === row.id)
                                const ti = next.findIndex(r => r.id === sameDateRows[dateIdx - 1].id)
                                ;[next[ti], next[fi]] = [next[fi], next[ti]]
                                return next
                              })}} className="text-slate-400 hover:text-slate-700">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" /></svg>
                              </button>
                            )}
                            {canDown && (
                              <button onClick={(e) => { e.stopPropagation(); setRows(prev => {
                                const next = [...prev]
                                const fi = next.findIndex(r => r.id === row.id)
                                const ti = next.findIndex(r => r.id === sameDateRows[dateIdx + 1].id)
                                ;[next[fi], next[ti]] = [next[ti], next[fi]]
                                return next
                              })}} className="text-slate-400 hover:text-slate-700">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
                              </button>
                            )}
                          </div>
                        </td>
                      )
                    })()}
                  </tr>
                )
              })}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={1 + Object.values(visibleColumns).filter(Boolean).length} className="py-16 text-center text-slate-400 text-sm">
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
            <span className="text-[11px] text-slate-500">수입합계 <strong className="text-blue-700">{fmt(totalIncome)}</strong></span>
            <span className="text-[11px] text-slate-500">전표건수 <strong className="text-blue-700">{filtered.filter(r => r.type === '수입').length}</strong></span>
            <span className="text-[11px] text-slate-500">정상 <strong className="text-blue-700">{filtered.filter(r => r.type === '수입' && r.amount >= 0).length}</strong></span>
            <span className="text-[11px] text-slate-500">반납 <strong className="text-amber-600">{filtered.filter(r => r.type === '수입' && r.amount < 0).length}</strong></span>
            <span className="text-[11px] text-slate-400">|</span>
            <span className="text-[11px] text-slate-500">지출합계 <strong className="text-red-600">{fmt(totalExpense)}</strong></span>
            <span className="text-[11px] text-slate-500">전표건수 <strong className="text-red-600">{filtered.filter(r => r.type === '지출').length}</strong></span>
            <span className="text-[11px] text-slate-500">정상 <strong className="text-red-600">{filtered.filter(r => r.type === '지출' && r.amount >= 0).length}</strong></span>
            <span className="text-[11px] text-slate-500">반납 <strong className="text-amber-600">{filtered.filter(r => r.type === '지출' && r.amount < 0).length}</strong></span>
            <span className="text-[11px] text-slate-400">|</span>
            <span className="text-[11px] text-slate-500">잔액 <strong className="text-emerald-700">{fmt(totalIncome - totalExpense)}</strong></span>
          </div>
          <span className="text-[10px] text-slate-400">셀 클릭으로 개별 편집</span>
        </div>
      </div>
    </div>
  )
}
