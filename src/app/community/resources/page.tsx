'use client'
import React, { useState } from 'react'
const inputCls = "border border-teal-300 rounded px-2 py-1 text-[12px] focus:outline-none focus:border-teal-500"

const files: { id: number; title: string; author: string; date: string; hasFile: boolean }[] = []

export default function ResourcesPage() {
  const [mode, setMode] = useState<'list' | 'write'>('list')
  const [searchField, setSearchField] = useState('제목')
  const [search, setSearch] = useState('')
  const [perPage, setPerPage] = useState(20)

  // 쓰기 폼 상태
  const [writeTitle, setWriteTitle] = useState('')
  const [writeContent, setWriteContent] = useState('')
  const [writeFiles, setWriteFiles] = useState<(File | null)[]>([null, null, null, null, null])

  const handleFileChange = (idx: number, file: File | null) => {
    const next = [...writeFiles]
    next[idx] = file
    setWriteFiles(next)
  }

  if (mode === 'write') {
    return (
      <div className="p-3 space-y-3">
        <div className="bg-white rounded-xl border border-teal-400/30 shadow-sm">
          <div className="px-4 py-3 border-b border-teal-400/20">
            <span className="text-sm font-bold text-slate-700">자료실 글쓰기</span>
          </div>
          <div className="p-0">
            <table className="w-full text-[13px] border-collapse">
              <tbody>
                <tr className="border-b border-slate-200">
                  <td className="px-4 py-3 bg-slate-50 font-bold text-slate-700 border-r border-slate-200 w-[100px] text-center">제목</td>
                  <td className="px-4 py-3">
                    <input type="text" value={writeTitle} onChange={e => setWriteTitle(e.target.value)} className={`${inputCls} w-full py-2`} placeholder="제목을 입력하세요" />
                  </td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="px-4 py-3 bg-slate-50 font-bold text-slate-700 border-r border-slate-200 text-center">작성자</td>
                  <td className="px-4 py-3 text-[13px] text-slate-600">누리터</td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="px-4 py-3 bg-slate-50 font-bold text-slate-700 border-r border-slate-200 text-center align-top">첨부파일</td>
                  <td className="px-4 py-3 space-y-2">
                    {writeFiles.map((f, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <label className="px-3 py-1 text-[11px] font-bold text-slate-600 bg-slate-100 border border-slate-300 rounded cursor-pointer hover:bg-slate-200">
                          파일 선택
                          <input type="file" className="hidden" onChange={e => handleFileChange(i, e.target.files?.[0] || null)} />
                        </label>
                        <span className="text-[11px] text-slate-400">{f ? f.name : '선택된 파일 없음'}</span>
                      </div>
                    ))}
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 bg-slate-50 font-bold text-slate-700 border-r border-slate-200 text-center align-top">내용</td>
                  <td className="px-4 py-3">
                    <textarea value={writeContent} onChange={e => setWriteContent(e.target.value)} className={`${inputCls} w-full h-[400px] py-2 resize-y`} placeholder="내용을 입력하세요" />
                    <p className="text-[10px] text-red-500 mt-1">* 편집기 내(내용부문)의 이미지 가로사이즈는 500px 이내 등록하셔야 최적화된 정보제공이 가능합니다.</p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button onClick={() => setMode('list')} className="px-6 py-1.5 text-[12px] font-bold text-slate-600 bg-slate-100 border border-slate-300 rounded hover:bg-slate-200">목록</button>
            <button className="px-6 py-1.5 text-[12px] font-bold text-white bg-teal-500 rounded hover:bg-teal-600">저장</button>
          </div>
        </div>
      </div>
    )
  }

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
        <button className="px-4 py-1.5 text-xs font-bold text-white bg-teal-500 hover:bg-teal-600 rounded">조회</button>
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
                <td className="px-2 py-1.5 text-slate-700 border-r border-slate-100" colSpan={2}>{f.title}{f.hasFile && <span className="ml-1 text-slate-400" title="첨부파일">📎</span>}</td>
                <td className="px-2 py-1.5 text-center text-slate-600 border-r border-slate-100">{f.author}</td>
                <td className="px-2 py-1.5 text-center text-slate-500">{f.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>총 {files.length}개의 글이 있습니다.</span>
          <div className="flex items-center gap-1">
            <span>한 페이지당 글</span>
            <select value={perPage} onChange={e => setPerPage(Number(e.target.value))} className={`${inputCls} w-14`}>
              <option>20</option><option>50</option><option>100</option>
            </select>
            <span>개씩 보여주기</span>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-end gap-2">
        <button onClick={() => setMode('list')} className="px-6 py-1.5 text-[12px] font-bold text-slate-600 bg-slate-100 border border-slate-300 rounded hover:bg-slate-200">목록</button>
        <button onClick={() => setMode('write')} className="px-6 py-1.5 text-[12px] font-bold text-white bg-teal-500 rounded hover:bg-teal-600">쓰기</button>
      </div>
    </div>
  )
}
