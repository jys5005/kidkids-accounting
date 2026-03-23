'use client'
import React, { useState } from 'react'
const inputCls = "border border-teal-300 rounded px-2 py-1 text-[12px] focus:outline-none focus:border-teal-500"

const posts = [
  { id: 7, title: '한글 파일 형식 출력 사용방법 - 엣지 활용법', content: '', author: '개발자', date: '2023-07-05' },
  { id: 6, title: '우리은행(인증조회) 서비스를 사용하는 시설에게 안내드립..', content: '', author: '개발자', date: '2023-06-14' },
  { id: 5, title: '인증키발급 안내', content: '', author: '관리자', date: '2014-03-08' },
  { id: 4, title: '적적금 한도액 설정에 대한 안내입니다.', content: '', author: '개발자', date: '2013-02-26' },
  { id: 3, title: '거래 내역 자동저장 설정 또는 해지에 대한 안내입니다.', content: '', author: '개발자', date: '2012-09-03' },
  { id: 2, title: '종사자 관리에서 엑셀업로드 관련 안내드립니다.', content: '', author: '수전자장부', date: '2012-05-03' },
  { id: 1, title: '장부인쇄 시 도장등록하여 사용하세요.', content: '', author: '수전자장부', date: '2012-03-09' },
]

export default function NoticePage() {
  const [searchField, setSearchField] = useState('제목')
  const [search, setSearch] = useState('')
  const [perPage, setPerPage] = useState(20)

  return (
    <div className="p-3 space-y-3">
      <div className="bg-white rounded-xl border border-teal-400/30 shadow-sm">
        <div className="px-4 py-3 border-b border-teal-400/20">
          <span className="text-sm font-bold text-slate-700">공지사항</span>
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
            {posts.map(p => (
              <tr key={p.id} className="border-b border-slate-100 hover:bg-blue-50/40 cursor-pointer">
                <td className="px-2 py-1.5 text-center text-slate-500 border-r border-slate-100">{p.id}</td>
                <td className="px-2 py-1.5 text-slate-700 border-r border-slate-100" colSpan={2}>{p.title}</td>
                <td className="px-2 py-1.5 text-center text-slate-600 border-r border-slate-100">{p.author}</td>
                <td className="px-2 py-1.5 text-center text-slate-500">{p.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>총 {posts.length}개의 글이 있습니다.</span>
          <div className="flex items-center gap-1">
            <span>한 페이지당 글</span>
            <select value={perPage} onChange={e => setPerPage(Number(e.target.value))} className={`${inputCls} w-14`}>
              <option>20</option><option>50</option><option>100</option>
            </select>
            <span>개씩 보여주기</span>
          </div>
        </div>
      </div>
    </div>
  )
}
