'use client'
import React, { useState, useEffect, useCallback } from 'react'

/**
 * 반편성관리 — 인천시어린이집관리시스템 [설정 > 반설정] 인터페이스와 동일 구성.
 *
 * 컬럼/필드는 인천시 화면정의(ClasSetting.xml)와 API(ClasConfigList.do → ClasList[])를
 * 그대로 옮긴 것 — 통합e 에서 정산을 자동화한 뒤 결과를 인천시로 되돌릴 때 필드 매핑이
 * 필요 없게 하기 위함(사용자 설계: "인터페이스를 인천시랑 똑같이 맞추고 → 데이터를 맞추고
 * → 자동화 처리하고").
 *
 * 데이터는 통합e page_data(field='incheon-clas')에 인천시 필드명 그대로 저장돼 있고,
 * [인천시에서 가져오기]가 로컬 에이전트로 인천시를 실제 조회해 그 저장분을 갱신한다.
 */

const inputCls = 'border border-teal-300 rounded px-2 py-1 text-[12px] focus:outline-none focus:border-teal-500'
/** 표 안 인라인 편집칸 — 평소엔 테두리 없이 텍스트처럼 보이고 포커스/호버 때만 입력칸으로 드러남 */
const editCls = 'w-full text-center text-[11px] px-1 py-0.5 rounded border border-transparent bg-transparent hover:border-slate-300 focus:outline-none focus:border-teal-500 focus:bg-white'

/** 인천시 반 (ClasConfigList.do → ClasList[]) — 필드명 원본 그대로 */
type IncheonClas = {
  CLAS_SN: number          // ★ 반 고유키
  CLAS_NM: string          // 반명
  AGE_CD: string           // 연령코드
  STTUS: string            // 상태
  RM: string | null        // 비고
  DEL_AT: string           // 삭제여부
  CLAS_NM_NRTR: string | null   // 보육통합 반명
  GRP_CLAS_NM: string | null    // 통합반명
  PSNCPA: number | null         // 정원
}

/** 인천시 AGE_CD 코드표 — ⚠ 전부 유추값이다(공식 코드표 미확보).
 *
 *  근거: 실 데이터(FCLTCD 13157, 2026)의 반명↔코드 대응이 0~3세로 단조 증가.
 *    아기별꽃26=000 / 예쁜새싹26=001 / 아침햇살26=002 / 맑은샘물26=003
 *  한계: 같은 시설에 008(푸른하늘26) / M01(아기별꽃26-1) / T10(미소연장22연장반(유아)) /
 *    T11(지움연장24연장반(영아)) 이 있어 "N세" 규칙만으로는 설명이 안 된다. 즉 000~005 도
 *    확정이 아니다. 화면정의(ClasSetting.xml)의 dl_ageCode 는 선언만 있고 채우는 API 가
 *    HAR 에 없어 코드표를 못 얻었다.
 *  → 미등록 코드는 원본 그대로 노출하고, 매핑된 것도 title 에 원본코드를 달아 대조 가능하게 함.
 *    인천시 반설정 화면의 [연령] 컬럼과 다르면 이 표를 고칠 것. */
const AGE_LABEL: Record<string, string> = {
  '000': '0세', '001': '1세', '002': '2세', '003': '3세', '004': '4세', '005': '5세',
}
const STTUS_LABEL: Record<string, string> = { '000': '사용', '001': '미사용' }

