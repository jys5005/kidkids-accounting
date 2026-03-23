'use client'
import React, { useState } from 'react'
const inputCls = "border border-teal-300 rounded px-2 py-1 text-[12px] focus:outline-none focus:border-teal-500"

export default function GuardianPage() {
  const [searchField, setSearchField] = useState('보호자명')
  const [search, setSearch] = useState('')
  const [includeDeleted, setIncludeDeleted] = useState(false)
  const [showRegister, setShowRegister] = useState(false)

  return (
    <div className="p-3 space-y-3">
      <div className="bg-white rounded-xl border border-teal-400/30 shadow-sm">
        <div className="px-4 py-3 border-b border-teal-400/20 flex items-center gap-2 flex-wrap">
          <span className="text-sm font-bold text-slate-700">보호자관리</span>
          <label className="text-xs text-slate-600 ml-4"><input type="checkbox" checked={includeDeleted} onChange={e => setIncludeDeleted(e.target.checked)} className="mr-1" />삭제보호자포함 :</label>
          <select value={searchField} onChange={e => setSearchField(e.target.value)} className={`${inputCls} w-24`}>
            <option>보호자명</option><option>원아명</option><option>전화번호</option>
          </select>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} className={`${inputCls} w-36`} />
          <button className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded">조회</button>
          <button onClick={() => setShowRegister(true)} className="ml-auto px-4 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded">보호자 등록</button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-[11px]">
          <thead><tr className="bg-slate-200 border-b border-slate-300">
            <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-200 w-[50px]">번호</th>
            <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-200">보호자명</th>
            <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-200">주민번호</th>
            <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-200">전화번호</th>
            <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-200">휴대폰번호</th>
            <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-200">원아명</th>
            <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-200">비고</th>
            <th className="px-2 py-2 text-center font-bold text-slate-600">관리</th>
          </tr></thead>
          <tbody>
            <tr><td colSpan={8} className="text-center py-8 text-slate-400 text-xs">등록된 보호자가 없습니다.</td></tr>
          </tbody>
        </table>

      </div>

      {/* 보호자 등록 팝업 */}
      {showRegister && (
        <div className="fixed inset-0 bg-black/40 z-[9999] flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-[750px] border border-slate-300" onClick={e => e.stopPropagation()}>
            <div className="px-4 py-3 border-b border-slate-200">
              <span className="text-sm font-bold text-slate-700">보호자 등록</span>
            </div>
            <div className="p-4">
              <div className="bg-slate-100 text-center py-1.5 text-xs font-bold text-slate-700 border border-slate-200 mb-0">기본정보</div>
              <table className="w-full text-[12px] border-collapse border border-slate-200">
                <colgroup><col style={{width:'13%'}}/><col style={{width:'37%'}}/><col style={{width:'13%'}}/><col style={{width:'37%'}}/></colgroup>
                <tbody>
                  <tr className="border-b border-slate-100">
                    <td className="font-medium text-slate-700 bg-slate-50 px-3 py-2.5 border-r border-slate-200 text-center">보호자명</td>
                    <td className="px-3 py-2.5" colSpan={3}><input type="text" className={`${inputCls} w-32`} /></td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="font-medium text-slate-700 bg-slate-50 px-3 py-2.5 border-r border-slate-200 text-center">주민등록번호</td>
                    <td className="px-3 py-2.5"><input type="text" className={`${inputCls} w-32`} /></td>
                    <td className="font-medium text-slate-700 bg-slate-100 px-3 py-2.5 border-r border-slate-200 text-center">원아명</td>
                    <td className="px-3 py-2.5"><input type="text" className={`${inputCls} w-full`} /></td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="font-medium text-slate-700 bg-slate-50 px-3 py-2.5 border-r border-slate-200 text-center">전화번호</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-0.5"><input type="text" className={`${inputCls} w-16 text-center`} /><span>-</span><input type="text" className={`${inputCls} w-16 text-center`} /><span>-</span><input type="text" className={`${inputCls} w-16 text-center`} /></div>
                    </td>
                    <td className="font-medium text-slate-700 bg-slate-100 px-3 py-2.5 border-r border-slate-200 text-center">휴대폰번호</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-0.5"><input type="text" className={`${inputCls} w-16 text-center`} /><span>-</span><input type="text" className={`${inputCls} w-16 text-center`} /><span>-</span><input type="text" className={`${inputCls} w-16 text-center`} /></div>
                    </td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="font-medium text-slate-700 bg-slate-50 px-3 py-2.5 border-r border-slate-200 text-center">주소</td>
                    <td colSpan={3} className="px-3 py-2.5">
                      <div className="flex gap-1 mb-1"><input type="text" placeholder="우편번호" className={`${inputCls} w-24`} /><button className="px-2 py-0.5 text-[10px] bg-slate-100 border border-slate-300 rounded">우편번호</button></div>
                      <input type="text" className={`${inputCls} w-full`} />
                    </td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="font-medium text-slate-700 bg-slate-50 px-3 py-2.5 border-r border-slate-200 text-center">비고</td>
                    <td colSpan={3} className="px-3 py-2.5"><input type="text" className={`${inputCls} w-full`} /></td>
                  </tr>
                  <tr>
                    <td className="font-medium text-slate-700 bg-slate-50 px-3 py-2.5 border-r border-slate-200 text-center">삭제여부</td>
                    <td colSpan={3} className="px-3 py-2.5"><input type="checkbox" className="w-3.5 h-3.5" /></td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-end gap-2">
              <button className="px-6 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded">등록</button>
              <button onClick={() => setShowRegister(false)} className="px-6 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded">취소</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
