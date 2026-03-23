'use client'
import React, { useState } from 'react'
import { NameInput, SsnInput, NumberOnlyInput, inputCls } from '@/components/InsuranceInputs'

export default function DefermentCancelPage() {
  const [year, setYear] = useState(2026)
  return (
    <div className="p-3 space-y-3">
      <div className="bg-white rounded-xl border border-teal-400/30 shadow-sm">
        <div className="px-4 py-3 border-b border-teal-400/20"><span className="text-sm font-bold text-slate-700">납입유예해지신청</span></div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-slate-700">신고년도 선택 :</span>
        <select value={year} onChange={e => setYear(Number(e.target.value))} className={`${inputCls} w-20`}><option>2026</option><option>2025</option></select>
        <button className="px-4 py-1.5 text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 rounded">CIS종사자조회</button>
        <button className="px-4 py-1.5 text-xs font-bold text-white bg-slate-400 hover:bg-slate-500 rounded">등록된 종사자 불러오기</button>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table onClick={() => alert("미신청상태 입니다. 하단에 안내사항 참고바랍니다.")} className="text-[10px] border-collapse w-full">
          <thead><tr className="bg-orange-50 border-b border-slate-300">
            {['번호','성명','주민번호','육아휴직대상자녀 생년월일+성별','유예사유','시작일','종료일','납입유예해지일','해지시 보수월액','재개월납부희망여부','연도','보수총액(원)','분할납부시횟수(건강보험)','제출예정일'].map(h => (
              <th key={h} className="px-1 py-2 text-center font-bold text-slate-600 border-r border-slate-200 last:border-r-0">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {[1,2,3,4,5].map(r => (
              <tr key={r} className="border-b border-slate-100">
                <td className="px-1 py-1.5 text-center text-slate-500 border-r border-slate-100 w-[30px]">{r}</td>
                <td className="px-1 py-1.5 border-r border-slate-100 w-[60px]"><NameInput /></td>
                <td className="px-1 py-1.5 border-r border-slate-100 w-[120px]"><SsnInput /></td>
                <td className="px-1 py-1.5 border-r border-slate-100"><div className="flex justify-center"><input type="text" maxLength={8} placeholder="000000-0" className={`${inputCls} w-[80%]`} onChange={e => { const d = e.target.value.replace(/[^0-9]/g, '').slice(0,7); e.target.value = d.length > 6 ? d.slice(0,6)+'-'+d.slice(6) : d }} /></div></td>
                <td className="px-1 py-1.5 border-r border-slate-100"><select className={`${inputCls} w-full`}><option>기타휴직</option><option>육아휴직</option><option>질병휴직</option><option>무급노조전임자휴직</option><option>그 밖의 사유</option></select></td>
                <td className="px-1 py-1.5 border-r border-slate-100"><div className="flex justify-center"><input type="date" className={`${inputCls} w-[80%]`} /></div></td>
                <td className="px-1 py-1.5 border-r border-slate-100"><div className="flex justify-center"><input type="date" className={`${inputCls} w-[80%]`} /></div></td>
                <td className="px-1 py-1.5 border-r border-slate-100"><div className="flex justify-center"><input type="date" className={`${inputCls} w-[80%]`} /></div></td>
                <td className="px-1 py-1.5 border-r border-slate-100"><input type="text" className={`${inputCls} w-20`} /></td>
                <td className="px-1 py-1.5 border-r border-slate-100"><select className={`${inputCls} w-full`}><option>미희망</option><option>희망</option></select></td>
                <td className="px-1 py-1.5 border-r border-slate-100"><input type="text" className={`${inputCls} w-20`} /></td>
                <td className="px-1 py-1.5 border-r border-slate-100"><input type="text" className={`${inputCls} w-20`} /></td>
                <td className="px-1 py-1.5 border-r border-slate-100"><input type="text" className={`${inputCls} w-20`} /></td>
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
      <div className="flex justify-end"><button className="px-4 py-1.5 text-xs font-bold text-white bg-teal-500 hover:bg-teal-600 rounded">4대보험관리공단 전화/팩스번호</button></div>
    </div>
  )
}
