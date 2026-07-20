'use client'
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'

/**
 * 반편성관리 — 인천시어린이집관리시스템 [설정 > 반설정] 인터페이스와 동일 구성.
 *
 * 컬럼/필드는 인천시 화면정의(ClasSetting.xml)와 API(ClasConfigList.do → ClasList[])를
 * 그대로 옮긴 것 — 통합e 에서 정산을 자동화한 뒤 결과를 인천시로 되돌릴 때 필드 매핑이
 * 필요 없게 하기 위함(사용자 설계: "인터페이스를 인천시랑 똑같이 맞추고 → 데이터를 맞추고
 * → 자동화 처리하고").
 *
 * ★ 연령(AGE_CD) 라벨은 추측하지 않는다 — 인천시 공통코드 API(/acc/common/getCodeList.do)로
 *   받은 원본 코드표(page_data 'incheon-codes')에서 찾아 쓴다. 코드표에 없으면 원본코드 노출.
 */

const inputCls = 'border border-teal-300 rounded px-2 py-1 text-[11px] focus:outline-none focus:border-teal-500'
/** 표 안 인라인 편집칸 — 평소엔 테두리 없이 텍스트처럼 보이고 포커스/호버 때만 입력칸으로 드러남 */
const editCls = 'w-full text-center text-[11px] px-1 py-0.5 rounded border border-transparent bg-transparent hover:border-slate-300 focus:outline-none focus:border-teal-500 focus:bg-white'
const selCls = 'w-full text-center text-[11px] px-0.5 py-0.5 rounded border border-transparent bg-transparent hover:border-slate-300 focus:outline-none focus:border-teal-500 focus:bg-white'

/**
 * 출처 뱃지 — 3칸 그리드의 한 슬롯을 꽉 채우는 고정 규격.
 * 색은 저장소별 고정: 통합e=violet / 보육통합(CIS)=indigo / 인천시=blue.
 * ★ 읽기 전용 표시(입력칸 아님)라 본문 11px 보다 작게 — 눈에 덜 걸리게 9px.
 * (Tailwind purge 때문에 클래스 문자열을 조립하지 않고 통째로 적는다)
 */
const BADGE = {
  violet: 'bg-violet-100 text-violet-700',
  indigo: 'bg-indigo-100 text-indigo-700',
  blue:   'bg-blue-100 text-blue-700',
} as const
const badgeCls = (tone: keyof typeof BADGE) =>
  `px-0.5 py-[2px] text-[9px] leading-none text-center rounded font-medium ${BADGE[tone]}`
/** 없는 출처 자리 — 자리만 차지해서 세로 정렬을 유지한다 */
const badgeEmptyCls = 'py-[2px] text-[9px] leading-none rounded border border-dashed border-slate-200'

/** 인천시 반 (ClasConfigList.do → ClasList[]) — 필드명 원본 그대로 */
type IncheonClas = {
  CLAS_SN: number          // ★ 반 고유키 (통합e 에서 추가한 반은 음수 임시키)
  CLAS_NM: string          // 반명
  AGE_CD: string           // 연령코드
  STTUS: string            // 상태
  RM: string | null        // 비고
  DEL_AT: string           // 삭제여부
  CLAS_NM_NRTR: string | null   // 보육통합 반명
  GRP_CLAS_NM: string | null    // 통합반명
  PSNCPA: number | null         // 정원
  _local?: boolean              // 통합e 에서 추가한 반(인천시에 없음)
  _src?: string | null          // 출처 — 'cis'(보육통합에서 등록) / 'incheon'(인천시에서 등록) / 없으면 수기
}

/** 인천시 공통코드 (getCodeList.do → tcmCodeList) — CD_GRP 로 그룹핑된 원본 코드표 */
type IncheonCode = { CD_GRP: string; CD: string; CD_NM: string }

/**
 * 반구분(연령) 전체 목록.
 *
 * cd  = AGE_CD (실측 확인된 8개만 코드값, 나머지는 코드 미상 → 이름 자체를 값으로 사용)
 * nm  = 인천시 화면 표기 그대로 (구분자 ',' — 예: '연령혼합반(0,1세)', '4,5세이상 반' (인천시 표기))
 *
 * ✅ 실측 대조 완료 (미소지움 10개 반, page_data incheon-clas):
 *    000=0세아 반 / 001=1세아 반 / 002=2세아 반 / 003=3세아 반 / 008=4,5세이상 반
 *    M01=연령혼합반(0,1세) / T10=연장반(영아) / T11=연장반(유아)   — 전부 일치.
 *
 * ⚠ 나열 순서 = 사용자 지정(2026-07-19): "인천시처럼 0세아·1세아·2세아·3세아…" 일관되게.
 *   → 세아 반(0~5)을 먼저 연속으로, 그다음 연령혼합반 → 연장반 → 특수·기타반.
 *   (옛날엔 인천시 [반 추가] 화면 스크롤 순서(세아반↔연령혼합반 교대)를 그대로 썼으나,
 *    보기 어렵다는 피드백으로 세아반을 묶어 순서대로 나열하도록 변경. 코드값은 그대로.)
 */
const AGE_OPTIONS: Array<{ cd: string; nm: string }> = [
  // 세아 반 — 0세아부터 순서대로
  { cd: '000', nm: '0세아 반' },
  { cd: '001', nm: '1세아 반' },
  { cd: '002', nm: '2세아 반' },
  { cd: '003', nm: '3세아 반' },
  { cd: '4세아 반', nm: '4세아 반' },
  { cd: '5세아 반', nm: '5세아 반' },
  { cd: '008', nm: '4,5세이상 반' },
  // 연령혼합반
  { cd: 'M01', nm: '연령혼합반(0,1세)' },
  { cd: '연령혼합반(1,2세)', nm: '연령혼합반(1,2세)' },
  { cd: '연령혼합반(2,3세)', nm: '연령혼합반(2,3세)' },
  { cd: '연령혼합반(3,4세 이상)', nm: '연령혼합반(3,4세 이상)' },
  // 연장반
  { cd: '연장반(0세)', nm: '연장반(0세)' },
  { cd: 'T10', nm: '연장반(영아)' },
  { cd: 'T11', nm: '연장반(유아)' },
  { cd: '연장반(장애아)', nm: '연장반(장애아)' },
  { cd: '연장반(0~2세영아)', nm: '연장반(0~2세영아)' },
  { cd: '영·유아 연장반(2~3세)', nm: '영·유아 연장반(2~3세)' },
  { cd: '영·유아 연장반(2~5세)', nm: '영·유아 연장반(2~5세)' },
  // 특수·기타반
  { cd: '방과후반', nm: '방과후반' },
  { cd: '야간연장반', nm: '야간연장반' },
  { cd: '휴일반', nm: '휴일반' },
  { cd: '시간제독립반(1:3)', nm: '시간제독립반(1:3)' },
  { cd: '시간제독립반(1:2)', nm: '시간제독립반(1:2)' },
  { cd: '장애아기본반', nm: '장애아기본반' },
  { cd: '장애아방과후반', nm: '장애아방과후반' },
  { cd: '누리장애아반', nm: '누리장애아반' },
]
/** cd → nm 빠른 조회 (표시용). 실측 코드(003 등)와 이름코드(방과후반 등) 모두 커버. */
const AGE_CODE_MAP: Record<string, string> = Object.fromEntries(AGE_OPTIONS.map(o => [o.cd, o.nm]))
/** nm → cd 역조회 — 보육통합 반유형 라벨('3세아 반')을 통합e AGE_CD('003')로 맞출 때 쓴다. */
const AGE_NAME_MAP: Record<string, string> = Object.fromEntries(AGE_OPTIONS.map(o => [o.nm, o.cd]))
/** 연령(AGE_CD) → 나열 순서 인덱스 — 표를 0세아→1세아→2세아… 순으로 정렬(딱 봐도 연령 순) */
const AGE_ORDER: Record<string, number> = Object.fromEntries(AGE_OPTIONS.map((o, i) => [o.cd, i]))

/** 표 컬럼 정렬 키. 연령은 AGE_ORDER(0세→1세…) 기준, 나머지는 한글 가나다. */
type SortKey = 'clas' | 'nrtr' | 'age' | 'status'
const SORT_CMP: Record<SortKey, (a: IncheonClas, b: IncheonClas) => number> = {
  clas:   (a, b) => (a.CLAS_NM || '').localeCompare(b.CLAS_NM || '', 'ko'),
  nrtr:   (a, b) => (a.CLAS_NM_NRTR || '').localeCompare(b.CLAS_NM_NRTR || '', 'ko'),
  age:    (a, b) => (AGE_ORDER[a.AGE_CD] ?? 999) - (AGE_ORDER[b.AGE_CD] ?? 999),
  status: (a, b) => (a.STTUS || '').localeCompare(b.STTUS || ''),
}

/** 보육통합(CIS) 반정보 한 줄 — 인천시 반(IncheonClas)과 별개 저장(incheon-cis-clas). */
type CisClas = { name: string; type: string; cur: number; left: number; total: number; _year?: string }

/**
 * 선택 보육년도(cisYear, 3/1~익2/28)에 '속한' CIS 아동으로 반 목록 도출(순수 함수 — 저장/미리보기 공용).
 *  - 현원 → 현재 보육년도 / 퇴소 → 퇴소한 그 보육년도(퇴소일, 없으면 서비스시작일).
 *  - 반명/반유형은 '[1][ 4.5세이상 반 ] 푸른하늘26' → 유형 '4,5세이상 반'(‘.’→‘,’) + 반명 '푸른하늘26'.
 */
function deriveCisClasses(cisChildren: Array<Record<string, unknown>>, cisYear: string): CisClas[] {
  const Y = Number(cisYear) || new Date().getFullYear()
  const now = new Date()
  const curFY = now.getMonth() + 1 >= 3 ? now.getFullYear() : now.getFullYear() - 1
  const d8 = (v: unknown) => Number(String(v ?? '').replace(/\D/g, '').slice(0, 8)) || 0
  const fyOf = (n: number): number | null => {
    if (!n) return null
    const y = Math.floor(n / 10000), mo = Math.floor((n % 10000) / 100)
    return mo >= 3 ? y : y - 1
  }
  const m = new Map<string, { type: string; total: Set<string>; withdrawn: Set<string> }>()
  for (const c of cisChildren) {
    const isW = String(c.status) === '퇴소'
    let belongFY: number | null
    if (!isW) {
      belongFY = curFY
    } else {
      const rawStart = String((c._raw as Record<string, unknown> | undefined)?.serviceStartDate ?? '')
      belongFY = fyOf(d8(c.leaveDate) || d8(rawStart))
    }
    if (belongFY !== Y) continue
    const key = String(c._key || `${c.name ?? ''}|${c.birth ?? ''}`)
    for (const raw of [c.generalClassId, c.holidayClassId, c.extendedClassId, c.nightClassId, c.nightCareClassId]) {
      const s2 = String(raw ?? '').trim()
      if (!s2 || ['없음', '미배정', '해당없음', '-'].includes(s2)) continue
      const mm = s2.match(/\]\s*\[\s*([^\]]*?)\s*\]\s*(.*)$/)
      const type = (mm ? mm[1].trim() : '').replace(/\./g, ',')
      const name = (mm ? mm[2].trim() : s2) || s2
      if (!name || ['없음', '미배정', '해당없음', '-'].includes(name)) continue
      let e = m.get(name)
      if (!e) { e = { type: '', total: new Set(), withdrawn: new Set() }; m.set(name, e) }
      if (!e.type && type) e.type = type
      e.total.add(key)
      if (isW) e.withdrawn.add(key)
    }
  }
  return Array.from(m, ([name, v]) => ({
    name, type: v.type,
    cur: v.total.size - v.withdrawn.size, left: v.withdrawn.size, total: v.total.size,
  })).sort((a, b) => a.name.localeCompare(b.name, 'ko'))
}

