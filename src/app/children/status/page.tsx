'use client'
import React, { useState, useEffect, useCallback, useMemo } from 'react'

/**
 * 아동현황 — 인천시어린이집관리시스템 [아동 > 아동 등록/수정] 인터페이스와 동일 구성.
 *
 * 인천시 화면정의(childRegUdt.xml) + API(childBasicInfoList.do / getChildDetailInfo.do /
 * searchChildClasList.do / getKidBillKeywordList.do)를 그대로 옮긴 것. 좌측 목록(나이/성명/반명)
 * → 우측 상세 폼 레이아웃까지 동일.
 *
 * ★ CHIL_SN(아동 고유키)
 *   인천시 필요경비 정산 화면은 키가 이름+반뿐이라 동명이인 충돌 위험이 있었는데(실측 5,863명
 *   중 3건), 아동 API 는 CHIL_SN 을 준다. 정산 자동화는 이 CHIL_SN 을 기준키로 쓴다.
 *
 * ★ 자동등록 키워드
 *   인천시 원문 안내: "보호자가 필요경비 입금 시, 통장에 찍히는 문구를 등록하시면 자동
 *   매칭됩니다. 최대 4개까지 등록 가능합니다." → 필요경비정산 자동화의 핵심 축이라 그대로 노출.
 *
 * 데이터는 통합e page_data(field='incheon-children' / 'incheon-keywords')에 인천시 필드명
 * 그대로 저장돼 있고, [인천시에서 가져오기]가 로컬 에이전트로 실제 조회해 갱신한다.
 */

const inputCls = 'border border-teal-300 rounded px-2 py-1 text-[11px] focus:outline-none focus:border-teal-500 w-full'
const roCls = 'border border-slate-200 bg-slate-50 rounded px-2 py-1 text-[11px] w-full text-slate-600'

/** 인천시 아동 (childBasicInfoList.do → childBasicInfoList[]) — 필드명 원본 그대로 */
type IncheonChild = {
  CHIL_SN: number          // ★ 아동 고유키
  CHIL_NM: string          // 성명
  CHILINNB: string         // 아동고유번호
  BRTHDY: string           // 생년월일 YYYYMMDD
  CHILD_CARE_AGE: number   // 보육나이
  CLAS_SN: string          // 반 고유키
  CLAS_NM: string          // 반명
  ENTRNC_DE: string        // 입소일
  RETIRE_DE: string | null // 퇴소일
  STTUS: string            // 상태코드
  KID_STATE_NM: string     // 상태명 (현원/퇴소)
  CARETIME_CD: string
  TIME_NAME: string        // 보육시간명
  CARERIG_CD: string
  CARERIG_STDDE: string    // 보육기준일
  ADRES: string | null     // 주소
  DISP_NAME: string        // 반유형 표시
  FRGNR_SE: string         // 외국인 여부
  NRTR_CHRGE: number       // 보육료
  SPORT_RT: string | null  // 지원율
  CHLDSBUS_USE_BGNDE: string | null  // 통학차량 이용 시작일
  CHLDSBUS_USE_ENDDE: string | null  // 통학차량 이용 종료일
  // ── 아래는 목록 API 엔 없고 상세 API(getChildDetailInfo)로 보강되는 필드 ──
  CHIL_REAL_NM?: string      // 아동실명 (목록의 CHIL_NM 은 아동'별칭')
  CHIL_SEXDSTN?: string      // 성별 코드 (M=남 / F=여)
  CHIL_SEX_NM?: string       // 성별 한글명
  HOME_TY_CD?: string        // 가정유형
  SPORT_DCSN_DE?: string     // 지원확정일
  PARNTS_CHIL_RELATE?: string// 보호자 관계
  PARNTS_NM?: string         // 보호자 성명
  PARNTS_CTTPC?: string      // 보호자 연락처
  PARNTS_MOBLPHON?: string   // 보호자 핸드폰
  PARNTS_RM?: string         // 기타사항
  COM_CARE_NAME?: string     // 보육기준명
  ZIP?: string               // 우편번호
  SMS_SE?: string            // SMS 수신여부
  RM?: string                // 비고
  // ── 반·보육 (CIS 소스일 때만 채워짐) — 인천시 목록엔 현재 반 하나뿐이라 다중 배정이 없다 ──
  _classGeneral?: string     // 반(일반)
  _classHoliday?: string     // 반(휴일)
  _classExtended?: string    // 반(연장)
  _classNight?: string       // 반(새벽)
  _classNightCare?: string   // 반(야간연장)
  _nightCareStart?: string   // 야간연장 시작일
  _raw?: Record<string, unknown>  // CIS 원본 전체 (보육통합 소스일 때만) — 통합e 상세 팝업과 동일 렌더용
  _local?: boolean         // 통합e 에서 추가한 아동(인천시에 없음)
}

type IncheonKeyword = { CHIL_SN: number; KEYWORD_NM: string }

/** 인천시 공통코드 (getCodeList.do → tcmCodeList) — 보육시간 등 라벨의 원본 */
type IncheonCode = { CD_GRP: string; CD: string; CD_NM: string }

/** 아동 상태코드 — 인천시 childRegUdt.xml 의 <xf:choices> 실측(추측 아님).
 *  childBasicInfoList.do 의 SCH_STTUS 파라미터 값이기도 하다. */
const CHILD_STATUS: Array<{ cd: string; nm: string }> = [
  { cd: '000', nm: '현원' },
  { cd: '001', nm: '퇴소' },
  { cd: '999', nm: '졸업' },
]

/**
 * 보육통합(CIS E0003) 아동 — 회계앱 /api/sync/children 이 정규화해 주는 형태.
 * 통합e 가 CIS 에서 수집해 page_data(child-cur/child-leave)에 넣어둔 것을 읽는다.
 */
type CisChild = {
  id: number
  name: string
  birth: string            // YYYY-MM-DD
  age: string
  residentNo: string       // '230215-3******' (뒷자리 마스킹)
  className: string
  enterDate: string
  leaveDate: string
  guardian: string
  guardianRelation: string
  phone: string
  status: '현원' | '퇴소'
  // 반·보육 (CIS E0003) — 통합e 아동정보 [반·보육] 탭과 동일
  generalClassId: string           // 반(일반)  '[1][ 4.5세이상 반 ] 푸른하늘26'
  holidayClassId: string           // 반(휴일)
  extendedClassId: string          // 반(연장)
  nightClassId: string             // 반(새벽)
  nightCareClassId: string         // 반(야간연장)
  nightCareClassStartDate: string  // 야간연장 시작일
  careTimeType: string             // 보육시간
  _raw: Record<string, unknown>    // CIS E0003 원본 전체 — 통합e 상세 팝업과 동일 필드/라벨 재사용
  _stat: '01' | '02'
}

/**
 * 주민번호 앞 7자리(생년월일 6 + 뒷1자리) 추출 — CIS ↔ 인천시 매칭 키.
 *
 * ★ 인천시 CHILINNB 는 주민번호 앞7자리로 시작한다(실측):
 *     강하윤   BRTHDY 20230215 · CHILINNB 230215320028529284 → 앞7 '2302153'
 *     YINXIUYAN BRTHDY 20210409 · CHILINNB 210409820031411549 → 앞7 '2104098'
 *       (뒷1자리 8 = 외국인·2000년대·여 → 인천시 CHIL_SEXDSTN 'F' 와 일치)
 *   CIS 는 residentNo 를 '230215-3******' 로 주므로 앞7자리가 그대로 대응된다.
 *   → 이름+반 매칭(동명이인 충돌 위험)보다 훨씬 정확하다.
 */
function rrn7(v: string | null | undefined): string {
  const d = String(v || '').replace(/[^0-9]/g, '')
  return d.length >= 7 ? d.slice(0, 7) : ''
}

/** CIS 아동 → 인천시 스키마로 매핑 (같은 화면을 재사용하기 위함) */
function cisToIncheon(c: CisChild, idx: number): IncheonChild {
  const back1 = (c.residentNo.split('-')[1] || '')[0] || ''
  // 주민 뒷1자리: 1·3·5·7 = 남 / 2·4·6·8 = 여 (5~8 은 외국인)
  const sex = ['1', '3', '5', '7'].includes(back1) ? 'M' : ['2', '4', '6', '8'].includes(back1) ? 'F' : ''
  return {
    CHIL_SN: -1_000_000 - idx,      // CIS 아동엔 인천시 CHIL_SN 이 없다 → 화면 key 용 음수 임시값
    CHIL_NM: c.name,
    CHIL_REAL_NM: c.name,
    CHILINNB: c.residentNo,
    BRTHDY: c.birth.replace(/-/g, ''),
    CHILD_CARE_AGE: Number(String(c.age).replace(/[^0-9]/g, '')) || 0,
    CLAS_SN: '', CLAS_NM: c.className,   // className = generalClassId ('[1][ 4.5세이상 반 ] 푸른하늘26')
    ENTRNC_DE: c.enterDate.replace(/-/g, ''),
    RETIRE_DE: c.leaveDate ? c.leaveDate.replace(/-/g, '') : null,
    STTUS: c.status === '퇴소' ? '001' : '000',
    KID_STATE_NM: c.status,
    CARETIME_CD: '', TIME_NAME: c.careTimeType, CARERIG_CD: '', CARERIG_STDDE: '',
    ADRES: null, DISP_NAME: '', FRGNR_SE: ['5', '6', '7', '8'].includes(back1) ? 'Y' : 'N',
    NRTR_CHRGE: 0, SPORT_RT: null,
    CHLDSBUS_USE_BGNDE: null, CHLDSBUS_USE_ENDDE: null,
    CHIL_SEXDSTN: sex, CHIL_SEX_NM: sex === 'M' ? '남' : sex === 'F' ? '여' : '',
    PARNTS_NM: c.guardian, PARNTS_CHIL_RELATE: c.guardianRelation, PARNTS_CTTPC: c.phone,
    // 반·보육 — CIS 는 반유형 5종을 전부 준다(인천시 목록엔 현재 반 하나뿐)
    _classGeneral: c.generalClassId, _classHoliday: c.holidayClassId,
    _classExtended: c.extendedClassId, _classNight: c.nightClassId,
    _classNightCare: c.nightCareClassId, _nightCareStart: c.nightCareClassStartDate,
    _raw: c._raw,
  }
}

