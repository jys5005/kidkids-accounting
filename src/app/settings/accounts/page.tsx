'use client'

import { useState, useEffect, useCallback } from 'react'
import { ILOVECHILD_BOOKS } from '@/lib/ilovechild-books'

// 계정과목 1행 — 관/항/목 3단계 코드+명칭 + 구분(세입/세출)
// 코드 체계: 관 2자리[03] / 항 2자리[31] / 목 3자리[312] (알콩이회계 기준). 세목 미사용.
interface CoaItem {
  gubun: '세입' | '세출'
  gwanCode: string  // 관(款) 2
  gwanName: string
  hangCode: string  // 항(項) 2
  hangName: string
  mokCode: string   // 목(目) 3
  mokName: string
}

// 탭: 3개 장부 (헤더/공통 탭 제거 — 직접 세팅 후 [3개 장부 공통 적용]으로 복사)
const TABS = ILOVECHILD_BOOKS
const YEARS = ['2024', '2025', '2026', '2027', '2028']
const emptyRow = (): CoaItem => ({ gubun: '세출', gwanCode: '', gwanName: '', hangCode: '', hangName: '', mokCode: '', mokName: '' })

export default function CoaSettingsPage() {
  const [year, setYear] = useState('2026')
  const [tab, setTab] = useState(ILOVECHILD_BOOKS[0].code)
  const [rows, setRows] = useState<CoaItem[]>([])
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [showImport, setShowImport] = useState(false)
  const [importCounts, setImportCounts] = useState<Record<string, number>>({})
  const [importLoading, setImportLoading] = useState(false)

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

  // [이전 계정 불러오기] 팝업 열기 — 다른 연도별 저장 건수 조회해서 노출
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

  // 팝업에서 연도 선택 → 그 연도 계정을 현재 화면으로 복사 (저장은 사용자가 [저장])
  const importFromYear = async (fromYear: string) => {
    setShowImport(false); setLoading(true); setMsg('')
    try {
      const j = await fetch(`/api/coa?book=${tab}&year=${fromYear}`, { credentials: 'include' }).then(r => r.json())
      const list = j.success && Array.isArray(j.list) ? (j.list as CoaItem[]) : []
      setRows(list)
      setMsg(`📥 ${fromYear}년 계정 ${list.length}건 불러옴 — [저장] 눌러 ${year}년에 반영`)
      setTimeout(() => setMsg(''), 4000)
    } catch (e) { setMsg(`❌ ${e instanceof Error ? e.message : e}`) } finally { setLoading(false) }
  }

  // 현재 화면의 계정을 3개 장부에 공통 적용 (초기 세팅 후 복사용)
  const applyToBooks = async () => {
    if (!confirm(`현재 계정 ${rows.length}건을 보육정보센터·보조금·이용료 3개 장부(${year}년)에 공통 적용할까요?\n각 장부의 ${year}년 계정이 덮어써집니다.`)) return
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
        <span className="text-xs text-slate-400">장부별 계정과목(관·항·목)을 설정합니다. 예산서·전표관리에 적용됩니다.</span>
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
        <button onClick={openImport} disabled={loading}
          className="text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5 hover:bg-blue-100 disabled:opacity-50">
          📥 이전 계정 불러오기
        </button>
        <button onClick={applyToBooks} disabled={loading} className="text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg px-3 py-1.5 disabled:opacity-50">
          현재 계정 → 3개 장부 공통 적용
        </button>
        {msg && <span className="text-xs font-semibold text-slate-600">{msg}</span>}
        <div className="ml-auto flex items-center gap-2">
          <select value={year} onChange={e => setYear(e.target.value)} className="text-sm border rounded-lg px-2 py-1.5 bg-white">
            {YEARS.map(y => <option key={y} value={y}>{y}년</option>)}
          </select>
          <button onClick={save} disabled={loading} className="text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg px-4 py-1.5 disabled:opacity-50">
            💾 저장
          </button>
        </div>
      </div>

      {/* 계정과목 표 — 관(2)/항(2)/목(3) */}
      <div className="border border-slate-200 rounded-lg overflow-x-auto">
        <table className="w-full text-sm" style={{ minWidth: '760px' }}>
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-2 py-2 w-10 font-normal">No</th>
              <th className="px-2 py-2 w-20 font-normal">구분</th>
              <th className="px-2 py-2 w-20 font-normal">관코드</th>
              <th className="px-2 py-2 font-normal">관명</th>
              <th className="px-2 py-2 w-20 font-normal">항코드</th>
              <th className="px-2 py-2 font-normal">항명</th>
              <th className="px-2 py-2 w-20 font-normal">목코드</th>
              <th className="px-2 py-2 font-normal">목명</th>
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
                <td className="px-2 py-1"><input value={r.gwanCode} onChange={e => patch(i, 'gwanCode', e.target.value.replace(/[^0-9]/g, '').slice(0, 2))} placeholder="00" className={inputCls} /></td>
                <td className="px-2 py-1"><input value={r.gwanName} onChange={e => patch(i, 'gwanName', e.target.value)} placeholder="관 명칭" className={inputCls} /></td>
                <td className="px-2 py-1"><input value={r.hangCode} onChange={e => patch(i, 'hangCode', e.target.value.replace(/[^0-9]/g, '').slice(0, 2))} placeholder="00" className={inputCls} /></td>
                <td className="px-2 py-1"><input value={r.hangName} onChange={e => patch(i, 'hangName', e.target.value)} placeholder="항 명칭" className={inputCls} /></td>
                <td className="px-2 py-1"><input value={r.mokCode} onChange={e => patch(i, 'mokCode', e.target.value.replace(/[^0-9]/g, '').slice(0, 3))} placeholder="000" className={inputCls} /></td>
                <td className="px-2 py-1"><input value={r.mokName} onChange={e => patch(i, 'mokName', e.target.value)} placeholder="목 명칭" className={inputCls} /></td>
                <td className="px-2 py-1 text-center"><button onClick={() => delRow(i)} className="text-xs text-rose-500 hover:underline">삭제</button></td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={9} className="px-2 py-10 text-center text-slate-400 text-sm">{loading ? '불러오는 중…' : '계정이 없습니다. [+ 행 추가] 또는 [이전 계정 불러오기]로 시작하세요.'}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <button onClick={addRow} className="w-full py-2.5 border border-dashed border-slate-300 text-slate-500 rounded-lg text-sm hover:bg-slate-50">+ 행 추가</button>

      {/* 이전 계정 불러오기 팝업 — 연도별 저장 건수 표시 */}
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
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-sm transition-colors ${
                        cnt > 0 ? 'border-blue-200 hover:bg-blue-50 text-slate-700' : 'border-slate-100 text-slate-300 cursor-not-allowed'
                      }`}>
                      <span className="font-bold">{y}년</span>
                      <span>{cnt > 0 ? `계정 ${cnt}건` : '저장 없음'}</span>
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