const CLAS_STATUS: Array<{ cd: string; nm: string }> = [
  { cd: '000', nm: '사용' },
  { cd: '999', nm: '미사용' },
]
const STTUS_LABEL: Record<string, string> = Object.fromEntries(CLAS_STATUS.map(s => [s.cd, s.nm]))

/** 보육년도 선택지 — 올해 기준 위로 1년(예산 미리작성) + 아래로 4년 */
const YEAR_OPTIONS: string[] = (() => {
  const y = new Date().getFullYear()
  return Array.from({ length: 6 }, (_, i) => String(y + 1 - i))
})()

type NewClas = { key: number; CLAS_NM: string; CLAS_NM_NRTR: string; AGE_CD: string; STTUS: string; RM: string }

export default function ClassPage() {
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [rows, setRows] = useState<IncheonClas[]>([])
  const [codes, setCodes] = useState<IncheonCode[]>([])
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [msg, setMsg] = useState('')
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [checked, setChecked] = useState<Set<number>>(new Set())
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'age', dir: 1 }) // 기본=연령 순

  const [edits, setEdits] = useState<Record<number, Partial<IncheonClas>>>({})
  const [news, setNews] = useState<NewClas[]>([])
  const [saving, setSaving] = useState(false)
  const dirtyCount = Object.keys(edits).length + news.length

  // 반정보 참고 팝업 — 'cis'(보육통합) / 'incheon'(인천시). 반정보추가(신규등록)는 팝업과 무관한 공통 기본.
  const [popup, setPopup] = useState<null | 'cis' | 'incheon'>(null)
  const [cisLoading, setCisLoading] = useState(false)
  // 보육통합 반정보(저장분, incheon-cis-clas) — **전 연도**를 담는다(각 행 _year). 인천시와 별개 필드.
  const [cisClasStore, setCisClasStore] = useState<CisClas[]>([])
  // ★ 등록여부 비교용 통합e 반정보(incheon-clas) — **연도별**. 같은 연도끼리만 비교해야
  //   '아기별꽃26'(2026) 과 '아기별꽃24'(2024) 가 섞여 오판되지 않는다.
  const [cisCmpByYear, setCisCmpByYear] = useState<Record<string, IncheonClas[]>>({})
  const [cisRegBusy, setCisRegBusy] = useState(false)
  const [srcClasStore, setSrcClasStore] = useState<IncheonClas[]>([]) // 인천시 반정보 참조본(incheon-src-clas) — 통합e 작업본과 별개
  // 메인 표 [CIS] 뱃지용 — 조회연도의 보육통합 반명 집합(load 에서 채움). 팝업용 cisClasStore 와 별개.
  const [cisNamesOfYear, setCisNamesOfYear] = useState<Set<string>>(new Set())
  // 메인 표 [보육통합 원아수] 컬럼용 — 보육통합 반명 → 그 반의 실제 원아 카운트(현원/퇴소/계).
  // CIS 아동의 배정 반에서 도출된 값이라 통합e 가 임의로 만든 숫자가 아니다(deriveCisClasses 참조).
  const [cisCountByName, setCisCountByName] = useState<Map<string, CisClas>>(new Map())

  /*
   * 인천시 로그인 세션 — [인천형] 뱃지 클릭으로 등록한다.
   * ⚠ 여기서 보는 건 "세션쿠키가 저장돼 있는가"(exists)지 "지금 살아있는가"가 아니다.
   *   살아있는지는 통합e 의 keepalive 프로브가 20분마다 따로 판정한다. 그래서 뱃지에는
   *   '등록됨 + 저장시각'만 쓰고, 만료된 것 같으면 다시 눌러 재로그인하도록 안내한다.
   */
  const [incheonSession, setIncheonSession] = useState<{ exists: boolean; savedAt?: string } | null>(null)
  const [incheonLoginBusy, setIncheonLoginBusy] = useState(false)

  const reloadIncheonSession = useCallback(async () => {
    try {
      const j = await fetch('/api/incheon/session-status').then(r => r.json())
      setIncheonSession(j.success ? { exists: !!j.exists, savedAt: j.savedAt } : { exists: false })
    } catch { setIncheonSession({ exists: false }) }
  }, [])
  useEffect(() => { reloadIncheonSession() }, [reloadIncheonSession])

  /**
   * [인천형] 뱃지 클릭 — 인천시 공동인증서(UniSign) 로그인 → 이어서 아동관리 > 반설정 화면까지 이동.
   * 화면은 원장님 PC 브라우저(에이전트가 띄운 창)에 열린다.
   * ⚠ 로컬 에이전트 경유라 로그인만 최대 5분, 화면 이동에 추가로 수십 초 걸린다.
   *   로그인은 됐는데 이동만 실패할 수 있어(탭 라벨 변동 등) 두 단계를 따로 보고한다.
   */
  const handleIncheonLogin = useCallback(async () => {
    if (incheonLoginBusy) return
    if (!confirm('인천시에 공동인증서로 로그인한 뒤 [아동관리 > 반설정] 화면까지 엽니다.\n원장님 PC의 로컬 에이전트를 통해 실행되며 최대 5분까지 걸립니다.\n\n계속할까요?')) return
    setIncheonLoginBusy(true)
    setMsg('⏳ 인천시 로그인 중… (에이전트가 인증서로 로그인합니다, 최대 5분)')
    try {
      const res = await fetch('/api/incheon/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ useSavedCert: true }),
      })
      const j = await res.json().catch(() => ({}))
      if (!j.success) {
        if (j.agentOffline) setMsg('❌ 로컬 에이전트가 꺼져 있습니다. 원장님 PC에서 에이전트를 켠 뒤 다시 시도해주세요.')
        else setMsg(`❌ 인천시 로그인 실패 — ${j.error || '알 수 없는 오류'}`)
        return
      }
      await reloadIncheonSession()

      // 로그인 성공 → 아동관리 > 반설정 이동. 여기서 실패해도 세션 자체는 이미 등록된 상태다.
      setMsg('✅ 로그인 완료 — ⏳ [아동관리 > 반설정] 화면 여는 중…')
      const nav = await fetch('/api/incheon/navigate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ menuName: '반관리' }),
      }).then(r => r.json()).catch(() => ({}))

      if (nav.success) {
        setMsg('✅ 인천시 [아동관리 > 반설정] 화면을 열었습니다. (원장님 PC 브라우저를 확인해주세요)')
      } else {
        setMsg(`⚠ 세션 등록은 완료됐지만 화면 이동에 실패했습니다 — ${nav.error || '알 수 없는 오류'}`)
      }
    } catch {
      setMsg('❌ 통합e 서버에 연결할 수 없습니다.')
    } finally {
      setIncheonLoginBusy(false)
    }
  }, [incheonLoginBusy, reloadIncheonSession])

  /** [인천형] 뱃지 툴팁 — 세션 등록 여부·저장시각을 같이 보여준다 */
  const incheonBadgeTitle = incheonLoginBusy
    ? '인천시 로그인 중…'
    : incheonSession?.exists
      ? `인천시 반정보에도 같은 반명이 있습니다.\n인천시 세션 등록됨${incheonSession.savedAt ? ` (${new Date(incheonSession.savedAt).toLocaleString('ko-KR')})` : ''}\n클릭하면 다시 로그인하고 [아동관리 > 반설정] 화면을 엽니다.`
      : '인천시 반정보에도 같은 반명이 있습니다.\n인천시 세션이 등록돼 있지 않습니다 — 클릭하면 인증서로 로그인하고 [아동관리 > 반설정] 화면을 엽니다.'

  // 반 추가 팝업 — 여러 반을 표로 입력 → clasAdds 저장. 자동채움: 보육통합/인천시 반에서 세팅.
  const addKeyRef = useRef(1)
  const [addOpen, setAddOpen] = useState(false)
  const [addRows, setAddRows] = useState<NewClas[]>([])
  const [addBusy, setAddBusy] = useState(false)
  const [addYear, setAddYear] = useState(year)   // 반 추가 팝업의 저장 대상 보육년도

  /**
   * 연령 코드 후보 — 인천시 공통코드에서 찾는다.
   * 어느 CD_GRP 가 연령인지는 실 데이터의 AGE_CD 값이 그 그룹의 CD 에 들어있는지로 판정
   * (그룹명을 추측하지 않기 위함). 못 찾으면 빈 배열 → 연령은 원본코드 텍스트로만 표시.
   */
  const ageCodes = useMemo(() => {
    if (codes.length === 0) return []
    const used = new Set(rows.map(r => r.AGE_CD).filter(Boolean))
    if (used.size === 0) return []
    const byGrp = new Map<string, IncheonCode[]>()
    for (const c of codes) {
      if (!byGrp.has(c.CD_GRP)) byGrp.set(c.CD_GRP, [])
      byGrp.get(c.CD_GRP)!.push(c)
    }
    let best: IncheonCode[] = []
    let bestHit = 0
    for (const list of byGrp.values()) {
      const cds = new Set(list.map(c => c.CD))
      const hit = Array.from(used).filter(u => cds.has(u)).length
      if (hit > bestHit) { bestHit = hit; best = list }
    }
    // 실제 쓰이는 코드를 과반 이상 설명하는 그룹만 채택 — 우연히 겹친 그룹 오채택 방지
    if (bestHit >= Math.ceil(used.size / 2)) return best
    // 공통코드 API 미저장 → 인천시 실측 상수표(AGE_CODE_MAP)로 폴백. 실제 쓰이는 코드 + 표준 코드 노출.
    const codeSet = new Set([...used, ...Object.keys(AGE_CODE_MAP)])
    return Array.from(codeSet).sort().map(cd => ({ CD_GRP: 'AGE', CD: cd, CD_NM: AGE_CODE_MAP[cd] ?? cd }))
  }, [codes, rows])

  const ageLabel = useCallback((cd: string): string => {
    // 우리가 인천시 [반 추가] 드롭다운에서 확정한 이름을 우선(콤마 표기).
    // 공통코드는 여기에 없는 낯선 코드일 때만 폴백.
    return AGE_CODE_MAP[cd] ?? ageCodes.find(c => c.CD === cd)?.CD_NM ?? (cd || '-')
  }, [ageCodes])

  const editField = (sn: number, field: keyof IncheonClas, value: string) => {
    setEdits(prev => {
      const orig = rows.find(r => r.CLAS_SN === sn)
      const nextRow = { ...(prev[sn] || {}), [field]: value }
      const changed = (Object.keys(nextRow) as Array<keyof IncheonClas>)
        .some(k => String(nextRow[k] ?? '') !== String(orig?.[k] ?? ''))
      const next = { ...prev }
      if (changed) next[sn] = nextRow
      else delete next[sn]
      return next
    })
  }
  const valueOf = (c: IncheonClas, field: keyof IncheonClas): string => {
    const e = edits[c.CLAS_SN]
    if (e && field in e) return String(e[field] ?? '')
    return String(c[field] ?? '')
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/incheon/children?year=${year}`)
      const j = await res.json()
      if (j.success) {
        setRows((j.clasList || []) as IncheonClas[])
        setSrcClasStore((j.srcClasList || []) as IncheonClas[])
        // 메인 표 [CIS] 뱃지 + [보육통합 원아수] 컬럼용 — 이 조회연도에 보육통합 반정보로 저장된 반.
        // (팝업의 cisClasStore 는 전 연도를 담으므로 덮어쓰지 않고 별도로 둔다)
        const cisOfYear = (j.cisClasList || []) as CisClas[]
        setCisNamesOfYear(new Set(cisOfYear.map(c => (c.name || '').trim())))
        setCisCountByName(new Map(cisOfYear.map(c => [(c.name || '').trim(), c])))
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

  /** 저장 — 수정 + 신규. 통합e 저장소만 갱신(인천시 원본은 안 바뀜) */
  const handleSave = async () => {
    if (dirtyCount === 0) return
    const valid = news.filter(n => n.CLAS_NM.trim() !== '')
    if (news.length > 0 && valid.length !== news.length) {
      setMsg('❌ 새 반의 반명을 입력해주세요.')
      return
    }
    setSaving(true); setMsg('')
    try {
      const res = await fetch('/api/incheon/children', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year,
          clasEdits: Object.entries(edits).map(([sn, patch]) => ({ CLAS_SN: Number(sn), ...patch })),
          clasAdds: valid.map(({ key: _key, ...rest }) => rest),  // eslint-disable-line @typescript-eslint/no-unused-vars
        }),
      })
      const j = await res.json()
      if (j.success) {
        const parts = [j.updated ? `수정 ${j.updated}` : '', j.added ? `추가 ${j.added}` : ''].filter(Boolean).join(' · ')
        setMsg(`💾 ${parts} 저장 (통합e 에만 저장 — 인천시 원본은 그대로입니다)`)
        setEdits({}); setNews([])
        await load()
      } else {
        setMsg(`❌ ${j.error || '저장 실패'}`)
      }
    } catch {
      setMsg('❌ 통합e 서버에 연결할 수 없습니다.')
    } finally {
      setSaving(false)
    }
  }

  /** 반 삭제 — 통합e 저장분에서 삭제(인천시 반 포함). 인천시 원본은 못 지워서 다음 [업데이트] 때 되살아남 */
  const handleDelete = async () => {
    const targets = filtered.filter(c => checked.has(c.CLAS_SN))
    if (targets.length === 0) { setMsg('삭제할 반을 선택해주세요.'); return }
    const remoteCount = targets.filter(c => !c._local).length
    const warn = remoteCount > 0
      ? `\n\n⚠ 이 중 ${remoteCount}개는 인천시에서 가져온 반입니다. 통합e 저장분에서만 지워지고 인천시 원본은 그대로라, [🏛 인천시 반정보 → 업데이트]를 다시 누르면 되살아납니다.`
      : ''
    if (!confirm(`반 ${targets.length}개를 삭제합니다.${warn}\n\n계속할까요?`)) return
    setSaving(true)
    try {
      const res = await fetch('/api/incheon/children', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year, clasDeletes: targets.map(c => c.CLAS_SN) }),
      })
      const j = await res.json()
      if (j.success) {
        setMsg(`🗑 ${j.deleted}개 반 삭제`)
        setChecked(new Set())
        await load()
      } else {
        setMsg(`❌ ${j.error || '삭제 실패'}`)
      }
    } catch {
      setMsg('❌ 통합e 서버에 연결할 수 없습니다.')
    } finally {
      setSaving(false)
    }
  }

  /**
   * [🏛 인천시 반정보 → 🔄 업데이트] — 인천시 시스템의 현재 반 목록을 "참조 스냅샷"(incheon-src-clas)에만
   * 저장한다. ★ 통합e 작업본(메인 표=incheon-clas)은 절대 안 건드린다(사용자 확정: 자동저장 금지).
   * 통합e 반정보로 가져오려면 [+ 반정보추가 → 🏛 인천시 반정보 세팅]으로 사용자가 명시적으로 복사한다.
   */
  const handleSync = async () => {
    setSyncing(true); setMsg('인천시 반정보 조회 중… (로컬 에이전트 경유, 수십 초 걸립니다)')
    try {
      const res = await fetch('/api/incheon/children', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year, clasTarget: 'src' }),   // ★ 통합e 작업본 말고 참조 스냅샷에만 저장
      })
      const j = await res.json()
      if (j.success) {
        const per = j.perYear && typeof j.perYear === 'object'
          ? Object.entries(j.perYear as Record<string, number>)
              .sort((a, b) => b[0].localeCompare(a[0])).map(([y, n]) => `${y}년 ${n}개`).join(' · ')
          : `${j.srcClasCount}개`
        setMsg(`✅ 인천시 반정보 조회 — ${per} (통합e 반정보는 그대로 — 자동저장 안 함)`)
        await load()
      } else {
        setMsg(`❌ ${j.error || '인천시 반정보 조회 실패'}`)
      }
    } catch {
      setMsg('❌ 통합e 서버에 연결할 수 없습니다.')
    } finally {
      setSyncing(false)
    }
  }

  /** [🏛 인천시 반정보 → 🗑 삭제] — 참조 스냅샷(incheon-src-clas)만 삭제(표시 중인 연도 전부). 통합e 작업본은 무관. */
  const handleSrcDelete = async () => {
    if (srcClasStore.length === 0) { setMsg('삭제할 인천시 반정보가 없습니다.'); return }
    const yrs = srcClasYears.map(([y]) => y)
    if (!confirm(`인천시 반정보(참조본)를 삭제합니다.\n대상 연도: ${yrs.join(', ')} · 총 ${srcClasStore.length}개\n(통합e 반정보(메인 표)와는 별개라 메인 표엔 영향 없습니다)\n\n계속할까요?`)) return
    try {
      let total = 0
      for (const y of yrs) {
        const res = await fetch('/api/incheon/children', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ year: y, srcClasClear: true }),
        })
        const j = await res.json()
        if (j.success) total += Number(j.srcCleared || 0)
        else { setMsg(`❌ ${j.error || '삭제 실패'}`); return }
      }
      setMsg(`🗑 인천시 반정보 ${total}개 삭제 (${yrs.join(', ')}년)`)
      await load()
    } catch {
      setMsg('❌ 통합e 서버에 연결할 수 없습니다.')
    }
  }

  /**
   * 보육통합(CIS) 아동 조회 — 통합e 가 수집한 CIS 아동(/api/sync/children, 현원+퇴소).
   * CIS 반 전용 조회 API 가 없어 아동의 배정 반(generalClassId 등)에서 반 목록을 도출한다.
   * 연도 필터는 재조회 없이 클라이언트(useMemo)에서 처리하므로 여기선 원본만 저장한다.
   */
  /**
   * 저장된 보육통합 반정보(incheon-cis-clas)를 **모든 보육년도** 로드 (2026-07-20 사용자 요청).
   *
   * 옛날엔 드롭다운으로 고른 한 해만 봤는데, 연도를 바꿔가며 [조회]를 반복해야 해서 불편했다.
   * 인천시 반정보 팝업처럼 **전 연도를 한 번에 불러 연도별로 정렬해 보여주고, 등록은 수기로** 한다.
   * 같은 응답의 통합e 작업본(clasList)도 연도별로 받아둔다 — 행별 [등록] 버튼의 등록여부 판정용.
   */
  const loadAllCisStore = useCallback(async () => {
    const pairs = await Promise.all(YEAR_OPTIONS.map(y =>
      fetch(`/api/incheon/children?year=${y}`)
        .then(r => r.json())
        .then(j => [y, (j?.cisClasList || []) as CisClas[], (j?.clasList || []) as IncheonClas[]] as const)
        .catch(() => [y, [] as CisClas[], [] as IncheonClas[]] as const)))
    const all: CisClas[] = []
    const cmp: Record<string, IncheonClas[]> = {}
    for (const [y, cisList, clasList] of pairs) {
      cmp[y] = clasList
      for (const c of cisList) all.push({ ...c, _year: String(c._year || y) })
    }
    setCisClasStore(all)
    setCisCmpByYear(cmp)
  }, [])

  /** 보육통합 반정보를 보육년도별로 그룹핑 (최신 연도부터, 연도 안은 연령순) — 인천시 팝업과 동일 배치 */
  const cisClasYears = useMemo(() => {
    const m = new Map<string, CisClas[]>()
    for (const c of cisClasStore) {
      const y = String(c._year ?? '')
      if (!m.has(y)) m.set(y, [])
      m.get(y)!.push(c)
    }
    for (const list of m.values()) {
      list.sort((a, b) =>
        (AGE_ORDER[AGE_NAME_MAP[a.type] ?? a.type] ?? 999) - (AGE_ORDER[AGE_NAME_MAP[b.type] ?? b.type] ?? 999)
        || a.name.localeCompare(b.name, 'ko'))
    }
    return Array.from(m.entries()).sort((a, b) => b[0].localeCompare(a[0]))  // 최신 연도 먼저
  }, [cisClasStore])

  /** 보육통합 반유형 라벨 → 통합e AGE_CD. 목록에 없는 낯선 라벨은 라벨 자체를 코드로 쓴다(AGE_OPTIONS 관례). */
  const cisAgeCd = useCallback((type: string): string => AGE_NAME_MAP[type] ?? (type || ''), [])

  /**
   * 보육통합 반이 통합e 반정보(incheon-clas)에 이미 등록됐는지 판정.
   *   'same' → 반명 매칭 + 연령까지 일치 → 재등록 불필요(회색 비활성)
   *   'diff' → 반명은 있는데 연령이 다름 → [업데이트](연령·반명을 보육통합 기준으로 맞춤)
   *   'none' → 통합e 에 없음 → [등록]
   * ⚠ 매칭은 **통합e 의 '보육통합 반명'(CLAS_NM_NRTR) 과 정확히 일치**할 때만 같은 반으로 본다.
   *   옛 코드는 CLAS_NM 또는 CLAS_NM_NRTR 중 하나만 같아도 매칭해서, 보육통합 반명이
   *   '예쁜새싹261'(1 더 붙은 오타)인데 반명 '예쁜새싹26' 이 같다는 이유로 [등록됨]으로 잠겼다.
   *   글자가 한 자라도 다르면 다른 반 → [＋ 등록] 이 떠야 한다.
   */
  const cisRegState = useCallback((cl: CisClas): { state: 'same' | 'diff' | 'none'; row?: IncheonClas } => {
    const nm = (cl.name || '').trim()
    if (!nm) return { state: 'none' }
    const y = String(cl._year ?? '')
    const row = (cisCmpByYear[y] || []).find(r => (r.CLAS_NM_NRTR || '').trim() === nm)  // 같은 연도끼리만
    if (!row) return { state: 'none' }
    return { state: (row.AGE_CD || '') === cisAgeCd(cl.type) ? 'same' : 'diff', row }
  }, [cisCmpByYear, cisAgeCd])

  /** 아직 통합e 에 반영 안 된 보육통합 반(등록 필요 + 연령 불일치) — [일괄등록] 대상 */
  const cisPending = useMemo(
    () => cisClasStore.filter(cl => cisRegState(cl).state !== 'same'),
    [cisClasStore, cisRegState],
  )

  /**
   * 보육통합 반을 통합e 반정보로 등록/갱신.
   *  - 없으면 clasAdds(신규), 연령이 다르면 clasEdits(갱신)
   *  - **반명은 보육통합 기준으로 통일** — CLAS_NM 과 CLAS_NM_NRTR 을 모두 보육통합 반명으로 맞춘다
   *  - **연도별로 나눠 저장** — 팝업이 전 연도를 한 화면에 보여주므로 각 반은 자기 `_year` 에 들어간다
   */
  const registerCisClasses = useCallback(async (targets: CisClas[]) => {
    const byYear = new Map<string, { adds: Array<Record<string, string>>; upds: Array<Record<string, unknown>> }>()
    for (const cl of targets) {
      const y = String(cl._year ?? '')
      if (!y) continue
      const { state, row } = cisRegState(cl)
      if (state === 'same') continue
      if (!byYear.has(y)) byYear.set(y, { adds: [], upds: [] })
      const b = byYear.get(y)!
      const AGE_CD = cisAgeCd(cl.type)
      if (state === 'none') {
        b.adds.push({ CLAS_NM: cl.name, CLAS_NM_NRTR: cl.name, AGE_CD, STTUS: '000', RM: '', _src: 'cis' })
      } else if (row) {
        b.upds.push({ CLAS_SN: row.CLAS_SN, CLAS_NM: cl.name, CLAS_NM_NRTR: cl.name, AGE_CD, _src: 'cis' })
      }
    }
    if (!byYear.size) { setMsg('등록할 반이 없습니다 — 모두 등록되어 있습니다.'); return }
    setCisRegBusy(true)
    try {
      let added = 0, updated = 0
      for (const [y, b] of byYear) {
        const res = await fetch('/api/incheon/children', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ year: y, clasAdds: b.adds, clasEdits: b.upds }),
        })
        const j = await res.json()
        if (!j.success) { setMsg(`❌ ${y}년: ${j.error || '등록 실패'}`); return }
        added += Number(j.added || 0); updated += Number(j.updated || 0)
      }
      const yrs = Array.from(byYear.keys())
      const parts = [added ? `등록 ${added}` : '', updated ? `갱신 ${updated}` : ''].filter(Boolean).join(' · ')
      setMsg(`💾 통합e 반정보에 ${parts} (${yrs.join(', ')}년) — 인천시 원본은 그대로입니다`)
      await loadAllCisStore()                 // 버튼이 즉시 '등록됨'으로 바뀌게 재로드
      if (yrs.includes(year)) await load()    // 뒤 화면 메인 표도 같은 연도면 같이 갱신
    } catch {
      setMsg('❌ 통합e 서버에 연결할 수 없습니다.')
    } finally {
      setCisRegBusy(false)
    }
  }, [cisRegState, cisAgeCd, year, loadAllCisStore, load])

  /**
   * [🔄 업데이트](보육통합) — CIS 아동을 **한 번만** 조회해 **모든 보육년도**의 반을 도출·저장한다
   * (2026-07-20 사용자 요청: "업데이트 클릭시 모든 연도 내역을 호출 상태로 유지").
   * 인천시(incheon-clas)는 전혀 안 건드림.
   *
   * ⚠ 도출 결과가 0개인 연도는 **저장을 건너뛴다** — cisClasSave 는 그 연도 스냅샷 전체 교체라,
   *   CIS 가 과거 아동을 안 주는 상황에서 저장하면 멀쩡한 과거 연도가 통째로 비워진다.
   *   비우려면 [🗑 삭제]를 쓴다.
   */
  const handleCisUpdate = useCallback(async () => {
    setCisLoading(true)
    try {
      const res = await fetch('/api/sync/children', { cache: 'no-store' })
      const j = res.ok ? await res.json() : null
      const children = (j?.children || []) as Array<Record<string, unknown>>
      const done: string[] = []
      for (const y of YEAR_OPTIONS) {
        const derived = deriveCisClasses(children, y)
        if (!derived.length) continue          // 그 해 재원 아동 없음 → 기존 저장분 보존
        const save = await fetch('/api/incheon/children', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ year: y, cisClasSave: derived }),
        })
        const sj = await save.json()
        if (!sj.success) { setMsg(`❌ ${y}년: ${sj.error || '보육통합 저장 실패'}`); return }
        done.push(`${y}년 ${derived.length}개`)
      }
      await loadAllCisStore()
      setMsg(done.length ? `💾 보육통합 반정보 저장 — ${done.join(' · ')}` : '도출된 반이 없습니다 (CIS 아동 없음)')
    } catch {
      setMsg('❌ 통합e 서버에 연결할 수 없습니다.')
    } finally {
      setCisLoading(false)
    }
  }, [loadAllCisStore])

  /** 보육통합 반정보 삭제 — 표시 중인 모든 연도. 인천시 반과 완전 별개라 인천시엔 영향 없음 */
  const handleCisDelete = useCallback(async () => {
    if (cisClasStore.length === 0) { setMsg('삭제할 보육통합 반정보가 없습니다.'); return }
    const yrs = cisClasYears.map(([y]) => y)
    if (!confirm(`보육통합 반정보를 삭제합니다.\n대상 연도: ${yrs.join(', ')} · 총 ${cisClasStore.length}개\n(인천시 반정보와는 별개라 인천시엔 영향 없습니다)\n\n계속할까요?`)) return
    try {
      let total = 0
      for (const [y, list] of cisClasYears) {
        const res = await fetch('/api/incheon/children', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ year: y, cisClasDeletes: list.map(c => c.name) }),
        })
        const j = await res.json()
        if (!j.success) { setMsg(`❌ ${y}년: ${j.error || '삭제 실패'}`); return }
        total += Number(j.cisDeleted || 0)
      }
      await loadAllCisStore()
      setMsg(`🗑 보육통합 반정보 ${total}개 삭제 (${yrs.join(', ')}년)`)
    } catch {
      setMsg('❌ 통합e 서버에 연결할 수 없습니다.')
    }
  }, [cisClasStore, cisClasYears, loadAllCisStore])

  // 보육통합 팝업 열리면 전 연도 저장분을 로드 (연도 드롭다운 없이 한 번에)
  useEffect(() => { if (popup === 'cis') loadAllCisStore() }, [popup, loadAllCisStore])

  /** 인천시 반정보 참조본을 보육년도별로 그룹핑 (최신 연도부터) — 인천시 반설정 화면처럼 분리 표시 */
  const srcClasYears = useMemo(() => {
    const m = new Map<string, IncheonClas[]>()
    for (const c of srcClasStore) {
      if (c.DEL_AT === 'Y') continue
      const y = String((c as unknown as { _year?: string })._year ?? '')
      if (!m.has(y)) m.set(y, [])
      m.get(y)!.push(c)
    }
    for (const list of m.values()) {
      list.sort((a, b) =>
        (AGE_ORDER[a.AGE_CD] ?? 999) - (AGE_ORDER[b.AGE_CD] ?? 999)
        || (a.CLAS_NM || '').localeCompare(b.CLAS_NM || '', 'ko'))
    }
    return Array.from(m.entries()).sort((a, b) => b[0].localeCompare(a[0]))  // 최신 연도 먼저
  }, [srcClasStore])

  // ─── 인천시 반정보 → 통합e 반정보 등록 (보육통합 팝업과 동일 프로세스) ───
  /**
   * 등록여부 판정용 통합e 반정보(incheon-clas) — **연도별**.
   * 보육통합 팝업은 한 연도만 보지만 인천시 팝업은 최근 3년치를 한 화면에 보여주므로 연도별로 들고 있는다.
   */
  const [srcCmpByYear, setSrcCmpByYear] = useState<Record<string, IncheonClas[]>>({})
  const [srcRegBusy, setSrcRegBusy] = useState(false)

  const fetchClasByYears = useCallback(async (yrs: string[]) => {
    const pairs = await Promise.all(yrs.map(y =>
      fetch(`/api/incheon/children?year=${y}`)
        .then(r => r.json())
        .then(j => [y, (j?.clasList || []) as IncheonClas[]] as const)
        .catch(() => [y, [] as IncheonClas[]] as const)))
    return Object.fromEntries(pairs) as Record<string, IncheonClas[]>
  }, [])

  useEffect(() => {
    if (popup !== 'incheon') return
    const yrs = srcClasYears.map(([y]) => y).filter(Boolean)
    if (!yrs.length) { setSrcCmpByYear({}); return }
    let cancelled = false
    fetchClasByYears(yrs).then(m => { if (!cancelled) setSrcCmpByYear(m) })
    return () => { cancelled = true }
  }, [popup, srcClasYears, fetchClasByYears])

  /**
   * 인천시 반이 통합e 에 등록됐는지 — 같은 연도끼리, **반명(CLAS_NM)이 정확히 일치**할 때만 같은 반.
   * ⚠ 보육통합과 마찬가지로 CLAS_NM/CLAS_NM_NRTR 을 섞어 매칭하면 안 된다(한 자만 달라도 다른 반).
   */
  const srcRegState = useCallback((c: IncheonClas): { state: 'same' | 'diff' | 'none'; row?: IncheonClas } => {
    const y = String((c as unknown as { _year?: string })._year ?? '')
    const nm = (c.CLAS_NM || '').trim()
    if (!nm) return { state: 'none' }
    const row = (srcCmpByYear[y] || []).find(r => (r.CLAS_NM || '').trim() === nm)
    if (!row) return { state: 'none' }
    return { state: (row.AGE_CD || '') === (c.AGE_CD || '') ? 'same' : 'diff', row }
  }, [srcCmpByYear])

  /** 아직 통합e 에 반영 안 된 인천시 반 — [일괄등록] 대상(표시 중인 모든 연도) */
  const srcPending = useMemo(
    () => srcClasStore.filter(c => c.DEL_AT !== 'Y' && srcRegState(c).state !== 'same'),
    [srcClasStore, srcRegState],
  )

  /**
   * 인천시 반을 통합e 반정보(incheon-clas)로 등록/갱신.
   *  - 없으면 clasAdds, 연령이 다르면 clasEdits — 반명은 인천시 기준으로 통일
   *  - 통합반명(GRP_CLAS_NM)·연령·상태·비고도 함께 복사
   *  - **연도별로 나눠 저장** (인천시 팝업은 최근 3년치를 한 번에 보여준다)
   */
  const registerSrcClasses = useCallback(async (targets: IncheonClas[]) => {
    const byYear = new Map<string, { adds: Array<Record<string, string>>; upds: Array<Record<string, unknown>> }>()
    for (const c of targets) {
      const y = String((c as unknown as { _year?: string })._year ?? '')
      if (!y) continue
      const { state, row } = srcRegState(c)
      if (state === 'same') continue
      if (!byYear.has(y)) byYear.set(y, { adds: [], upds: [] })
      const b = byYear.get(y)!
      const nm = c.CLAS_NM || ''
      if (state === 'none') {
        b.adds.push({
          CLAS_NM: nm, CLAS_NM_NRTR: c.CLAS_NM_NRTR || nm, GRP_CLAS_NM: c.GRP_CLAS_NM || '',
          AGE_CD: c.AGE_CD || '', STTUS: c.STTUS || '000', RM: c.RM || '', _src: 'incheon',
        })
      } else if (row) {
        b.upds.push({
          CLAS_SN: row.CLAS_SN, CLAS_NM: nm, CLAS_NM_NRTR: c.CLAS_NM_NRTR || nm,
          GRP_CLAS_NM: c.GRP_CLAS_NM || '', AGE_CD: c.AGE_CD || '', _src: 'incheon',
        })
      }
    }
    if (!byYear.size) { setMsg('등록할 반이 없습니다 — 모두 등록되어 있습니다.'); return }
    setSrcRegBusy(true)
    try {
      let added = 0, updated = 0
      for (const [y, b] of byYear) {
        const res = await fetch('/api/incheon/children', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ year: y, clasAdds: b.adds, clasEdits: b.upds }),
        })
        const j = await res.json()
        if (!j.success) { setMsg(`❌ ${y}년: ${j.error || '등록 실패'}`); return }
        added += Number(j.added || 0); updated += Number(j.updated || 0)
      }
      const yrs = Array.from(byYear.keys())
      const parts = [added ? `등록 ${added}` : '', updated ? `갱신 ${updated}` : ''].filter(Boolean).join(' · ')
      setMsg(`💾 통합e 반정보에 ${parts} (${yrs.join(', ')}년) — 인천시 원본은 그대로입니다`)
      const fresh = await fetchClasByYears(yrs)              // 버튼이 즉시 '등록됨'으로 바뀌게 재로드
      setSrcCmpByYear(prev => ({ ...prev, ...fresh }))
      if (yrs.includes(year)) await load()                   // 메인 표도 같은 연도면 갱신
    } catch {
      setMsg('❌ 통합e 서버에 연결할 수 없습니다.')
    } finally {
      setSrcRegBusy(false)
    }
  }, [srcRegState, fetchClasByYears, year, load])

  /** 메인 표 [인천형] 뱃지용 — 조회연도의 인천시 반명 집합(참조본 srcClasStore 는 전 연도를 담는다) */
  const srcNamesOfYear = useMemo(() => new Set(
    srcClasStore
      .filter(c => c.DEL_AT !== 'Y' && String((c as unknown as { _year?: string })._year ?? '') === year)
      .map(c => (c.CLAS_NM || '').trim())
  ), [srcClasStore, year])

  // 인천시 화면과 동일 — 삭제된 반(DEL_AT='Y')은 목록에서 제외
  const filtered = rows
    .filter(c => c.DEL_AT !== 'Y')
    .filter(c => search === '' || (c.CLAS_NM || '').includes(search) || (c.GRP_CLAS_NM || '').includes(search))
    .slice()
    // 컬럼 헤더 클릭 정렬(기본=연령 순). 동률이면 반명 가나다순.
    .sort((a, b) =>
      (SORT_CMP[sort.key](a, b) * sort.dir)
      || (a.CLAS_NM || '').localeCompare(b.CLAS_NM || '', 'ko'))

  const toggle = (sn: number) => {
    setChecked(prev => {
      const n = new Set(prev)
      if (n.has(sn)) n.delete(sn); else n.add(sn)
      return n
    })
  }
  const allChecked = filtered.length > 0 && filtered.every(c => checked.has(c.CLAS_SN))

  // 컬럼 헤더 클릭 정렬 — 같은 컬럼 다시 클릭하면 오름/내림 토글
  const toggleSort = (key: SortKey) =>
    setSort(s => s.key === key ? { key, dir: (s.dir === 1 ? -1 : 1) } : { key, dir: 1 })
  const sortArrow = (key: SortKey) => sort.key === key ? (sort.dir === 1 ? ' ▲' : ' ▼') : ''

  // ── 반 추가 팝업 핸들러 ──
  const mkAddRow = (patch: Partial<NewClas> = {}): NewClas =>
    ({ key: addKeyRef.current++, CLAS_NM: '', CLAS_NM_NRTR: '', AGE_CD: '', STTUS: '000', RM: '', ...patch })
  const openAdd = () => { setAddYear(year); setAddRows([mkAddRow()]); setAddOpen(true) }
  const addEmptyRow = () => setAddRows(p => [...p, mkAddRow()])
  const editAddRow = (key: number, field: keyof Omit<NewClas, 'key'>, v: string) =>
    setAddRows(p => p.map(r => r.key === key ? { ...r, [field]: v } : r))
  const removeAddRow = (key: number) => setAddRows(p => p.filter(r => r.key !== key))

  /** ④ 보육통합(CIS) 반으로 빈칸 자동채움 — 선택 보육년도 기준(현원=현재년도 / 퇴소=퇴소한해) */
  const fillFromCis = async (yr = addYear) => {
    setAddBusy(true); setMsg('')
    try {
      const res = await fetch('/api/sync/children', { cache: 'no-store' })
      const j = res.ok ? await res.json() : null
      const kids = (j?.children || []) as Array<Record<string, unknown>>
      const Y = Number(yr) || new Date().getFullYear()
      const now = new Date()
      const curFY = now.getMonth() + 1 >= 3 ? now.getFullYear() : now.getFullYear() - 1
      const d8 = (v: unknown) => Number(String(v ?? '').replace(/\D/g, '').slice(0, 8)) || 0
      const fyOf = (n: number): number | null => { if (!n) return null; const y = Math.floor(n / 10000), mo = Math.floor((n % 10000) / 100); return mo >= 3 ? y : y - 1 }
      const m = new Map<string, string>()
      for (const c of kids) {
        const isW = String(c.status) === '퇴소'
        const belongFY = isW ? fyOf(d8(c.leaveDate) || d8((c._raw as Record<string, unknown> | undefined)?.serviceStartDate)) : curFY
        if (belongFY !== Y) continue
        for (const raw of [c.generalClassId, c.holidayClassId, c.extendedClassId, c.nightClassId, c.nightCareClassId]) {
          const s = String(raw ?? '').trim()
          if (!s || ['없음', '미배정', '해당없음', '-'].includes(s)) continue
          const mm = s.match(/\]\s*\[\s*([^\]]*?)\s*\]\s*(.*)$/)
          const type = (mm ? mm[1].trim() : '').replace(/\./g, ',')
          const name = (mm ? mm[2].trim() : s) || s
          if (!name || ['없음', '미배정', '해당없음', '-'].includes(name)) continue
          if (!m.has(name)) m.set(name, type)
        }
      }
      const built = Array.from(m, ([name, type]) =>
        mkAddRow({ CLAS_NM: name, CLAS_NM_NRTR: name, AGE_CD: AGE_OPTIONS.find(a => a.nm === type)?.cd ?? type, STTUS: '000' }))
      setAddRows(built.length ? built : [mkAddRow()])
      if (built.length === 0) setMsg(`${yr}년 보육년도에 속한 보육통합 반이 없습니다.`)
    } catch { setMsg('❌ 보육통합 반 불러오기 실패') }
    finally { setAddBusy(false) }
  }

  /** ⑤ 인천시 반정보로 자동 세팅 — 인천시 참조본(incheon-src-clas)에서 채움(통합e 반정보로 명시적 복사) */
  const fillFromIncheon = async (yr = addYear) => {
    setAddBusy(true); setMsg('')
    try {
      const res = await fetch(`/api/incheon/children?year=${yr}`)
      const j = res.ok ? await res.json() : null
      // 참조본은 최근 3년치가 통째로 오므로 선택 보육년도(_year)만 골라 쓴다
      const src = ((j?.srcClasList || []) as IncheonClas[])
        .filter(c => c.DEL_AT !== 'Y' && String((c as unknown as { _year?: string })._year ?? '') === String(yr))
      if (src.length === 0) { setMsg(`${yr}년 인천시 반정보가 없습니다. [🏛 인천시 반정보 → 업데이트]로 먼저 조회하세요.`); setAddRows([mkAddRow()]); return }
      setAddRows(src.map(c => mkAddRow({
        CLAS_NM: c.CLAS_NM || '', CLAS_NM_NRTR: c.CLAS_NM_NRTR || '',
        AGE_CD: c.AGE_CD || '', STTUS: c.STTUS || '000', RM: c.RM || '',
      })))
    } catch { setMsg('❌ 인천시 반 불러오기 실패') }
    finally { setAddBusy(false) }
  }

  /** ① 저장 — 반명 있는 행만 clasAdds 로 추가 */
  const handleAddSave = async () => {
    const valid = addRows.filter(r => r.CLAS_NM.trim() !== '')
    if (valid.length === 0) { setMsg('❌ 반명을 입력해주세요.'); return }
    setAddBusy(true); setMsg('')
    try {
      const res = await fetch('/api/incheon/children', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year: addYear,
          clasAdds: valid.map(r => ({ CLAS_NM: r.CLAS_NM, CLAS_NM_NRTR: r.CLAS_NM_NRTR, AGE_CD: r.AGE_CD, STTUS: r.STTUS, RM: r.RM })),
        }),
      })
      const j = await res.json()
      if (j.success) {
        setMsg(`💾 ${addYear}년 반 ${j.added ?? valid.length}개 추가 (통합e 에만 저장 — 인천시 원본은 그대로입니다)`)
        setAddOpen(false)
        // 저장한 연도로 화면 전환(다르면) → 방금 추가한 반이 보이게. 같으면 그냥 새로고침.
        if (addYear !== year) { setEdits({}); setNews([]); setChecked(new Set()); setYear(addYear) }
        else await load()
      }
      else setMsg(`❌ ${j.error || '추가 실패'}`)
    } catch { setMsg('❌ 통합e 서버에 연결할 수 없습니다.') }
    finally { setAddBusy(false) }
  }
  const editNew = (key: number, field: keyof Omit<NewClas, 'key'>, v: string) =>
    setNews(prev => prev.map(n => n.key === key ? { ...n, [field]: v } : n))

  return (
    <div className="p-3 space-y-3">
      <div className="bg-white rounded-xl border border-teal-400/30 shadow-sm">
        <div className="px-4 py-3 border-b border-teal-400/20 flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-bold text-slate-700">반설정</span>
          {/* 보육년도 — 연도별 관리. 변경 시 그 연도 저장분을 조회(각 연도는 독립 저장). */}
          <label className="text-[11px] text-slate-500 flex items-center gap-1">
            보육년도
            <select
              value={year}
              onChange={e => { setYear(e.target.value); setEdits({}); setNews([]); setChecked(new Set()) }}
              className={`${inputCls} !w-20`}
            >
              {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}년</option>)}
            </select>
          </label>

          {/* 검색은 조회 버튼/엔터 방식 — 실시간 검색 금지(프로젝트 UX 규칙) */}
          <form onSubmit={e => { e.preventDefault(); setSearch(searchInput) }} className="flex items-center gap-2 ml-4">
            <select className={`${inputCls} w-20`} defaultValue="반명">
              <option>반명</option>
            </select>
            <input type="text" value={searchInput} onChange={e => setSearchInput(e.target.value)} className={`${inputCls} w-40`} />
            <button type="submit" className="px-3 py-1.5 text-[11px] font-bold text-white bg-teal-500 hover:bg-teal-600 rounded">조회</button>
          </form>

          <div className="ml-auto flex items-center gap-1.5">
            {savedAt && (
              <span className="text-[11px] text-slate-400 mr-1">최근 동기화 {new Date(savedAt).toLocaleString('ko-KR')}</span>
            )}
            <button onClick={openAdd} className="px-3 py-1.5 text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded">
              + 반정보추가
            </button>
            <button
              onClick={handleDelete}
              disabled={saving || checked.size === 0}
              className="px-3 py-1.5 text-[11px] font-bold text-white bg-rose-500 hover:bg-rose-600 disabled:bg-slate-300 rounded"
            >
              🗑 삭제
            </button>
            <button
              onClick={handleSave}
              disabled={saving || dirtyCount === 0}
              className="px-3 py-1.5 text-[11px] font-bold text-white bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 rounded"
            >
              {saving ? '저장 중…' : dirtyCount > 0 ? `💾 저장 (${dirtyCount})` : '💾 저장'}
            </button>
            <button
              onClick={() => { setPopup('cis'); loadAllCisStore() }}
              className="px-3 py-1.5 text-[11px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded"
            >
              📚 보육통합 반정보
            </button>
            <button
              onClick={() => setPopup('incheon')}
              className="px-3 py-1.5 text-[11px] font-bold text-white bg-blue-600 hover:bg-blue-700 rounded"
            >
              🏛 인천시 반정보
            </button>
          </div>
        </div>

        {msg && <div className="px-4 py-2 text-[11px] border-t border-slate-100 text-slate-600 bg-slate-50">{msg}</div>}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-[11px]">
          {/* 컬럼 구성 = 선택/출처/반명/보육통합 반명/연령/상태/비고 (통합반명은 반명과 중복이라 화면에서 제외, GRP_CLAS_NM 데이터는 유지) */}
          <thead><tr className="bg-teal-50 border-b border-slate-300">
            <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-200 w-[45px]">
              <input
                type="checkbox"
                checked={allChecked}
                onChange={() => setChecked(allChecked ? new Set() : new Set(filtered.map(c => c.CLAS_SN)))}
              />
            </th>
            <th
              className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-200 w-[140px]"
              title="이 반이 지금 어느 저장소에 있는지 — 통합e / 보육통합(CIS) / 인천시. 자리는 항상 고정이라 세로로 비교됩니다."
            >출처</th>
            <th onClick={() => toggleSort('clas')} className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-200 w-[255px] cursor-pointer select-none hover:bg-teal-100">반명{sortArrow('clas')}</th>
            <th onClick={() => toggleSort('age')} className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-200 w-[170px] cursor-pointer select-none hover:bg-teal-100">연령{sortArrow('age')}</th>
            <th onClick={() => toggleSort('nrtr')} className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-200 w-[255px] cursor-pointer select-none hover:bg-teal-100">보육통합 반명{sortArrow('nrtr')}</th>
            <th
              className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-200 w-[120px]"
              title="보육통합(CIS) 아동의 배정 반에서 실제로 센 원아 수입니다. 숫자=현원, 괄호=퇴소. 보육통합 반명으로 매칭합니다."
            >보육통합 원아수</th>
            <th onClick={() => toggleSort('status')} className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-200 w-[90px] cursor-pointer select-none hover:bg-teal-100">상태{sortArrow('status')}</th>
            <th className="px-2 py-2 text-center font-bold text-slate-600">비고</th>
          </tr></thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="px-2 py-8 text-center text-slate-400">불러오는 중…</td></tr>
            ) : filtered.length === 0 && news.length === 0 ? (
              <tr><td colSpan={8} className="px-2 py-8 text-center text-slate-400">
                {rows.length === 0
                  ? '저장된 반이 없습니다. [＋ 반정보추가]로 직접 등록하거나 [🏛 인천시 반정보 → 업데이트]를 눌러주세요.'
                  : '검색 결과가 없습니다.'}
              </td></tr>
            ) : filtered.map(c => {
              const dirty = !!edits[c.CLAS_SN]
              return (
              <tr key={c.CLAS_SN} className={`border-b border-slate-100 ${dirty ? 'bg-amber-50' : 'hover:bg-blue-50/40'}`}>
                <td className="px-2 py-1.5 text-center border-r border-slate-100">
                  <input type="checkbox" checked={checked.has(c.CLAS_SN)} onChange={() => toggle(c.CLAS_SN)} />
                </td>
                {/*
                  출처 컬럼 — **배타가 아니라 누적**. 이 반이 지금 어느 저장소에 있는지 다 보여준다.
                    [통합e] 이 표(incheon-clas)에 등록돼 있음 → 항상
                    [CIS]   같은 이름이 보육통합 반정보(incheon-cis-clas)에도 있음
                    [인천형] 같은 이름이 인천시 반정보(incheon-src-clas)에도 있음
                  셋 다 해당되면 뱃지 3개가 함께 뜬다. 등록 경로(_src)가 아니라 **현재 존재 여부**라
                  반명을 고치면 뱃지도 따라 사라진다(그게 대조에 유용).
                */}
                <td className="px-2 py-1 border-r border-slate-100">
                  {/* 슬롯 3칸 고정 — 없는 출처는 빈 칸으로 남겨 세로 정렬이 흐트러지지 않게 한다 */}
                  <div className="grid grid-cols-3 gap-1">
                    <span className={badgeCls('violet')} title="통합e 반정보에 등록된 반">통합e</span>
                    {cisNamesOfYear.has(valueOf(c, 'CLAS_NM_NRTR').trim())
                      ? <span className={badgeCls('indigo')} title="보육통합(CIS) 반정보에도 같은 반명이 있습니다">CIS</span>
                      : <span className={badgeEmptyCls} />}
                    {srcNamesOfYear.has(valueOf(c, 'CLAS_NM').trim())
                      ? (
                        /* 클릭 = 인천시 세션 로그인. 세션 미등록이면 점선 테두리로 눈에 띄게 한다. */
                        <button
                          type="button"
                          onClick={handleIncheonLogin}
                          disabled={incheonLoginBusy}
                          title={incheonBadgeTitle}
                          className={`${badgeCls('blue')} cursor-pointer hover:ring-1 hover:ring-blue-400 disabled:opacity-50 disabled:cursor-wait ${
                            incheonSession && !incheonSession.exists ? 'border border-dashed border-blue-400' : ''
                          }`}
                        >
                          {incheonLoginBusy ? '…' : '인천형'}
                        </button>
                      )
                      : <span className={badgeEmptyCls} />}
                  </div>
                </td>
                <td className="px-1 py-1 border-r border-slate-100">
                  <input value={valueOf(c, 'CLAS_NM')} onChange={e => editField(c.CLAS_SN, 'CLAS_NM', e.target.value)} className={editCls} />
                </td>
                <td className="px-1 py-1 border-r border-slate-100" title={`인천시 원본 코드: ${valueOf(c, 'AGE_CD') || '(없음)'}`}>
                  {/* 인천시 [반 추가] 반구분 드롭다운 순서·이름 그대로 (AGE_OPTIONS) */}
                  <select value={valueOf(c, 'AGE_CD')} onChange={e => editField(c.CLAS_SN, 'AGE_CD', e.target.value)} className={selCls}>
                    <option value="">선택</option>
                    {AGE_OPTIONS.map(a => <option key={a.cd} value={a.cd}>{a.nm}</option>)}
                    {/* 저장된 값이 목록에 없으면(다른 시설의 낯선 코드 등) 그것도 유지 — 임의로 날리지 않는다 */}
                    {valueOf(c, 'AGE_CD') && !AGE_OPTIONS.some(a => a.cd === valueOf(c, 'AGE_CD')) && (
                      <option value={valueOf(c, 'AGE_CD')}>{ageLabel(valueOf(c, 'AGE_CD'))}</option>
                    )}
                  </select>
                </td>
                <td className="px-1 py-1 border-r border-slate-100">
                  <input value={valueOf(c, 'CLAS_NM_NRTR')} onChange={e => editField(c.CLAS_SN, 'CLAS_NM_NRTR', e.target.value)} className={editCls} />
                </td>
                {/*
                  보육통합 원아수 — 보육통합 반명으로 저장분(incheon-cis-clas)을 찾아 실제 카운트를 보여준다.
                  매칭 실패(반명이 다르거나 그 해 보육통합 반정보를 아직 안 받음)는 '–' 로 두고 0 으로 속이지 않는다.
                */}
                <td className="px-1 py-1 text-center border-r border-slate-100">
                  {(() => {
                    const hit = cisCountByName.get(valueOf(c, 'CLAS_NM_NRTR').trim())
                    if (!hit) return <span className="text-slate-300" title="보육통합 반정보에 같은 반명이 없습니다. [📚 보육통합 반정보 → 업데이트] 후 다시 확인해주세요.">–</span>
                    return (
                      <span title={`현원 ${hit.cur}명 · 퇴소 ${hit.left}명 · 계 ${hit.total}명`}>
                        <b className="text-slate-700">{hit.cur}</b>
                        {hit.left > 0 && <span className="ml-0.5 text-[10px] text-slate-400">({hit.left})</span>}
                      </span>
                    )
                  })()}
                </td>
                <td className="px-1 py-1 border-r border-slate-100">
                  <select
                    value={valueOf(c, 'STTUS')}
                    onChange={e => editField(c.CLAS_SN, 'STTUS', e.target.value)}
                    className={`${selCls} ${valueOf(c, 'STTUS') === '000' ? 'text-emerald-600' : 'text-slate-400'}`}
                  >
                    {CLAS_STATUS.map(s => <option key={s.cd} value={s.cd}>{s.nm}</option>)}
                    {valueOf(c, 'STTUS') && !STTUS_LABEL[valueOf(c, 'STTUS')] && (
                      <option value={valueOf(c, 'STTUS')}>{valueOf(c, 'STTUS')}</option>
                    )}
                  </select>
                </td>
                <td className="px-1 py-1">
                  <input value={valueOf(c, 'RM')} onChange={e => editField(c.CLAS_SN, 'RM', e.target.value)} className={editCls} />
                </td>
              </tr>
              )
            })}

            {/* 신규 등록 행 — 저장 전까지는 통합e 에도 안 들어감 */}
            {news.map(n => (
              <tr key={n.key} className="border-b border-slate-100 bg-violet-50">
                <td className="px-2 py-1.5 text-center border-r border-slate-100">
                  <button onClick={() => setNews(p => p.filter(x => x.key !== n.key))} className="text-rose-500 hover:text-rose-700" title="이 행 취소">✕</button>
                </td>
                <td className="px-2 py-1 border-r border-slate-100">
                  <div className="grid grid-cols-3 gap-1">
                    <span className="px-0.5 py-[2px] text-[9px] leading-none text-center rounded bg-violet-200 text-violet-800 font-medium">신규</span>
                    <span className={badgeEmptyCls} />
                    <span className={badgeEmptyCls} />
                  </div>
                </td>
                <td className="px-1 py-1 border-r border-slate-100">
                  <input value={n.CLAS_NM} onChange={e => editNew(n.key, 'CLAS_NM', e.target.value)} placeholder="반명 (필수)" className={`${editCls} border-slate-300 bg-white`} />
                </td>
                <td className="px-1 py-1 border-r border-slate-100">
                  {/* 반 추가 시 반구분 — 인천시 [반 추가] 드롭다운 그대로 */}
                  <select value={n.AGE_CD} onChange={e => editNew(n.key, 'AGE_CD', e.target.value)} className={`${selCls} border-slate-300 bg-white`}>
                    <option value="">선택</option>
                    {AGE_OPTIONS.map(a => <option key={a.cd} value={a.cd}>{a.nm}</option>)}
                  </select>
                </td>
                <td className="px-1 py-1 border-r border-slate-100">
                  <input value={n.CLAS_NM_NRTR} onChange={e => editNew(n.key, 'CLAS_NM_NRTR', e.target.value)} placeholder="보육통합 반명" className={`${editCls} border-slate-300 bg-white`} />
                </td>
                {/* 저장 전이라 보육통합 매칭이 없다 — 원아수는 빈 칸 */}
                <td className="px-1 py-1 text-center border-r border-slate-100 text-slate-300">–</td>
                <td className="px-1 py-1 border-r border-slate-100">
                  <select value={n.STTUS} onChange={e => editNew(n.key, 'STTUS', e.target.value)} className={`${selCls} border-slate-300 bg-white`}>
                    {CLAS_STATUS.map(s => <option key={s.cd} value={s.cd}>{s.nm}</option>)}
                  </select>
                </td>
                <td className="px-1 py-1">
                  <input value={n.RM} onChange={e => editNew(n.key, 'RM', e.target.value)} className={`${editCls} border-slate-300 bg-white`} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {!loading && (filtered.length > 0 || news.length > 0) && (
          <div className="px-4 py-2 border-t border-slate-200 text-[11px] text-slate-500 flex items-center gap-3 flex-wrap">
            <span>총 {filtered.length}개 반{checked.size > 0 && <> · 선택 {checked.size}개</>}</span>
            {dirtyCount > 0 && <span className="text-amber-600 font-medium">✏️ 미저장 {dirtyCount}건</span>}
            <span className="ml-auto text-slate-400">
              <b className="text-slate-500">수정·추가는 통합e 에만 저장되고 인천시 원본은 바뀌지 않습니다</b>
              {' '}— [🏛 인천시 반정보 → 업데이트]를 누르면 인천시 값으로 덮어써집니다.
            </span>
          </div>
        )}
      </div>

      {/* 반정보 참고 팝업 — [보육통합 반정보] / [인천시 반정보]. 읽기 전용 + [업데이트] */}
      {popup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setPopup(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-[760px] max-h-[85vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-2 flex-wrap">
              <div className="text-base font-bold text-slate-800">
                {popup === 'cis' ? '📚 보육통합 반정보' : '🏛 인천시 반정보'}
              </div>
              <div className="text-[11px] text-slate-400">
                {popup === 'cis'
                  ? '선택한 보육년도에 재원했던 보육통합(CIS) 아동으로 만든 반 목록입니다 (읽기 전용).'
                  : '인천시 어린이집관리시스템에 등록된 반 목록입니다 (읽기 전용).'}
              </div>
              {/* 보육년도 드롭다운/[조회] 제거 — 전 연도를 한 번에 보여준다(인천시 팝업과 동일 배치) */}
              {popup === 'cis' && cisClasStore.length > 0 && (
                <span className="text-[11px] text-slate-500">
                  {cisClasYears.length}개 연도 · 반 {cisClasStore.length}개
                </span>
              )}
              <div className="ml-auto flex items-center gap-1.5">
                {/* ★ 일괄등록 — 통합e 에 아직 없거나 연령이 다른 반만 골라 한 번에 등록/갱신 */}
                {popup === 'cis' && cisClasStore.length > 0 && (
                  <button
                    onClick={() => registerCisClasses(cisPending)}
                    disabled={cisRegBusy || cisPending.length === 0}
                    title={cisPending.length === 0
                      ? '모든 반이 통합e 반정보에 등록되어 있습니다'
                      : `통합e 에 없는 반 ${cisPending.length}개를 한 번에 등록합니다`}
                    className="px-3 py-1.5 text-[11px] font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:text-slate-500 rounded-lg"
                  >
                    {cisRegBusy ? '등록 중…' : cisPending.length === 0 ? '✓ 전부 등록됨' : `＋ 일괄등록 (${cisPending.length})`}
                  </button>
                )}
                {/* ★ 인천시도 동일 — 표시 중인 모든 연도에서 미등록 반만 골라 한 번에(연도별로 나눠 저장) */}
                {popup === 'incheon' && srcClasStore.length > 0 && (
                  <button
                    onClick={() => registerSrcClasses(srcPending)}
                    disabled={srcRegBusy || srcPending.length === 0}
                    title={srcPending.length === 0
                      ? '표시 중인 모든 연도의 반이 통합e 반정보에 등록되어 있습니다'
                      : `통합e 에 없는 반 ${srcPending.length}개를 한 번에 등록합니다(연도별로 저장)`}
                    className="px-3 py-1.5 text-[11px] font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:text-slate-500 rounded-lg"
                  >
                    {srcRegBusy ? '등록 중…' : srcPending.length === 0 ? '✓ 전부 등록됨' : `＋ 일괄등록 (${srcPending.length})`}
                  </button>
                )}
                <button
                  onClick={popup === 'cis' ? handleCisUpdate : handleSync}
                  disabled={popup === 'cis' ? cisLoading : syncing}
                  className="px-3 py-1.5 text-[11px] font-bold text-white bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 rounded-lg"
                >
                  {(popup === 'cis' ? cisLoading : syncing) ? '업데이트 중…' : '🔄 업데이트'}
                </button>
                {popup === 'cis' && cisClasStore.length > 0 && (
                  <button
                    onClick={handleCisDelete}
                    className="px-3 py-1.5 text-[11px] font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg"
                  >🗑 삭제</button>
                )}
                {popup === 'incheon' && srcClasStore.length > 0 && (
                  <button
                    onClick={handleSrcDelete}
                    className="px-3 py-1.5 text-[11px] font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg"
                  >🗑 삭제</button>
                )}
                <button onClick={() => setPopup(null)} className="ml-1 px-2 text-slate-400 hover:text-slate-700 text-xl leading-none">✕</button>
              </div>
            </div>

            <div className="p-5 overflow-y-auto flex-1">
              {popup === 'incheon' ? (
                srcClasStore.length === 0 ? (
                  <div className="py-10 text-center text-[12px] text-slate-400">
                    인천시 반정보가 없습니다. [🔄 업데이트]를 눌러 인천시에서 조회하세요 (최근 3년치).<br />
                    <span className="text-[11px]">(조회는 참조용으로만 저장됩니다 — 통합e 반정보(메인 표)에는 자동저장되지 않습니다)</span>
                  </div>
                ) : (
                  /* 최근 3년치를 인천시 반설정 화면처럼 보육년도별로 분리해 표시 (최신 연도부터) */
                  <div className="space-y-4">
                    {srcClasYears.map(([yr, list]) => (
                      <div key={yr}>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="px-2 py-0.5 text-[11px] font-bold text-white bg-blue-600 rounded">{yr}년</span>
                          <span className="text-[11px] text-slate-500">반 {list.length}개</span>
                        </div>
                        <table className="w-full text-[11px]">
                          <thead><tr className="bg-blue-50 border-b border-slate-300">
                            <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-200 w-10">번호</th>
                            <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-200">통합반명</th>
                            <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-200">반명</th>
                            <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-200">보육통합 반명</th>
                            <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-200">연령</th>
                            <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-200">상태</th>
                            <th className="px-2 py-2 text-center font-bold text-slate-600 w-24">등록</th>
                          </tr></thead>
                          <tbody>
                            {list.map((c, i) => {
                              const { state } = srcRegState(c)
                              return (
                              <tr key={`${yr}-${c.CLAS_SN}`} className="border-b border-slate-100">
                                <td className="px-2 py-1.5 text-center text-slate-400 border-r border-slate-100">{i + 1}</td>
                                <td className="px-2 py-1.5 text-center text-slate-600 border-r border-slate-100">{c.GRP_CLAS_NM || '-'}</td>
                                <td className="px-2 py-1.5 text-center border-r border-slate-100">{c.CLAS_NM || '-'}</td>
                                <td className="px-2 py-1.5 text-center text-slate-500 border-r border-slate-100">{c.CLAS_NM_NRTR || '-'}</td>
                                <td className="px-2 py-1.5 text-center border-r border-slate-100">{ageLabel(c.AGE_CD)}</td>
                                <td className={`px-2 py-1.5 text-center border-r border-slate-100 ${c.STTUS === '000' ? 'text-emerald-600' : 'text-slate-400'}`}>{STTUS_LABEL[c.STTUS] || c.STTUS}</td>
                                {/* 등록됨(반명+연령 일치) → 회색 비활성 / 연령 다름 → 업데이트 / 없음 → 등록 */}
                                <td className="px-2 py-1.5 text-center">
                                  {state === 'same' ? (
                                    <span
                                      title={`${yr}년 통합e 반정보에 같은 반명·연령으로 이미 등록되어 있습니다`}
                                      className="inline-block px-2 py-1 text-[10px] font-bold text-slate-400 bg-slate-100 border border-slate-200 rounded cursor-default"
                                    >✓ 등록됨</span>
                                  ) : (
                                    <button
                                      onClick={() => registerSrcClasses([c])}
                                      disabled={srcRegBusy}
                                      title={state === 'diff'
                                        ? `${yr}년 통합e 에 같은 반명이 있으나 연령이 다릅니다 — 연령·반명을 인천시 기준으로 갱신합니다`
                                        : `${yr}년 통합e 반정보에 이 반을 새로 등록합니다`}
                                      className="px-2 py-1 text-[10px] font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 rounded"
                                    >{state === 'diff' ? '↻ 업데이트' : '＋ 등록'}</button>
                                  )}
                                </td>
                              </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                cisLoading ? (
                  <div className="py-10 text-center text-[12px] text-slate-400">불러오는 중…</div>
                ) : cisClasStore.length === 0 ? (
                  <div className="py-10 text-center text-[12px] text-slate-400">
                    저장된 보육통합 반정보가 없습니다.<br />
                    [🔄 업데이트]를 누르면 보육통합(CIS) 아동에서 <b>모든 보육년도</b>의 반을 도출해 <b>인천시와 별개로</b> 저장합니다.
                  </div>
                ) : (
                  /* 전 연도를 보육년도별로 분리해 표시 (최신 연도부터) — 인천시 반정보 팝업과 동일 배치 */
                  <div className="space-y-4">
                    {cisClasYears.map(([yr, list]) => (
                      <div key={yr}>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="px-2 py-0.5 text-[11px] font-bold text-white bg-indigo-600 rounded">{yr}년</span>
                          <span className="text-[11px] text-slate-500">반 {list.length}개</span>
                        </div>
                  <table className="w-full text-[11px]">
                    <thead><tr className="bg-indigo-50 border-b border-slate-300">
                      <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-200 w-10">번호</th>
                      <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-200">반명</th>
                      <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-200">반유형(연령)</th>
                      <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-200">현원</th>
                      <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-200">퇴소</th>
                      <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-200">계</th>
                      <th className="px-2 py-2 text-center font-bold text-slate-600 w-24">등록</th>
                    </tr></thead>
                    <tbody>
                      {list.map((cl, i) => {
                        const { state } = cisRegState(cl)
                        return (
                        <tr key={`${yr}-${cl.name}`} className="border-b border-slate-100">
                          <td className="px-2 py-1.5 text-center text-slate-400 border-r border-slate-100">{i + 1}</td>
                          <td className="px-2 py-1.5 text-center border-r border-slate-100">{cl.name}</td>
                          <td className="px-2 py-1.5 text-center text-slate-500 border-r border-slate-100">{cl.type || '-'}</td>
                          <td className="px-2 py-1.5 text-center text-emerald-600 border-r border-slate-100">{cl.cur}</td>
                          <td className="px-2 py-1.5 text-center text-pink-600 border-r border-slate-100">{cl.left}</td>
                          <td className="px-2 py-1.5 text-center text-slate-700 font-medium border-r border-slate-100">{cl.total}명</td>
                          {/* 등록됨(연령까지 일치) → 회색 비활성 / 연령 다름 → 업데이트 / 없음 → 등록 */}
                          <td className="px-2 py-1.5 text-center">
                            {state === 'same' ? (
                              <span
                                title="통합e 반정보에 같은 반명·연령으로 이미 등록되어 있습니다"
                                className="inline-block px-2 py-1 text-[10px] font-bold text-slate-400 bg-slate-100 border border-slate-200 rounded cursor-default"
                              >✓ 등록됨</span>
                            ) : (
                              <button
                                onClick={() => registerCisClasses([cl])}
                                disabled={cisRegBusy}
                                title={state === 'diff'
                                  ? '통합e 에 같은 반명이 있으나 연령이 다릅니다 — 연령·반명을 보육통합 기준으로 갱신합니다'
                                  : '통합e 반정보에 이 반을 새로 등록합니다'}
                                className="px-2 py-1 text-[10px] font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 rounded"
                              >{state === 'diff' ? '↻ 업데이트' : '＋ 등록'}</button>
                            )}
                          </td>
                        </tr>
                        )
                      })}
                    </tbody>
                  </table>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>

            <div className="px-5 py-3 border-t border-slate-200 text-[11px] text-slate-500">
              {popup === 'cis'
                ? '※ 현원은 현재 보육년도에, 퇴소 원아는 퇴소한 그 보육년도에 표시됩니다. [🔄 업데이트]는 CIS 최신 아동을 다시 불러옵니다. · [＋ 등록]은 이 반을 통합e 반정보에 넣습니다(반명은 보육통합 기준으로 통일). 반명·연령이 이미 같으면 [✓ 등록됨]으로 잠기고, 연령만 다르면 [↻ 업데이트]로 맞춥니다.'
                : '※ [🔄 업데이트]는 인천시에서 최신 반 목록을 다시 가져옵니다(로컬 에이전트 경유, 수십 초). · [＋ 등록]은 이 반을 그 연도의 통합e 반정보에 넣습니다(반명은 인천시 기준으로 통일). 반명·연령이 이미 같으면 [✓ 등록됨]으로 잠기고, 연령만 다르면 [↻ 업데이트]로 맞춥니다.'}
            </div>
          </div>
        </div>
      )}

      {/* 반 추가 팝업 — ①저장 ②+추가 ③빈행(반명/보육통합반명/연령/사용여부) ④보육통합 자동채움 ⑤인천시 세팅 */}
      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setAddOpen(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-[860px] max-h-[85vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-2 flex-wrap">
              <div className="text-base font-bold text-slate-800">＋ 반 추가</div>
              <label className="text-[11px] text-slate-600 flex items-center gap-1">
                보육년도
                <select value={addYear} onChange={e => { const y = e.target.value; setAddYear(y); fillFromIncheon(y) }} className={`${inputCls} !w-20`}>
                  {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}년</option>)}
                </select>
              </label>
              <div className="text-[11px] text-slate-400 hidden lg:block">선택한 보육년도에 저장됩니다.</div>
              <div className="ml-auto flex items-center gap-1.5">
                <button onClick={() => fillFromCis()} disabled={addBusy} className="px-3 py-1.5 text-[11px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 rounded">📚 보육통합 반 자동채움</button>
                <button onClick={() => fillFromIncheon()} disabled={addBusy} className="px-3 py-1.5 text-[11px] font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 rounded">🏛 인천시 반정보 세팅</button>
                <button onClick={addEmptyRow} disabled={addBusy} className="px-3 py-1.5 text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded">＋ 추가</button>
                <button onClick={handleAddSave} disabled={addBusy} className="px-3 py-1.5 text-[11px] font-bold text-white bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 rounded">{addBusy ? '저장 중…' : '💾 저장'}</button>
                <button onClick={() => setAddOpen(false)} className="ml-1 px-2 text-slate-400 hover:text-slate-700 text-xl leading-none">✕</button>
              </div>
            </div>

            <div className="p-4 overflow-y-auto flex-1">
              <table className="w-full text-[11px]">
                <thead><tr className="bg-teal-50 border-b border-slate-300">
                  <th className="px-2 py-2 w-8"></th>
                  <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-200">반명</th>
                  <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-200">보육통합 반명</th>
                  <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-200 w-[160px]">연령</th>
                  <th className="px-2 py-2 text-center font-bold text-slate-600 w-[90px]">사용여부</th>
                </tr></thead>
                <tbody>
                  {addRows.map(n => (
                    <tr key={n.key} className="border-b border-slate-100">
                      <td className="px-2 py-1 text-center">
                        <button onClick={() => removeAddRow(n.key)} className="text-rose-500 hover:text-rose-700" title="행 삭제">✕</button>
                      </td>
                      <td className="px-1 py-1 border-r border-slate-100">
                        <input value={n.CLAS_NM} onChange={e => editAddRow(n.key, 'CLAS_NM', e.target.value)} placeholder="반명 (필수)" className={`${editCls} border-slate-300 bg-white`} />
                      </td>
                      <td className="px-1 py-1 border-r border-slate-100">
                        <input value={n.CLAS_NM_NRTR} onChange={e => editAddRow(n.key, 'CLAS_NM_NRTR', e.target.value)} placeholder="보육통합 반명" className={`${editCls} border-slate-300 bg-white`} />
                      </td>
                      <td className="px-1 py-1 border-r border-slate-100">
                        <select value={n.AGE_CD} onChange={e => editAddRow(n.key, 'AGE_CD', e.target.value)} className={`${selCls} border-slate-300 bg-white`}>
                          <option value="">선택</option>
                          {AGE_OPTIONS.map(a => <option key={a.cd} value={a.cd}>{a.nm}</option>)}
                          {n.AGE_CD && !AGE_OPTIONS.some(a => a.cd === n.AGE_CD) && <option value={n.AGE_CD}>{ageLabel(n.AGE_CD)}</option>}
                        </select>
                      </td>
                      <td className="px-1 py-1">
                        <select value={n.STTUS} onChange={e => editAddRow(n.key, 'STTUS', e.target.value)} className={`${selCls} border-slate-300 bg-white`}>
                          {CLAS_STATUS.map(s => <option key={s.cd} value={s.cd}>{s.nm}</option>)}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {addRows.length === 0 && <div className="py-6 text-center text-[12px] text-slate-400">행이 없습니다. [＋ 추가] 또는 자동채움을 눌러주세요.</div>}
            </div>

            <div className="px-5 py-3 border-t border-slate-200 text-[11px] text-slate-500">
              ※ 저장하면 통합e 저장분에 반이 추가됩니다(인천시 원본은 안 바뀜). [📚 보육통합 반 자동채움]=CIS 아동 배정 반 / [🏛 인천시 반정보 세팅]=현재 인천시 저장분에서 채웁니다.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
