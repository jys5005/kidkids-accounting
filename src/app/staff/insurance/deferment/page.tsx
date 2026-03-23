'use client'
import React, { useState } from 'react'
import { NameInput, SsnInput, NumberOnlyInput, inputCls } from '@/components/InsuranceInputs'

export default function DefermentPage() {
  const [year, setYear] = useState(2026)
  return (
    <div className="p-3 space-y-3">
      <div className="bg-white rounded-xl border border-teal-400/30 shadow-sm">
        <div className="px-4 py-3 border-b border-teal-400/20"><span className="text-sm font-bold text-slate-700">납입유예신청</span></div>
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
            {['번호','성명','주민번호','유예적용일','유예해지예정일','휴직종류','육아휴직대상자녀 생년월일+성별','실직','국민연금유예코드','건강보험유예코드','고용산재(구분)','고용산재유예코드','휴직계파일','제출예정일'].map(h => (
              <th key={h} className="px-1 py-2 text-center font-bold text-slate-600 border-r border-slate-200 last:border-r-0">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {[1,2,3,4,5].map(r => (
              <tr key={r} className="border-b border-slate-100">
                <td className="px-1 py-1.5 text-center text-slate-500 border-r border-slate-100 w-[30px]">{r}</td>
                <td className="px-1 py-1.5 border-r border-slate-100 w-[60px]"><NameInput /></td>
                <td className="px-1 py-1.5 border-r border-slate-100 w-[120px]"><SsnInput /></td>
                <td className="px-1 py-1.5 border-r border-slate-100"><div className="flex justify-center"><input type="date" className={`${inputCls} w-[80%]`} /></div></td>
                <td className="px-1 py-1.5 border-r border-slate-100"><div className="flex justify-center"><input type="date" className={`${inputCls} w-[80%]`} /></div></td>
                <td className="px-1 py-1.5 border-r border-slate-100"><select className={`${inputCls} w-full`}><option>휴직</option><option>육아휴직</option><option>휴가</option><option>출산휴가</option></select></td>
                <td className="px-1 py-1.5 border-r border-slate-100"><div className="flex justify-center"><input type="text" maxLength={8} placeholder="000000-0" className={`${inputCls} w-[80%]`} onChange={e => { const d = e.target.value.replace(/[^0-9]/g, '').slice(0,7); e.target.value = d.length > 6 ? d.slice(0,6)+'-'+d.slice(6) : d }} /></div></td>
                <td className="px-1 py-1.5 border-r border-slate-100"><select className={`${inputCls} w-full`}><option>실직</option><option>병역의무수행</option><option>재학</option><option>교정시설수용</option><option>보호(치료)감호시설수용</option><option>1년미만 행방불명</option><option>3개월이상 입원</option><option>자연재해등으로 보조(지원)대상</option><option>사업중단</option><option>휴직(기타사유)</option><option>재해,사고등으로 기초생활곤란</option><option>휴직(산전후휴가,육아휴직)</option><option>휴직(산재요양)</option><option>기타</option></select></td>
                <td className="px-1 py-1.5 border-r border-slate-100"><select className={`${inputCls} w-full`}><option>기타휴직</option><option>육아휴직</option><option>질병휴직</option><option>무급노조전임자휴직</option><option>그 밖의 사유</option></select></td>
                <td className="px-1 py-1.5 border-r border-slate-100"><select className={`${inputCls} w-full`}><option>기타휴직</option><option>육아휴직</option><option>질병휴직</option><option>무급노조전임자휴직</option><option>그 밖의 사유</option></select></td>
                <td className="px-1 py-1.5 border-r border-slate-100"><select className={`${inputCls} w-full`}><option>산재보험</option><option>고용보험</option><option>산재+고용보험</option></select></td>
                <td className="px-1 py-1.5 border-r border-slate-100"><select className={`${inputCls} w-full`}><option>휴업,휴직(사업장사정)</option><option>휴직(병가등 근로자사정)</option><option>근로기준법에 따른 보호휴가</option><option>노조전임자</option><option>기타</option></select></td>
                <td className="px-1 py-1.5 border-r border-slate-100 text-center"><button className="text-[9px] text-slate-500">파일 선택</button></td>
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
            {['연번','성명','주민번호','사유별 고지 유예 기간','납입유예해지일','해지시 보수월액','재개월납부희망여부','유예기간중받은보수','분할납부시횟수(건강보험)','제출예정일','연관신청','신청일','신고파일','대행신청','상태','완료파일','접수내용'].map(h => (
              <th key={h} className="px-1 py-2 text-center font-bold text-slate-600 border-r border-slate-200 last:border-r-0">{h}</th>
            ))}
          </tr></thead>
          <tbody><tr><td colSpan={17} className="text-center py-4 text-slate-400 text-xs">등록된 내용이 없습니다.</td></tr></tbody>
        </table>
      </div>
    </div>
  )
}