/** 보육년도 선택지 — 올해 기준 위로 1년 + 아래로 4년 (반설정과 동일) */
const YEAR_OPTIONS: string[] = (() => {
  const y = new Date().getFullYear()
  return Array.from({ length: 6 }, (_, i) => String(y + 1 - i))
})()

/** 상세 팝업 탭 — 통합e 아동정보(dashboard/childcare/children)와 동일 구성 */
type DetailTab = '기본정보' | '반·보육' | '주소' | '보호자' | '가정·기타'
const DETAIL_TABS: DetailTab[] = ['기본정보', '반·보육', '주소', '보호자', '가정·기타']

/** 성별 코드 — childRegUdt.xml 의 <xf:choices> 실측 (M=남 / F=여) */
const SEX_OPTIONS: Array<{ cd: string; nm: string }> = [
  { cd: 'M', nm: '남' },
  { cd: 'F', nm: '여' },
]

/** 보호자 관계 — childRegUdt.xml 의 <xf:choices> 실측 (값=라벨 동일) */
const RELATE_OPTIONS = ['부', '모', '조부', '조모', '기타']

/** 휴대폰 앞자리 — 010 기본 */
const PHONE_PREFIXES = ['010', '011', '016', '017', '018', '019']

/** YYYYMMDD → YYYY-MM-DD (<input type="date"> 가 요구하는 형식) */
function fmtDate(v: string | null | undefined): string {
  if (!v) return ''
  const d = String(v).replace(/[^0-9]/g, '')
  if (d.length !== 8) return String(v)
  return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`
}
/** YYYY-MM-DD → YYYYMMDD (인천시 저장 형식) — 빈값은 빈값 그대로 */
function toRawDate(v: string): string {
  const d = v.replace(/[^0-9]/g, '')
  return d.length === 8 ? d : ''
}

// ── 통합e 아동정보 상세 팝업과 동일한 표시 헬퍼 ──────────────────────────────
/** YYYYMMDD/YYYY-MM-DD → YYYY.MM.DD (통합e fmtChildDate 와 동일) */
function dot(v: string | null | undefined): string {
  const raw = String(v ?? '').trim()
  if (!raw) return '-'
  const d = raw.replace(/[^0-9]/g, '')
  if (d.length === 8) return `${d.slice(0, 4)}.${d.slice(4, 6)}.${d.slice(6, 8)}`
  return raw.replace(/-/g, '.')
}
/** Y/N → 예/아니오 (통합e ynLabelChild 와 동일) */
function yn(v: unknown): string {
  const t = String(v ?? '').trim().toUpperCase()
  if (t === 'Y') return '예'
  if (t === 'N') return '아니오'
  return t || '-'
}
/** 생년월일(YYYYMMDD/…) → 만나이 'N세' (통합e calcAge 와 동일) */
function calcAge(v: string | null | undefined): string {
  const d = String(v ?? '').replace(/[^0-9]/g, '')
  if (d.length !== 8) return '-'
  const b = new Date(Number(d.slice(0, 4)), Number(d.slice(4, 6)) - 1, Number(d.slice(6, 8)))
  if (isNaN(b.getTime())) return '-'
  const t = new Date()
  let age = t.getFullYear() - b.getFullYear()
  const m = t.getMonth() - b.getMonth()
  if (m < 0 || (m === 0 && t.getDate() < b.getDate())) age -= 1
  return `${age}세`
}
/** 자동결제 설정 라벨 — 통합e 는 Y/N 을 예/아니오로, CIS 원본이 '[자동결제 미사용]' 같은 문구면 그대로 */
function autoPayLabel(v: string): string {
  const t = v.trim()
  if (!t) return '-'
  if (t.toUpperCase() === 'Y') return '사용'
  if (t.toUpperCase() === 'N') return '[자동결제 미사용]'
  return t
}

/** 라벨-값 한 줄 (통합e ChildDetailField 와 동일 룩) */
function F({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex items-baseline gap-2 py-1">
      <span className="text-[11px] text-slate-400 w-24 flex-shrink-0">{label}</span>
      <span className="text-[11px] text-slate-700">{value || '-'}</span>
    </div>
  )
}
/** 주민번호 — 마스킹 + 호버 시 전체 (통합e ChildRrnField 와 동일). 값은 인천시 CHILINNB 앞7자리. */
function RrnF({ value }: { value: string | null | undefined }) {
  const d = String(value ?? '').replace(/[^0-9]/g, '')
  const label = '주민번호'
  if (d.length < 6) return <F label={label} value="-" />
  const f6 = d.slice(0, 6)
  const b = d.slice(6)  // CHILINNB 는 앞7자리 뒤에 내부번호가 붙어 실제 뒷자리는 마스킹 표기만
  const masked = `${f6}-${b ? b[0] : ''}******`
  return (
    <div className="flex items-baseline gap-2 py-1">
      <span className="text-[11px] text-slate-400 w-24 flex-shrink-0">{label}</span>
      <span className="text-[11px] text-slate-700">{masked}</span>
    </div>
  )
}

export default function ChildStatusPage() {
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [children, setChildren] = useState<IncheonChild[]>([])
  const [keywords, setKeywords] = useState<IncheonKeyword[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [msg, setMsg] = useState('')
  const [savedAt, setSavedAt] = useState<string | null>(null)

  // 인천시 화면의 검색 조건 — 상태 / 반 / 성명
  const [schSttus, setSchSttus] = useState('')   // 기본 전체 (통합e 아동정보와 동일)
  const [schClas, setSchClas] = useState('all')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<number | null>(null)  // CHIL_SN
  const [codes, setCodes] = useState<IncheonCode[]>([])
  const [cisRaw, setCisRaw] = useState<CisChild[]>([])
  const [source, setSource] = useState<'incheon' | 'cis'>('incheon')
  const [tab, setTab] = useState<DetailTab>('기본정보')          // 상세 팝업 탭
  const [editMode, setEditMode] = useState(false)               // 상세 팝업 편집 모드(인천시 소스만)
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set())  // 명단 체크박스

  // 편집 — CHIL_SN 별로 바뀐 필드만 모아둔다(저장 시 그 아동만 PUT)
  const [edits, setEdits] = useState<Record<number, Partial<IncheonChild>>>({})
  const [saving, setSaving] = useState(false)
  const dirtyCount = Object.keys(edits).length
  // 신규등록 — 아직 저장 안 한 draft 아동(음수 CHIL_SN). 저장 시 childAdds 로 PUT.
  const [draftChild, setDraftChild] = useState<IncheonChild | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/incheon/children?year=${year}`)
      const j = await res.json()
      if (j.success) {
        setChildren((j.children || []) as IncheonChild[])
        setKeywords((j.keywords || []) as IncheonKeyword[])
        setCodes((j.codes || []) as IncheonCode[])
        setSavedAt(j.savedAt || null)
      } else {
        setMsg(j.error || '조회 실패')
      }
    } catch {
      setMsg('통합e 서버에 연결할 수 없습니다.')
    } finally {
      setLoading(false)
    }
  }, [year])

  useEffect(() => { load() }, [load])

  // 보육통합(CIS) 아동 — 통합e 가 CIS 에서 수집해둔 것. 인천시와 별개 소스라 항상 같이 읽어
  // 매칭(인천시 CHIL_SN 연결)까지 계산한다.
  useEffect(() => {
    fetch('/api/sync/children', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(j => { if (j?.children) setCisRaw(j.children as CisChild[]) })
      .catch(() => { /* CIS 미수집이면 그냥 빈 목록 */ })
  }, [])

  const handleSync = async () => {
    if (dirtyCount > 0 && !confirm(`저장하지 않은 수정 ${dirtyCount}건이 있습니다.

인천시에서 가져오면 인천시 값으로 덮어써져 수정 내용이 사라집니다.
계속할까요?`)) return
    setSyncing(true); setMsg('인천시 조회 중… (로컬 에이전트 경유, 수십 초 걸립니다)')
    try {
      const res = await fetch('/api/incheon/children', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year }),
      })
      const j = await res.json()
      if (j.success) {
        setMsg(`✅ 아동 ${j.childCount}명 · 반 ${j.clasCount}개 · 키워드 ${j.keywordCount}건${j.codeCount ? ` · 코드 ${j.codeCount}건` : ''} 가져왔습니다.`)
        setEdits({})
        await load()
      } else {
        setMsg(`❌ ${j.error || '가져오기 실패'}`)
      }
    } catch {
      setMsg('❌ 통합e 서버에 연결할 수 없습니다.')
    } finally {
      setSyncing(false)
    }
  }

  /** 보육통합(CIS) 아동을 인천시 스키마로 변환한 목록 */
  const cisChildren = useMemo(() => cisRaw.map(cisToIncheon), [cisRaw])

  /** 지금 화면에 보여줄 목록 — 소스 토글에 따라 전환 */
  const rows = source === 'cis' ? cisChildren : children
  const isCis = source === 'cis'

  /**
   * CIS ↔ 인천시 매칭 — 주민번호 앞7자리(CHILINNB 앞7 = CIS residentNo 앞7) 기준.
   * 정산 자동화는 인천시 CHIL_SN 으로 써야 하므로, CIS 아동이 인천시 어느 아동인지 알아야 한다.
   */
  const incheonByRrn = useMemo(() => {
    const m = new Map<string, IncheonChild>()
    for (const c of children) {
      const k = rrn7(c.CHILINNB)
      if (k) m.set(k, c)
    }
    return m
  }, [children])

  const matchStats = useMemo(() => {
    if (cisChildren.length === 0 || children.length === 0) return null
    let matched = 0
    for (const c of cisChildren) {
      const k = rrn7(c.CHILINNB)
      if (k && incheonByRrn.has(k)) matched++
    }
    return { matched, cis: cisChildren.length, incheon: children.length }
  }, [cisChildren, children, incheonByRrn])

  /**
   * 반유형별 반명 — 통합e 아동정보와 동일하게 값이 없으면 '없음'.
   * CIS 는 5종을 전부 주고(general/holiday/extended/night/nightCare), 인천시 목록은
   * 현재 반(CLAS_NM) 하나뿐이라 반(일반)에만 넣는다.
   */
  const classOf = (c: IncheonChild, kind: 'general' | 'holiday' | 'extended' | 'night' | 'nightCare'): string => {
    const v = {
      general: c._classGeneral ?? (source === 'incheon' ? c.CLAS_NM : ''),
      holiday: c._classHoliday,
      extended: c._classExtended,
      night: c._classNight,
      nightCare: c._classNightCare,
    }[kind]
    return v && String(v).trim() !== '' ? String(v) : '없음'
  }

  /** 이 아동에 대응하는 인천시 아동(있으면) */
  const incheonMatchOf = (c: IncheonChild): IncheonChild | null => {
    const k = rrn7(c.CHILINNB)
    return k ? (incheonByRrn.get(k) ?? null) : null
  }

  // 반 목록 — 아동 데이터에서 도출(반설정 화면과 별개 호출 없이)
  const clasOptions = useMemo(() => {
    const m = new Map<string, string>()
    rows.forEach(c => { if (c.CLAS_NM) m.set(String(c.CLAS_SN || c.CLAS_NM), c.CLAS_NM) })
    return Array.from(m, ([sn, nm]) => ({ sn, nm })).sort((a, b) => a.nm.localeCompare(b.nm, 'ko'))
  }, [rows])

  const filtered = useMemo(() => rows.filter(c => {
    if (schSttus && c.STTUS !== schSttus) return false
    if (schClas !== 'all' && String(c.CLAS_SN || c.CLAS_NM) !== schClas) return false
    // 검색 대상 — 통합e 아동정보와 동일하게 이름·반·보호자
    if (search) {
      const hay = `${c.CHIL_NM || ''} ${c.CHIL_REAL_NM || ''} ${c.CLAS_NM || ''} ${c.PARNTS_NM || ''}`
      if (!hay.includes(search)) return false
    }
    return true
  }), [rows, schSttus, schClas, search])

  /**
   * 보육시간 코드 후보 — 인천시 공통코드에서 찾는다.
   * 어느 CD_GRP 가 보육시간인지는 실 데이터의 CARETIME_CD 가 그 그룹 CD 에 들어있는지로 판정
   * (그룹명을 추측하지 않기 위함). 실제 쓰이는 코드를 과반 이상 설명하는 그룹만 채택.
   */
  const careTimeCodes = useMemo(() => {
    if (codes.length === 0) return []
    const used = new Set(children.map(c => c.CARETIME_CD).filter(Boolean))
    if (used.size === 0) return []
    const byGrp = new Map<string, IncheonCode[]>()
    for (const c of codes) {
      if (!byGrp.has(c.CD_GRP)) byGrp.set(c.CD_GRP, [])
      byGrp.get(c.CD_GRP)!.push(c)
    }
    let best: IncheonCode[] = []; let bestHit = 0
    for (const list of byGrp.values()) {
      const cds = new Set(list.map(c => c.CD))
      const hit = Array.from(used).filter(u => cds.has(u)).length
      if (hit > bestHit) { bestHit = hit; best = list }
    }
    return bestHit >= Math.ceil(used.size / 2) ? best : []
  }, [codes, children])

  const editField = (sn: number, field: keyof IncheonChild, value: string) => {
    // 보육통합(CIS)은 원본이 CIS 라 통합e 에서 고쳐도 반영되지 않는다 → 편집 자체를 막는다
    if (source === 'cis') return
    setEdits(prev => {
      const orig = children.find(c => c.CHIL_SN === sn)
      const nextRow = { ...(prev[sn] || {}), [field]: value }
      // 원본과 같아지면 dirty 해제 — 되돌린 걸 저장 대상으로 남기지 않는다
      const changed = (Object.keys(nextRow) as Array<keyof IncheonChild>)
        .some(k => String(nextRow[k] ?? '') !== String(orig?.[k] ?? ''))
      const next = { ...prev }
      if (changed) next[sn] = nextRow
      else delete next[sn]
      return next
    })
  }
  const vOf = (c: IncheonChild, field: keyof IncheonChild): string => {
    const e = edits[c.CHIL_SN]
    if (e && field in e) return String(e[field] ?? '')
    return String(c[field] ?? '')
  }

  /** 보육통합 전용 필드(_raw 안에 있는 출생순위/보육료지원자격/가정유형 등) 편집 */
  const editRaw = (sn: number, key: string, value: string) => {
    if (source === 'cis') return
    setEdits(prev => {
      const row = prev[sn] || {}
      const nextRaw = { ...((row._raw as Record<string, unknown>) || {}), [key]: value }
      return { ...prev, [sn]: { ...row, _raw: nextRaw } }
    })
  }
  /** 반 선택 — CLAS_SN + CLAS_NM 을 함께 채운다(목록/헤더 표시가 CLAS_NM 을 쓰기 때문) */
  const editClass = (sn: number, clasSn: string) => {
    const nm = clasOptions.find(o => o.sn === clasSn)?.nm || ''
    editField(sn, 'CLAS_SN', clasSn)
    editField(sn, 'CLAS_NM', nm)
  }

  /** 수정 저장 — 통합e 저장분만 갱신(인천시 원본은 안 바뀜) */
  const handleSave = async () => {
    if (dirtyCount === 0) return
    setSaving(true); setMsg('')
    try {
      const res = await fetch('/api/incheon/children', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year,
          childEdits: Object.entries(edits).map(([sn, patch]) => ({ CHIL_SN: Number(sn), ...patch })),
        }),
      })
      const j = await res.json()
      if (j.success) {
        setMsg(`💾 ${j.updated}명 수정 저장 (통합e 에만 저장 — 인천시 원본은 그대로입니다)`)
        setEdits({})
        await load()
      } else { setMsg(`❌ ${j.error || '저장 실패'}`) }
    } catch { setMsg('❌ 통합e 서버에 연결할 수 없습니다.') }
    finally { setSaving(false) }
  }

  /** 삭제 — 통합e 에서 추가한 아동만(인천시에서 온 아동은 서버가 거부) */
  const handleDelete = async () => {
    if (!cur) return
    if (!cur._local) {
      setMsg('❌ 인천시에서 가져온 아동은 삭제할 수 없습니다 — 지워도 인천시엔 남아있어 다시 가져오면 되살아납니다. 퇴소/졸업이면 [상태]를 바꿔주세요.')
      return
    }
    if (!confirm(`${cur.CHIL_NM} 아동을 삭제합니다. 계속할까요?`)) return
    setSaving(true)
    try {
      const res = await fetch('/api/incheon/children', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year, childDeletes: [cur.CHIL_SN] }),
      })
      const j = await res.json()
      if (j.success) { setMsg(`🗑 ${j.deleted}명 삭제`); setSelected(null); await load() }
      else { setMsg(`❌ ${j.error || '삭제 실패'}`) }
    } catch { setMsg('❌ 통합e 서버에 연결할 수 없습니다.') }
    finally { setSaving(false) }
  }

  /**
   * 신규등록 — 빈 draft 아동을 만들고 상세 팝업을 편집 모드로 연다.
   * 보육통합(CIS)에 있는 필드를 그대로 입력할 수 있게 5탭 편집폼을 그대로 재사용한다.
   * 저장 위치는 통합e 저장분(_local) — 인천시 원본 쓰기 API 는 아직 미확보라 인천시엔 안 들어간다.
   */
  const handleNewChild = () => {
    if (isCis) setSource('incheon')   // 신규등록은 통합e 저장분에만 — 편집 가능한 인천시 소스로 전환
    const minSn = Math.min(0, ...children.map(c => Number(c.CHIL_SN) || 0))
    const draft: IncheonChild = {
      CHIL_SN: minSn - 1,
      CHIL_NM: '', CHIL_REAL_NM: '',
      CHILINNB: '', BRTHDY: '', CHILD_CARE_AGE: 0,
      CLAS_SN: '', CLAS_NM: '',
      ENTRNC_DE: '', RETIRE_DE: null,
      STTUS: '000', KID_STATE_NM: '현원',
      CARETIME_CD: '', TIME_NAME: '', CARERIG_CD: '', CARERIG_STDDE: '',
      ADRES: null, DISP_NAME: '', FRGNR_SE: 'N',
      NRTR_CHRGE: 0, SPORT_RT: null,
      CHLDSBUS_USE_BGNDE: null, CHLDSBUS_USE_ENDDE: null,
      CHIL_SEXDSTN: '', CHIL_SEX_NM: '',
      PARNTS_NM: '', PARNTS_CHIL_RELATE: '', PARNTS_CTTPC: '', PARNTS_MOBLPHON: '', PARNTS_RM: '',
      _raw: {}, _local: true,
    }
    setDraftChild(draft)
    setSelected(draft.CHIL_SN)
    setEditMode(true)
    setTab('기본정보')
  }

  /** 신규등록 저장 — draft + 편집분을 합쳐 childAdds 로 PUT */
  const handleSaveNew = async () => {
    if (!draftChild) return
    const patch = edits[draftChild.CHIL_SN] || {}
    const merged: Record<string, unknown> = { ...draftChild, ...patch }
    merged._raw = { ...(draftChild._raw || {}), ...((patch._raw as Record<string, unknown>) || {}) }
    if (!String(merged.CHIL_REAL_NM || merged.CHIL_NM || '').trim()) {
      setMsg('❌ 아동 이름을 입력해 주세요.')
      return
    }
    setSaving(true); setMsg('')
    try {
      const res = await fetch('/api/incheon/children', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year, childAdds: [merged] }),
      })
      const j = await res.json()
      if (j.success) {
        setMsg(`💾 ${j.added || 1}명 신규등록 (통합e 에만 저장 — 인천시 원본은 그대로입니다)`)
        setEdits(prev => { const n = { ...prev }; delete n[draftChild.CHIL_SN]; return n })
        setDraftChild(null); setSelected(null); setEditMode(false)
        await load()
      } else { setMsg(`❌ ${j.error || '신규등록 실패'}`) }
    } catch { setMsg('❌ 통합e 서버에 연결할 수 없습니다.') }
    finally { setSaving(false) }
  }

  /** 팝업 닫기 — draft 였으면 저장 안 한 신규 아동을 폐기한다 */
  const closePopup = () => {
    if (draftChild && selected === draftChild.CHIL_SN) {
      setEdits(prev => { const n = { ...prev }; delete n[draftChild.CHIL_SN]; return n })
      setDraftChild(null)
    }
    setSelected(null); setEditMode(false)
  }

  const cur = rows.find(c => c.CHIL_SN === selected)
    || (draftChild && draftChild.CHIL_SN === selected ? draftChild : null)
  const isDraft = !!draftChild && cur?.CHIL_SN === draftChild.CHIL_SN
  const curKeywords = keywords.filter(k => Number(k.CHIL_SN) === selected).map(k => k.KEYWORD_NM)
  /** CIS 원본 필드 읽기 — 통합e 상세 팝업의 get(k) 과 동일. 보육통합 소스일 때만 _raw 가 있다.
   *  인천시 소스는 _raw 가 없어 빈 문자열 → 통합e 전용 필드(출생순위/자동결제 등)는 '-' 로 표시. */
  const g = (k: string) => String((cur?._raw ?? {})[k] ?? '').trim()
  /** 편집 중이면 edits._raw 값 우선, 아니면 원본 _raw — 편집폼 입력칸의 value 용 */
  const rg = (k: string): string => {
    const e = cur ? (edits[cur.CHIL_SN]?._raw as Record<string, unknown> | undefined) : undefined
    if (e && k in e) return String(e[k] ?? '')
    return g(k)
  }

  /** 탭별 건수 — 통합e 아동정보와 동일하게 탭에 숫자를 붙인다 */
  const tabCounts = {
    '전체': rows.length,
    '000': rows.filter(c => c.STTUS === '000').length,
    '001': rows.filter(c => c.STTUS === '001').length,
    '999': rows.filter(c => c.STTUS === '999').length,
  } as Record<string, number>

  const resetFilter = () => {
    setSchSttus(''); setSchClas('all'); setSearch(''); setSearchInput('')
  }

  /** 엑셀 — 화면에 보이는 명단 그대로 CSV 로 (통합e 아동정보의 [엑셀]과 동일 역할) */
  const handleExcel = () => {
    const head = ['No', '이름', '성별', '보육나이', '생년월일', '반', '보육시간', '입소일', '퇴소일', '상태', '보호자(관계)', '연락처']
    const body = filtered.map((c, i) => [
      i + 1, c.CHIL_REAL_NM || c.CHIL_NM, c.CHIL_SEX_NM || '', c.CHILD_CARE_AGE,
      fmtDate(c.BRTHDY), c.CLAS_NM || '', c.TIME_NAME || '',
      fmtDate(c.ENTRNC_DE), fmtDate(c.RETIRE_DE), c.KID_STATE_NM || '',
      `${c.PARNTS_NM || ''}${c.PARNTS_CHIL_RELATE ? `(${c.PARNTS_CHIL_RELATE})` : ''}`,
      c.PARNTS_MOBLPHON || c.PARNTS_CTTPC || '',
    ])
    const csv = [head, ...body].map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n')
    // BOM — 엑셀이 UTF-8 한글을 깨뜨리지 않게
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `아동정보_${source === 'cis' ? '보육통합' : '인천시'}_${year}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div className="p-4 space-y-4">
      {/* 제목 */}
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-slate-800">
            아동정보
            {source === 'incheon' && (
              <label className="ml-2 text-[11px] font-normal text-slate-500 inline-flex items-center gap-1 align-middle">
                보육년도
                <select
                  value={year}
                  onChange={e => { setYear(e.target.value); setEdits({}); setSelected(null); setSelectedRows(new Set()) }}
                  className="border border-slate-300 rounded px-1.5 py-0.5 text-[11px] text-slate-600"
                >
                  {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}년</option>)}
                </select>
              </label>
            )}
          </h1>
          <p className="text-[11px] text-slate-500 mt-0.5">
            어린이집 아동 현황을 조회합니다.
            {source === 'cis' && <span className="ml-1 text-slate-400">(보육통합은 현재 명단 — 연도 구분 없음)</span>}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {savedAt && <span className="text-xs text-slate-400 mr-1">최근조회일시: {new Date(savedAt).toLocaleString('ko-KR')}</span>}
          <button onClick={handleExcel} className="px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100">
            📄 엑셀
          </button>
          <button onClick={() => window.print()} className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50">
            🖨 인쇄
          </button>
          <button
            onClick={handleNewChild}
            className="px-3 py-1.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg whitespace-nowrap"
          >
            ＋ 신규등록
          </button>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 rounded-lg whitespace-nowrap"
          >
            {syncing ? '가져오는 중…' : '📥 인천시에서 가져오기'}
          </button>
        </div>
      </div>

      {msg && <div className="px-4 py-2 text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-600">{msg}</div>}

      {/* 매칭 현황 — 정산 자동화는 인천시 CHIL_SN 으로 써야 하므로 CIS 아동이 인천시와
          얼마나 연결되는지가 핵심 지표다. 매칭 키 = 주민번호 앞7자리. */}
      {matchStats && (
        <div className="px-4 py-2 text-xs rounded-lg border border-sky-200 bg-sky-50/60 text-slate-600 flex items-center gap-2 flex-wrap">
          <span className="font-medium text-slate-700">🔗 소스 매칭</span>
          <span>보육통합 {matchStats.cis}명 · 인천시 {matchStats.incheon}명</span>
          <span className={matchStats.matched === matchStats.incheon ? 'text-emerald-600 font-medium' : 'text-amber-600 font-medium'}>
            연결 {matchStats.matched}명
          </span>
          {matchStats.matched < matchStats.incheon && (
            <span className="text-amber-600">— 인천시 {matchStats.incheon - matchStats.matched}명이 보육통합에서 안 찾아집니다</span>
          )}
          <span className="ml-auto text-slate-400">주민번호 앞7자리 기준 (인천시 아동고유번호 = 주민 앞7 + 내부번호)</span>
        </div>
      )}

      {/* 탭 + 검색 */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="flex items-center justify-between px-5 pt-4 pb-0 border-b border-slate-200 gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            {/* 상태 탭 — 통합e 아동정보와 동일 (전체/현원/퇴소/졸업) */}
            {([['', '전체'], ['000', '현원'], ['001', '퇴소'], ['999', '졸업']] as const).map(([v, label]) => (
              <button
                key={v || 'all'}
                onClick={() => { setSchSttus(v); setSelectedRows(new Set()) }}
                className="px-5 py-2.5 text-[11px] font-medium transition-colors"
                style={
                  schSttus === v
                    ? { background: '#1a3a6b', color: '#fff', borderRadius: '7px' }
                    : { background: '#fff', border: '1px solid #d1d5db', borderRadius: '7px', color: '#64748b' }
                }
              >
                {label}
                {!loading && (
                  <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${schSttus === v ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                    {tabCounts[v || '전체']}
                  </span>
                )}
              </button>
            ))}

            {/* 소스 토글 — 보육통합(CIS)은 통합e 가 이미 수집해둔 원본, 인천시는 회계 시스템.
                카운트는 현원/퇴소 로 나눠 표시(예: 32/20 = 현원 32 · 퇴소 20). */}
            <div className="flex items-center rounded-[7px] border border-slate-300 overflow-hidden ml-2">
              {([['incheon', '인천시'], ['cis', '보육통합']] as const).map(([v, label]) => {
                const list = v === 'cis' ? cisChildren : children
                const cur = list.filter(c => c.STTUS === '000').length
                const out = list.length - cur   // 현원 아닌 나머지(퇴소+졸업)
                return (
                  <button
                    key={v}
                    onClick={() => { setSource(v); setSelected(null); setSelectedRows(new Set()) }}
                    className={`px-3 py-2 text-[11px] font-bold ${source === v ? 'bg-teal-500 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
                    title="현원 / 퇴소"
                  >
                    {label} {cur}/{out}
                  </button>
                )
              })}
            </div>
          </div>

          {/* 초기화 + 검색 — 엔터/버튼 방식(실시간 검색 금지, 프로젝트 UX 규칙) */}
          <div className="flex items-center gap-1.5 mb-2">
            <button onClick={resetFilter} className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50">
              초기화
            </button>
            <select value={schClas} onChange={e => setSchClas(e.target.value)} className="border border-slate-300 rounded-lg px-2 py-1.5 text-xs text-slate-600">
              <option value="all">전체 반</option>
              {clasOptions.map(o => <option key={o.sn} value={o.sn}>{o.nm}</option>)}
            </select>
            <form onSubmit={e => { e.preventDefault(); setSearch(searchInput) }} className="flex items-center gap-1.5">
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[11px]">🔍</span>
                <input
                  type="text" placeholder="이름, 반, 보호자 검색"
                  value={searchInput} onChange={e => setSearchInput(e.target.value)}
                  className="pl-7 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg w-52 focus:outline-none focus:border-blue-400"
                />
              </div>
              <button type="submit" className="px-3 py-1.5 text-xs font-bold text-white rounded-lg" style={{ background: '#1A73E8' }}>조회</button>
            </form>
          </div>
        </div>

        {/* 테이블 */}
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-center px-3 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={filtered.length > 0 && filtered.every(c => selectedRows.has(c.CHIL_SN))}
                    onChange={e => setSelectedRows(e.target.checked ? new Set(filtered.map(c => c.CHIL_SN)) : new Set())}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-500 w-12">No</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-500">이름</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-500">성별</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-500">보육나이</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-500">생년월일</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-500">반</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-500">보육시간</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-500">입소일</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-500">퇴소일</th>
                {schSttus === '' && <th className="text-center px-4 py-3 text-[11px] font-semibold text-slate-500">상태</th>}
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-500">보호자(관계)</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-500">연락처</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={schSttus === '' ? 13 : 12} className="py-12 text-center text-[11px] text-slate-400">데이터를 불러오는 중...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={schSttus === '' ? 13 : 12} className="py-12 text-center text-[11px] text-slate-400">
                  {rows.length === 0
                    ? (isCis
                        ? '보육통합에서 수집된 아동이 없습니다. 통합e 아동정보에서 [CIS 갱신]을 먼저 실행해주세요.'
                        : '저장된 아동이 없습니다. [📥 인천시에서 가져오기]를 눌러주세요.')
                    : '조회된 아동이 없습니다.'}
                </td></tr>
              ) : filtered.map((c, idx) => {
                const dirty = !!edits[c.CHIL_SN]
                return (
                  <tr key={c.CHIL_SN} className={dirty ? 'bg-amber-50' : 'hover:bg-slate-50/60'}>
                    <td className="text-center px-3 py-3">
                      <input
                        type="checkbox"
                        checked={selectedRows.has(c.CHIL_SN)}
                        onChange={() => setSelectedRows(prev => {
                          const n = new Set(prev)
                          if (n.has(c.CHIL_SN)) n.delete(c.CHIL_SN); else n.add(c.CHIL_SN)
                          return n
                        })}
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </td>
                    <td className="px-5 py-3 text-slate-400 text-[11px]">{idx + 1}</td>
                    {/* 이름 클릭 → 상세 팝업 */}
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => { setSelected(c.CHIL_SN); setTab('기본정보') }}
                        className="font-semibold text-slate-800 hover:text-blue-600"
                      >
                        {c.CHIL_NM}
                      </button>
                      {dirty && <span className="ml-1 text-amber-600" title="저장 안 된 수정 있음">✏️</span>}
                      {c._local && <span className="ml-1 px-1 text-[9px] bg-violet-100 text-violet-700 rounded" title="통합e 에서 추가한 아동">e</span>}
                    </td>
                    <td className="px-4 py-3">
                      {c.CHIL_SEX_NM
                        ? <span className={`px-1.5 py-0.5 rounded text-[11px] font-medium ${c.CHIL_SEXDSTN === 'M' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'}`}>{c.CHIL_SEX_NM}</span>
                        : <span className="text-slate-300 text-[11px]">-</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{c.CHILD_CARE_AGE}</td>
                    <td className="px-4 py-3 text-slate-600">{fmtDate(c.BRTHDY)}</td>
                    <td className="px-4 py-3">
                      {c.CLAS_NM
                        ? <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[11px] text-slate-600">{c.CLAS_NM}</span>
                        : <span className="text-slate-300 text-[11px]">-</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-[11px]">{c.TIME_NAME || '-'}</td>
                    <td className="px-4 py-3 text-sky-600">{fmtDate(c.ENTRNC_DE) || '-'}</td>
                    <td className="px-4 py-3 text-pink-600">{fmtDate(c.RETIRE_DE) || '-'}</td>
                    {schSttus === '' && (
                      <td className="px-4 py-3 text-center">
                        <span className={`px-1.5 py-0.5 rounded text-[11px] font-medium ${c.STTUS === '000' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                          {c.KID_STATE_NM || '-'}
                        </span>
                      </td>
                    )}
                    <td className="px-4 py-3 text-slate-600 text-[11px]">
                      {c.PARNTS_NM || <span className="text-slate-300">-</span>}
                      {c.PARNTS_CHIL_RELATE && <span className="text-slate-400"> ({c.PARNTS_CHIL_RELATE})</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-[11px]">{c.PARNTS_MOBLPHON || c.PARNTS_CTTPC || <span className="text-slate-300">-</span>}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {!loading && (
          <div className="px-5 py-3 border-t border-slate-200 text-[11px] text-slate-500 flex items-center gap-3 flex-wrap">
            <span>총 {filtered.length}명</span>
            {selectedRows.size > 0 && <span className="text-blue-600">선택 {selectedRows.size}명</span>}
            {dirtyCount > 0 && (
              <>
                <span className="text-amber-600 font-medium">✏️ 미저장 {dirtyCount}명</span>
                <button onClick={handleSave} disabled={saving} className="px-3 py-1 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 rounded">
                  {saving ? '저장 중…' : `💾 수정 저장 (${dirtyCount})`}
                </button>
              </>
            )}
            <span className="ml-auto text-slate-400">이름을 클릭하면 상세 정보가 열립니다</span>
          </div>
        )}
      </div>

      {/* 상세 팝업 — 통합e 아동정보(dashboard/childcare/children) 상세 팝업을 그대로.
          기본은 통합e 와 동일한 표시형(라벨-값). 인천시 소스에서 [수정] 을 누르면 편집 모드로
          전환돼 입력 위젯(달력/드롭다운/전화)이 나온다(보육통합 소스는 읽기 전용). */}
      {cur && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={closePopup}>
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-[820px] max-h-[90vh] overflow-hidden flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* 헤더 — 통합e 와 동일 문구 */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-start gap-2">
              <div>
                <div className="text-lg font-bold text-slate-800">
                  {vOf(cur, 'CHIL_REAL_NM') || vOf(cur, 'CHIL_NM') || (isDraft ? '신규 아동 등록' : '')}
                  {!isDraft && (
                    <span className="ml-2 text-xs font-normal text-slate-500">
                      ({cur.KID_STATE_NM} · {cur.CHILD_CARE_AGE}세 · {cur.CLAS_NM})
                    </span>
                  )}
                  {cur._local && <span className="ml-1.5 px-1 py-0.5 text-[9px] bg-violet-100 text-violet-700 rounded" title="통합e 에서 추가한 아동 — 인천시에는 없습니다">통합e</span>}
                  {isCis && (() => {
                    const m = incheonMatchOf(cur)
                    return m
                      ? <span className="ml-1.5 px-1 py-0.5 text-[9px] bg-emerald-100 text-emerald-700 rounded" title={`인천시 CHIL_SN ${m.CHIL_SN} · ${m.CLAS_NM}`}>🔗 인천시 연결됨</span>
                      : <span className="ml-1.5 px-1 py-0.5 text-[9px] bg-slate-100 text-slate-500 rounded" title="인천시 명단에 같은 주민번호 앞7자리 아동이 없습니다">인천시 없음</span>
                  })()}
                  {editMode && dirtyCount > 0 && <span className="ml-1.5 text-[10px] text-amber-600 font-medium">✏️ 수정됨 — 저장 안 됨</span>}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  {isDraft
                    ? '신규 아동 등록 — 보육통합 필드를 입력한 뒤 [등록]을 누르세요 (통합e 저장분에만 저장)'
                    : `아동 세부 정보 (CIS E0003 원본)${isCis ? ' — 읽기 전용' : ''}`}
                </div>
              </div>

              {/* 우측 상단 — 인천시 소스에서만 [수정]/[삭제]. 편집 모드면 [저장]/[취소] */}
              <div className="ml-auto flex items-center gap-1.5">
                {!isCis && (editMode ? (
                  <>
                    <button
                      onClick={async () => { if (isDraft) { await handleSaveNew() } else { await handleSave(); setEditMode(false) } }}
                      disabled={saving}
                      className="px-3 py-1.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 rounded-lg"
                    >
                      {saving ? '저장 중…' : isDraft ? '등록' : dirtyCount > 0 ? `저장 (${dirtyCount})` : '저장'}
                    </button>
                    <button
                      onClick={() => { if (isDraft) { closePopup() } else { setEdits({}); setEditMode(false) } }}
                      className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
                    >
                      취소
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setEditMode(true)}
                      className="px-3 py-1.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg"
                    >
                      수정
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={saving}
                      className="px-3 py-1.5 text-xs font-bold text-white bg-rose-500 hover:bg-rose-600 disabled:bg-slate-300 rounded-lg"
                    >
                      삭제
                    </button>
                  </>
                ))}
                <button onClick={closePopup} className="ml-1 px-2 text-slate-400 hover:text-slate-700 text-xl leading-none">✕</button>
              </div>
            </div>

            {/* 탭 — 통합e 와 동일 (기본정보/반·보육/주소/보호자/가정·기타) */}
            <div className="px-6 border-b border-slate-200 flex items-center gap-1">
              {DETAIL_TABS.map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-4 py-2.5 text-[11px] font-medium border-b-2 -mb-px ${tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* 탭 본문 */}
            <div className="px-6 py-5 overflow-y-auto flex-1">
              {/* ── 기본정보 ── 통합e 와 동일 필드/라벨/배치 ── */}
              {tab === '기본정보' && (
                editMode ? (
                  // 편집 모드 — 인천시 소스에서만. 입력 위젯으로.
                  <table className="w-full text-[11px] border-collapse">
                    <colgroup><col className="w-[110px]" /><col /><col className="w-[110px]" /><col /></colgroup>
                    <tbody>
                      <tr className="border-b border-slate-100">
                        <Th>아동실명</Th><Td><input className={inputCls} value={vOf(cur, 'CHIL_REAL_NM') || vOf(cur, 'CHIL_NM')} onChange={e => editField(cur.CHIL_SN, 'CHIL_REAL_NM', e.target.value)} /></Td>
                        <Th>아동별칭</Th><Td><input className={inputCls} value={vOf(cur, 'CHIL_NM')} onChange={e => editField(cur.CHIL_SN, 'CHIL_NM', e.target.value)} /></Td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <Th>생년월일</Th><Td><input type="date" className={inputCls} value={fmtDate(vOf(cur, 'BRTHDY'))} onChange={e => editField(cur.CHIL_SN, 'BRTHDY', toRawDate(e.target.value))} /></Td>
                        <Th>보육나이</Th><Td>
                          <select className={inputCls} value={vOf(cur, 'CHILD_CARE_AGE')} onChange={e => editField(cur.CHIL_SN, 'CHILD_CARE_AGE', e.target.value)}>
                            <option value="">선택</option>
                            {[0, 1, 2, 3, 4, 5].map(a => <option key={a} value={a}>{a}세</option>)}
                            {vOf(cur, 'CHILD_CARE_AGE') && !['0', '1', '2', '3', '4', '5'].includes(vOf(cur, 'CHILD_CARE_AGE')) && (
                              <option value={vOf(cur, 'CHILD_CARE_AGE')}>{vOf(cur, 'CHILD_CARE_AGE')}세</option>
                            )}
                          </select>
                        </Td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <Th>성별</Th><Td>
                          <select className={inputCls} value={vOf(cur, 'CHIL_SEXDSTN')} onChange={e => editField(cur.CHIL_SN, 'CHIL_SEXDSTN', e.target.value)}>
                            <option value="">선택</option>
                            {SEX_OPTIONS.map(o => <option key={o.cd} value={o.cd}>{o.nm}</option>)}
                          </select>
                        </Td>
                        <Th>외국인</Th><Td>
                          <select className={inputCls} value={vOf(cur, 'FRGNR_SE') || 'N'} onChange={e => editField(cur.CHIL_SN, 'FRGNR_SE', e.target.value)}>
                            <option value="N">아니오</option><option value="Y">예</option>
                          </select>
                        </Td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <Th>입소일</Th><Td><input type="date" className={inputCls} value={fmtDate(vOf(cur, 'ENTRNC_DE'))} onChange={e => editField(cur.CHIL_SN, 'ENTRNC_DE', toRawDate(e.target.value))} /></Td>
                        <Th>상태</Th><Td>
                          <select className={`${inputCls} ${vOf(cur, 'STTUS') === '000' ? 'text-emerald-600' : 'text-pink-600'}`} value={vOf(cur, 'STTUS')} onChange={e => editField(cur.CHIL_SN, 'STTUS', e.target.value)}>
                            {CHILD_STATUS.map(st => <option key={st.cd} value={st.cd}>{st.nm}</option>)}
                          </select>
                        </Td>
                      </tr>
                      {vOf(cur, 'STTUS') !== '000' && (
                        <tr className="border-b border-slate-100">
                          <Th>{vOf(cur, 'STTUS') === '999' ? '졸업일' : '퇴소일'}</Th><Td colSpan={3}>
                            <input type="date" className={`${inputCls} !w-1/2`} value={fmtDate(vOf(cur, 'RETIRE_DE'))} onChange={e => editField(cur.CHIL_SN, 'RETIRE_DE', toRawDate(e.target.value))} />
                          </Td>
                        </tr>
                      )}
                      <tr className="border-b border-slate-100">
                        <Th>아동고유번호</Th><Td><input className={`${inputCls} font-mono`} value={vOf(cur, 'CHILINNB')} onChange={e => editField(cur.CHIL_SN, 'CHILINNB', e.target.value)} /></Td>
                        <Th>주민번호 구분</Th><Td><input className={inputCls} value={rg('residentIdType')} placeholder="주민등록번호" onChange={e => editRaw(cur.CHIL_SN, 'residentIdType', e.target.value)} /></Td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <Th>출생순위</Th><Td><input className={inputCls} value={rg('birthOrder')} onChange={e => editRaw(cur.CHIL_SN, 'birthOrder', e.target.value)} /></Td>
                        <Th>출생순위 확정</Th><Td>
                          <select className={inputCls} value={rg('birthOrderConfirmedYn')} onChange={e => editRaw(cur.CHIL_SN, 'birthOrderConfirmedYn', e.target.value)}>
                            <option value="">선택</option><option value="Y">예</option><option value="N">아니오</option>
                          </select>
                        </Td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <Th>보육료 지원자격</Th><Td><input className={inputCls} value={rg('childcareEligibilityType')} onChange={e => editRaw(cur.CHIL_SN, 'childcareEligibilityType', e.target.value)} /></Td>
                        <Th>서비스 시작일</Th><Td><input type="date" className={inputCls} value={fmtDate(rg('serviceStartDate'))} onChange={e => editRaw(cur.CHIL_SN, 'serviceStartDate', toRawDate(e.target.value))} /></Td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <Th>지원확정일</Th><Td><input type="date" className={inputCls} value={fmtDate(vOf(cur, 'SPORT_DCSN_DE'))} onChange={e => editField(cur.CHIL_SN, 'SPORT_DCSN_DE', toRawDate(e.target.value))} /></Td>
                        <Th>상해보험 가입</Th><Td><input className={inputCls} value={rg('insuranceJoinStatus')} onChange={e => editRaw(cur.CHIL_SN, 'insuranceJoinStatus', e.target.value)} /></Td>
                      </tr>
                      <tr>
                        <Th>예외급여 대상</Th><Td>
                          <select className={inputCls} value={rg('exBenefitYn')} onChange={e => editRaw(cur.CHIL_SN, 'exBenefitYn', e.target.value)}>
                            <option value="">선택</option><option value="Y">예</option><option value="N">아니오</option>
                          </select>
                        </Td>
                        <Th>자동결제 설정</Th><Td>
                          <select className={inputCls} value={rg('autoPaymentEnabledYn')} onChange={e => editRaw(cur.CHIL_SN, 'autoPaymentEnabledYn', e.target.value)}>
                            <option value="">선택</option><option value="Y">사용</option><option value="N">미사용</option>
                          </select>
                        </Td>
                      </tr>
                    </tbody>
                  </table>
                ) : (
                  // 표시 모드 — 통합e 아동정보 기본정보 탭과 100% 동일한 필드/라벨/2열 배치
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-1">
                    <F label="이름" value={cur.CHIL_REAL_NM || cur.CHIL_NM} />
                    <RrnF value={cur.CHILINNB} />
                    <F label="주민번호 구분" value={g('residentIdType') || (cur.CHILINNB ? '주민등록번호' : '')} />
                    <F label="성별" value={cur.CHIL_SEX_NM} />
                    <F label="나이" value={calcAge(cur.BRTHDY)} />
                    <F label="생년월일" value={dot(cur.BRTHDY)} />
                    <F label="보육나이" value={g('childOrder') || String(cur.CHILD_CARE_AGE ?? '')} />
                    <F label="출생순위" value={g('birthOrder')} />
                    <F label="출생순위 확정" value={yn(g('birthOrderConfirmedYn'))} />
                    <F label="보육료 지원자격" value={g('childcareEligibilityType')} />
                    <F label="서비스 시작일" value={dot(g('serviceStartDate'))} />
                    <F label="입소일" value={dot(cur.ENTRNC_DE)} />
                    <F label="퇴소일" value={dot(cur.RETIRE_DE)} />
                    <F label="상태" value={cur.KID_STATE_NM} />
                    <F label="상해보험 가입" value={g('insuranceJoinStatus')} />
                    <F label="예외급여 대상" value={yn(g('exBenefitYn'))} />
                    <F label="자동결제 설정" value={autoPayLabel(g('autoPaymentEnabledYn'))} />
                  </div>
                )
              )}

              {/* ── 반·보육 ── 통합e 와 동일 ── */}
              {tab === '반·보육' && (
                editMode ? (
                  <table className="w-full text-[11px] border-collapse">
                    <colgroup><col className="w-[110px]" /><col /><col className="w-[110px]" /><col /></colgroup>
                    <tbody>
                      <tr className="border-b border-slate-100">
                        <Th>반(일반)</Th><Td>
                          <select className={inputCls} value={vOf(cur, 'CLAS_SN')} onChange={e => editClass(cur.CHIL_SN, e.target.value)}>
                            <option value="">없음</option>
                            {clasOptions.map(o => <option key={o.sn} value={o.sn}>{o.nm}</option>)}
                            {vOf(cur, 'CLAS_SN') && !clasOptions.some(o => o.sn === vOf(cur, 'CLAS_SN')) && <option value={vOf(cur, 'CLAS_SN')}>{vOf(cur, 'CLAS_NM')}</option>}
                          </select>
                        </Td>
                        <Th>반(연장)</Th><Td>
                          <select className={inputCls} value={vOf(cur, '_classExtended')} onChange={e => editField(cur.CHIL_SN, '_classExtended', e.target.value)}>
                            <option value="">없음</option>
                            {clasOptions.map(o => <option key={o.sn} value={o.nm}>{o.nm}</option>)}
                            {vOf(cur, '_classExtended') && !clasOptions.some(o => o.nm === vOf(cur, '_classExtended')) && <option value={vOf(cur, '_classExtended')}>{vOf(cur, '_classExtended')}</option>}
                          </select>
                        </Td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <Th>반(휴일)</Th><Td>
                          <select className={inputCls} value={vOf(cur, '_classHoliday')} onChange={e => editField(cur.CHIL_SN, '_classHoliday', e.target.value)}>
                            <option value="">없음</option>
                            {clasOptions.map(o => <option key={o.sn} value={o.nm}>{o.nm}</option>)}
                            {vOf(cur, '_classHoliday') && !clasOptions.some(o => o.nm === vOf(cur, '_classHoliday')) && <option value={vOf(cur, '_classHoliday')}>{vOf(cur, '_classHoliday')}</option>}
                          </select>
                        </Td>
                        <Th>반(새벽)</Th><Td>
                          <select className={inputCls} value={vOf(cur, '_classNight')} onChange={e => editField(cur.CHIL_SN, '_classNight', e.target.value)}>
                            <option value="">없음</option>
                            {clasOptions.map(o => <option key={o.sn} value={o.nm}>{o.nm}</option>)}
                            {vOf(cur, '_classNight') && !clasOptions.some(o => o.nm === vOf(cur, '_classNight')) && <option value={vOf(cur, '_classNight')}>{vOf(cur, '_classNight')}</option>}
                          </select>
                        </Td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <Th>반(야간연장)</Th><Td>
                          <select className={inputCls} value={vOf(cur, '_classNightCare')} onChange={e => editField(cur.CHIL_SN, '_classNightCare', e.target.value)}>
                            <option value="">없음</option>
                            {clasOptions.map(o => <option key={o.sn} value={o.nm}>{o.nm}</option>)}
                            {vOf(cur, '_classNightCare') && !clasOptions.some(o => o.nm === vOf(cur, '_classNightCare')) && <option value={vOf(cur, '_classNightCare')}>{vOf(cur, '_classNightCare')}</option>}
                          </select>
                        </Td>
                        <Th>야간연장 시작일</Th><Td><input type="date" className={inputCls} value={fmtDate(vOf(cur, '_nightCareStart'))} onChange={e => editField(cur.CHIL_SN, '_nightCareStart', toRawDate(e.target.value))} /></Td>
                      </tr>
                      <tr>
                        <Th>보육시간</Th><Td colSpan={3}>
                          {careTimeCodes.length > 0 ? (
                            <select className={`${inputCls} !w-1/2`} value={vOf(cur, 'CARETIME_CD')} onChange={e => { const c = careTimeCodes.find(x => x.CD === e.target.value); editField(cur.CHIL_SN, 'CARETIME_CD', e.target.value); editField(cur.CHIL_SN, 'TIME_NAME', c?.CD_NM || '') }}>
                              <option value="">선택</option>
                              {careTimeCodes.map(c => <option key={c.CD} value={c.CD}>{c.CD_NM}</option>)}
                            </select>
                          ) : (
                            <input className={`${inputCls} !w-1/2`} value={vOf(cur, 'TIME_NAME')} onChange={e => editField(cur.CHIL_SN, 'TIME_NAME', e.target.value)} />
                          )}
                        </Td>
                      </tr>
                    </tbody>
                  </table>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-1">
                    <F label="반(일반)" value={classOf(cur, 'general')} />
                    <F label="반(휴일)" value={classOf(cur, 'holiday')} />
                    <F label="반(연장)" value={classOf(cur, 'extended')} />
                    <F label="반(새벽)" value={classOf(cur, 'night')} />
                    <F label="반(야간연장)" value={classOf(cur, 'nightCare')} />
                    <F label="야간연장 시작일" value={dot(cur._nightCareStart)} />
                    <F label="보육시간" value={cur.TIME_NAME} />
                  </div>
                )
              )}

              {/* ── 주소 ── 통합e 와 동일 ── */}
              {tab === '주소' && (
                editMode ? (
                  <table className="w-full text-[11px] border-collapse">
                    <colgroup><col className="w-[110px]" /><col /><col className="w-[110px]" /><col /></colgroup>
                    <tbody>
                      <tr className="border-b border-slate-100"><Th>주소</Th><Td colSpan={3}><input className={inputCls} value={vOf(cur, 'ADRES')} onChange={e => editField(cur.CHIL_SN, 'ADRES', e.target.value)} /></Td></tr>
                      <tr className="border-b border-slate-100">
                        <Th>주민등록(시/도)</Th><Td><input className={inputCls} value={rg('residentCity')} onChange={e => editRaw(cur.CHIL_SN, 'residentCity', e.target.value)} /></Td>
                        <Th>주민등록(구)</Th><Td><input className={inputCls} value={rg('residentDistrict')} onChange={e => editRaw(cur.CHIL_SN, 'residentDistrict', e.target.value)} /></Td>
                      </tr>
                      <tr>
                        <Th>임시등록(시/도)</Th><Td><input className={inputCls} value={rg('tempResidenceCity')} onChange={e => editRaw(cur.CHIL_SN, 'tempResidenceCity', e.target.value)} /></Td>
                        <Th>임시등록(구)</Th><Td><input className={inputCls} value={rg('tempResidenceDistrict')} onChange={e => editRaw(cur.CHIL_SN, 'tempResidenceDistrict', e.target.value)} /></Td>
                      </tr>
                    </tbody>
                  </table>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-1">
                    <F label="주소" value={cur.ADRES || g('address')} />
                    <F label="주민등록(시/도)" value={g('residentCity')} />
                    <F label="주민등록(구)" value={g('residentDistrict')} />
                    <F label="임시등록(시/도)" value={g('tempResidenceCity')} />
                    <F label="임시등록(구)" value={g('tempResidenceDistrict')} />
                  </div>
                )
              )}

              {/* ── 보호자 ── 통합e 와 동일 라벨 ── */}
              {tab === '보호자' && (
                editMode ? (
                  <table className="w-full text-[11px] border-collapse">
                    <colgroup><col className="w-[110px]" /><col /><col className="w-[110px]" /><col /></colgroup>
                    <tbody>
                      <tr className="border-b border-slate-100">
                        <Th>보호자명</Th><Td><input className={inputCls} value={vOf(cur, 'PARNTS_NM')} onChange={e => editField(cur.CHIL_SN, 'PARNTS_NM', e.target.value)} /></Td>
                        <Th>관계</Th><Td>
                          <select className={inputCls} value={vOf(cur, 'PARNTS_CHIL_RELATE')} onChange={e => editField(cur.CHIL_SN, 'PARNTS_CHIL_RELATE', e.target.value)}>
                            <option value="">선택</option>
                            {RELATE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                            {vOf(cur, 'PARNTS_CHIL_RELATE') && !RELATE_OPTIONS.includes(vOf(cur, 'PARNTS_CHIL_RELATE')) && (
                              <option value={vOf(cur, 'PARNTS_CHIL_RELATE')}>{vOf(cur, 'PARNTS_CHIL_RELATE')}</option>
                            )}
                          </select>
                        </Td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <Th>연락처</Th><Td><PhoneInput value={vOf(cur, 'PARNTS_CTTPC')} onChange={v => editField(cur.CHIL_SN, 'PARNTS_CTTPC', v)} /></Td>
                        <Th>핸드폰</Th><Td><PhoneInput value={vOf(cur, 'PARNTS_MOBLPHON')} onChange={v => editField(cur.CHIL_SN, 'PARNTS_MOBLPHON', v)} /></Td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <Th>이메일</Th><Td colSpan={3}><input className={inputCls} value={rg('guardianEmail')} onChange={e => editRaw(cur.CHIL_SN, 'guardianEmail', e.target.value)} /></Td>
                      </tr>
                      <tr>
                        <Th>기타사항</Th><Td colSpan={3}><input className={inputCls} value={vOf(cur, 'PARNTS_RM')} onChange={e => editField(cur.CHIL_SN, 'PARNTS_RM', e.target.value)} /></Td>
                      </tr>
                    </tbody>
                  </table>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-1">
                      <F label="보호자명" value={cur.PARNTS_NM || g('guardianName')} />
                      <F label="관계" value={cur.PARNTS_CHIL_RELATE || g('guardianRelation')} />
                      <F label="연락처" value={cur.PARNTS_CTTPC || g('guardianPhone')} />
                      <F label="핸드폰" value={cur.PARNTS_MOBLPHON || ''} />
                      <F label="이메일" value={g('guardianEmail')} />
                      <F label="기타사항" value={cur.PARNTS_RM || ''} />
                    </div>
                    {/* 자동등록 키워드 — 인천시 원문 안내 그대로 */}
                    <div>
                      <div className="text-[11px] font-bold text-slate-700 mb-1.5">자동등록 키워드</div>
                      <div className="border border-slate-200 rounded p-2.5 bg-slate-50/60">
                        <div className="flex flex-wrap gap-1.5 min-h-[26px]">
                          {curKeywords.length === 0
                            ? <span className="text-[11px] text-slate-400 py-1">등록된 키워드가 없습니다.</span>
                            : curKeywords.map((k, i) => (
                                <span key={i} className="px-2 py-1 text-[11px] bg-white border border-teal-300 text-teal-700 rounded">{k}</span>
                              ))}
                        </div>
                        <div className="mt-2 text-[10px] text-slate-500 leading-relaxed">
                          ⓘ 자동등록 키워드 : 보호자가 필요경비 입금 시, 통장에 찍히는 문구를 등록하시면 자동 매칭됩니다.<br />
                          최대 4개까지 등록 가능합니다.
                        </div>
                      </div>
                    </div>
                  </div>
                )
              )}

              {/* ── 가정·기타 ── 통합e 와 동일 ── */}
              {tab === '가정·기타' && (
                editMode ? (
                  <table className="w-full text-[11px] border-collapse">
                    <colgroup><col className="w-[110px]" /><col /><col className="w-[110px]" /><col /></colgroup>
                    <tbody>
                      {([
                        ['입양아', 'isAdoptedChild', '조손가정', 'isGrandparentFamily'],
                        ['다문화', 'isMulticulturalFamily', '한부모', 'isSingleParentFamily'],
                        ['외국인', 'isForeignFamily', '공무원', 'isPublicOfficerFamily'],
                        ['취업여성', 'isWorkingMotherFamily', '이주노동자', 'isMigrantWorkerFamily'],
                        ['새터민', 'isNorthKoreanDefectorFamily', '가정유형 확정', 'familyTypeConfirmedYn'],
                      ] as const).map(([l1, k1, l2, k2], i, arr) => (
                        <tr key={k1} className={i < arr.length - 1 ? 'border-b border-slate-100' : ''}>
                          <Th>{l1}</Th><Td>
                            <select className={inputCls} value={rg(k1)} onChange={e => editRaw(cur.CHIL_SN, k1, e.target.value)}>
                              <option value="">선택</option><option value="Y">예</option><option value="N">아니오</option>
                            </select>
                          </Td>
                          <Th>{l2}</Th><Td>
                            <select className={inputCls} value={rg(k2)} onChange={e => editRaw(cur.CHIL_SN, k2, e.target.value)}>
                              <option value="">선택</option><option value="Y">예</option><option value="N">아니오</option>
                            </select>
                          </Td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-1">
                    <F label="입양아" value={yn(g('isAdoptedChild'))} />
                    <F label="조손가정" value={yn(g('isGrandparentFamily'))} />
                    <F label="다문화" value={yn(g('isMulticulturalFamily'))} />
                    <F label="한부모" value={yn(g('isSingleParentFamily'))} />
                    <F label="외국인" value={yn(g('isForeignFamily')) !== '-' ? yn(g('isForeignFamily')) : (cur.FRGNR_SE === 'Y' ? '예' : '아니오')} />
                    <F label="공무원" value={yn(g('isPublicOfficerFamily'))} />
                    <F label="취업여성" value={yn(g('isWorkingMotherFamily'))} />
                    <F label="이주노동자" value={yn(g('isMigrantWorkerFamily'))} />
                    <F label="새터민" value={yn(g('isNorthKoreanDefectorFamily'))} />
                    <F label="가정유형 확정" value={yn(g('familyTypeConfirmedYn'))} />
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * 휴대폰 입력 — [앞자리 드롭다운(기본 010)] - [4자리] - [4자리].
 * 저장은 '010-1234-5678' 한 문자열(인천시 PARNTS_CTTPC 실측 형식과 동일).
 * 앞자리가 목록에 없는 값(지역번호 등)이면 그 값도 선택지로 유지 — 임의로 날리지 않는다.
 */
function PhoneInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const parts = (value || '').split('-')
  const p0 = parts[0] || '010'
  const p1 = parts[1] || ''
  const p2 = parts[2] || ''
  const emit = (a: string, b: string, c: string) => onChange(!b && !c ? '' : `${a}-${b}-${c}`)
  const only = (v: string, n: number) => v.replace(/[^0-9]/g, '').slice(0, n)
  return (
    <div className="flex items-center gap-1">
      <select
        value={p0}
        onChange={e => emit(e.target.value, p1, p2)}
        className="border border-teal-300 rounded px-1 py-1 text-[11px] w-[68px] focus:outline-none focus:border-teal-500"
      >
        {PHONE_PREFIXES.map(x => <option key={x} value={x}>{x}</option>)}
        {p0 && !PHONE_PREFIXES.includes(p0) && <option value={p0}>{p0}</option>}
      </select>
      <span className="text-slate-400">-</span>
      <input
        value={p1} onChange={e => emit(p0, only(e.target.value, 4), p2)}
        inputMode="numeric" placeholder="0000"
        className="border border-teal-300 rounded px-2 py-1 text-[11px] w-[64px] text-center focus:outline-none focus:border-teal-500"
      />
      <span className="text-slate-400">-</span>
      <input
        value={p2} onChange={e => emit(p0, p1, only(e.target.value, 4))}
        inputMode="numeric" placeholder="0000"
        className="border border-teal-300 rounded px-2 py-1 text-[11px] w-[64px] text-center focus:outline-none focus:border-teal-500"
      />
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return <td className="font-medium text-slate-700 bg-slate-100 px-3 py-2 border-r border-slate-200 text-center align-middle">{children}</td>
}
function Td({ children, colSpan }: { children: React.ReactNode; colSpan?: number }) {
  return <td colSpan={colSpan} className="px-3 py-2">{children}</td>
}
