'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import * as XLSX from 'xlsx'
import { incomeAccounts, expenseAccounts, accountCodeMap, subAccountCodeMap, codeToAccount, type AccItem } from '@/lib/accounts'

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
  copySelected?: boolean
  inputMethod?: '은행' | '수기' | '일괄' | '엑셀' | '분리' | '합산'
  accountCode?: string
}

const sampleData: VoucherRow[] = [
  { id: 1, date: '2026-03-03', type: '수입', account: '정부지원 보육료', subAccount: '', summary: '3월 정부지원 보육료 입금', amount: 15524000, counterpart: '사회보장정보원', note: '', approved: true, inputMethod: '은행' },
  { id: 2, date: '2026-03-03', type: '수입', account: '인건비 보조금', subAccount: '', summary: '3월 인건비 보조금 입금', amount: 8594960, counterpart: '구청', note: '', approved: true, inputMethod: '은행' },
  { id: 3, date: '2026-03-03', type: '수입', account: '기관보육료', subAccount: '', summary: '3월 기관보육료 입금', amount: 3200000, counterpart: '사회보장정보원', note: '', approved: true, inputMethod: '은행' },
  { id: 4, date: '2026-03-03', type: '수입', account: '연장보육료', subAccount: '', summary: '3월 연장보육료', amount: 1450000, counterpart: '사회보장정보원', note: '', approved: true, inputMethod: '은행' },
  { id: 5, date: '2026-03-05', type: '지출', account: '보육교직원급여', subAccount: '', summary: '3월 교직원 기본급 지급', amount: 4404593, counterpart: '교직원', note: '자동이체', approved: true, evidence: ['세금계산서'], inputMethod: '은행' },
  { id: 6, date: '2026-03-05', type: '지출', account: '보육교직원급여', subAccount: '', summary: '3월 교직원 기본급(2)', amount: 3850000, counterpart: '교직원', note: '자동이체', approved: true, evidence: ['세금계산서'], inputMethod: '은행' },
  { id: 7, date: '2026-03-05', type: '지출', account: '보육교직원수당', subAccount: '', summary: '3월 직책수당 지급', amount: 850000, counterpart: '교직원', note: '계좌이체', approved: true, evidence: ['계산서'], inputMethod: '수기' },
  { id: 8, date: '2026-03-05', type: '지출', account: '보육교직원수당', subAccount: '', summary: '3월 시간외수당', amount: 420000, counterpart: '교직원', note: '계좌이체', approved: true, evidence: ['계산서'], inputMethod: '수기' },
  { id: 9, date: '2026-03-05', type: '지출', account: '법정부담금', subAccount: '', summary: '3월 국민연금 사업주부담금', amount: 396450, counterpart: '국민연금공단', note: '현금결제', approved: false, evidence: ['현금영수증'], inputMethod: '일괄' },
  { id: 10, date: '2026-03-05', type: '지출', account: '법정부담금', subAccount: '', summary: '3월 건강보험 사업주부담금', amount: 310270, counterpart: '건강보험공단', note: '지로', approved: false, evidence: ['4대보험'], inputMethod: '일괄' },
  { id: 11, date: '2026-03-05', type: '지출', account: '법정부담금', subAccount: '', summary: '3월 고용보험 사업주부담금', amount: 185400, counterpart: '근로복지공단', note: '자동이체', approved: false, evidence: ['4대보험'], inputMethod: '일괄' },
  { id: 12, date: '2026-03-05', type: '지출', account: '법정부담금', subAccount: '', summary: '3월 산재보험 사업주부담금', amount: 98700, counterpart: '근로복지공단', note: '자동이체', approved: false, evidence: ['4대보험'], inputMethod: '일괄' },
  { id: 13, date: '2026-03-05', type: '지출', account: '퇴직금 및 퇴직적립금', subAccount: '퇴직적립금', summary: '3월 퇴직적립금', amount: 650000, counterpart: '퇴직연금', note: '자동이체', approved: true, inputMethod: '은행' },
  { id: 14, date: '2026-03-06', type: '지출', account: '급식·간식재료비', subAccount: '', summary: '3월 급간식 식재료 구입(쿠팡)', amount: 1850000, counterpart: '쿠팡', note: '카드결제', approved: true, evidence: ['쿠팡'], inputMethod: '엑셀' },
  { id: 15, date: '2026-03-06', type: '지출', account: '급식·간식재료비', subAccount: '', summary: '급간식 추가 구입', amount: 320000, counterpart: '쿠팡', note: '카드결제', approved: true, evidence: ['쿠팡'], inputMethod: '엑셀' },
  { id: 16, date: '2026-03-06', type: '지출', account: '수용비 및 수수료', subAccount: '', summary: '사무용품 구입(네이버)', amount: 125000, counterpart: '네이버', note: '카드결제', approved: false, evidence: ['네이버'], inputMethod: '엑셀' },
  { id: 17, date: '2026-03-06', type: '지출', account: '수용비 및 수수료', subAccount: '', summary: '복사용지 구입', amount: 45000, counterpart: '오피스디포', note: '카드결제', approved: false, evidence: ['현금영수증'], inputMethod: '수기' },
  { id: 18, date: '2026-03-07', type: '수입', account: '이자수입', subAccount: '', summary: '보통예금 이자', amount: 8320, counterpart: '국민은행', note: '', approved: true, inputMethod: '은행' },
  { id: 19, date: '2026-03-07', type: '지출', account: '공공요금 및 제세공과금', subAccount: '', summary: '2월 전기요금 납부', amount: 487600, counterpart: '한국전력', note: '자동이체', approved: true, inputMethod: '은행' },
  { id: 20, date: '2026-03-07', type: '지출', account: '공공요금 및 제세공과금', subAccount: '', summary: '2월 수도요금 납부', amount: 156000, counterpart: '수도사업소', note: '자동이체', approved: true, inputMethod: '은행' },
  { id: 21, date: '2026-03-07', type: '지출', account: '공공요금 및 제세공과금', subAccount: '', summary: '2월 도시가스 납부', amount: 234000, counterpart: '도시가스', note: '자동이체', approved: true, inputMethod: '은행' },
  { id: 22, date: '2026-03-07', type: '지출', account: '공공요금 및 제세공과금', subAccount: '', summary: '3월 통신비', amount: 89000, counterpart: 'KT', note: '자동이체', approved: true, inputMethod: '은행' },
  { id: 23, date: '2026-03-08', type: '지출', account: '수용비 및 수수료', subAccount: '', summary: '11번가 구입', amount: 55000, counterpart: '11번가', note: '카드결제', approved: false, evidence: ['11번가'], inputMethod: '수기' },
  { id: 24, date: '2026-03-08', type: '지출', account: '수용비 및 수수료', subAccount: '', summary: '지마켓 구입', amount: 33000, counterpart: '지마켓', note: '카드결제', approved: false, evidence: ['지마켓'], inputMethod: '분리' },
  { id: 25, date: '2026-03-08', type: '지출', account: '수용비 및 수수료', subAccount: '', summary: '옥션 구입', amount: 22000, counterpart: '옥션', note: '카드결제', approved: false, evidence: ['옥션'], inputMethod: '합산' },
  { id: 26, date: '2026-03-08', type: '지출', account: '급식·간식재료비', subAccount: '', summary: '오아시스 식재료', amount: 88000, counterpart: '오아시스', note: '카드결제', approved: true, evidence: ['오아시스'], inputMethod: '수기' },
  { id: 27, date: '2026-03-10', type: '수입', account: '부모부담 보육료', subAccount: '', summary: '3월 부모부담 보육료(1차)', amount: 2340000, counterpart: '학부모', note: '', approved: true, inputMethod: '은행' },
  { id: 28, date: '2026-03-10', type: '수입', account: '부모부담 보육료', subAccount: '', summary: '3월 부모부담 보육료(2차)', amount: 1560000, counterpart: '학부모', note: '', approved: true, inputMethod: '은행' },
  { id: 29, date: '2026-03-10', type: '수입', account: '기타 필요경비', subAccount: '현장학습비', summary: '3월 현장학습비 수납', amount: 450000, counterpart: '학부모', note: '', approved: true, inputMethod: '은행' },
  { id: 30, date: '2026-03-10', type: '수입', account: '기타 필요경비', subAccount: '차량운행비', summary: '3월 차량운행비 수납', amount: 780000, counterpart: '학부모', note: '', approved: true, inputMethod: '은행' },
  { id: 31, date: '2026-03-11', type: '지출', account: '여비', subAccount: '', summary: '출장비 지급', amount: 150000, counterpart: '교직원', note: '계좌이체', approved: false, inputMethod: '수기' },
  { id: 32, date: '2026-03-11', type: '지출', account: '차량비', subAccount: '', summary: '차량 유류비', amount: 120000, counterpart: '주유소', note: '카드결제', approved: true, evidence: ['현금영수증'], inputMethod: '수기' },
  { id: 33, date: '2026-03-11', type: '지출', account: '복리후생비', subAccount: '', summary: '교직원 건강검진비', amount: 350000, counterpart: '건강검진센터', note: '카드결제', approved: false, evidence: ['세금계산서'], inputMethod: '수기' },
  { id: 34, date: '2026-03-12', type: '지출', account: '교재·교구 구입비', subAccount: '', summary: '교재 구입', amount: 280000, counterpart: '교보문고', note: '카드결제', approved: true, evidence: ['현금영수증'], inputMethod: '엑셀' },
  { id: 35, date: '2026-03-12', type: '지출', account: '교재·교구 구입비', subAccount: '', summary: '교구 구입', amount: 560000, counterpart: '아이스크림몰', note: '카드결제', approved: true, evidence: ['세금계산서'], inputMethod: '엑셀' },
  { id: 36, date: '2026-03-12', type: '지출', account: '행사비', subAccount: '', summary: '봄소풍 행사비', amount: 430000, counterpart: '행사업체', note: '계좌이체', approved: false, inputMethod: '수기' },
  { id: 37, date: '2026-03-13', type: '지출', account: '영유아복리비', subAccount: '', summary: '영유아 간식 지원', amount: 180000, counterpart: '마트', note: '카드결제', approved: true, evidence: ['현금영수증'], inputMethod: '수기' },
  { id: 38, date: '2026-03-13', type: '지출', account: '기타 운영비', subAccount: '', summary: '소독비', amount: 200000, counterpart: '소독업체', note: '계좌이체', approved: true, evidence: ['세금계산서'], inputMethod: '수기' },
  { id: 39, date: '2026-03-14', type: '수입', account: '그 밖의 지원금', subAccount: '', summary: '특별지원금 입금', amount: 500000, counterpart: '구청', note: '', approved: true, inputMethod: '은행' },
  { id: 40, date: '2026-03-14', type: '지출', account: '업무추진비', subAccount: '', summary: '원장 업무추진비', amount: 300000, counterpart: '', note: '카드결제', approved: false, inputMethod: '수기' },
  { id: 41, date: '2026-03-15', type: '지출', account: '교직원연수·연구비', subAccount: '', summary: '교사 연수비', amount: 250000, counterpart: '연수원', note: '계좌이체', approved: true, inputMethod: '수기' },
  { id: 42, date: '2026-03-15', type: '지출', account: '시설장비 유지비', subAccount: '', summary: 'CCTV 점검비', amount: 150000, counterpart: '보안업체', note: '계좌이체', approved: true, evidence: ['세금계산서'], inputMethod: '수기' },
  { id: 43, date: '2026-03-16', type: '지출', account: '급식·간식재료비', subAccount: '', summary: '식재료 추가 구입', amount: 670000, counterpart: '농협하나로마트', note: '카드결제', approved: true, evidence: ['현금영수증'], inputMethod: '수기' },
  { id: 44, date: '2026-03-16', type: '지출', account: '수용비 및 수수료', subAccount: '', summary: '세탁비', amount: 85000, counterpart: '세탁소', note: '현금결제', approved: false, evidence: ['현금영수증'], inputMethod: '수기' },
  { id: 45, date: '2026-03-17', type: '수입', account: '비지정후원금', subAccount: '', summary: '후원금 입금', amount: 100000, counterpart: '후원자', note: '', approved: true, inputMethod: '은행' },
  { id: 46, date: '2026-03-17', type: '지출', account: '원장급여', subAccount: '', summary: '3월 원장 급여', amount: 3500000, counterpart: '원장', note: '자동이체', approved: true, evidence: ['세금계산서'], inputMethod: '은행' },
  { id: 47, date: '2026-03-17', type: '지출', account: '원장수당', subAccount: '', summary: '3월 원장 수당', amount: 500000, counterpart: '원장', note: '자동이체', approved: true, inputMethod: '은행' },
  { id: 48, date: '2026-03-18', type: '지출', account: '연료비', subAccount: '', summary: '난방유 구입', amount: 450000, counterpart: '에너지업체', note: '계좌이체', approved: true, evidence: ['세금계산서'], inputMethod: '수기' },
  { id: 49, date: '2026-03-18', type: '지출', account: '기타 인건비', subAccount: '', summary: '대체교사 인건비', amount: 380000, counterpart: '대체교사', note: '계좌이체', approved: false, inputMethod: '수기' },
  { id: 50, date: '2026-03-18', type: '수입', account: '전입금', subAccount: '', summary: '법인 전입금', amount: 2000000, counterpart: '법인', note: '', approved: true, inputMethod: '은행' },
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

// 계정과목 데이터: @/lib/accounts.ts 에서 import

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
  const [sortMode, setSortMode] = useState<'' | '수입부우선' | '전표번호' | '전체'>('')
  const [showToolbar, setShowToolbar] = useState(false)
  const [inputMode, setInputMode] = useState<'간편등록' | '건별등록' | '상세등록' | '일괄수정'>('일괄수정')
  const [excelParsed, setExcelParsed] = useState<{ day: string; type: '수입' | '지출'; summary: string; incomeAmount: string; expenseAmount: string; account: string; subAccount: string; accountCode: string; payment: string }[]>([])
  const [excelFileName, setExcelFileName] = useState('')
  const [showColumnSettings, setShowColumnSettings] = useState(false)
  const [columnOrder, setColumnOrder] = useState<[string, string, string][]>([
    ['no', '번호', '1'], ['date', '일자', '2'], ['type', '구분', '3'], ['summary', '적요', '4'],
    ['evidence', '증빙(영수/이체/은행/증빙)', '5'], ['register', '등록', '6'], ['attach', '첨부', '7'],
    ['amountGroup', '금액(수입/지출/잔액)', '8'],
    ['accountGroup', '계정(복사/세목/코드/분리/반납)', '9'], ['fee', '수수료', '10'],
    ['counterpart', '거래처', '11'], ['payment', '결제방식', '12'], ['child', '원아', '13'], ['sort', '정렬', '14'],
  ])
  const columnSettingsRef = useRef<HTMLDivElement>(null)
  const [visibleColumns, setVisibleColumns] = useState({
    no: true, date: true, type: true, summary: true,
    evidence: true, register: true, attach: true,
    amountGroup: true, accountGroup: true, fee: true,
    counterpart: true, payment: true, child: true, sort: true,
  })
  const [showCalendar, setShowCalendar] = useState(false)
  const [showAccountDropdown, setShowAccountDropdown] = useState(false)
  const calendarRef = useRef<HTMLDivElement>(null)
  const accountDropdownRef = useRef<HTMLDivElement>(null)
  const [editingCell, setEditingCell] = useState<{ rowId: number; field: string } | null>(null)
  const [listeningRowId, setListeningRowId] = useState<number | null>(null)
  const [draftRow, setDraftRow] = useState<VoucherRow | null>(null)
  const [detailDropdown, setDetailDropdown] = useState<'income' | 'expense' | 'detailDate' | 'issueDate' | null>(null)
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
      // 복사 버튼 외부 클릭 시 초기화
      if (rows.some(r => r.copySelected)) {
        const target = e.target as HTMLElement
        if (!target.closest('button')) {
          setRows(prev => prev.map(r => r.copySelected ? { ...r, copySelected: false } : r))
        }
      }
    }
    const hasCopy = rows.some(r => r.copySelected)
    if (showCalendar || showAccountDropdown || showColumnSettings || editingCell || hasCopy) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showCalendar, showAccountDropdown, showColumnSettings, editingCell, rows])

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

  // 건별등록/상세등록: 모드 변경 또는 행 선택 변경 시만 draftRow 동기화
  // checked(Set)가 바뀔 때만 실행 — editingCell 변경으로는 실행 안 됨
  useEffect(() => {
    const isEditMode = inputMode === '건별등록' || inputMode === '상세등록'
    if (!isEditMode) { setDraftRow(null); return }
    const checkedId = checked.size > 0 ? Array.from(checked).pop() : null
    const row = checkedId ? rows.find(r => r.id === checkedId) : rows[0]
    if (row) setDraftRow({ ...row })
    else setDraftRow(null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputMode, checked])

  const saveDraft = () => {
    if (!draftRow) return
    setRows(prev => prev.map(r => r.id === draftRow.id ? { ...draftRow } : r))
  }

  const updateDraft = (field: keyof VoucherRow, value: string | number | boolean) => {
    setDraftRow(prev => prev ? { ...prev, [field]: value } : prev)
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
      <div className="bg-white rounded-xl border-2 border-slate-400 p-5 hover:bg-slate-50/50 transition-colors shadow-sm">
        <div className="flex items-end gap-4 flex-wrap">
            <div className="flex items-center gap-1.5">
              <label className="text-xs text-slate-500 font-medium whitespace-nowrap">출납년월</label>
              <select
                value={filterYearMonth}
                onChange={e => { setFilterYearMonth(e.target.value); setFilterDayFrom(0); setFilterDayTo(0) }}
                className="px-3 py-1.5 border-2 border-slate-400 rounded-lg text-xs font-medium text-slate-700"
              >
                {yearMonthOptions.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-1.5">
              <label className="text-xs text-slate-500 font-medium whitespace-nowrap">입력구분</label>
              {inputMode === '간편등록' ? (
                <div className="flex items-center gap-1">
                  <button onClick={() => setFilterInputMethod('수기')}
                    className={`w-24 px-3 py-1.5 border-2 rounded-lg text-xs font-bold transition-colors ${filterInputMethod === '수기' ? 'border-[#f5b800] bg-[#f5b800] text-white' : 'border-slate-300 bg-white text-slate-400'}`}>수기</button>
                  <button onClick={() => setFilterInputMethod('엑셀')}
                    className={`w-24 px-3 py-1.5 border-2 rounded-lg text-xs font-bold transition-colors ${filterInputMethod === '엑셀' ? 'border-[#f5b800] bg-[#f5b800] text-white' : 'border-slate-300 bg-white text-slate-400'}`}>엑셀</button>
                  {filterInputMethod === '엑셀' && <>
                    <div className="w-px h-6 bg-slate-300 mx-1" />
                    <select className="px-3 py-1.5 border-2 border-[#f5b800] rounded-lg text-xs font-bold text-slate-700 bg-white">
                      <option>기본 샘플파일</option>
                      <option>보육통합 엑셀자료</option>
                      <option>CMS 엑셀</option>
                      <option>농협</option>
                      <option>대구은행</option>
                      <option>국민은행</option>
                      <option>전북은행</option>
                      <option>기업은행</option>
                      <option>신한은행</option>
                      <option>시티은행(법인)</option>
                      <option>외환은행</option>
                      <option>우리은행</option>
                      <option>우체국</option>
                      <option>하나은행</option>
                    </select>
                    <input type="file" accept=".xlsx,.xls" className="hidden" id="excel-upload-top"
                      onChange={e => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        const reader = new FileReader()
                        reader.onload = (ev) => {
                          const data = new Uint8Array(ev.target?.result as ArrayBuffer)
                          const wb = XLSX.read(data, { type: 'array' })
                          const ws = wb.Sheets[wb.SheetNames[0]]
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          const json = XLSX.utils.sheet_to_json<any>(ws)
                          const parsed = json
                            .filter((r: Record<string, unknown>) => r['일자'] || r['적요'] || r['수입금액'] || r['지출금액'])
                            .map((r: Record<string, unknown>) => {
                              let account = String(r['계정과목'] || '')
                              let subAccount = String(r['세목'] || '')
                              let code = String(r['계정코드'] || '').replace(/[^0-9]/g, '')
                              if (code && codeToAccount[code]) {
                                const found = codeToAccount[code]
                                account = found.account
                                subAccount = found.subAccount
                              } else if (account) {
                                code = (subAccount && (subAccountCodeMap[subAccount] || '')) || accountCodeMap[account] || ''
                              }
                              const incAmt = r['수입금액'] ? String(r['수입금액']) : ''
                              const expAmt = r['지출금액'] ? String(r['지출금액']) : ''
                              return {
                                day: String(r['일자'] || '').replace(/^\d{4}-\d{2}-/, '').replace(/^0/, ''),
                                type: (incAmt ? '수입' : '지출') as '수입' | '지출',
                                summary: String(r['적요'] || ''),
                                incomeAmount: incAmt ? Number(String(incAmt).replace(/,/g, '')).toLocaleString('ko-KR') : '',
                                expenseAmount: expAmt ? Number(String(expAmt).replace(/,/g, '')).toLocaleString('ko-KR') : '',
                                account,
                                subAccount,
                                accountCode: code,
                                payment: String(r['결제방식'] || ''),
                              }
                            })
                          if (parsed.length > 0) {
                            setExcelParsed(parsed)
                            setExcelFileName(file.name)
                          }
                        }
                        reader.readAsArrayBuffer(file)
                      }}
                    />
                    <label htmlFor="excel-upload-top"
                      className="px-4 py-1.5 border-2 border-[#f5b800] bg-white text-xs font-bold text-slate-700 rounded-lg cursor-pointer hover:bg-[#fffbeb] transition-colors whitespace-nowrap">
                      파일 선택
                    </label>
                    <span className={`text-xs whitespace-nowrap ${excelFileName ? 'text-amber-700 font-medium' : 'text-slate-400'}`}>{excelFileName || '선택된 파일 없음'}</span>
                    <button
                      disabled={excelParsed.length === 0}
                      onClick={() => {
                        if (excelParsed.length === 0) return
                        // excelRegistered 이벤트로 SimpleInputPanel에 전달
                        window.dispatchEvent(new CustomEvent('excelRegister', { detail: excelParsed }))
                        setExcelParsed([])
                        setExcelFileName('')
                      }}
                      className={`px-5 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${excelParsed.length > 0 ? 'bg-[#f5b800] text-white hover:bg-[#e5ab00]' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}>
                      등록{excelParsed.length > 0 ? ` (${excelParsed.length}건)` : ''}
                    </button>
                    <div className="w-px h-6 bg-slate-300 mx-1" />
                    <button onClick={() => {
                      const sampleData = [
                        { '일자': '2026-03-03', '구분': '수입', '적요': '3월 정부지원 보육료 입금', '수입금액': 15524000, '지출금액': '', '계정과목': '정부지원 보육료', '세목': '', '계정코드': '1111', '결제방식': '계좌이체' },
                        { '일자': '2026-03-03', '구분': '수입', '적요': '3월 인건비 보조금 입금', '수입금액': 8594960, '지출금액': '', '계정과목': '인건비 보조금', '세목': '', '계정코드': '1311', '결제방식': '계좌이체' },
                        { '일자': '2026-03-05', '구분': '지출', '적요': '3월 교직원 기본급 지급', '수입금액': '', '지출금액': 4404593, '계정과목': '보육교직원급여', '세목': '', '계정코드': '2121', '결제방식': '자동이체' },
                        { '일자': '2026-03-05', '구분': '지출', '적요': '3월 국민연금 사업주부담금', '수입금액': '', '지출금액': 396450, '계정과목': '법정부담금', '세목': '', '계정코드': '2141', '결제방식': '자동이체' },
                        { '일자': '2026-03-06', '구분': '지출', '적요': '급간식 식재료 구입', '수입금액': '', '지출금액': 1850000, '계정과목': '급식·간식재료비', '세목': '', '계정코드': '2315', '결제방식': '카드결제' },
                        { '일자': '', '구분': '', '적요': '', '수입금액': '', '지출금액': '', '계정과목': '', '세목': '', '계정코드': '', '결제방식': '' },
                      ]
                      const ws = XLSX.utils.json_to_sheet(sampleData)
                      ws['!cols'] = [{ wch: 12 }, { wch: 6 }, { wch: 30 }, { wch: 14 }, { wch: 14 }, { wch: 18 }, { wch: 10 }, { wch: 10 }, { wch: 12 }]
                      const wb = XLSX.utils.book_new()
                      XLSX.utils.book_append_sheet(wb, ws, '간편등록')
                      XLSX.writeFile(wb, `간편등록_기본샘플_${filterYearMonth}.xls`)
                    }} className="px-3 py-1.5 bg-slate-100 text-slate-500 text-xs font-medium rounded-lg hover:bg-slate-200 transition-colors whitespace-nowrap">기본 샘플</button>
                    <div className="relative group">
                      <button className="px-3 py-1.5 bg-slate-100 text-slate-500 text-xs font-medium rounded-lg hover:bg-slate-200 transition-colors whitespace-nowrap">참고사항<span className="text-amber-500 ml-0.5">ⓘ</span></button>
                      <div className="hidden group-hover:block absolute top-full right-0 mt-2 bg-[#fffbeb] text-amber-900 text-[11px] rounded-lg px-3 py-2 z-50 w-[320px] shadow-lg leading-relaxed border border-[#f5b800]/30">
                        <div className="absolute -top-1 right-4 w-2 h-2 bg-[#fffbeb] border-l border-t border-[#f5b800]/30 rotate-45"></div>
                        <p className="font-bold mb-1.5">참고사항</p>
                        <p className="mb-1">· 입력방법에서 엑셀 또는 은행계좌를 선택하신 후 저장하셨을 경우 한번 저장된 데이터는 장부에 기재되었기 때문에 다시 불러오지 않습니다.</p>
                        <p className="mb-1">· 엑셀의 경우 직접 재등록해서 사용하실 수 있고, 은행계좌의 경우 고객센터로 데이터 초기화를 요청하시기 바랍니다.</p>
                        <p>· 엑셀로 등록한 데이터를 아래 표에서 삭제하시려면 삭제를 클릭하세요.</p>
                      </div>
                    </div>
                    <div className="relative group">
                      <button className="px-3 py-1.5 bg-slate-100 text-slate-500 text-xs font-medium rounded-lg hover:bg-slate-200 transition-colors whitespace-nowrap">입력 안내<span className="text-amber-500 ml-0.5">ⓘ</span></button>
                      <div className="hidden group-hover:block absolute top-full right-0 mt-2 bg-[#fffbeb] text-amber-900 text-[11px] rounded-lg px-3 py-2 z-50 w-[340px] shadow-lg leading-relaxed border border-[#f5b800]/30">
                        <div className="absolute -top-1 right-4 w-2 h-2 bg-[#fffbeb] border-l border-t border-[#f5b800]/30 rotate-45"></div>
                        <p className="font-bold mb-1.5">입력 안내</p>
                        <p className="mb-1">· 기본 샘플파일로 등록하실 경우 은행계좌 내역을 다운받으신 파일에 옮기신 후 "파일 선택"을 클릭하셔서 선택하신 후 "등록"을 클릭하세요.</p>
                        <p>· 기타 은행 홈페이지에서 직접 다운로드하신 경우 엑셀로 파일을 여신 후 다른이름으로 저장 &gt; 저장 대화창에서 "파일형식(T)"에서 "Excel 97-2003 통합문서 (*.xls)"를 선택하신 후 저장하셔서 등록하세요.</p>
                      </div>
                    </div>
                  </>}
                </div>
              ) : (
                <select
                  value={filterInputMethod}
                  onChange={e => setFilterInputMethod(e.target.value)}
                  className="px-3 py-1.5 border-2 border-slate-400 rounded-lg text-xs font-medium text-slate-700"
                >
                  <option value="전체">전체</option>
                  <option value="은행">은행</option>
                  <option value="수기">수기</option>
                  <option value="일괄">일괄</option>
                  <option value="엑셀">엑셀</option>
                  <option value="분리">분리</option>
                  <option value="합산">합산</option>
                </select>
              )}
            </div>
            {(inputMode === '일괄수정' || inputMode === '건별등록' || inputMode === '상세등록') && <>
            <div className="relative flex items-center gap-1.5" ref={accountDropdownRef}>
              <label className="text-xs text-slate-500 font-medium whitespace-nowrap">계정과목</label>
              <div className="flex items-center gap-1">
                  {(['전체', '수입', '지출'] as const).map(g => (
                    <button
                      key={g}
                      onClick={() => {
                        setFilterAccountGroup(g)
                        setFilterAccount(g === '전체' ? '전체' : g === '수입' ? '수입전체' : '지출전체')
                        setShowAccountDropdown(true)
                      }}
                      className={`px-3 py-1.5 rounded-lg border-2 text-xs font-medium transition-colors flex items-center gap-1 ${
                        filterAccountGroup === g ? 'bg-white text-blue-700 border-blue-500 shadow-sm' : 'text-slate-500 border-slate-400 hover:text-slate-700'
                      }`}
                    >
                      {g === '전체' && filterAccountGroup === '전체' && filterAccount !== '전체' ? filterAccount
                        : g === '수입' && filterAccountGroup === '수입' && filterAccount !== '수입전체' ? filterAccount
                        : g === '지출' && filterAccountGroup === '지출' && filterAccount !== '지출전체' ? filterAccount
                        : g}
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
                    </button>
                  ))}
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
                            <span className="inline-block px-1 py-0 rounded bg-sky-200 text-sky-700 text-[12px] font-bold">세목</span>
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
                            <span className="inline-block px-1 py-0 rounded bg-rose-200 text-rose-700 text-[12px] font-bold">세목</span>
                            {a.label}
                          </span>
                        ) : a.label}
                      </button>
                    ))}
                  </>}
                </div>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <label className="text-xs text-slate-500 font-medium whitespace-nowrap">금액</label>
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={filterAmountFrom}
                  onChange={e => setFilterAmountFrom(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="최소"
                  className="w-24 px-2 py-1.5 border-2 border-slate-400 rounded-lg text-xs font-medium text-slate-700 text-center"
                />
                <span className="text-slate-400 text-sm">~</span>
                <input
                  type="text"
                  value={filterAmountTo}
                  onChange={e => setFilterAmountTo(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="최대"
                  className="w-24 px-2 py-1.5 border-2 border-slate-400 rounded-lg text-xs font-medium text-slate-700 text-center"
                />
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <label className="text-xs text-slate-500 font-medium whitespace-nowrap">검색</label>
              <select
                value={searchKey}
                onChange={e => setSearchKey(e.target.value as '적요' | '계정' | '결제방식' | '전표번호')}
                className="px-3 py-1.5 border-2 border-slate-400 rounded-lg text-xs font-medium text-slate-700 bg-slate-50"
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
                className="w-32 px-2 py-1.5 border-2 border-slate-400 rounded-lg text-xs font-medium text-slate-700"
              />
              <button className="px-5 py-1.5 text-xs font-bold text-white bg-[#f5b800] rounded-lg hover:bg-[#e5ab00] transition-colors">조회</button>
              <button onClick={() => {
                setFilterYearMonth('2026-03'); setFilterDayFrom(0); setFilterDayTo(0)
                setFilterType('전체'); setFilterAccountGroup('전체'); setFilterAccount('전체')
                setFilterInputMethod('전체'); setFilterAmountFrom(''); setFilterAmountTo('')
                setSearchKey('적요'); setSearchText(''); setSortMode('')
              }} className="px-5 py-1.5 text-xs font-semibold text-slate-600 bg-slate-200 rounded-lg hover:bg-slate-300 transition-colors">초기화</button>
            </div>
            </>}
        </div>
      </div>

      {/* 요약 데이터 */}
      {(
      <div className="flex items-center gap-3 px-2">
        <div className="flex items-center gap-3 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg">
          <span className="text-xs font-bold text-blue-700">수입</span>
          <span className="text-xs text-slate-600">합계 <strong className="text-blue-700">{fmt(totalIncome)}</strong></span>
          <span className="text-xs text-slate-600">전표 <strong className="text-blue-700">{filtered.filter(r => r.type === '수입').length}</strong></span>
          <span className="text-xs text-slate-600">정상 <strong className="text-blue-700">{filtered.filter(r => r.type === '수입' && r.amount >= 0).length}</strong></span>
          <span className="text-xs text-slate-600">반납 <strong className="text-amber-600">{filtered.filter(r => r.type === '수입' && r.amount < 0).length}</strong></span>
          <span className="text-xs text-slate-600">삭제 <strong className="text-slate-400">0</strong></span>
        </div>
        <div className="flex items-center gap-3 px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg">
          <span className="text-xs font-bold text-red-600">지출</span>
          <span className="text-xs text-slate-600">합계 <strong className="text-red-600">{fmt(totalExpense)}</strong></span>
          <span className="text-xs text-slate-600">전표 <strong className="text-red-600">{filtered.filter(r => r.type === '지출').length}</strong></span>
          <span className="text-xs text-slate-600">정상 <strong className="text-red-600">{filtered.filter(r => r.type === '지출' && r.amount >= 0).length}</strong></span>
          <span className="text-xs text-slate-600">반납 <strong className="text-amber-600">{filtered.filter(r => r.type === '지출' && r.amount < 0).length}</strong></span>
          <span className="text-xs text-slate-600">삭제 <strong className="text-slate-400">0</strong></span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg">
          <span className="text-xs font-bold text-emerald-700">회계잔액</span>
          <strong className="text-sm text-emerald-700">{fmt(totalIncome - totalExpense)}</strong>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg">
          <span className="text-xs font-bold text-slate-700">계좌잔액</span>
          <strong className="text-sm text-slate-700">{fmt(totalIncome - totalExpense)}</strong>
          <span className="text-[10px] text-sky-600 bg-sky-100 px-1.5 py-0.5 rounded-full">일치</span>
        </div>
      </div>
      )}

      {/* 툴바 */}
      <div className="border-b border-[#f5b800]/30 px-3 py-2 overflow-visible" ref={columnSettingsRef}>
        <div className="flex items-center">
        {/* 컬럼설정/기능키 */}
        {inputMode === '일괄수정' && <>
        <div className="relative">
          <button onClick={() => setShowColumnSettings(!showColumnSettings)}
            className={`px-3 py-2 rounded transition-colors flex items-center gap-1.5 text-xs font-bold ${showColumnSettings ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`} data-tip="컬럼 설정">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            컬럼설정
          </button>
          {showColumnSettings && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg p-3 z-50 w-[210px]">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-bold text-slate-700">컬럼 표시 설정</p>
                <button onClick={() => setShowColumnSettings(false)} className="p-1 text-slate-400 hover:text-slate-700">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              {columnOrder.map(([key, label, num], i) => {
                const fixedKeys = ['no', 'date', 'type', 'summary', 'amountGroup', 'accountGroup']
                const isFixed = fixedKeys.includes(key)
                const canMove = i >= 3
                return (
                <div key={key} className={`flex items-center gap-2 py-1 rounded px-1 ${isFixed ? '' : 'hover:bg-slate-50'}`}>
                  <span className="text-[10px] text-slate-400 w-5 text-right flex-shrink-0">{num}</span>
                  {isFixed ? (
                    <span className="w-3.5 h-3.5 flex items-center justify-center text-slate-400 text-[10px]">-</span>
                  ) : (
                    <input type="checkbox"
                      checked={visibleColumns[key as keyof typeof visibleColumns]}
                      onChange={() => setVisibleColumns(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }))}
                      className="rounded border-slate-300 text-blue-600 w-3.5 h-3.5 cursor-pointer" />
                  )}
                  <span className={`text-xs flex-1 ${isFixed ? 'text-slate-400' : 'text-slate-700'}`}>
                    {(key === 'evidence' || key === 'amountGroup' || key === 'accountGroup') && <span className="text-[9px] text-amber-500 mr-1">묶음</span>}
                    {label}
                  </span>
                  {canMove && (
                    <div className="flex flex-col gap-0">
                      <button onClick={() => { if (i <= 3) return; setColumnOrder(prev => { const n = [...prev]; [n[i-1], n[i]] = [n[i], n[i-1]]; return n }) }}
                        className={`p-0 ${i <= 3 ? 'text-slate-200' : 'text-slate-400 hover:text-slate-700'}`}>
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" /></svg>
                      </button>
                      <button onClick={() => { if (i >= columnOrder.length - 1) return; setColumnOrder(prev => { const n = [...prev]; [n[i], n[i+1]] = [n[i+1], n[i]]; return n }) }}
                        className={`p-0 ${i >= columnOrder.length - 1 ? 'text-slate-200' : 'text-slate-400 hover:text-slate-700'}`}>
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
                      </button>
                    </div>
                  )}
                </div>
              )})}
            </div>
          )}
        </div>
        <div className="w-px h-7 bg-slate-300 mx-2 flex-shrink-0" />
        <button
          onClick={() => setShowToolbar(!showToolbar)}
          className={`px-3 py-2 text-xs font-bold whitespace-nowrap rounded transition-colors flex items-center gap-1.5 ${
            showToolbar ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
          </svg>
          기능키
        </button>
        <div className="w-px h-7 bg-slate-300 mx-2 flex-shrink-0" />
        </>}
        {/* 전표입력방법 */}
        <div className="flex items-center gap-1">
          <span className="px-2 py-1.5 text-xs font-bold whitespace-nowrap text-slate-500">입력방법</span>
          {(['간편등록', '건별등록', '상세등록', '일괄수정'] as const).map(mode => (
            <button key={mode}
              onClick={() => { setInputMode(mode); if (mode === '간편등록') setFilterInputMethod('수기'); else setFilterInputMethod('전체') }}
              className={`px-5 py-1.5 text-[13px] font-bold whitespace-nowrap rounded-md border border-b-2 transition-colors ${
                inputMode === mode ? 'bg-white text-amber-900 shadow-sm border-amber-700 border-b-amber-700' : 'text-slate-400 border-slate-200 border-b-slate-200 hover:bg-white/70 hover:text-amber-600'
              }`}
            >{mode}</button>
          ))}
        </div>
        {/* 출력 그룹 */}
        {(inputMode === '일괄수정' || inputMode === '건별등록' || inputMode === '상세등록') && (
        <div className="flex items-center gap-1 ml-auto">
          <button data-tip="엑셀 다운로드" className="px-3 py-1.5 border border-green-400 rounded bg-green-50 hover:bg-green-100 text-green-700 sub-tab-hover flex items-center gap-1 text-xs font-bold">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M14.5 1H6a2 2 0 00-2 2v18a2 2 0 002 2h12a2 2 0 002-2V6.5L14.5 1zM14 2l5 5h-5V2zM7.5 17.5L10 13l-2.5-4.5h1.8L10.8 11l1.5-2.5h1.8L11.6 13l2.5 4.5h-1.8L10.8 15l-1.5 2.5H7.5z" />
            </svg>
            엑셀
          </button>
          <button data-tip="인쇄" className="px-3 py-1.5 border border-slate-300 rounded bg-white hover:bg-slate-50 text-slate-700 sub-tab-hover flex items-center gap-1 text-xs font-bold">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18.75 12h.008v.008h-.008V12zm-3 0h.008v.008h-.008V12z" />
            </svg>
            인쇄
          </button>
          {inputMode !== '건별등록' && inputMode !== '상세등록' && <button className="px-3 py-1.5 text-[12px] font-bold whitespace-nowrap border border-amber-400 rounded bg-amber-500 hover:bg-amber-600 text-white sub-tab-hover">저장</button>}
          {inputMode !== '건별등록' && inputMode !== '상세등록' && <button onClick={deleteRows} className="px-3 py-1.5 text-[12px] font-bold whitespace-nowrap border border-slate-300 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 sub-tab-hover">삭제</button>}
        </div>
        )}
        </div>
        {/* 기능키 펼침 - 언더바 아래 (일괄수정에서만) */}
        {(inputMode === '일괄수정' || inputMode === '건별등록' || inputMode === '상세등록') && showToolbar && (
          <div className="border-t border-slate-200 mt-2 pt-2 flex items-center flex-wrap gap-y-1">
            {/* 전표 그룹 */}
            <div className="flex items-center gap-1">
              <span className="px-2 py-1.5 text-xs font-bold whitespace-nowrap text-amber-700 bg-amber-100 rounded cursor-default">전표</span>
              <button onClick={() => { setInputMode('간편등록'); setFilterInputMethod('수기') }} data-tip="간편등록 화면으로 이동" className="px-3 py-1.5 text-[13px] font-bold whitespace-nowrap border border-slate-300 rounded bg-white hover:bg-slate-50 text-slate-700 sub-tab-hover">등록</button>
              <button data-tip="동일날짜에 선택된 전표를 1개 전표로 합산" className="px-3 py-1.5 text-[13px] font-bold whitespace-nowrap border border-slate-300 rounded bg-white hover:bg-slate-50 text-slate-700 sub-tab-hover">합산</button>
              <button data-tip="동일금액의 전표를 동일한 금액으로 분리" className="px-3 py-1.5 text-[13px] font-bold whitespace-nowrap border border-slate-300 rounded bg-white hover:bg-slate-50 text-slate-700 sub-tab-hover">일괄분리</button>
              <button data-tip="선택된 전표를 미계정상태로 전환" className="px-3 py-1.5 text-[13px] font-bold whitespace-nowrap border border-slate-300 rounded bg-white hover:bg-slate-50 text-slate-700 sub-tab-hover">미계정전환</button>
            </div>
            <div className="w-px h-7 bg-slate-300 mx-2 flex-shrink-0" />
            {/* 적요 그룹 */}
            <div className="flex items-center gap-1">
              <span className="px-2 py-1.5 text-xs font-bold whitespace-nowrap text-amber-700 bg-amber-100 rounded cursor-default">적요</span>
              <button data-tip="선택된 전표의 적요를 삭제" className="px-3 py-1.5 text-[13px] font-bold whitespace-nowrap border border-slate-300 rounded bg-white hover:bg-slate-50 text-slate-700 sub-tab-hover">삭제</button>
              <button data-tip="선택된 전표의 적요를 치환처리" className="px-3 py-1.5 text-[13px] font-bold whitespace-nowrap border border-slate-300 rounded bg-white hover:bg-slate-50 text-slate-700 sub-tab-hover">치환</button>
              <button data-tip="세목지정된 전표적요에 세목내용추가" className="px-3 py-1.5 text-[13px] font-bold whitespace-nowrap border border-slate-300 rounded bg-white hover:bg-slate-50 text-slate-700 sub-tab-hover">세목추가</button>
            </div>
            <div className="w-px h-7 bg-slate-300 mx-2 flex-shrink-0" />
            {/* 매핑 그룹 */}
            <div className="flex items-center gap-1">
              <span className="px-2 py-1.5 text-xs font-bold whitespace-nowrap text-pink-600 bg-pink-100 rounded cursor-default">매핑</span>
              <button data-tip="아동관리에 등록아동과 전표에 아동의 필요경비를 자동 매핑" className="tip-pink px-3 py-1.5 text-[13px] font-bold whitespace-nowrap border border-slate-300 rounded bg-white hover:bg-slate-50 text-slate-700 sub-tab-hover">원아경비</button>
              <button data-tip="기 설정된 조건에 부합하는 계정으로 동시매핑" className="tip-pink px-3 py-1.5 text-[13px] font-bold whitespace-nowrap border border-slate-300 rounded bg-white hover:bg-slate-50 text-slate-700 sub-tab-hover">거래처.적요.결제방식</button>
            </div>
            <div className="w-px h-7 bg-slate-300 mx-2 flex-shrink-0" />
            {/* 정렬 그룹 */}
            <div className="flex items-center gap-1">
              <span className="px-2 py-1.5 text-xs font-bold whitespace-nowrap text-green-600 bg-green-100 rounded cursor-default">
                정렬{sortMode && <span className="ml-1 text-green-800">({sortMode})</span>}
              </span>
              {(['수입부우선', '전표번호', '전체'] as const).map(mode => (
                <button key={mode}
                  onClick={() => {
                    setSortMode(mode)
                    if (mode === '수입부우선') {
                      setRows(prev => [...prev].sort((a, b) => a.date.localeCompare(b.date) || (a.type === '수입' ? -1 : 1)))
                    } else if (mode === '전표번호') {
                      setRows(prev => [...prev].sort((a, b) => a.id - b.id))
                    }
                  }}
                  className={`tip-green px-3 py-1.5 text-[13px] font-bold whitespace-nowrap border rounded sub-tab-hover ${
                    sortMode === mode ? 'border-green-500 bg-green-100 text-green-700' : 'border-slate-300 bg-white hover:bg-slate-50 text-slate-700'
                  }`}
                >{mode}</button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 간편등록 모드 */}
      {inputMode === '간편등록' && <SimpleInputPanel rows={rows} setRows={setRows} filterYearMonth={filterYearMonth} incomeAccounts={incomeAccounts} expenseAccounts={expenseAccounts} accountCodeMap={accountCodeMap} subAccountCodeMap={subAccountCodeMap} inputMethod={filterInputMethod} excelParsed={excelParsed} setExcelParsed={setExcelParsed} excelFileName={excelFileName} setExcelFileName={setExcelFileName} />}

      {/* 건별등록은 일괄수정과 동일한 테이블 사용 */}

      {inputMode === '상세등록' && (() => {
        const dr = draftRow
        if (!dr) return <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-400">전표 데이터가 없습니다</div>
        const origRow = rows.find(r => r.id === dr.id)
        const isDirty = origRow && (origRow.date !== dr.date || origRow.summary !== dr.summary || origRow.amount !== dr.amount || origRow.account !== dr.account || origRow.subAccount !== dr.subAccount || origRow.accountCode !== dr.accountCode || origRow.counterpart !== dr.counterpart || origRow.note !== dr.note)
        const checkedId = checked.size > 0 ? Array.from(checked).pop() : null
        const selectedIdx = checkedId ? filtered.findIndex(r => r.id === checkedId) : 0
        const accts = dr.type === '수입' ? incomeAccounts : expenseAccounts
        const parentCode = accountCodeMap[dr.account]
        const subAccts = accts.filter(a => a.isSub && a.value.startsWith('세목:') && (() => {
          if (!parentCode) return false
          const subCode = subAccountCodeMap[a.label] || subAccountCodeMap[a.label.replace('(지출)', '')]
          return subCode?.startsWith(parentCode)
        })())
        const inputCls = "w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400"
        const labelCls = "text-xs font-semibold text-slate-500 mb-1 block"
        const formatAmount = (val: string) => { const num = val.replace(/[^0-9-]/g, ''); return num ? Number(num).toLocaleString('ko-KR') : '' }
        return (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-bold text-slate-700">상세등록</h3>
                <span className="text-xs text-slate-400">전표 1건씩 선택하여 상세 수정</span>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => { const prev = selectedIdx > 0 ? filtered[selectedIdx - 1] : null; if (prev) { if (isDirty) saveDraft(); setChecked(new Set([prev.id])) } }}
                  className="px-2 py-0.5 text-[11px] text-slate-500 hover:text-slate-700 border border-slate-200 rounded bg-white">◀</button>
                <button onClick={() => { const next = filtered[selectedIdx + 1]; if (next) { if (isDirty) saveDraft(); setChecked(new Set([next.id])) } }}
                  className="px-2 py-0.5 text-[11px] text-slate-500 hover:text-slate-700 border border-slate-200 rounded bg-white">▶</button>
                <button onClick={() => saveDraft()}
                  className="px-3 py-1.5 text-[12px] font-bold whitespace-nowrap border border-amber-400 rounded bg-amber-500 hover:bg-amber-600 text-white sub-tab-hover ml-2">수정</button>
                <button onClick={() => { setRows(prev => prev.filter(r => r.id !== dr.id)); setDraftRow(null); setChecked(new Set()) }}
                  className="px-3 py-1.5 text-[12px] font-bold whitespace-nowrap border border-slate-300 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 sub-tab-hover">삭제</button>
              </div>
            </div>
            <div className="p-5">
              {/* 1행: 일자, 구분, 계정과목, 세목 */}
              <div className="grid grid-cols-[auto_auto_auto_auto_auto_auto] gap-4 mb-4">
                <div className="w-28 relative">
                  <label className={labelCls}>발의일자</label>
                  <button type="button"
                    onClick={() => setDetailDropdown(detailDropdown === 'detailDate' ? null : 'detailDate')}
                    className={`${inputCls} text-center cursor-pointer ${detailDropdown === 'detailDate' ? 'font-extrabold ring-2 ring-blue-400/30 border-blue-400' : ''}`}>
                    {dr.date.slice(5)}
                  </button>
                  {detailDropdown === 'detailDate' && (() => {
                    const [cy, cm] = dr.date.split('-').map(Number)
                    const dim = new Date(cy, cm, 0).getDate()
                    const firstDay = new Date(cy, cm - 1, 1).getDay()
                    const cd = parseInt(dr.date.slice(8, 10), 10)
                    return (
                      <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg p-3 z-50 w-[220px]"
                        onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-center mb-2">
                          <span className="text-xs font-bold text-slate-700">{cy}년 {cm}월</span>
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
                                  updateDraft('date', `${cy}-${String(cm).padStart(2,'0')}-${String(d).padStart(2,'0')}`)
                                  setDetailDropdown(null)
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
                </div>
                <div className="w-28 relative">
                  <label className={labelCls}>발행일자</label>
                  <button type="button"
                    onClick={() => setDetailDropdown(detailDropdown === 'issueDate' ? null : 'issueDate')}
                    className={`${inputCls} text-center cursor-pointer ${detailDropdown === 'issueDate' ? 'font-extrabold ring-2 ring-blue-400/30 border-blue-400' : ''}`}>
                    {dr.date.slice(5)}
                  </button>
                  {detailDropdown === 'issueDate' && (() => {
                    const [cy, cm] = dr.date.split('-').map(Number)
                    const dim = new Date(cy, cm, 0).getDate()
                    const firstDay = new Date(cy, cm - 1, 1).getDay()
                    const cd = parseInt(dr.date.slice(8, 10), 10)
                    return (
                      <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg p-3 z-50 w-[220px]"
                        onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-center mb-2">
                          <span className="text-xs font-bold text-slate-700">{cy}년 {cm}월</span>
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
                                  updateDraft('date', `${cy}-${String(cm).padStart(2,'0')}-${String(d).padStart(2,'0')}`)
                                  setDetailDropdown(null)
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
                </div>
                <div className="w-24">
                  <label className={labelCls}>전표구분</label>
                  <select value={dr.type} onChange={e => setDraftRow(prev => prev ? { ...prev, type: e.target.value as '수입' | '지출', account: '', subAccount: '' } : prev)}
                    className={`${inputCls} ${dr.type === '수입' ? 'text-blue-600 font-bold' : 'text-red-600 font-bold'}`}>
                    <option value="수입">수입</option>
                    <option value="지출">지출</option>
                  </select>
                </div>
                <div className="flex gap-1">
                  <div className="w-40">
                    <label className={labelCls}>계정과목</label>
                    <div className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 flex items-center gap-1">
                      {dr.account ? (<>
                        <span className={`inline-block px-1 py-0 rounded border text-[10px] font-bold ${dr.type === '수입' ? 'border-blue-300 text-blue-500' : 'border-red-300 text-red-500'}`}>목</span>
                        <span className={`font-bold ${dr.type === '수입' ? 'text-blue-600' : 'text-red-600'}`}>{dr.account}</span>
                      </>) : <span className="text-slate-300 font-normal">미선택</span>}
                    </div>
                  </div>
                  <div className="w-36">
                    <label className={labelCls}>세목</label>
                    <div className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 flex items-center gap-1">
                      {dr.subAccount ? (<>
                        <span className={`inline-block px-1 py-0 rounded border text-[10px] font-bold ${dr.type === '수입' ? 'border-blue-400 text-blue-600' : 'border-red-400 text-red-600'}`}>세목</span>
                        <span className={`font-bold ${dr.type === '수입' ? 'text-blue-700' : 'text-red-700'}`}>{dr.subAccount}</span>
                      </>) : <span className="text-slate-300">-</span>}
                    </div>
                  </div>
                </div>
                <div className="w-40 relative">
                  <label className={labelCls}>수입계정</label>
                  <button type="button" onClick={() => setDetailDropdown(detailDropdown === 'income' ? null : 'income')}
                    className={`w-full px-3 py-2 rounded-lg text-sm text-left cursor-pointer font-bold text-white bg-blue-500 hover:bg-blue-600 ${detailDropdown === 'income' ? 'ring-2 ring-blue-300' : ''}`}>
                    계정선택
                  </button>
                  {detailDropdown === 'income' && (
                    <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-[100] w-[220px] max-h-[320px] overflow-y-auto" onClick={e => e.stopPropagation()}>
                      {incomeAccounts.map(a => (
                        <button key={a.value} onClick={() => {
                          if (a.isSub) {
                            const idx = incomeAccounts.indexOf(a); let parent = ''
                            for (let i = idx - 1; i >= 0; i--) { if (!incomeAccounts[i].isSub) { parent = incomeAccounts[i].value; break } }
                            setDraftRow(prev => prev ? { ...prev, type: '수입', account: parent, subAccount: a.label } : prev)
                          } else {
                            setDraftRow(prev => prev ? { ...prev, type: '수입', account: a.value, subAccount: '' } : prev)
                          }
                          setDetailDropdown(null)
                        }} className={`w-full text-left px-3 py-1.5 text-xs transition-colors hover:bg-blue-50 text-blue-600 ${a.isSub ? 'pl-5' : ''}`}>
                          <span className="flex items-center gap-1">
                            <span className={`inline-block px-1 py-0 rounded border text-[10px] font-bold ${a.isSub ? 'bg-blue-500 text-white border-blue-500' : 'bg-blue-400 text-white border-blue-400'}`}>{a.isSub ? '세목' : '목'}</span>
                            {a.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="w-40 relative">
                  <label className={labelCls}>지출계정</label>
                  <button type="button" onClick={() => setDetailDropdown(detailDropdown === 'expense' ? null : 'expense')}
                    className={`w-full px-3 py-2 rounded-lg text-sm text-left cursor-pointer font-bold text-white bg-red-500 hover:bg-red-600 ${detailDropdown === 'expense' ? 'ring-2 ring-red-300' : ''}`}>
                    계정선택
                  </button>
                  {detailDropdown === 'expense' && (
                    <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-[100] w-[220px] max-h-[320px] overflow-y-auto" onClick={e => e.stopPropagation()}>
                      {expenseAccounts.map(a => (
                        <button key={a.value} onClick={() => {
                          if (a.isSub) {
                            const idx = expenseAccounts.indexOf(a); let parent = ''
                            for (let i = idx - 1; i >= 0; i--) { if (!expenseAccounts[i].isSub) { parent = expenseAccounts[i].value; break } }
                            setDraftRow(prev => prev ? { ...prev, type: '지출', account: parent, subAccount: a.label } : prev)
                          } else {
                            setDraftRow(prev => prev ? { ...prev, type: '지출', account: a.value, subAccount: '' } : prev)
                          }
                          setDetailDropdown(null)
                        }} className={`w-full text-left px-3 py-1.5 text-xs transition-colors hover:bg-red-50 text-red-600 ${a.isSub ? 'pl-5' : ''}`}>
                          <span className="flex items-center gap-1">
                            <span className={`inline-block px-1 py-0 rounded border text-[10px] font-bold ${a.isSub ? 'bg-red-500 text-white border-red-500' : 'bg-red-400 text-white border-red-400'}`}>{a.isSub ? '세목' : '목'}</span>
                            {a.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {/* 2행: 금액, 적요, 상세적요, 거래처, 결제방식, 증빙 */}
              <div className="grid grid-cols-[auto_1fr_1fr_auto_auto] gap-4">
                <div className="w-28">
                  <label className={labelCls}>금액</label>
                  <input type="text" value={formatAmount(String(dr.amount))} placeholder="0"
                    onChange={e => updateDraft('amount', Number(e.target.value.replace(/,/g, '')) || 0)}
                    className={`${inputCls} text-right font-medium`} />
                </div>
                <div>
                  <label className={labelCls}>적요</label>
                  <input type="text" value={dr.summary} placeholder="적요 입력"
                    onChange={e => updateDraft('summary', e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>상세적요</label>
                  <input type="text" placeholder="상세적요 입력" className={inputCls} />
                </div>
                <div className="w-28">
                  <label className={labelCls}>거래처</label>
                  <input type="text" value={dr.counterpart} placeholder="거래처"
                    onChange={e => updateDraft('counterpart', e.target.value)} className={inputCls} />
                </div>
                <div className="w-28">
                  <label className={labelCls}>결제방식</label>
                  <select value={dr.note} onChange={e => updateDraft('note', e.target.value)} className={inputCls}>
                    <option value="">선택</option>
                    <option value="계좌이체">계좌이체</option>
                    <option value="자동이체">자동이체</option>
                    <option value="카드결제">카드결제</option>
                    <option value="아이행복카드">아이행복카드</option>
                    <option value="현금결제">현금결제</option>
                    <option value="지로">지로</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {/* 건별등록 - 선택 전표 상세 (draftRow 기반 편집 + 저장하기) */}
      {inputMode === '건별등록' && (() => {
        const dr = draftRow
        if (!dr) return <div className="p-4 bg-[#fffbeb]/50 border border-[#f5b800]/30 rounded-xl text-center text-xs text-slate-400">전표 데이터가 없습니다</div>
        const checkedId = checked.size > 0 ? Array.from(checked).pop() : null
        const selectedIdx = checkedId ? filtered.findIndex(r => r.id === checkedId) : editingCell ? filtered.findIndex(r => r.id === editingCell.rowId) : 0
        const autoCode = dr.subAccount ? (subAccountCodeMap[dr.subAccount] || accountCodeMap[dr.account] || '') : (accountCodeMap[dr.account] || '')
        const inputCls = "w-full px-1 py-0.5 border-2 border-[#f5b800] rounded text-sm focus:ring-1 focus:ring-[#f5b800]/50 outline-none"
        const accts = dr.type === '수입' ? incomeAccounts : expenseAccounts
        // 원본과 비교해서 변경 여부 확인
        const origRow = rows.find(r => r.id === dr.id)
        const isDirty = origRow && (origRow.date !== dr.date || origRow.summary !== dr.summary || origRow.amount !== dr.amount || origRow.account !== dr.account || origRow.subAccount !== dr.subAccount || origRow.accountCode !== dr.accountCode || origRow.counterpart !== dr.counterpart || origRow.note !== dr.note)
        return (
          <div className="bg-white border border-[#f5b800]/30 rounded-xl overflow-x-auto single-input-mode">
            <div className="flex items-center gap-2 px-3 py-1.5 border-b border-[#f5b800]/20">
              <h3 className="text-sm font-bold text-slate-700">건별등록</h3>
              <span className="text-xs text-slate-400 flex items-center gap-1"><input type="checkbox" checked readOnly className="rounded border-slate-300 w-4 h-4" />전표 1건씩 선택하여 수정</span>
              <div className="flex items-center gap-1 ml-auto">
              <button onClick={() => { const prev = selectedIdx > 0 ? filtered[selectedIdx - 1] : null; if (prev) { if (isDirty) saveDraft(); setChecked(new Set([prev.id])) } }}
                className="px-2 py-0.5 text-[11px] text-slate-500 hover:text-slate-700 border border-slate-200 rounded bg-white">◀</button>
              <button onClick={() => { const next = filtered[selectedIdx + 1]; if (next) { if (isDirty) saveDraft(); setChecked(new Set([next.id])) } }}
                className="px-2 py-0.5 text-[11px] text-slate-500 hover:text-slate-700 border border-slate-200 rounded bg-white">▶</button>
              </div>
            </div>
            <div className="overflow-x-auto">
            <table className="text-sm w-full" style={{minWidth: '1400px', tableLayout: 'fixed'}}>
              <thead>
                <tr className="bg-[#fffbeb] border-b border-[#f5b800]/30">
                  {columnOrder.map(([key]) => {
                    if (!visibleColumns[key as keyof typeof visibleColumns]) return null
                    const thCls = "px-1.5 py-2 font-normal text-slate-700 text-center"
                    switch(key) {
                      case 'no': return <th key={key} className={`${thCls} w-[40px]`}>번호</th>
                      case 'date': return <th key={key} className={`${thCls} w-[62px]`}>일자</th>
                      case 'type': return <th key={key} className={`${thCls} w-[40px]`}>구분</th>
                      case 'summary': return <th key={key} className={`${thCls} w-[300px]`}>적요</th>
                      case 'evidence': return <React.Fragment key={key}><th className={`${thCls} w-[43px]`}>영수</th><th className={`${thCls} w-[43px]`}>이체</th><th className={`${thCls} w-[43px]`}>은행</th><th className={`${thCls} w-[53px]`}>증빙</th></React.Fragment>
                      case 'register': return <th key={key} className={`${thCls} w-[43px]`}>등록</th>
                      case 'attach': return <th key={key} className={`${thCls} w-[43px]`}>첨부</th>
                      case 'amountGroup': return <React.Fragment key={key}>
                        <th className={`${thCls} w-[160px]`}>수입</th>
                        <th className={`${thCls} w-[160px]`}>지출</th>
                      </React.Fragment>
                      case 'accountGroup': return <React.Fragment key={key}><th className={`${thCls} w-[130px]`}>계정과목</th><th className={`${thCls} w-[68px]`}>세목</th><th className={`${thCls} w-[70px]`}>계정코드</th><th className={`${thCls} w-[80px]`}>반납</th></React.Fragment>
                      case 'fee': return null
                      case 'counterpart': return <th key={key} className={`${thCls} w-[78px]`}>거래처</th>
                      case 'payment': return <th key={key} className={`${thCls} w-[78px]`}>결제방식</th>
                      case 'child': return <React.Fragment key={key}><th className={`${thCls} w-[36px]`}>원아</th><th className={`${thCls} w-[100px]`}></th></React.Fragment>
                      case 'sort': return null
                      default: return null
                    }
                  })}
                </tr>
              </thead>
              <tbody>
                <tr className="bg-white [&>td]:align-middle">
                  {columnOrder.map(([key]) => {
                    if (!visibleColumns[key as keyof typeof visibleColumns]) return null
                    switch(key) {
                      case 'no': return <td key={key} className="px-1 py-1 text-center text-xs text-slate-400">{(selectedIdx >= 0 ? selectedIdx : 0) + 1}</td>
                      case 'date': return <td key={key} className="px-1 py-1"><input type="text" value={dr.date.slice(5)} onChange={e => { const val = e.target.value.replace(/[^0-9-]/g, ''); if (val.match(/^\d{2}-\d{2}$/)) updateDraft('date', `${filterYearMonth.slice(0,4)}-${val}`) }} className={`${inputCls} text-center`} /></td>
                      case 'type': return <td key={key} className="px-1 py-1 text-center">{(() => {
                        const m = dr.inputMethod || '수기'
                        const st: Record<string, string> = { '은행':'bg-white text-slate-700 border-slate-700', '수기':'bg-white text-blue-600 border-blue-500', '일괄':'bg-white text-orange-600 border-orange-500', '엑셀':'bg-white text-yellow-700 border-yellow-600', '분리':'bg-white text-purple-600 border-purple-500', '합산':'bg-white text-green-700 border-green-600' }
                        return <span className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded border text-[11px] font-bold ${st[m] || 'bg-white text-slate-600 border-slate-400'}`}>{m}</span>
                      })()}</td>
                      case 'summary': return <td key={key} className="px-1 py-1" style={{display: 'flex', alignItems: 'center'}}>
                        <button onClick={e => { e.stopPropagation(); startVoice(dr.id) }}
                          className={`shrink-0 w-4 h-4 flex items-center justify-center rounded-full transition-all mr-1 ${listeningRowId === dr.id ? 'bg-red-500 animate-pulse' : 'bg-slate-200 hover:bg-blue-500 group'}`}>
                          <svg className={`w-2.5 h-2.5 ${listeningRowId === dr.id ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                          </svg>
                        </button>
                        <input type="text" value={dr.summary} onChange={e => updateDraft('summary', e.target.value)} className={`${inputCls} flex-1`} />
                      </td>
                      case 'evidence': return <React.Fragment key={key}>
                        <td className="text-center px-0 py-1">{(dr.note.includes('현금')||dr.note.includes('지로')) && <svg className="w-5 h-5 mx-auto text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" /></svg>}</td>
                        <td className="text-center px-0 py-1">{dr.note.includes('이체') && <svg className="w-5 h-5 mx-auto text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>}</td>
                        <td className="text-center px-0 py-1">{dr.approved && <svg className="w-5 h-5 mx-auto text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" /></svg>}</td>
                        <td className="text-center px-0 py-1">{dr.evidence && dr.evidence.length > 0 ? dr.evidence.map(ev => <span key={ev} className="inline-block px-1 py-0 rounded border text-[10px] mr-0.5">{ev}</span>) : '-'}</td>
                      </React.Fragment>
                      case 'register': return <td key={key} className="text-center px-0 py-1">
                        <svg className="w-5 h-5 mx-auto text-slate-400 hover:text-blue-600 cursor-pointer" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                      </td>
                      case 'attach': return <td key={key} className="text-center px-0 py-1">
                        <svg className="w-5 h-5 mx-auto text-slate-400 hover:text-blue-600 cursor-pointer" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" /></svg>
                      </td>
                      case 'amountGroup': return <React.Fragment key={key}>
                        <td className="px-1 py-1">{dr.type === '수입' ? <input type="text" value={fmt(dr.amount)} onChange={e => updateDraft('amount',Number(e.target.value.replace(/,/g,''))||0)} className={`${inputCls} text-right font-medium text-blue-600`}/> : null}</td>
                        <td className="px-1 py-1">{dr.type === '지출' ? <input type="text" value={fmt(dr.amount)} onChange={e => updateDraft('amount',Number(e.target.value.replace(/,/g,''))||0)} className={`${inputCls} text-right font-medium text-red-600`}/> : null}</td>
                      </React.Fragment>
                      case 'accountGroup': return <React.Fragment key={key}>
                        <td className="px-1 py-1"><select value={dr.account} onChange={e => updateDraft('account',e.target.value)} className={`${inputCls} ${dr.type==='수입'?'text-blue-600':'text-red-600'}`}><option value="">선택</option>{accts.filter(a=>!a.isSub).map(a=><option key={a.value} value={a.value}>{a.label}</option>)}</select></td>
                        <td className="px-1 py-1"><input type="text" value={dr.subAccount||''} readOnly className={`${inputCls} bg-slate-50 text-slate-500`}/></td>
                        <td className="px-1 py-1"><input type="text" value={dr.accountCode||autoCode||''} onChange={e => { const code=e.target.value.replace(/[^0-9]/g,'').slice(0,5); updateDraft('accountCode',code); const found=codeToAccount[code]; if(found){setDraftRow(prev => prev ? {...prev, accountCode: code, account: found.account, subAccount: found.subAccount} : prev)} }} className={`${inputCls} text-center font-mono ${dr.type==='수입'?'text-blue-600':'text-red-600'}`}/></td>
                        <td className="text-center px-1 py-1">
                          <button onClick={() => {
                            if (dr.amount < 0) {
                              setDraftRow(prev => prev ? { ...prev, type: prev.type === '수입' ? '지출' : '수입', amount: Math.abs(prev.amount) } : prev)
                            } else {
                              setDraftRow(prev => prev ? { ...prev, type: prev.type === '수입' ? '지출' : '수입', amount: -Math.abs(prev.amount), account: '', subAccount: '', accountCode: '' } : prev)
                            }
                          }} className={`px-1.5 py-1 text-xs font-medium border rounded ${dr.amount < 0 ? 'border-amber-400 bg-amber-50 text-amber-700' : 'border-slate-300 bg-white hover:bg-slate-50 text-slate-600'}`}>{dr.amount < 0 ? '반납' : '전표'}</button>
                        </td>
                      </React.Fragment>
                      case 'fee': return null
                      case 'counterpart': return <td key={key} className="px-1 py-1"><input type="text" value={dr.counterpart} onChange={e => updateDraft('counterpart',e.target.value)} className={inputCls}/></td>
                      case 'payment': return <td key={key} className="px-1 py-1"><select value={dr.note} onChange={e => updateDraft('note',e.target.value)} className={inputCls}><option value="">::선택::</option><option value="카드결제">카드결제</option><option value="아이행복카드">아이행복카드</option><option value="계좌이체">계좌이체</option><option value="자동이체">자동이체</option><option value="지로">지로</option><option value="현금결제">현금결제</option><option value="기타">기타</option></select></td>
                      case 'child': return <React.Fragment key={key}>
                        <td className="px-1 py-1 text-center text-xs text-slate-400">-</td>
                        <td className="px-1 py-1 text-center">
                          <div className="flex items-center gap-1 justify-center">
                            <button onClick={() => saveDraft()}
                              className="px-3 py-1.5 text-[12px] font-bold whitespace-nowrap border border-amber-400 rounded bg-amber-500 hover:bg-amber-600 text-white sub-tab-hover">수정</button>
                            <button onClick={() => { setRows(prev => prev.filter(r => r.id !== dr.id)); setDraftRow(null); setChecked(new Set()) }}
                              className="px-3 py-1.5 text-[12px] font-bold whitespace-nowrap border border-slate-300 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 sub-tab-hover">삭제</button>
                          </div>
                        </td>
                      </React.Fragment>
                      case 'sort': return null
                      default: return null
                    }
                  })}
                </tr>
              </tbody>
            </table>
            </div>
          </div>
        )
      })()}

      {/* 전표 테이블 (일괄수정/건별등록) */}
      {(inputMode === '일괄수정' || inputMode === '건별등록' || inputMode === '상세등록') && <div className="bg-white rounded-xl border border-[#f5b800]/30 shadow-sm relative single-input-mode">
        <style>{`
          .single-input-mode tbody tr { border-bottom: 1px solid #f8f8f8 !important; }
          .single-input-mode tbody td, .single-input-mode thead th { white-space: nowrap; }
          .single-input-mode tbody td { padding: 4px 6px !important; vertical-align: middle; }
          .single-input-mode td[data-cell="date"],
          .single-input-mode td[data-cell="summary"],
          .single-input-mode td[data-cell="income"],
          .single-input-mode td[data-cell="expense"],
          .single-input-mode td[data-cell="account"],
          .single-input-mode td[data-cell="sub"],
          .single-input-mode td[data-cell="accountCode"],
          .single-input-mode td[data-cell="counterpart"],
          .single-input-mode td[data-cell="payment"] {
            padding: 4px 6px !important;
          }
          .single-input-mode td[data-cell] { padding: 4px 8px !important; }
          .single-input-mode td[data-cell] > span,
          .single-input-mode td[data-cell] > div:not(.absolute) {
            border: 1px solid rgba(245,184,0,0.3); border-radius: 4px; padding: 4px 8px; min-height: 30px; display: flex; align-items: center; justify-content: inherit;
          }
          .single-input-mode td[data-cell] > button { border: none !important; }
          .single-input-mode td[data-cell="income"] > span,
          .single-input-mode td[data-cell="expense"] > span {
            justify-content: flex-end; width: 100%;
          }
          .single-input-mode td[data-cell="date"] > span {
            justify-content: center;
          }
          .single-input-mode td[data-cell="account"] > span,
          .single-input-mode td[data-cell="sub"] > span,
          .single-input-mode td[data-cell="accountCode"] > span {
            justify-content: center;
          }
        `}</style>
        <div className="max-h-[calc(100vh-380px)] overflow-y-auto overflow-x-auto">
          <table className="text-sm w-full" style={{minWidth: '1400px', tableLayout: 'fixed'}}>
            <thead className="sticky top-0 z-10">
              <tr className="bg-[#fffbeb] border-b border-[#f5b800]/30">
                <th className="text-center px-1.5 py-2 font-normal text-slate-700 w-[34px]">
                  <input type="checkbox" className="rounded border-slate-300 w-4 h-4" checked={checked.size === filtered.length && filtered.length > 0} onChange={toggleAll} />
                </th>
                {columnOrder.map(([key]) => {
                  if (!visibleColumns[key as keyof typeof visibleColumns]) return null
                  switch (key) {
                    case 'no': return <th key={key} className="text-center px-1.5 py-2 font-normal text-slate-700 w-[40px]">번호</th>
                    case 'date': return <th key={key} className="text-center px-1 py-2 font-normal text-slate-700 w-[62px]">일자</th>
                    case 'type': return <th key={key} className="text-center px-0.5 py-2 font-normal text-slate-700 w-[40px]">구분</th>
                    case 'summary': return <th key={key} className="text-center px-1.5 py-2 font-normal text-slate-700 w-[300px]">적요</th>
                    case 'evidence': return <React.Fragment key={key}>
                      <th className="text-center px-1.5 py-2 font-normal text-slate-700 w-[43px]">영수</th>
                      <th className="text-center px-1.5 py-2 font-normal text-slate-700 w-[43px]">이체</th>
                      <th className="text-center px-1.5 py-2 font-normal text-slate-700 w-[43px]">은행</th>
                      <th className="text-center px-1.5 py-2 font-normal text-slate-700 w-[53px] relative group cursor-help"><span className="whitespace-nowrap">증빙<span className="text-blue-400 text-[10px]">ⓘ</span></span>
                        <div className="hidden group-hover:block absolute top-full left-1/2 -translate-x-1/2 mt-1 bg-blue-100 text-blue-800 text-[10px] font-normal rounded-lg px-3 py-2 z-50 w-[140px] shadow-lg border border-blue-200">
                          <p className="font-bold mb-1">국세청</p>
                          <p>세금계산서 · 계산서 · 현금영수증</p>
                          <p className="font-bold mt-1.5 mb-1">쇼핑몰</p>
                          <p>쿠팡 · 네이버 · 11번가 · 지마켓 · 옥션 · 오아시스</p>
                          <p className="font-bold mt-1.5 mb-1">4대보험</p>
                          <p>국민연금 · 건강보험 · 고용보험 · 산재보험</p>
                          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-blue-100 border-l border-t border-blue-200 rotate-45"></div>
                        </div>
                      </th>
                    </React.Fragment>
                    case 'register': return <th key={key} className="text-center px-1.5 py-2 font-normal text-slate-700 w-[43px]">등록</th>
                    case 'attach': return <th key={key} className="text-center px-1.5 py-2 font-normal text-slate-700 w-[43px]">첨부</th>
                    case 'amountGroup': return <React.Fragment key={key}>
                                            <th className="text-center px-1.5 py-2 font-normal text-slate-700 w-[160px]">수입</th>
                      <th className="text-center px-1.5 py-2 font-normal text-slate-700 w-[160px]">지출</th>
                      <th className="text-center px-1.5 py-2 font-normal text-slate-700 w-[130px]">잔액</th>
                    </React.Fragment>
                    case 'accountGroup': return <React.Fragment key={key}>
                      {inputMode !== '건별등록' && inputMode !== '상세등록' && <th className="text-center px-1 py-2 font-normal text-slate-700 w-[40px]">복사</th>}
                      <th className={`text-center px-1.5 py-2 font-normal text-slate-700 ${(inputMode === '건별등록' || inputMode === '상세등록') ? 'w-[180px]' : 'w-[130px]'}`}>계정과목</th>
                      <th className={`text-center px-0.5 py-2 font-normal text-slate-700 ${(inputMode === '건별등록' || inputMode === '상세등록') ? 'w-[100px]' : 'w-[68px]'}`}>세목</th>
                      <th className={`text-center px-1.5 py-2 font-normal text-slate-700 ${(inputMode === '건별등록' || inputMode === '상세등록') ? 'w-[90px]' : 'w-[70px]'}`}>계정코드</th>
                      {inputMode !== '건별등록' && inputMode !== '상세등록' && <th className="text-center px-1.5 py-2 font-normal text-slate-700 w-[46px]">분리</th>}
                      {inputMode !== '건별등록' && inputMode !== '상세등록' && <th className="text-center px-1 py-2 font-normal text-slate-700 w-[80px]">반납</th>}
                    </React.Fragment>
                    case 'fee': return (inputMode === '건별등록' || inputMode === '상세등록') ? null : <th key={key} className="text-center px-1.5 py-2 font-normal text-slate-700 w-[50px]">수수료</th>
                    case 'counterpart': return <th key={key} className="text-center px-1.5 py-2 font-normal text-slate-700 w-[78px]">거래처</th>
                    case 'payment': return <th key={key} className="text-center px-1.5 py-2 font-normal text-slate-700 w-[78px]">결제방식</th>
                    case 'child': return <th key={key} className="text-center px-1 py-2 font-normal text-slate-700 w-[36px]">원아</th>
                    case 'sort': return <th key={key} className="text-center px-1 py-2 font-normal text-slate-700 w-[36px]">정렬</th>
                    default: return null
                  }
                })}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, idx) => {
                const isCell = (field: string) => editingCell?.rowId === row.id && editingCell?.field === field
                const cellClick = (field: string) => (e: React.MouseEvent) => {
                  e.stopPropagation()
                  if (inputMode === '건별등록' || inputMode === '상세등록') { setChecked(new Set([row.id])); return }
                  setEditingCell(isCell(field) ? null : { rowId: row.id, field })
                }
                const isRefund = row.amount < 0
                const cellBorder = (inputMode === '건별등록' || inputMode === '상세등록') ? 'border border-[#f5b800]/30 rounded px-2 py-1.5' : ''
                return (
                  <tr
                    key={row.id}
                    onClick={(inputMode === '건별등록' || inputMode === '상세등록') ? () => setChecked(new Set([row.id])) : undefined}
                    className={`transition-colors ${(inputMode === '건별등록' || inputMode === '상세등록') ? 'cursor-pointer' : ''} ${
                      isRefund ? 'bg-red-50/50 border-b border-red-100' : editingCell?.rowId === row.id ? 'bg-[#fffbeb]' : checked.has(row.id) ? 'bg-[#fffbeb]/60' : `${idx % 2 === 1 ? 'bg-[#fffbeb]/30' : 'bg-white'} hover:bg-[#fffbeb] border-b border-slate-50`
                    }`}
                  >
                    <td className="text-center px-2 py-1">
                      <input type="checkbox" className="rounded border-slate-300 w-4 h-4" checked={checked.has(row.id)} onClick={e => e.stopPropagation()} onChange={() => { if (inputMode === '건별등록' || inputMode === '상세등록') { setChecked(new Set([row.id])) } else { toggleCheck(row.id) } }} />
                    </td>
                    {/* Dynamic columns rendered in columnOrder */}
                    {columnOrder.map(([key]) => {
                      if (!visibleColumns[key as keyof typeof visibleColumns]) return null
                      switch (key) {
                        case 'no':
                          return <td key={key} className="text-center px-2 py-1 text-slate-400">{idx + 1}</td>

                        case 'date':
                          return <td key={key} data-cell="date" className="text-center px-2 py-1 cursor-pointer relative whitespace-nowrap" onClick={cellClick('date')}>
                            <span className={`text-slate-700 block text-center ${isCell('date') ? 'font-extrabold text-slate-900 bg-white px-1.5 py-0.5 rounded' : ''}`}>{row.date.slice(5)}</span>
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
                          </td>

                        case 'type':
                          return <td key={key} className="text-center px-0.5 py-1">
                            {(() => {
                              const m = row.inputMethod || '수기'
                              const styles: Record<string, string> = {
                                '은행': 'bg-white text-slate-700 border-slate-700',
                                '수기': 'bg-white text-blue-600 border-blue-500',
                                '일괄': 'bg-white text-orange-600 border-orange-500',
                                '엑셀': 'bg-white text-yellow-700 border-yellow-600',
                                '분리': 'bg-white text-purple-600 border-purple-500',
                                '합산': 'bg-white text-green-700 border-green-600',
                              }
                              return <span className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded border text-[11px] font-bold ${styles[m] || ''}`}>{m}</span>
                            })()}
                          </td>

                        case 'summary':
                          return <td key={key} data-cell="summary" className="px-2 py-1 cursor-pointer" onClick={cellClick('summary')} style={{display: 'flex', alignItems: 'center'}}>
                            {inputMode !== '건별등록' && inputMode !== '상세등록' && <button
                              onClick={(e) => { e.stopPropagation(); startVoice(row.id) }}
                              className={`shrink-0 w-4 h-4 flex items-center justify-center rounded-full transition-all mr-1 ${
                                listeningRowId === row.id
                                  ? 'bg-red-500 animate-pulse'
                                  : 'bg-slate-200 hover:bg-blue-500 group'
                              }`}
                            >
                              <svg className={`w-2.5 h-2.5 ${listeningRowId === row.id ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                              </svg>
                            </button>}
                            {isCell('summary') ? (
                              <div onClick={e => e.stopPropagation()}>
                                <textarea value={row.summary} autoFocus rows={3}
                                  ref={el => { if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length) } }}
                                  onChange={e => updateRow(row.id, 'summary', e.target.value)}
                                  onKeyDown={e => {
                                    if (e.key === 'Tab') {
                                      e.preventDefault()
                                      const nextRow = filtered[idx + 1]
                                      if (nextRow) {
                                        setEditingCell({ rowId: nextRow.id, field: 'summary' })
                                      } else {
                                        setEditingCell(null)
                                      }
                                    }
                                  }}
                                  className="w-full px-2 py-1.5 border-2 border-[#f5b800] rounded text-xs text-slate-700 focus:ring-1 focus:ring-[#f5b800]/50 outline-none resize-none bg-white" />
                                <div className="flex items-center justify-end mt-1 gap-2">
                                  <span className="text-[10px] text-slate-400">{row.summary.length}자</span>
                                  <button onClick={() => setEditingCell(null)} className="text-[10px] text-slate-400 hover:text-slate-700 font-medium">닫기</button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 flex-1">
                                <span className="text-slate-700 text-sm truncate flex-1 py-0.5">{row.summary || '-'}</span>
                              </div>
                            )}
                          </td>

                        case 'evidence':
                          return <React.Fragment key={key}>
                            {/* 영수 - 현금결제/지로 (카메라 아이콘) */}
                            <td className="text-center px-0 py-1">
                              {(row.note.includes('현금') || row.note.includes('지로')) && (
                                <svg className="w-5 h-5 mx-auto text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                                </svg>
                              )}
                            </td>
                            {/* 이체 - 계좌이체/자동이체 (이체증 아이콘) */}
                            <td className="text-center px-0 py-1">
                              {row.note.includes('이체') && (
                                <svg className="w-5 h-5 mx-auto text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                                </svg>
                              )}
                            </td>
                            {/* 은행 - 은행거래내역 (서류 아이콘) */}
                            <td className="text-center px-0 py-1">
                              {row.approved && (
                                <svg className="w-5 h-5 mx-auto text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
                                </svg>
                              )}
                            </td>
                            {/* 증빙 - evidence 배열 기반 뱃지 */}
                            <td className="text-center px-0 py-1">
                              {row.evidence && row.evidence.length > 0 && (
                                <div className="flex flex-wrap items-center justify-center gap-0.5">
                                  {row.evidence.map(ev => {
                                    const iconEvidence = ['세금계산서', '계산서', '현금영수증']
                                    if (iconEvidence.includes(ev)) {
                                      const bgColor = ev === '세금계산서' ? 'bg-blue-200 border-blue-400' : ev === '계산서' ? 'bg-amber-200 border-amber-400' : 'bg-emerald-200 border-emerald-400'
                                      return (
                                        <span key={ev} className={`inline-flex items-center justify-center rounded border p-0.5 ${bgColor}`} title={ev}>
                                          <img src="/hometax-favicon.ico" alt="홈택스" className="w-4 h-4 object-contain" />
                                        </span>
                                      )
                                    }
                                    const labels: Record<string, [string, string]> = {
                                      '쿠팡': ['C', 'bg-rose-100 text-rose-600'],
                                      '네이버': ['N', 'bg-green-100 text-green-700'],
                                      '11번가': ['11', 'bg-red-100 text-red-600'],
                                      '지마켓': ['G', 'bg-green-100 text-green-700'],
                                      '옥션': ['A', 'bg-orange-100 text-orange-600'],
                                      '오아시스': ['O', 'bg-lime-100 text-lime-700'],
                                    }
                                    const faviconMap: Record<string, [string, string]> = {
                                      '4대보험': ['/nhis-favicon.ico', 'border-red-300'],
                                      '쿠팡': ['/coupang-favicon.png', 'border-rose-300'],
                                      '네이버': ['/naver-favicon.ico', 'border-green-300'],
                                      '11번가': ['/11st-favicon.ico', 'border-red-300'],
                                      '지마켓': ['/gmarket-favicon.png', 'border-green-300'],
                                      '옥션': ['/auction-favicon.png', 'border-orange-300'],
                                      '오아시스': ['/oasis-favicon.png', 'border-lime-300'],
                                    }
                                    const fav = faviconMap[ev]
                                    if (fav) {
                                      return (
                                        <span key={ev} className={`inline-flex items-center justify-center rounded border p-0.5 bg-white ${fav[1]}`} title={ev}>
                                          <img src={fav[0]} alt={ev} className="w-4 h-4 object-contain" />
                                        </span>
                                      )
                                    }
                                    return null
                                  })}
                                </div>
                              )}
                            </td>
                          </React.Fragment>

                        case 'register':
                          return <td key={key} className="text-center px-0 py-1">
                            <div className="flex items-center justify-center gap-0.5">
                              {row.approved ? (<>
                                <button onClick={e => e.stopPropagation()} className="text-slate-900">
                                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                                </button>
                                <span className="text-[11px] text-slate-900">1</span>
                                <button onClick={e => e.stopPropagation()} className="text-slate-700 hover:text-slate-900" data-tip="미리보기">
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
                                </button>
                              </>) : (
                                <button onClick={e => e.stopPropagation()} className="text-slate-300 hover:text-slate-500 transition-colors">
                                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                                </button>
                              )}
                            </div>
                          </td>

                        case 'attach':
                          return <td key={key} className="text-center px-0 py-1">
                            <div className="flex items-center justify-center gap-0.5">
                              {row.approved ? (<>
                                <button onClick={e => e.stopPropagation()} className="text-slate-900">
                                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" /></svg>
                                </button>
                                <span className="text-[11px] text-slate-900">2</span>
                                <button onClick={e => e.stopPropagation()} className="text-slate-700 hover:text-slate-900" data-tip="미리보기">
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
                                </button>
                              </>) : (
                                <button onClick={e => e.stopPropagation()} className="text-slate-300 hover:text-slate-500 transition-colors">
                                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" /></svg>
                                </button>
                              )}
                            </div>
                          </td>

                        case 'amountGroup':
                          return <React.Fragment key={key}>
                            <td data-cell="income" className="text-right px-3 py-1 cursor-pointer" onClick={row.type === '수입' ? cellClick('amount') : undefined}>
                              {row.type === '수입' ? (
                                isCell('amount') ? (
                                  <input type="text" value={fmt(row.amount)} autoFocus
                                    onChange={e => updateRow(row.id, 'amount', Number(e.target.value.replace(/,/g, '')) || 0)}
                                    onBlur={() => setEditingCell(null)}
                                    onClick={e => e.stopPropagation()}
                                    className="w-full px-1 py-0.5 border-2 border-[#f5b800] rounded text-xs text-right focus:ring-1 focus:ring-[#f5b800]/50 outline-none" />
                                ) : (
                                  <span className="font-medium text-blue-700">{fmt(row.amount)}</span>
                                )
                              ) : null}
                            </td>
                            <td data-cell="expense" className="text-right px-3 py-1 cursor-pointer" onClick={row.type === '지출' ? cellClick('amount') : undefined}>
                              {row.type === '지출' ? (
                                isCell('amount') ? (
                                  <input type="text" value={fmt(row.amount)} autoFocus
                                    onChange={e => updateRow(row.id, 'amount', Number(e.target.value.replace(/,/g, '')) || 0)}
                                    onBlur={() => setEditingCell(null)}
                                    onClick={e => e.stopPropagation()}
                                    className="w-full px-1 py-0.5 border-2 border-[#f5b800] rounded text-xs text-right focus:ring-1 focus:ring-[#f5b800]/50 outline-none" />
                                ) : (
                                  <span className="font-medium text-red-600">{fmt(row.amount)}</span>
                                )
                              ) : null}
                            </td>
                            <td className="text-right px-3 py-1">
                              {(() => {
                                let balance = 0
                                for (let i = 0; i <= idx; i++) {
                                  const r = filtered[i]
                                  if (r.type === '수입') balance += r.amount
                                  else balance -= r.amount
                                }
                                return <span className="font-medium text-sm text-slate-700">{fmt(balance)}</span>
                              })()}
                            </td>
                          </React.Fragment>

                        case 'accountGroup':
                          return <React.Fragment key={key}>
                            {/* 복사 */}
                            {inputMode !== '건별등록' && inputMode !== '상세등록' && <td className="text-center px-1 py-1">
                              {(() => {
                                const copiedRow = rows.find(r => r.copySelected)
                                if (row.copySelected) {
                                  return <button onClick={e => { e.stopPropagation(); setRows(prev => prev.map(r => r.id === row.id ? { ...r, copySelected: false } : r)) }}
                                    className="px-1.5 py-1 text-xs font-medium border border-blue-500 rounded bg-blue-100 text-blue-700 transition-colors">복사</button>
                                }
                                if (copiedRow) {
                                  if (copiedRow.type !== row.type && row.amount > 0) return null
                                  if (copiedRow.type === row.type) {
                                    if (row.account === copiedRow.account && row.subAccount === copiedRow.subAccount) return null
                                    return <button onClick={e => { e.stopPropagation(); setRows(prev => prev.map(r => r.id === row.id ? { ...r, account: copiedRow.account, subAccount: copiedRow.subAccount } : r)) }}
                                      className="px-1.5 py-1 text-xs font-medium border border-amber-400 rounded bg-amber-50 hover:bg-amber-100 text-amber-700 transition-colors">붙임</button>
                                  }
                                  return null
                                }
                                return <button onClick={e => { e.stopPropagation(); setRows(prev => prev.map(r => r.id === row.id ? { ...r, copySelected: true } : r)) }}
                                  className="px-1.5 py-1 text-xs font-medium border border-slate-300 rounded bg-white hover:bg-slate-50 text-slate-600 transition-colors">복사</button>
                              })()}
                            </td>}
                            {/* 계정과목 */}
                            <td data-cell="account" className="text-center px-2 py-1 cursor-pointer relative" onClick={cellClick('account')}>
                              {isCell('account') ? (
                                <div className="absolute left-full ml-2 top-0 bg-white border border-slate-200 rounded-xl shadow-lg z-[100] w-[220px] max-h-[320px] overflow-y-auto" onClick={e => e.stopPropagation()}>
                                  {(row.type === '수입' ? incomeAccounts : expenseAccounts).map(a => {
                                    const isSelected = a.isSub ? row.subAccount === a.label : row.account === a.value
                                    const color = row.type === '수입' ? 'blue' : 'red'
                                    return (
                                      <button key={a.value}
                                        onClick={() => {
                                          const list = row.type === '수입' ? incomeAccounts : expenseAccounts
                                          if (a.isSub) {
                                            const idx = list.indexOf(a)
                                            let parentAccount = row.account
                                            for (let i = idx - 1; i >= 0; i--) {
                                              if (!list[i].isSub) { parentAccount = list[i].value; break }
                                            }
                                            updateRow(row.id, 'account', parentAccount)
                                            updateRow(row.id, 'subAccount', a.label)
                                          } else {
                                            updateRow(row.id, 'account', a.value)
                                            updateRow(row.id, 'subAccount', '')
                                          }
                                          setEditingCell(null)
                                          setRows(prev => prev.map(r => ({ ...r, copySelected: r.id === row.id })))
                                        }}
                                        className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                                          isSelected ? `bg-${color}-100 font-bold text-${color}-700` : `hover:bg-${color}-50 text-${color === 'blue' ? 'blue' : 'red'}-600`
                                        } ${a.isSub ? 'pl-5' : ''}`}>
                                        {a.isSub ? (
                                          <span className="flex items-center gap-1">
                                            <span className={`inline-block px-1 py-0 rounded border text-[12px] font-bold ${row.type === '수입' ? 'border-blue-400 text-blue-600' : 'border-red-400 text-red-600'}`}>세목</span>
                                            {a.label}
                                          </span>
                                        ) : (
                                          <span className="flex items-center gap-1">
                                            <span className={`inline-block px-1 py-0 rounded border text-[12px] font-bold ${row.type === '수입' ? 'border-blue-300 text-blue-500' : 'border-red-300 text-red-500'}`}>목</span>
                                            {a.label}
                                          </span>
                                        )}
                                      </button>
                                    )
                                  })}
                                </div>
                              ) : null}
                              <span className={`font-medium ${row.type === '수입' ? 'text-blue-700' : 'text-red-600'}`}>{row.account}</span>
                            </td>
                            {/* 세목 */}
                            <td data-cell="sub" className="text-center px-0.5 py-1">
                              <span className="text-slate-600 text-sm">{row.subAccount || '-'}</span>
                            </td>
                            {/* 계정코드 */}
                            <td data-cell="accountCode" className="text-center px-1 py-1" onClick={cellClick('accountCode')}>
                              {isCell('accountCode') ? (
                                <input type="text" maxLength={5} autoFocus
                                  defaultValue=""
                                  placeholder={(() => {
                                    const autoCode = row.subAccount ? (subAccountCodeMap[row.subAccount] || accountCodeMap[row.account] || '') : (accountCodeMap[row.account] || '')
                                    return row.accountCode || autoCode || ''
                                  })()}
                                  ref={el => { if (el) { el.focus() } }}
                                  onClick={e => e.stopPropagation()}
                                  onChange={e => {
                                    e.target.value = e.target.value.replace(/[^0-9]/g, '')
                                  }}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter' || e.key === 'Tab') {
                                      e.preventDefault()
                                      const input = e.target as HTMLInputElement
                                      const val = input.value
                                      if (val) {
                                        const currentCode = row.subAccount ? (subAccountCodeMap[row.subAccount] || accountCodeMap[row.account] || '') : (accountCodeMap[row.account] || '')
                                        const match = codeToAccount[val]
                                        if (match && val !== currentCode) {
                                          setRows(prev => prev.map(r => r.id === row.id ? { ...r, accountCode: val, account: match.account, subAccount: match.subAccount } : r))
                                        } else if (!match) {
                                          setRows(prev => prev.map(r => r.id === row.id ? { ...r, accountCode: currentCode } : r))
                                        }
                                      }
                                      input.dataset.handled = 'true'
                                      const nextRow = filtered[idx + 1]
                                      if (nextRow) {
                                        setEditingCell({ rowId: nextRow.id, field: 'accountCode' })
                                      } else {
                                        setEditingCell(null)
                                      }
                                    }
                                  }}
                                  onBlur={e => {
                                    if (e.target.dataset.handled) return
                                    const val = e.target.value
                                    if (val) {
                                      const currentCode = row.subAccount ? (subAccountCodeMap[row.subAccount] || accountCodeMap[row.account] || '') : (accountCodeMap[row.account] || '')
                                      const match = codeToAccount[val]
                                      if (match && val !== currentCode) {
                                        setRows(prev => prev.map(r => r.id === row.id ? { ...r, accountCode: val, account: match.account, subAccount: match.subAccount } : r))
                                      } else if (!match) {
                                        setRows(prev => prev.map(r => r.id === row.id ? { ...r, accountCode: currentCode } : r))
                                      }
                                    }
                                    setEditingCell(null)
                                  }}
                                  className={`w-full px-1 py-0.5 border-2 border-[#f5b800] rounded text-xs text-center focus:ring-1 focus:ring-[#f5b800]/50 outline-none placeholder:text-slate-300 ${row.type === '수입' ? 'text-blue-700' : 'text-red-600'}`} />
                              ) : (
                                <span className={`text-xs cursor-pointer ${row.type === '수입' ? 'text-blue-700' : 'text-red-600'}`}>
                                  {(() => {
                                    const autoCode = row.subAccount ? (subAccountCodeMap[row.subAccount] || accountCodeMap[row.account] || '') : (accountCodeMap[row.account] || '')
                                    return row.accountCode || autoCode || '-'
                                  })()}
                                </span>
                              )}
                            </td>
                            {/* 분리 */}
                            {inputMode !== '건별등록' && inputMode !== '상세등록' && <td className="text-center px-1 py-1">
                              <button onClick={e => e.stopPropagation()} className="px-2 py-1 text-xs font-medium border border-slate-300 rounded bg-white hover:bg-slate-50 text-slate-600 whitespace-nowrap">분리</button>
                            </td>}
                            {/* 반납 */}
                            {inputMode !== '건별등록' && inputMode !== '상세등록' && <td className="text-center px-1 py-1">
                              <div className="flex items-center justify-center gap-0.5">
                                <button onClick={e => {
                                  e.stopPropagation()
                                  if (row.amount < 0) {
                                    setRows(prev => prev.map(r => r.id === row.id ? { ...r, type: r.type === '수입' ? '지출' : '수입', amount: Math.abs(r.amount) } : r))
                                  } else {
                                    setRows(prev => prev.map(r => r.id === row.id ? { ...r, type: r.type === '수입' ? '지출' : '수입', amount: -Math.abs(r.amount), account: '', subAccount: '', accountCode: '' } : r))
                                  }
                                }} className={`px-1.5 py-1 text-xs font-medium border rounded ${isRefund ? 'border-amber-400 bg-amber-50 hover:bg-amber-100 text-amber-700' : 'border-slate-300 bg-white hover:bg-slate-50 text-slate-600'}`}>{isRefund ? '반납' : '전표'}</button>
                                <button onClick={e => {
                                  e.stopPropagation()
                                  setRows(prev => prev.map(r => r.id === row.id ? { ...r, account: '', subAccount: '', accountCode: '' } : r))
                                }} className="px-1.5 py-1 text-xs font-medium border border-slate-300 rounded bg-white hover:bg-slate-50 text-slate-600">계정</button>
                              </div>
                            </td>}
                          </React.Fragment>

                        case 'fee':
                          return (inputMode === '건별등록' || inputMode === '상세등록') ? null : <td key={key} className="text-center px-1 py-1"><button onClick={e => e.stopPropagation()} className="px-2 py-1 text-xs font-medium border border-slate-300 rounded bg-white hover:bg-slate-50 text-slate-600">수수료</button></td>

                        case 'counterpart':
                          return <td key={key} data-cell="counterpart" className="text-center px-2 py-1 cursor-pointer" onClick={cellClick('counterpart')}>
                            {isCell('counterpart') ? (
                              <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                                <input type="text" value={row.counterpart} autoFocus
                                  onChange={e => updateRow(row.id, 'counterpart', e.target.value)}
                                  className="flex-1 min-w-0 px-1 py-0.5 border-2 border-[#f5b800] rounded text-xs text-center focus:ring-1 focus:ring-[#f5b800]/50 outline-none" />
                                <button
                                  onClick={() => {/* 거래처 검색 팝업 */}}
                                  className="shrink-0 px-1.5 py-0.5 border border-slate-300 rounded bg-slate-50 hover:bg-slate-100 text-[10px] font-medium text-slate-600"
                                >선택</button>
                              </div>
                            ) : (
                              <span className="text-slate-600 text-sm truncate block">{row.counterpart || '-'}</span>
                            )}
                          </td>

                        case 'payment':
                          return <td key={key} data-cell="payment" className="text-center px-2 py-1 cursor-pointer" onClick={cellClick('note')}>
                            {isCell('note') ? (
                              <select value={row.note} autoFocus
                                onChange={e => { updateRow(row.id, 'note', e.target.value); setEditingCell(null) }}
                                onBlur={() => setEditingCell(null)}
                                onClick={e => e.stopPropagation()}
                                className="w-full px-1 py-0.5 border-2 border-[#f5b800] rounded text-xs text-center focus:ring-1 focus:ring-[#f5b800]/50 outline-none">
                                <option value="">::선택::</option>
                                {row.type === '수입' ? <>
                                  <option value="카드결제">카드결제</option>
                                  <option value="아이행복카드">아이행복카드</option>
                                  <option value="계좌이체">계좌이체</option>
                                  <option value="자동이체">자동이체</option>
                                  <option value="지로">지로</option>
                                  <option value="현금결제">현금결제</option>
                                  <option value="기타">기타</option>
                                  <option value="보조금">보조금</option>
                                  <option value="전입금">전입금</option>
                                  <option value="지정후원금">지정후원금</option>
                                  <option value="비지정후원금">비지정후원금</option>
                                </> : <>
                                  <option value="카드결제">카드결제</option>
                                  <option value="아이행복카드">아이행복카드</option>
                                  <option value="계좌이체">계좌이체</option>
                                  <option value="자동이체">자동이체</option>
                                  <option value="지로">지로</option>
                                  <option value="현금결제">현금결제</option>
                                  <option value="기타">기타</option>
                                  <option value="보조금">보조금</option>
                                  <option value="자동이체반납">자동이체반납</option>
                                </>}
                              </select>
                            ) : (
                              <span className="text-slate-400 text-sm">{row.note ? row.note.replace(/^(지출|수입)-/, '') : '-'}</span>
                            )}
                          </td>

                        case 'child':
                          return (
                            <td key={key} className="text-center px-1 py-1">
                              {['부모부담 보육료', '특별활동비', '기타 필요경비', '기타 필요경비 지출'].includes(row.account) || row.account.startsWith('세목:') ? (
                                <span className="text-xs text-slate-400">▾</span>
                              ) : null}
                            </td>
                          )
                        case 'sort':
                          return (() => {
                            const sameDateRows = filtered.filter(r => r.date === row.date)
                            const dateIdx = sameDateRows.findIndex(r => r.id === row.id)
                            const canUp = dateIdx > 0
                            const canDown = dateIdx < sameDateRows.length - 1
                            return (
                              <td key={key} className="text-center px-1 py-1">
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
                          })()

                        default: return null
                      }
                    })}
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
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-3 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg">
              <span className="text-xs font-bold text-blue-700">수입</span>
              <span className="text-xs text-slate-600">합계 <strong className="text-blue-700">{fmt(totalIncome)}</strong></span>
              <span className="text-xs text-slate-600">전표 <strong className="text-blue-700">{filtered.filter(r => r.type === '수입').length}</strong></span>
              <span className="text-xs text-slate-600">정상 <strong className="text-blue-700">{filtered.filter(r => r.type === '수입' && r.amount >= 0).length}</strong></span>
              <span className="text-xs text-slate-600">반납 <strong className="text-amber-600">{filtered.filter(r => r.type === '수입' && r.amount < 0).length}</strong></span>
            </div>
            <div className="flex items-center gap-3 px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg">
              <span className="text-xs font-bold text-red-600">지출</span>
              <span className="text-xs text-slate-600">합계 <strong className="text-red-600">{fmt(totalExpense)}</strong></span>
              <span className="text-xs text-slate-600">전표 <strong className="text-red-600">{filtered.filter(r => r.type === '지출').length}</strong></span>
              <span className="text-xs text-slate-600">정상 <strong className="text-red-600">{filtered.filter(r => r.type === '지출' && r.amount >= 0).length}</strong></span>
              <span className="text-xs text-slate-600">반납 <strong className="text-amber-600">{filtered.filter(r => r.type === '지출' && r.amount < 0).length}</strong></span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg">
              <span className="text-xs font-bold text-emerald-700">잔액</span>
              <strong className="text-sm text-emerald-700">{fmt(totalIncome - totalExpense)}</strong>
            </div>
          </div>
          <span className="text-xs text-slate-400">셀 클릭으로 개별 편집</span>
        </div>
      </div>}
    </div>
  )
}

/* ── 공통 Props 타입 ── */
interface InputPanelProps {
  rows: VoucherRow[]
  setRows: React.Dispatch<React.SetStateAction<VoucherRow[]>>
  filterYearMonth: string
  incomeAccounts: AccItem[]
  expenseAccounts: AccItem[]
  accountCodeMap: Record<string, string>
  subAccountCodeMap: Record<string, string>
  inputMethod?: string
  excelParsed?: { day: string; type: '수입' | '지출'; summary: string; incomeAmount: string; expenseAmount: string; account: string; subAccount: string; accountCode: string; payment: string }[]
  setExcelParsed?: React.Dispatch<React.SetStateAction<{ day: string; type: '수입' | '지출'; summary: string; incomeAmount: string; expenseAmount: string; account: string; subAccount: string; accountCode: string; payment: string }[]>>
  excelFileName?: string
  setExcelFileName?: React.Dispatch<React.SetStateAction<string>>
}

/* ── 간편등록 패널 ── */
interface SimpleRow {
  id: number
  day: string
  type: '수입' | '지출'
  summary: string
  incomeAmount: string
  expenseAmount: string
  account: string
  subAccount: string
  accountCode: string
  payment: string
  rowInputMethod: '수기' | '엑셀'
  saved: boolean
}

function SimpleInputPanel({ rows, setRows, filterYearMonth, incomeAccounts, expenseAccounts, accountCodeMap, subAccountCodeMap, inputMethod, excelParsed = [], setExcelParsed, excelFileName = '', setExcelFileName }: InputPanelProps) {
  const [simpleRows, setSimpleRows] = useState<SimpleRow[]>([
    { id: 1, day: '', type: '지출', summary: '', incomeAmount: '', expenseAmount: '', account: '', subAccount: '', accountCode: '', payment: '', rowInputMethod: '수기', saved: false },
    { id: 2, day: '', type: '지출', summary: '', incomeAmount: '', expenseAmount: '', account: '', subAccount: '', accountCode: '', payment: '', rowInputMethod: '수기', saved: false },
    { id: 3, day: '', type: '지출', summary: '', incomeAmount: '', expenseAmount: '', account: '', subAccount: '', accountCode: '', payment: '', rowInputMethod: '수기', saved: false },
    { id: 4, day: '', type: '지출', summary: '', incomeAmount: '', expenseAmount: '', account: '', subAccount: '', accountCode: '', payment: '', rowInputMethod: '수기', saved: false },
    { id: 5, day: '', type: '지출', summary: '', incomeAmount: '', expenseAmount: '', account: '', subAccount: '', accountCode: '', payment: '', rowInputMethod: '수기', saved: false },
  ])
  const [nextId, setNextId] = useState(6)
  const dayRefs = useRef<(HTMLInputElement | null)[]>([])
  const [listeningIdx, setListeningIdx] = useState<number | null>(null)
  const [openAccountIdx, setOpenAccountIdx] = useState<number | null>(null)
  const accountDropdownRefs = useRef<(HTMLDivElement | null)[]>([])

  // 엑셀 등록 이벤트 수신
  useEffect(() => {
    const handler = (e: Event) => {
      const data = (e as CustomEvent).detail
      if (!data || data.length === 0) return
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const newRows: SimpleRow[] = data.map((r: any, i: number) => ({
        id: i + 1,
        ...r,
        rowInputMethod: '엑셀' as const,
        saved: false,
      }))
      setSimpleRows(newRows)
      setNextId(newRows.length + 1)
    }
    window.addEventListener('excelRegister', handler)
    return () => window.removeEventListener('excelRegister', handler)
  }, [])

  useEffect(() => {
    if (openAccountIdx === null) return
    const handler = (e: MouseEvent) => {
      const ref = accountDropdownRefs.current[openAccountIdx]
      if (ref && !ref.contains(e.target as Node)) setOpenAccountIdx(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [openAccountIdx])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recRef = useRef<any>(null)

  const startVoice = useCallback((idx: number) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) return
    if (listeningIdx === idx) { recRef.current?.stop(); return }
    const recognition = new SR()
    recognition.lang = 'ko-KR'
    recognition.interimResults = false
    recognition.continuous = false
    recognition.onstart = () => setListeningIdx(idx)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (e: any) => {
      const text = e.results[0][0].transcript as string
      setSimpleRows(prev => prev.map((r, i) => i === idx ? { ...r, summary: r.summary ? `${r.summary} ${text}` : text } : r))
    }
    recognition.onend = () => { setListeningIdx(null); recRef.current = null }
    recognition.onerror = () => { setListeningIdx(null); recRef.current = null }
    recRef.current = recognition
    recognition.start()
  }, [listeningIdx])

  const [ym] = filterYearMonth.split('-').map(Number)
  const lastDay = new Date(ym, Number(filterYearMonth.split('-')[1]), 0).getDate()

  const updateRow = (idx: number, field: keyof SimpleRow, value: string) => {
    setSimpleRows(prev => prev.map((r, i) => {
      if (i !== idx) return r
      const updated = { ...r, [field]: value }
      // 구분 변경 시 계정 초기화
      if (field === 'type') {
        updated.account = ''
        updated.subAccount = ''
      }
      return updated
    }))
  }

  const addMoreRows = () => {
    const newRows: SimpleRow[] = Array.from({ length: 5 }, (_, i) => ({
      id: nextId + i,
      day: '',
      type: '지출' as const,
      summary: '',
      incomeAmount: '',
      expenseAmount: '',
      account: '',
      subAccount: '',
      accountCode: '',
      payment: '',
      rowInputMethod: '수기',
      saved: false,
    }))
    setSimpleRows(prev => [...prev, ...newRows])
    setNextId(prev => prev + 5)
  }

  const saveAll = () => {
    const validRows = simpleRows.filter(r => r.day && (r.incomeAmount || r.expenseAmount) && !r.saved)
    if (validRows.length === 0) return

    const newVouchers: VoucherRow[] = validRows.map((r, i) => ({
      id: rows.length + i + 1,
      date: `${filterYearMonth}-${r.day.padStart(2, '0')}`,
      type: r.incomeAmount ? '수입' : '지출',
      account: r.account,
      subAccount: r.subAccount,
      summary: r.summary,
      amount: Number((r.incomeAmount || r.expenseAmount).replace(/,/g, '')) || 0,
      counterpart: '',
      note: '',
      approved: false,
      inputMethod: r.rowInputMethod as VoucherRow['inputMethod'],
      accountCode: subAccountCodeMap[r.subAccount] || accountCodeMap[r.account] || '',
    }))

    setRows(prev => [...prev, ...newVouchers])
    // 저장 후 초기화
    setSimpleRows([
      { id: 1, day: '', type: '지출', summary: '', incomeAmount: '', expenseAmount: '', account: '', subAccount: '', accountCode: '', payment: '', rowInputMethod: '수기', saved: false },
      { id: 2, day: '', type: '지출', summary: '', incomeAmount: '', expenseAmount: '', account: '', subAccount: '', accountCode: '', payment: '', rowInputMethod: '수기', saved: false },
      { id: 3, day: '', type: '지출', summary: '', incomeAmount: '', expenseAmount: '', account: '', subAccount: '', accountCode: '', payment: '', rowInputMethod: '수기', saved: false },
      { id: 4, day: '', type: '지출', summary: '', incomeAmount: '', expenseAmount: '', account: '', subAccount: '', accountCode: '', payment: '', rowInputMethod: '수기', saved: false },
      { id: 5, day: '', type: '지출', summary: '', incomeAmount: '', expenseAmount: '', account: '', subAccount: '', accountCode: '', payment: '', rowInputMethod: '수기', saved: false },
    ])
    setNextId(6)
  }

  const unsavedCount = simpleRows.filter(r => r.day && (r.incomeAmount || r.expenseAmount) && !r.saved).length
  const savedCount = simpleRows.filter(r => r.saved).length

  const formatAmount = (val: string) => {
    const negative = val.startsWith('-')
    const num = val.replace(/[^0-9]/g, '')
    if (!num) return negative ? '-' : ''
    return (negative ? '-' : '') + Number(num).toLocaleString('ko-KR')
  }

  const getAccountOptions = (type: '수입' | '지출') => type === '수입' ? incomeAccounts : expenseAccounts

  const excelTypes = [
    { group: '기본', items: ['보육통합 엑셀자료', '수장부 다운엑셀', '기본 샘플파일', 'CMS 엑셀'] },
    { group: '은행', items: ['농협', '대구은행', '국민은행', '전북은행', '기업은행', '신한은행', '시티은행(법인)', '외환은행', '우리은행', '우체국', '하나은행'] },
  ]
  const allExcelItems = excelTypes.flatMap(g => g.items)

  return (
    <div className="space-y-4">
    <div className="bg-white rounded-xl border border-[#f5b800]/30 shadow-sm">
      {/* 헤더 - sticky */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-[#f5b800]/20 sticky top-0 z-30 bg-white rounded-t-xl">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-bold text-slate-700">간편등록</h3>
          <span className="text-xs text-slate-400">날짜·적요·금액·계정과목만 빠르게 입력</span>
        </div>
        <div className="flex items-center gap-2">
          {savedCount > 0 && <span className="text-xs text-green-600 font-medium">{savedCount}건 저장됨</span>}
          {unsavedCount > 0 && <span className="text-xs text-amber-600 font-medium">{unsavedCount}건 입력대기</span>}
          <button onClick={saveAll} disabled={unsavedCount === 0}
            className={`px-4 py-1.5 text-xs font-bold rounded transition-colors ${
              unsavedCount > 0 ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-slate-100 text-slate-300 cursor-not-allowed'
            }`}>
            저장
          </button>
          <button onClick={() => {
            setSimpleRows([
              { id: 1, day: '', type: '지출', summary: '', incomeAmount: '', expenseAmount: '', account: '', subAccount: '', accountCode: '', payment: '', rowInputMethod: '수기', saved: false },
              { id: 2, day: '', type: '지출', summary: '', incomeAmount: '', expenseAmount: '', account: '', subAccount: '', accountCode: '', payment: '', rowInputMethod: '수기', saved: false },
              { id: 3, day: '', type: '지출', summary: '', incomeAmount: '', expenseAmount: '', account: '', subAccount: '', accountCode: '', payment: '', rowInputMethod: '수기', saved: false },
              { id: 4, day: '', type: '지출', summary: '', incomeAmount: '', expenseAmount: '', account: '', subAccount: '', accountCode: '', payment: '', rowInputMethod: '수기', saved: false },
              { id: 5, day: '', type: '지출', summary: '', incomeAmount: '', expenseAmount: '', account: '', subAccount: '', accountCode: '', payment: '', rowInputMethod: '수기', saved: false },
            ])
            setNextId(6)
          }}
            className="px-4 py-1.5 text-xs font-bold rounded bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors">
            초기화
          </button>
        </div>
      </div>

      {/* 입력 테이블 */}
      <div>
        <table className="w-full text-sm">
          <thead className="sticky top-[49px] z-20">
            <tr className="bg-[#fffbeb] border-b border-[#f5b800]/30" style={{boxShadow: '0 2px 4px rgba(245,184,0,0.15)'}}>

              <th className="px-3 py-2.5 text-center text-xs font-semibold text-slate-500 w-[50px]">No</th>
              <th className="px-3 py-2.5 text-center text-xs font-semibold text-slate-500 w-[80px]">일자</th>
              <th className="px-3 py-2.5 text-center text-xs font-semibold text-slate-500 w-[80px]">구분</th>
              <th className="px-3 py-2.5 text-center text-xs font-semibold text-slate-500">적요</th>
              <th className="px-3 py-2.5 text-center text-xs font-semibold text-slate-500 w-[140px]">수입</th>
              <th className="px-3 py-2.5 text-center text-xs font-semibold text-slate-500 w-[140px]">지출</th>
              <th className="px-3 py-2.5 text-center text-xs font-semibold text-slate-500 w-[130px]">잔액</th>
              <th className="px-3 py-2.5 text-center text-xs font-semibold text-slate-500 w-[220px]">계정과목</th>
              <th className="px-3 py-2.5 text-center text-xs font-semibold text-slate-500 w-[150px]">세목</th>
              <th className="px-3 py-2.5 text-center text-xs font-semibold text-slate-500 w-[90px]">계정코드</th>
              <th className="px-3 py-2.5 text-center text-xs font-semibold text-slate-500 w-[130px]">결제방식</th>
            </tr>
          </thead>
          <tbody>
            {simpleRows.map((r, idx) => {
              const hasAmount = !!(r.incomeAmount || r.expenseAmount)
              const amountType: '수입' | '지출' = r.incomeAmount ? '수입' : '지출'
              const accounts = hasAmount ? getAccountOptions(amountType) : []
              // 선택된 계정의 세목 목록
              const subAccounts = accounts.filter(a => a.isSub && a.value.startsWith('세목:') && (() => {
                const parentCode = accountCodeMap[r.account]
                if (!parentCode) return false
                const subCode = subAccountCodeMap[a.label] || subAccountCodeMap[a.label.replace('(지출)', '')]
                return subCode?.startsWith(parentCode)
              })())
              return (
                <tr key={r.id} className={`border-b border-slate-50 transition-colors ${r.saved ? 'bg-green-50/50' : 'hover:bg-slate-50/30'}`}>
                  <td className="px-3 py-1.5 text-center text-xs text-slate-400">{idx + 1}</td>
                  <td className="px-2 py-1.5">
                    <input
                      ref={el => { dayRefs.current[idx] = el }}
                      type="text"
                      value={r.day}
                      placeholder="일"
                      disabled={r.saved}
                      onChange={e => {
                        const v = e.target.value.replace(/[^0-9]/g, '')
                        if (v === '' || (Number(v) >= 1 && Number(v) <= lastDay)) updateRow(idx, 'day', v)
                      }}
                      className="w-full px-2 py-1.5 border border-[#f5b800]/30 rounded text-center text-xs focus:outline-none focus:ring-1 focus:ring-[#f5b800]/50 focus:border-[#f5b800] disabled:bg-slate-50 disabled:text-slate-400"
                    />
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <span className={`text-xs font-bold ${r.rowInputMethod === '엑셀' ? 'text-yellow-700' : 'text-amber-900'}`}>{r.rowInputMethod}</span>
                  </td>
                  <td className="px-2 py-1.5">
                    <div className="flex items-center gap-1">
                      <input type="text" value={r.summary} placeholder="적요 입력" disabled={r.saved}
                        onChange={e => updateRow(idx, 'summary', e.target.value)}
                        className="flex-1 px-2 py-1.5 border border-[#f5b800]/30 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#f5b800]/50 focus:border-[#f5b800] disabled:bg-slate-50 disabled:text-slate-400"
                      />
                      {!r.saved && (
                        <button onClick={() => startVoice(idx)}
                          className={`p-1 rounded transition-colors flex-shrink-0 ${listeningIdx === idx ? 'bg-red-500 text-white animate-pulse' : 'text-slate-400 hover:text-blue-600'}`}>
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-2 py-1.5">
                    <input type="text" value={r.incomeAmount} placeholder="" disabled={r.saved || !!r.expenseAmount}
                      onChange={e => { updateRow(idx, 'incomeAmount', formatAmount(e.target.value)); if (e.target.value) updateRow(idx, 'expenseAmount', '') }}
                      className={`w-full px-2 py-1.5 border border-[#f5b800]/30 rounded text-xs text-right font-medium focus:outline-none focus:ring-1 focus:ring-[#f5b800]/50 focus:border-[#f5b800] disabled:bg-slate-50 disabled:text-slate-400 ${r.incomeAmount ? 'text-blue-700' : ''}`}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input type="text" value={r.expenseAmount} placeholder="" disabled={r.saved || !!r.incomeAmount}
                      onChange={e => { updateRow(idx, 'expenseAmount', formatAmount(e.target.value)); if (e.target.value) updateRow(idx, 'incomeAmount', '') }}
                      className={`w-full px-2 py-1.5 border border-[#f5b800]/30 rounded text-xs text-right font-medium focus:outline-none focus:ring-1 focus:ring-[#f5b800]/50 focus:border-[#f5b800] disabled:bg-slate-50 disabled:text-slate-400 ${r.expenseAmount ? 'text-red-600' : ''}`}
                    />
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    {(() => {
                      let balance = 0
                      for (let i = 0; i <= idx; i++) {
                        const row = simpleRows[i]
                        const inc = Number((row.incomeAmount || '0').replace(/,/g, ''))
                        const exp = Number((row.expenseAmount || '0').replace(/,/g, ''))
                        if (inc) balance += inc
                        if (exp) balance -= exp
                      }
                      return balance !== 0 ? <span className="text-xs font-medium text-slate-700">{fmt(balance)}</span> : <span className="text-xs text-slate-300">-</span>
                    })()}
                  </td>
                  <td className="px-2 py-1.5">
                    {r.day && hasAmount ? (
                      <div className="relative" ref={el => { accountDropdownRefs.current[idx] = el }}>
                        <button
                          disabled={r.saved}
                          onClick={() => setOpenAccountIdx(openAccountIdx === idx ? null : idx)}
                          className={`w-full px-2 py-1.5 border border-[#f5b800]/30 rounded text-xs text-left flex items-center justify-between disabled:bg-slate-50 disabled:text-slate-400 ${amountType === '수입' ? 'text-blue-600' : 'text-red-600'}`}>
                          <span className="truncate">{r.account || (amountType === '수입' ? '수입계정 선택' : '지출계정 선택')}</span>
                          <svg className="w-3 h-3 flex-shrink-0 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
                        </button>
                        {openAccountIdx === idx && (
                          <div className="absolute top-full left-0 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-[240px] overflow-y-auto">
                            {accounts.filter(a => !a.isSub).map(a => (
                              <button key={a.value}
                                onClick={() => { updateRow(idx, 'account', a.value); updateRow(idx, 'subAccount', ''); updateRow(idx, 'accountCode', accountCodeMap[a.value] || ''); setOpenAccountIdx(null) }}
                                className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                                  r.account === a.value
                                    ? amountType === '수입' ? 'text-blue-700 font-bold bg-blue-50' : 'text-red-600 font-bold bg-red-50'
                                    : amountType === '수입' ? 'text-slate-700 hover:text-blue-700 hover:font-bold hover:bg-blue-50/50' : 'text-slate-700 hover:text-red-600 hover:font-bold hover:bg-red-50/50'
                                }`}>
                                {a.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="block w-full px-1 py-1.5 text-xs text-slate-300 text-center">{!r.day ? '일자를 먼저 입력하세요' : '금액을 먼저 입력하세요'}</span>
                    )}
                  </td>
                  <td className="px-2 py-1.5">
                    {subAccounts.length > 0 ? (
                      <select value={r.subAccount} disabled={r.saved}
                        onChange={e => { updateRow(idx, 'subAccount', e.target.value); updateRow(idx, 'accountCode', subAccountCodeMap[e.target.value] || subAccountCodeMap[e.target.value.replace('(지출)', '')] || accountCodeMap[r.account] || '') }}
                        className="w-full px-1 py-1.5 border border-[#f5b800]/30 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#f5b800]/50 focus:border-[#f5b800] disabled:bg-slate-50 disabled:text-slate-400">
                        <option value="">-</option>
                        {subAccounts.map(a => <option key={a.value} value={a.label}>{a.label}</option>)}
                      </select>
                    ) : (
                      <span className="text-xs text-slate-300 block text-center">-</span>
                    )}
                  </td>
                  <td className="px-2 py-1.5">
                    <input type="text"
                      value={r.accountCode}
                      disabled={r.saved}
                      onChange={e => {
                        const code = e.target.value.replace(/[^0-9]/g, '').slice(0, 5)
                        updateRow(idx, 'accountCode', code)
                        const found = codeToAccount[code]
                        if (found) {
                          updateRow(idx, 'account', found.account)
                          updateRow(idx, 'subAccount', found.subAccount)
                        }
                      }}
                      placeholder="-"
                      className={`w-full px-1 py-1.5 border border-[#f5b800]/30 rounded text-xs text-center font-mono focus:outline-none focus:ring-1 focus:ring-[#f5b800]/50 focus:border-[#f5b800] disabled:bg-slate-50 disabled:text-slate-400 ${r.accountCode ? (r.incomeAmount ? 'text-blue-600' : 'text-red-600') : ''}`}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <select value={r.payment} disabled={r.saved}
                      onChange={e => updateRow(idx, 'payment', e.target.value)}
                      className="w-full px-1 py-1.5 border border-[#f5b800]/30 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#f5b800]/50 focus:border-[#f5b800] disabled:bg-slate-50 disabled:text-slate-400">
                      <option value="">::선택::</option>
                      {amountType === '수입' ? <>
                        <option value="카드결제">카드결제</option>
                        <option value="아이행복카드">아이행복카드</option>
                        <option value="계좌이체">계좌이체</option>
                        <option value="자동이체">자동이체</option>
                        <option value="지로">지로</option>
                        <option value="현금결제">현금결제</option>
                        <option value="기타">기타</option>
                        <option value="보조금">보조금</option>
                        <option value="전입금">전입금</option>
                        <option value="지정후원금">지정후원금</option>
                        <option value="비지정후원금">비지정후원금</option>
                      </> : <>
                        <option value="카드결제">카드결제</option>
                        <option value="아이행복카드">아이행복카드</option>
                        <option value="계좌이체">계좌이체</option>
                        <option value="자동이체">자동이체</option>
                        <option value="지로">지로</option>
                        <option value="현금결제">현금결제</option>
                        <option value="기타">기타</option>
                        <option value="보조금">보조금</option>
                        <option value="자동이체반납">자동이체반납</option>
                      </>}
                    </select>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* 하단: 행 추가 */}
      <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100">
        <button onClick={addMoreRows} className="text-xs text-blue-600 hover:text-blue-800 font-medium">
          + 5행 추가
        </button>
        <span className="text-xs text-slate-400">
          {filterYearMonth} · 총 {simpleRows.length}행
        </span>
      </div>
    </div>
    </div>
  )
}
/* ── 건별등록 패널 ── */
function SingleInputPanel({ rows, setRows, filterYearMonth, incomeAccounts, expenseAccounts, accountCodeMap, subAccountCodeMap }: InputPanelProps) {
  const [form, setForm] = useState({
    day: '', type: '지출' as '수입' | '지출', summary: '', amount: '',
    account: '', subAccount: '', counterpart: '', note: '',
  })
  const [savedList, setSavedList] = useState<VoucherRow[]>([])
  const dayRef = useRef<HTMLInputElement>(null)

  const [ym] = filterYearMonth.split('-').map(Number)
  const lastDay = new Date(ym, Number(filterYearMonth.split('-')[1]), 0).getDate()

  const accounts = form.type === '수입' ? incomeAccounts : expenseAccounts
  const parentCode = accountCodeMap[form.account]
  const subAccounts = accounts.filter(a => a.isSub && a.value.startsWith('세목:') && (() => {
    if (!parentCode) return false
    const subCode = subAccountCodeMap[a.label] || subAccountCodeMap[a.label.replace('(지출)', '')]
    return subCode?.startsWith(parentCode)
  })())

  const formatAmount = (val: string) => {
    const num = val.replace(/[^0-9]/g, '')
    return num ? Number(num).toLocaleString('ko-KR') : ''
  }

  const canSave = form.day && form.amount && form.account
  const save = () => {
    if (!canSave) return
    const newRow: VoucherRow = {
      id: rows.length + savedList.length + 1,
      date: `${filterYearMonth}-${form.day.padStart(2, '0')}`,
      type: form.type,
      account: form.account,
      subAccount: form.subAccount,
      summary: form.summary,
      amount: Number(form.amount.replace(/,/g, '')) || 0,
      counterpart: form.counterpart,
      note: form.note,
      approved: false,
      inputMethod: '수기',
      accountCode: subAccountCodeMap[form.subAccount] || accountCodeMap[form.account] || '',
    }
    setRows(prev => [...prev, newRow])
    setSavedList(prev => [...prev, newRow])
    setForm({ day: '', type: '지출', summary: '', amount: '', account: '', subAccount: '', counterpart: '', note: '' })
    dayRef.current?.focus()
  }

  const inputCls = "w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400"
  const labelCls = "text-xs font-semibold text-slate-500 mb-1 block"

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-bold text-slate-700">건별등록</h3>
          <span className="text-xs text-slate-400">전표 1건씩 입력 후 저장</span>
        </div>
        {savedList.length > 0 && <span className="text-xs text-green-600 font-medium">{savedList.length}건 저장됨</span>}
      </div>

      <div className="p-5">
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div>
            <label className={labelCls}>일자</label>
            <div className="flex items-center gap-1">
              <span className="text-xs text-slate-400 whitespace-nowrap">{filterYearMonth}-</span>
              <input ref={dayRef} type="text" value={form.day} placeholder="일"
                onChange={e => {
                  const v = e.target.value.replace(/[^0-9]/g, '')
                  if (v === '' || (Number(v) >= 1 && Number(v) <= lastDay)) setForm(f => ({ ...f, day: v }))
                }}
                className={`${inputCls} text-center w-16`}
              />
            </div>
          </div>
          <div>
            <label className={labelCls}>구분</label>
            <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as '수입' | '지출', account: '', subAccount: '' }))}
              className={`${inputCls} ${form.type === '수입' ? 'text-blue-600 font-bold' : 'text-red-600 font-bold'}`}>
              <option value="수입">수입</option>
              <option value="지출">지출</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>계정과목</label>
            <select value={form.account} onChange={e => setForm(f => ({ ...f, account: e.target.value, subAccount: '' }))} className={inputCls}>
              <option value="">계정선택</option>
              {accounts.filter(a => !a.isSub).map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>세목</label>
            {subAccounts.length > 0 ? (
              <select value={form.subAccount} onChange={e => setForm(f => ({ ...f, subAccount: e.target.value }))} className={inputCls}>
                <option value="">-</option>
                {subAccounts.map(a => <option key={a.value} value={a.label}>{a.label}</option>)}
              </select>
            ) : (
              <div className="px-3 py-2 border border-slate-100 rounded-lg text-sm text-slate-300 bg-slate-50">-</div>
            )}
          </div>
        </div>
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="col-span-2">
            <label className={labelCls}>적요</label>
            <input type="text" value={form.summary} placeholder="적요 입력"
              onChange={e => setForm(f => ({ ...f, summary: e.target.value }))}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>금액</label>
            <input type="text" value={form.amount} placeholder="0"
              onChange={e => setForm(f => ({ ...f, amount: formatAmount(e.target.value) }))}
              className={`${inputCls} text-right font-medium`}
            />
          </div>
          <div>
            <label className={labelCls}>거래처</label>
            <input type="text" value={form.counterpart} placeholder="거래처"
              onChange={e => setForm(f => ({ ...f, counterpart: e.target.value }))}
              className={inputCls}
            />
          </div>
        </div>
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <label className={labelCls}>비고</label>
            <input type="text" value={form.note} placeholder="비고"
              onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
              className={inputCls}
            />
          </div>
          <button onClick={save} disabled={!canSave}
            className={`px-6 py-2 text-sm font-bold rounded-lg transition-colors ${
              canSave ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-slate-100 text-slate-300 cursor-not-allowed'
            }`}>
            저장
          </button>
        </div>
      </div>

      {/* 저장 목록 */}
      {savedList.length > 0 && (
        <div className="border-t border-slate-100 px-5 py-3">
          <p className="text-xs font-bold text-slate-500 mb-2">이번 세션 저장 내역</p>
          <div className="space-y-1">
            {savedList.map((r, i) => (
              <div key={i} className="flex items-center gap-3 text-xs text-slate-600 bg-slate-50 rounded px-3 py-1.5">
                <span className="text-slate-400 w-5">{i + 1}</span>
                <span className="w-20">{r.date}</span>
                <span className={`w-10 font-bold ${r.type === '수입' ? 'text-blue-600' : 'text-red-600'}`}>{r.type}</span>
                <span className="flex-1 truncate">{r.summary || '-'}</span>
                <span className="font-medium w-24 text-right">{r.amount.toLocaleString('ko-KR')}</span>
                <span className="w-28 truncate">{r.account}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ── 상세등록 패널 ── */
function DetailInputPanel({ rows, setRows, filterYearMonth, incomeAccounts, expenseAccounts, accountCodeMap, subAccountCodeMap }: InputPanelProps) {
  const [form, setForm] = useState({
    day: '', type: '지출' as '수입' | '지출', summary: '', amount: '',
    account: '', subAccount: '', counterpart: '', note: '',
    payment: '' as string, evidence: '' as string,
  })
  const [savedList, setSavedList] = useState<VoucherRow[]>([])
  const dayRef = useRef<HTMLInputElement>(null)

  const [ym] = filterYearMonth.split('-').map(Number)
  const lastDay = new Date(ym, Number(filterYearMonth.split('-')[1]), 0).getDate()

  const accounts = form.type === '수입' ? incomeAccounts : expenseAccounts
  const parentCode = accountCodeMap[form.account]
  const subAccounts = accounts.filter(a => a.isSub && a.value.startsWith('세목:') && (() => {
    if (!parentCode) return false
    const subCode = subAccountCodeMap[a.label] || subAccountCodeMap[a.label.replace('(지출)', '')]
    return subCode?.startsWith(parentCode)
  })())

  const formatAmount = (val: string) => {
    const num = val.replace(/[^0-9]/g, '')
    return num ? Number(num).toLocaleString('ko-KR') : ''
  }

  const canSave = form.day && form.amount && form.account
  const save = () => {
    if (!canSave) return
    const evidenceArr = form.evidence ? [form.evidence as VoucherRow['evidence'] extends (infer T)[] | undefined ? T : never] : undefined
    const newRow: VoucherRow = {
      id: rows.length + savedList.length + 1,
      date: `${filterYearMonth}-${form.day.padStart(2, '0')}`,
      type: form.type,
      account: form.account,
      subAccount: form.subAccount,
      summary: form.summary,
      amount: Number(form.amount.replace(/,/g, '')) || 0,
      counterpart: form.counterpart,
      note: form.payment || form.note,
      approved: false,
      inputMethod: '수기',
      accountCode: subAccountCodeMap[form.subAccount] || accountCodeMap[form.account] || '',
      evidence: evidenceArr as VoucherRow['evidence'],
    }
    setRows(prev => [...prev, newRow])
    setSavedList(prev => [...prev, newRow])
    setForm({ day: '', type: '지출', summary: '', amount: '', account: '', subAccount: '', counterpart: '', note: '', payment: '', evidence: '' })
    dayRef.current?.focus()
  }

  const inputCls = "w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400"
  const labelCls = "text-xs font-semibold text-slate-500 mb-1 block"

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-bold text-slate-700">상세등록</h3>
          <span className="text-xs text-slate-400">증빙·결제방식 등 전체 항목 입력</span>
        </div>
        {savedList.length > 0 && <span className="text-xs text-green-600 font-medium">{savedList.length}건 저장됨</span>}
      </div>

      <div className="p-5">
        {/* 1행: 일자, 구분, 계정과목, 세목 */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div>
            <label className={labelCls}>일자</label>
            <div className="flex items-center gap-1">
              <span className="text-xs text-slate-400 whitespace-nowrap">{filterYearMonth}-</span>
              <input ref={dayRef} type="text" value={form.day} placeholder="일"
                onChange={e => {
                  const v = e.target.value.replace(/[^0-9]/g, '')
                  if (v === '' || (Number(v) >= 1 && Number(v) <= lastDay)) setForm(f => ({ ...f, day: v }))
                }}
                className={`${inputCls} text-center w-16`}
              />
            </div>
          </div>
          <div>
            <label className={labelCls}>구분</label>
            <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as '수입' | '지출', account: '', subAccount: '' }))}
              className={`${inputCls} ${form.type === '수입' ? 'text-blue-600 font-bold' : 'text-red-600 font-bold'}`}>
              <option value="수입">수입</option>
              <option value="지출">지출</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>계정과목</label>
            <select value={form.account} onChange={e => setForm(f => ({ ...f, account: e.target.value, subAccount: '' }))} className={inputCls}>
              <option value="">계정선택</option>
              {accounts.filter(a => !a.isSub).map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>세목</label>
            {subAccounts.length > 0 ? (
              <select value={form.subAccount} onChange={e => setForm(f => ({ ...f, subAccount: e.target.value }))} className={inputCls}>
                <option value="">-</option>
                {subAccounts.map(a => <option key={a.value} value={a.label}>{a.label}</option>)}
              </select>
            ) : (
              <div className="px-3 py-2 border border-slate-100 rounded-lg text-sm text-slate-300 bg-slate-50">-</div>
            )}
          </div>
        </div>

        {/* 2행: 적요, 금액 */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="col-span-2">
            <label className={labelCls}>적요</label>
            <input type="text" value={form.summary} placeholder="적요 입력"
              onChange={e => setForm(f => ({ ...f, summary: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>금액</label>
            <input type="text" value={form.amount} placeholder="0"
              onChange={e => setForm(f => ({ ...f, amount: formatAmount(e.target.value) }))}
              className={`${inputCls} text-right font-medium`} />
          </div>
          <div>
            <label className={labelCls}>거래처</label>
            <input type="text" value={form.counterpart} placeholder="거래처"
              onChange={e => setForm(f => ({ ...f, counterpart: e.target.value }))} className={inputCls} />
          </div>
        </div>

        {/* 3행: 결제방식, 증빙, 비고 */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div>
            <label className={labelCls}>결제방식</label>
            <select value={form.payment} onChange={e => setForm(f => ({ ...f, payment: e.target.value }))} className={inputCls}>
              <option value="">선택</option>
              <option value="계좌이체">계좌이체</option>
              <option value="자동이체">자동이체</option>
              <option value="카드결제">카드결제</option>
              <option value="현금결제">현금결제</option>
              <option value="지로">지로</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>증빙</label>
            <select value={form.evidence} onChange={e => setForm(f => ({ ...f, evidence: e.target.value }))} className={inputCls}>
              <option value="">선택</option>
              <option value="세금계산서">세금계산서</option>
              <option value="계산서">계산서</option>
              <option value="현금영수증">현금영수증</option>
              <option value="쿠팡">쿠팡</option>
              <option value="네이버">네이버</option>
              <option value="11번가">11번가</option>
              <option value="지마켓">지마켓</option>
              <option value="옥션">옥션</option>
              <option value="오아시스">오아시스</option>
              <option value="4대보험">4대보험</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className={labelCls}>비고</label>
            <input type="text" value={form.note} placeholder="비고"
              onChange={e => setForm(f => ({ ...f, note: e.target.value }))} className={inputCls} />
          </div>
        </div>

        <div className="flex justify-end">
          <button onClick={save} disabled={!canSave}
            className={`px-6 py-2 text-sm font-bold rounded-lg transition-colors ${
              canSave ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-slate-100 text-slate-300 cursor-not-allowed'
            }`}>
            저장
          </button>
        </div>
      </div>

      {/* 저장 목록 */}
      {savedList.length > 0 && (
        <div className="border-t border-slate-100 px-5 py-3">
          <p className="text-xs font-bold text-slate-500 mb-2">이번 세션 저장 내역</p>
          <div className="space-y-1">
            {savedList.map((r, i) => (
              <div key={i} className="flex items-center gap-3 text-xs text-slate-600 bg-slate-50 rounded px-3 py-1.5">
                <span className="text-slate-400 w-5">{i + 1}</span>
                <span className="w-20">{r.date}</span>
                <span className={`w-10 font-bold ${r.type === '수입' ? 'text-blue-600' : 'text-red-600'}`}>{r.type}</span>
                <span className="flex-1 truncate">{r.summary || '-'}</span>
                <span className="font-medium w-24 text-right">{r.amount.toLocaleString('ko-KR')}</span>
                <span className="w-28 truncate">{r.account}</span>
                <span className="w-16 truncate text-slate-400">{r.note || '-'}</span>
                <span className="w-16 truncate text-slate-400">{r.evidence?.join(',') || '-'}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
