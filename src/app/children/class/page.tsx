'use client'
import React, { useState, useEffect, useCallback, useMemo } from 'react'

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
}

/** 인천시 공통코드 (getCodeList.do → tcmCodeList) — CD_GRP 로 그룹핑된 원본 코드표 */
type IncheonCode = { CD_GRP: string; CD: string; CD_NM: string }

/** 반 상태코드 — 인천시 ClasSetting.xml 의 <xf:choices> 실측(추측 아님).
 *  ⚠ 미사용은 '001' 이 아니라 '999' — 옛 코드가 틀렸었다. */
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

  const [edits, setEdits] = useState<Record<number, Partial<IncheonClas>>>({})
  const [news, setNews] = useState<NewClas[]>([])
  const [saving, setSaving] = useState(false)
  const dirtyCount = Object.keys(edits).length + news.length

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
    return bestHit >= Math.ceil(used.size / 2) ? best : []
  }, [codes, rows])

  const ageLabel = useCallback((cd: string): string => {
    const hit = ageCodes.find(c => c.CD === cd)
    return hit?.CD_NM ?? (cd || '-')
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

  /** 통합e 에서 추가한 반 삭제 (인천시에서 온 반은 서버가 거부) */
  const handleDelete = async () => {
    const targets = filtered.filter(c => checked.has(c.CLAS_SN))
    const localOnly = targets.filter(c => c._local)
    if (targets.length === 0) { setMsg('삭제할 반을 선택해주세요.'); return }
    if (localOnly.length === 0) {
      setMsg('❌ 인천시에서 가져온 반은 삭제할 수 없습니다 (지워도 인천시엔 남아있어 다시 가져오면 되살아납니다). 통합e 에서 추가한 반만 삭제됩니다.')
      return
    }
    if (!confirm(`통합e 에서 추가한 반 ${localOnly.length}개를 삭제합니다.${targets.length > localOnly.length ? `\n(인천시에서 가져온 ${targets.length - localOnly.length}개는 제외됩니다)` : ''}\n\n계속할까요?`)) return
    setSaving(true)
    try {
      const res = await fetch('/api/incheon/children', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year, clasDeletes: localOnly.map(c => c.CLAS_SN) }),
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

  const handleSync = async () => {
    if (dirtyCount > 0 && !confirm(`저장하지 않은 수정 ${dirtyCount}건이 있습니다.\n\n인천시에서 가져오면 인천시 값으로 덮어써져 수정 내용이 사라집니다.\n계속할까요?`)) return
    setSyncing(true); setMsg('인천시 조회 중… (로컬 에이전트 경유, 수십 초 걸립니다)')
    try {
      const res = await fetch('/api/incheon/children', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year }),
      })
      const j = await res.json()
      if (j.success) {
        setMsg(`✅ 반 ${j.clasCount}개 · 아동 ${j.childCount}명 · 키워드 ${j.keywordCount}건${j.codeCount ? ` · 코드 ${j.codeCount}건` : ''} 가져왔습니다.`)
        setEdits({}); setNews([])
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

  // 인천시 화면과 동일 — 삭제된 반(DEL_AT='Y')은 목록에서 제외
  const filtered = rows
    .filter(c => c.DEL_AT !== 'Y')
    .filter(c => search === '' || (c.CLAS_NM || '').includes(search) || (c.GRP_CLAS_NM || '').includes(search))

  const toggle = (sn: number) => {
    setChecked(prev => {
      const n = new Set(prev)
      if (n.has(sn)) n.delete(sn); else n.add(sn)
      return n
    })
  }
  const allChecked = filtered.length > 0 && filtered.every(c => checked.has(c.CLAS_SN))

  const addRow = () => setNews(prev => [...prev, {
    key: Date.now() + prev.length,
    CLAS_NM: '', CLAS_NM_NRTR: '', AGE_CD: '', STTUS: '000', RM: '',
  }])
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
            <button onClick={addRow} className="px-3 py-1.5 text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded">
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
              onClick={handleSync}
              disabled={syncing}
              className="px-3 py-1.5 text-[11px] font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 rounded"
            >
              {syncing ? '가져오는 중…' : '📥 인천시에서 가져오기'}
            </button>
          </div>
        </div>

        {msg && <div className="px-4 py-2 text-[11px] border-t border-slate-100 text-slate-600 bg-slate-50">{msg}</div>}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-[11px]">
          {/* 컬럼 구성 = 인천시 ClasSetting.xml 그대로: 선택/통합반명/반명/보육통합 반명/연령/상태/비고 */}
          <thead><tr className="bg-teal-50 border-b border-slate-300">
            <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-200 w-[45px]">
              <input
                type="checkbox"
                checked={allChecked}
                onChange={() => setChecked(allChecked ? new Set() : new Set(filtered.map(c => c.CLAS_SN)))}
              />
            </th>
            <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-200 w-[160px]">통합반명</th>
            <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-200 w-[190px]">반명</th>
            <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-200 w-[190px]">보육통합 반명</th>
            <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-200 w-[150px]">연령</th>
            <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-200 w-[80px]">상태</th>
            <th className="px-2 py-2 text-center font-bold text-slate-600">비고</th>
          </tr></thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-2 py-8 text-center text-slate-400">불러오는 중…</td></tr>
            ) : filtered.length === 0 && news.length === 0 ? (
              <tr><td colSpan={7} className="px-2 py-8 text-center text-slate-400">
                {rows.length === 0
                  ? '저장된 반이 없습니다. [📥 인천시에서 가져오기]를 눌러주세요.'
                  : '검색 결과가 없습니다.'}
              </td></tr>
            ) : filtered.map(c => {
              const dirty = !!edits[c.CLAS_SN]
              return (
              <tr key={c.CLAS_SN} className={`border-b border-slate-100 ${dirty ? 'bg-amber-50' : 'hover:bg-blue-50/40'}`}>
                <td className="px-2 py-1.5 text-center border-r border-slate-100">
                  <input type="checkbox" checked={checked.has(c.CLAS_SN)} onChange={() => toggle(c.CLAS_SN)} />
                </td>
                <td className="px-2 py-1.5 text-center text-slate-600 border-r border-slate-100">
                  {c.GRP_CLAS_NM || '-'}
                  {c._local && <span className="ml-1 px-1 py-0.5 text-[9px] bg-violet-100 text-violet-700 rounded" title="통합e 에서 추가한 반 — 인천시에는 없습니다">통합e</span>}
                </td>
                <td className="px-1 py-1 border-r border-slate-100">
                  <input value={valueOf(c, 'CLAS_NM')} onChange={e => editField(c.CLAS_SN, 'CLAS_NM', e.target.value)} className={editCls} />
                </td>
                <td className="px-1 py-1 border-r border-slate-100">
                  <input value={valueOf(c, 'CLAS_NM_NRTR')} onChange={e => editField(c.CLAS_SN, 'CLAS_NM_NRTR', e.target.value)} className={editCls} />
                </td>
                <td className="px-1 py-1 border-r border-slate-100" title={`인천시 원본 코드: ${valueOf(c, 'AGE_CD') || '(없음)'}`}>
                  {ageCodes.length > 0 ? (
                    <select value={valueOf(c, 'AGE_CD')} onChange={e => editField(c.CLAS_SN, 'AGE_CD', e.target.value)} className={selCls}>
                      <option value="">선택</option>
                      {ageCodes.map(a => <option key={a.CD} value={a.CD}>{a.CD_NM}</option>)}
                      {/* 코드표에 없는 값이 저장돼 있으면 그것도 선택지로 유지 — 임의로 날리지 않는다 */}
                      {valueOf(c, 'AGE_CD') && !ageCodes.some(a => a.CD === valueOf(c, 'AGE_CD')) && (
                        <option value={valueOf(c, 'AGE_CD')}>{valueOf(c, 'AGE_CD')} (코드표에 없음)</option>
                      )}
                    </select>
                  ) : (
                    <span className="text-slate-600">{ageLabel(valueOf(c, 'AGE_CD'))}</span>
                  )}
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
                <td className="px-2 py-1.5 text-center text-slate-400 border-r border-slate-100">
                  <span className="px-1 py-0.5 text-[9px] bg-violet-200 text-violet-800 rounded">신규</span>
                </td>
                <td className="px-1 py-1 border-r border-slate-100">
                  <input value={n.CLAS_NM} onChange={e => editNew(n.key, 'CLAS_NM', e.target.value)} placeholder="반명 (필수)" className={`${editCls} border-slate-300 bg-white`} />
                </td>
                <td className="px-1 py-1 border-r border-slate-100">
                  <input value={n.CLAS_NM_NRTR} onChange={e => editNew(n.key, 'CLAS_NM_NRTR', e.target.value)} placeholder="보육통합 반명" className={`${editCls} border-slate-300 bg-white`} />
                </td>
                <td className="px-1 py-1 border-r border-slate-100">
                  <select value={n.AGE_CD} onChange={e => editNew(n.key, 'AGE_CD', e.target.value)} className={`${selCls} border-slate-300 bg-white`}>
                    <option value="">선택</option>
                    {ageCodes.map(a => <option key={a.CD} value={a.CD}>{a.CD_NM}</option>)}
                  </select>
                </td>
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
            {ageCodes.length === 0 && rows.length > 0 && (
              <span className="text-amber-600">⚠ 연령 코드표 미수신 — [인천시에서 가져오기]를 한 번 실행하면 연령을 이름으로 표시합니다</span>
            )}
            <span className="ml-auto text-slate-400">
              <b className="text-slate-500">수정·추가는 통합e 에만 저장되고 인천시 원본은 바뀌지 않습니다</b>
              {' '}— [인천시에서 가져오기]를 다시 누르면 인천시 값으로 덮어써집니다.
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
