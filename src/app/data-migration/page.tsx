'use client'

import { useState, useEffect } from 'react'
import * as XLSX from 'xlsx'

interface CashLedgerRow {
  idx: number
  date: string
  docNo: string
  accountCode: string
  accountName: string
  summary: string
  income: number
  expense: number
  balance: number
  agreeDate: string
}

interface CashLedgerSummary {
  prevIncome: number
  prevExpense: number
  monthStart: number
  monthIncome: number
  monthExpense: number
}

interface CashLedgerResult {
  yearMonth: string
  rows: CashLedgerRow[]
  summary: CashLedgerSummary
}

const SOURCE_OPTIONS = [
  { value: 'by24', label: '보육나라', url: 'by24.co.kr', features: ['현금출납부'], authType: 'idpw' as const },
  { value: 'prime', label: '프라임전자장부', url: '', features: [], authType: 'idpw' as const },
  { value: 'kidshome', label: '키즈홈', url: 'ikidshome.co.kr', features: ['현금출납부'], authType: 'idpw' as const },
  { value: 'kidkids', label: '키드키즈', url: 'kidkids.net', features: [], authType: 'idpw' as const },
  { value: 'easys', label: '이편한시스템', url: '', features: [], authType: 'idpw' as const },
  { value: 'mores', label: '더편한시스템', url: '', features: [], authType: 'idpw' as const },
  { value: 'incheon', label: '인천시어린이집관리시스템', url: 'aincheon.co.kr', features: ['현금출납부'], authType: 'cert' as const },
  { value: 'seoul', label: '서울시어린이집관리시스템', url: '', features: [], authType: 'idpw' as const },
  { value: 'wisean', label: '와이즈안', url: '', features: [], authType: 'idpw' as const },
] as const

type SourceType = typeof SOURCE_OPTIONS[number]['value']

