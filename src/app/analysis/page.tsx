'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { getActiveBook, BOOK_CHANGE_EVENT, bookLabel } from '@/lib/ilovechild-books'

// 경영분석 집계표 — 계정과목별 예산/집행/차인잔액 + 월별(01~12) 집행 (아이사랑꿈터, coa 기반)
interface ACoaMok { code: string; name: string }
interface ACoaHang { code: string; name: string; moks?: ACoaMok[] }
interface ACoaGwan { gubun: string; code: string; name: string; hangs?: ACoaHang[] }
interface Mok { gwanCode: string; gwanName: string; hangCode: string; hangName: string; code: string; name: string; key: string }

const MONTHS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12']
const fmt = (n: number) => n ? n.toLocaleString('ko-KR') : ''
const pct = (a: number, b: number) => b > 0 ? `${Math.round(a / b * 100)}%` : ''

export default function AnalysisPage() {
  const [itype, setItype] = useState<string | null>(null)
  const [book, setBook] = useState('')
  const [year, setYear] = useState('2026')
  const [gubun, setGubun] = useState<'세입' | '세출'>('세입')
  const [level, setLevel] = useState<'관' | '항' | '목'>('목')
  const [tab, setTab] = useState<'집계표' | '계정차트' | '자금차트'>('집계표')
  const [tree, setTree] = useState<ACoaGwan[]>([])
  const [budget, setBudget] = useState<Record<string, { total?: number }[]>>({})
  const [vouchers, setVouchers] = useState<{ type?: string; amount?: number; accountCode?: string; date?: string }[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => setItype((d?.institutionType || d?.profile?.institutionType || 'childcare') as string)).catch(() => setItype('childcare'))
    setBook(getActiveBook())
    const onCh = (e: Event) => setBook(((e as CustomEvent).detail as string) || '')
    window.addEventListener(BOOK_CHANGE_EVENT, onCh)
    return () => window.removeEventListener(BOOK_CHANGE_EVENT, onCh)
  }, [])
  useEffect(() => {
    if (!book) return
    let alive = true
    setLoading(true)
    Promise.all([
      fetch(`/api/coa?book=${encodeURIComponent(book)}&year=${year}`).then(r => r.json()).catch(() => ({})),
      fetch(`/api/budget?book=${encodeURIComponent(book)}&year=${year}`).then(r => r.json()).catch(() => ({})),
      fetch(`/api/voucher/list?book=${encodeURIComponent(book)}`, { credentials: 'include' }).then(r => r.json()).catch(() => ({})),
    ]).then(([c, b, v]) => {
      if (!alive) return
      setTree(Array.isArray(c?.list) ? c.list : [])
      setBudget((Array.isArray(b?.list) && b.list[0] && (b.list[0] as { basisByMok?: Record<string, { total?: number }[]> }).basisByMok) || {})
      setVouchers(Array.isArray(v?.list) ? v.list : [])
    }).finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [book, year])

  // 목 목록 (선택 세입/세출)
  const moks = useMemo<Mok[]>(() => {
    const out: Mok[] = []
    const pf = gubun === '세출' ? 'E' : ''
    for (const g of tree) {
      if (g.gubun !== gubun) continue
      for (const h of g.hangs || []) for (const m of h.moks || []) out.push({ gwanCode: g.code, gwanName: g.name, hangCode: h.code, hangName: h.name, code: m.code, name: m.name, key: pf + m.code })
    }
    return out
  }, [tree, gubun])

  // 전표 집계: key별 총집행 + 월별
  const { execByKey, monthByKey } = useMemo(() => {
    const e: Record<string, number> = {}, mo: Record<string, Record<string, number>> = {}
    for (const vc of vouchers) {
      if (!vc.accountCode || (vc.date && String(vc.date).slice(0, 4) !== year)) continue
      const isInc = vc.type === '수입'
      const belongs = gubun === '세입' ? isInc : (vc.type === '지출' || vc.type === '반납')
      if (!belongs) continue
      const key = (isInc ? '' : 'E') + vc.accountCode
      const amt = Number(vc.amount) || 0
      e[key] = (e[key] || 0) + amt
      const mm = String(vc.date || '').slice(5, 7)
      if (mm) { (mo[key] ||= {})[mm] = ((mo[key] || {})[mm] || 0) + amt }
    }
    return { execByKey: e, monthByKey: mo }
  }, [vouchers, year, gubun])

  const budgetByKey = (key: string) => (budget[key] || []).reduce((s, it) => s + (it.total || 0), 0)

  // level 기준 그룹핑
  const rows = useMemo(() => {
    const map = new Map<string, { code: string; name: string; budget: number; exec: number; months: Record<string, number> }>()
    for (const m of moks) {
      const gk = level === '관' ? m.gwanCode : level === '항' ? `${m.gwanCode}-${m.hangCode}` : m.code
      const lbl = level === '관' ? { code: m.gwanCode, name: m.gwanName } : level === '항' ? { code: m.hangCode, name: m.hangName } : { code: m.code, name: m.name }
      let g = map.get(gk)
      if (!g) { g = { code: lbl.code, name: lbl.name, budget: 0, exec: 0, months: {} }; map.set(gk, g) }
      g.budget += budgetByKey(m.key)
      g.exec += execByKey[m.key] || 0
      const mm = monthByKey[m.key] || {}
      for (const k of MONTHS) if (mm[k]) g.months[k] = (g.months[k] || 0) + mm[k]
    }
    return [...map.values()]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moks, level, budget, execByKey, monthByKey])

  const tBudget = rows.reduce((s, r) => s + r.budget, 0)
  const tExec = rows.reduce((s, r) => s + r.exec, 0)
  const tMonth = (mm: string) => rows.reduce((s, r) => s + (r.months[mm] || 0), 0)

  if (itype === null) return null
  if (itype !== 'ilovechild') return <div className="p-8 text-center text-slate-400 text-sm">경영분석은 아이사랑꿈터 유형에서 사용합니다.</div>

  const radio = (label: string, on: boolean, set: () => void) => (
    <label className="flex items-center gap-1 cursor-pointer text-xs"><input type="radio" checked={on} onChange={set} className="w-3.5 h-3.5 accent-blue-600" /><span className={on ? 'font-bold text-slate-700' : 'text-slate-500'}>{label}</span></label>
  )

  return (
    <div className="p-3 space-y-3">
      {/* 조건 */}
      <div className="flex items-center gap-3 flex-wrap bg-white rounded-xl border border-slate-200 px-4 py-2.5">
        <select value={year} onChange={e => setYear(e.target.value)} className="border border-slate-300 rounded px-2 py-1.5 text-xs">
          <option value="2026">2026년</option><option value="2025">2025년</option><option value="2024">2024년</option>
        </select>
        <div className="w-px h-4 bg-slate-200" />
        {radio('세입', gubun === '세입', () => setGubun('세입'))}
        {radio('세출', gubun === '세출', () => setGubun('세출'))}
        <div className="w-px h-4 bg-slate-200" />
        {radio('관', level === '관', () => setLevel('관'))}
        {radio('항', level === '항', () => setLevel('항'))}
        {radio('목', level === '목', () => setLevel('목'))}
        <span className="ml-auto text-[11px] text-slate-400">장부(<b className="text-slate-600">{bookLabel(book)}</b>) · 집행=전표 · 예산=예산작성 {loading && '· 불러오는 중…'}</span>
      </div>

      {/* 탭 */}
      <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5 w-fit">
        {(['집계표', '계정차트', '자금차트'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-colors ${tab === t ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{t}</button>
        ))}
      </div>

      {tab === '집계표' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
          <table className="text-[11px] border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-slate-100 text-slate-600 font-bold">
                <th rowSpan={2} className="px-3 py-2 border border-slate-200 sticky left-0 bg-slate-100 z-10 min-w-[150px] text-left">계정과목</th>
                <th colSpan={2} className="px-2 py-1.5 border border-slate-200">예산액</th>
                <th colSpan={2} className="px-2 py-1.5 border border-slate-200">집행액</th>
                <th colSpan={2} className="px-2 py-1.5 border border-slate-200">차인잔액</th>
                {MONTHS.map(mm => <th key={mm} colSpan={2} className="px-2 py-1.5 border border-slate-200">{year.slice(2)}년 {mm}월</th>)}
              </tr>
              <tr className="bg-slate-50 text-slate-500 font-bold">
                {['금액', '점유율', '금액', '점유율', '금액', '집행률'].map((h, i) => <th key={i} className="px-2 py-1 border border-slate-200 w-[80px]">{h}</th>)}
                {MONTHS.map(mm => <React.Fragment key={mm}><th className="px-2 py-1 border border-slate-200 w-[80px]">금액</th><th className="px-2 py-1 border border-slate-200 w-[60px]">점유율</th></React.Fragment>)}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={6 + MONTHS.length * 2} className="px-2 py-8 text-center text-slate-400">계정과목이 없습니다. (설정 › 회계계정관리)</td></tr>}
              {rows.map((r, i) => {
                const rem = r.budget - r.exec
                return (
                  <tr key={i} className="hover:bg-blue-50/40">
                    <td className="px-3 py-1.5 border border-slate-200 sticky left-0 bg-white z-10"><span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 rounded px-1 py-px mr-1">{level}</span><span className="font-bold text-slate-700">{r.code}</span> <span className="text-slate-600">{r.name}</span></td>
                    <td className="px-2 py-1.5 border border-slate-200 text-right text-slate-700">{fmt(r.budget)}</td>
                    <td className="px-2 py-1.5 border border-slate-200 text-right text-slate-400">{pct(r.budget, tBudget)}</td>
                    <td className="px-2 py-1.5 border border-slate-200 text-right font-bold text-slate-800">{fmt(r.exec)}</td>
                    <td className="px-2 py-1.5 border border-slate-200 text-right text-slate-400">{pct(r.exec, tExec)}</td>
                    <td className={`px-2 py-1.5 border border-slate-200 text-right ${rem < 0 ? 'text-rose-600' : 'text-slate-600'}`}>{r.budget || r.exec ? fmt(rem) : ''}</td>
                    <td className={`px-2 py-1.5 border border-slate-200 text-right ${r.budget && r.exec / r.budget > 1 ? 'text-rose-600' : 'text-blue-600'}`}>{pct(r.exec, r.budget)}</td>
                    {MONTHS.map(mm => {
                      const amt = r.months[mm] || 0
                      return <React.Fragment key={mm}><td className="px-2 py-1.5 border border-slate-200 text-right text-slate-700">{fmt(amt)}</td><td className="px-2 py-1.5 border border-slate-200 text-right text-slate-400">{pct(amt, tMonth(mm))}</td></React.Fragment>
                    })}
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="bg-yellow-50 font-bold text-slate-700">
                <td className="px-3 py-2 border border-slate-200 sticky left-0 bg-yellow-50 z-10">합계</td>
                <td className="px-2 py-2 border border-slate-200 text-right">{fmt(tBudget)}</td>
                <td className="px-2 py-2 border border-slate-200" />
                <td className="px-2 py-2 border border-slate-200 text-right text-blue-700">{fmt(tExec)}</td>
                <td className="px-2 py-2 border border-slate-200" />
                <td className="px-2 py-2 border border-slate-200 text-right">{fmt(tBudget - tExec)}</td>
                <td className="px-2 py-2 border border-slate-200 text-right">{pct(tExec, tBudget)}</td>
                {MONTHS.map(mm => <React.Fragment key={mm}><td className="px-2 py-2 border border-slate-200 text-right">{fmt(tMonth(mm))}</td><td className="px-2 py-2 border border-slate-200" /></React.Fragment>)}
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {tab === '계정차트' && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
          <p className="text-xs font-bold text-slate-600 mb-2">계정과목별 예산 대비 집행</p>
          {rows.length === 0 && <p className="text-slate-400 text-sm text-center py-8">데이터가 없습니다.</p>}
          {rows.map((r, i) => {
            const max = Math.max(...rows.map(x => Math.max(x.budget, x.exec)), 1)
            return (
              <div key={i} className="flex items-center gap-2 text-[11px]">
                <span className="w-[130px] flex-shrink-0 truncate text-slate-700 font-medium">{r.code} {r.name}</span>
                <div className="flex-1 space-y-0.5">
                  <div className="h-3 bg-slate-100 rounded overflow-hidden"><div className="h-full bg-slate-300" style={{ width: `${r.budget / max * 100}%` }} /></div>
                  <div className="h-3 bg-slate-100 rounded overflow-hidden"><div className="h-full bg-teal-500" style={{ width: `${r.exec / max * 100}%` }} /></div>
                </div>
                <span className="w-[90px] text-right text-slate-500">예산 {fmt(r.budget)}</span>
                <span className="w-[90px] text-right font-bold text-blue-700">집행 {fmt(r.exec)}</span>
              </div>
            )
          })}
          <p className="text-[10px] text-slate-400 mt-2">회색=예산 / 파랑=집행</p>
        </div>
      )}

      {tab === '자금차트' && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs font-bold text-slate-600 mb-3">월별 집행 추이</p>
          {(() => {
            const maxM = Math.max(...MONTHS.map(mm => tMonth(mm)), 1)
            return (
              <div className="flex items-end gap-2 h-40">
                {MONTHS.map(mm => {
                  const v = tMonth(mm)
                  return (
                    <div key={mm} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-[9px] text-slate-500">{v ? fmt(v) : ''}</span>
                      <div className="w-full bg-teal-500 rounded-t" style={{ height: `${v / maxM * 100}%`, minHeight: v ? '2px' : '0' }} />
                      <span className="text-[10px] text-slate-400">{mm}월</span>
                    </div>
                  )
                })}
              </div>
            )
          })()}
        </div>
      )}
    </div>
  )
}
