'use client'
import React, { useState } from 'react'

const fmt = (n: number) => n.toLocaleString('ko-KR')

const sampleChildren = [
  { id: 1, name: '김하은', birth: '2025-08-15', age: '만0세', className: '새싹반', enterDate: '2026-03-01', guardian: '김영수', phone: '010-1234-5678', status: '재원' },
  { id: 2, name: '이서준', birth: '2025-05-22', age: '만0세', className: '새싹반', enterDate: '2026-03-01', guardian: '이정희', phone: '010-2345-6789', status: '재원' },
  { id: 3, name: '박지우', birth: '2024-11-03', age: '만1세', className: '꽃잎반', enterDate: '2025-09-01', guardian: '박민수', phone: '010-3456-7890', status: '재원' },
  { id: 4, name: '최유진', birth: '2024-07-18', age: '만1세', className: '꽃잎반', enterDate: '2025-03-01', guardian: '최상철', phone: '010-4567-8901', status: '재원' },
  { id: 5, name: '정민서', birth: '2024-02-28', age: '만1세', className: '꽃잎반', enterDate: '2025-03-01', guardian: '정우진', phone: '010-5678-9012', status: '재원' },
  { id: 6, name: '한소율', birth: '2023-09-10', age: '만2세', className: '별빛반', enterDate: '2025-03-01', guardian: '한동규', phone: '010-6789-0123', status: '재원' },
  { id: 7, name: '윤서윤', birth: '2023-06-05', age: '만2세', className: '별빛반', enterDate: '2025-03-01', guardian: '윤재호', phone: '010-7890-1234', status: '재원' },
  { id: 8, name: '장예린', birth: '2023-01-20', age: '만2세', className: '별빛반', enterDate: '2024-09-01', guardian: '장호영', phone: '010-8901-2345', status: '재원' },
  { id: 9, name: '오시우', birth: '2022-12-11', age: '만3세', className: '달님반', enterDate: '2024-03-01', guardian: '오성진', phone: '010-9012-3456', status: '재원' },
  { id: 10, name: '송하율', birth: '2022-04-25', age: '만3세', className: '달님반', enterDate: '2024-03-01', guardian: '송민기', phone: '010-0123-4567', status: '재원' },
  { id: 11, name: '임도윤', birth: '2021-08-07', age: '만4세', className: '해님반', enterDate: '2023-03-01', guardian: '임재영', phone: '010-1111-2222', status: '재원' },
  { id: 12, name: '강시은', birth: '2021-03-14', age: '만4세', className: '해님반', enterDate: '2023-03-01', guardian: '강현우', phone: '010-2222-3333', status: '재원' },
  { id: 13, name: '조은우', birth: '2020-11-30', age: '만5세', className: '무지개반', enterDate: '2022-03-01', guardian: '조상현', phone: '010-3333-4444', status: '재원' },
  { id: 14, name: '배서현', birth: '2020-06-19', age: '만5세', className: '무지개반', enterDate: '2022-03-01', guardian: '배준혁', phone: '010-4444-5555', status: '재원' },
  { id: 15, name: '홍지호', birth: '2020-02-08', age: '만5세', className: '무지개반', enterDate: '2022-03-01', guardian: '홍길동', phone: '010-5555-6666', status: '퇴소' },
]

export default function ChildrenStatusPage() {
  const [search, setSearch] = useState('')
  const [filterAge, setFilterAge] = useState('전체')
  const filtered = sampleChildren.filter(c =>
    (filterAge === '전체' || c.age === filterAge) &&
    (search === '' || c.name.includes(search) || c.guardian.includes(search))
  )

  return (
    <div className="p-3 space-y-3">
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
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              엑셀
            </button>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4 text-xs text-slate-500">
        <span>총 <strong className="text-slate-700">{filtered.length}</strong>명</span>
        <span>현원 <strong className="text-blue-700">{filtered.filter(c => c.status === '재원').length}</strong>명</span>
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
            <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-200">보호자</th>
            <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-200">연락처</th>
            <th className="px-2 py-2 text-center font-bold text-slate-600">상태</th>
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
                <td className="px-2 py-1.5 text-slate-600 border-r border-slate-100">{c.guardian}</td>
                <td className="px-2 py-1.5 text-slate-500 border-r border-slate-100">{c.phone}</td>
                <td className="px-2 py-1.5 text-center"><span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${c.status === '재원' ? 'text-blue-700 bg-blue-50' : 'text-red-600 bg-red-50'}`}>{c.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
