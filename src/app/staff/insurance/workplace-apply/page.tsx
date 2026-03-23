'use client'
import React, { useState } from 'react'
const inputCls = "border border-teal-300 rounded px-1.5 py-1 text-[11px] focus:outline-none focus:border-teal-500"

export default function WorkplaceApplyPage() {
  const [year, setYear] = useState(2026)
  return (
    <div className="p-3 space-y-3">
      <div className="bg-white rounded-xl border border-teal-400/30 shadow-sm">
        <div className="px-4 py-3 border-b border-teal-400/20"><span className="text-sm font-bold text-slate-700">사업장적용신고</span></div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-slate-700">신고년 선택 :</span>
        <select value={year} onChange={e => setYear(Number(e.target.value))} className={`${inputCls} w-20`}><option>2026</option><option>2025</option></select>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table onClick={() => alert("미신청상태 입니다. 하단에 안내사항 참고바랍니다.")} className="text-[10px] border-collapse w-full">
          <thead><tr className="bg-orange-50 border-b border-slate-300">
            {['4대보험적용일','4대보험적용직원수','4대보험자동이체은행','은행계좌번호','예금주명','예금주 주민번호','대표자명','대표자 주민번호','제출예정일'].map(h => (
              <th key={h} className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-200 last:border-r-0">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            <tr className="border-b border-slate-100">
              <td className="px-2 py-2 border-r border-slate-100"><input type="text" className={`${inputCls} w-full`} /></td>
              <td className="px-2 py-2 border-r border-slate-100"><input type="text" className={`${inputCls} w-16`} /> 명</td>
              <td className="px-2 py-2 border-r border-slate-100"><input type="text" className={`${inputCls} w-full`} /></td>
              <td className="px-2 py-2 border-r border-slate-100"><input type="text" className={`${inputCls} w-full`} /></td>
              <td className="px-2 py-2 border-r border-slate-100"><input type="text" className={`${inputCls} w-full`} /></td>
              <td className="px-2 py-2 border-r border-slate-100"><input type="text" className={`${inputCls} w-full`} /></td>
              <td className="px-2 py-2 border-r border-slate-100"><input type="text" className={`${inputCls} w-full`} /></td>
              <td className="px-2 py-2 border-r border-slate-100"><input type="text" className={`${inputCls} w-full`} /></td>
              <td className="px-2 py-2"><input type="text" className={`${inputCls} w-full`} /></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-end gap-2">
        <span className="text-[10px] text-red-500 font-bold">* 신청 상태 : 미 신청.</span>
        <div className="relative group">
          <button className="w-4 h-4 flex items-center justify-center rounded-full bg-slate-200 text-slate-500 hover:bg-slate-300 text-[9px] font-bold">i</button>
          <div className="hidden group-hover:block absolute right-0 bottom-full mb-1 w-80 bg-white border border-slate-200 rounded-lg shadow-lg p-3 z-50 text-[10px] text-slate-600 space-y-0.5">
            <p>* 4대보험 대행을 신청 하신 후 접수할 수 있습니다.</p>
            <p>* 이미 신청하신 경우 운영자가 확인 후 승인처리 를 접수가능 합니다.</p>
            <p>* 궁금하신 사항은 고객센터(1577-9046)로 문의하세요.</p>
          </div>
        </div>
      </div>
      <div className="text-sm font-bold text-slate-700">신청현황</div>
    </div>
  )
}
