'use client'

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import * as XLSX from 'xlsx'
import {
  incomeAccounts as DEF_INCOME_ACCOUNTS,
  expenseAccounts as DEF_EXPENSE_ACCOUNTS,
  accountCodeMap as DEF_ACCOUNT_CODE_MAP,
  subAccountCodeMap as DEF_SUB_ACCOUNT_CODE_MAP,
  codeToAccount as DEF_CODE_TO_ACCOUNT,
  type AccItem,
} from '@/lib/accounts'
import ReceiptOcrModal, { type ReceiptOcrResult } from '@/components/ReceiptOcrModal'
import { getActiveBook, bookLabel, BOOK_CHANGE_EVENT } from '@/lib/ilovechild-books'

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
  receiptImage?: string    // 첨부한 영수증 사진 URL (/api/receipt-file/…) — 대표(첫 장)
  receiptImages?: string[] // 여러 장(각 1장씩 배열) — 걸음마 이관 시 한 전표에 3~4장
  _bankKey?: string        // 은행거래 자동전표 출처키(계좌|날짜|시간|금액) — 중복 등록 방지
  srcNo?: string           // 데이터이관 출처 시스템의 원본 전표번호(예: 인천/경상북도 증빙번호) — 추적용
  _srcSystem?: string      // 데이터이관 출발지 코드(예: 'gbccm'/'incheon') — 지역형 전용 버튼 오작동 방지용
}

const sampleData: VoucherRow[] = []

// 어린이집 기본 계정 옵션 (아이사랑꿈터는 coa 목으로 대체됨)
const DEF_ACCOUNT_OPTIONS = ['보육료', '보조금', '인건비', '4대보험', '운영비', '기타수입', '전입금', '차입금']
const DEF_SUB_ACCOUNT_MAP: Record<string, string[]> = {
  '보육료': ['정부지원 보육료', '부모부담 보육료'],
  '보조금': ['인건비 보조금', '기관보육료', '연장보육료', '그 밖의 지원금'],
  '인건비': ['기본급', '제수당', '일용잡급', '퇴직급여'],
  '4대보험': ['국민연금', '건강보험', '고용보험', '산재보험'],
  '운영비': ['급간식비', '소모품비', '공공요금', '여비교통비', '수용비', '차량유지비'],
  '기타수입': ['이자수입', '그 밖의 잡수입'],
  '전입금': ['전입금'],
  '차입금': ['단기차입금', '장기차입금'],
}

// ── 계정과목 모델: 어린이집(기본) vs 아이사랑꿈터(coa 목) ──
type AccountModel = {
  incomeAccounts: AccItem[]; expenseAccounts: AccItem[]
  accountOptions: string[]; subAccountMap: Record<string, string[]>
  accountCodeMap: Record<string, string>; subAccountCodeMap: Record<string, string>
  codeToAccount: Record<string, { account: string; subAccount: string }>
}
const DEFAULT_MODEL: AccountModel = {
  incomeAccounts: DEF_INCOME_ACCOUNTS, expenseAccounts: DEF_EXPENSE_ACCOUNTS,
  accountOptions: DEF_ACCOUNT_OPTIONS, subAccountMap: DEF_SUB_ACCOUNT_MAP,
  accountCodeMap: DEF_ACCOUNT_CODE_MAP, subAccountCodeMap: DEF_SUB_ACCOUNT_CODE_MAP,
  codeToAccount: DEF_CODE_TO_ACCOUNT,
}
interface CoaSub { code: string; name: string }
interface CoaMok { code: string; name: string; subs?: CoaSub[] }
interface CoaHang { code: string; name: string; moks?: CoaMok[] }
interface CoaGwan { gubun: string; code: string; name: string; hangs?: CoaHang[] }
/** 회계계정관리(coa) 트리 → 전표 계정 모델 (세입→수입계정, 세출→지출계정, 목=계정/세목=세목). null이면 어린이집 기본. */
function buildAccountModel(tree: CoaGwan[] | null): AccountModel {
  if (!tree) return DEFAULT_MODEL
  const incomeAccounts: AccItem[] = []
  const expenseAccounts: AccItem[] = []
  const accountOptions: string[] = []
  const subAccountMap: Record<string, string[]> = {}
  const accountCodeMap: Record<string, string> = {}
  const subAccountCodeMap: Record<string, string> = {}
  const codeToAccount: Record<string, { account: string; subAccount: string }> = {}
  for (const g of tree) {
    const arr = g.gubun === '세입' ? incomeAccounts : expenseAccounts
    for (const h of g.hangs || []) for (const m of h.moks || []) {
      arr.push({ value: m.name, label: m.name })
      if (!accountOptions.includes(m.name)) accountOptions.push(m.name)
      accountCodeMap[m.name] = m.code
      codeToAccount[m.code] = { account: m.name, subAccount: '' }
      for (const s of m.subs || []) {
        arr.push({ value: `세목:${s.name}`, label: s.name, isSub: true })
        ;(subAccountMap[m.name] ||= []).push(s.name)
        subAccountCodeMap[s.name] = s.code
        codeToAccount[s.code] = { account: m.name, subAccount: s.name }
      }
    }
  }
  return { incomeAccounts, expenseAccounts, accountOptions, subAccountMap, accountCodeMap, subAccountCodeMap, codeToAccount }
}

const fmt = (n: number) => n.toLocaleString('ko-KR')

/** 계정과목/세목 표시 — 공백 없이 붙여서 + 길면 폰트를 낮춰 셀 안에 들어가도록 */
function acctDisplay(name: string): { text: string; sizeCls: string } {
  const text = (name || '').replace(/\s+/g, '')
  const len = text.length
  const sizeCls = len >= 11 ? 'text-[9px]' : len >= 8 ? 'text-[10px]' : 'text-[11px]'
  return { text, sizeCls }
}

