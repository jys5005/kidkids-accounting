'use client'
import React, { useState } from 'react'

const templates = ['샘플서식','필요경비 정산서','휴가 공문','상여금 공문','법인 결산서','임면 보고','면직 보고','감가상각비적립','결산서 공문','예산서 공문']

const sampleDocs = [
  { id: 1, title: '2026년 보육교직원 배치기준 안내', date: '2026-03-15' },
  { id: 2, title: '어린이집 안전점검 실시 안내', date: '2026-03-12' },
  { id: 3, title: '보육교직원 의무교육 안내', date: '2026-03-10' },
  { id: 4, title: '2026년 3월 보육료 지원 안내', date: '2026-03-05' },
  { id: 5, title: '어린이집 운영위원회 구성 보고', date: '2026-03-03' },
  { id: 6, title: '보육교직원 채용 보고', date: '2026-02-28' },
  { id: 7, title: '2026년 어린이집 예산서 제출', date: '2026-02-25' },
]

const inputCls = "border border-teal-300 rounded px-2 py-1 text-[12px] focus:outline-none focus:border-teal-500"

export default function DocumentPage() {
  const [docNo, setDocNo] = useState('')
  const [receiver, setReceiver] = useState('')
  const [title, setTitle] = useState('')
  const [manager, setManager] = useState('')
  const [collaborator, setCollaborator] = useState('')
  const [receiptDate, setReceiptDate] = useState('2026-03-24')
  const [content, setContent] = useState('')

  return (
    <div className="p-3 space-y-3">
      {/* 작성 폼 */}
      <div className="bg-white rounded-xl border border-teal-400/30 shadow-sm">
        <div className="px-4 py-3 border-b border-teal-400/20 flex items-center gap-2">
          <span className="text-sm font-bold text-slate-700">공문서</span>
          <span className="text-xs text-slate-400">공문서를 작성하고 관리합니다.</span>
        </div>
        <div className="p-4 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-medium text-slate-700 w-16">문서번호</span>
            <input type="text" value={docNo} onChange={e => setDocNo(e.target.value)} className={`${inputCls} w-48`} />
            <span className="text-[12px] text-slate-500">호</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-medium text-slate-700 w-16">수신자</span>
            <input type="text" value={receiver} onChange={e => setReceiver(e.target.value)} className={`${inputCls} w-48`} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-medium text-slate-700 w-16">제목</span>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} className={`${inputCls} flex-1`} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-medium text-slate-700 w-16">담당자</span>
            <input type="text" value={manager} onChange={e => setManager(e.target.value)} className={`${inputCls} w-32`} />
            <span className="text-[12px] font-medium text-slate-700 ml-4">협조자</span>
            <input type="text" value={collaborator} onChange={e => setCollaborator(e.target.value)} className={`${inputCls} w-32`} />
            <span className="text-[12px] font-medium text-slate-700 ml-auto">접수일</span>
            <input type="date" value={receiptDate} onChange={e => setReceiptDate(e.target.value)} className={inputCls} />
          </div>

          {/* 샘플서식 탭 */}
          <div className="flex items-center gap-1 flex-wrap pt-1">
            {templates.map(t => (
              <button key={t} className="px-3 py-1 text-[11px] font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded transition-colors">{t}</button>
            ))}
          </div>

          {/* 내용 */}
          <div className="flex gap-2">
            <span className="text-[12px] font-medium text-slate-700 w-16 pt-1">내용</span>
            <textarea value={content} onChange={e => setContent(e.target.value)} className={`${inputCls} flex-1 h-48 resize-none`} />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded">저장</button>
            <button className="flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 rounded text-xs text-slate-600">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2z" /></svg>인쇄</button>
          </div>
        </div>
      </div>

      {/* 목록 */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-[11px]">
          <thead><tr className="bg-teal-50 border-b border-slate-300">
            <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-200 w-[40px]">번호</th>
            <th className="px-2 py-2 text-left font-bold text-slate-600 border-r border-slate-200">제목</th>
            <th className="px-2 py-2 text-center font-bold text-slate-600 w-[90px]">날짜</th>
          </tr></thead>
          <tbody>
            {sampleDocs.map((d, i) => (
              <tr key={d.id} className="border-b border-slate-100 hover:bg-blue-50/40 cursor-pointer">
                <td className="px-2 py-1.5 text-center text-slate-500 border-r border-slate-100">{i + 1}</td>
                <td className="px-2 py-1.5 text-slate-700 font-medium border-r border-slate-100">{d.title}</td>
                <td className="px-2 py-1.5 text-center text-slate-500">{d.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
