'use client'
import React, { useState } from 'react'
import { NameInput, SsnInput, NumberOnlyInput, inputCls } from '@/components/InsuranceInputs'

export default function AcquisitionPage() {
  const [year, setYear] = useState(2026)
  const rows = [1, 2, 3, 4]

  return (
    <div className="p-3 space-y-3">
      <div className="bg-white rounded-xl border border-teal-400/30 shadow-sm">
        <div className="px-4 py-3 border-b border-teal-400/20 flex items-center gap-2">
          <span className="text-sm font-bold text-slate-700">취득신고</span>
        </div>
      </div>

      {/* 상단 필터 */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-slate-700">신고년도 선택 :</span>
        <select value={year} onChange={e => setYear(Number(e.target.value))} className={`${inputCls} w-20`}>
          <option>2026</option><option>2025</option>
        </select>
        <button className="px-4 py-1.5 text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 rounded">CIS종사자조회</button>
        <button className="px-4 py-1.5 text-xs font-bold text-white bg-slate-400 hover:bg-slate-500 rounded">등록된 종사자 불러오기</button>
      </div>

      {/* 입력 테이블 */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table onClick={() => alert("미신청상태 입니다. 하단에 안내사항 참고바랍니다.")} className="text-[10px] border-collapse w-full">
          <thead><tr className="bg-orange-50 border-b border-slate-300">
            <th className="px-1 py-2 text-center font-bold text-slate-600 border-r border-slate-200 w-[30px]">연번</th>
            <th className="px-1 py-2 text-center font-bold text-slate-600 border-r border-slate-200 w-[70px]">성명</th>
            <th className="px-1 py-2 text-center font-bold text-slate-600 border-r border-slate-200 w-[120px]">주민(외국인)등록번호</th>
            <th className="px-1 py-2 text-center font-bold text-slate-600 border-r border-slate-200 w-[70px]">취득금액</th>
            <th className="px-1 py-2 text-center font-bold text-slate-600 border-r border-slate-200 w-[80px]">취득(입사)일</th>
            <th className="px-1 py-2 text-center font-bold text-slate-600 border-r border-slate-200 w-[60px]">근무시간(1일)</th>
            <th className="px-1 py-2 text-center font-bold text-slate-600 border-r border-slate-200 w-[60px]">직종</th>
            <th className="px-1 py-2 text-center font-bold text-slate-600 border-r border-slate-200 w-[40px]">대표자</th>
            <th className="px-1 py-2 text-center font-bold text-slate-600 border-r border-slate-200 w-[55px]">국민연금</th>
            <th className="px-1 py-2 text-center font-bold text-slate-600 border-r border-slate-200 w-[55px]">건강보험</th>
            <th className="px-1 py-2 text-center font-bold text-slate-600 border-r border-slate-200 w-[55px]">고용,산재</th>
            <th className="px-1 py-2 text-center font-bold text-slate-600 border-r border-slate-200 w-[55px]">취득월납부희망</th>
            <th className="px-1 py-2 text-center font-bold text-slate-600 border-r border-slate-200 w-[55px]">피보험자신청</th>
            <th className="px-1 py-2 text-center font-bold text-slate-600 border-r border-slate-200 w-[50px]">첨부하기</th>
            <th className="px-1 py-2 text-center font-bold text-slate-600 border-r border-slate-200 w-[80px]">건강보험증사업장발송</th>
            <th className="px-1 py-2 text-center font-bold text-slate-600 border-r border-slate-200 w-[55px]">계약직여부</th>
            <th className="px-1 py-2 text-center font-bold text-slate-600 border-r border-slate-200 w-[60px]">계약종료일</th>
            <th className="px-1 py-2 text-center font-bold text-slate-600 border-r border-slate-200 w-[55px]">체류자격(외국인)</th>
            <th className="px-1 py-2 text-center font-bold text-slate-600 w-[55px]">국적코드(외국인)</th>
          </tr></thead>
          <tbody>
            {rows.map(r => (
              <tr key={r} className="border-b border-slate-100">
                <td className="px-1 py-1.5 text-center text-slate-500 border-r border-slate-100">{r}</td>
                <td className="px-1 py-1.5 border-r border-slate-100"><NameInput /></td>
                <td className="px-1 py-1.5 border-r border-slate-100"><SsnInput /></td>
                <td className="px-1 py-1.5 border-r border-slate-100"><NumberOnlyInput /></td>
                <td className="px-1 py-1.5 border-r border-slate-100"><div className="flex justify-center"><input type="date" className={`${inputCls} w-[80%]`} /></div></td>
                <td className="px-1 py-1.5 border-r border-slate-100"><NumberOnlyInput /></td>
                <td className="px-1 py-1.5 border-r border-slate-100"><select className={`${inputCls} w-full`}><option>선 택</option><option>원장</option><option>보육교사</option><option>대체교사</option><option>방과후 교사</option><option>특수교사</option><option>시간연장 교사</option><option>비상근 교사</option><option>사회복지사</option><option>간호사</option><option>간호조무사</option><option>영양사</option><option>취사부</option><option>사무원</option><option>조리사</option><option>보조교사</option><option>보육도우미</option><option>행복도우미</option><option>연장전담교사</option><option>기타종사자</option></select></td>
                <td className="px-1 py-1.5 border-r border-slate-100 text-center"><input type="checkbox" className="w-3 h-3" /></td>
                <td className="px-1 py-1.5 border-r border-slate-100"><select className={`${inputCls} w-full`}><option>신청</option></select></td>
                <td className="px-1 py-1.5 border-r border-slate-100"><select className={`${inputCls} w-full`}><option>신청</option></select></td>
                <td className="px-1 py-1.5 border-r border-slate-100"><select className={`${inputCls} w-full`}><option>신청</option></select></td>
                <td className="px-1 py-1.5 border-r border-slate-100"><select className={`${inputCls} w-full`}><option>미희망</option></select></td>
                <td className="px-1 py-1.5 border-r border-slate-100"><select className={`${inputCls} w-full`}><option>미신청</option></select></td>
                <td className="px-1 py-1.5 border-r border-slate-100 text-center text-[9px]"><input type="file" className="hidden" /><button className="text-[9px] text-slate-500">파일 선택</button></td>
                <td className="px-1 py-1.5 border-r border-slate-100"><select className={`${inputCls} w-full`}><option>발송</option></select></td>
                <td className="px-1 py-1.5 border-r border-slate-100"><select className={`${inputCls} w-full`}><option>아니오</option></select></td>
                <td className="px-1 py-1.5 border-r border-slate-100"><input type="text" className={`${inputCls} w-20`} /></td>
                <td className="px-1 py-1.5 border-r border-slate-100"><input type="text" className={`${inputCls} w-20`} /></td>
                <td className="px-1 py-1.5"><input type="text" className={`${inputCls} w-20`} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 안내 */}
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

      {/* 신청현황 */}
      <div className="text-sm font-bold text-slate-700 flex items-center gap-1">
        <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
        신청현황
      </div>

      <div className="text-[10px] text-slate-500 space-y-0.5">
        <p>* 신고파일작성시 신고파일 작성됩니다.</p>
        <p>* 자체처리시에는 신고파일을 출력하셔서 4대보험관리공단에 팩스 접수하십시오.</p>
        <p>* 대행을 맡기실 때는 접수신청을 클릭하세요. 노무법인 등록시설에 한함.</p>
        <p>* 완료가 된 상태면 완료파일을 클릭하셔서 출력하시면 됩니다</p>
      </div>

      <div className="flex justify-end">
        <button className="px-4 py-1.5 text-xs font-bold text-white bg-teal-500 hover:bg-teal-600 rounded">4대보험관리공단 전화/팩스번호</button>
      </div>

      {/* 하단 테이블 */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table onClick={() => alert("미신청상태 입니다. 하단에 안내사항 참고바랍니다.")} className="text-[10px] border-collapse w-full">
          <thead><tr className="bg-slate-200 border-b border-slate-300">
            {['연번','성명','주민(외국인)등록번호','취득금액','취득(입사)일','국민연금','건강보험','고용,산재','취득월납부희망','피보험자신청','건강보험증사업장발송','계약직여부','연관신청','신청일','신고파일','대행신청','상태','완료파일','접수내용'].map(h => (
              <th key={h} className="px-1 py-2 text-center font-bold text-slate-600 border-r border-slate-200 last:border-r-0">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            <tr><td colSpan={19} className="text-center py-4 text-slate-400 text-xs">등록된 내용이 없습니다.</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
