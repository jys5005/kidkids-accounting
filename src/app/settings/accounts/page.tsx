'use client'

import { useState, useEffect, useCallback } from 'react'
import { ILOVECHILD_BOOKS } from '@/lib/ilovechild-books'

// 계정과목 1행 — 목(4자리)+세목(5자리) 코드+명칭 + 구분
interface CoaItem {
  gubun: '세입' | '세출'
  mokCode: string
  mokName: string
  subCode: string
  subName: string
}

// 탭: 헤더(공통 템플릿) + 3개 장부
const TABS = [{ code: 'template', label: '헤더(공통)' }, ...ILOVECHILD_BOOKS]
const YEARS = ['2024', '2025', '2026', '2027', '2028']
const emptyRow = (): CoaItem => ({ gubun: '세출', mokCode: '', mokName: '', subCode: '', subName: '' })

export default function CoaSettingsPage() {
  const [year, setYear] = useState('2026')
  const [tab, setTab] = useState('template')
  const [rows, setRows] = useState<CoaItem[]>([])
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [importYear, setImportYear] = useState('2025')

  const load = useCallback(async (bk: string, yr: string) => {
    setLoading(true); setMsg('')
    try {
      const j = await fetch(`/api/coa?book=${bk}&year=${yr}`, { credentials: 'include' }).then(r => r.json())
      setRows(j.success && Array.isArray(j.list) ? (j.list as CoaItem[]) : [])
    } catch { setRows([]) } finally { setLoading(false) }
  }, [])

  useEffect(() => { load(tab, year) }, [tab, year, load])

  const patch = (i: number, key: keyof CoaItem, v: string) =>
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, [key]: v } : r))
  const addRow = () => setRows(prev => [...prev, emptyRow()])
  const delRow = (i: number) => setRows(prev => prev.filter((_, idx) => idx !== i))

  const save = async () => {
    setLoading(true); setMsg('')
    try {
      const j = await fetch('/api/coa', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ book: tab, year, list: rows }),
      }).then(r => r.json())
      setMsg(j.success ? '✅ 저장되었습니다' : `❌ 저장 실패: ${j.error || ''}`)
      setTimeout(() => setMsg(''), 3000)
    } catch (e) { setMsg(`❌ ${e instanceof Error ? e.message : e}`) } finally { setLoading(false) }
  }

  // 이전(다른) 연도 저장분 불러오기 → 현재 화면으로 복사 (저장은 사용자가 [저장] 클릭)
  const importPrev = async () => {
    if (importYear === year) { setMsg('같은 연도입니다'); return }
    setLoading(true); setMsg('')
    try {
      const j = await fetch(`/api/coa?book=${tab}&year=${importYear}`, { credentials: 'include' }).then(r => r.json())
      const list = j.success && Array.isArray(j.list) ? (j.list as CoaItem[]) : []
      if (!list.length) { setMsg(`${importYear}년 저장된 계정이 없습니다`) }
      else { setRows(list); setMsg(`📥 ${importYear}년 계정 ${list.length}건 불러옴 — [저장] 눌러 ${year}년에 반영`) }
      setTimeout(() => setMsg(''), 4000)
    } catch (e) { setMsg(`❌ ${e instanceof Error ? e.message : e}`) } finally { setLoading(false) }
  }

  // 헤더(공통) → 3개 장부에 일괄 적용
  const applyToBooks = async () => {
    if (!confirm(`헤더(공통) 계정 ${rows.length}건을 보조금·이용료·보육정보센터 3개 장부(${year}년)에 적용할까요?\n각 장부의 ${year}년 계정이 덮어써집니다.`)) return
    setLoading(true); setMsg('')
    try {
      for (const b of ILOVECHILD_BOOKS) {
        await fetch('/api/coa', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
          body: JSON.stringify({ book: b.code, year, list: rows }),
        })
      }
      setMsg('✅ 3개 장부에 적용되었습니다')
      setTimeout(() => setMsg(''), 3000)
    } catch (e) { setMsg(`❌ ${e instanceof Error ? e.message : e}`) } finally { setLoading(false) }
  }

  const inputCls = 'w-full px-2 py-1 border border-slate-200 rounded text-sm focus:outline-none focus:border-blue-400'

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-lg font-bold text-slate-800">회계계정관리</h1>
        <span className="text-xs text-slate-400">장부·연도별 계정과목(목/세목)을 설정합니다. 예산서·전표관리에 적용됩니다.</span>
        <select value={year} onChange={e => setYear(e.target.value)} className="ml-auto text-sm border rounded-lg px-2 py-1.5 bg-white">
          {YEARS.map(y => <option key={y} value={y}>{y}년</option>)}
        </select>
      </div>

      {/* 탭: 헤더 + 3개 장부 */}
      <div className="flex items-center gap-1 border-b border-slate-200">
        {TABS.map(t => (
          <button key={t.code} onClick={() => setTab(t.code)}
            className={`px-4 py-2 text-sm font-bold border-b-2 -mb-px transition-colors ${
              tab === t.code ? 'text-blue-600 border-blue-500' : 'text-slate-400 border-transparent hover:text-slate-600'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* 도구 줄: 이전 연도 불러오기 + (헤더탭) 3장부 적용 + 저장 */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
          <span className="text-xs text-slate-500">이전 계정 불러오기</span>
          <select value={importYear} onChange={e => setImportYear(e.target.value)} className="text-sm border rounded px-1.5 py-0.5 bg-white">
            {YEARS.map(y => <option key={y} value={y}>{y}년</option>)}
          </select>
          <button onClick={importPrev} disabled={loading} className="text-xs font-bold text-blue-600 hover:underline disabled:opacity-50">📥 불러오기</button>
        </div>
        {tab === 'template' && (
          <button onClick={applyToBooks} disabled={loading} className="text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg px-3 py-1.5 disabled:opacity-50">
            헤더 → 3개 장부 일괄 적용
          </button>
        )}
        {msg && <span className="text-xs font-semibold text-slate-600">{msg}</span>}
        <button onClick={save} disabled={loading} className="ml-auto text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg px-4 py-1.5 disabled:opacity-50">
          💾 저장
        </button>
      </div>

      {/* 계정과목 표 */}
      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-2 py-2 w-10 font-normal">No</th>
              <th className="px-2 py-2 w-24 font-normal">구분</th>
              <th className="px-2 py-2 w-28 font-normal">목코드(4)</th>
              <th className="px-2 py-2 font-normal">목명</th>
              <th className="px-2 py-2 w-28 font-normal">세목코드(5)</th>
              <th className="px-2 py-2 font-normal">세목명</th>
              <th className="px-2 py-2 w-12 font-normal"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-slate-100">
                <td className="px-2 py-1 text-center text-slate-400">{i + 1}</td>
                <td className="px-2 py-1">
                  <select value={r.gubun} onChange={e => patch(i, 'gubun', e.target.value)} className={inputCls}>
                    <option value="세입">세입</option>
                    <option value="세출">세출</option>
                  </select>
                </td>
                <td className="px-2 py-1"><input value={r.mokCode} onChange={e => patch(i, 'mokCode', e.target.value.replace(/[^0-9]/g, '').slice(0, 4))} placeholder="0000" className={inputCls} /></td>
                <td className="px-2 py-1"><input value={r.mokName} onChange={e => patch(i, 'mokName', e.target.value)} placeholder="목 명칭" className={inputCls} /></td>
                <td className="px-2 py-1"><input value={r.subCode} onChange={e => patch(i, 'subCode', e.target.value.replace(/[^0-9]/g, '').slice(0, 5))} placeholder="00000" className={inputCls} /></td>
                <td className="px-2 py-1"><input value={r.subName} onChange={e => patch(i, 'subName', e.target.value)} placeholder="세목 명칭" className={inputCls} /></td>
                <td className="px-2 py-1 text-center"><button onClick={() => delRow(i)} className="text-xs text-rose-500 hover:underline">삭제</button></td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={7} className="px-2 py-10 text-center text-slate-400 text-sm">{loading ? '불러오는 중…' : '계정이 없습니다. [+ 행 추가] 또는 [이전 계정 불러오기]로 시작하세요.'}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <button onClick={addRow} className="w-full py-2.5 border border-dashed border-slate-300 text-slate-500 rounded-lg text-sm hover:bg-slate-50">+ 행 추가</button>
    </div>
  )
}
