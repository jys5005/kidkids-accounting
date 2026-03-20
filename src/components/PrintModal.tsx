'use client'

import { useRef } from 'react'
import * as XLSX from 'xlsx'

interface Column {
  key: string
  label: string
  align?: 'left' | 'center' | 'right'
  width?: number
  render?: (value: unknown, row: Record<string, unknown>) => string
}

interface PrintModalProps {
  title: string
  columns: Column[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>[]
  onClose: () => void
  summary?: { label: string; value: string; color?: string }[]
}

export default function PrintModal({ title, columns, data, onClose, summary }: PrintModalProps) {
  const printRef = useRef<HTMLDivElement>(null)

  const handlePrint = () => {
    const content = printRef.current
    if (!content) return
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`
      <html><head><title>${title}</title>
      <style>
        body { font-family: 'Malgun Gothic', sans-serif; font-size: 12px; padding: 20px; }
        h2 { text-align: center; margin-bottom: 10px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ccc; padding: 6px 8px; }
        th { background: #f5f5f5; font-weight: normal; }
        .right { text-align: right; }
        .center { text-align: center; }
        .summary { margin-top: 10px; font-size: 11px; }
        @media print { body { margin: 0; } }
      </style></head><body>
      <h2>${title}</h2>
      ${content.innerHTML}
      </body></html>
    `)
    win.document.close()
    win.focus()
    win.print()
  }

  const handleExcel = () => {
    const ws = XLSX.utils.json_to_sheet(
      data.map(row => {
        const obj: Record<string, unknown> = {}
        columns.forEach(col => {
          obj[col.label] = col.render ? col.render(row[col.key], row) : row[col.key]
        })
        return obj
      })
    )
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, title)
    XLSX.writeFile(wb, `${title}.xlsx`)
  }

  const handleCSV = () => {
    const ws = XLSX.utils.json_to_sheet(
      data.map(row => {
        const obj: Record<string, unknown> = {}
        columns.forEach(col => {
          obj[col.label] = col.render ? col.render(row[col.key], row) : row[col.key]
        })
        return obj
      })
    )
    const csv = XLSX.utils.sheet_to_csv(ws)
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${title}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  const handleHtml = () => {
    const content = printRef.current
    if (!content) return
    const html = `<html><head><meta charset="utf-8"><title>${title}</title>
      <style>table{width:100%;border-collapse:collapse;}th,td{border:1px solid #ccc;padding:6px 8px;}th{background:#f5f5f5;}.right{text-align:right;}.center{text-align:center;}</style>
      </head><body><h2 style="text-align:center">${title}</h2>${content.innerHTML}</body></html>`
    const blob = new Blob([html], { type: 'application/msword;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${title}.doc`; a.click()
    URL.revokeObjectURL(url)
  }

  const fmt = (n: unknown) => typeof n === 'number' ? n.toLocaleString('ko-KR') : String(n ?? '')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-[900px] max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* 헤더 */}
        <div className="px-6 py-3 border-b border-[#f5b800]/20 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-700">{title}</h3>
          <div className="flex items-center gap-2">
            <button onClick={handlePrint} className="px-3 py-1.5 text-[11px] font-bold border border-slate-300 rounded bg-white hover:bg-slate-50 text-slate-600 flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18.75 12h.008v.008h-.008V12zm-3 0h.008v.008h-.008V12z" /></svg>
              인쇄
            </button>
            <button onClick={handleExcel} className="px-3 py-1.5 text-[11px] font-bold border border-green-400 rounded bg-green-50 hover:bg-green-100 text-green-700 flex items-center gap-1">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M14.5 1H6a2 2 0 00-2 2v18a2 2 0 002 2h12a2 2 0 002-2V6.5L14.5 1zM14 2l5 5h-5V2zM7.5 17.5L10 13l-2.5-4.5h1.8L10.8 11l1.5-2.5h1.8L11.6 13l2.5 4.5h-1.8L10.8 15l-1.5 2.5H7.5z" /></svg>
              엑셀
            </button>
            <button onClick={handleCSV} className="px-3 py-1.5 text-[11px] font-bold border border-slate-300 rounded bg-white hover:bg-slate-50 text-slate-600 flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
              CSV
            </button>
            <button onClick={handleHtml} className="px-3 py-1.5 text-[11px] font-bold border border-blue-300 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
              한글(DOC)
            </button>
          </div>
        </div>

        {/* 미리보기 */}
        <div className="overflow-auto flex-1 p-4">
          <div ref={printRef}>
            {summary && (
              <div className="flex items-center gap-6 text-xs mb-3">
                {summary.map((s, i) => (
                  <span key={i} className="text-slate-500">{s.label}: <span className={`font-bold ${s.color || 'text-slate-700'}`}>{s.value}</span></span>
                ))}
              </div>
            )}
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr>
                  {columns.map(col => (
                    <th key={col.key} className={`border border-slate-300 px-3 py-2 bg-[#fffbeb] font-normal text-slate-700 ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`}
                      style={col.width ? { width: col.width } : undefined}>
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row, idx) => (
                  <tr key={idx} className={idx % 2 === 1 ? 'bg-slate-50' : ''}>
                    {columns.map(col => (
                      <td key={col.key} className={`border border-slate-200 px-3 py-2 ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`}>
                        {col.render ? col.render(row[col.key], row) : (typeof row[col.key] === 'number' ? fmt(row[col.key]) : (row[col.key] || '-'))}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 하단 */}
        <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-400">{data.length}건</span>
          <button onClick={onClose} className="px-5 py-1.5 text-xs font-bold text-white bg-[#f5b800] rounded-lg hover:bg-[#e5ab00]">닫기</button>
        </div>
      </div>
    </div>
  )
}
