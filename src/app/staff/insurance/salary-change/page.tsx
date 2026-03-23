'use client'
import React, { useState } from 'react'
import { NameInput, SsnInput, NumberOnlyInput, inputCls } from '@/components/InsuranceInputs'

export default function SalaryChangePage() {
  const [year, setYear] = useState(2026)
  return (
    <div className="p-3 space-y-3">
      <div className="bg-white rounded-xl border border-teal-400/30 shadow-sm">
        <div className="px-4 py-3 border-b border-teal-400/20"><span className="text-sm font-bold text-slate-700">보수월액변경</span></div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-slate-700">신고년도 선택 :</span>
        <select value={year} onChange={e => setYear(Number(e.target.value))} className={`${inputCls} w-20`}><option>2026</option><option>2025</option></select>
        <button className="px-4 py-1.5 text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 rounded">CIS종사자조회</button>
        <button className="px-4 py-1.5 text-xs font-bold text-white bg-slate-400 hover:bg-slate-500 rounded">등록된 종사자 불러오기</button>
      </div>
      <div className="flex items-center gap-2 text-[11px]">
        <span className="font-bold text-slate-600 bg-slate-100 px-2 py-1">신청항목</span>
        <span className="font-bold text-slate-600">국민연금</span><select className={`${inputCls} w-16`}><option>신청</option></select>
        <span className="font-bold text-slate-600 ml-8">건강보험</span><select className={`${inputCls} w-16`}><option>신청</option></select>
        <span className="font-bold text-slate-600 ml-8">고용,산재</span><select className={`${inputCls} w-16`}><option>신청</option></select>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table onClick={() => alert("미신청상태 입니다. 하단에 안내사항 참고바랍니다.")} className="text-[10px] border-collapse w-full">
          <thead><tr className="bg-orange-50 border-b border-slate-300">
            {['연번','성명','주민(외국인)등록번호','변경 전 보수월액','변경 후 보수월액','보수변경 월','변경사유','제출예정일'].map(h => (
              <th key={h} className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-200 last:border-r-0">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {[1,2,3,4].map(r => (
              <tr key={r} className="border-b border-slate-100">
                <td className="px-2 py-1.5 text-center text-slate-500 border-r border-slate-100 w-[30px]">{r}</td>
                <td className="px-1 py-1.5 border-r border-slate-100"><NameInput /></td>
                <td className="px-1 py-1.5 border-r border-slate-100"><SsnInput /></td>
                <td className="px-1 py-1.5 border-r border-slate-100"><NumberOnlyInput /></td>
                <td className="px-1 py-1.5 border-r border-slate-100"><NumberOnlyInput /></td>
                <td className="px-1 py-1.5 border-r border-slate-100"><div className="flex justify-center"><input type="date" className={`${inputCls} w-[80%]`} /></div></td>
                <td className="px-1 py-1.5 border-r border-slate-100"><div className="flex justify-center"><select className={`${inputCls} w-[80%]`}><option>보수인상</option><option>보수인하</option></select></div></td>
                <td className="px-1 py-1.5"><div className="flex justify-center"><input type="date" className={`${inputCls} w-[80%]`} /></div></td>
              </tr>
            ))}
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
      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table onClick={() => alert("미신청상태 입니다. 하단에 안내사항 참고바랍니다.")} className="text-[10px] border-collapse w-full">
          <thead><tr className="bg-slate-200 border-b border-slate-300">
            {['연번','성명','주민(외국인)등록번호','변경 전 보수월액','변경 후 보수월액','보수변경 월','국민연금','건강보험','고용,산재','변경사유','제출예정일','연관신청','신청일','신고파일','대행신청','상태','완료파일','접수내용'].map(h => (
              <th key={h} className="px-1 py-2 text-center font-bold text-slate-600 border-r border-slate-200 last:border-r-0">{h}</th>
            ))}
          </tr></thead>
          <tbody><tr><td colSpan={18} className="text-center py-4 text-slate-400 text-xs">등록된 내용이 없습니다.</td></tr></tbody>
        </table>
      </div>
    </div>
  )
}
