'use client'

import { useState, useEffect, useCallback } from 'react'
import { ILOVECHILD_BOOKS } from '@/lib/ilovechild-books'

// 세입/세출은 완전 별도. 각 구분마다 관 › 항 › 목 › 세목 계층.
//   코드 파생: 관 04 → 항 41,42 (관 끝자리+순번) → 목 411 (항+순번) → 세목 4111 (목+순번)
interface Sub  { code: string; name: string }
interface Mok  { code: string; name: string; subs: Sub[] }
interface Hang { code: string; name: string; moks: Mok[] }
interface Gwan { gubun: '세입' | '세출'; code: string; name: string; hangs: Hang[] }

const TABS = ILOVECHILD_BOOKS
const YEARS = ['2024', '2025', '2026', '2027', '2028']
const GUBUNS: ('세입' | '세출')[] = ['세입', '세출']

// 기본 세팅 — 세입 관 01~09 + 세출 관 01~09 (완전 별도)
const defaultTree = (): Gwan[] => {
  const mk = (gubun: '세입' | '세출'): Gwan[] =>
    Array.from({ length: 9 }, (_, i): Gwan => ({ gubun, code: String(i + 1).padStart(2, '0'), name: '', hangs: [] }))
  return [...mk('세입'), ...mk('세출')]
}

// 항/목/세목 코드 자동 재파생 (번호 임의 섞임 방지, 항상 순차)
function resequence(tree: Gwan[]): Gwan[] {
  return tree.map(g => {
    const gl = g.code.slice(-1)
    return {
      ...g,
      hangs: g.hangs.map((h, hi) => {
        const hc = `${gl}${hi + 1}`
        return {
          ...h, code: hc,
          moks: h.moks.map((m, mi) => {
            const mc = `${hc}${mi + 1}`
            return { ...m, code: mc, subs: m.subs.map((s, si) => ({ ...s, code: `${mc}${si + 1}` })) }
          }),
        }
      }),
    }
  })
}