export default function ClassPage() {
  const year = String(new Date().getFullYear())
  const [rows, setRows] = useState<IncheonClas[]>([])
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [msg, setMsg] = useState('')
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [checked, setChecked] = useState<Set<number>>(new Set())

  // 편집 — CLAS_SN 별로 바뀐 필드만 모아둔다(저장 시 그 행만 PUT)
  const [edits, setEdits] = useState<Record<number, Partial<IncheonClas>>>({})
  const [saving, setSaving] = useState(false)
  const dirtyCount = Object.keys(edits).length

  const editField = (sn: number, field: 'CLAS_NM' | 'CLAS_NM_NRTR' | 'RM', value: string) => {
    setEdits(prev => {
      const orig = rows.find(r => r.CLAS_SN === sn)
      const nextRow = { ...(prev[sn] || {}), [field]: value }
      // 원본과 같아지면 dirty 해제 — 되돌린 걸 저장 대상으로 남기지 않는다
      const changed = (Object.keys(nextRow) as Array<keyof IncheonClas>)
        .some(k => String(nextRow[k] ?? '') !== String(orig?.[k] ?? ''))
      const next = { ...prev }
      if (changed) next[sn] = nextRow
      else delete next[sn]
      return next
    })
  }
  const valueOf = (c: IncheonClas, field: 'CLAS_NM' | 'CLAS_NM_NRTR' | 'RM'): string => {
    const e = edits[c.CLAS_SN]
    if (e && field in e) return String(e[field] ?? '')
    return String(c[field] ?? '')
  }

  /** 통합e 저장분 조회 (인천시 호출 없음) */
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/incheon/children?year=${year}`)
      const j = await res.json()
      if (j.success) {
        setRows((j.clasList || []) as IncheonClas[])
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

  /** 수정 저장 — 통합e 저장소만 갱신(인천시 원본은 안 바뀜) */
  const handleSave = async () => {
    if (dirtyCount === 0) return
    setSaving(true); setMsg('')
    try {
      const clasEdits = Object.entries(edits).map(([sn, patch]) => ({ CLAS_SN: Number(sn), ...patch }))
      const res = await fetch('/api/incheon/children', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year, clasEdits }),
      })
      const j = await res.json()
      if (j.success) {
        setMsg(`💾 ${j.updated}개 반 수정 저장 (통합e 에만 저장 — 인천시 원본은 그대로입니다)`)
        setEdits({})
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

  /** 인천시에서 실제로 가져오기 — 로컬 에이전트 경유라 수십 초 걸릴 수 있음 */
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
        setMsg(`✅ 반 ${j.clasCount}개 · 아동 ${j.childCount}명 가져왔습니다.`)
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

  return (
    <div className="p-3 space-y-3">
      <div className="bg-white rounded-xl border border-teal-400/30 shadow-sm">
        <div className="px-4 py-3 border-b border-teal-400/20 flex items-center gap-2 flex-wrap">
          <span className="text-sm font-bold text-slate-700">반설정</span>
          <span className="text-[11px] text-slate-500">보육년도 {year}년</span>

          {/* 검색은 조회 버튼/엔터 방식 — 실시간 검색 금지(프로젝트 UX 규칙) */}
          <form onSubmit={e => { e.preventDefault(); setSearch(searchInput) }} className="flex items-center gap-2 ml-4">
            <select className={`${inputCls} w-20`} defaultValue="반명">
              <option>반명</option>
            </select>
            <input type="text" value={searchInput} onChange={e => setSearchInput(e.target.value)} className={`${inputCls} w-40`} />
            <button type="submit" className="px-3 py-1.5 text-xs font-bold text-white bg-teal-500 hover:bg-teal-600 rounded">조회</button>
          </form>

          <div className="ml-auto flex items-center gap-2">
            {savedAt && (
              <span className="text-[11px] text-slate-400">최근 동기화 {new Date(savedAt).toLocaleString('ko-KR')}</span>
            )}
            <button
              onClick={handleSave}
              disabled={saving || dirtyCount === 0}
              className="px-3 py-1.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 rounded"
            >
              {saving ? '저장 중…' : dirtyCount > 0 ? `💾 저장 (${dirtyCount})` : '💾 저장'}
            </button>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 rounded"
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
            <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-200 w-[200px]">반명</th>
            <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-200 w-[200px]">보육통합 반명</th>
            <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-200 w-[80px]">연령</th>
            <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-200 w-[80px]">상태</th>
            <th className="px-2 py-2 text-center font-bold text-slate-600">비고</th>
          </tr></thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-2 py-8 text-center text-slate-400">불러오는 중…</td></tr>
            ) : filtered.length === 0 ? (
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
                <td className="px-2 py-1.5 text-center text-slate-600 border-r border-slate-100">{c.GRP_CLAS_NM || '-'}</td>
                {/* 반명 / 보육통합 반명 / 비고 — 수정 가능 (통합e 저장분만 바뀜) */}
                <td className="px-1 py-1 border-r border-slate-100">
                  <input
                    value={valueOf(c, 'CLAS_NM')}
                    onChange={e => editField(c.CLAS_SN, 'CLAS_NM', e.target.value)}
                    className={editCls}
                  />
                </td>
                <td className="px-1 py-1 border-r border-slate-100">
                  <input
                    value={valueOf(c, 'CLAS_NM_NRTR')}
                    onChange={e => editField(c.CLAS_SN, 'CLAS_NM_NRTR', e.target.value)}
                    className={editCls}
                  />
                </td>
                <td className="px-2 py-1.5 text-center text-slate-600 border-r border-slate-100" title={`인천시 원본 코드: ${c.AGE_CD || '(없음)'}`}>
                  {AGE_LABEL[c.AGE_CD] ?? (c.AGE_CD || '-')}
                </td>
                <td className="px-2 py-1.5 text-center border-r border-slate-100">
                  <span className={c.STTUS === '000' ? 'text-emerald-600' : 'text-slate-400'}>
                    {STTUS_LABEL[c.STTUS] ?? c.STTUS}
                  </span>
                </td>
                <td className="px-1 py-1">
                  <input
                    value={valueOf(c, 'RM')}
                    onChange={e => editField(c.CLAS_SN, 'RM', e.target.value)}
                    className={editCls}
                  />
                </td>
              </tr>
              )
            })}
          </tbody>
        </table>

        {!loading && filtered.length > 0 && (
          <div className="px-4 py-2 border-t border-slate-200 text-[11px] text-slate-500 flex items-center gap-3 flex-wrap">
            <span>총 {filtered.length}개 반{checked.size > 0 && <> · 선택 {checked.size}개</>}</span>
            {dirtyCount > 0 && <span className="text-amber-600 font-medium">✏️ 수정 {dirtyCount}건 — 저장 안 됨</span>}
            <span className="ml-auto text-slate-400">
              ⓘ 반명·보육통합 반명·비고는 수정 가능합니다. <b className="text-slate-500">수정은 통합e 에만 저장되고 인천시 원본은 바뀌지 않습니다</b>
              {' '}— [인천시에서 가져오기]를 다시 누르면 인천시 값으로 덮어써집니다.
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