export default function VoucherInputPage() {
  const [rows, setRows] = useState<VoucherRow[]>(sampleData)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<string>('')
  const [loaded, setLoaded] = useState(false)  // ← mount 로드 완료 전엔 자동저장 금지
  // 아이사랑꿈터 장부(계정) — 3개 장부별로 전표가 분리 저장됨. 어린이집은 '' (분리 안 함)
  const [book, setBook] = useState<string | null>(null)  // null = 아직 결정 전
  const [bankBusy, setBankBusy] = useState(false)        // 은행미등록(은행거래→전표) 처리 중
  const [showManualEntry, setShowManualEntry] = useState(false)  // 수기등록 팝업
  const [acctPopPos, setAcctPopPos] = useState<{ x: number; y: number } | null>(null)  // 계정과목 팝업 위치(드래그 이동)
  const startAcctDrag = (e: React.MouseEvent) => {
    e.preventDefault()
    const startX = e.clientX, startY = e.clientY
    const base = acctPopPos || { x: Math.round(window.innerWidth / 2 - 170), y: Math.round(window.innerHeight / 2 - Math.min(window.innerHeight * 0.44, 380)) }
    const onMove = (me: MouseEvent) => setAcctPopPos({ x: base.x + (me.clientX - startX), y: base.y + (me.clientY - startY) })
    const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp) }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }
  const [bookSwitchMsg, setBookSwitchMsg] = useState('')  // 장부 전환 저장 알림
  const bookRef = useRef('')
  // 최신 rows/loaded 를 이벤트 핸들러(mount 클로저)에서 참조하기 위한 ref
  const rowsRef = useRef<VoucherRow[]>([])
  const loadedRef = useRef(false)
  useEffect(() => { rowsRef.current = rows }, [rows])
  useEffect(() => { loadedRef.current = loaded }, [loaded])

  // 1) 기관 유형 확인 → 초기 장부 결정 + 장부 변경 이벤트 구독
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      let itype = 'childcare'
      try {
        const me = await fetch('/api/auth/me').then(r => r.json())
        itype = (me?.institutionType || me?.profile?.institutionType || 'childcare') as string
      } catch { /* ignore */ }
      if (!cancelled) setBook(itype === 'ilovechild' ? getActiveBook() : '')
    })()
    // 장부 전환 시: 편집 중이던 이전 장부를 먼저 저장하고 알림 → 새 장부 로드
    const onBookChange = async (e: Event) => {
      const next = ((e as CustomEvent).detail as string) || ''
      const prev = bookRef.current
      if (prev && prev !== next && loadedRef.current) {
        try {
          await persistRows(rowsRef.current)   // persistRows 는 bookRef.current(=prev) 로 저장
          setBookSwitchMsg(`💾 ${bookLabel(prev)} 장부 저장 완료 → ${bookLabel(next)} 장부로 이동합니다`)
          setTimeout(() => setBookSwitchMsg(''), 3500)
        } catch { /* 저장 실패해도 이동은 진행 */ }
      }
      setBook(next)
    }
    window.addEventListener(BOOK_CHANGE_EVENT, onBookChange)
    return () => { cancelled = true; window.removeEventListener(BOOK_CHANGE_EVENT, onBookChange) }
  }, [])

  // 2) 장부 결정/변경 시 해당 장부 전표 로드 (loaded=false 로 전환 → 자동저장 취소·오저장 방지)
  useEffect(() => {
    if (book === null) return
    bookRef.current = book
    setLoaded(false)
    let cancelled = false
    fetch(`/api/voucher/list?book=${encodeURIComponent(book)}`, { credentials: 'include' })
      .then(r => r.json())
      .then(j => {
        if (cancelled) return
        setRows(j.success && Array.isArray(j.list) ? (j.list as VoucherRow[]) : [])
        setSavedAt(j.savedAt ? String(j.savedAt) : '')
      })
      .catch(() => { if (!cancelled) setRows([]) })
      .finally(() => { if (!cancelled) setLoaded(true) })
    return () => { cancelled = true }
  }, [book])

  // 저장 (DB 영속) — 저장 버튼 onClick + 행 변경 시 자동 (debounce)
  const persistRows = async (next: VoucherRow[]) => {
    setSaving(true)
    try {
      const res = await fetch('/api/voucher/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ list: next, book: bookRef.current }),
      })
      const j = await res.json()
      if (j.success) {
        setSavedAt(new Date().toISOString())
      } else {
        console.error('[voucher save] 실패:', j)
      }
    } catch (e) {
      console.error('[voucher save] 오류:', e)
    } finally {
      setSaving(false)
    }
  }

  // 행 변경 시 자동 저장 (1.5초 debounce)
  useEffect(() => {
    if (!loaded) return         // mount 로드 완료 전엔 저장 금지 (빈 배열 덮어쓰기 방지)
    if (rows === sampleData) return  // 초기값 무시
    const t = setTimeout(() => { persistRows(rows) }, 1500)
    return () => clearTimeout(t)
  }, [rows, loaded])
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
  // 데이터이관 [→ 전표관리로 이동]에서 ?ym=YYYY-MM 로 진입 시 그 달로 열기(저장 데이터가 안 보이던 문제 해결)
  useEffect(() => {
    const ym = new URLSearchParams(window.location.search).get('ym')
    if (ym && /^\d{4}-\d{2}$/.test(ym)) setFilterYearMonth(ym)
  }, [])

  // 아이사랑꿈터: 활성 장부의 coa 계정과목 로드 → 전표 계정 드롭다운/코드에 사용 (어린이집은 기본 accounts.ts)
  const [coaTree, setCoaTree] = useState<CoaGwan[] | null>(null)
  const coaYear = filterYearMonth.slice(0, 4)
  useEffect(() => {
    if (!book) { setCoaTree(null); return }
    let alive = true
    fetch(`/api/coa?book=${encodeURIComponent(book)}&year=${coaYear}`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => { if (alive) setCoaTree(Array.isArray(d?.list) ? (d.list as CoaGwan[]) : []) })
      .catch(() => { if (alive) setCoaTree(null) })
    return () => { alive = false }
  }, [book, coaYear])
  const acctModel = useMemo(() => buildAccountModel(book && coaTree ? coaTree : null), [book, coaTree])
  const { incomeAccounts, expenseAccounts, accountOptions, subAccountMap, accountCodeMap, subAccountCodeMap, codeToAccount } = acctModel
  // 아이사랑꿈터(book)는 등록/수수료/원아 컬럼 미사용 → 컬럼설정·테이블에서 완전 제거
  // 아이사랑꿈터(book 있음): 어린이집용 컬럼 숨김. 영수/이체/은행/증빙(evidence)은 안 쓰므로 숨기고 첨부(영수증사진)만 유지.
  const hiddenCol = (key: string) => key === 'register' || (!!book && (key === 'fee' || key === 'child' || key === 'evidence'))
  const [filterDayFrom, setFilterDayFrom] = useState(0) // 0 = 전체
  const [filterDayTo, setFilterDayTo] = useState(0)
  const [sortMode, setSortMode] = useState<'' | '수입부우선' | '전표번호' | '전체'>('')
  const [showToolbar, setShowToolbar] = useState(false)
  const [inputMode, setInputMode] = useState<'간편등록' | '건별등록' | '상세등록' | '일괄수정'>('일괄수정')
  const [excelParsed, setExcelParsed] = useState<{ day: string; type: '수입' | '지출'; summary: string; incomeAmount: string; expenseAmount: string; account: string; subAccount: string; accountCode: string; payment: string }[]>([])
  const [excelFileName, setExcelFileName] = useState('')
  const [showColumnSettings, setShowColumnSettings] = useState(false)
  const [columnOrder, setColumnOrder] = useState<[string, string, string][]>([
    ['no', '번호', '1'], ['date', '일자', '2'], ['type', '입력방식', '3'], ['summary', '적요', '4'],
    ['srcNo', '원본번호', '4b'],
    ['evidence', '증빙(은행/영수)', '5'], ['register', '등록', '6'], ['attach', '첨부', '7'],
    ['amountGroup', '금액(수입/지출/잔액)', '8'],
    ['accountGroup', '계정(복사/세목/코드/분리/반납)', '9'], ['fee', '수수료', '10'],
    ['counterpart', '거래처', '11'], ['payment', '결제방식', '12'], ['child', '원아', '13'], ['sort', '정렬', '14'],
  ])
  const columnSettingsRef = useRef<HTMLDivElement>(null)
  const [visibleColumns, setVisibleColumns] = useState({
    no: true, date: true, type: true, summary: true, srcNo: true,
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

  // 은행거래(저장분) → 전표 미등록분만 전표로 생성. silent=자동(전표관리 진입 시), 아니면 [은행미등록] 버튼
  const registerBankTx = async (silent: boolean) => {
    if (bankBusy) return
    setBankBusy(true)
    try {
      const bnum = (v: unknown) => Number(String(v ?? '').replace(/[^0-9.-]/g, '')) || 0
      // 이 장부의 계좌 목록 (어린이집=단일 / 아이사랑꿈터=해당 장부)
      const accUrl = book ? `/api/bank/accounts?book=${encodeURIComponent(book)}` : `/api/bank/accounts?book=`
      const accs = ((await (await fetch(accUrl)).json()).accounts || []) as { accountNo: string }[]
      const acctNos = Array.from(new Set(accs.map(a => a.accountNo).filter(Boolean)))
      if (acctNos.length === 0) { if (!silent) alert('등록된 계좌가 없습니다.\n(전표관리 › 계좌내역에서 계좌 등록·조회 먼저)'); return }
      const tx = ((await (await fetch(`/api/bank/saved?ym=${encodeURIComponent(filterYearMonth)}&acctNos=${acctNos.join(',')}`)).json()).rows || []) as Record<string, string>[]
      if (tx.length === 0) { if (!silent) alert(`${filterYearMonth} 저장된 은행거래가 없습니다.\n(계좌내역에서 조회 먼저)`); return }
      let payMap: Record<string, string> = {}
      try { payMap = JSON.parse(localStorage.getItem('bank-payment-map') || '{}') } catch {}
      const memoBlank = localStorage.getItem('bank-memoBlank') === '1'          // 토글3: 적요 빈칸
      const memoToCounterpart = localStorage.getItem('bank-tradeSync') !== '0'  // 토글2: 적요/의뢰인 → 거래처 (기본 ON)
      const existing = new Set((rowsRef.current || []).map(r => r._bankKey).filter(Boolean))
      const news: VoucherRow[] = []
      let base = nextId()
      for (const t of tx) {
        const inAmt = bnum(t.inAmt), outAmt = bnum(t.outAmt)
        const amt = inAmt > 0 ? inAmt : outAmt
        if (amt === 0) continue
        const d8 = String(t.trDt || '').replace(/[^0-9]/g, '').slice(0, 8)
        const key = `${t.acctNo}|${d8}|${String(t.trTm || '').replace(/[^0-9]/g, '')}|${amt}`
        if (existing.has(key)) continue
        const date = d8.length === 8 ? `${d8.slice(0, 4)}-${d8.slice(4, 6)}-${d8.slice(6, 8)}` : `${filterYearMonth}-01`
        const memo = t.trNm || t.trTp || ''
        news.push({
          id: base++, date, type: inAmt > 0 ? '수입' : '지출',
          account: '', subAccount: '', accountCode: '',
          summary: memoBlank ? '' : memo, amount: amt,
          counterpart: memoToCounterpart ? (t.trNm || '') : '',
          note: payMap[t.trTp] || '', approved: false, inputMethod: '은행',
          _bankKey: key,
        })
      }
      if (news.length === 0) { if (!silent) alert('추가할 미등록 은행거래가 없습니다. (모두 등록됨)'); return }
      setRows(prev => [...prev, ...news].sort((a, b) => a.date.localeCompare(b.date) || (a.type === '수입' ? -1 : 1)))
      if (!silent) alert(`${news.length}건의 은행거래를 전표로 추가했습니다.\n※ 계정과목은 직접 지정해 주세요.`)
    } catch (e) { if (!silent) alert('은행미등록 처리 실패: ' + (e instanceof Error ? e.message : String(e))) }
    finally { setBankBusy(false) }
  }

  // 전표관리 진입 시 자동(토글1 '거래 내역 자동저장' ON 이면) — 로드 완료 + 계좌내역 자동전표
  const autoRanRef = useRef('')
  useEffect(() => {
    if (!loaded || book === null) return
    const on = localStorage.getItem('bank-autoSave') !== '0'  // 기본 ON
    const tag = `${book}::${filterYearMonth}`
    if (on && autoRanRef.current !== tag) { autoRanRef.current = tag; registerBankTx(true) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, book, filterYearMonth])

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

  // 출납년월 이전달/다음달 이동 (드롭다운 열지 않고 클릭 한 번으로 인접 월 이동)
  const shiftYearMonth = (delta: number) => {
    const [y, m] = filterYearMonth.split('-').map(Number)
    const d = new Date(y, m - 1 + delta, 1)
    setFilterYearMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
    setFilterDayFrom(0); setFilterDayTo(0)
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
      account: book ? '' : '운영비',
      subAccount: book ? '' : '소모품비',
      summary: '',
      amount: 0,
      counterpart: '',
      note: '',
      approved: false,
    }
    setRows(prev => [...prev, newRow])
    setEditingCell({ rowId: newRow.id, field: 'summary' })
  }

  // 삭제 전 휴지통(voucher-deleted)에 보관 — 실패해도 삭제 자체는 진행(휴지통은 best-effort)
  const archiveDeleted = async (removed: VoucherRow[]) => {
    if (removed.length === 0) return
    try {
      const cur = await fetch(`/api/voucher/deleted-list?book=${encodeURIComponent(bookRef.current || '')}`, { credentials: 'include' })
        .then(r => r.json()).catch(() => ({ list: [] }))
      const existing = Array.isArray(cur.list) ? cur.list : []
      const stamped = removed.map(r => ({ ...r, deletedAt: new Date().toISOString() }))
      await fetch('/api/voucher/deleted-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ list: [...existing, ...stamped], book: bookRef.current || '' }),
      })
    } catch (e) {
      console.error('[voucher deleted archive] 실패:', e)
    }
  }

  const deleteRows = () => {
    if (checked.size === 0) return
    // ⚠ id 로만 매칭하면 다른 달 전표와 우연히 같은 id(이관 배치마다 1번부터 재사용됨)를 가진 행까지
    // 같이 지워질 위험이 있음 — 먼저 현재 보이는(filtered) 행으로 좁힌 뒤, 그 정확한 객체 참조로만 제거.
    const removed = filtered.filter(r => checked.has(r.id))
    const removedSet = new Set(removed)
    void archiveDeleted(removed)
    setRows(prev => prev.filter(r => !removedSet.has(r)))
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

  // 영수증 사진 OCR 모달 대상 행 id
  const [receiptRowId, setReceiptRowId] = useState<number | null>(null)
  const [galleryImages, setGalleryImages] = useState<string[] | null>(null)  // 영수증 여러 장 갤러리

  // 전표수정(인천시 aincheon) — gbccm 과 동일 패턴: 팝업에서 값을 다시 입력받지 않고, 통합e
  // 전표관리 표에서 "이미 수정해둔" 결제방식(row.note)/적요(row.summary)/계정과목(row.account)
  // 현재 값을 그대로 원본번호(BILL_NUMDETAIL) 기준으로 실제 인천시 전표에 반영한다.
  // ⚠ 2026-07-13: 결제방식 코드(SETLE_MTHD)는 하드코딩하지 않음 — 원장님이 실제 인천시 화면에서
  // 캡처해준 결제방식 드롭다운 라벨 11개만 사용하고, 코드는 서버가 그 달의 기존 전표에서 같은
  // 라벨(SETLE_MTHD_NAME)을 쓰는 행을 찾아 코드를 그대로 복사(계정과목 매칭과 동일 방식) —
  // 코드를 잘못 추측해서 엉뚱한 결제방식으로 저장되는 사고를 방지하기 위함.
  const [incheonEditRows, setIncheonEditRows] = useState<VoucherRow[]>([])
  const [incheonSaving, setIncheonSaving] = useState(false)
  const [incheonProgressIdx, setIncheonProgressIdx] = useState(-1)
  const [incheonResults, setIncheonResults] = useState<Record<number, string>>({})
  const AINCHEON_METHOD_LABELS = [
    '국민행복카드', '계좌이체', '보조금', '전입금', '지정후원금', '비지정후원금', '카드결제', '자동이체', '지로', '현금결제', '기타',
  ]
  const openIncheonEdit = (rows: VoucherRow[]) => { setIncheonEditRows(rows); setIncheonResults({}); setIncheonProgressIdx(-1) }
  const closeIncheonEdit = () => { setIncheonEditRows([]); setIncheonResults({}); setIncheonProgressIdx(-1) }
  const incheonNorm = (s: string) => (s || '').replace(/\s+/g, '').trim()
  const submitOneIncheonEdit = async (row: VoucherRow): Promise<string> => {
    if (!row.srcNo) return '❌ 원본번호(전표번호) 없음'
    const digits = row.date.replace(/\D/g, '')
    const yearMonth = digits.length >= 6 ? digits.slice(0, 6) : ''
    if (!yearMonth) return '❌ 날짜에서 조회월을 알 수 없음'
    const methodMatch = AINCHEON_METHOD_LABELS.find(m => incheonNorm(m) === incheonNorm(row.note))
    const body: Record<string, string> = { billNumDetail: row.srcNo, yearMonth, memo: row.summary || '' }
    // ⚠ sttlMethodCode 는 일부러 안 보냄 — 서버가 같은 달 기존 전표에서 코드를 찾아 채움
    if (methodMatch) body.sttlMethodName = methodMatch
    if (row.account) body.accountName = row.account
    if (row.subAccount) body.subAccountName = row.subAccount
    try {
      const res = await fetch('/api/incheon/update-voucher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ edits: [body] }),
        signal: AbortSignal.timeout(120_000),
      })
      const j = await res.json()
      const one = Array.isArray(j.results) ? j.results[0] : null
      if (j.success && one?.ok) return '✅ 전표수정 완료'
      return `❌ ${one?.message || j.error || '전표수정 실패'}`
    } catch (e) {
      const timedOut = e instanceof Error && e.name === 'TimeoutError'
      return timedOut ? '❌ 처리 시간 초과(2분)' : `❌ ${e instanceof Error ? e.message : '연결 실패'}`
    }
  }
  // 체크된 전표 여러 건을 순차 처리 — 진행중 인덱스/결과를 실시간으로 갱신해 모달에서 진행 상황을 볼 수 있게 함.
  const submitIncheonEdit = async () => {
    if (incheonEditRows.length === 0) return
    setIncheonSaving(true)
    for (let i = 0; i < incheonEditRows.length; i++) {
      setIncheonProgressIdx(i)
      const row = incheonEditRows[i]
      const msg = await submitOneIncheonEdit(row)
      setIncheonResults(prev => ({ ...prev, [row.id]: msg }))
    }
    setIncheonProgressIdx(-1)
    setIncheonSaving(false)
  }

  // 전표수정(경상북도 gbccm) — 팝업에서 값을 다시 입력받지 않고, 통합e 전표관리 표에서 "이미 수정해둔"
  // 결제방식(row.note)/적요(row.summary)/계정과목(row.account) 현재 값을 그대로 실제 시스템에 반영한다.
  // 체크한 전표 여러 건을 한 번에 담아 순차 처리(한 건씩 gbccm 화면을 조작해야 해서 동시 처리는 불가).
  const [gbccmEditRows, setGbccmEditRows] = useState<VoucherRow[]>([])
  const [gbccmSaving, setGbccmSaving] = useState(false)
  const [gbccmProgressIdx, setGbccmProgressIdx] = useState(-1) // 현재 처리 중인 gbccmEditRows 인덱스
  const [gbccmResults, setGbccmResults] = useState<Record<number, string>>({}) // row.id → 결과 메시지
  // 경상북도(gbccm) 실제 시스템의 유효 계정과목/결제방식 목록(2026-07-11 실측) — row 의 현재 값이 이 목록과
  // 정확히 일치할 때만 그 항목을 전송(안 맞으면 조용히 스킵해 오작동 방지, 화면에 매칭 여부 표시).
  const GBCCM_ACCOUNTS_ALL = [
    '정부지원 보육료', '부모부담 보육료', '특별활동비', '기타 필요경비', '인건비 보조금', '기관보육료', '연장보육료',
    '공공형 운영비', '그 밖의 지원금', '자본보조금', '전입금', '단기차입금', '장기차입금', '지정후원금', '비지정후원금',
    '적립금 처분 수입', '과년도 수입', '이자수입', '그 밖의 잡수입', '전년도 이월금', '전년도 이월사업비',
    '원장급여', '원장수당', '보육교직원급여', '보육교직원수당', '기타 인건비', '법정부담금', '퇴직금 및 퇴직적립금',
    '수용비 및 수수료', '공공요금 및 제세공과금', '연료비', '여비', '차량비', '복리후생비', '기타 운영비', '업무추진비',
    '직책급', '회의비', '교직원연수·연구비', '교재·교구 구입비', '행사비', '영유아복리비', '급식·간식 재료비',
    '특별활동비지출', '기타 필요경비 지출', '적립금', '단기 차입금 상환', '장기 차입금 상환', '보조금 반환금',
    '보호자 반환금', '법인회계 전출금', '시설비', '시설장비 유지비', '자산취득비', '과년도 지출', '잡지출', '예비비',
  ]
  const GBCCM_METHODS: { code: string; label: string }[] = [
    { code: '100', label: '카드결제' }, { code: '200', label: '국민행복카드' }, { code: '300', label: '계좌이체' },
    { code: '400', label: '자동이체' }, { code: '500', label: '지로' }, { code: '600', label: '현금결제' }, { code: '700', label: '기타' },
  ]
  // 경상북도(gbccm) "계정코드검색" 팝업 실측(2026-07-11) — 세목이 있는 계정은 부모 목("퇴직금 및 퇴직적립금"
  // [142]) 과 세목 leaf("퇴직금"[142-111]/"퇴직적립금"[142-121])가 팝업에 별도 행으로 함께 존재하고,
  // 부모명으로 검색하면 세목이 아닌 부모(142) 행이 먼저 매칭돼버림(일부 leaf 는 이름이 부모와 동일해 더 위험 —
  // 예: "자산취득비" 가 부모[721] 이름과 세목[721-002] 이름이 같음). 통합e accountCode(5자리) 로 어느
  // leaf 인지 확정한 뒤, gbccm 의 "[코드-세목코드]" 대괄호 표기를 그대로 검색어로 써서 정확히 그 행만 선택.
  const GBCCM_LEAF_CODE_MAP: Record<string, { search: string; label: string }> = {
    '21423': { search: '[ 142-111 ]', label: '퇴직금' },
    '21424': { search: '[ 142-121 ]', label: '퇴직적립금' },
    '22171': { search: '[ 217-111 ]', label: '임대료' },
    '22172': { search: '[ 217-121 ]', label: '건물융자금의이자' },
    '24211': { search: '[ 421-111 ]', label: '입학준비금' },
    '24212': { search: '[ 421-121 ]', label: '현장학습비' },
    '24213': { search: '[ 421-131 ]', label: '차량운행비' },
    '24214': { search: '[ 421-141 ]', label: '부모부담행사비' },
    '24215': { search: '[ 421-151 ]', label: '아침.저녁급식비' },
    '24216': { search: '[ 421-161 ]', label: '기타시도특성화비' },
    '27211': { search: '[ 721-001 ]', label: '차량할부금' },
    '27212': { search: '[ 721-002 ]', label: '자산취득비' },
  }
  const openGbccmEdit = (rows: VoucherRow[]) => { setGbccmEditRows(rows); setGbccmResults({}); setGbccmProgressIdx(-1) }
  const closeGbccmEdit = () => { setGbccmEditRows([]); setGbccmResults({}); setGbccmProgressIdx(-1) }
  // 공백 차이(예: "정부지원 보육료" vs "정부지원보육료")로 인한 오탐 매칭 실패 방지 — 공백 제거 후 비교
  const gbccmNorm = (s: string) => (s || '').replace(/\s+/g, '').trim()
  // 계정과목 전송값 결정 — 세목 있는 계정(accountCode 로 판별)은 leaf 대괄호코드로 찾되, 선택 후 확인은
  // 코드 없이 순수 이름(예: "퇴직금")만 남으므로 verify 텍스트를 따로 둠. 세목 없으면 부모명 그대로 비교.
  const resolveGbccmAccount = (row: VoucherRow): { search: string; verify: string; display: string } | null => {
    const leaf = GBCCM_LEAF_CODE_MAP[row.accountCode || '']
    if (leaf) return { search: leaf.search, verify: leaf.label, display: `${row.account} · ${leaf.label}` }
    const found = GBCCM_ACCOUNTS_ALL.find(a => gbccmNorm(a) === gbccmNorm(row.account))
    return found ? { search: found, verify: found, display: found } : null
  }
  // 전표 한 건에 대한 gbccm 반영 — 결과 메시지 문자열 반환(호출부가 gbccmResults 에 기록)
  const submitOneGbccmEdit = async (row: VoucherRow): Promise<string> => {
    if (!row.srcNo) return '❌ 원본번호 없음'
    const methodMatch = GBCCM_METHODS.find(m => gbccmNorm(m.label) === gbccmNorm(row.note))
    const accountMatch = resolveGbccmAccount(row)
    if (!methodMatch && !accountMatch) return '❌ 결제방식/계정과목 둘 다 목록 불일치 — 전송 항목 없음'
    try {
      const body: Record<string, string> = { prfNo: row.srcNo, memo: row.summary || '' }
      if (methodMatch) body.sttlMethod = methodMatch.code
      if (accountMatch) { body.accountName = accountMatch.search; body.accountVerifyText = accountMatch.verify }
      const res = await fetch('/api/gbccm/vouchers/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      })
      const j = await res.json()
      if (j.success) return '✅ 전표수정 완료'
      return `❌ ${j.error || j.message || '전표수정 실패'}`
    } catch (e) {
      return `❌ ${e instanceof Error ? e.message : '연결 실패'}`
    }
  }
  // 체크된 전표 여러 건을 순차 처리(gbccm 은 화면조작 방식이라 동시에 여러 건 처리 불가) — 진행중 인덱스/
  // 결과를 실시간으로 갱신해 모달에서 진행 상황을 볼 수 있게 함.
  const submitGbccmEdit = async () => {
    if (gbccmEditRows.length === 0) return
    setGbccmSaving(true)
    for (let i = 0; i < gbccmEditRows.length; i++) {
      setGbccmProgressIdx(i)
      const row = gbccmEditRows[i]
      const msg = await submitOneGbccmEdit(row)
      setGbccmResults(prev => ({ ...prev, [row.id]: msg }))
    }
    setGbccmProgressIdx(-1)
    setGbccmSaving(false)
  }
  // 행의 영수증 전체 URL 목록 (배열 우선. 옛 데이터의 콤마 문자열도 호환)
  const receiptListOf = (row: VoucherRow): string[] => {
    const raw = row.receiptImages as unknown
    const multi = Array.isArray(raw) ? raw.filter(Boolean)
      : (typeof raw === 'string' ? raw.split(',').map(s => s.trim()).filter(Boolean) : [])
    if (multi.length) return multi
    return row.receiptImage ? [row.receiptImage] : []
  }
  // OCR 결과를 해당 전표 행에 반영 (구분/적요/금액/계정과목 한 번에)
  const applyReceiptToRow = (rowId: number, r: ReceiptOcrResult) => {
    setRows(prev => prev.map(row => {
      if (row.id !== rowId) return row
      const account = r.account || row.account
      const subAccount = r.subAccount || row.subAccount
      const code = (subAccountCodeMap[subAccount]) || accountCodeMap[account] || row.accountCode || ''
      // 영수증 날짜는 같은 년-월일 때만 반영 (다른 월이면 현재 조회월 필터에서 행이 사라짐)
      const date = /^\d{4}-\d{2}-\d{2}$/.test(r.date) && r.date.slice(0, 7) === row.date.slice(0, 7) ? r.date : row.date
      return { ...row, type: '지출', date, summary: r.store || row.summary, amount: r.total || row.amount, account, subAccount, accountCode: code }
    }))
  }

  // 분석 없이 사진만 첨부한 경우 — 해당 행에 이미지 URL 저장
  const applyReceiptImageToRow = (rowId: number, url: string) => {
    setRows(prev => prev.map(row => row.id === rowId ? { ...row, receiptImage: url } : row))
  }

  // ── 모바일 전용 (폰) ── 넓은 PC 표 대신 카드형 + 영수증 촬영 중심
  const [mobileEditId, setMobileEditId] = useState<number | null>(null)
  const mobileNewRow = (openReceipt: boolean) => {
    const nowYmd = new Date().toISOString().slice(0, 10)
    const day = nowYmd.slice(0, 7) === filterYearMonth ? nowYmd.slice(8, 10) : '01'
    const newRow: VoucherRow = {
      id: nextId(), date: `${filterYearMonth}-${day}`, type: '지출',
      account: book ? '' : '운영비', subAccount: book ? '' : '소모품비', summary: '', amount: 0,
      counterpart: '', note: '', approved: false,
    }
    setRows(prev => [...prev, newRow])
    if (openReceipt) setReceiptRowId(newRow.id)
    else setMobileEditId(newRow.id)
  }
  const mobileDeleteRow = (target: VoucherRow) => {
    // ⚠ id 만으로 매칭하면 다른 달의 동일 id 행까지 같이 지워질 수 있어 정확한 객체 참조로 제거.
    void archiveDeleted([target])
    setRows(prev => prev.filter(r => r !== target))
    if (mobileEditId === target.id) setMobileEditId(null)
  }

  return (
    <div className="space-y-4">
      <ReceiptOcrModal open={receiptRowId !== null} onClose={() => setReceiptRowId(null)} accountOptions={accountOptions} subAccountMap={subAccountMap} onApply={r => { if (receiptRowId !== null) applyReceiptToRow(receiptRowId, r) }} onAttach={url => { if (receiptRowId !== null) applyReceiptImageToRow(receiptRowId, url) }} />
      {/* 영수증 여러 장 갤러리 */}
      {galleryImages && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4" onClick={() => setGalleryImages(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-[92vw] max-w-3xl max-h-[88vh] overflow-y-auto p-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[11px] font-bold text-slate-800">🧾 첨부 영수증 {galleryImages.length}장</h3>
              <button onClick={() => setGalleryImages(null)} className="text-slate-400 hover:text-slate-700 text-xl leading-none">✕</button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {galleryImages.map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noreferrer" className="block group relative">
                  <img src={url} alt={`영수증 ${i + 1}`} className="w-full h-40 object-cover rounded-lg border border-slate-200 group-hover:ring-2 group-hover:ring-blue-400" />
                  <span className="absolute top-1 left-1 bg-black/60 text-white text-[10px] font-bold rounded px-1.5 py-0.5">{i + 1}</span>
                </a>
              ))}
            </div>
            <p className="text-[11px] text-slate-400 mt-3">· 사진을 클릭하면 원본이 새 창에 열립니다.</p>
          </div>
        </div>
      )}

      {/* 전표수정 — 원본번호(srcNo=BILL_NUMDETAIL) 기준으로 인천시(aincheon) 시스템에
          결제방식/적요/계정과목 반영. 새 전표를 추가하는 게 아니라 기존 전표를 실제로 수정함. */}
      {incheonEditRows.length > 0 && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4" onClick={() => !incheonSaving && closeIncheonEdit()}>
          <div className="bg-white rounded-xl shadow-2xl w-[92vw] max-w-lg max-h-[85vh] overflow-y-auto p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-800">전표수정(인천시) · {incheonEditRows.length}건</h3>
              <button onClick={() => !incheonSaving && closeIncheonEdit()} className="text-slate-400 hover:text-slate-700 text-xl leading-none">✕</button>
            </div>
            <p className="text-[11px] text-slate-400 mb-3">
              통합e 전표관리 표에서 <b>이미 수정해두신 현재 값</b> 그대로 인천시어린이집관리시스템 실제 전표에 순서대로 반영합니다(원본번호 기준 — 새 전표 추가 아님).
              (값을 바꾸시려면 이 창을 닫고 표에서 직접 수정 후 다시 눌러주세요)
            </p>
            <div className="mb-4 divide-y divide-slate-100 border border-slate-100 rounded-lg overflow-hidden">
              {incheonEditRows.map((row, i) => {
                const methodMatch = AINCHEON_METHOD_LABELS.find(m => incheonNorm(m) === incheonNorm(row.note))
                const result = incheonResults[row.id]
                const isCurrent = incheonSaving && incheonProgressIdx === i
                return (
                  <div key={row.id} className={`p-2.5 ${isCurrent ? 'bg-teal-50' : ''}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-700">원본번호 {row.srcNo}</span>
                      {isCurrent && <span className="text-[11px] font-bold text-teal-600">처리 중…</span>}
                      {result && <span className={`text-[11px] font-bold ${result.startsWith('✅') ? 'text-emerald-600' : 'text-rose-500'}`}>{result}</span>}
                    </div>
                    <div className="text-[11px] text-slate-500 flex flex-wrap gap-x-3 gap-y-0.5">
                      <span className={row.note && !methodMatch ? 'text-rose-400' : ''}>
                        결제방식: {row.note || '(빈 값)'}{row.note && !methodMatch && ' ⚠(인천시 결제방식 목록에 없는 값 — 건너뜀)'}
                      </span>
                      <span>적요: {row.summary}</span>
                      <span>계정과목: {row.account}{row.subAccount ? ` · 세목: ${row.subAccount}` : ''}</span>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => !incheonSaving && closeIncheonEdit()} disabled={incheonSaving} className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-50">닫기</button>
              <button onClick={submitIncheonEdit} disabled={incheonSaving} className="px-3 py-1.5 text-xs font-bold rounded-lg bg-teal-500 hover:bg-teal-600 text-white disabled:opacity-50">
                {incheonSaving ? `처리 중… (${incheonProgressIdx + 1}/${incheonEditRows.length})` : `전표수정 (${incheonEditRows.length}건)`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 전표수정 — 원본번호(srcNo) 기준으로 경상북도(gbccm) 시스템에 결제방식/적요/계정과목 반영.
          체크한 전표가 여러 건이면 한 건씩 순차 처리(gbccm 은 화면조작 방식이라 동시처리 불가). */}
      {gbccmEditRows.length > 0 && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4" onClick={() => !gbccmSaving && closeGbccmEdit()}>
          <div className="bg-white rounded-xl shadow-2xl w-[92vw] max-w-lg max-h-[85vh] overflow-y-auto p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-800">전표수정 · {gbccmEditRows.length}건</h3>
              <button onClick={() => !gbccmSaving && closeGbccmEdit()} className="text-slate-400 hover:text-slate-700 text-xl leading-none">✕</button>
            </div>
            <p className="text-[11px] text-slate-400 mb-3">
              통합e 전표관리 표에서 <b>이미 수정해두신 현재 값</b> 그대로 경상북도 어린이집관리시스템 실제 전표에 순서대로 반영합니다.
              (값을 바꾸시려면 이 창을 닫고 표에서 직접 수정 후 다시 눌러주세요)
            </p>
            <div className="mb-4 divide-y divide-slate-100 border border-slate-100 rounded-lg overflow-hidden">
              {gbccmEditRows.map((row, i) => {
                const methodMatch = GBCCM_METHODS.find(m => gbccmNorm(m.label) === gbccmNorm(row.note))
                const accountMatch = resolveGbccmAccount(row)
                const leaf = GBCCM_LEAF_CODE_MAP[row.accountCode || '']
                const result = gbccmResults[row.id]
                const isCurrent = gbccmSaving && gbccmProgressIdx === i
                return (
                  <div key={row.id} className={`p-2.5 ${isCurrent ? 'bg-teal-50' : ''}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-700">원본번호 {row.srcNo}</span>
                      {isCurrent && <span className="text-[11px] font-bold text-teal-600">처리 중…</span>}
                      {result && <span className={`text-[11px] font-bold ${result.startsWith('✅') ? 'text-emerald-600' : 'text-rose-500'}`}>{result}</span>}
                    </div>
                    <div className="text-[11px] text-slate-500 flex flex-wrap gap-x-3 gap-y-0.5">
                      <span className={methodMatch ? '' : 'text-rose-400'}>결제방식: {row.note || '(빈 값)'}{!methodMatch && ' ⚠'}</span>
                      <span>적요: {row.summary}</span>
                      <span className={accountMatch ? '' : 'text-rose-400'}>계정과목: {row.account}{!accountMatch && ' ⚠'}</span>
                      {row.subAccount && <span className={leaf ? '' : 'text-rose-400'}>세목: {row.subAccount}{!leaf && ' ⚠'}</span>}
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => !gbccmSaving && closeGbccmEdit()} disabled={gbccmSaving} className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-50">닫기</button>
              <button onClick={submitGbccmEdit} disabled={gbccmSaving} className="px-3 py-1.5 text-xs font-bold rounded-lg bg-teal-500 hover:bg-teal-600 text-white disabled:opacity-50">
                {gbccmSaving ? `처리 중… (${gbccmProgressIdx + 1}/${gbccmEditRows.length})` : `전표수정 (${gbccmEditRows.length}건)`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 장부 전환 시 저장 알림 — 아이사랑꿈터 (장부 선택은 상단 헤더) */}
      {bookSwitchMsg && (
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded px-2 py-1">{bookSwitchMsg}</span>
        </div>
      )}

      {/* ═══ 모바일(폰) 전용 화면 — 카드형 + 영수증 촬영 중심 ═══ */}
      <div className="sm:hidden space-y-3">
        <div className="bg-white rounded-xl border border-teal-400/30 shadow-sm p-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-700 shrink-0">전표입력</span>
            <select value={filterYearMonth}
              onChange={e => { setFilterYearMonth(e.target.value); setFilterDayFrom(0); setFilterDayTo(0) }}
              className="ml-auto text-sm border rounded-lg px-2 py-1.5 bg-white">
              {yearMonthOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="flex gap-2 mt-2 text-xs">
            <div className="flex-1 bg-blue-50 rounded-lg px-2 py-1.5 text-center">
              <div className="text-slate-500">수입</div><div className="font-bold text-blue-600">{fmt(totalIncome)}</div>
            </div>
            <div className="flex-1 bg-rose-50 rounded-lg px-2 py-1.5 text-center">
              <div className="text-slate-500">지출</div><div className="font-bold text-rose-600">{fmt(totalExpense)}</div>
            </div>
          </div>
        </div>

        <button onClick={() => mobileNewRow(true)}
          className="w-full py-4 bg-teal-500 text-white rounded-xl font-bold text-base shadow-sm hover:bg-teal-600 flex items-center justify-center gap-2">
          📷 영수증 촬영으로 입력
        </button>

        <div className="space-y-2">
          {filtered.length === 0 && (
            <div className="text-center text-sm text-slate-400 py-10 bg-white rounded-xl border border-slate-100">
              {filterYearMonth} 전표가 없습니다.<br />위 버튼으로 영수증을 촬영해 입력하세요.
            </div>
          )}
          {filtered.map((row, idx) => {
            const subs = subAccountMap[row.account] || []
            const isEdit = mobileEditId === row.id
            const commitField = (field: keyof VoucherRow, value: string | number) => {
              updateRow(row.id, field, value)
              if (field === 'account' || field === 'subAccount') {
                const acc = field === 'account' ? String(value) : row.account
                const sub = field === 'subAccount' ? String(value) : (field === 'account' ? (subAccountMap[String(value)]?.[0] || '') : row.subAccount)
                const code = subAccountCodeMap[sub] || accountCodeMap[acc] || ''
                updateRow(row.id, 'accountCode', code)
              }
            }
            return (
              <div key={row.id} className={`bg-white rounded-xl border ${isEdit ? 'border-blue-300 ring-1 ring-blue-200' : 'border-slate-100'} shadow-sm`}>
                <button onClick={() => setMobileEditId(isEdit ? null : row.id)} className="w-full text-left px-3 py-2.5 flex items-center gap-2">
                  <span className="text-xs text-slate-400 w-8 shrink-0">{idx + 1}</span>
                  <span className={`text-xs font-bold shrink-0 px-1.5 py-0.5 rounded ${row.type === '수입' ? 'bg-blue-50 text-blue-600' : row.type === '반납' ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'}`}>{row.type}</span>
                  <span className="flex-1 min-w-0 truncate text-sm text-slate-700">{row.summary || <span className="text-slate-300">(적요 없음)</span>}</span>
                  <span className={`text-sm font-bold shrink-0 ${row.type === '수입' ? 'text-blue-600' : 'text-rose-600'}`}>{fmt(row.amount)}</span>
                </button>
                <div className="px-3 pb-1.5 flex items-center gap-2 text-xs text-slate-400">
                  <span>{row.date.slice(5)}</span>
                  <span>·</span>
                  <span className="truncate">{acctDisplay(row.account).text}{row.subAccount && row.subAccount !== row.account ? ` / ${acctDisplay(row.subAccount).text}` : ''}</span>
                  {(() => { const rc = receiptListOf(row); return rc.length > 0 && (
                    <button onClick={e => { e.stopPropagation(); setGalleryImages(rc) }} className="ml-auto shrink-0 relative" title={`영수증 ${rc.length}장 보기`}>
                      <img src={rc[0]} alt="영수증" className="w-8 h-8 object-cover rounded border" />
                      {rc.length > 1 && <span className="absolute -top-1 -right-1 bg-teal-500 text-white text-[9px] font-bold rounded-full px-1 leading-tight">{rc.length}</span>}
                    </button>
                  )})()}
                </div>
                {isEdit && (
                  <div className="px-3 pb-3 pt-1 border-t border-slate-100 space-y-2">
                    <label className="block">
                      <span className="text-xs text-slate-500">적요</span>
                      <input value={row.summary} onChange={e => updateRow(row.id, 'summary', e.target.value)}
                        className="mt-0.5 w-full px-2 py-1.5 border rounded bg-white text-sm" />
                    </label>
                    <div className="flex gap-2">
                      <label className="block flex-1">
                        <span className="text-xs text-slate-500">일자</span>
                        <input type="date" value={row.date} onChange={e => { const v = e.target.value; if (v.slice(0, 7) === filterYearMonth) updateRow(row.id, 'date', v) }}
                          className="mt-0.5 w-full px-2 py-1.5 border rounded bg-white text-sm" />
                      </label>
                      <label className="block flex-1">
                        <span className="text-xs text-slate-500">금액</span>
                        <input inputMode="numeric" value={row.amount ? fmt(row.amount) : ''} placeholder="0"
                          onChange={e => updateRow(row.id, 'amount', Number(e.target.value.replace(/[^0-9]/g, '')) || 0)}
                          className="mt-0.5 w-full px-2 py-1.5 border rounded bg-white text-sm text-right font-medium" />
                      </label>
                    </div>
                    <div className="flex gap-2">
                      <label className="block flex-1">
                        <span className="text-xs text-slate-500">구분</span>
                        <select value={row.type} onChange={e => updateRow(row.id, 'type', e.target.value)}
                          className="mt-0.5 w-full px-2 py-1.5 border rounded bg-white text-sm">
                          {['수입', '지출', '반납'].map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </label>
                      <label className="block flex-1">
                        <span className="text-xs text-slate-500">계정</span>
                        <select value={row.account} onChange={e => commitField('account', e.target.value)}
                          className="mt-0.5 w-full px-2 py-1.5 border rounded bg-white text-sm">
                          {accountOptions.map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                      </label>
                      <label className="block flex-1">
                        <span className="text-xs text-slate-500">세목</span>
                        <select value={row.subAccount} onChange={e => commitField('subAccount', e.target.value)}
                          className="mt-0.5 w-full px-2 py-1.5 border rounded bg-white text-sm">
                          <option value="">(선택)</option>
                          {subs.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </label>
                    </div>
                    {row.receiptImage && (
                      <div className="flex items-center gap-2 bg-slate-50 border rounded-lg p-2">
                        <a href={row.receiptImage} target="_blank" rel="noreferrer" className="shrink-0">
                          <img src={row.receiptImage} alt="첨부 영수증" className="w-12 h-12 object-cover rounded border" />
                        </a>
                        <span className="text-xs text-slate-500 flex-1">📎 영수증 첨부됨</span>
                        <button onClick={() => updateRow(row.id, 'receiptImage', '')} className="text-xs text-rose-500 hover:underline">제거</button>
                      </div>
                    )}
                    <div className="flex gap-2 pt-1">
                      <button onClick={() => setReceiptRowId(row.id)} className="flex-1 py-2 bg-teal-500 text-white rounded-lg text-sm font-medium hover:bg-teal-600">📷 영수증</button>
                      <button onClick={() => mobileDeleteRow(row)} className="px-4 py-2 border border-rose-200 text-rose-500 rounded-lg text-sm hover:bg-rose-50">삭제</button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <button onClick={() => mobileNewRow(false)}
          className="w-full py-2.5 border border-slate-300 text-slate-500 rounded-xl text-sm hover:bg-slate-50">
          + 직접 추가
        </button>
      </div>

      {/* ═══ PC(데스크톱) 전용 — 기존 넓은 표 화면 ═══ */}
      <div className="hidden sm:block space-y-4">
      {/* 상단 조건부 */}
      <div className="bg-white rounded-xl border border-teal-400/30 shadow-sm">
        <div className="px-4 py-3 border-b border-teal-400/20 flex items-center gap-2">
          <span className="text-sm font-bold text-slate-700">전표입력</span>
          <span className="text-xs text-slate-400">회계전표의 적요수정, 전표분리, 계정지정을 할 수 있습니다.</span>
        </div>
        <div className="px-4 py-3 flex items-end gap-4 flex-wrap">
            <div className="flex items-center gap-1.5">
              <label className="text-xs text-slate-500 font-medium whitespace-nowrap">출납년월</label>
              <button type="button" onClick={() => shiftYearMonth(-1)} title="이전달"
                className="w-6 h-6 flex items-center justify-center rounded-md border border-teal-300 text-teal-600 hover:bg-teal-50">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
              </button>
              <select
                value={filterYearMonth}
                onChange={e => { setFilterYearMonth(e.target.value); setFilterDayFrom(0); setFilterDayTo(0) }}
                className="px-3 py-1.5 border border-teal-300 rounded-lg text-xs font-medium text-slate-700"
              >
                {yearMonthOptions.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <button type="button" onClick={() => shiftYearMonth(1)} title="다음달"
                className="w-6 h-6 flex items-center justify-center rounded-md border border-teal-300 text-teal-600 hover:bg-teal-50">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
              </button>
            </div>
            <div className="flex items-center gap-1.5">
              <label className="text-xs text-slate-500 font-medium whitespace-nowrap">입력구분</label>
              {inputMode === '간편등록' ? (
                <div className="flex items-center gap-1">
                  <button onClick={() => setFilterInputMethod('수기')}
                    className={`w-24 px-3 py-1.5 border rounded-lg text-xs font-bold transition-colors ${filterInputMethod === '수기' ? 'border-teal-400 bg-teal-500 text-white' : 'border-slate-300 bg-white text-slate-400'}`}>수기</button>
                  <button onClick={() => setFilterInputMethod('엑셀')}
                    className={`w-24 px-3 py-1.5 border rounded-lg text-xs font-bold transition-colors ${filterInputMethod === '엑셀' ? 'border-teal-400 bg-teal-500 text-white' : 'border-slate-300 bg-white text-slate-400'}`}>엑셀</button>
                  {filterInputMethod === '엑셀' && <>
                    <div className="w-px h-6 bg-slate-300 mx-1" />
                    <select className="px-3 py-1.5 border border-teal-300 rounded-lg text-xs font-bold text-slate-700 bg-white">
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
                      className="px-4 py-1.5 border border-teal-300 bg-white text-xs font-bold text-slate-700 rounded-lg cursor-pointer hover:bg-teal-50 transition-colors whitespace-nowrap">
                      파일 선택
                    </label>
                    <span className={`text-xs whitespace-nowrap ${excelFileName ? 'text-teal-700 font-medium' : 'text-slate-400'}`}>{excelFileName || '선택된 파일 없음'}</span>
                    <button
                      disabled={excelParsed.length === 0}
                      onClick={() => {
                        if (excelParsed.length === 0) return
                        // excelRegistered 이벤트로 SimpleInputPanel에 전달
                        window.dispatchEvent(new CustomEvent('excelRegister', { detail: excelParsed }))
                        setExcelParsed([])
                        setExcelFileName('')
                      }}
                      className={`px-5 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${excelParsed.length > 0 ? 'bg-teal-500 text-white hover:bg-teal-600' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}>
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
                      <button className="px-3 py-1.5 bg-slate-100 text-slate-500 text-xs font-medium rounded-lg hover:bg-slate-200 transition-colors whitespace-nowrap">참고사항<span className="text-teal-500 ml-0.5">ⓘ</span></button>
                      <div className="hidden group-hover:block absolute top-full right-0 mt-2 bg-teal-50 text-teal-900 text-[11px] rounded-lg px-3 py-2 z-50 w-[320px] shadow-lg leading-relaxed border border-teal-400/30">
                        <div className="absolute -top-1 right-4 w-2 h-2 bg-teal-50 border-l border-t border-teal-400/30 rotate-45"></div>
                        <p className="font-bold mb-1.5">참고사항</p>
                        <p className="mb-1">· 입력방법에서 엑셀 또는 은행계좌를 선택하신 후 저장하셨을 경우 한번 저장된 데이터는 장부에 기재되었기 때문에 다시 불러오지 않습니다.</p>
                        <p className="mb-1">· 엑셀의 경우 직접 재등록해서 사용하실 수 있고, 은행계좌의 경우 고객센터로 데이터 초기화를 요청하시기 바랍니다.</p>
                        <p>· 엑셀로 등록한 데이터를 아래 표에서 삭제하시려면 삭제를 클릭하세요.</p>
                      </div>
                    </div>
                    <div className="relative group">
                      <button className="px-3 py-1.5 bg-slate-100 text-slate-500 text-xs font-medium rounded-lg hover:bg-slate-200 transition-colors whitespace-nowrap">입력 안내<span className="text-teal-500 ml-0.5">ⓘ</span></button>
                      <div className="hidden group-hover:block absolute top-full right-0 mt-2 bg-teal-50 text-teal-900 text-[11px] rounded-lg px-3 py-2 z-50 w-[340px] shadow-lg leading-relaxed border border-teal-400/30">
                        <div className="absolute -top-1 right-4 w-2 h-2 bg-teal-50 border-l border-t border-teal-400/30 rotate-45"></div>
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
                  className="px-3 py-1.5 border border-teal-300 rounded-lg text-xs font-medium text-slate-700"
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
                      className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors flex items-center gap-1 ${
                        filterAccountGroup === g ? 'bg-white text-blue-700 border-blue-500 shadow-sm' : 'text-slate-500 border-teal-300 hover:text-slate-700'
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
                  className="w-24 px-2 py-1.5 border border-teal-300 rounded-lg text-xs font-medium text-slate-700 text-center"
                />
                <span className="text-slate-400 text-sm">~</span>
                <input
                  type="text"
                  value={filterAmountTo}
                  onChange={e => setFilterAmountTo(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="최대"
                  className="w-24 px-2 py-1.5 border border-teal-300 rounded-lg text-xs font-medium text-slate-700 text-center"
                />
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <label className="text-xs text-slate-500 font-medium whitespace-nowrap">검색</label>
              <select
                value={searchKey}
                onChange={e => setSearchKey(e.target.value as '적요' | '계정' | '결제방식' | '전표번호')}
                className="px-3 py-1.5 border border-teal-300 rounded-lg text-xs font-medium text-slate-700 bg-slate-50"
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
                className="w-32 px-2 py-1.5 border border-teal-300 rounded-lg text-xs font-medium text-slate-700"
              />
              <button className="px-5 py-1.5 text-xs font-bold text-white bg-teal-500 rounded-lg hover:bg-teal-600 transition-colors">조회</button>
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
          <span className="text-xs font-normal text-blue-700">수입</span>
          <span className="text-xs text-slate-600">합계 <span className="font-normal text-blue-700">{fmt(totalIncome)}</span></span>
          <span className="text-xs text-slate-600">전표 <span className="font-normal text-blue-700">{filtered.filter(r => r.type === '수입').length}</span></span>
          <span className="text-xs text-slate-600">정상 <span className="font-normal text-blue-700">{filtered.filter(r => r.type === '수입' && r.amount >= 0).length}</span></span>
          <span className="text-xs text-slate-600">반납 <span className="font-normal text-teal-600">{filtered.filter(r => r.type === '수입' && r.amount < 0).length}</span></span>
          <span className="text-xs text-slate-600">삭제 <span className="font-normal text-slate-400">0</span></span>
        </div>
        <div className="flex items-center gap-3 px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg">
          <span className="text-xs font-normal text-red-600">지출</span>
          <span className="text-xs text-slate-600">합계 <span className="font-normal text-red-600">{fmt(totalExpense)}</span></span>
          <span className="text-xs text-slate-600">전표 <span className="font-normal text-red-600">{filtered.filter(r => r.type === '지출').length}</span></span>
          <span className="text-xs text-slate-600">정상 <span className="font-normal text-red-600">{filtered.filter(r => r.type === '지출' && r.amount >= 0).length}</span></span>
          <span className="text-xs text-slate-600">반납 <span className="font-normal text-teal-600">{filtered.filter(r => r.type === '지출' && r.amount < 0).length}</span></span>
          <span className="text-xs text-slate-600">삭제 <span className="font-normal text-slate-400">0</span></span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg">
          <span className="text-xs font-normal text-emerald-700">회계잔액</span>
          <span className="text-sm font-normal text-emerald-700">{fmt(totalIncome - totalExpense)}</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg">
          <span className="text-xs font-normal text-slate-700">계좌잔액</span>
          <span className="text-sm font-normal text-slate-700">{fmt(totalIncome - totalExpense)}</span>
          <span className="text-[10px] text-sky-600 bg-sky-100 px-1.5 py-0.5 rounded-full">일치</span>
        </div>
      </div>
      )}

      {/* 툴바 */}
      <div className="border-b border-teal-400/30 px-3 py-2 overflow-visible" ref={columnSettingsRef}>
        <div className="flex items-center">
        {/* 컬럼설정/기능키 */}
        {inputMode === '일괄수정' && <>
        <div className="relative">
          <button onClick={() => setShowColumnSettings(!showColumnSettings)}
            className={`px-3 py-2 rounded transition-colors flex items-center gap-1.5 text-xs font-bold ${showColumnSettings ? 'bg-teal-500 text-white' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`} data-tip="컬럼 설정">
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
                if (hiddenCol(key)) return null
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
                    {(key === 'evidence' || key === 'amountGroup' || key === 'accountGroup') && <span className="text-[9px] text-teal-500 mr-1">묶음</span>}
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
            showToolbar ? 'bg-teal-500 text-white' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
          </svg>
          기능키
        </button>
        <div className="w-px h-7 bg-slate-300 mx-2 flex-shrink-0" />
        </>}
        {/* 전표입력방법 — 일괄수정 단일 모드로 통일, 전환 UI 없음 */}
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
          {inputMode !== '건별등록' && inputMode !== '상세등록' && (
            <button
              onClick={() => persistRows(rows)}
              disabled={saving}
              data-tip={savedAt ? `최근 저장: ${new Date(savedAt).toLocaleString('ko-KR')}` : 'DB 영속 저장'}
              className="px-3 py-1.5 text-[12px] font-bold whitespace-nowrap border border-teal-400 rounded bg-teal-500 hover:bg-teal-600 text-white sub-tab-hover disabled:opacity-50"
            >
              {saving ? '저장 중...' : '저장'}
            </button>
          )}
          {inputMode !== '건별등록' && inputMode !== '상세등록' && <button onClick={deleteRows} className="px-3 py-1.5 text-[12px] font-bold whitespace-nowrap border border-slate-300 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 sub-tab-hover">삭제</button>}
          {/* 경상북도 전용 버튼이 뜨는 화면(_srcSystem==='gbccm' 명시)에서는 인천시 버튼을 숨겨 자리 교체.
              그 외(태그 없는 옛 데이터·다른 출발지 등)는 기존처럼 노출 — 실제 클릭 시 가드가 최종 차단. */}
          {!book && inputMode !== '건별등록' && inputMode !== '상세등록' && filtered.length > 0
            && !filtered.some(r => r._srcSystem === 'gbccm') && (
            <button
              data-tip="체크한 전표들의 결제방식/적요/계정과목을 인천시 시스템 실제 전표에 순서대로 반영(전표번호=원본번호 기준으로 기존 전표를 수정 — 새 전표를 추가하지 않음)"
              onClick={() => {
                // ⚠ rows(전체, 월 무관) 가 아니라 filtered(현재 조회월에 보이는 행)에서만 매칭해야 함 —
                // id 는 이관 배치마다 1번부터 다시 매겨지므로(mapRow), 다른 달의 행과 우연히 같은 id 를
                // 가질 수 있어 rows.filter 로 찾으면 화면에 안 보이는 엉뚱한 전표가 targets 에 섞여 들어옴.
                const targets = filtered.filter(r => checked.has(r.id))
                if (targets.length === 0) { alert('전표수정 대상으로 체크된 전표가 없습니다. 표에서 전표를 먼저 체크해주세요.'); return }
                // ⚠ 데이터이관으로 들어온 전표는 출발지 시스템이 다를 수 있음 — 인천시가 아닌 출처(예: 경상북도 gbccm)를
                // 인천시로 잘못 전송하지 않게 차단. _srcSystem 없는 행(수기입력 등, srcNo 자체가 없는 행)만 통과.
                // ⚠ 2026-07-13: 구분값은 'incheon' 하나뿐 — data-migration 의 SOURCE_OPTIONS(value:'incheon')
                // 에서 그대로 내려와 /api/gbccm/vouchers/save 가 _srcSystem 에 그대로 기록함(gbccm.ts/aincheon.ts
                // 등 "라이브러리 파일명"과 이 값은 무관, 절대 혼동 금지). 예전엔 'aincheon' 도 같이 허용하는
                // 방어 코드가 있었는데, 실제로 그 값이 기록되는 코드 경로가 존재한 적이 없어(git log 로 확인)
                // 오히려 "혹시 다른 값도 있나?"하는 혼동만 유발해 제거함.
                const INCHEON_SRC = 'incheon'
                const wrongSource = targets.find(r => r.srcNo && r._srcSystem !== INCHEON_SRC)
                if (wrongSource) {
                  alert(`선택한 전표 중 인천시 출처가 아닌 전표가 있습니다(원본번호 ${wrongSource.srcNo || '-'}${wrongSource._srcSystem ? `, 출처: ${wrongSource._srcSystem}` : ''}).\n인천시 전표수정은 인천시 시스템에서 이관된 전표만 가능합니다.`)
                  return
                }
                const noSrcNo = targets.find(r => !r.srcNo)
                if (noSrcNo) {
                  alert('선택한 전표 중 원본번호(전표번호)가 없는 전표가 있습니다.\n인천시 전표수정은 원본번호가 있는(데이터이관으로 들어온) 전표만 가능합니다.')
                  return
                }
                openIncheonEdit(targets)
              }}
              className="px-3 py-1.5 text-[12px] font-bold whitespace-nowrap border border-blue-400 rounded bg-teal-500 hover:bg-teal-500 text-white sub-tab-hover"
            >
              인천시 전표수정
            </button>
          )}
          {/* 경상북도(gbccm) 이관 전표만 화면에 있으면 그쪽 전용 버튼 노출 — 인천시 버튼과 자리 교체.
              ⚠ 데이터이관 저장 시 실제 기록된 _srcSystem==='gbccm' 명시값만 기준 — "인천시가 아니면 경상북도"식
              배제 추론 금지(장부나라 등 다른 출발지·태그 없는 옛 데이터를 경상북도로 오판하던 버그). */}
          {!book && inputMode !== '건별등록' && inputMode !== '상세등록' && filtered.length > 0
            && filtered.some(r => r._srcSystem === 'gbccm') && (
            <button
              data-tip="체크한 전표들의 결제방식/적요/계정과목을 경상북도 어린이집관리시스템 실제 전표에 순서대로 반영(원본번호 기준)"
              onClick={() => {
                const gbccmTargets = filtered.filter(r => r._srcSystem === 'gbccm')
                const checkedTargets = gbccmTargets.filter(r => checked.has(r.id))
                if (checkedTargets.length === 0) { alert('경상북도 전표수정 대상으로 체크된 전표가 없습니다. 표에서 전표를 먼저 체크해주세요.'); return }
                openGbccmEdit(checkedTargets)
              }}
              className="px-3 py-1.5 text-[12px] font-bold whitespace-nowrap border border-amber-400 rounded bg-amber-500 hover:bg-amber-600 text-white sub-tab-hover"
            >
              경상북도 전표수정
            </button>
          )}
        </div>
        )}
        </div>
        {/* 기능키 펼침 - 언더바 아래 (일괄수정에서만) */}
        {(inputMode === '일괄수정' || inputMode === '건별등록' || inputMode === '상세등록') && showToolbar && (
          <div className="border-t border-slate-200 mt-2 pt-2 flex items-center flex-wrap gap-y-1">
            {/* 전표 그룹 */}
            <div className="flex items-center gap-1">
              <span className="px-2 py-1.5 text-xs font-bold whitespace-nowrap text-teal-700 bg-teal-100 rounded cursor-default">전표</span>
              <button onClick={() => registerBankTx(false)} disabled={bankBusy} data-tip="계좌내역(은행) 중 전표 미등록분 자동 등록"
                className="px-3 py-1.5 text-[13px] font-bold whitespace-nowrap border border-teal-300 rounded bg-teal-100 hover:bg-teal-200 text-teal-700 disabled:opacity-50 sub-tab-hover">
                🏦 {bankBusy ? '처리 중…' : '은행미등록'}
              </button>
              <button onClick={() => setShowManualEntry(true)} data-tip="전표 수기 입력 (팝업)" className="px-3 py-1.5 text-[13px] font-bold whitespace-nowrap border border-slate-300 rounded bg-white hover:bg-slate-50 text-slate-700 sub-tab-hover">수기등록</button>
              <button data-tip="동일날짜에 선택된 전표를 1개 전표로 합산" className="px-3 py-1.5 text-[13px] font-bold whitespace-nowrap border border-slate-300 rounded bg-white hover:bg-slate-50 text-slate-700 sub-tab-hover">합산</button>
              <button data-tip="동일금액의 전표를 동일한 금액으로 분리" className="px-3 py-1.5 text-[13px] font-bold whitespace-nowrap border border-slate-300 rounded bg-white hover:bg-slate-50 text-slate-700 sub-tab-hover">일괄분리</button>
              <button data-tip="선택된 전표를 미계정상태로 전환" className="px-3 py-1.5 text-[13px] font-bold whitespace-nowrap border border-slate-300 rounded bg-white hover:bg-slate-50 text-slate-700 sub-tab-hover">미계정전환</button>
            </div>
            <div className="w-px h-7 bg-slate-300 mx-2 flex-shrink-0" />
            {/* 적요 그룹 */}
            <div className="flex items-center gap-1">
              <span className="px-2 py-1.5 text-xs font-bold whitespace-nowrap text-teal-700 bg-teal-100 rounded cursor-default">적요</span>
              <button data-tip="선택된 전표의 적요를 삭제" className="px-3 py-1.5 text-[13px] font-bold whitespace-nowrap border border-slate-300 rounded bg-white hover:bg-slate-50 text-slate-700 sub-tab-hover">삭제</button>
              <button data-tip="선택된 전표의 적요를 치환처리" className="px-3 py-1.5 text-[13px] font-bold whitespace-nowrap border border-slate-300 rounded bg-white hover:bg-slate-50 text-slate-700 sub-tab-hover">치환</button>
              {!book && <button data-tip="세목지정된 전표적요에 세목내용추가" className="px-3 py-1.5 text-[13px] font-bold whitespace-nowrap border border-slate-300 rounded bg-white hover:bg-slate-50 text-slate-700 sub-tab-hover">세목추가</button>}
            </div>
            <div className="w-px h-7 bg-slate-300 mx-2 flex-shrink-0" />
            {/* 매핑 그룹 */}
            <div className="flex items-center gap-1">
              <span className="px-2 py-1.5 text-xs font-bold whitespace-nowrap text-pink-600 bg-pink-100 rounded cursor-default">매핑</span>
              {!book && <button data-tip="아동관리에 등록아동과 전표에 아동의 필요경비를 자동 매핑" className="tip-pink px-3 py-1.5 text-[13px] font-bold whitespace-nowrap border border-slate-300 rounded bg-white hover:bg-slate-50 text-slate-700 sub-tab-hover">원아경비</button>}
              {book ? (
                <>
                  <button data-tip="거래처 기준 동시매핑" className="tip-pink px-3 py-1.5 text-[13px] font-bold whitespace-nowrap border border-slate-300 rounded bg-white hover:bg-slate-50 text-slate-700 sub-tab-hover">거래처</button>
                  <button data-tip="적요 기준 동시매핑" className="tip-pink px-3 py-1.5 text-[13px] font-bold whitespace-nowrap border border-slate-300 rounded bg-white hover:bg-slate-50 text-slate-700 sub-tab-hover">적요</button>
                  <button data-tip="결제방식 기준 동시매핑" className="tip-pink px-3 py-1.5 text-[13px] font-bold whitespace-nowrap border border-slate-300 rounded bg-white hover:bg-slate-50 text-slate-700 sub-tab-hover">결제방식</button>
                </>
              ) : (
                <button data-tip="기 설정된 조건에 부합하는 계정으로 동시매핑" className="tip-pink px-3 py-1.5 text-[13px] font-bold whitespace-nowrap border border-slate-300 rounded bg-white hover:bg-slate-50 text-slate-700 sub-tab-hover">거래처.적요.결제방식</button>
              )}
            </div>
            <div className="w-px h-7 bg-slate-300 mx-2 flex-shrink-0" />
            {/* 정렬 그룹 */}
            <div className="flex items-center gap-1">
              <span className="px-2 py-1.5 text-xs font-bold whitespace-nowrap text-green-600 bg-green-100 rounded cursor-default">
                정렬{sortMode && <span className="ml-1 text-green-800">({sortMode})</span>}
              </span>
              {(['수입부우선', '전표번호', '전체'] as const).map(mode => (
                <button key={mode}
                  data-tip={mode === '수입부우선' ? '동일 일자일 때 수입 전표를 먼저(위) 정렬' : mode === '전표번호' ? '전표번호(입력 순서) 기준 정렬' : '정렬 해제 — 전체 전표를 일자순으로 표시'}
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

      {/* 수기등록 팝업 */}
      {showManualEntry && (
        <div className="fixed inset-0 z-[100] bg-black/30 flex items-start justify-center overflow-y-auto py-8" onClick={() => setShowManualEntry(false)}>
          <div className="relative w-[95vw] max-w-5xl" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowManualEntry(false)}
              className="absolute -top-3 -right-3 z-10 w-8 h-8 rounded-full bg-white border border-slate-300 shadow-md flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-50">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <SimpleInputPanel rows={rows} setRows={setRows} filterYearMonth={filterYearMonth} incomeAccounts={incomeAccounts} expenseAccounts={expenseAccounts} accountCodeMap={accountCodeMap} subAccountCodeMap={subAccountCodeMap} codeToAccount={codeToAccount} inputMethod={filterInputMethod} excelParsed={excelParsed} setExcelParsed={setExcelParsed} excelFileName={excelFileName} setExcelFileName={setExcelFileName} />
          </div>
        </div>
      )}

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
                  className="px-3 py-1.5 text-[12px] font-bold whitespace-nowrap border border-teal-400 rounded bg-teal-500 hover:bg-teal-600 text-white sub-tab-hover ml-2">수정</button>
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
                                  d === cd ? 'bg-teal-500 text-white' : dow === 0 ? 'text-red-500 hover:bg-slate-100' : dow === 6 ? 'text-blue-500 hover:bg-slate-100' : 'text-slate-700 hover:bg-slate-100'
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
                                  d === cd ? 'bg-teal-500 text-white' : dow === 0 ? 'text-red-500 hover:bg-slate-100' : dow === 6 ? 'text-blue-500 hover:bg-slate-100' : 'text-slate-700 hover:bg-slate-100'
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
                    className={`w-full px-3 py-2 rounded-lg text-sm text-left cursor-pointer font-bold text-white bg-teal-500 hover:bg-teal-500 ${detailDropdown === 'income' ? 'ring-2 ring-blue-300' : ''}`}>
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
                            <span className={`inline-block px-1 py-0 rounded border text-[10px] font-bold ${a.isSub ? 'bg-teal-500 text-white border-blue-500' : 'bg-blue-400 text-white border-blue-400'}`}>{a.isSub ? '세목' : '목'}</span>
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
                    <option value="국민행복카드">국민행복카드</option>
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
        if (!dr) return <div className="p-4 bg-teal-50/50 border border-teal-400/30 rounded-xl text-center text-xs text-slate-400">전표 데이터가 없습니다</div>
        const checkedId = checked.size > 0 ? Array.from(checked).pop() : null
        const selectedIdx = checkedId ? filtered.findIndex(r => r.id === checkedId) : editingCell ? filtered.findIndex(r => r.id === editingCell.rowId) : 0
        const autoCode = dr.subAccount ? (subAccountCodeMap[dr.subAccount] || accountCodeMap[dr.account] || '') : (accountCodeMap[dr.account] || '')
        const inputCls = "w-full px-1 py-0.5 border border-teal-300 rounded text-sm focus:ring-1 focus:ring-teal-300 outline-none"
        const accts = dr.type === '수입' ? incomeAccounts : expenseAccounts
        // 원본과 비교해서 변경 여부 확인
        const origRow = rows.find(r => r.id === dr.id)
        const isDirty = origRow && (origRow.date !== dr.date || origRow.summary !== dr.summary || origRow.amount !== dr.amount || origRow.account !== dr.account || origRow.subAccount !== dr.subAccount || origRow.accountCode !== dr.accountCode || origRow.counterpart !== dr.counterpart || origRow.note !== dr.note)
        return (
          <div className="bg-white border border-teal-400/30 rounded-xl overflow-x-auto single-input-mode">
            <div className="flex items-center gap-2 px-3 py-1.5 border-b border-teal-400/20">
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
            <table className="text-[11px] w-full" style={{minWidth: '1400px', tableLayout: 'fixed'}}>
              <thead>
                <tr className="bg-teal-50 border-b border-teal-400/30">
                  {columnOrder.map(([key]) => {
                    if (hiddenCol(key) || !visibleColumns[key as keyof typeof visibleColumns]) return null
                    const thCls = "px-1.5 py-2 font-normal text-slate-700 text-center"
                    switch(key) {
                      case 'no': return <th key={key} className={`${thCls} w-[40px]`}>번호</th>
                      case 'date': return <th key={key} className={`${thCls} w-[62px]`}>일자</th>
                      case 'type': return <th key={key} className={`${thCls} w-[64px]`}>입력방식</th>
                      case 'summary': return <th key={key} className={`${thCls} w-[300px]`}>적요</th>
                      case 'srcNo': return <th key={key} className={`${thCls} w-[70px]`}>원본번호</th>
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
                    if (hiddenCol(key) || !visibleColumns[key as keyof typeof visibleColumns]) return null
                    switch(key) {
                      case 'no': return <td key={key} className="px-1 py-1 text-center text-xs text-slate-400">{(selectedIdx >= 0 ? selectedIdx : 0) + 1}</td>
                      case 'date': return <td key={key} className="px-1 py-1"><input type="text" value={dr.date.slice(5)} onChange={e => { const val = e.target.value.replace(/[^0-9-]/g, ''); if (val.match(/^\d{2}-\d{2}$/)) updateDraft('date', `${filterYearMonth.slice(0,4)}-${val}`) }} className={`${inputCls} text-center`} /></td>
                      case 'type': return <td key={key} className="px-1 py-1 text-center">{(() => {
                        const m = dr.inputMethod || '수기'
                        const st: Record<string, string> = { '은행':'bg-white text-slate-700 border-slate-700', '수기':'bg-white text-blue-600 border-blue-500', '일괄':'bg-white text-orange-600 border-orange-500', '엑셀':'bg-white text-yellow-700 border-yellow-600', '분리':'bg-white text-purple-600 border-purple-500', '합산':'bg-white text-green-700 border-green-600' }
                        return <span className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded border text-[11px] font-bold ${st[m] || 'bg-white text-slate-600 border-teal-300'}`}>{m}</span>
                      })()}</td>
                      case 'summary': return <td key={key} className="px-1 py-1" style={{display: 'flex', alignItems: 'center'}}>
                        <button onClick={e => { e.stopPropagation(); startVoice(dr.id) }}
                          className={`shrink-0 w-4 h-4 flex items-center justify-center rounded-full transition-all mr-1 ${listeningRowId === dr.id ? 'bg-red-500 animate-pulse' : 'bg-slate-200 hover:bg-teal-500 group'}`}>
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
                          }} className={`px-1.5 py-1 text-xs font-medium border rounded ${dr.amount < 0 ? 'border-teal-400 bg-teal-50 text-teal-700' : 'border-slate-300 bg-white hover:bg-slate-50 text-slate-600'}`}>{dr.amount < 0 ? '반납' : '전표'}</button>
                        </td>
                      </React.Fragment>
                      case 'fee': return null
                      case 'counterpart': return <td key={key} className="px-1 py-1"><input type="text" value={dr.counterpart} onChange={e => updateDraft('counterpart',e.target.value)} className={inputCls}/></td>
                      case 'payment': return <td key={key} className="px-1 py-1"><select value={dr.note} onChange={e => updateDraft('note',e.target.value)} className={inputCls}><option value="">::선택::</option><option value="카드결제">카드결제</option><option value="국민행복카드">국민행복카드</option><option value="계좌이체">계좌이체</option><option value="자동이체">자동이체</option><option value="지로">지로</option><option value="현금결제">현금결제</option><option value="기타">기타</option></select></td>
                      case 'child': return <React.Fragment key={key}>
                        <td className="px-1 py-1 text-center text-xs text-slate-400">-</td>
                        <td className="px-1 py-1 text-center">
                          <div className="flex items-center gap-1 justify-center">
                            <button onClick={() => saveDraft()}
                              className="px-3 py-1.5 text-[12px] font-bold whitespace-nowrap border border-teal-400 rounded bg-teal-500 hover:bg-teal-600 text-white sub-tab-hover">수정</button>
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
      {(inputMode === '일괄수정' || inputMode === '건별등록' || inputMode === '상세등록') && <div className="bg-white rounded-xl border border-teal-400/30 shadow-sm relative single-input-mode">
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
            max-width: 100%; min-width: 0; overflow: hidden; text-overflow: ellipsis;
          }
          .single-input-mode td[data-cell] > button { border: none !important; }
          .single-input-mode td[data-cell="income"] > span,
          .single-input-mode td[data-cell="income"] > div:not(.absolute),
          .single-input-mode td[data-cell="expense"] > span,
          .single-input-mode td[data-cell="expense"] > div:not(.absolute) {
            justify-content: flex-end; width: 100%; text-align: right;
          }
          .single-input-mode td[data-cell="date"] > span {
            justify-content: center;
          }
          .single-input-mode td[data-cell="account"] > span,
          .single-input-mode td[data-cell="accountCode"] > span {
            justify-content: center;
          }
          .single-input-mode td[data-cell="sub"] > span {
            justify-content: flex-start;
            text-align: left;
          }
        `}</style>
        <div className="max-h-[calc(100vh-380px)] overflow-y-auto overflow-x-auto">
          <table className="text-[11px] w-full" style={{minWidth: '1400px', tableLayout: 'fixed'}}>
            <thead className="sticky top-0 z-10">
              <tr className="bg-teal-50 border-b border-teal-400/30">
                <th className="text-center px-1.5 py-2 font-normal text-slate-700 w-[34px]">
                  <input type="checkbox" className="rounded border-slate-300 w-4 h-4" checked={checked.size === filtered.length && filtered.length > 0} onChange={toggleAll} />
                </th>
                {columnOrder.map(([key]) => {
                  if (hiddenCol(key) || !visibleColumns[key as keyof typeof visibleColumns]) return null
                  switch (key) {
                    case 'no': return <th key={key} className="text-center px-1.5 py-2 font-normal text-slate-700 w-[40px]">번호</th>
                    case 'date': return <th key={key} className="text-center px-1 py-2 font-normal text-slate-700 w-[62px]">일자</th>
                    case 'type': return <th key={key} className="text-center px-0.5 py-2 font-normal text-slate-700 w-[64px]">입력방식</th>
                    case 'summary': return <th key={key} className="text-center px-1.5 py-2 font-normal text-slate-700 w-[300px]">적요</th>
                    case 'srcNo': return <th key={key} className="text-center px-1.5 py-2 font-normal text-slate-700 w-[70px]">원본번호</th>
                    case 'evidence': return <React.Fragment key={key}>
                      <th className="text-center px-1.5 py-2 font-normal text-slate-700 w-[48px] relative group cursor-help"><span className="whitespace-nowrap">은행<span className="text-blue-500 text-[11px] font-bold">ⓘ</span></span>
                        <div className="hidden group-hover:block absolute top-full left-1/2 -translate-x-1/2 mt-1 bg-slate-800 text-white text-[11px] font-semibold rounded-lg px-3 py-2 z-50 w-[190px] shadow-xl border border-slate-700 text-left">
                          <p className="flex items-center gap-1.5"><svg className="w-4 h-4 text-sky-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" /></svg>은행거래내역 (기본)</p>
                          <p className="flex items-center gap-1.5 mt-1.5"><svg className="w-4 h-4 text-teal-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>이체증 (계좌이체 매핑 시)</p>
                          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 border-l border-t border-slate-700 rotate-45"></div>
                        </div>
                      </th>
                      <th className="text-center px-1.5 py-2 font-normal text-slate-700 w-[53px] relative group cursor-help"><span className="whitespace-nowrap">영수<span className="text-blue-500 text-[11px] font-bold">ⓘ</span></span>
                        <div className="hidden group-hover:block absolute top-full right-0 mt-1 bg-slate-800 text-white text-[11px] font-semibold rounded-lg px-3 py-2 z-50 w-max max-w-[280px] shadow-xl border border-slate-700 text-left">
                          <p className="font-bold text-amber-300 mb-0.5 whitespace-nowrap">국세청</p>
                          <p className="whitespace-nowrap">세금계산서 · 계산서 · 현금영수증</p>
                          <p className="font-bold text-amber-300 mt-1.5 mb-0.5 whitespace-nowrap">쇼핑몰</p>
                          <p className="whitespace-nowrap">쿠팡 · 네이버 · 11번가 · 지마켓 · 옥션 · 오아시스</p>
                          <p className="font-bold text-amber-300 mt-1.5 mb-0.5 whitespace-nowrap">4대보험</p>
                          <p className="whitespace-nowrap">국민연금 · 건강보험 · 고용보험 · 산재보험</p>
                          <div className="absolute -top-1 right-3 w-2 h-2 bg-slate-800 border-l border-t border-slate-700 rotate-45"></div>
                        </div>
                      </th>
                    </React.Fragment>
                    case 'register': return <th key={key} className="text-center px-1.5 py-2 font-normal text-slate-700 w-[43px]">등록</th>
                    case 'attach': return <th key={key} className="text-center px-1.5 py-2 font-normal text-slate-700 w-[43px]">첨부</th>
                    case 'amountGroup': return <React.Fragment key={key}>
                                            <th className="text-center px-1.5 py-2 font-normal text-slate-700 w-[90px]">수입</th>
                      <th className="text-center px-1.5 py-2 font-normal text-slate-700 w-[90px]">지출</th>
                      <th className="text-center px-1.5 py-2 font-normal text-slate-700 w-[110px]">잔액</th>
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
                const cellBorder = (inputMode === '건별등록' || inputMode === '상세등록') ? 'border border-teal-400/30 rounded px-2 py-1.5' : ''
                return (
                  <tr
                    key={row.id}
                    onClick={(inputMode === '건별등록' || inputMode === '상세등록') ? () => setChecked(new Set([row.id])) : undefined}
                    className={`transition-colors ${(inputMode === '건별등록' || inputMode === '상세등록') ? 'cursor-pointer' : ''} ${
                      isRefund ? 'bg-red-50/50 border-b border-red-100' : editingCell?.rowId === row.id ? 'bg-blue-50' : checked.has(row.id) ? 'bg-blue-50/50' : `${idx % 2 === 1 ? 'bg-slate-50/40' : 'bg-white'} hover:bg-blue-50/40 border-b border-slate-50`
                    }`}
                  >
                    <td className="text-center px-2 py-1">
                      <input type="checkbox" className="rounded border-slate-300 w-4 h-4" checked={checked.has(row.id)} onClick={e => e.stopPropagation()} onChange={() => { if (inputMode === '건별등록' || inputMode === '상세등록') { setChecked(new Set([row.id])) } else { toggleCheck(row.id) } }} />
                    </td>
                    {/* Dynamic columns rendered in columnOrder */}
                    {columnOrder.map(([key]) => {
                      if (hiddenCol(key) || !visibleColumns[key as keyof typeof visibleColumns]) return null
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
                                            d === cd ? 'bg-teal-500 text-white' : dow === 0 ? 'text-red-500 hover:bg-slate-100' : dow === 6 ? 'text-blue-500 hover:bg-slate-100' : 'text-slate-700 hover:bg-slate-100'
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
                          return <td key={key} data-cell="summary" className="px-2 py-1 cursor-pointer" onClick={cellClick('summary')} style={{display: 'flex', alignItems: 'center', position: 'relative'}}>
                            {inputMode !== '건별등록' && inputMode !== '상세등록' && <button
                              onClick={(e) => { e.stopPropagation(); startVoice(row.id) }}
                              className={`shrink-0 w-4 h-4 flex items-center justify-center rounded-full transition-all mr-1 ${
                                listeningRowId === row.id
                                  ? 'bg-red-500 animate-pulse'
                                  : 'bg-slate-200 hover:bg-teal-500 group'
                              }`}
                            >
                              <svg className={`w-2.5 h-2.5 ${listeningRowId === row.id ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                              </svg>
                            </button>}
                            {isCell('summary') ? (
                              <div onClick={e => e.stopPropagation()} className="absolute left-0 top-0 z-40 w-[480px] max-w-[70vw] bg-white border border-teal-300 rounded-lg shadow-xl p-2">
                                <textarea value={row.summary} autoFocus rows={5}
                                  ref={el => { if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length) } }}
                                  onChange={e => updateRow(row.id, 'summary', e.target.value)}
                                  onKeyDown={e => {
                                    if (e.key === 'Escape') { setEditingCell(null) }
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
                                  className="w-full px-2 py-1.5 border border-teal-200 rounded text-xs leading-relaxed text-slate-700 focus:ring-1 focus:ring-teal-300 outline-none resize-y bg-white" />
                                <div className="flex items-center justify-end mt-1 gap-2">
                                  <span className="text-[10px] text-slate-400">{row.summary.length}자</span>
                                  <button onClick={() => setEditingCell(null)} className="text-[10px] text-white bg-teal-600 hover:bg-teal-700 rounded px-2 py-0.5 font-bold">닫기</button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 flex-1 min-w-0" title={row.summary}>
                                <span className="w-full min-w-0 truncate text-[11px] text-slate-700 border border-slate-200 rounded bg-slate-50/60 px-2 py-1 hover:border-teal-300">{row.summary || '-'}</span>
                              </div>
                            )}
                          </td>

                        case 'srcNo':
                          return <td key={key} className="text-center px-1.5 py-1">
                            {row.srcNo ? (
                              <div className="flex items-center justify-center gap-1">
                                <span className="text-[10px] text-slate-400 font-mono" title={`이관 출처 시스템의 원본 전표번호: ${row.srcNo}`}>{row.srcNo}</span>
                                <button
                                  onClick={(e) => { e.stopPropagation(); openGbccmEdit([row]) }}
                                  title="전표수정 — 원본 시스템에 반영"
                                  className="text-[10px] text-teal-500 hover:text-teal-700"
                                >✎</button>
                              </div>
                            ) : <span className="text-[10px] text-slate-300">-</span>}
                          </td>

                        case 'evidence':
                          return <React.Fragment key={key}>
                            {/* 은행 - 계좌이체면 이체증(청록), 아니면 은행거래내역(파랑) — 이체 컬럼 통합 */}
                            <td className="text-center px-0 py-1">
                              {row.note.includes('이체') ? (
                                <span title="이체증 (계좌이체)"><svg className="w-5 h-5 mx-auto text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                                </svg></span>
                              ) : (row.approved || row.inputMethod === '은행') ? (
                                <span title="은행거래내역"><svg className="w-5 h-5 mx-auto text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
                                </svg></span>
                              ) : null}
                            </td>
                            {/* 영수(증빙) - evidence 배열 기반 뱃지 */}
                            <td className="text-center px-0 py-1">
                              {row.evidence && row.evidence.length > 0 && (
                                <div className="flex flex-wrap items-center justify-center gap-0.5">
                                  {row.evidence.map(ev => {
                                    const iconEvidence = ['세금계산서', '계산서', '현금영수증']
                                    if (iconEvidence.includes(ev)) {
                                      const bgColor = ev === '세금계산서' ? 'bg-blue-200 border-blue-400' : ev === '계산서' ? 'bg-teal-200 border-teal-400' : 'bg-emerald-200 border-emerald-400'
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

                        case 'attach': {
                          const rcpts = receiptListOf(row)
                          return <td key={key} className="text-center px-0 py-1">
                            <div className="flex items-center justify-center gap-0.5">
                              {rcpts.length > 0 ? (
                                <button onClick={e => { e.stopPropagation(); setGalleryImages(rcpts) }} data-tip={`영수증 ${rcpts.length}장 보기`} className="relative inline-block">
                                  <img src={rcpts[0]} alt="영수증" className="w-7 h-7 object-cover rounded border border-slate-200 hover:ring-2 hover:ring-blue-400" />
                                  {rcpts.length > 1 && <span className="absolute -top-1 -right-1 bg-teal-500 text-white text-[9px] font-bold rounded-full px-1 leading-tight">{rcpts.length}</span>}
                                </button>
                              ) : row.approved ? (<>
                                <button onClick={e => e.stopPropagation()} className="text-slate-900">
                                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" /></svg>
                                </button>
                                <span className="text-[11px] text-slate-900">2</span>
                                <button onClick={e => e.stopPropagation()} className="text-slate-700 hover:text-slate-900" data-tip="미리보기">
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
                                </button>
                              </>) : (
                                <button onClick={e => { e.stopPropagation(); setReceiptRowId(row.id) }} data-tip="영수증 사진으로 자동입력" className="text-slate-300 hover:text-blue-600 transition-colors">
                                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" /></svg>
                                </button>
                              )}
                            </div>
                          </td>
                        }

                        case 'amountGroup':
                          return <React.Fragment key={key}>
                            <td data-cell="income" className="px-1.5 py-1 cursor-pointer" onClick={row.type === '수입' ? cellClick('amount') : undefined}>
                              {row.type === '수입' && isCell('amount') ? (
                                <input type="text" value={fmt(row.amount)} autoFocus
                                  onChange={e => updateRow(row.id, 'amount', Number(e.target.value.replace(/,/g, '')) || 0)}
                                  onBlur={() => setEditingCell(null)}
                                  onClick={e => e.stopPropagation()}
                                  className="w-full px-2 py-1 border border-teal-300 rounded text-[11px] text-right focus:ring-1 focus:ring-teal-300 outline-none" />
                              ) : (
                                <div className={`w-full text-right text-[11px] px-2 py-1 rounded border border-slate-200 bg-white ${row.type === '수입' ? (row.amount < 0 ? 'text-amber-600 font-bold' : 'text-blue-700 font-medium') : 'text-slate-300'}`} title={row.type === '수입' && row.amount < 0 ? '수입 반납(음수)' : undefined}>{row.type === '수입' ? fmt(row.amount) : '0'}</div>
                              )}
                            </td>
                            <td data-cell="expense" className="px-1.5 py-1 cursor-pointer" onClick={row.type === '지출' ? cellClick('amount') : undefined}>
                              {row.type === '지출' && isCell('amount') ? (
                                <input type="text" value={fmt(row.amount)} autoFocus
                                  onChange={e => updateRow(row.id, 'amount', Number(e.target.value.replace(/,/g, '')) || 0)}
                                  onBlur={() => setEditingCell(null)}
                                  onClick={e => e.stopPropagation()}
                                  className="w-full px-2 py-1 border border-teal-300 rounded text-[11px] text-right focus:ring-1 focus:ring-teal-300 outline-none" />
                              ) : (
                                <div className={`w-full text-right text-[11px] px-2 py-1 rounded border border-slate-200 bg-white ${row.type === '지출' ? (row.amount < 0 ? 'text-amber-600 font-bold' : 'text-red-600 font-medium') : 'text-slate-300'}`} title={row.type === '지출' && row.amount < 0 ? '지출 반납(음수)' : undefined}>{row.type === '지출' ? fmt(row.amount) : '0'}</div>
                              )}
                            </td>
                            <td className="text-right px-3 py-1">
                              {(() => {
                                let balance = 0
                                for (let i = 0; i <= idx; i++) {
                                  const r = filtered[i]
                                  if (r.type === '수입') balance += r.amount
                                  else balance -= r.amount
                                }
                                return <span className="font-medium text-[11px] text-slate-700">{fmt(balance)}</span>
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
                                      className="px-1.5 py-1 text-xs font-medium border border-teal-400 rounded bg-teal-50 hover:bg-teal-100 text-teal-700 transition-colors">붙임</button>
                                  }
                                  return null
                                }
                                return <button onClick={e => { e.stopPropagation(); setRows(prev => prev.map(r => r.id === row.id ? { ...r, copySelected: true } : r)) }}
                                  className="px-1.5 py-1 text-xs font-medium border border-slate-300 rounded bg-white hover:bg-slate-50 text-slate-600 transition-colors">복사</button>
                              })()}
                            </td>}
                            {/* 계정과목 */}
                            <td data-cell="account" className="text-center px-2 py-1 cursor-pointer relative" onClick={(e) => {
                              if (!isCell('account')) {
                                const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
                                setAcctPopPos({ x: Math.max(8, Math.min(r.left - 268, window.innerWidth - 268)), y: Math.min(Math.max(r.top - 24, 8), Math.round(window.innerHeight * 0.06)) })
                              }
                              cellClick('account')(e)
                            }}>
                              {isCell('account') ? (
                                <div className="fixed inset-0 z-[100] bg-black/20" onClick={() => setEditingCell(null)}>
                                 <div style={acctPopPos ? { position: 'fixed', left: acctPopPos.x, top: acctPopPos.y } : { position: 'fixed', left: '50%', top: '4vh', transform: 'translateX(-50%)' }}
                                   className="bg-white border border-slate-200 rounded-xl shadow-2xl w-[260px] h-[88vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                                  <div onMouseDown={startAcctDrag} className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between flex-shrink-0 cursor-move select-none">
                                    <span className="text-sm font-bold text-slate-700 whitespace-nowrap">☰ 계정과목 선택 · <span className={row.type === '수입' ? 'text-blue-600' : 'text-red-600'}>{row.type}</span></span>
                                    <button onClick={() => setEditingCell(null)} onMouseDown={e => e.stopPropagation()} className="text-slate-400 hover:text-slate-600 text-lg leading-none cursor-pointer">✕</button>
                                  </div>
                                  <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden py-1">
                                  <div className="text-[10px] text-slate-300 px-3 pb-1">총 {(row.type === '수입' ? incomeAccounts : expenseAccounts).length}개</div>
                                  {(row.type === '수입' ? incomeAccounts : expenseAccounts).map((a, idx) => {
                                    const isSelected = a.isSub ? row.subAccount === a.label : row.account === a.value
                                    const isIncome = row.type === '수입'
                                    const rowCls = isIncome
                                      ? (isSelected ? 'bg-blue-100 font-bold text-blue-700' : 'hover:bg-blue-50 text-blue-600')
                                      : (isSelected ? 'bg-red-100 font-bold text-red-700' : 'hover:bg-red-50 text-red-600')
                                    return (
                                      <button key={`${idx}-${a.value}`} type="button"
                                        onClick={() => {
                                          const list = row.type === '수입' ? incomeAccounts : expenseAccounts
                                          let newAccount = row.account
                                          let newSub = ''
                                          if (a.isSub) {
                                            const idx = list.indexOf(a)
                                            let parentAccount = row.account
                                            for (let i = idx - 1; i >= 0; i--) {
                                              if (!list[i].isSub) { parentAccount = list[i].value; break }
                                            }
                                            newAccount = parentAccount
                                            newSub = a.label
                                          } else {
                                            newAccount = a.value
                                            newSub = ''
                                          }
                                          const newCode = newSub ? (subAccountCodeMap[newSub] || accountCodeMap[newAccount] || '') : (accountCodeMap[newAccount] || '')
                                          setRows(prev => prev.map(r => r.id === row.id
                                            ? { ...r, account: newAccount, subAccount: newSub, accountCode: newCode, copySelected: true }
                                            : { ...r, copySelected: false }))
                                          setEditingCell(null)
                                        }}
                                        className={`block w-full text-left px-3 py-1.5 text-xs transition-colors ${rowCls} ${a.isSub ? 'pl-5' : ''}`}>
                                        {a.isSub ? (
                                          <span className="flex items-center gap-1">
                                            <span className={`inline-block px-1.5 py-0 rounded text-white text-[12px] font-bold flex-shrink-0 ${isIncome ? 'bg-blue-400' : 'bg-red-400'}`}>세목</span>
                                            <span className="flex-1 min-w-0 truncate text-slate-700">{a.label}</span>
                                            <span className="text-[10px] text-slate-400 font-mono flex-shrink-0">{subAccountCodeMap[a.label] || ''}</span>
                                          </span>
                                        ) : (
                                          <span className="flex items-center gap-1">
                                            <span className={`inline-block px-1.5 py-0 rounded text-white text-[12px] font-bold flex-shrink-0 ${isIncome ? 'bg-blue-600' : 'bg-red-600'}`}>목</span>
                                            <span className="flex-1 min-w-0 truncate text-slate-700">{a.label}</span>
                                            <span className="text-[10px] text-slate-400 font-mono flex-shrink-0">{accountCodeMap[a.value] || ''}</span>
                                          </span>
                                        )}
                                      </button>
                                    )
                                  })}
                                  </div>
                                 </div>
                                </div>
                              ) : null}
                              <span className={`font-medium whitespace-nowrap truncate block w-full ${row.type === '수입' ? 'text-blue-700' : 'text-red-600'} ${acctDisplay(row.account).sizeCls}`}>{acctDisplay(row.account).text}</span>
                            </td>
                            {/* 세목 — 목과 동일(중복)이면 세목 아님 → '-' */}
                            <td data-cell="sub" className="text-center px-0.5 py-1">
                              <span className={`text-slate-600 whitespace-nowrap truncate block w-full text-left ${acctDisplay(row.subAccount && row.subAccount !== row.account ? row.subAccount : '-').sizeCls}`}>{row.subAccount && row.subAccount !== row.account ? acctDisplay(row.subAccount).text : '-'}</span>
                            </td>
                            {/* 계정코드 */}
                            <td data-cell="accountCode" className="text-center px-1 py-1" onClick={cellClick('accountCode')}>
                              {isCell('accountCode') ? (
                                <input type="text" maxLength={5} autoFocus
                                  defaultValue=""
                                  placeholder={(() => {
                                    const autoCode = row.subAccount ? (subAccountCodeMap[row.subAccount] || accountCodeMap[row.account] || '') : (accountCodeMap[row.account] || '')
                                    return autoCode || row.accountCode || ''
                                  })()}
                                  ref={el => { if (el) { el.focus() } }}
                                  onClick={e => e.stopPropagation()}
                                  onChange={e => {
                                    const val = e.target.value.replace(/[^0-9]/g, '')
                                    e.target.value = val
                                    if (val.length >= 4) {
                                      const match = codeToAccount[val]
                                      if (match) {
                                        e.target.dataset.handled = 'true'
                                        setRows(prev => prev.map(r => r.id === row.id ? { ...r, accountCode: val, account: match.account, subAccount: match.subAccount } : r))
                                      }
                                    }
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
                                  className={`w-full px-1 py-0.5 border border-teal-300 rounded text-xs text-center focus:ring-1 focus:ring-teal-300 outline-none placeholder:text-slate-300 ${row.type === '수입' ? 'text-blue-700' : 'text-red-600'}`} />
                              ) : (
                                <span className={`text-xs cursor-pointer ${row.type === '수입' ? 'text-blue-700' : 'text-red-600'}`}>
                                  {(() => {
                                    const autoCode = row.subAccount ? (subAccountCodeMap[row.subAccount] || accountCodeMap[row.account] || '') : (accountCodeMap[row.account] || '')
                                    return autoCode || row.accountCode || '-'
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
                                }} className={`px-1.5 py-1 text-xs font-medium border rounded ${isRefund ? 'border-teal-400 bg-teal-50 hover:bg-teal-100 text-teal-700' : 'border-slate-300 bg-white hover:bg-slate-50 text-slate-600'}`}>{isRefund ? '반납' : '전표'}</button>
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
                                  className="flex-1 min-w-0 px-1 py-0.5 border border-teal-300 rounded text-xs text-center focus:ring-1 focus:ring-teal-300 outline-none" />
                                <button
                                  onClick={() => {/* 거래처 검색 팝업 */}}
                                  className="shrink-0 px-1.5 py-0.5 border border-slate-300 rounded bg-slate-50 hover:bg-slate-100 text-[10px] font-medium text-slate-600"
                                >선택</button>
                              </div>
                            ) : (
                              <span className="text-slate-600 text-[11px] truncate block">{row.counterpart || '-'}</span>
                            )}
                          </td>

                        case 'payment':
                          return <td key={key} data-cell="payment" className="text-center px-2 py-1 cursor-pointer" onClick={cellClick('note')}>
                            {isCell('note') ? (
                              <select value={row.note} autoFocus
                                onChange={e => { updateRow(row.id, 'note', e.target.value); setEditingCell(null) }}
                                onBlur={() => setEditingCell(null)}
                                onClick={e => e.stopPropagation()}
                                className="w-full px-1 py-0.5 border border-teal-300 rounded text-xs text-center focus:ring-1 focus:ring-teal-300 outline-none">
                                <option value="">::선택::</option>
                                {row.type === '수입' ? <>
                                  <option value="카드결제">카드결제</option>
                                  <option value="국민행복카드">국민행복카드</option>
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
                                  <option value="국민행복카드">국민행복카드</option>
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
                              <span className="text-slate-400 text-[11px]">{row.note ? row.note.replace(/^(지출|수입)-/, '') : '-'}</span>
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
                  <td colSpan={1 + Object.values(visibleColumns).filter(Boolean).length} className="py-12 text-center text-slate-400 text-sm">
                    {(() => {
                      if (rows.length === 0) return '해당 조건의 전표가 없습니다'
                      // 이 장부에 다른 달 데이터가 있으면 안내 + 그 달로 이동 버튼
                      const months = Array.from(new Set(rows.map(r => (r.date || '').slice(0, 7)).filter(Boolean))).sort()
                      const first = months[0], last = months[months.length - 1]
                      return (
                        <div className="space-y-2">
                          <div><b className="text-slate-500">{filterYearMonth}</b> 전표가 없습니다.</div>
                          <div className="text-slate-500">이 장부 전표({rows.length}건)는 <b className="text-teal-600">{first} ~ {last}</b>에 있습니다.</div>
                          <button type="button" onClick={() => setFilterYearMonth(first)} className="px-3 py-1.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded">→ {first} 전표 보기</button>
                        </div>
                      )
                    })()}
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
              <span className="text-xs text-slate-600">반납 <strong className="text-teal-600">{filtered.filter(r => r.type === '수입' && r.amount < 0).length}</strong></span>
            </div>
            <div className="flex items-center gap-3 px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg">
              <span className="text-xs font-bold text-red-600">지출</span>
              <span className="text-xs text-slate-600">합계 <strong className="text-red-600">{fmt(totalExpense)}</strong></span>
              <span className="text-xs text-slate-600">전표 <strong className="text-red-600">{filtered.filter(r => r.type === '지출').length}</strong></span>
              <span className="text-xs text-slate-600">정상 <strong className="text-red-600">{filtered.filter(r => r.type === '지출' && r.amount >= 0).length}</strong></span>
              <span className="text-xs text-slate-600">반납 <strong className="text-teal-600">{filtered.filter(r => r.type === '지출' && r.amount < 0).length}</strong></span>
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
  codeToAccount?: Record<string, { account: string; subAccount: string }>
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

function SimpleInputPanel({ rows, setRows, filterYearMonth, incomeAccounts, expenseAccounts, accountCodeMap, subAccountCodeMap, codeToAccount = {}, inputMethod, excelParsed = [], setExcelParsed, excelFileName = '', setExcelFileName }: InputPanelProps) {
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
    <div className="bg-white rounded-xl border border-teal-400/30 shadow-sm">
      {/* 헤더 - sticky */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-teal-400/20 sticky top-0 z-30 bg-white rounded-t-xl">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-bold text-slate-700">간편등록</h3>
          <span className="text-xs text-slate-400">날짜·적요·금액·계정과목만 빠르게 입력</span>
        </div>
        <div className="flex items-center gap-2">
          {savedCount > 0 && <span className="text-xs text-green-600 font-medium">{savedCount}건 저장됨</span>}
          {unsavedCount > 0 && <span className="text-xs text-teal-600 font-medium">{unsavedCount}건 입력대기</span>}
          <button onClick={saveAll} disabled={unsavedCount === 0}
            className={`px-4 py-1.5 text-xs font-bold rounded transition-colors ${
              unsavedCount > 0 ? 'bg-teal-500 hover:bg-teal-600 text-white' : 'bg-slate-100 text-slate-300 cursor-not-allowed'
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
        <table className="w-full text-[11px]">
          <thead className="sticky top-[49px] z-20">
            <tr className="bg-teal-50 border-b border-teal-400/30" style={{boxShadow: '0 2px 4px rgba(245,184,0,0.15)'}}>

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
                      className="w-full px-2 py-1.5 border border-teal-400/30 rounded text-center text-xs focus:outline-none focus:ring-1 focus:ring-teal-300 focus:border-teal-400 disabled:bg-slate-50 disabled:text-slate-400"
                    />
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <span className={`text-xs font-bold ${r.rowInputMethod === '엑셀' ? 'text-yellow-700' : 'text-teal-900'}`}>{r.rowInputMethod}</span>
                  </td>
                  <td className="px-2 py-1.5">
                    <div className="flex items-center gap-1">
                      <input type="text" value={r.summary} placeholder="적요 입력" disabled={r.saved}
                        onChange={e => updateRow(idx, 'summary', e.target.value)}
                        className="flex-1 px-2 py-1.5 border border-teal-400/30 rounded text-xs focus:outline-none focus:ring-1 focus:ring-teal-300 focus:border-teal-400 disabled:bg-slate-50 disabled:text-slate-400"
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
                      className={`w-full px-2 py-1.5 border border-teal-400/30 rounded text-xs text-right font-medium focus:outline-none focus:ring-1 focus:ring-teal-300 focus:border-teal-400 disabled:bg-slate-50 disabled:text-slate-400 ${r.incomeAmount ? 'text-blue-700' : ''}`}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input type="text" value={r.expenseAmount} placeholder="" disabled={r.saved || !!r.incomeAmount}
                      onChange={e => { updateRow(idx, 'expenseAmount', formatAmount(e.target.value)); if (e.target.value) updateRow(idx, 'incomeAmount', '') }}
                      className={`w-full px-2 py-1.5 border border-teal-400/30 rounded text-xs text-right font-medium focus:outline-none focus:ring-1 focus:ring-teal-300 focus:border-teal-400 disabled:bg-slate-50 disabled:text-slate-400 ${r.expenseAmount ? 'text-red-600' : ''}`}
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
                          className={`w-full px-2 py-1.5 border border-teal-400/30 rounded text-xs text-left flex items-center justify-between disabled:bg-slate-50 disabled:text-slate-400 ${amountType === '수입' ? 'text-blue-600' : 'text-red-600'}`}>
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
                        className="w-full px-1 py-1.5 border border-teal-400/30 rounded text-xs focus:outline-none focus:ring-1 focus:ring-teal-300 focus:border-teal-400 disabled:bg-slate-50 disabled:text-slate-400">
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
                      className={`w-full px-1 py-1.5 border border-teal-400/30 rounded text-xs text-center font-mono focus:outline-none focus:ring-1 focus:ring-teal-300 focus:border-teal-400 disabled:bg-slate-50 disabled:text-slate-400 ${r.accountCode ? (r.incomeAmount ? 'text-blue-600' : 'text-red-600') : ''}`}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <select value={r.payment} disabled={r.saved}
                      onChange={e => updateRow(idx, 'payment', e.target.value)}
                      className="w-full px-1 py-1.5 border border-teal-400/30 rounded text-xs focus:outline-none focus:ring-1 focus:ring-teal-300 focus:border-teal-400 disabled:bg-slate-50 disabled:text-slate-400">
                      <option value="">::선택::</option>
                      {amountType === '수입' ? <>
                        <option value="카드결제">카드결제</option>
                        <option value="국민행복카드">국민행복카드</option>
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
                        <option value="국민행복카드">국민행복카드</option>
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
              canSave ? 'bg-teal-500 hover:bg-teal-600 text-white' : 'bg-slate-100 text-slate-300 cursor-not-allowed'
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
              canSave ? 'bg-teal-500 hover:bg-teal-600 text-white' : 'bg-slate-100 text-slate-300 cursor-not-allowed'
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