// 보육나라 ↔ 수전자장부 매핑 테이블
const MAPPING_TABLE = {
  by24: {
    income: [
      { by24: '1111', by24Name: '정부지원보육료', sunote: '1111', sunoteNote: '' },
      { by24: '1112', by24Name: '부모부담보육료', sunote: '1112', sunoteNote: '' },
      { by24: '1211', by24Name: '특별활동비', sunote: '1211', sunoteNote: '' },
      { by24: '1221', by24Name: '필요경비(수입)', sunote: '1221', sunoteNote: '4자리 기본', group: true },
      { by24: '1221111', by24Name: '  입학금', sunote: '1221-111', sunoteNote: '' },
      { by24: '1221112', by24Name: '  현장학습비', sunote: '1221-112', sunoteNote: '' },
      { by24: '1221113', by24Name: '  차량운행비', sunote: '1221-113', sunoteNote: '' },
      { by24: '1221121', by24Name: '  부모부담행사비', sunote: '1221-121', sunoteNote: '' },
      { by24: '1221131', by24Name: '  조석식비', sunote: '1221-131', sunoteNote: '' },
      { by24: '1221141', by24Name: '  특성화비', sunote: '1221-141', sunoteNote: '기본값' },
      { by24: '1311', by24Name: '인건비보조금', sunote: '1311', sunoteNote: '누리→13111' },
      { by24: '1321', by24Name: '기관보육료', sunote: '1321', sunoteNote: '' },
      { by24: '1322', by24Name: '연장보육료', sunote: '1322', sunoteNote: '' },
      { by24: '1323', by24Name: '공공형운영비', sunote: '1323', sunoteNote: '환경개선→13231' },
      { by24: '1324', by24Name: '그밖의지원금', sunote: '1324', sunoteNote: '누리→13241, 필요경비→13242' },
      { by24: '1331', by24Name: '자본보조금', sunote: '1331', sunoteNote: '' },
      { by24: '1411', by24Name: '전입금', sunote: '1411-*', sunoteNote: '1:특별활동, 2:입학, 3:현장학습, 4:차량, 5:행사, 6:조석, 7:특성화, 8:기타' },
      { by24: '1421', by24Name: '단기차입금', sunote: '1421', sunoteNote: '' },
      { by24: '1422', by24Name: '장기차입금', sunote: '1422', sunoteNote: '' },
      { by24: '1511', by24Name: '지정후원금', sunote: '1511', sunoteNote: '' },
      { by24: '1512', by24Name: '비지정후원금', sunote: '1512', sunoteNote: '' },
      { by24: '1611', by24Name: '적립금처분수입', sunote: '1611', sunoteNote: '' },
      { by24: '1711', by24Name: '과년도수입', sunote: '1711', sunoteNote: '' },
      { by24: '1811', by24Name: '이자수입', sunote: '1811', sunoteNote: '' },
      { by24: '1812', by24Name: '잡수입', sunote: '1812', sunoteNote: '' },
      { by24: '1911', by24Name: '전년도이월금', sunote: '1911', sunoteNote: '이관 시 스킵' },
    ],
    expense: [
      { by24: '2111', by24Name: '원장급여', sunote: '2111', sunoteNote: '' },
      { by24: '2112', by24Name: '원장수당', sunote: '2112', sunoteNote: '' },
      { by24: '2121', by24Name: '보육교직원급여', sunote: '2121', sunoteNote: '누리→21211' },
      { by24: '2122', by24Name: '보육교직원수당', sunote: '2122', sunoteNote: '누리→21221' },
      { by24: '2131', by24Name: '기타인건비', sunote: '2131', sunoteNote: '누리→21311' },
      { by24: '2141', by24Name: '법정부담금', sunote: '2141', sunoteNote: '누리→21411' },
      { by24: '2142', by24Name: '퇴직금및퇴직적립금', sunote: '2142', sunoteNote: '4자리 기본', group: true },
      { by24: '2142112', by24Name: '  퇴직금', sunote: '2142-112', sunoteNote: '퇴직금/퇴직 키워드' },
      { by24: '2142121', by24Name: '  퇴직적립금', sunote: '2142-121', sunoteNote: '기본값' },
      { by24: '2211', by24Name: '수용비및수수료', sunote: '2211-*', sunoteNote: '1:누리, 2:특별활동, 3:입학, 4:현장학습, 5:차량, 6:행사, 7:조석, 8:특성화' },
      { by24: '2212', by24Name: '공공요금및제세공과금', sunote: '2212', sunoteNote: '' },
      { by24: '2213', by24Name: '연료비', sunote: '2213', sunoteNote: '' },
      { by24: '2214', by24Name: '여비', sunote: '2214', sunoteNote: '' },
      { by24: '2215', by24Name: '차량비', sunote: '2215', sunoteNote: '' },
      { by24: '2216', by24Name: '복리후생비', sunote: '2216', sunoteNote: '누리→22161' },
      { by24: '2217', by24Name: '기타운영비', sunote: '2217', sunoteNote: '4자리 기본', group: true },
      { by24: '2217111', by24Name: '  임대료', sunote: '2217-111', sunoteNote: '임대/월세 키워드, 기본값' },
      { by24: '2217121', by24Name: '  융자이자', sunote: '2217-121', sunoteNote: '융자/이자 키워드' },
      { by24: '2221', by24Name: '업무추진비', sunote: '2221', sunoteNote: '' },
      { by24: '2222', by24Name: '직책급', sunote: '2222', sunoteNote: '' },
      { by24: '2223', by24Name: '회의비', sunote: '2223', sunoteNote: '' },
      { by24: '2311', by24Name: '교직원연수·연구비', sunote: '2311', sunoteNote: '누리→23111' },
      { by24: '2312', by24Name: '교재·교구구입비', sunote: '2312', sunoteNote: '누리→23121, 공공형→23123' },
      { by24: '2313', by24Name: '행사비', sunote: '2313', sunoteNote: '누리→23131' },
      { by24: '2314', by24Name: '영유아복리비', sunote: '2314', sunoteNote: '' },
      { by24: '2315', by24Name: '급식·간식재료비', sunote: '2315', sunoteNote: '누리→23151, 청정→23152' },
      { by24: '2411', by24Name: '특별활동비지출', sunote: '2411', sunoteNote: '' },
      { by24: '2421', by24Name: '필요경비지출', sunote: '2421', sunoteNote: '4자리 기본', group: true },
      { by24: '2421111', by24Name: '  입학금', sunote: '2421-111', sunoteNote: '' },
      { by24: '2421121', by24Name: '  현장학습비', sunote: '2421-121', sunoteNote: '' },
      { by24: '2421131', by24Name: '  차량운행비', sunote: '2421-131', sunoteNote: '' },
      { by24: '2421141', by24Name: '  부모부담행사비', sunote: '2421-141', sunoteNote: '' },
      { by24: '2421151', by24Name: '  조석식비', sunote: '2421-151', sunoteNote: '' },
      { by24: '2421161', by24Name: '  특성화비', sunote: '2421-161', sunoteNote: '기본값' },
      { by24: '2511', by24Name: '적립금', sunote: '2511', sunoteNote: '' },
      { by24: '2611', by24Name: '단기차입금상환', sunote: '2611', sunoteNote: '' },
      { by24: '2612', by24Name: '장기차입금상환', sunote: '2612', sunoteNote: '' },
      { by24: '2621', by24Name: '보조금반환금', sunote: '2621', sunoteNote: '' },
      { by24: '2622', by24Name: '보호자반환금', sunote: '2622', sunoteNote: '' },
      { by24: '2623', by24Name: '법인회계전출금', sunote: '2623', sunoteNote: '' },
      { by24: '2711', by24Name: '시설비', sunote: '2711', sunoteNote: '누리→27111' },
      { by24: '2712', by24Name: '시설장비유지비', sunote: '2712', sunoteNote: '누리→27121' },
      { by24: '2721', by24Name: '자산취득비', sunote: '2721', sunoteNote: '4자리 기본', group: true },
      { by24: '2721002', by24Name: '  차량할부금', sunote: '2721-002', sunoteNote: '차량/할부 키워드' },
      { by24: '2721004', by24Name: '  기타자산취득', sunote: '2721-004', sunoteNote: '기본값' },
      { by24: '2811', by24Name: '과년도지출', sunote: '2811', sunoteNote: '누리→28111' },
      { by24: '2911', by24Name: '잡지출', sunote: '2911', sunoteNote: '' },
    ],
    pattern: '7자리 코드(AAAABBB) → AAAA-BBB 자동 변환 (예: 1221111→1221-111, 2421141→2421-141)',
  },
  kidshome: {
    income: [
      { by24: '', by24Name: '정부지원보육료', sunote: '1111', sunoteNote: '' },
      { by24: '', by24Name: '부모부담보육료', sunote: '1112', sunoteNote: '' },
      { by24: '', by24Name: '특별활동비', sunote: '1211', sunoteNote: '' },
      { by24: '', by24Name: '기타필요경비', sunote: '1221', sunoteNote: '', group: true },
      { by24: '', by24Name: '  입학준비금', sunote: '1221-111', sunoteNote: '', sub: true },
      { by24: '', by24Name: '  현장학습비', sunote: '1221-112', sunoteNote: '', sub: true },
      { by24: '', by24Name: '  차량운행비', sunote: '1221-113', sunoteNote: '', sub: true },
      { by24: '', by24Name: '  부모부담행사비', sunote: '1221-121', sunoteNote: '', sub: true },
      { by24: '', by24Name: '  조석식비', sunote: '1221-131', sunoteNote: '', sub: true },
      { by24: '', by24Name: '  특성화비', sunote: '1221-141', sunoteNote: '', sub: true },
      { by24: '', by24Name: '인건비보조금', sunote: '1311', sunoteNote: '' },
      { by24: '', by24Name: '기관보육료', sunote: '1321', sunoteNote: '' },
      { by24: '', by24Name: '연장보육료', sunote: '1322', sunoteNote: '' },
      { by24: '', by24Name: '공공형운영비', sunote: '1323', sunoteNote: '' },
      { by24: '', by24Name: '그밖의지원금', sunote: '1324', sunoteNote: '' },
      { by24: '', by24Name: '자본보조금', sunote: '1331', sunoteNote: '' },
      { by24: '', by24Name: '전입금', sunote: '1411', sunoteNote: '' },
      { by24: '', by24Name: '단기차입금', sunote: '1421', sunoteNote: '' },
      { by24: '', by24Name: '장기차입금', sunote: '1422', sunoteNote: '' },
      { by24: '', by24Name: '지정후원금', sunote: '1511', sunoteNote: '' },
      { by24: '', by24Name: '비지정후원금', sunote: '1512', sunoteNote: '' },
      { by24: '', by24Name: '적립금처분수입', sunote: '1611', sunoteNote: '' },
      { by24: '', by24Name: '과년도수입', sunote: '1711', sunoteNote: '' },
      { by24: '', by24Name: '이자수입', sunote: '1811', sunoteNote: '' },
      { by24: '', by24Name: '잡수입', sunote: '1812', sunoteNote: '' },
      { by24: '', by24Name: '전년도이월금', sunote: '1911', sunoteNote: '이관 시 스킵' },
    ],
    expense: [
      { by24: '', by24Name: '원장급여', sunote: '2111', sunoteNote: '' },
      { by24: '', by24Name: '원장수당', sunote: '2112', sunoteNote: '' },
      { by24: '', by24Name: '보육교직원급여', sunote: '2121', sunoteNote: '' },
      { by24: '', by24Name: '보육교직원수당', sunote: '2122', sunoteNote: '' },
      { by24: '', by24Name: '기타인건비', sunote: '2131', sunoteNote: '' },
      { by24: '', by24Name: '법정부담금', sunote: '2141', sunoteNote: '' },
      { by24: '', by24Name: '퇴직금및퇴직적립금', sunote: '2142', sunoteNote: '', group: true },
      { by24: '', by24Name: '  퇴직금', sunote: '2142-112', sunoteNote: '적요 키워드 자동', sub: true },
      { by24: '', by24Name: '  퇴직적립금', sunote: '2142-121', sunoteNote: '적요 키워드 자동', sub: true },
      { by24: '', by24Name: '수용비및수수료', sunote: '2211', sunoteNote: '' },
      { by24: '', by24Name: '공공요금및제세공과금', sunote: '2212', sunoteNote: '' },
      { by24: '', by24Name: '연료비', sunote: '2213', sunoteNote: '' },
      { by24: '', by24Name: '여비', sunote: '2214', sunoteNote: '' },
      { by24: '', by24Name: '차량비', sunote: '2215', sunoteNote: '' },
      { by24: '', by24Name: '복리후생비', sunote: '2216', sunoteNote: '' },
      { by24: '', by24Name: '기타운영비', sunote: '2217', sunoteNote: '' },
      { by24: '', by24Name: '업무추진비', sunote: '2221', sunoteNote: '' },
      { by24: '', by24Name: '직책급', sunote: '2222', sunoteNote: '' },
      { by24: '', by24Name: '회의비', sunote: '2223', sunoteNote: '' },
      { by24: '', by24Name: '교직원연수·연구비', sunote: '2311', sunoteNote: '' },
      { by24: '', by24Name: '교재.교구구입비', sunote: '2312', sunoteNote: '' },
      { by24: '', by24Name: '행사비', sunote: '2313', sunoteNote: '' },
      { by24: '', by24Name: '영유아복리비', sunote: '2314', sunoteNote: '' },
      { by24: '', by24Name: '급식.간식재료비', sunote: '2315', sunoteNote: '' },
      { by24: '', by24Name: '특별활동비지출', sunote: '2411', sunoteNote: '' },
      { by24: '', by24Name: '기타필요경비지출', sunote: '2421', sunoteNote: '', group: true },
      { by24: '', by24Name: '  입학준비금', sunote: '2421-111', sunoteNote: '', sub: true },
      { by24: '', by24Name: '  현장학습비', sunote: '2421-121', sunoteNote: '', sub: true },
      { by24: '', by24Name: '  차량운행비', sunote: '2421-131', sunoteNote: '', sub: true },
      { by24: '', by24Name: '  부모부담행사비', sunote: '2421-141', sunoteNote: '', sub: true },
      { by24: '', by24Name: '  조석식비', sunote: '2421-151', sunoteNote: '', sub: true },
      { by24: '', by24Name: '  특성화비', sunote: '2421-161', sunoteNote: '', sub: true },
      { by24: '', by24Name: '적립금', sunote: '2511', sunoteNote: '' },
      { by24: '', by24Name: '단기차입금상환', sunote: '2611', sunoteNote: '' },
      { by24: '', by24Name: '장기차입금상환', sunote: '2612', sunoteNote: '' },
      { by24: '', by24Name: '보조금반환금', sunote: '2621', sunoteNote: '' },
      { by24: '', by24Name: '보호자반환금', sunote: '2622', sunoteNote: '' },
      { by24: '', by24Name: '법인회계전출금', sunote: '2623', sunoteNote: '' },
      { by24: '', by24Name: '시설비', sunote: '2711', sunoteNote: '' },
      { by24: '', by24Name: '시설장비유지비', sunote: '2712', sunoteNote: '' },
      { by24: '', by24Name: '자산취득비', sunote: '2721', sunoteNote: '' },
      { by24: '', by24Name: '과년도지출', sunote: '2811', sunoteNote: '' },
      { by24: '', by24Name: '잡지출', sunote: '2911', sunoteNote: '' },
    ],
    pattern: '계정명 → sunote 코드 자동 매핑 (계정명 기반)',
  },
} as const

