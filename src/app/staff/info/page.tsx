'use client'
import React, { useState, useEffect } from 'react'
import DraggableModal from '@/components/DraggableModal'

const staffList: { id: number; name: string; ssn: string; staffNo: string; hireDate: string; leaveDate: string; phone: string; type: string; status: string; contract: string; login: string; note: string }[] = []

const inputCls = "border border-teal-300 rounded px-2 py-1 text-[12px] focus:outline-none focus:border-teal-500"
const labelCls = "text-[12px] font-medium text-slate-700 bg-slate-50 px-3 py-2.5 border-r border-slate-200 whitespace-nowrap w-[120px] min-w-[120px]"
const cellCls = "px-3 py-2"

export default function StaffInfoPage() {
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [filterStatus, setFilterStatus] = useState('상태전체')
  const [filterField, setFilterField] = useState('name')
  const [includeDeleted, setIncludeDeleted] = useState(false)
  const [checked, setChecked] = useState<Set<number>>(new Set())
  // 아이사랑꿈터: 교직원/보육교직원 → 종사자 용어 치환
  const [isIlove, setIsIlove] = useState(false)
  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then(r => r.json())
      .then(d => setIsIlove(((d?.institutionType || d?.profile?.institutionType) as string) === 'ilovechild'))
      .catch(() => {})
  }, [])
  const T = isIlove ? '종사자' : '교직원'
  const staffNoLabel = isIlove ? '종사자번호' : '보육교직원번호'
  const filtered = staffList.filter(s =>
    (filterStatus === '상태전체' || s.status === filterStatus) &&
    (search === '' || (filterField === 'name' ? s.name.includes(search) : s.staffNo.includes(search))) &&
    (includeDeleted || s.status !== '퇴직')
  )

  return (
    <div className="p-3 space-y-3">
      <div className="bg-white rounded-xl border border-teal-400/30 shadow-sm">
        <div className="px-4 py-3 border-b border-teal-400/20 flex items-center gap-2">
          <span className="text-sm font-bold text-slate-700">{T}정보</span>
          <span className="text-xs text-slate-400">{T} 인사정보를 관리합니다.</span>
          {!isIlove && <button className="ml-auto px-4 py-1.5 text-xs font-bold text-white bg-teal-500 hover:bg-teal-600 rounded transition-colors">CIS교직원조회</button>}
        </div>
      </div>

      {/* 목록 테이블 */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-[11px]">
          <thead><tr className="bg-teal-50 border-b border-slate-300">
            <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-200 w-[30px]"><input type="checkbox" className="w-3 h-3" /></th>
            <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-200 w-[40px]">번호</th>
            <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-200">이 름</th>
            <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-200">주민번호</th>
            <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-200">{staffNoLabel}</th>
            <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-200">입사일</th>
            <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-200">퇴사일</th>
            <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-200">전화번호</th>
            <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-200">구분</th>
            <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-200">상태</th>
            <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-200">계약서</th>
            <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-200">로그인</th>
            <th className="px-2 py-2 text-center font-bold text-slate-600">비고</th>
          </tr></thead>
          <tbody>{filtered.map((s, i) => (
            <tr key={s.id} className="border-b border-slate-100 hover:bg-blue-50/40 cursor-pointer" onClick={() => setShowForm(true)}>
              <td className="px-2 py-1.5 text-center border-r border-slate-100"><input type="checkbox" className="w-3 h-3" checked={checked.has(s.id)} onChange={() => { const n = new Set(checked); n.has(s.id) ? n.delete(s.id) : n.add(s.id); setChecked(n) }} onClick={e => e.stopPropagation()} /></td>
              <td className="px-2 py-1.5 text-center text-slate-500 border-r border-slate-100">{i+1}</td>
              <td className="px-2 py-1.5 text-slate-700 font-medium border-r border-slate-100">{s.name}</td>
              <td className="px-2 py-1.5 text-center text-slate-500 border-r border-slate-100">{s.ssn}</td>
              <td className="px-2 py-1.5 text-center text-slate-600 border-r border-slate-100">{s.staffNo}</td>
              <td className="px-2 py-1.5 text-center text-slate-500 border-r border-slate-100">{s.hireDate}</td>
              <td className="px-2 py-1.5 text-center text-slate-500 border-r border-slate-100">{s.leaveDate}</td>
              <td className="px-2 py-1.5 text-slate-500 border-r border-slate-100">{s.phone}</td>
              <td className="px-2 py-1.5 text-center text-slate-600 border-r border-slate-100">{s.type}</td>
              <td className="px-2 py-1.5 text-center border-r border-slate-100"><span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${s.status === '재직' ? 'text-blue-700 bg-blue-50' : 'text-red-600 bg-red-50'}`}>{s.status}</span></td>
              <td className="px-2 py-1.5 text-center text-slate-500 border-r border-slate-100">{s.contract}</td>
              <td className="px-2 py-1.5 text-center text-slate-500 border-r border-slate-100">{s.login}</td>
              <td className="px-2 py-1.5 text-slate-500">{s.note}</td>
            </tr>
          ))}</tbody>
        </table>

        {/* 하단 필터 + 버튼 */}
        <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-center gap-2 flex-wrap">
          <label className="text-xs text-slate-600"><input type="checkbox" checked={includeDeleted} onChange={e => setIncludeDeleted(e.target.checked)} className="mr-1" />삭제{T}포함 :</label>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className={`${inputCls} w-28`}>
            <option>상태전체</option><option>임용</option><option>면직</option><option>유급휴직</option><option>무급휴직</option><option>휴직</option><option>임용신청</option><option>면직신청</option><option>반려</option>
          </select>
          <select value={filterField} onChange={e => setFilterField(e.target.value)} className={`${inputCls} w-28`}>
            <option value="name">{T}이름</option><option value="staffNo">{staffNoLabel}</option>
          </select>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} className={`${inputCls} w-36`} />
          <button className="px-3 py-1.5 text-xs font-bold text-white bg-teal-500 hover:bg-teal-600 rounded transition-colors">조회</button>
        </div>
        <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-end gap-2">
          <button onClick={() => setShowForm(true)} className="px-4 py-1.5 text-xs font-bold text-white bg-teal-500 hover:bg-teal-600 rounded transition-colors">{T} 등록</button>
          <button className="px-4 py-1.5 text-xs font-bold text-white bg-teal-500 hover:bg-teal-600 rounded transition-colors">{T} 엑셀 등록</button>
          <button className="px-4 py-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 rounded transition-colors">선택 {T} 삭제</button>
        </div>
      </div>

      {/* 신규등록/수정 폼 팝업 */}
      {showForm && (
        <DraggableModal onClose={() => setShowForm(false)} title={`${T} 등록/수정`} className="w-[76vw] max-w-[1120px]">
            {/* 3개 박스 */}
            <div className="grid grid-cols-3 gap-3 mx-4 mt-4">
              {/* 박스1: 인적사항 */}
              <div className="rounded-lg border border-slate-200 overflow-hidden">
                <div className="bg-teal-50 px-3 py-1.5 text-[11px] font-bold text-slate-700 text-center border-b border-slate-200">인적사항</div>
                <div className="p-3 space-y-2 text-[11px]">
                  <div><label className="text-slate-600 font-medium block mb-0.5">이름 <span className="text-red-500">*</span></label><input type="text" className={`${inputCls} w-1/2`} /></div>
                  <div><label className="text-slate-600 font-medium block mb-0.5">주민등록번호 <span className="text-red-500">*</span></label><div className="flex items-center gap-0.5"><input type="text" maxLength={6} placeholder="앞자리" className={`${inputCls} min-w-0 flex-1 text-center`} /><span className="text-slate-400">-</span><input type="password" maxLength={7} placeholder="뒷자리" className={`${inputCls} min-w-0 flex-1 text-center`} /></div><label className="text-[10px] text-slate-400 mt-0.5 block"><input type="checkbox" className="mr-0.5" />외국인</label></div>
                  {!isIlove && <div><label className="text-slate-600 font-medium block mb-0.5">생년월일</label><input type="date" className={`${inputCls} w-full`} /><div className="mt-0.5"><label className="text-[10px]"><input type="radio" name="gender" className="mr-0.5" />양</label><label className="text-[10px] ml-1"><input type="radio" name="gender" className="mr-0.5" />음</label></div></div>}
                  {!isIlove && <div><label className="text-slate-600 font-medium block mb-0.5">전화번호</label><div className="flex items-center gap-0.5"><input type="text" maxLength={3} className={`${inputCls} min-w-0 flex-1 text-center`} /><span className="text-slate-400">-</span><input type="text" maxLength={4} className={`${inputCls} min-w-0 flex-1 text-center`} /><span className="text-slate-400">-</span><input type="text" maxLength={4} className={`${inputCls} min-w-0 flex-1 text-center`} /></div></div>}
                  <div><label className="text-slate-600 font-medium block mb-0.5">휴대폰</label><div className="flex items-center gap-0.5"><input type="text" maxLength={3} className={`${inputCls} min-w-0 flex-1 text-center`} /><span className="text-slate-400">-</span><input type="text" maxLength={4} className={`${inputCls} min-w-0 flex-1 text-center`} /><span className="text-slate-400">-</span><input type="text" maxLength={4} className={`${inputCls} min-w-0 flex-1 text-center`} /></div></div>
                  {!isIlove && <div><label className="text-slate-600 font-medium block mb-0.5">이메일</label><input type="email" className={`${inputCls} w-full`} /></div>}
                  {!isIlove && <div><label className="text-slate-600 font-medium block mb-0.5">주소</label><div className="flex gap-1 mb-1"><input type="text" placeholder="우편번호" className={`${inputCls} w-24`} /><button className="px-2 py-0.5 text-[10px] bg-slate-100 border border-slate-300 rounded">검색</button></div><input type="text" placeholder="상세주소" className={`${inputCls} w-full`} /></div>}
                  <div><label className="text-slate-600 font-medium block mb-0.5">{staffNoLabel}</label><input type="text" className={`${inputCls} w-full`} />{!isIlove && <span className="text-[9px] text-red-500">* 보육시스템자료</span>}</div>
                  <div><label className="text-slate-600 font-medium block mb-0.5">로그인 아이디</label><input type="text" className={`${inputCls} w-full`} /></div>
                  <div><label className="text-slate-600 font-medium block mb-0.5">로그인 비밀번호</label><input type="password" className={`${inputCls} w-full`} /></div>
                </div>
              </div>

              {/* 박스2: 근무정보 */}
              <div className="rounded-lg border border-slate-200 overflow-hidden">
                <div className="bg-teal-50 px-3 py-1.5 text-[11px] font-bold text-slate-700 text-center border-b border-slate-200">근무정보</div>
                <div className="p-3 space-y-2 text-[11px]">
                  <div><label className="text-slate-600 font-medium block mb-0.5">입사일 <span className="text-red-500">*</span></label><input type="date" className={`${inputCls} w-full`} /></div>
                  <div><label className="text-slate-600 font-medium block mb-0.5">퇴사일</label><div className="flex gap-1"><input type="date" className={`${inputCls} flex-1`} /><button className="px-2 py-0.5 text-[10px] bg-slate-100 border border-slate-300 rounded whitespace-nowrap">빈칸</button></div></div>
                  <div><label className="text-slate-600 font-medium block mb-0.5">{isIlove ? '종사자구분' : '직원구분'}</label>
                    <select className={`${inputCls} w-full`}>
                      {isIlove ? (
                        <><option>선 택</option><option>꿈터장</option><option>운영요원</option></>
                      ) : (
                        <><option>선 택</option><option>원장</option><option>보육교사</option><option>대체교사</option><option>방과후 교사</option><option>특수교사</option><option>시간연장 교사</option><option>비상근 교사</option><option>사회복지사</option><option>간호사</option><option>간호조무사</option><option>영양사</option><option>취사부</option><option>사무원</option><option>조리사</option><option>보조교사</option><option>보육도우미</option><option>행복도우미</option><option>연장전담교사</option><option>기타종사자</option></>
                      )}
                    </select>
                  </div>
                  <div><label className="text-slate-600 font-medium block mb-0.5">직위</label><select className={`${inputCls} w-full`}>{isIlove ? (<><option>선 택</option><option>꿈터장</option><option>운영요원</option></>) : (<><option>선 택</option><option>원장</option><option>보육교사</option><option>보조교사</option><option>조리사</option><option>행정원</option></>)}</select></div>
                  <div><label className="text-slate-600 font-medium block mb-0.5">상태</label>
                    <select className={`${inputCls} w-full`}><option>선 택</option><option>임용</option><option>면직</option><option>유급휴직</option><option>무급휴직</option><option>휴직</option><option>임용신청</option><option>면직신청</option><option>반려</option></select>
                  </div>
                  <div><label className="text-slate-600 font-medium block mb-0.5">근무시간</label>
                    <div className="flex items-center gap-0.5 flex-wrap">
                      <select className={`${inputCls} w-16`}><option>시</option>{Array.from({length:24},(_,i)=><option key={i}>{i}</option>)}</select>:<select className={`${inputCls} w-14`}><option>분</option><option>00</option><option>30</option></select>
                      <span className="text-slate-400">~</span>
                      <select className={`${inputCls} w-16`}><option>시</option>{Array.from({length:24},(_,i)=><option key={i}>{i}</option>)}</select>:<select className={`${inputCls} w-14`}><option>분</option><option>00</option><option>30</option></select>
                    </div>
                  </div>
                  <div><label className="text-slate-600 font-medium block mb-0.5">삭제여부</label><label className="text-[10px] text-slate-500"><input type="checkbox" className="mr-1" />급여대장/출근부 제외</label></div>
                  {!isIlove && <div><label className="text-slate-600 font-medium block mb-0.5">비고</label><textarea className={`${inputCls} w-full h-14 resize-none`} /></div>}
                  {!isIlove && <div><label className="text-slate-600 font-medium block mb-0.5">도장</label><input type="file" className="text-[10px]" /></div>}
                </div>
              </div>

              {/* 박스3: 급여정보 */}
              <div className="rounded-lg border border-slate-200 overflow-hidden">
                <div className="bg-teal-50 px-3 py-1.5 text-[11px] font-bold text-slate-700 text-center border-b border-slate-200">급여정보</div>
                <div className="p-3 space-y-2 text-[11px]">
                  <div className="grid grid-cols-2 gap-2">
                    <div><label className="text-slate-600 font-medium block mb-0.5">호봉</label><input type="text" className={`${inputCls} w-1/3`} /></div>
                    <div><label className="text-slate-600 font-medium block mb-0.5">월급여</label><input type="number" defaultValue={0} className={`${inputCls} w-full text-right`} /></div>
                  </div>
                  <div className="border-t border-slate-100 pt-1">
                    <p className="text-[10px] font-bold text-slate-600 mb-0.5">비과세수당</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div><label className="text-slate-600 font-medium block mb-0.5">식대</label><input type="number" className={`${inputCls} w-full text-right`} /></div>
                      <div><label className="text-slate-600 font-medium block mb-0.5">교통비</label><input type="number" className={`${inputCls} w-full text-right`} /></div>
                      <div><label className="text-slate-600 font-medium block mb-0.5">보육수당</label><input type="number" className={`${inputCls} w-full text-right`} /></div>
                      <div><label className="text-slate-600 font-medium block mb-0.5">기타</label><input type="number" className={`${inputCls} w-full text-right`} /></div>
                    </div>
                  </div>
                  <div className="border-t border-slate-100 pt-1">
                    <p className="text-[10px] font-bold text-slate-600 mb-0.5">과세수당</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div><label className="text-slate-600 font-medium block mb-0.5">시간외</label><input type="number" className={`${inputCls} w-full text-right`} /></div>
                      <div><label className="text-slate-600 font-medium block mb-0.5">직급수당</label><input type="number" className={`${inputCls} w-full text-right`} /></div>
                      <div><label className="text-slate-600 font-medium block mb-0.5">상여금</label><input type="number" className={`${inputCls} w-full text-right`} /></div>
                      <div><label className="text-slate-600 font-medium block mb-0.5">기타</label><input type="number" className={`${inputCls} w-full text-right`} /></div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-2 mt-2">
                    <div><label className="text-slate-600 font-medium block mb-0.5">보조율</label><select className={`${inputCls} w-full`}><option>선 택</option><option>30%</option><option>80%</option><option>100%</option></select></div>
                    <div><label className="text-slate-600 font-medium block mb-0.5">연금등급</label><input type="text" className={`${inputCls} w-full`} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><label className="text-slate-600 font-medium block mb-0.5">국민연금</label><label className="text-[10px]"><input type="radio" name="pension" defaultChecked className="mr-0.5" />가입</label><label className="text-[10px] ml-1"><input type="radio" name="pension" className="mr-0.5" />미가입</label></div>
                    <div><label className="text-slate-600 font-medium block mb-0.5">건강보험</label><label className="text-[10px]"><input type="radio" name="health" defaultChecked className="mr-0.5" />가입</label><label className="text-[10px] ml-1"><input type="radio" name="health" className="mr-0.5" />미가입</label></div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><label className="text-slate-600 font-medium block mb-0.5">고용보험</label><label className="text-[10px]"><input type="radio" name="employ" defaultChecked className="mr-0.5" />가입</label><label className="text-[10px] ml-1"><input type="radio" name="employ" className="mr-0.5" />미가입</label></div>
                    <div><label className="text-slate-600 font-medium block mb-0.5">산재보험</label><label className="text-[10px]"><input type="radio" name="injury" defaultChecked className="mr-0.5" />가입</label><label className="text-[10px] ml-1"><input type="radio" name="injury" className="mr-0.5" />미가입</label></div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><label className="text-slate-600 font-medium block mb-0.5">건강보험등급</label><input type="text" className={`${inputCls} w-full`} /></div>
                    <div><label className="text-slate-600 font-medium block mb-0.5">국민연금결정금액</label><input type="number" defaultValue={0} className={`${inputCls} w-full text-right`} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><label className="text-slate-600 font-medium block mb-0.5">은행</label><select className={`${inputCls} w-full`}><option>선 택</option><option>국민은행</option><option>기업은행</option><option>농협</option><option>신한은행</option><option>우리은행</option><option>하나은행</option></select></div>
                    <div><label className="text-slate-600 font-medium block mb-0.5">예금주</label><input type="text" className={`${inputCls} w-full`} /></div>
                  </div>
                  <div><label className="text-slate-600 font-medium block mb-0.5">계좌번호</label><input type="text" className={`${inputCls} w-full`} /></div>
                </div>
              </div>
            </div>



            {/* 하단 버튼 */}
            <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-end gap-2">
              <button className="px-6 py-2 text-xs font-bold text-white bg-teal-500 hover:bg-teal-600 rounded transition-colors">등록</button>
              <button onClick={() => setShowForm(false)} className="px-6 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded transition-colors">취소</button>
              <button className="px-6 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded transition-colors">완전 삭제</button>
            </div>
        </DraggableModal>
      )}
    </div>
  )
}
