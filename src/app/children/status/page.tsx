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

const inputCls = 'border border-teal-300 rounded px-2 py-1 text-[12px] focus:outline-none focus:border-teal-500 w-full'
const roCls = 'border border-slate-200 bg-slate-50 rounded px-2 py-1 text-[12px] w-full text-slate-600'

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
    CLAS_SN: '', CLAS_NM: c.className,
    ENTRNC_DE: c.enterDate.replace(/-/g, ''),
    RETIRE_DE: c.leaveDate ? c.leaveDate.replace(/-/g, '') : null,
    STTUS: c.status === '퇴소' ? '001' : '000',
    KID_STATE_NM: c.status,
    CARETIME_CD: '', TIME_NAME: '', CARERIG_CD: '', CARERIG_STDDE: '',
    ADRES: null, DISP_NAME: '', FRGNR_SE: ['5', '6', '7', '8'].includes(back1) ? 'Y' : 'N',
    NRTR_CHRGE: 0, SPORT_RT: null,
    CHLDSBUS_USE_BGNDE: null, CHLDSBUS_USE_ENDDE: null,
    CHIL_SEXDSTN: sex, CHIL_SEX_NM: sex === 'M' ? '남' : sex === 'F' ? '여' : '',
    PARNTS_NM: c.guardian, PARNTS_CHIL_RELATE: c.guardianRelation, PARNTS_CTTPC: c.phone,
  }
}

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

