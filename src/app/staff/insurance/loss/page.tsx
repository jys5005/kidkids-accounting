'use client'
import React, { useState } from 'react'
import { NameInput, SsnInput, NumberOnlyInput, inputCls } from '@/components/InsuranceInputs'

export default function LossPage() {
  const [year, setYear] = useState(2026)
  return (
    <div className="p-3 space-y-3">
      <div className="bg-white rounded-xl border border-teal-400/30 shadow-sm">
        <div className="px-4 py-3 border-b border-teal-400/20"><span className="text-sm font-bold text-slate-700">상실신고</span></div>
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
            {['연번','성명','주민(외국인)등록번호','전화(휴대)번호','당해년도근무개월수','당해년도 보수총액','전년도근무개월수','전년도 보수총액','퇴사(상실)일','건강보험 상실사유','연금보험 상실사유','고용산재 상실사유','상실 구체적 사유','제출예정일'].map(h => (
              <th key={h} className="px-1 py-2 text-center font-bold text-slate-600 border-r border-slate-200 last:border-r-0">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {[1,2,3,4,5,6,7].map(r => (
              <tr key={r} className="border-b border-slate-100">
                <td className="px-1 py-1.5 text-center text-slate-500 border-r border-slate-100 w-[30px]">{r}</td>
                <td className="px-1 py-1.5 border-r border-slate-100"><NameInput /></td>
                <td className="px-1 py-1.5 border-r border-slate-100"><SsnInput /></td>
                <td className="px-1 py-1.5 border-r border-slate-100"><NumberOnlyInput placeholder="01000000000" /></td>
                <td className="px-1 py-1.5 border-r border-slate-100"><NumberOnlyInput /></td>
                <td className="px-1 py-1.5 border-r border-slate-100"><NumberOnlyInput /></td>
                <td className="px-1 py-1.5 border-r border-slate-100"><NumberOnlyInput /></td>
                <td className="px-1 py-1.5 border-r border-slate-100"><NumberOnlyInput /></td>
                <td className="px-1 py-1.5 border-r border-slate-100"><div className="flex justify-center"><input type="date" className={`${inputCls} w-[80%]`} /></div></td>
                <td className="px-1 py-1.5 border-r border-slate-100"><select className={`${inputCls} w-full`}><option>퇴직</option><option>사망</option><option>의료급여수급권자</option><option>유공자 등</option><option>기타</option><option>미신청</option></select></td>
                <td className="px-1 py-1.5 border-r border-slate-100"><select className={`${inputCls} w-full`}><option>사용관계종료</option><option>사망</option><option>국적상실</option><option>60세도달</option><option>다른공적연금</option><option>전출(통폐합)</option><option>기초생활수급자</option><option>노령연금수급자(특수직종)</option><option>조기노령연금수급자</option><option>협정국연금가입</option><option>체류기간만료</option><option>적용제외 체류자격</option><option>미신청</option></select></td>
                <td className="px-1 py-1.5 border-r border-slate-100"><select className={`${inputCls} w-full`}><option>개인사정자진퇴사</option><option>회사사정자진퇴사</option><option>폐업,도산권고사직</option><option>회사불황권고사직</option><option>근로자귀책권고사직</option><option>정년</option><option>계약기간만료</option><option>고용협비적용,이중고용</option><option>미신청</option></select></td>
                <td className="px-1 py-1.5 border-r border-slate-100"><input type="text" className={`${inputCls} w-full`} placeholder="수기 입력" /></td>
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
    </div>
  )
}