export default function CoaSettingsPage() {
  const [year, setYear] = useState('2026')
  const [tab, setTab] = useState(ILOVECHILD_BOOKS[0].code)
  const [gubun, setGubun] = useState<'세입' | '세출'>('세입')
  const [tree, setTree] = useState<Gwan[]>([])
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [showImport, setShowImport] = useState(false)
  const [importCounts, setImportCounts] = useState<Record<string, number>>({})
  const [importLoading, setImportLoading] = useState(false)
  const [allowed, setAllowed] = useState<boolean | null>(null)  // 아이사랑꿈터 전용 가드

  // 접근 가드 — 아이사랑꿈터(ilovechild) 유형만 허용
  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => {
        const t = (d?.institutionType || d?.profile?.institutionType || 'childcare') as string
        setAllowed(t === 'ilovechild')
      })
      .catch(() => setAllowed(false))
  }, [])

  const load = useCallback(async (bk: string, yr: string) => {
    setLoading(true); setMsg('')
    try {
      const j = await fetch(`/api/coa?book=${bk}&year=${yr}`, { credentials: 'include' }).then(r => r.json())
      const list = j.success && Array.isArray(j.list) ? (j.list as Gwan[]) : []
      setTree(list.length ? resequence(list) : defaultTree())
    } catch { setTree(defaultTree()) } finally { setLoading(false) }
  }, [])
  useEffect(() => { load(tab, year) }, [tab, year, load])

  const mutate = (fn: (t: Gwan[]) => Gwan[]) => setTree(prev => resequence(fn(prev)))

  // ── 계층 추가 ── (addGwan 은 현재 구분(세입/세출)에 추가)
  const addGwan = () => mutate(p => {
    const cnt = p.filter(g => g.gubun === gubun).length
    return [...p, { gubun, code: String(cnt + 1).padStart(2, '0'), name: '', hangs: [] }]
  })
  const addHang = (gi: number) => mutate(p => p.map((g, i) => i !== gi ? g : { ...g, hangs: [...g.hangs, { code: '', name: '', moks: [] }] }))
  const addMok = (gi: number, hi: number) => mutate(p => p.map((g, i) => i !== gi ? g : { ...g, hangs: g.hangs.map((h, j) => j !== hi ? h : { ...h, moks: [...h.moks, { code: '', name: '', subs: [] }] }) }))
  const addSub = (gi: number, hi: number, mi: number) => mutate(p => p.map((g, i) => i !== gi ? g : { ...g, hangs: g.hangs.map((h, j) => j !== hi ? h : { ...h, moks: h.moks.map((m, k) => k !== mi ? m : { ...m, subs: [...m.subs, { code: '', name: '' }] }) }) }))

  // 명칭 입력(blur) 시 자식이 없으면 기본 1개 자동 — 관→항, 항→목, 목→세목 동일
  const ensureFirstHang = (gi: number) => mutate(p => p.map((g, i) => (i === gi && g.name.trim() && g.hangs.length === 0) ? { ...g, hangs: [{ code: '', name: '', moks: [] }] } : g))
  const ensureFirstMok = (gi: number, hi: number) => mutate(p => p.map((g, i) => i !== gi ? g : { ...g, hangs: g.hangs.map((h, j) => (j === hi && h.name.trim() && h.moks.length === 0) ? { ...h, moks: [{ code: '', name: '', subs: [] }] } : h) }))
  const ensureFirstSub = (gi: number, hi: number, mi: number) => mutate(p => p.map((g, i) => i !== gi ? g : { ...g, hangs: g.hangs.map((h, j) => j !== hi ? h : { ...h, moks: h.moks.map((m, k) => (k === mi && m.name.trim() && m.subs.length === 0) ? { ...m, subs: [{ code: '', name: '' }] } : m) }) }))

  // ── 수정 (명칭·관코드만) ──
  const patchGwan = (gi: number, key: keyof Gwan, v: string) => mutate(p => p.map((g, i) => i !== gi ? g : { ...g, [key]: v }))
  const patchHang = (gi: number, hi: number, v: string) => mutate(p => p.map((g, i) => i !== gi ? g : { ...g, hangs: g.hangs.map((h, j) => j !== hi ? h : { ...h, name: v }) }))
  const patchMok = (gi: number, hi: number, mi: number, v: string) => mutate(p => p.map((g, i) => i !== gi ? g : { ...g, hangs: g.hangs.map((h, j) => j !== hi ? h : { ...h, moks: h.moks.map((m, k) => k !== mi ? m : { ...m, name: v }) }) }))
  const patchSub = (gi: number, hi: number, mi: number, si: number, v: string) => mutate(p => p.map((g, i) => i !== gi ? g : { ...g, hangs: g.hangs.map((h, j) => j !== hi ? h : { ...h, moks: h.moks.map((m, k) => k !== mi ? m : { ...m, subs: m.subs.map((s, l) => l !== si ? s : { ...s, name: v }) }) }) }))

  // ── 삭제 ──
  const delGwan = (gi: number) => mutate(p => p.filter((_, i) => i !== gi))
  const delHang = (gi: number, hi: number) => mutate(p => p.map((g, i) => i !== gi ? g : { ...g, hangs: g.hangs.filter((_, j) => j !== hi) }))
  const delMok = (gi: number, hi: number, mi: number) => mutate(p => p.map((g, i) => i !== gi ? g : { ...g, hangs: g.hangs.map((h, j) => j !== hi ? h : { ...h, moks: h.moks.filter((_, k) => k !== mi) }) }))
  const delSub = (gi: number, hi: number, mi: number, si: number) => mutate(p => p.map((g, i) => i !== gi ? g : { ...g, hangs: g.hangs.map((h, j) => j !== hi ? h : { ...h, moks: h.moks.map((m, k) => k !== mi ? m : { ...m, subs: m.subs.filter((_, l) => l !== si) }) }) }))

  const save = async () => {
    setLoading(true); setMsg('')
    try {
      const j = await fetch('/api/coa', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ book: tab, year, list: tree }),
      }).then(r => r.json())
      setMsg(j.success ? '✅ 저장되었습니다 (세입·세출 모두)' : `❌ 저장 실패: ${j.error || ''}`)
      setTimeout(() => setMsg(''), 3000)
    } catch (e) { setMsg(`❌ ${e instanceof Error ? e.message : e}`) } finally { setLoading(false) }
  }

  const openImport = async () => {
    setShowImport(true); setImportLoading(true); setImportCounts({})
    const others = YEARS.filter(y => y !== year)
    try {
      const results = await Promise.all(others.map(async y => {
        const j = await fetch(`/api/coa?book=${tab}&year=${y}`, { credentials: 'include' }).then(r => r.json()).catch(() => ({}))
        return [y, j.success && Array.isArray(j.list) ? j.list.length : 0] as [string, number]
      }))
      setImportCounts(Object.fromEntries(results))
    } catch { /* ignore */ } finally { setImportLoading(false) }
  }
  const importFromYear = async (fromYear: string) => {
    setShowImport(false); setLoading(true); setMsg('')
    try {
      const j = await fetch(`/api/coa?book=${tab}&year=${fromYear}`, { credentials: 'include' }).then(r => r.json())
      const list = j.success && Array.isArray(j.list) ? (j.list as Gwan[]) : []
      setTree(resequence(list))
      setMsg(`📥 ${fromYear}년 계정 불러옴 (관 ${list.length}개) — [저장] 눌러 ${year}년에 반영`)
      setTimeout(() => setMsg(''), 4000)
    } catch (e) { setMsg(`❌ ${e instanceof Error ? e.message : e}`) } finally { setLoading(false) }
  }

  const roCode = 'w-16 px-1.5 py-1 text-sm text-center font-medium text-slate-500 bg-slate-100 border border-slate-100 rounded shrink-0'
  const nameCls = 'flex-1 min-w-0 px-2 py-1 border border-slate-200 rounded text-sm focus:outline-none focus:border-blue-400'
  const addBtn = 'text-[11px] font-bold px-2 py-0.5 rounded border'
  const delBtn = 'text-[11px] text-rose-500 hover:underline shrink-0'
  const gubunCount = tree.filter(g => g.gubun === gubun).length

  if (allowed === null) return <div className="p-10 text-center text-sm text-slate-400">확인 중…</div>
  if (allowed === false) return (
    <div className="p-16 flex flex-col items-center gap-3 text-center">
      <div className="text-4xl">🔒</div>
      <div className="text-lg font-bold text-slate-700">아이사랑꿈터 전용 페이지</div>
      <p className="text-sm text-slate-500">회계계정관리는 아이사랑꿈터 계정에서만 사용할 수 있습니다.</p>
      <a href="/accounting" className="text-sm font-bold text-blue-600 hover:underline">← 회계현황으로</a>
    </div>
  )

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-lg font-bold text-slate-800">회계계정관리</h1>
        <span className="text-xs text-slate-400">세입·세출 각각 관 › 항 › 목 › 세목. 번호는 부모에서 자동 파생. 예산서·전표관리에 적용.</span>
      </div>

      {/* 장부 탭 */}
      <div className="flex items-center gap-1 border-b border-slate-200">
        {TABS.map(t => (
          <button key={t.code} onClick={() => setTab(t.code)}
            className={`px-4 py-2 text-sm font-bold border-b-2 -mb-px transition-colors ${tab === t.code ? 'text-blue-600 border-blue-500' : 'text-slate-400 border-transparent hover:text-slate-600'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* 상단: 세입/세출 전환 + 툴바 */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="inline-flex rounded-lg overflow-hidden border border-slate-200 text-sm font-bold">
          {GUBUNS.map(gb => (
            <button key={gb} onClick={() => setGubun(gb)}
              className={`px-5 py-1.5 ${gubun === gb ? (gb === '세입' ? 'bg-sky-500 text-white' : 'bg-rose-500 text-white') : 'bg-white text-slate-400 hover:bg-slate-50'} ${gb === '세출' ? 'border-l border-slate-200' : ''}`}>
              {gb}
            </button>
          ))}
        </div>
        {msg && <span className="text-xs font-semibold text-slate-600">{msg}</span>}
        <div className="ml-auto flex items-center gap-2">
          <button onClick={openImport} disabled={loading} className="text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5 hover:bg-blue-100 disabled:opacity-50">📥 이전 계정 불러오기</button>
          <select value={year} onChange={e => setYear(e.target.value)} className="text-sm border rounded-lg px-2 py-1.5 bg-white">
            {YEARS.map(y => <option key={y} value={y}>{y}년</option>)}
          </select>
          <button onClick={save} disabled={loading} className="text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg px-4 py-1.5 disabled:opacity-50">💾 저장</button>
        </div>
      </div>

      {/* 현재 구분(세입/세출) 트리 */}
      <div className={`rounded-lg border-2 p-3 space-y-2 ${gubun === '세입' ? 'border-sky-200 bg-sky-50/30' : 'border-rose-200 bg-rose-50/30'}`}>
        <div className={`text-sm font-bold ${gubun === '세입' ? 'text-sky-700' : 'text-rose-700'}`}>{gubun} 계정과목</div>

        {gubunCount === 0 && (
          <div className="text-center text-sm text-slate-400 py-8">{loading ? '불러오는 중…' : `${gubun} 관이 없습니다. [+ 관 추가]로 시작하세요.`}</div>
        )}

        {tree.map((g, gi) => {
          if (g.gubun !== gubun) return null
          return (
            <div key={gi} className="border border-slate-200 rounded-lg overflow-hidden bg-white">
              {/* 관 */}
              <div className="flex items-center gap-2 bg-purple-50 px-3 py-2 border-b border-purple-100">
                <span className="text-[10px] font-bold text-white bg-purple-500 rounded px-1.5 py-0.5 shrink-0">관</span>
                <span className={roCode}>{g.code || '-'}</span>
                <input value={g.name} onChange={e => patchGwan(gi, 'name', e.target.value)} onBlur={() => ensureFirstHang(gi)} placeholder="관 명칭 (입력 후 기본 항 자동 생성)" className={nameCls} />
                <button onClick={() => addHang(gi)} className={`${addBtn} text-blue-600 border-blue-300 hover:bg-blue-50`}>+ 항</button>
                {Number(g.code) > 9 && <button onClick={() => delGwan(gi)} className={delBtn}>관 삭제</button>}
              </div>

              {/* 항 */}
              {g.hangs.map((h, hi) => (
                <div key={hi} className="pl-6 border-b border-slate-100 last:border-0">
                  <div className="flex items-center gap-2 bg-blue-50/50 px-3 py-1.5">
                    <span className="text-[10px] font-bold text-white bg-blue-500 rounded px-1.5 py-0.5 shrink-0">항</span>
                    <span className={roCode}>{h.code || '-'}</span>
                    <input value={h.name} onChange={e => patchHang(gi, hi, e.target.value)} onBlur={() => ensureFirstMok(gi, hi)} placeholder="항 명칭 (입력 후 기본 목 자동)" className={nameCls} />
                    <button onClick={() => addMok(gi, hi)} className={`${addBtn} text-emerald-600 border-emerald-300 hover:bg-emerald-50`}>+ 목</button>
                    <button onClick={() => delHang(gi, hi)} className={delBtn}>삭제</button>
                  </div>

                  {/* 목 */}
                  {h.moks.map((m, mi) => (
                    <div key={mi} className="pl-6">
                      <div className="flex items-center gap-2 px-3 py-1.5">
                        <span className="text-[10px] font-bold text-white bg-emerald-500 rounded px-1.5 py-0.5 shrink-0">목</span>
                        <span className={roCode}>{m.code || '-'}</span>
                        <input value={m.name} onChange={e => patchMok(gi, hi, mi, e.target.value)} onBlur={() => ensureFirstSub(gi, hi, mi)} placeholder="목 명칭 (입력 후 기본 세목 자동)" className={nameCls} />
                        <button onClick={() => addSub(gi, hi, mi)} className={`${addBtn} text-amber-600 border-amber-300 hover:bg-amber-50`}>+ 세목</button>
                        <button onClick={() => delMok(gi, hi, mi)} className={delBtn}>삭제</button>
                      </div>

                      {/* 세목 */}
                      {m.subs.map((s, si) => (
                        <div key={si} className="pl-6">
                          <div className="flex items-center gap-2 px-3 py-1.5">
                            <span className="text-[10px] font-bold text-white bg-amber-500 rounded px-1.5 py-0.5 shrink-0">세목</span>
                            <span className={roCode}>{s.code || '-'}</span>
                            <input value={s.name} onChange={e => patchSub(gi, hi, mi, si, e.target.value)} placeholder="세목 명칭" className={nameCls} />
                            <button onClick={() => delSub(gi, hi, mi, si)} className={delBtn}>삭제</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )
        })}

        <button onClick={addGwan} className="w-full py-2 border border-dashed border-purple-300 text-purple-600 font-bold rounded-lg text-sm hover:bg-purple-50">+ 관 추가 ({gubun})</button>
      </div>

      {/* 이전 계정 불러오기 팝업 */}
      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowImport(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="font-bold text-slate-800">이전 계정 불러오기</h3>
              <button onClick={() => setShowImport(false)} className="text-slate-400 hover:text-slate-700 text-2xl leading-none">×</button>
            </div>
            <div className="p-4 space-y-2">
              <p className="text-xs text-slate-500">불러올 연도를 선택하세요. 현재 <b>{TABS.find(t => t.code === tab)?.label}</b> 장부 · <b>{year}년</b>으로 복사됩니다.</p>
              {importLoading ? (
                <div className="text-center text-sm text-slate-400 py-8">저장 건수 확인 중…</div>
              ) : (
                YEARS.filter(y => y !== year).map(y => {
                  const cnt = importCounts[y] ?? 0
                  return (
                    <button key={y} onClick={() => cnt > 0 && importFromYear(y)} disabled={cnt === 0}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-sm transition-colors ${cnt > 0 ? 'border-blue-200 hover:bg-blue-50 text-slate-700' : 'border-slate-100 text-slate-300 cursor-not-allowed'}`}>
                      <span className="font-bold">{y}년</span>
                      <span>{cnt > 0 ? `관 ${cnt}개` : '저장 없음'}</span>
                    </button>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
