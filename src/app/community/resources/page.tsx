'use client'
import React, { useState } from 'react'
const inputCls = "border border-teal-300 rounded px-2 py-1 text-[12px] focus:outline-none focus:border-teal-500"

const files = [
  { id: 134, title: '2025년 시간별 근로계약서', author: '개발자', date: '2023-07-05' },
  { id: 133, title: '2025년 최저임금호봉별급여대장', author: '개발자', date: '2023-06-14' },
  { id: 132, title: '2025년 급여대장예시', author: '관리자', date: '2014-03-08' },
  { id: 131, title: '2025년 보육사업안내', author: '개발자', date: '2013-02-26' },
  { id: 130, title: '2023년 표준취업규칙', author: '개발자', date: '2012-09-03' },
  { id: 129, title: '2024년 근로계약서 (보육교사,보조교사)', author: '수전자장부', date: '2012-05-03' },
  { id: 128, title: '해지요청서', author: '수전자장부', date: '2012-03-09' },
  { id: 127, title: '24년급여대장 예시표', author: '', date: '' },
  { id: 126, title: '2024년 최저임금표', author: '', date: '' },
  { id: 125, title: '재직증명서', author: '', date: '' },
  { id: 124, title: '경기도어린이집관리시스템등록방법', author: '', date: '' },
]

export default function ResourcesPage() {
  const [searchField, setSearchField] = useState('제목')
  const [search, setSearch] = useState('')
  const [perPage, setPerPage] = useState(20)

  return (
    <div className="p-3 space-y-3">
      <div className="bg-white rounded-xl border border-teal-400/30 shadow-sm">
        <div className="px-4 py-3 border-b border-teal-400/20">
          <span className="text-sm font-bold text-slate-700">자료실</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <select value={searchField} onChange={e => setSearchField(e.target.value)} className={`${inputCls} w-16`}>
          <option>제목</option><option>내용</option>
        </select>
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} className={`${inputCls} w-40`} />
        <button className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded">조회</button>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-[11px]">
          <thead><tr className="bg-slate-200 border-b border-slate-300">
            <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-300 w-[50px]">No.</th>
            <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-300" colSpan={2}>제목</th>
            <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-300 w-[80px]">작성자</th>
            <th className="px-2 py-2 text-center font-bold text-slate-600 w-[90px]">작성일</th>
          </tr></thead>
          <tbody>
            {files.map(f => (
              <tr key={f.id} className="border-b border-slate-100 hover:bg-blue-50/40 cursor-pointer">
                <td className="px-2 py-1.5 text-center text-slate-500 border-r border-slate-100">{f.id}</td>
                <td className="px-2 py-1.5 text-slate-700 border-r border-slate-100" colSpan={2}>{f.title}</td>
                <td className="px-2 py-1.5 text-center text-slate-600 border-r border-slate-100">{f.author}</td>
                <td className="px-2 py-1.5 text-center text-slate-500">{f.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-end text-xs text-slate-500 gap-1">
          <span>한 페이지당 글</span>
          <select value={perPage} onChange={e => setPerPage(Number(e.target.value))} className={`${inputCls} w-14`}>
            <option>20</option><option>50</option><option>100</option>
          </select>
          <span>개씩 보여주기</span>
        </div>
      </div>
    </div>
  )
}
