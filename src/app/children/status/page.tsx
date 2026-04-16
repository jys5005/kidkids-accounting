'use client'
import React, { useState } from 'react'
import DraggableModal from '@/components/DraggableModal'

const fmt = (n: number) => n.toLocaleString('ko-KR')
const inputCls = "border border-teal-300 rounded px-2 py-1.5 text-[12px] focus:outline-none focus:border-teal-500 w-full"
const fmtPhone = (v: string) => {
  const n = v.replace(/[^0-9]/g, '').slice(0, 11)
  if (n.length <= 3) return n
  if (n.length <= 7) return n.slice(0, 3) + '-' + n.slice(3)
  return n.slice(0, 3) + '-' + n.slice(3, 7) + '-' + n.slice(7)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ChildDetailModal({ child, onClose }: { child: any; onClose: () => void }) {
  const [form, setForm] = useState({
    name: child.name, birth: child.birth, age: child.age,
    className: child.className, enterDate: child.enterDate,
    leaveDate: child.leaveDate || '', guardian: child.guardian,
    phone: child.phone, status: child.status,
    careType: '기본보육', careTime: '기본',
    careFee: '0', etcFee: '0', etcExpense: '0', specialFee: '0',
    leaveReason: '',
    relation: '부',
  })
  const u = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  return (
    <DraggableModal onClose={onClose} title="원아 상세정보" className="w-[720px] max-h-[90vh] overflow-y-auto">
        {/* 기본정보 */}
        <div className="px-5 py-3">
          <div className="bg-slate-100 px-3 py-2 rounded font-bold text-[13px] text-slate-700 mb-2">기본정보</div>
          <table className="w-full text-[12px] border-collapse border border-slate-200">
            <tbody>
              <tr className="border-b border-slate-200">
                <td className="px-3 py-2 bg-amber-50 font-bold text-slate-700 border-r border-slate-200 w-[100px]">원아명</td>
                <td className="px-3 py-2"><input value={form.name} onChange={e => u('name', e.target.value)} className={inputCls} /></td>
                <td className="px-3 py-2 bg-amber-50 font-bold text-slate-700 border-r border-slate-200 w-[100px]">상태</td>
                <td className="px-3 py-2">
                  <select value={form.status} onChange={e => u('status', e.target.value)} className={inputCls}>
                    <option>현원</option><option>퇴소</option>
                  </select>
                </td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="px-3 py-2 bg-amber-50 font-bold text-slate-700 border-r border-slate-200">생년월일</td>
                <td className="px-3 py-2"><input type="date" value={form.birth} onChange={e => u('birth', e.target.value)} className={inputCls} /></td>
                <td className="px-3 py-2 bg-amber-50 font-bold text-slate-700 border-r border-slate-200">연령</td>
                <td className="px-3 py-2"><input value={form.age} onChange={e => u('age', e.target.value)} className={inputCls} /></td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="px-3 py-2 bg-amber-50 font-bold text-slate-700 border-r border-slate-200">반 편성</td>
                <td className="px-3 py-2" colSpan={3}>
                  <select value={form.className} onChange={e => u('className', e.target.value)} className={inputCls}>
                    <option>새싹반</option><option>꽃잎반</option><option>별빛반</option><option>달님반</option><option>해님반</option><option>무지개반</option>
                  </select>
                </td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="px-3 py-2 bg-amber-50 font-bold text-slate-700 border-r border-slate-200">입소일</td>
                <td className="px-3 py-2"><input type="date" value={form.enterDate} onChange={e => u('enterDate', e.target.value)} className={inputCls} /></td>
                <td className="px-3 py-2 bg-amber-50 font-bold text-slate-700 border-r border-slate-200">퇴소일</td>
                <td className="px-3 py-2"><input type="date" value={form.leaveDate} onChange={e => u('leaveDate', e.target.value)} className={inputCls} /></td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="px-3 py-2 bg-amber-50 font-bold text-slate-700 border-r border-slate-200">퇴소사유</td>
                <td className="px-3 py-2" colSpan={3}><input value={form.leaveReason} onChange={e => u('leaveReason', e.target.value)} className={inputCls} placeholder="퇴소 시 사유 입력" /></td>
              </tr>
            </tbody>
          </table>
        </div>
        {/* 보육료정보 */}
        <div className="px-5 py-3">
          <div className="bg-slate-100 px-3 py-2 rounded font-bold text-[13px] text-slate-700 mb-2">보육료정보</div>
          <table className="w-full text-[12px] border-collapse border border-slate-200">
            <tbody>
              <tr className="border-b border-slate-200">
                <td className="px-3 py-2 bg-amber-50 font-bold text-slate-700 border-r border-slate-200 w-[100px]">보육료기준</td>
                <td className="px-3 py-2">
                  <select value={form.careType} onChange={e => u('careType', e.target.value)} className={inputCls}>
                    <option>선 택</option>
                    <option>일반아동</option>
                    <option>기본보육</option>
                    <option>연장보육(만0~2세)</option>
                    <option>연장보육(만0~2세법정)</option>
                    <option>연장보육(만0~2세다문화)</option>
                    <option>누리(만3~5세)</option>
                    <option>누리(만3~5세법정)</option>
                    <option>누리(만3~5세다문화)</option>
                    <option>누리(만3~5세장애아)</option>
                    <option>장애아</option>
                    <option>장애아방과후</option>
                    <option>방과후</option>
                  </select>
                </td>
                <td className="px-3 py-2 bg-amber-50 font-bold text-slate-700 border-r border-slate-200 w-[100px]">보육시간</td>
                <td className="px-3 py-2">
                  <select value={form.careTime} onChange={e => u('careTime', e.target.value)} className={inputCls}>
                    <option>선 택</option>
                    <option>기본</option>
                    <option>야간12시간</option>
                    <option>24시간</option>
                    <option>야간연장</option>
                    <option>휴일</option>
                    <option>방과후</option>
                    <option>시간제보육</option>
                    <option>맞춤</option>
                    <option>긴급보육</option>
                    <option>반일</option>
                    <option>시간연장</option>
                    <option>종일+시간연장</option>
                    <option>종일+야간</option>
                    <option>종일+24시간</option>
                  </select>
                </td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="px-3 py-2 bg-amber-50 font-bold text-slate-700 border-r border-slate-200">보육료 납부액</td>
                <td className="px-3 py-2"><input value={form.careFee} onChange={e => u('careFee', e.target.value)} className={`${inputCls} text-right`} /></td>
                <td className="px-3 py-2 bg-amber-50 font-bold text-slate-700 border-r border-slate-200">기타납부액</td>
                <td className="px-3 py-2"><input value={form.etcFee} onChange={e => u('etcFee', e.target.value)} className={`${inputCls} text-right`} /></td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="px-3 py-2 bg-amber-50 font-bold text-slate-700 border-r border-slate-200">기타필요경비</td>
                <td className="px-3 py-2"><input value={form.etcExpense} onChange={e => u('etcExpense', e.target.value)} className={`${inputCls} text-right`} /></td>
                <td className="px-3 py-2 bg-amber-50 font-bold text-slate-700 border-r border-slate-200">특별활동비</td>
                <td className="px-3 py-2"><input value={form.specialFee} onChange={e => u('specialFee', e.target.value)} className={`${inputCls} text-right`} /></td>
              </tr>
            </tbody>
          </table>
        </div>
        {/* 보호자정보 */}
        <div className="px-5 py-3">
          <div className="bg-slate-100 px-3 py-2 rounded font-bold text-[13px] text-slate-700 mb-2">보호자정보</div>
          <table className="w-full text-[12px] border-collapse border border-slate-200">
            <thead><tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-3 py-2 text-center font-bold text-slate-600 border-r border-slate-200">보호자명</th>
              <th className="px-3 py-2 text-center font-bold text-slate-600 border-r border-slate-200">휴대폰번호</th>
              <th className="px-3 py-2 text-center font-bold text-slate-600">관계</th>
            </tr></thead>
            <tbody>
              <tr className="border-b border-slate-200">
                <td className="px-3 py-2 border-r border-slate-200"><input value={form.guardian} onChange={e => u('guardian', e.target.value.replace(/[0-9]/g, ''))} className={inputCls} /></td>
                <td className="px-3 py-2 border-r border-slate-200"><input value={form.phone} onChange={e => u('phone', fmtPhone(e.target.value))} className={inputCls} /></td>
                <td className="px-3 py-2">
                  <select value={form.relation || '부'} onChange={e => u('relation', e.target.value)} className={inputCls}>
                    <option>부</option><option>모</option><option>조부</option><option>조모</option>
                  </select>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-slate-200 flex items-center justify-end gap-2">
          <button onClick={() => alert('저장되었습니다.')} className="px-6 py-1.5 text-[12px] font-bold text-white bg-teal-600 rounded hover:bg-teal-700">수정</button>
          <button onClick={onClose} className="px-6 py-1.5 text-[12px] font-bold text-slate-600 bg-slate-100 border border-slate-300 rounded hover:bg-slate-200">취소</button>
          <button className="px-6 py-1.5 text-[12px] font-bold text-slate-500 bg-slate-200 border border-slate-300 rounded hover:bg-slate-300">완전삭제</button>
        </div>
    </DraggableModal>
  )
}

const sampleChildren = [
  { id: 1, name: '김하은', birth: '2025-08-15', age: '만0세', className: '새싹반', enterDate: '2026-03-01', guardian: '김영수', phone: '010-1234-5678', leaveDate: '', status: '현원' },
  { id: 2, name: '이서준', birth: '2025-05-22', age: '만0세', className: '새싹반', enterDate: '2026-03-01', guardian: '이정희', phone: '010-2345-6789', leaveDate: '', status: '현원' },
  { id: 3, name: '박지우', birth: '2024-11-03', age: '만1세', className: '꽃잎반', enterDate: '2025-09-01', guardian: '박민수', phone: '010-3456-7890', leaveDate: '', status: '현원' },
  { id: 4, name: '최유진', birth: '2024-07-18', age: '만1세', className: '꽃잎반', enterDate: '2025-03-01', guardian: '최상철', phone: '010-4567-8901', leaveDate: '', status: '현원' },
  { id: 5, name: '정민서', birth: '2024-02-28', age: '만1세', className: '꽃잎반', enterDate: '2025-03-01', guardian: '정우진', phone: '010-5678-9012', leaveDate: '', status: '현원' },
  { id: 6, name: '한소율', birth: '2023-09-10', age: '만2세', className: '별빛반', enterDate: '2025-03-01', guardian: '한동규', phone: '010-6789-0123', leaveDate: '', status: '현원' },
  { id: 7, name: '윤서윤', birth: '2023-06-05', age: '만2세', className: '별빛반', enterDate: '2025-03-01', guardian: '윤재호', phone: '010-7890-1234', leaveDate: '', status: '현원' },
  { id: 8, name: '장예린', birth: '2023-01-20', age: '만2세', className: '별빛반', enterDate: '2024-09-01', guardian: '장호영', phone: '010-8901-2345', leaveDate: '', status: '현원' },
  { id: 9, name: '오시우', birth: '2022-12-11', age: '만3세', className: '달님반', enterDate: '2024-03-01', guardian: '오성진', phone: '010-9012-3456', leaveDate: '', status: '현원' },
  { id: 10, name: '송하율', birth: '2022-04-25', age: '만3세', className: '달님반', enterDate: '2024-03-01', guardian: '송민기', phone: '010-0123-4567', leaveDate: '', status: '현원' },
  { id: 11, name: '임도윤', birth: '2021-08-07', age: '만4세', className: '해님반', enterDate: '2023-03-01', guardian: '임재영', phone: '010-1111-2222', leaveDate: '', status: '현원' },
  { id: 12, name: '강시은', birth: '2021-03-14', age: '만4세', className: '해님반', enterDate: '2023-03-01', guardian: '강현우', phone: '010-2222-3333', leaveDate: '', status: '현원' },
  { id: 13, name: '조은우', birth: '2020-11-30', age: '만5세', className: '무지개반', enterDate: '2022-03-01', guardian: '조상현', phone: '010-3333-4444', leaveDate: '', status: '현원' },
  { id: 14, name: '배서현', birth: '2020-06-19', age: '만5세', className: '무지개반', enterDate: '2022-03-01', guardian: '배준혁', phone: '010-4444-5555', leaveDate: '', status: '현원' },
  { id: 15, name: '홍지호', birth: '2020-02-08', age: '만5세', className: '무지개반', enterDate: '2022-03-01', leaveDate: '2026-02-28', guardian: '홍길동', phone: '010-5555-6666', status: '퇴소' },
]

export default function ChildrenStatusPage() {
  const [search, setSearch] = useState('')
  const [filterAge, setFilterAge] = useState('전체')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selectedChild, setSelectedChild] = useState<any>(null)
  const filtered = sampleChildren.filter(c =>
    (filterAge === '전체' || c.age === filterAge) &&
    (search === '' || c.name.includes(search) || c.guardian.includes(search))
  )

  return (
    <div className="p-3 space-y-3">
      {/* 원아 상세/수정 팝업 */}
      {selectedChild && <ChildDetailModal child={selectedChild} onClose={() => setSelectedChild(null)} />}
      <div className="bg-white rounded-xl border border-teal-400/30 shadow-sm">
        <div className="px-4 py-3 border-b border-teal-400/20 flex items-center gap-2">
          <span className="text-sm font-bold text-slate-700">아동현황</span>
          <span className="text-xs text-slate-400">등록된 아동 정보를 조회하고 관리합니다.</span>
        </div>
        <div className="px-4 py-3 flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-slate-700">연령</span>
          <select value={filterAge} onChange={e => setFilterAge(e.target.value)} className="border border-teal-300 rounded px-2 py-1.5 text-xs">
            <option>전체</option>
            <option>만0세</option><option>만1세</option><option>만2세</option><option>만3세</option><option>만4세</option><option>만5세</option>
          </select>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="이름/보호자 검색" className="border border-teal-300 rounded px-2 py-1.5 text-xs w-40" />
          <button className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors">조회</button>
          <div className="ml-auto flex items-center gap-1.5">
            <button className="px-4 py-1.5 text-xs font-bold text-white bg-teal-500 hover:bg-teal-600 rounded transition-colors">신규등록</button>
            <button className="flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 rounded text-xs text-slate-600 transition-colors">
              <svg className="w-3.5 h-3.5 text-green-600" viewBox="0 0 24 24" fill="currentColor"><path d="M14.2 1H5.8C4.81 1 4 1.81 4 2.8v18.4c0 .99.81 1.8 1.8 1.8h12.4c.99 0 1.8-.81 1.8-1.8V6.8L14.2 1zM15.8 19.3l-2.1-3.5-2.1 3.5H9.8l3.2-5-2.9-4.7h1.8l2.1 3.3 2-3.3h1.8l-2.9 4.7 3.2 5h-2.3z" /></svg>
              엑셀
            </button>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4 text-xs text-slate-500">
        <span>총 <strong className="text-slate-700">{filtered.length}</strong>명</span>
        <span>현원 <strong className="text-blue-700">{filtered.filter(c => c.status === '현원').length}</strong>명</span>
        <span>퇴소 <strong className="text-red-600">{filtered.filter(c => c.status === '퇴소').length}</strong>명</span>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-[11px]">
          <thead><tr className="bg-teal-50 border-b border-slate-300">
            <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-200 w-[40px]">No</th>
            <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-200">이름</th>
            <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-200">생년월일</th>
            <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-200">연령</th>
            <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-200">반</th>
            <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-200">입소일</th>
            <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-200">퇴소일</th>
            <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-200">보호자</th>
            <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-200">연락처</th>
            <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-200">상태</th>
            <th className="px-2 py-2 text-center font-bold text-slate-600 w-[50px]">상세</th>
          </tr></thead>
          <tbody>
            {filtered.map((c, i) => (
              <tr key={c.id} className="border-b border-slate-100 hover:bg-blue-50/40 transition-colors cursor-pointer">
                <td className="px-2 py-1.5 text-center text-slate-500 border-r border-slate-100">{i + 1}</td>
                <td className="px-2 py-1.5 text-slate-700 font-medium border-r border-slate-100">{c.name}</td>
                <td className="px-2 py-1.5 text-center text-slate-600 border-r border-slate-100">{c.birth}</td>
                <td className="px-2 py-1.5 text-center border-r border-slate-100"><span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded">{c.age}</span></td>
                <td className="px-2 py-1.5 text-center text-slate-600 border-r border-slate-100">{c.className}</td>
                <td className="px-2 py-1.5 text-center text-slate-500 border-r border-slate-100">{c.enterDate}</td>
                <td className="px-2 py-1.5 text-center text-slate-500 border-r border-slate-100">{c.leaveDate || '-'}</td>
                <td className="px-2 py-1.5 text-slate-600 border-r border-slate-100">{c.guardian}</td>
                <td className="px-2 py-1.5 text-slate-500 border-r border-slate-100">{c.phone}</td>
                <td className="px-2 py-1.5 text-center border-r border-slate-100"><span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${c.status === '현원' ? 'text-blue-700 bg-blue-50' : 'text-red-600 bg-red-50'}`}>{c.status}</span></td>
                <td className="px-2 py-1.5 text-center whitespace-nowrap"><button onClick={() => setSelectedChild(c)} className="text-[10px] font-bold text-white bg-blue-500 hover:bg-blue-600 px-3 py-0.5 rounded whitespace-nowrap">보기</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