export default function ChildStatusPage() {
  const year = String(new Date().getFullYear())
  const [children, setChildren] = useState<IncheonChild[]>([])
  const [keywords, setKeywords] = useState<IncheonKeyword[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [msg, setMsg] = useState('')
  const [savedAt, setSavedAt] = useState<string | null>(null)

  // 인천시 화면의 검색 조건 — 상태 / 반 / 성명
  const [schSttus, setSchSttus] = useState('000')   // 기본 현원 (인천시 화면과 동일)
  const [schClas, setSchClas] = useState('all')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<number | null>(null)  // CHIL_SN
  const [codes, setCodes] = useState<IncheonCode[]>([])
  const [cisRaw, setCisRaw] = useState<CisChild[]>([])
  const [source, setSource] = useState<'incheon' | 'cis'>('incheon')
  const [tab, setTab] = useState<'basic' | 'guardian' | 'class'>('basic')  // 상세 팝업 탭

  // 편집 — CHIL_SN 별로 바뀐 필드만 모아둔다(저장 시 그 아동만 PUT)
  const [edits, setEdits] = useState<Record<number, Partial<IncheonChild>>>({})
  const [saving, setSaving] = useState(false)
  const dirtyCount = Object.keys(edits).length

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
    if (search && !(c.CHIL_NM || '').includes(search)) return false
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

  const cur = rows.find(c => c.CHIL_SN === selected) || null
  const curKeywords = keywords.filter(k => Number(k.CHIL_SN) === selected).map(k => k.KEYWORD_NM)


  return (
    <div className="p-3 space-y-3">
      {/* 헤더 — 보육년도 + 소스 토글 + 조회조건 */}
      <div className="bg-white rounded-xl border border-teal-400/30 shadow-sm">
        <div className="px-4 py-3 border-b border-teal-400/20 flex items-center gap-2 flex-wrap">
          <span className="text-sm font-bold text-slate-700">아동정보</span>
          <span className="text-[11px] text-slate-500">보육년도 {year}년</span>

          {/* 소스 토글 — 보육통합(CIS)은 통합e 가 이미 수집해둔 원본, 인천시는 회계 시스템 */}
          <div className="flex items-center rounded border border-slate-300 overflow-hidden ml-1">
            {([['incheon', '인천시'], ['cis', '보육통합']] as const).map(([v, label]) => (
              <button
                key={v}
                onClick={() => { setSource(v); setSelected(null) }}
                className={`px-2.5 py-1 text-[11px] font-bold ${source === v ? 'bg-teal-500 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
              >
                {label} {v === 'cis' ? cisChildren.length : children.length}
              </button>
            ))}
          </div>

          {/* 검색은 조회 버튼/엔터 방식 — 실시간 검색 금지(프로젝트 UX 규칙) */}
          <form onSubmit={e => { e.preventDefault(); setSearch(searchInput) }} className="flex items-center gap-2 ml-2">
            <select value={schSttus} onChange={e => setSchSttus(e.target.value)} className={`${inputCls} !w-24`}>
              <option value="">전체</option>
              {CHILD_STATUS.map(st => <option key={st.cd} value={st.cd}>{st.nm}</option>)}
            </select>
            <select value={schClas} onChange={e => setSchClas(e.target.value)} className={`${inputCls} !w-36`}>
              <option value="all">전체 반</option>
              {clasOptions.map(o => <option key={o.sn} value={o.sn}>{o.nm}</option>)}
            </select>
            <input
              type="text" placeholder="성명"
              value={searchInput} onChange={e => setSearchInput(e.target.value)}
              className={`${inputCls} !w-32`}
            />
            <button type="submit" className="px-3 py-1.5 text-xs font-bold text-white bg-teal-500 hover:bg-teal-600 rounded whitespace-nowrap">조회</button>
          </form>

          <div className="ml-auto flex items-center gap-2">
            {savedAt && <span className="text-[11px] text-slate-400">최근 동기화 {new Date(savedAt).toLocaleString('ko-KR')}</span>}
            <button
              onClick={handleSync}
              disabled={syncing}
              className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 rounded whitespace-nowrap"
            >
              {syncing ? '가져오는 중…' : '📥 인천시에서 가져오기'}
            </button>
          </div>
        </div>
        {msg && <div className="px-4 py-2 text-[11px] border-t border-slate-100 text-slate-600 bg-slate-50">{msg}</div>}

        {/* 매칭 현황 — 정산 자동화는 인천시 CHIL_SN 으로 써야 하므로 CIS 아동이 인천시와
            얼마나 연결되는지가 핵심 지표다. 매칭 키 = 주민번호 앞7자리. */}
        {matchStats && (
          <div className="px-4 py-2 text-[11px] border-t border-slate-100 bg-sky-50/60 text-slate-600 flex items-center gap-2 flex-wrap">
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
      </div>

      {/* 명단 — 전체 폭. 성명 클릭 → 탭 팝업 */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead><tr className="bg-teal-50 border-b border-slate-300">
              <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-200 w-[45px]">No</th>
              <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-200 w-[110px]">성명</th>
              <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-200 w-[50px]">성별</th>
              <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-200 w-[60px]">보육나이</th>
              <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-200 w-[95px]">생년월일</th>
              <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-200 w-[140px]">반명</th>
              <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-200 w-[95px]">입소일</th>
              <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-200 w-[95px]">퇴소일</th>
              <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-200 w-[60px]">상태</th>
              <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-200 w-[100px]">보호자</th>
              <th className="px-2 py-2 text-center font-bold text-slate-600">연락처</th>
            </tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={11} className="px-2 py-10 text-center text-slate-400">불러오는 중…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={11} className="px-2 py-10 text-center text-slate-400">
                  {rows.length === 0
                    ? (isCis
                        ? '보육통합에서 수집된 아동이 없습니다. 통합e 아동정보에서 [CIS 갱신]을 먼저 실행해주세요.'
                        : '저장된 아동이 없습니다. [📥 인천시에서 가져오기]를 눌러주세요.')
                    : '검색 결과가 없습니다.'}
                </td></tr>
              ) : filtered.map((c, i) => {
                const dirty = !!edits[c.CHIL_SN]
                return (
                  <tr key={c.CHIL_SN} className={`border-b border-slate-100 ${dirty ? 'bg-amber-50' : 'hover:bg-blue-50/40'}`}>
                    <td className="px-2 py-1.5 text-center text-slate-400 border-r border-slate-100">{i + 1}</td>
                    {/* 성명 클릭 → 상세 팝업 */}
                    <td className="px-2 py-1.5 text-center border-r border-slate-100">
                      <button
                        onClick={() => { setSelected(c.CHIL_SN); setTab('basic') }}
                        className="font-medium text-slate-700 hover:text-teal-600 hover:underline"
                      >
                        {c.CHIL_NM}
                      </button>
                      {dirty && <span className="ml-1 text-amber-600" title="저장 안 된 수정 있음">✏️</span>}
                      {c._local && <span className="ml-1 px-1 text-[9px] bg-violet-100 text-violet-700 rounded" title="통합e 에서 추가한 아동">e</span>}
                    </td>
                    <td className="px-2 py-1.5 text-center border-r border-slate-100">
                      {c.CHIL_SEX_NM
                        ? <span className={c.CHIL_SEXDSTN === 'F' ? 'text-pink-600' : 'text-sky-600'}>{c.CHIL_SEX_NM}</span>
                        : <span className="text-slate-300">-</span>}
                    </td>
                    <td className="px-2 py-1.5 text-center text-slate-600 border-r border-slate-100">{c.CHILD_CARE_AGE}</td>
                    <td className="px-2 py-1.5 text-center text-slate-600 border-r border-slate-100">{fmtDate(c.BRTHDY)}</td>
                    <td className="px-2 py-1.5 text-center text-slate-600 border-r border-slate-100">{c.CLAS_NM || '-'}</td>
                    <td className="px-2 py-1.5 text-center text-sky-600 border-r border-slate-100">{fmtDate(c.ENTRNC_DE)}</td>
                    <td className="px-2 py-1.5 text-center text-pink-600 border-r border-slate-100">{fmtDate(c.RETIRE_DE) || '-'}</td>
                    <td className="px-2 py-1.5 text-center border-r border-slate-100">
                      <span className={c.STTUS === '000' ? 'text-emerald-600' : 'text-slate-400'}>{c.KID_STATE_NM || '-'}</span>
                    </td>
                    <td className="px-2 py-1.5 text-center text-slate-600 border-r border-slate-100">
                      {c.PARNTS_NM || <span className="text-slate-300">-</span>}
                      {c.PARNTS_CHIL_RELATE && <span className="ml-0.5 text-slate-400">({c.PARNTS_CHIL_RELATE})</span>}
                    </td>
                    <td className="px-2 py-1.5 text-center text-slate-600">
                      {c.PARNTS_MOBLPHON || c.PARNTS_CTTPC || <span className="text-slate-300">-</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {!loading && (
          <div className="px-4 py-2 border-t border-slate-200 text-[11px] text-slate-500 flex items-center gap-3 flex-wrap">
            <span>총 {filtered.length}명</span>
            {rows.length > 0 && (
              <span className="text-slate-400">
                ({CHILD_STATUS.map(st => `${st.nm} ${rows.filter(c => c.STTUS === st.cd).length}`).join(' · ')})
              </span>
            )}
            {dirtyCount > 0 && <span className="text-amber-600 font-medium">✏️ 미저장 {dirtyCount}명</span>}
            {dirtyCount > 0 && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-3 py-1 text-[11px] font-bold text-white bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 rounded"
              >
                {saving ? '저장 중…' : `💾 수정 저장 (${dirtyCount})`}
              </button>
            )}
            <span className="ml-auto text-slate-400">성명을 클릭하면 상세 정보가 열립니다</span>
          </div>
        )}
      </div>

      {/* 상세 팝업 — 탭 구성 */}
      {cur && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setSelected(null)}>
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-[900px] max-h-[90vh] overflow-hidden flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* 팝업 헤더 */}
            <div className="px-5 py-3 border-b border-slate-200 flex items-center gap-2">
              <div>
                <div className="text-sm font-bold text-slate-800">
                  {cur.CHIL_REAL_NM || cur.CHIL_NM}
                  <span className="ml-2 text-[11px] font-normal text-slate-500">
                    {cur.KID_STATE_NM} · {cur.CHILD_CARE_AGE}세 · {cur.CLAS_NM}
                  </span>
                  {cur._local && <span className="ml-1.5 px-1 py-0.5 text-[9px] bg-violet-100 text-violet-700 rounded" title="통합e 에서 추가한 아동 — 인천시에는 없습니다">통합e</span>}
                  {/* 보육통합 아동이면 인천시 어느 아동과 연결되는지 표시 */}
                  {isCis && (() => {
                    const m = incheonMatchOf(cur)
                    return m
                      ? <span className="ml-1.5 px-1 py-0.5 text-[9px] bg-emerald-100 text-emerald-700 rounded" title={`인천시 CHIL_SN ${m.CHIL_SN} · ${m.CLAS_NM}`}>🔗 인천시 연결됨</span>
                      : <span className="ml-1.5 px-1 py-0.5 text-[9px] bg-slate-100 text-slate-500 rounded" title="인천시 명단에 같은 주민번호 앞7자리 아동이 없습니다">인천시 없음</span>
                  })()}
                  {edits[cur.CHIL_SN] && <span className="ml-1.5 text-[10px] text-amber-600 font-medium">✏️ 수정됨 — 저장 안 됨</span>}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {isCis ? '보육통합(CIS) 원본 — 읽기 전용' : `인천시 아동 · CHIL_SN ${cur.CHIL_SN} · CLAS_SN ${cur.CLAS_SN}`}
                </div>
              </div>

              {/* 우측 상단 [수정] [삭제] — 보육통합(CIS)은 읽기 전용이라 숨긴다 */}
              <div className="ml-auto flex items-center gap-1.5">
                {!isCis && (
                  <>
                    <button
                      onClick={handleSave}
                      disabled={saving || dirtyCount === 0}
                      className="px-3 py-1 text-[11px] font-bold text-white bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 rounded"
                    >
                      {saving ? '저장 중…' : dirtyCount > 0 ? '수정 (' + dirtyCount + ')' : '수정'}
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={saving}
                      className="px-3 py-1 text-[11px] font-bold text-white bg-rose-500 hover:bg-rose-600 disabled:bg-slate-300 rounded"
                    >
                      삭제
                    </button>
                  </>
                )}
                <button onClick={() => setSelected(null)} className="ml-1 px-2 py-1 text-slate-400 hover:text-slate-700 text-lg leading-none">✕</button>
              </div>
            </div>

            {/* 탭 */}
            <div className="px-5 border-b border-slate-200 flex items-center gap-1">
              {([['basic', '기본정보'], ['guardian', '보호자'], ['class', '반·보육']] as const).map(([v, label]) => (
                <button
                  key={v}
                  onClick={() => setTab(v)}
                  className={`px-3 py-2 text-[12px] font-bold border-b-2 -mb-px ${tab === v ? 'border-teal-500 text-teal-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* 탭 본문 */}
            <div className="p-5 overflow-y-auto flex-1">
              {/* ── 탭 1: 기본정보 ── */}
              {tab === 'basic' && (
                <table className="w-full text-[12px] border-collapse">
                  <colgroup><col className="w-[110px]" /><col /><col className="w-[110px]" /><col /></colgroup>
                  <tbody>
                    <tr className="border-b border-slate-100">
                      {/* 9 아동실명 — 목록 API 엔 CHIL_REAL_NM 이 없어(상세 API 전용) 없으면 CHIL_NM 으로 대체 표시 */}
                      <Th>아동실명</Th><Td>
                        <input
                          className={inputCls} readOnly={isCis}
                          value={vOf(cur, 'CHIL_REAL_NM') || vOf(cur, 'CHIL_NM')}
                          onChange={e => editField(cur.CHIL_SN, 'CHIL_REAL_NM', e.target.value)}
                        />
                      </Td>
                      {/* 8 아동별칭 */}
                      <Th>아동별칭</Th><Td>
                        <input className={inputCls} readOnly={isCis} value={vOf(cur, 'CHIL_NM')} onChange={e => editField(cur.CHIL_SN, 'CHIL_NM', e.target.value)} />
                      </Td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      {/* 10 생년월일 — 달력 */}
                      <Th>생년월일</Th><Td>
                        <input
                          type="date" className={inputCls} readOnly={isCis}
                          value={fmtDate(vOf(cur, 'BRTHDY'))}
                          onChange={e => editField(cur.CHIL_SN, 'BRTHDY', toRawDate(e.target.value))}
                        />
                      </Td>
                      {/* 3 보육나이 — 0~5세 드롭다운 */}
                      <Th>보육나이</Th><Td>
                        <select
                          className={inputCls} disabled={isCis}
                          value={vOf(cur, 'CHILD_CARE_AGE')}
                          onChange={e => editField(cur.CHIL_SN, 'CHILD_CARE_AGE', e.target.value)}
                        >
                          <option value="">선택</option>
                          {[0, 1, 2, 3, 4, 5].map(a => <option key={a} value={a}>{a}세</option>)}
                          {/* 0~5 밖의 값이 저장돼 있으면 그것도 유지 — 임의로 날리지 않는다 */}
                          {vOf(cur, 'CHILD_CARE_AGE') && !['0', '1', '2', '3', '4', '5'].includes(vOf(cur, 'CHILD_CARE_AGE')) && (
                            <option value={vOf(cur, 'CHILD_CARE_AGE')}>{vOf(cur, 'CHILD_CARE_AGE')}세</option>
                          )}
                        </select>
                      </Td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      {/* 2 성별 — 남/여 드롭다운. 코드(CHIL_SEXDSTN=M/F)로 다룬다 */}
                      <Th>성별</Th><Td>
                        <select
                          className={inputCls} disabled={isCis}
                          value={vOf(cur, 'CHIL_SEXDSTN')}
                          onChange={e => editField(cur.CHIL_SN, 'CHIL_SEXDSTN', e.target.value)}
                        >
                          <option value="">선택</option>
                          {SEX_OPTIONS.map(o => <option key={o.cd} value={o.cd}>{o.nm}</option>)}
                        </select>
                      </Td>
                      {/* 7 외국인 — 예/아니오 드롭다운 */}
                      <Th>외국인</Th><Td>
                        <select className={inputCls} disabled={isCis} value={vOf(cur, 'FRGNR_SE') || 'N'} onChange={e => editField(cur.CHIL_SN, 'FRGNR_SE', e.target.value)}>
                          <option value="N">아니오</option>
                          <option value="Y">예</option>
                        </select>
                      </Td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      {/* 1 입소일 — 달력 */}
                      <Th>입소일</Th><Td>
                        <input
                          type="date" className={inputCls} readOnly={isCis}
                          value={fmtDate(vOf(cur, 'ENTRNC_DE'))}
                          onChange={e => editField(cur.CHIL_SN, 'ENTRNC_DE', toRawDate(e.target.value))}
                        />
                      </Td>
                      {/* 5 상태 — 현원/퇴소/졸업 드롭다운 */}
                      <Th>상태</Th><Td>
                        <select
                          className={`${inputCls} ${vOf(cur, 'STTUS') === '000' ? 'text-emerald-600' : 'text-pink-600'}`}
                          disabled={isCis}
                          value={vOf(cur, 'STTUS')}
                          onChange={e => editField(cur.CHIL_SN, 'STTUS', e.target.value)}
                        >
                          {CHILD_STATUS.map(st => <option key={st.cd} value={st.cd}>{st.nm}</option>)}
                        </select>
                      </Td>
                    </tr>
                    {/* 상태가 퇴소/졸업이면 그 날짜가 필요 — 인천시도 이때만 입력받는다 */}
                    {vOf(cur, 'STTUS') !== '000' && (
                      <tr className="border-b border-slate-100">
                        <Th>{vOf(cur, 'STTUS') === '999' ? '졸업일' : '퇴소일'}</Th><Td colSpan={3}>
                          <input
                            type="date" className={`${inputCls} !w-1/2`} readOnly={isCis}
                            value={fmtDate(vOf(cur, 'RETIRE_DE'))}
                            onChange={e => editField(cur.CHIL_SN, 'RETIRE_DE', toRawDate(e.target.value))}
                          />
                        </Td>
                      </tr>
                    )}
                    <tr className="border-b border-slate-100">
                      {/* 2 주소 */}
                      <Th>주소</Th><Td colSpan={3}>
                        <input className={inputCls} readOnly={isCis} value={vOf(cur, 'ADRES')} onChange={e => editField(cur.CHIL_SN, 'ADRES', e.target.value)} />
                      </Td>
                    </tr>
                    <tr>
                      {/* 4 아동고유번호 */}
                      <Th>아동고유번호</Th><Td>
                        <input className={`${inputCls} font-mono`} readOnly={isCis} value={vOf(cur, 'CHILINNB')} onChange={e => editField(cur.CHIL_SN, 'CHILINNB', e.target.value)} />
                      </Td>
                      {/* 1 지원확정일 — 달력 */}
                      <Th>지원확정일</Th><Td>
                        <input
                          type="date" className={inputCls} readOnly={isCis}
                          value={fmtDate(vOf(cur, 'SPORT_DCSN_DE'))}
                          onChange={e => editField(cur.CHIL_SN, 'SPORT_DCSN_DE', toRawDate(e.target.value))}
                        />
                      </Td>
                    </tr>
                  </tbody>
                </table>
              )}

              {/* ── 탭 2: 보호자 ── */}
              {tab === 'guardian' && (
                <div className="space-y-4">
                  <table className="w-full text-[12px] border-collapse">
                    <colgroup><col className="w-[110px]" /><col /><col className="w-[110px]" /><col /></colgroup>
                    <tbody>
                      <tr className="border-b border-slate-100">
                        {/* 관계 — 인천시 화면에 있는 항목(부/모/조부/조모/기타) */}
                        <Th>관계</Th><Td>
                          <select
                            className={inputCls} disabled={isCis}
                            value={vOf(cur, 'PARNTS_CHIL_RELATE')}
                            onChange={e => editField(cur.CHIL_SN, 'PARNTS_CHIL_RELATE', e.target.value)}
                          >
                            <option value="">선택</option>
                            {RELATE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                            {/* 목록에 없는 값이 저장돼 있으면 그것도 유지 */}
                            {vOf(cur, 'PARNTS_CHIL_RELATE') && !RELATE_OPTIONS.includes(vOf(cur, 'PARNTS_CHIL_RELATE')) && (
                              <option value={vOf(cur, 'PARNTS_CHIL_RELATE')}>{vOf(cur, 'PARNTS_CHIL_RELATE')}</option>
                            )}
                          </select>
                        </Td>
                        {/* 3 성명 */}
                        <Th>성명</Th><Td>
                          <input className={inputCls} readOnly={isCis} value={vOf(cur, 'PARNTS_NM')} onChange={e => editField(cur.CHIL_SN, 'PARNTS_NM', e.target.value)} />
                        </Td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        {/* 연락처 — 이 시설은 핸드폰이 아니라 여기에 번호가 들어있다(실측) */}
                        <Th>연락처</Th><Td>
                          {isCis
                            ? <input className={roCls} value={vOf(cur, 'PARNTS_CTTPC')} readOnly />
                            : <PhoneInput value={vOf(cur, 'PARNTS_CTTPC')} onChange={v => editField(cur.CHIL_SN, 'PARNTS_CTTPC', v)} />}
                        </Td>
                        {/* 4 핸드폰 — 010 드롭다운 + 4자리 + 4자리 */}
                        <Th>핸드폰</Th><Td>
                          {isCis
                            ? <input className={roCls} value={vOf(cur, 'PARNTS_MOBLPHON')} readOnly />
                            : <PhoneInput value={vOf(cur, 'PARNTS_MOBLPHON')} onChange={v => editField(cur.CHIL_SN, 'PARNTS_MOBLPHON', v)} />}
                        </Td>
                      </tr>
                      <tr>
                        {/* 5 기타사항 */}
                        <Th>기타사항</Th><Td colSpan={3}>
                          <input className={inputCls} readOnly={isCis} value={vOf(cur, 'PARNTS_RM')} onChange={e => editField(cur.CHIL_SN, 'PARNTS_RM', e.target.value)} />
                        </Td>
                      </tr>
                    </tbody>
                  </table>

                  {/* 자동등록 키워드 — 인천시 원문 안내 그대로 */}
                  <div>
                    <div className="text-[12px] font-bold text-slate-700 mb-1.5">자동등록 키워드</div>
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

                  {!cur.PARNTS_NM && !cur.PARNTS_CTTPC && !isCis && (
                    <div className="text-[10px] text-amber-600">
                      ⚠ 보호자·성별·실명은 아동 상세 조회로만 채워집니다 — [📥 인천시에서 가져오기]를 한 번 실행해주세요.
                    </div>
                  )}
                </div>
              )}

              {/* ── 탭 3: 반·보육 ── */}
              {tab === 'class' && (
                <div className="space-y-4">
                  <div>
                    <div className="text-[12px] font-bold text-slate-700 mb-1.5">반 배정</div>
                    <table className="w-full text-[11px] border border-slate-200">
                      <thead><tr className="bg-teal-50 border-b border-slate-200">
                        <th className="px-2 py-1.5 text-center font-bold text-slate-600 border-r border-slate-200 w-[80px]">반유형</th>
                        <th className="px-2 py-1.5 text-center font-bold text-slate-600 border-r border-slate-200">반명</th>
                        <th className="px-2 py-1.5 text-center font-bold text-slate-600 border-r border-slate-200 w-[100px]">반배정일</th>
                        <th className="px-2 py-1.5 text-center font-bold text-slate-600 border-r border-slate-200 w-[100px]">퇴반일</th>
                        <th className="px-2 py-1.5 text-center font-bold text-slate-600 w-[110px]">비고</th>
                      </tr></thead>
                      <tbody>
                        <tr className="border-b border-slate-100">
                          <td className="px-2 py-1.5 text-center text-slate-600 border-r border-slate-100">{cur.DISP_NAME || '기본'}반</td>
                          <td className="px-2 py-1.5 text-center text-slate-700 border-r border-slate-100">{cur.CLAS_NM}</td>
                          <td className="px-2 py-1.5 text-center text-sky-600 border-r border-slate-100">{fmtDate(cur.CARERIG_STDDE)}</td>
                          <td className="px-2 py-1.5 text-center text-pink-600 border-r border-slate-100">{fmtDate(cur.RETIRE_DE)}</td>
                          <td className="px-2 py-1.5 text-center text-slate-400">-</td>
                        </tr>
                      </tbody>
                    </table>
                    <div className="mt-1 text-[10px] text-amber-600">
                      ⚠ 현재는 아동 목록의 현재 반만 표시합니다. 반 변경 이력(연장반·방과후반 등 다중 배정)은
                      인천시 searchClasChilHistList.do 를 아동별로 호출해야 채워집니다 — 다음 단계.
                    </div>
                  </div>

                  <div>
                    <div className="text-[12px] font-bold text-slate-700 mb-1.5">보육</div>
                    <table className="w-full text-[12px] border-collapse">
                      <colgroup><col className="w-[110px]" /><col /><col className="w-[110px]" /><col /></colgroup>
                      <tbody>
                        <tr>
                          {/* 보육시간 — 드롭다운(인천시 공통코드). 코드표 없으면 원본 이름 텍스트로만 표시 */}
                          <Th>보육시간</Th><Td>
                            {careTimeCodes.length > 0 && !isCis ? (
                              <select
                                className={inputCls}
                                value={vOf(cur, 'CARETIME_CD')}
                                onChange={e => editField(cur.CHIL_SN, 'CARETIME_CD', e.target.value)}
                                title={'인천시 원본 코드: ' + (vOf(cur, 'CARETIME_CD') || '(없음)')}
                              >
                                <option value="">선택</option>
                                {careTimeCodes.map(t => <option key={t.CD} value={t.CD}>{t.CD_NM}</option>)}
                                {vOf(cur, 'CARETIME_CD') && !careTimeCodes.some(t => t.CD === vOf(cur, 'CARETIME_CD')) && (
                                  <option value={vOf(cur, 'CARETIME_CD')}>{(cur.TIME_NAME || vOf(cur, 'CARETIME_CD')) + ' (코드표에 없음)'}</option>
                                )}
                              </select>
                            ) : (
                              <input className={roCls} value={cur.TIME_NAME || ''} readOnly title={isCis ? '보육통합 원본 — 읽기 전용' : '코드표 미수신 — [인천시에서 가져오기] 실행 시 드롭다운으로 바뀝니다'} />
                            )}
                          </Td>
                          {/* 6 보육기준 변경일 — 달력 */}
                          <Th>보육기준<br />변경일</Th><Td>
                            <input
                              type="date" className={inputCls} readOnly={isCis}
                              value={fmtDate(vOf(cur, 'CARERIG_STDDE'))}
                              onChange={e => editField(cur.CHIL_SN, 'CARERIG_STDDE', toRawDate(e.target.value))}
                            />
                          </Td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div>
                    <div className="text-[12px] font-bold text-slate-700 mb-1.5">통학차량</div>
                    <table className="w-full text-[12px] border-collapse">
                      <colgroup><col className="w-[110px]" /><col /><col className="w-[110px]" /><col /></colgroup>
                      <tbody>
                        <tr>
                          {/* 6 이용 시작일 — 달력 */}
                          <Th>이용 시작일</Th><Td>
                            <input
                              type="date" className={inputCls} readOnly={isCis}
                              value={fmtDate(vOf(cur, 'CHLDSBUS_USE_BGNDE'))}
                              onChange={e => editField(cur.CHIL_SN, 'CHLDSBUS_USE_BGNDE', toRawDate(e.target.value))}
                            />
                          </Td>
                          {/* 7 이용 종료일 — 달력 */}
                          <Th>이용 종료일</Th><Td>
                            <input
                              type="date" className={inputCls} readOnly={isCis}
                              value={fmtDate(vOf(cur, 'CHLDSBUS_USE_ENDDE'))}
                              onChange={e => editField(cur.CHIL_SN, 'CHLDSBUS_USE_ENDDE', toRawDate(e.target.value))}
                            />
                          </Td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
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
        className="border border-teal-300 rounded px-1 py-1 text-[12px] w-[68px] focus:outline-none focus:border-teal-500"
      >
        {PHONE_PREFIXES.map(x => <option key={x} value={x}>{x}</option>)}
        {p0 && !PHONE_PREFIXES.includes(p0) && <option value={p0}>{p0}</option>}
      </select>
      <span className="text-slate-400">-</span>
      <input
        value={p1} onChange={e => emit(p0, only(e.target.value, 4), p2)}
        inputMode="numeric" placeholder="0000"
        className="border border-teal-300 rounded px-2 py-1 text-[12px] w-[64px] text-center focus:outline-none focus:border-teal-500"
      />
      <span className="text-slate-400">-</span>
      <input
        value={p2} onChange={e => emit(p0, p1, only(e.target.value, 4))}
        inputMode="numeric" placeholder="0000"
        className="border border-teal-300 rounded px-2 py-1 text-[12px] w-[64px] text-center focus:outline-none focus:border-teal-500"
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
