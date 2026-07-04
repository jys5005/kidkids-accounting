'use client'

import { useState, useEffect, useCallback } from 'react'
import { ILOVECHILD_BOOKS } from '@/lib/ilovechild-books'

// 계층(트리) 계정과목 — 관(2) › 항(2) › 목(3) › 세목(4). 어린이집 룰과 동일하게 코드 파생.
//   관 04 → 항 41,42 (관 끝자리+순번) → 목 411,412 (항+순번) → 세목 4111 (목+순번)
interface Sub  { code: string; name: string }
interface Mok  { code: string; name: string; subs: Sub[] }
interface Hang { code: string; name: string; moks: Mok[] }
interface Gwan { gubun: '세입' | '세출'; code: string; name: string; hangs: Hang[] }

const TABS = ILOVECHILD_BOOKS
const YEARS = ['2024', '2025', '2026', '2027', '2028']
const onlyNum = (v: string, len: number) => v.replace(/[^0-9]/g, '').slice(0, len)

export default function CoaSettingsPage() {
  const [year, setYear] = useState('2026')
  const [tab, setTab] = useState(ILOVECHILD_BOOKS[0].code)
  const [tree, setTree] = useState<Gwan[]>([])
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [showImport, setShowImport] = useState(false)
  const [importCounts, setImportCounts] = useState<Record<string, number>>({})
  const [importLoading, setImportLoading] = useState(false)

  const load = useCallback(async (bk: string, yr: string) => {
    setLoading(true); setMsg('')
    try {
      const j = await fetch(`/api/coa?book=${bk}&year=${yr}`, { credentials: 'include' }).then(r => r.json())
      setTree(j.success && Array.isArray(j.list) ? (j.list as Gwan[]) : [])
    } catch { setTree([]) } finally { setLoading(false) }
  }, [])
  useEffect(() => { load(tab, year) }, [tab, year, load])

  // ── 계층 추가 (코드 자동 파생) ──
  const addGwan = () => setTree(p => [...p, { gubun: '세출', code: '', name: '', hangs: [] }])
  const addHang = (gi: number) => setTree(p => p.map((g, i) => i !== gi ? g : {
    ...g, hangs: [...g.hangs, { code: `${g.code.slice(-1) || ''}${g.hangs.length + 1}`, name: '', moks: [] }],
  }))
  const addMok = (gi: number, hi: number) => setTree(p => p.map((g, i) => i !== gi ? g : {
    ...g, hangs: g.hangs.map((h, j) => j !== hi ? h : { ...h, moks: [...h.moks, { code: `${h.code}${h.moks.length + 1}`, name: '', subs: [] }] }),
  }))
  const addSub = (gi: number, hi: number, mi: number) => setTree(p => p.map((g, i) => i !== gi ? g : {
    ...g, hangs: g.hangs.map((h, j) => j !== hi ? h : { ...h, moks: h.moks.map((m, k) => k !== mi ? m : { ...m, subs: [...m.subs, { code: `${m.code}${m.subs.length + 1}`, name: '' }] }) }),
  }))

  // ── 필드 수정 ──
  const patchGwan = (gi: number, key: keyof Gwan, v: string) => setTree(p => p.map((g, i) => i !== gi ? g : { ...g, [key]: v }))
  const patchHang = (gi: number, hi: number, key: keyof Hang, v: string) => setTree(p => p.map((g, i) => i !== gi ? g : { ...g, hangs: g.hangs.map((h, j) => j !== hi ? h : { ...h, [key]: v }) }))
  const patchMok = (gi: number, hi: number, mi: number, key: keyof Mok, v: string) => setTree(p => p.map((g, i) => i !== gi ? g : { ...g, hangs: g.hangs.map((h, j) => j !== hi ? h : { ...h, moks: h.moks.map((m, k) => k !== mi ? m : { ...m, [key]: v }) }) }))
  const patchSub = (gi: number, hi: number, mi: number, si: number, key: keyof Sub, v: string) => setTree(p => p.map((g, i) => i !== gi ? g : { ...g, hangs: g.hangs.map((h, j) => j !== hi ? h : { ...h, moks: h.moks.map((m, k) => k !== mi ? m : { ...m, subs: m.subs.map((s, l) => l !== si ? s : { ...s, [key]: v }) }) }) }))

  // ── 삭제 ──
  const delGwan = (gi: number) => setTree(p => p.filter((_, i) => i !== gi))
  const delHang = (gi: number, hi: number) => setTree(p => p.map((g, i) => i !== gi ? g : { ...g, hangs: g.hangs.filter((_, j) => j !== hi) }))
  const delMok = (gi: number, hi: number, mi: number) => setTree(p => p.map((g, i) => i !== gi ? g : { ...g, hangs: g.hangs.map((h, j) => j !== hi ? h : { ...h, moks: h.moks.filter((_, k) => k !== mi) }) }))
  const delSub = (gi: number, hi: number, mi: number, si: number) => setTree(p => p.map((g, i) => i !== gi ? g : { ...g, hangs: g.hangs.map((h, j) => j !== hi ? h : { ...h, moks: h.moks.map((m, k) => k !== mi ? m : { ...m, subs: m.subs.filter((_, l) => l !== si) }) }) }))

  const save = async () => {
    setLoading(true); setMsg('')
    try {
      const j = await fetch('/api/coa', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ book: tab, year, list: tree }),
      }).then(r => r.json())
      setMsg(j.success ? '✅ 저장되었습니다' : `❌ 저장 실패: ${j.error || ''}`)
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
      setTree(list)
      setMsg(`📥 ${fromYear}년 계정 불러옴 (관 ${list.length}개) — [저장] 눌러 ${year}년에 반영`)
      setTimeout(() => setMsg(''), 4000)
    } catch (e) { setMsg(`❌ ${e instanceof Error ? e.message : e}`) } finally { setLoading(false) }
  }

  const codeCls = 'w-16 px-1.5 py-1 border border-slate-200 rounded text-sm text-center focus:outline-none focus:border-blue-400'
  const nameCls = 'flex-1 min-w-0 px-2 py-1 border border-slate-200 rounded text-sm focus:outline-none focus:border-blue-400'
  const addBtn = 'text-[11px] font-bold px-2 py-0.5 rounded border'
  const delBtn = 'text-[11px] text-rose-500 hover:underline shrink-0'

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-lg font-bold text-slate-800">회계계정관리</h1>
        <span className="text-xs text-slate-400">관 › 항 › 목 › 세목 계층으로 계정과목을 만듭니다. 코드는 부모에서 자동 파생됩니다. 예산서·전표관리에 적용.</span>
      </div>

      {/* 탭: 3개 장부 */}
      <div className="flex items-center gap-1 border-b border-slate-200">
        {TABS.map(t => (
          <button key={t.code} onClick={() => setTab(t.code)}
            className={`px-4 py-2 text-sm font-bold border-b-2 -mb-px transition-colors ${tab === t.code ? 'text-blue-600 border-blue-500' : 'text-slate-400 border-transparent hover:text-slate-600'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* 툴바 */}
      <div className="flex items-center gap-2 flex-wrap">
        {msg && <span className="text-xs font-semibold text-slate-600">{msg}</span>}
        <div className="ml-auto flex items-center gap-2">
          <button onClick={openImport} disabled={loading} className="text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5 hover:bg-blue-100 disabled:opacity-50">📥 이전 계정 불러오기</button>
          <select value={year} onChange={e => setYear(e.target.value)} className="text-sm border rounded-lg px-2 py-1.5 bg-white">
            {YEARS.map(y => <option key={y} value={y}>{y}년</option>)}
          </select>
          <button onClick={save} disabled={loading} className="text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg px-4 py-1.5 disabled:opacity-50">💾 저장</button>
        </div>
      </div>

      {/* 계층 트리 편집 */}
      <div className="space-y-2">
        {tree.length === 0 && (
          <div className="text-center text-sm text-slate-400 py-10 border border-slate-100 rounded-lg">
            {loading ? '불러오는 중…' : '계정이 없습니다. [+ 관 추가] 또는 [이전 계정 불러오기]로 시작하세요.'}
          </div>
        )}

        {tree.map((g, gi) => (
          <div key={gi} className="border border-slate-200 rounded-lg overflow-hidden">
            {/* 관 */}
            <div className="flex items-center gap-2 bg-purple-50 px-3 py-2 border-b border-purple-100">
              <span className="text-[10px] font-bold text-white bg-purple-500 rounded px-1.5 py-0.5 shrink-0">관</span>
              <select value={g.gubun} onChange={e => patchGwan(gi, 'gubun', e.target.value)} className="text-xs px-1.5 py-1 border border-slate-200 rounded bg-white shrink-0">
                <option value="세입">세입</option><option value="세출">세출</option>
              </select>
              <input value={g.code} onChange={e => patchGwan(gi, 'code', onlyNum(e.target.value, 2))} placeholder="04" className={codeCls} />
              <input value={g.name} onChange={e => patchGwan(gi, 'name', e.target.value)} placeholder="관 명칭" className={nameCls} />
              <button onClick={() => addHang(gi)} className={`${addBtn} text-blue-600 border-blue-300 hover:bg-blue-50`}>+ 항</button>
              <button onClick={() => delGwan(gi)} className={delBtn}>관 삭제</button>
            </div>

            {/* 항 */}
            {g.hangs.map((h, hi) => (
              <div key={hi} className="pl-6 border-b border-slate-100 last:border-0">
                <div className="flex items-center gap-2 bg-blue-50/50 px-3 py-1.5">
                  <span className="text-[10px] font-bold text-white bg-blue-500 rounded px-1.5 py-0.5 shrink-0">항</span>
                  <input value={h.code} onChange={e => patchHang(gi, hi, 'code', onlyNum(e.target.value, 2))} placeholder="41" className={codeCls} />
                  <input value={h.name} onChange={e => patchHang(gi, hi, 'name', e.target.value)} placeholder="항 명칭" className={nameCls} />
                  <button onClick={() => addMok(gi, hi)} className={`${addBtn} text-emerald-600 border-emerald-300 hover:bg-emerald-50`}>+ 목</button>
                  <button onClick={() => delHang(gi, hi)} className={delBtn}>삭제</button>
                </div>

                {/* 목 */}
                {h.moks.map((m, mi) => (
                  <div key={mi} className="pl-6">
                    <div className="flex items-center gap-2 px-3 py-1.5">
                      <span className="text-[10px] font-bold text-white bg-emerald-500 rounded px-1.5 py-0.5 shrink-0">목</span>
                      <input value={m.code} onChange={e => patchMok(gi, hi, mi, 'code', onlyNum(e.target.value, 3))} placeholder="411" className={codeCls} />
                      <input value={m.name} onChange={e => patchMok(gi, hi, mi, 'name', e.target.value)} placeholder="목 명칭" className={nameCls} />
                      <button onClick={() => addSub(gi, hi, mi)} className={`${addBtn} text-amber-600 border-amber-300 hover:bg-amber-50`}>+ 세목</button>
                      <button onClick={() => delMok(gi, hi, mi)} className={delBtn}>삭제</button>
                    </div>

                    {/* 세목 */}
                    {m.subs.map((s, si) => (
                      <div key={si} className="pl-6">
                        <div className="flex items-center gap-2 px-3 py-1.5">
                          <span className="text-[10px] font-bold text-white bg-amber-500 rounded px-1.5 py-0.5 shrink-0">세목</span>
                          <input value={s.code} onChange={e => patchSub(gi, hi, mi, si, 'code', onlyNum(e.target.value, 4))} placeholder="4111" className={codeCls} />
                          <input value={s.name} onChange={e => patchSub(gi, hi, mi, si, 'name', e.target.value)} placeholder="세목 명칭" className={nameCls} />
                          <button onClick={() => delSub(gi, hi, mi, si)} className={delBtn}>삭제</button>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>

      <button onClick={addGwan} className="w-full py-2.5 border border-dashed border-purple-300 text-purple-600 font-bold rounded-lg text-sm hover:bg-purple-50">+ 관 추가</button>

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
