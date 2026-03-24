'use client'
import React, { useState } from 'react'

const certTabs = ['근로계약서','재직증명서','경력증명서','취업규칙','최저임금고시','개인정보동의서']

const staffData = [
  { id: 3, name: '강민정', ssn: '7201151802429', hireDate: '2025-09-17', leaveDate: '', salary: '', phone: '', type: '', status: '임용', deleted: '' },
  { id: 2, name: '강수현', ssn: '910712-2******', hireDate: '2024-03-01', leaveDate: '', salary: '', phone: '010-7245-0712', type: '담임교사', status: '임용', deleted: '' },
  { id: 1, name: '김경자', ssn: '660128-2******', hireDate: '2018-06-07', leaveDate: '', salary: '', phone: '010-9029-8580', type: '조리사', status: '임용', deleted: '' },
]

const inputCls = "border border-teal-300 rounded px-2 py-1 text-[12px] focus:outline-none focus:border-teal-500"

export default function CertificatePage() {
  const [activeTab, setActiveTab] = useState('경력증명서')
  const [filterStatus, setFilterStatus] = useState('임용')
  const [filterField, setFilterField] = useState('교직원이름')
  const [search, setSearch] = useState('')
  const [includeDeleted, setIncludeDeleted] = useState(false)
  const [checked, setChecked] = useState<Set<number>>(new Set())

  return (
    <div className="p-3 space-y-3">
      <div className="bg-white rounded-xl border border-teal-400/30 shadow-sm">
        <div className="px-4 py-3 border-b border-teal-400/20 flex items-center gap-2">
          <span className="text-sm font-bold text-slate-700">증명서</span>
          <span className="text-xs text-slate-400">교직원 증명서를 발급하고 관리합니다.</span>
        </div>
      </div>

      {/* 증명서 종류 탭 */}
      <div className="flex items-center gap-2 flex-wrap">
        {certTabs.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 text-[12px] font-medium rounded transition-colors ${activeTab === tab ? 'text-slate-900 font-bold border-b-2 border-teal-500' : 'text-slate-500 hover:text-slate-700'}`}>
            ○ {tab}
          </button>
        ))}
      </div>

      {/* 필터 */}
      <div className="flex items-center gap-2 flex-wrap">
        <label className="text-xs text-slate-600"><input type="checkbox" checked={includeDeleted} onChange={e => setIncludeDeleted(e.target.checked)} className="mr-1" />삭제교직원포함 :</label>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className={`${inputCls} w-20`}>
          <option>임용</option><option>면직</option><option>유급휴직</option><option>무급휴직</option><option>휴직</option>
        </select>
        <select value={filterField} onChange={e => setFilterField(e.target.value)} className={`${inputCls} w-28`}>
          <option>교직원이름</option><option>보육교직원번호</option>
        </select>
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} className={`${inputCls} w-36`} />
        <button className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded">조회</button>
        <button className="ml-auto flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 rounded text-xs text-slate-600">
          <svg className="w-3.5 h-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5z" /></svg>출력</button>
      </div>

      {/* 테이블 */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-[11px]">
          <thead><tr className="bg-teal-50 border-b border-slate-300">
            <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-200 w-[30px]"><input type="checkbox" className="w-3 h-3" /></th>
            <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-200 w-[40px]">번호</th>
            <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-200">이 름</th>
            <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-200">주민번호</th>
            <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-200">입사일</th>
            <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-200">퇴사일</th>
            <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-200">급여</th>
            <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-200">전화번호</th>
            <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-200">구분</th>
            <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-200">상태</th>
            <th className="px-2 py-2 text-center font-bold text-slate-600">삭제여부</th>
          </tr></thead>
          <tbody>
            {staffData.map(s => (
              <tr key={s.id} className="border-b border-slate-100 hover:bg-blue-50/40">
                <td className="px-2 py-1.5 text-center border-r border-slate-100"><input type="checkbox" className="w-3 h-3" checked={checked.has(s.id)} onChange={() => { const n = new Set(checked); n.has(s.id) ? n.delete(s.id) : n.add(s.id); setChecked(n) }} /></td>
                <td className="px-2 py-1.5 text-center text-slate-500 border-r border-slate-100">{s.id}</td>
                <td className="px-2 py-1.5 text-slate-700 font-medium border-r border-slate-100">{s.name}</td>
                <td className="px-2 py-1.5 text-center text-slate-500 border-r border-slate-100">{s.ssn}</td>
                <td className="px-2 py-1.5 text-center text-slate-500 border-r border-slate-100">{s.hireDate}</td>
                <td className="px-2 py-1.5 text-center text-slate-500 border-r border-slate-100">{s.leaveDate}</td>
                <td className="px-2 py-1.5 text-right text-slate-600 border-r border-slate-100">{s.salary}</td>
                <td className="px-2 py-1.5 text-slate-500 border-r border-slate-100">{s.phone}</td>
                <td className="px-2 py-1.5 text-center text-slate-600 border-r border-slate-100">{s.type}</td>
                <td className="px-2 py-1.5 text-center text-slate-600 border-r border-slate-100">{s.status}</td>
                <td className="px-2 py-1.5 text-center text-slate-500">{s.deleted}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-center gap-2 text-xs text-slate-500">
          <button className="hover:text-slate-700">이전</button>
          <span className="px-2 py-0.5 bg-blue-600 text-white rounded text-[10px] font-bold">1</span>
          <button className="hover:text-slate-700">다음</button>
        </div>
      </div>
    </div>
  )
}