function fmtAmt(n: number): string {
  if (!n) return ''
  return n.toLocaleString()
}

export default function DataMigrationPage() {
  // 출발지
  const [source, setSource] = useState<SourceType>('by24')
  const [sourceId, setSourceId] = useState('')
  const [sourcePw, setSourcePw] = useState('')
  const [yearMonth, setYearMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`
  })

  // sunote (목적지)
  const [sunoteId, setSunoteId] = useState('')
  const [sunotePw, setSunotePw] = useState('')

  // 상태
  const [loading, setLoading] = useState(false)
  const [transferring, setTransferring] = useState(false)
  const [transferringYm, setTransferringYm] = useState<string | null>(null) // 현재 이관 중인 월
  const [transferredYms, setTransferredYms] = useState<Record<string, string>>({}) // 월별 이관 결과
  const [data, setData] = useState<CashLedgerResult | null>(null)
  const [multiData, setMultiData] = useState<CashLedgerResult[]>([])
  const [error, setError] = useState('')
  const [transferResult, setTransferResult] = useState('')
  const [unmappedCodes, setUnmappedCodes] = useState<{ code: string; name: string; summary: string; yearMonth?: string }[]>([])
  const [customMappings, setCustomMappings] = useState<Record<string, string>>({}) // by24 code → sunote code
  const [showMappings, setShowMappings] = useState(false)
  const [showMappingModal, setShowMappingModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteStartYm, setDeleteStartYm] = useState('')
  const [deleteEndYm, setDeleteEndYm] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteResult, setDeleteResult] = useState('')
  const [mode, setMode] = useState<'single' | 'range'>('single')
  const [startYm, setStartYm] = useState('')
  const [endYm, setEndYm] = useState('')

  // 프로그램 인증 정보 (등록된 정보 자동 로드)
  const [programAuth, setProgramAuth] = useState<{ authType: string; hasUserId?: boolean; hasUserPw?: boolean; certName?: string; hasCertPw?: boolean; savedAt?: string } | null>(null)
  const [authLoading, setAuthLoading] = useState(false)

  // 소스 변경 시 등록된 인증 정보 자동 로드
  useEffect(() => {
    setAuthLoading(true)
    setProgramAuth(null)
    fetch(`/api/settings/program-auth?programId=${source}`)
      .then(res => res.json())
      .then(json => {
        if (json.success && json.data) {
          setProgramAuth(json.data)
        }
      })
      .catch(() => {})
      .finally(() => setAuthLoading(false))
  }, [source])

  // 월 옵션 생성
  const monthOptions = (() => {
    const opts: { value: string; label: string }[] = []
    const now = new Date()
    for (let i = 0; i < 120; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const val = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = `${d.getFullYear()}년 ${String(d.getMonth() + 1).padStart(2, '0')}월`
      opts.push({ value: val, label })
    }
    return opts
  })()

  const currentSource = SOURCE_OPTIONS.find((s) => s.value === source)!

  // 출발지에서 데이터 가져오기
  const handleFetch = async () => {
    // 등록된 인증 정보가 없고, 직접 입력도 없는 경우
    if (!programAuth) {
      if (currentSource.authType === 'cert') {
        setError('인증서가 등록되지 않았습니다. 통합e 인증설정에서 등록하세요.')
        return
      } else if (!sourceId || !sourcePw) {
        setError(`${currentSource.label} 아이디/비밀번호를 입력하세요.`)
        return
      }
    }
    setLoading(true)
    setError('')
    setData(null)
    setMultiData([])
    setTransferResult('')

    try {
      const authFields = programAuth
        ? (currentSource.authType === 'cert' ? { useSavedCert: true } : { useSavedAuth: true })
        : currentSource.authType === 'cert'
          ? { useSavedCert: true }
          : { userId: sourceId, password: sourcePw }
      const body =
        mode === 'single'
          ? { ...authFields, yearMonth }
          : { ...authFields, startYm, endYm }

      const res = await fetch(`/api/${source}/cash-ledger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()

      if (!res.ok) throw new Error(json.error || '조회 실패')

      // 계정명(+적요 세목) → sunote 코드 자동 매핑
      const autoMap = (results: CashLedgerResult[]) => {
        if (!(source in MAPPING_TABLE)) return results
        const mapping = MAPPING_TABLE[source as keyof typeof MAPPING_TABLE]
        const allItems = [...mapping.income, ...mapping.expense]

        // 키즈홈 세목 → sunote 세부코드 매핑 (적요 [세목명] 기반)
        const subCodeMap: Record<string, Record<string, string>> = {
          // 기타필요경비(수입) 1221
          '1221': {
            '입학준비금': '1221-111', '현장학습비': '1221-112', '차량운행비': '1221-113',
            '부모부담행사비': '1221-121', '조석식비': '1221-131',
            '기타시도특성화비': '1221-141', '특성화비': '1221-141',
          },
          // 그밖의지원금 1324
          '1324': { '누리과정지원금': '1324-1' },
          // 공공형운영비 1323
          '1323': { '환경개선비': '1323-1' },
          // 퇴직금및퇴직적립금 2142
          '2142': { '퇴직금': '2142-112', '퇴직적립금': '2142-121' },
          // 수용비및수수료 2211
          '2211': { '누리': '2211-1' },
          // 기타필요경비지출 2421
          '2421': {
            '입학준비금': '2421-111', '현장학습비': '2421-121', '차량운행비': '2421-131',
            '부모부담행사비': '2421-141', '조석식비': '2421-151',
            '기타시도특성화비': '2421-161', '특성화비': '2421-161',
          },
        }

        return results.map(r => ({
          ...r,
          rows: r.rows.map(row => {
            if (row.accountCode) return row

            const name = row.accountName.replace(/[.\s·]/g, '')
            const match = allItems.find(m => {
              const mName = m.by24Name.replace(/[.\s·]/g, '').trim()
              return mName === name
            })
            if (!match) return row

            let code: string = match.sunote

            // 적요에서 [세목명] 추출 → 세부코드 매핑
            const subMap = subCodeMap[code]
            if (subMap) {
              const bracketMatch = row.summary.match(/\[([^\]]+)\]/)
              if (bracketMatch) {
                const subName = bracketMatch[1]
                for (const [keyword, subCode] of Object.entries(subMap)) {
                  if (subName.includes(keyword)) { code = subCode; break }
                }
              }
              // 퇴직금: 적요에 괄호 없어도 키워드 체크
              if (code === '2142') {
                if (row.summary.includes('퇴직적립') || row.summary.includes('퇴직연금')) code = '2142-121'
                else if (row.summary.includes('퇴직금')) code = '2142-112'
                else code = '2142-121' // 기본: 적립금
              }
            }

            return { ...row, accountCode: code }
          }),
        }))
      }

      if (mode === 'single') {
        const mapped = autoMap([json as CashLedgerResult])
        setData(mapped[0])
        setTransferResult(`조회 완료: 1개월, ${mapped[0].rows.length}건 (${new Date().toISOString().substring(0, 16)})`)
      } else {
        const mapped = autoMap(json as CashLedgerResult[])
        setMultiData(mapped)
        const total = mapped.reduce((s, r) => s + r.rows.length, 0)
        setTransferResult(`조회 완료: ${mapped.length}개월, ${total}건 (${new Date().toISOString().substring(0, 16)})`)
      }
      setTransferredYms({})
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  // 이관 중지
  const handleStop = async () => {
    try {
      await fetch('/api/sunote/stop', { method: 'POST' })
      setError('중지 요청됨 — 현재 배치 완료 후 중단됩니다.')
    } catch {
      setError('중지 요청 실패')
    }
  }

  // 월별 이관
  const handleTransferMonth = async (ym: string) => {
    if (!sunoteId || !sunotePw) {
      setError('수전자장부 아이디/비밀번호를 입력하세요.')
      return
    }

    const allData = data ? [data] : multiData
    const monthData = allData.find((d) => d.yearMonth === ym)
    if (!monthData) return

    setTransferring(true)
    setTransferringYm(ym)
    setError('')

    try {
      const res = await fetch('/api/sunote/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: sunoteId,
          password: sunotePw,
          data: [monthData],
          customMappings: Object.keys(customMappings).length > 0 ? customMappings : undefined,
        }),
      })
      const json = await res.json()

      if (!res.ok) throw new Error(json.error || '이관 실패')
      const stopMsg = json.stopped ? ' (중지됨)' : ''
      setTransferredYms((prev) => ({
        ...prev,
        [ym]: `${json.transferred || 0}건 완료${stopMsg}`,
      }))
      if (json.unmappedCodes?.length > 0) {
        setUnmappedCodes((prev) => [...prev, ...json.unmappedCodes])
      }
    } catch (e) {
      setTransferredYms((prev) => ({
        ...prev,
        [ym]: `실패: ${e instanceof Error ? e.message : String(e)}`,
      }))
    } finally {
      setTransferring(false)
      setTransferringYm(null)
    }
  }

  // 전체 일괄 이관 (월별 루프)
  const handleTransferAll = async () => {
    if (!sunoteId || !sunotePw) {
      setError('수전자장부 아이디/비밀번호를 입력하세요.')
      return
    }
    const allData = data ? [data] : multiData
    if (allData.length === 0) return

    setTransferring(true)
    setError('')
    setUnmappedCodes([])

    for (const monthData of allData) {
      const ym = monthData.yearMonth
      if (transferredYms[ym] && !transferredYms[ym].startsWith('실패')) continue // 이미 완료된 월 스킵

      setTransferringYm(ym)
      try {
        const res = await fetch('/api/sunote/transfer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: sunoteId,
            password: sunotePw,
            data: [monthData],
            customMappings: Object.keys(customMappings).length > 0 ? customMappings : undefined,
          }),
        })
        const json = await res.json()

        if (!res.ok) throw new Error(json.error || '이관 실패')
        const stopMsg = json.stopped ? ' (중지됨)' : ''
        setTransferredYms((prev) => ({ ...prev, [ym]: `${json.transferred || 0}건 완료${stopMsg}` }))
        if (json.unmappedCodes?.length > 0) {
          setUnmappedCodes((prev) => [...prev, ...json.unmappedCodes])
        }
        if (json.stopped) break // 중지 요청 시 루프 종료
      } catch (e) {
        setTransferredYms((prev) => ({ ...prev, [ym]: `실패: ${e instanceof Error ? e.message : String(e)}` }))
        break // 에러 시 루프 중단
      }
    }

    setTransferring(false)
    setTransferringYm(null)
  }

  // 엑셀 다운로드
  const handleExcelDownload = () => {
    const allData = data ? [data] : multiData
    if (allData.length === 0) return

    const wb = XLSX.utils.book_new()

    for (const result of allData) {
      const ym = result.yearMonth
      const label = `${ym.substring(0, 4)}년 ${ym.substring(4)}월`

      // 요약 행 + 헤더 + 데이터
      const rows = [
        [`[${label}] 현금출납부`],
        [`전월이월: ${fmtAmt(result.summary.monthStart)}원`, '', '', `수입합계: ${fmtAmt(result.summary.monthIncome)}원`, '', `지출합계: ${fmtAmt(result.summary.monthExpense)}원`],
        [],
        ['일자', '발행번호', '계정코드', '계정과목', '적요', '수입금액', '지출금액', '잔액'],
        ...result.rows.map((r) => [
          r.date,
          r.docNo,
          r.accountCode,
          r.accountName,
          r.summary,
          r.income || '',
          r.expense || '',
          r.balance || '',
        ]),
      ]

      const ws = XLSX.utils.aoa_to_sheet(rows)
      // 열 너비 설정
      ws['!cols'] = [
        { wch: 6 }, { wch: 10 }, { wch: 10 }, { wch: 15 }, { wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
      ]
      XLSX.utils.book_append_sheet(wb, ws, label)
    }

    const fileName = allData.length === 1
      ? `현금출납부_${allData[0].yearMonth}.xlsx`
      : `현금출납부_${allData[0].yearMonth}-${allData[allData.length - 1].yearMonth}.xlsx`
    XLSX.writeFile(wb, fileName)
  }

  // 일괄 엑셀 다운로드 (한 시트, 날짜 YYYY/MM/DD)
  const handleExcelDownloadAll = () => {
    const allData = data ? [data] : multiData
    if (allData.length === 0) return

    const wb = XLSX.utils.book_new()
    const rows: (string | number)[][] = [
      ['날짜', '발행번호', '계정코드', '계정과목', '적요', '수입금액', '지출금액', '잔액'],
    ]

    for (const result of allData) {
      const yyyy = result.yearMonth.substring(0, 4)
      const mm = result.yearMonth.substring(4)
      for (const r of result.rows) {
        const dd = r.date.padStart(2, '0')
        rows.push([
          `${yyyy}/${mm}/${dd}`,
          r.docNo,
          r.accountCode,
          r.accountName,
          r.summary,
          r.income || '',
          r.expense || '',
          r.balance || '',
        ])
      }
    }

    const ws = XLSX.utils.aoa_to_sheet(rows)
    ws['!cols'] = [
      { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 15 }, { wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
    ]
    XLSX.utils.book_append_sheet(wb, ws, '현금출납부')

    const fileName = allData.length === 1
      ? `현금출납부_일괄_${allData[0].yearMonth}.xlsx`
      : `현금출납부_일괄_${allData[0].yearMonth}-${allData[allData.length - 1].yearMonth}.xlsx`
    XLSX.writeFile(wb, fileName)
  }

  const displayData = data ? [data] : multiData
  const totalRows = displayData.reduce((sum, d) => sum + d.rows.length, 0)

  // 고유 계정코드 추출
  const uniqueAccounts = (() => {
    const map = new Map<string, { code: string; name: string; count: number }>()
    for (const d of displayData) {
      for (const r of d.rows) {
        if (!r.accountCode) continue
        const key = r.accountCode
        const existing = map.get(key)
        if (existing) {
          existing.count++
        } else {
          map.set(key, { code: key, name: r.accountName, count: 1 })
        }
      }
    }
    return Array.from(map.values()).sort((a, b) => a.code.localeCompare(b.code))
  })()

  return (
    <div className="space-y-6">
      {/* 제목 */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">데이터 이관</h1>
        <p className="text-sm text-slate-500 mt-1">
          {currentSource.label}({currentSource.url}) → 수전자장부(sunote.co.kr) 현금출납부 이관
        </p>
      </div>

      {/* 2열 레이아웃: 출발지 / 목적지 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 출발지 */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-blue-600 font-bold text-sm">1</span>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-slate-800">출발지</h2>
                <select
                  value={source}
                  onChange={(e) => {
                    setSource(e.target.value as SourceType)
                    setData(null)
                    setMultiData([])
                    setError('')
                    setTransferResult('')
                  }}
                  className="px-2 py-1 border border-slate-200 rounded-lg text-sm font-medium text-blue-700 bg-blue-50"
                >
                  {SOURCE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}{o.features.length > 0 ? '  (가능)' : ''}</option>
                  ))}
                </select>
                {source in MAPPING_TABLE && (
                  <button
                    onClick={() => setShowMappingModal(true)}
                    className="px-2 py-1 text-xs bg-violet-50 text-violet-700 border border-violet-200 rounded-lg hover:bg-violet-100 font-medium"
                  >
                    매핑 코드
                  </button>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <p className="text-xs text-slate-400">{currentSource.url}</p>
                {currentSource.features.length > 0 ? (
                  currentSource.features.map((f) => (
                    <span key={f} className="text-[10px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded font-medium">{f}</span>
                  ))
                ) : (
                  <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-400 rounded">준비중</span>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {/* 인증 정보 영역 */}
            {authLoading ? (
              <div className="text-xs text-slate-400 py-2">인증 정보 확인 중...</div>
            ) : programAuth ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-600 text-lg">&#x2713;</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-emerald-800">
                      {programAuth.authType === 'cert'
                        ? `인증서 등록됨: ${programAuth.certName}`
                        : '아이디/비밀번호 등록됨'}
                    </p>
                    <p className="text-xs text-emerald-600 mt-0.5">
                      통합e 인증설정에서 등록 · 바로 사용 가능
                      {programAuth.savedAt && ` · ${new Date(programAuth.savedAt).toLocaleDateString('ko-KR')}`}
                    </p>
                  </div>
                  <a href="http://localhost:4000/dashboard/settings/cis-auth"
                    target="_blank" rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:text-blue-700 px-2 py-1 rounded hover:bg-blue-50">
                    수정
                  </a>
                </div>
              </div>
            ) : currentSource.authType === 'cert' ? (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-xs text-amber-700 font-medium">인증서가 등록되지 않았습니다.</p>
                <a href="http://localhost:4000/dashboard/settings/cis-auth"
                  target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-2 text-xs text-amber-700 font-medium underline">
                  통합e 인증설정에서 등록하기
                </a>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">아이디</label>
                  <input
                    type="text"
                    value={sourceId}
                    onChange={(e) => setSourceId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    placeholder={`${currentSource.label} 아이디`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">비밀번호</label>
                  <input
                    type="password"
                    value={sourcePw}
                    onChange={(e) => setSourcePw(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    placeholder="비밀번호"
                  />
                </div>
                <a href="http://localhost:4000/dashboard/settings/cis-auth"
                  target="_blank" rel="noopener noreferrer"
                  className="text-xs text-blue-500 hover:text-blue-700">
                  통합e에 인증정보 등록하면 자동 사용됩니다
                </a>
              </>
            )}

            {/* 조회 모드 */}
            <div className="flex gap-2">
              <button
                onClick={() => setMode('single')}
                className={`px-3 py-1.5 text-xs rounded-lg ${
                  mode === 'single'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                단일 월
              </button>
              <button
                onClick={() => setMode('range')}
                className={`px-3 py-1.5 text-xs rounded-lg ${
                  mode === 'range'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                기간 조회
              </button>
            </div>

            {mode === 'single' ? (
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">조회월</label>
                <select
                  value={yearMonth}
                  onChange={(e) => setYearMonth(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                >
                  {monthOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">시작월</label>
                  <select
                    value={startYm}
                    onChange={(e) => setStartYm(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  >
                    <option value="">선택</option>
                    {monthOptions.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">종료월</label>
                  <select
                    value={endYm}
                    onChange={(e) => setEndYm(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  >
                    <option value="">선택</option>
                    {monthOptions.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <button
              onClick={handleFetch}
              disabled={loading}
              className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  로그인 + 데이터 조회 중...
                </span>
              ) : (
                '데이터 가져오기'
              )}
            </button>

            {/* 저장된 데이터 불러오기 */}
            {(source === 'kidshome' || source === 'by24' || source === 'incheon') && (
              <button
                onClick={async () => {
                  const storedUserId = currentSource.authType === 'cert' ? (certInfo?.certName || '') : sourceId
                  if (!storedUserId) { setError(currentSource.authType === 'cert' ? '등록된 인증서가 없습니다.' : '아이디를 입력하세요.'); return }
                  setLoading(true); setError('')
                  try {
                    let storedUrl = `/api/${source}/stored?userId=${encodeURIComponent(storedUserId)}&latest=1`
                    if (mode === 'single' && yearMonth) {
                      storedUrl += `&startYm=${yearMonth}&endYm=${yearMonth}`
                    } else if (mode === 'range' && startYm && endYm) {
                      storedUrl += `&startYm=${startYm}&endYm=${endYm}`
                    }
                    const res = await fetch(storedUrl)
                    const json = await res.json()
                    if (!res.ok) throw new Error(json.error || '저장된 데이터 없음')
                    const results = json.data as CashLedgerResult[]
                    if (!results || results.length === 0) throw new Error('저장된 데이터가 없습니다')
                    // autoMap 적용
                    if (source in MAPPING_TABLE) {
                      const mapping = MAPPING_TABLE[source as keyof typeof MAPPING_TABLE]
                      const allItems = [...mapping.income, ...mapping.expense]
                      const subCodeMap: Record<string, Record<string, string>> = {
                        '1221': { '입학준비금': '1221-111', '현장학습비': '1221-112', '차량운행비': '1221-113', '부모부담행사비': '1221-121', '조석식비': '1221-131', '기타시도특성화비': '1221-141', '특성화비': '1221-141' },
                        '1324': { '누리과정지원금': '1324-1' }, '1323': { '환경개선비': '1323-1' },
                        '2142': { '퇴직금': '2142-112', '퇴직적립금': '2142-121' }, '2211': { '누리': '2211-1' },
                        '2421': { '입학준비금': '2421-111', '현장학습비': '2421-121', '차량운행비': '2421-131', '부모부담행사비': '2421-141', '조석식비': '2421-151', '기타시도특성화비': '2421-161', '특성화비': '2421-161' },
                      }
                      const mapped = results.map(r => ({
                        ...r,
                        rows: r.rows.map(row => {
                          if (row.accountCode) return row
                          const name = row.accountName.replace(/[.\s·]/g, '')
                          const match = allItems.find(m => m.by24Name.replace(/[.\s·]/g, '').trim() === name)
                          if (!match) return row
                          let code: string = match.sunote
                          const subMap = subCodeMap[code]
                          if (subMap) {
                            const bm = row.summary.match(/\[([^\]]+)\]/)
                            if (bm) { for (const [kw, sc] of Object.entries(subMap)) { if (bm[1].includes(kw)) { code = sc; break } } }
                            if (code === '2142') {
                              if (row.summary.includes('퇴직적립') || row.summary.includes('퇴직연금')) code = '2142-121'
                              else if (row.summary.includes('퇴직금')) code = '2142-112'
                              else code = '2142-121'
                            }
                          }
                          return { ...row, accountCode: code }
                        }),
                      }))
                      setMultiData(mapped)
                    } else {
                      setMultiData(results)
                    }
                    setData(null)
                    setTransferredYms({})
                    setUnmappedCodes([])
                    setError('')
                    setTransferResult(`저장된 데이터 불러옴: ${json.months?.length || results.length}개월, ${json.totalRows || results.reduce((s: number, r: CashLedgerResult) => s + r.rows.length, 0)}건 (${json.scrapedAt?.substring(0, 16) || ''})`)
                  } catch (e) { setError(e instanceof Error ? e.message : String(e)) }
                  finally { setLoading(false) }
                }}
                disabled={loading}
                className="w-full py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 disabled:opacity-50"
              >
                저장된 데이터 불러오기
              </button>
            )}
          </div>
        </div>

        {/* 목적지: 수전자장부 */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
              <span className="text-emerald-600 font-bold text-sm">2</span>
            </div>
            <div className="flex-1">
              <h2 className="font-semibold text-slate-800">수전자장부 (목적지)</h2>
              <p className="text-xs text-slate-400">sunote.co.kr</p>
            </div>
            <button
              onClick={() => {
                setDeleteStartYm('')
                setDeleteEndYm('')
                setDeleteResult('')
                setShowDeleteModal(true)
              }}
              className="px-3 py-1.5 text-xs bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 font-medium"
            >
              현금출납부 삭제
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">아이디</label>
              <input
                type="text"
                value={sunoteId}
                onChange={(e) => setSunoteId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                placeholder="수전자장부 아이디"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">비밀번호</label>
              <input
                type="password"
                value={sunotePw}
                onChange={(e) => setSunotePw(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                placeholder="비밀번호"
              />
            </div>

            {/* 에러 알림 */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 animate-pulse">
                <p className="text-sm text-red-600 font-medium">{error}</p>
              </div>
            )}

            {/* 이관 요약 */}
            {totalRows > 0 && (
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                <p className="text-sm text-blue-700 font-medium">
                  이관 대상: {displayData.length}개월, {totalRows}건
                </p>
                <ul className="text-xs text-blue-600 mt-1 space-y-0.5">
                  {displayData.map((d) => (
                    <li key={d.yearMonth}>
                      {d.yearMonth.substring(0, 4)}년 {d.yearMonth.substring(4)}월: {d.rows.length}건
                      (수입 {fmtAmt(d.summary.monthIncome)}원 / 지출 {fmtAmt(d.summary.monthExpense)}원)
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 매핑 설정 */}
            {uniqueAccounts.length > 0 && (
              <div>
                <button
                  onClick={() => setShowMappings(!showMappings)}
                  className="w-full flex items-center justify-between px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 hover:bg-amber-100"
                >
                  <span className="font-medium">
                    계정코드 매핑 설정 ({uniqueAccounts.length}개)
                    {Object.keys(customMappings).length > 0 && (
                      <span className="ml-1 text-xs text-amber-600">
                        (커스텀 {Object.keys(customMappings).length}건)
                      </span>
                    )}
                  </span>
                  <svg className={`w-4 h-4 transition-transform ${showMappings ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showMappings && (
                  <div className="mt-2 border border-amber-200 rounded-lg overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-amber-50 text-amber-700">
                          <th className="px-2 py-1.5 text-left">출발지 코드</th>
                          <th className="px-2 py-1.5 text-left">계정과목</th>
                          <th className="px-2 py-1.5 text-center">건수</th>
                          <th className="px-2 py-1.5 text-left">sunote 코드</th>
                        </tr>
                      </thead>
                      <tbody>
                        {uniqueAccounts.map((acc) => (
                          <tr key={acc.code} className="border-t border-amber-100">
                            <td className="px-2 py-1.5 font-mono text-slate-700">{acc.code}</td>
                            <td className="px-2 py-1.5 text-slate-600">{acc.name}</td>
                            <td className="px-2 py-1.5 text-center text-slate-500">{acc.count}</td>
                            <td className="px-2 py-1.5">
                              <input
                                type="text"
                                value={customMappings[acc.code] ?? ''}
                                onChange={(e) => {
                                  const val = e.target.value.trim()
                                  setCustomMappings((prev) => {
                                    const next = { ...prev }
                                    if (val) {
                                      next[acc.code] = val
                                    } else {
                                      delete next[acc.code]
                                    }
                                    return next
                                  })
                                }}
                                className="w-20 px-1.5 py-0.5 border border-slate-200 rounded text-xs font-mono text-center focus:border-amber-400 focus:outline-none"
                                placeholder="자동"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>

      {/* 이관 버튼 (2열 그리드 바로 아래) */}
      {displayData.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-2">
          <h3 className="font-semibold text-slate-800 mb-3">이관 실행</h3>
          {/* 전체 일괄 이관 */}
          <button
            onClick={handleTransferAll}
            disabled={transferring}
            className="w-full py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {transferring && (
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            전체 일괄 이관 ({displayData.length}개월, {totalRows}건)
          </button>
          {transferring && (
            <button
              onClick={handleStop}
              className="w-full py-2 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700"
            >
              중지
            </button>
          )}
          <p className="text-xs font-medium text-slate-500 pt-1">또는 월별 개별 이관</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {displayData.map((d) => {
              const ym = d.yearMonth
              const label = `${ym.substring(0, 4)}년 ${ym.substring(4)}월`
              const result = transferredYms[ym]
              const isThisTransferring = transferringYm === ym
              const isDone = result && !result.startsWith('실패')
              const isFailed = result && result.startsWith('실패')

              return (
                <div key={ym} className="flex items-center gap-1">
                  <button
                    onClick={() => handleTransferMonth(ym)}
                    disabled={transferring || !!isDone}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium ${
                      isDone
                        ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                        : isFailed
                          ? 'bg-red-100 text-red-700 border border-red-200'
                          : 'bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50'
                    }`}
                  >
                    {isThisTransferring ? (
                      <span className="flex items-center justify-center gap-1.5">
                        <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        이관 중...
                      </span>
                    ) : result ? (
                      `${label} — ${result}`
                    ) : (
                      `${label} (${d.rows.length}건)`
                    )}
                  </button>
                  {isThisTransferring && (
                    <button
                      onClick={handleStop}
                      className="px-2 py-2 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700"
                    >
                      중지
                    </button>
                  )}
                  {isDone && !transferring && (
                    <button
                      onClick={() => setTransferredYms((prev) => {
                        const next = { ...prev }
                        delete next[ym]
                        return next
                      })}
                      className="px-2 py-2 bg-slate-200 text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-300"
                      title="리셋"
                    >
                      ↺
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 에러 */}
      {error && (
        <div className="bg-red-50 border border-red-100 rounded-lg p-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* 이관 결과 */}
      {transferResult && (
        <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3">
          <p className="text-sm text-emerald-700 font-medium">{transferResult}</p>
        </div>
      )}

      {/* 매핑 실패 계정코드 */}
      {unmappedCodes.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-sm font-semibold text-amber-800 mb-2">
            매핑 안 된 계정코드 ({unmappedCodes.length}건)
          </p>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-amber-700 border-b border-amber-200">
                <th className="py-1 text-left">월</th>
                <th className="py-1 text-left">코드</th>
                <th className="py-1 text-left">계정과목</th>
                <th className="py-1 text-left">적요</th>
              </tr>
            </thead>
            <tbody>
              {unmappedCodes.map((c, i) => (
                <tr key={i} className="border-b border-amber-100 text-amber-900">
                  <td className="py-1">{c.yearMonth || '-'}</td>
                  <td className="py-1 font-mono">{c.code}</td>
                  <td className="py-1">{c.name}</td>
                  <td className="py-1">{c.summary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 데이터 미리보기 */}
      {displayData.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-semibold text-slate-800">
              조회 결과 ({totalRows}건)
            </h3>
            <div className="flex gap-2">
              <button
                onClick={handleExcelDownload}
                className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                월별 엑셀
              </button>
              <button
                onClick={handleExcelDownloadAll}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                일괄 엑셀
              </button>
            </div>
          </div>

          {displayData.map((result, di) => (
            <div key={`${result.yearMonth}-${result.rows.length}-${di}`} className="border-b border-slate-100 last:border-0">
              {/* 월별 요약 */}
              <div className="px-6 py-3 bg-slate-50 flex items-center gap-4 text-sm">
                <span className="font-medium text-slate-700">
                  {result.yearMonth.substring(0, 4)}년 {result.yearMonth.substring(4)}월
                </span>
                <span className="text-slate-400">|</span>
                <span className="text-slate-500">전월이월: {fmtAmt(result.summary.monthStart)}원</span>
                <span className="text-blue-600">수입: {fmtAmt(result.summary.monthIncome)}원</span>
                <span className="text-red-600">지출: {fmtAmt(result.summary.monthExpense)}원</span>
              </div>

              {/* 테이블 */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-xs font-semibold text-slate-500">
                      <th className="px-3 py-2 text-center w-12">일자</th>
                      <th className="px-3 py-2 text-center w-20">발행번호</th>
                      <th className="px-3 py-2 text-center w-20">코드</th>
                      <th className="px-3 py-2 text-left">계정과목</th>
                      <th className="px-3 py-2 text-left">세목</th>
                      <th className="px-3 py-2 text-left">적요</th>
                      <th className="px-3 py-2 text-right w-28">수입금액</th>
                      <th className="px-3 py-2 text-right w-28">지출금액</th>
                      <th className="px-3 py-2 text-right w-28">잔액</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.rows.map((row) => (
                      <tr key={`${result.yearMonth}-${row.idx}`} className="border-t border-slate-100 hover:bg-slate-50">
                        <td className="px-3 py-2 text-center text-slate-600">{row.date}</td>
                        <td className="px-3 py-2 text-center text-slate-500">{row.docNo}</td>
                        <td className="px-3 py-2 text-center font-mono text-xs">
                          {row.accountCode ? (
                            <span className={`font-medium px-1.5 py-0.5 rounded ${
                              row.accountCode.length >= 4
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}>{row.accountCode}</span>
                          ) : (
                            <input
                              type="text"
                              className="w-16 px-1 py-0.5 border border-red-300 rounded text-center text-xs bg-red-50"
                              placeholder="코드"
                              onChange={(e) => {
                                const val = e.target.value.trim()
                                if (data) {
                                  setData(prev => {
                                    if (!prev) return prev
                                    const newRows = prev.rows.map(r =>
                                      r.idx === row.idx ? { ...r, accountCode: val } : r
                                    )
                                    return { ...prev, rows: newRows }
                                  })
                                } else {
                                  setMultiData(prev =>
                                    prev.map(d =>
                                      d.yearMonth === result.yearMonth
                                        ? { ...d, rows: d.rows.map(r => r.idx === row.idx ? { ...r, accountCode: val } : r) }
                                        : d
                                    )
                                  )
                                }
                              }}
                            />
                          )}
                        </td>
                        <td className="px-3 py-2 text-slate-700">{row.accountName}</td>
                        <td className="px-3 py-2 text-slate-500 text-xs">{(row as any).subAccountName || ''}</td>
                        <td className="px-3 py-2 text-slate-600">{row.summary}</td>
                        <td className="px-3 py-2 text-right text-blue-600 font-medium">
                          {row.income ? fmtAmt(row.income) : ''}
                        </td>
                        <td className="px-3 py-2 text-right text-red-600 font-medium">
                          {row.expense ? fmtAmt(row.expense) : ''}
                        </td>
                        <td className="px-3 py-2 text-right text-slate-700 font-medium">
                          {fmtAmt(row.balance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
      {/* 매핑 코드 모달 */}
      {showMappingModal && source in MAPPING_TABLE && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowMappingModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-[720px] max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div>
                <h3 className="font-bold text-slate-800">계정코드 매핑표</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {currentSource.label} → 수전자장부 | {MAPPING_TABLE[source as keyof typeof MAPPING_TABLE].pattern}
                </p>
              </div>
              <button onClick={() => setShowMappingModal(false)} className="p-1 hover:bg-slate-100 rounded-lg">
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 모달 본문 */}
            <div className="overflow-y-auto px-6 py-4 space-y-4">
              {(() => {
                const mapping = MAPPING_TABLE[source as keyof typeof MAPPING_TABLE]
                return (
                  <>
                    {/* 수입 */}
                    <div>
                      <h4 className="text-sm font-semibold text-blue-700 mb-2">수입</h4>
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-blue-50 text-blue-700">
                            <th className="px-2 py-1.5 text-left w-20">{currentSource.label}</th>
                            <th className="px-2 py-1.5 text-left">계정과목</th>
                            <th className="px-2 py-1.5 text-left w-20">수전자장부</th>
                            <th className="px-2 py-1.5 text-left">세목 상세</th>
                          </tr>
                        </thead>
                        <tbody>
                          {mapping.income.map((m, i) => {
                            const isGroup = 'group' in m && m.group
                            const isSub = 'sub' in m && m.sub || (m.by24.length === 7 && m.sunote.includes('-'))
                            const is4to4 = !isGroup && !isSub && m.sunote.length === 4
                            return (
                            <tr key={`${m.sunote}-${i}`} className={`border-t hover:bg-slate-50 ${isGroup ? 'border-slate-200 bg-blue-50/50' : 'border-slate-100'}`}>
                              <td className={`px-2 py-1.5 font-mono ${isSub ? 'text-slate-400 pl-4 text-[11px]' : 'text-slate-700 font-medium'}`}>{m.by24}</td>
                              <td className={`px-2 py-1.5 ${isSub ? 'text-slate-500 pl-4' : 'text-slate-600 font-medium'}`}>{m.by24Name}</td>
                              <td className={`px-2 py-1.5 font-mono font-medium ${isSub ? 'text-orange-600' : is4to4 ? 'text-blue-600' : 'text-amber-600'}`}>{m.sunote}</td>
                              <td className="px-2 py-1.5 text-slate-400">{m.sunoteNote}</td>
                            </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* 지출 */}
                    <div>
                      <h4 className="text-sm font-semibold text-red-700 mb-2">지출</h4>
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-red-50 text-red-700">
                            <th className="px-2 py-1.5 text-left w-20">{currentSource.label}</th>
                            <th className="px-2 py-1.5 text-left">계정과목</th>
                            <th className="px-2 py-1.5 text-left w-20">수전자장부</th>
                            <th className="px-2 py-1.5 text-left">세목 상세</th>
                          </tr>
                        </thead>
                        <tbody>
                          {mapping.expense.map((m, i) => {
                            const isGroup = 'group' in m && m.group
                            const isSub = 'sub' in m && m.sub || (m.by24.length === 7 && m.sunote.includes('-'))
                            const is4to4 = !isGroup && !isSub && m.sunote.length === 4
                            return (
                            <tr key={`${m.sunote}-${i}`} className={`border-t hover:bg-slate-50 ${isGroup ? 'border-slate-200 bg-red-50/50' : 'border-slate-100'}`}>
                              <td className={`px-2 py-1.5 font-mono ${isSub ? 'text-slate-400 pl-4 text-[11px]' : 'text-slate-700 font-medium'}`}>{m.by24}</td>
                              <td className={`px-2 py-1.5 ${isSub ? 'text-slate-500 pl-4' : 'text-slate-600 font-medium'}`}>{m.by24Name}</td>
                              <td className={`px-2 py-1.5 font-mono font-medium ${isSub ? 'text-orange-600' : is4to4 ? 'text-blue-600' : 'text-amber-600'}`}>{m.sunote}</td>
                              <td className="px-2 py-1.5 text-slate-400">{m.sunoteNote}</td>
                            </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </>
                )
              })()}
            </div>
          </div>
        </div>
      )}
      {/* 삭제 모달 */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => !deleting && setShowDeleteModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-[420px] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="font-bold text-slate-800">수전자장부 현금출납부 삭제</h3>
              <button onClick={() => !deleting && setShowDeleteModal(false)} className="p-1 hover:bg-slate-100 rounded-lg">
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              {!sunoteId || !sunotePw ? (
                <p className="text-sm text-red-600">수전자장부 아이디/비밀번호를 먼저 입력하세요.</p>
              ) : (
                <>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-slate-600 mb-1">시작월</label>
                      <select
                        value={deleteStartYm}
                        onChange={(e) => { setDeleteStartYm(e.target.value); if (!deleteEndYm) setDeleteEndYm(e.target.value) }}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                      >
                        <option value="">선택</option>
                        {Array.from({ length: 36 }, (_, i) => {
                          const d = new Date(); d.setMonth(d.getMonth() - i)
                          const v = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`
                          return <option key={v} value={v}>{d.getFullYear()}년 {d.getMonth() + 1}월</option>
                        })}
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-slate-600 mb-1">종료월</label>
                      <select
                        value={deleteEndYm}
                        onChange={(e) => setDeleteEndYm(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                      >
                        <option value="">선택</option>
                        {Array.from({ length: 36 }, (_, i) => {
                          const d = new Date(); d.setMonth(d.getMonth() - i)
                          const v = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`
                          return <option key={v} value={v}>{d.getFullYear()}년 {d.getMonth() + 1}월</option>
                        })}
                      </select>
                    </div>
                  </div>
                  {deleteResult && (
                    <div className={`p-3 rounded-lg text-sm ${deleteResult.includes('실패') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                      {deleteResult}
                    </div>
                  )}
                  <button
                    disabled={!deleteStartYm || !deleteEndYm || deleting}
                    onClick={async () => {
                      setDeleting(true)
                      setDeleteResult('')
                      try {
                        // 월 목록 생성
                        const yms: string[] = []
                        let y = parseInt(deleteStartYm.substring(0, 4)), m = parseInt(deleteStartYm.substring(4, 6))
                        const ey = parseInt(deleteEndYm.substring(0, 4)), em = parseInt(deleteEndYm.substring(4, 6))
                        while (y < ey || (y === ey && m <= em)) {
                          yms.push(`${y}${String(m).padStart(2, '0')}`)
                          m++; if (m > 12) { m = 1; y++ }
                        }
                        const res = await fetch('/api/sunote/delete', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ userId: sunoteId, password: sunotePw, yearMonths: yms }),
                        })
                        const json = await res.json()
                        if (!res.ok) throw new Error(json.error || '삭제 실패')
                        setDeleteResult(`삭제 완료: ${json.deleted}건 (${yms.length}개월)`)
                      } catch (e) {
                        setDeleteResult(`삭제 실패: ${e instanceof Error ? e.message : String(e)}`)
                      } finally {
                        setDeleting(false)
                      }
                    }}
                    className="w-full py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                  >
                    {deleting ? '삭제 중...' : '삭제 실행'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
