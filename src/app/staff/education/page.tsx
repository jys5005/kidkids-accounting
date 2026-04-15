'use client'
import React, { useState } from 'react'

const educationTypes = ['법정의무교육', '보수교육', '직무교육', '승급교육', '기타교육']

const educationData = [
  { id: 1, name: '강민정', type: '법정의무교육', title: '아동학대 예방교육', hours: 4, startDate: '2026-01-15', endDate: '2026-01-15', institution: '한국보육진흥원', status: '이수', certificate: true },
  { id: 2, name: '강수현', type: '법정의무교육', title: '개인정보보호교육', hours: 2, startDate: '2026-02-10', endDate: '2026-02-10', institution: '한국보육진흥원', status: '이수', certificate: true },
  { id: 3, name: '강수현', type: '보수교육', title: '영유아 안전관리', hours: 8, startDate: '2026-03-05', endDate: '2026-03-06', institution: '중앙육아종합지원센터', status: '이수', certificate: false },
  { id: 4, name: '김경자', type: '법정의무교육', title: '성희롱 예방교육', hours: 2, startDate: '2026-01-20', endDate: '2026-01-20', institution: '한국보육진흥원', status: '이수', certificate: true },
  { id: 5, name: '강민정', type: '직무교육', title: '영아보육 직무교육', hours: 40, startDate: '2026-02-01', endDate: '2026-02-28', institution: '중앙육아종합지원센터', status: '진행중', certificate: false },
  { id: 6, name: '김경자', type: '법정의무교육', title: '긴급복지신고의무자교육', hours: 1, startDate: '2026-03-10', endDate: '2026-03-10', institution: '보건복지부', status: '미이수', certificate: false },
]

const inputCls = "border border-teal-300 rounded px-2 py-1 text-[12px] focus:outline-none focus:border-teal-500"

export default function EducationPage() {
  const [activeTab, setActiveTab] = useState('전체')
  const [filterStatus, setFilterStatus] = useState('전체')
  const [filterField, setFilterField] = useState('교직원이름')
  const [search, setSearch] = useState('')
  const [checked, setChecked] = useState<Set<number>>(new Set())

  const tabs = ['전체', ...educationTypes]

  const filteredData = educationData.filter(item => {
    if (activeTab !== '전체' && item.type !== activeTab) return false
    if (filterStatus !== '전체' && item.status !== filterStatus) return false
    if (search && !item.name.includes(search) && !item.title.includes(search)) return false
    return true
  })

  const allChecked = filteredData.length > 0 && filteredData.every(d => checked.has(d.id))

  return (
    <div className="p-3 space-y-3">
      <div className="bg-white rounded-xl border border-teal-400/30 shadow-sm">
        <div className="px-4 py-3 border-b border-teal-400/20 flex items-center gap-2">
          <span className="text-sm font-bold text-slate-700">교사교육</span>
          <span className="text-xs text-slate-400">교직원 교육이수 현황을 관리합니다.</span>
        </div>
      </div>

      {/* 교육 종류 탭 */}
      <div className="flex items-center gap-2 flex-wrap">
        {tabs.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 text-[12px] font-medium rounded transition-colors ${activeTab === tab ? 'text-slate-900 font-bold border-b-2 border-teal-500' : 'text-slate-500 hover:text-slate-700'}`}>
            ○ {tab}
          </button>
        ))}
      </div>

      {/* 필터 */}
      <div className="flex items-center gap-2 flex-wrap">
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className={`${inputCls} w-20`}>
          <option>전체</option><option>이수</option><option>진행중</option><option>미이수</option>
        </select>
        <select value={filterField} onChange={e => setFilterField(e.target.value)} className={`${inputCls} w-28`}>
          <option>교직원이름</option><option>교육명</option>
        </select>
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} className={`${inputCls} w-36`} placeholder="검색어 입력" />
        <button className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded">조회</button>
        <div className="ml-auto flex items-center gap-2">
          <button className="flex items-center gap-1 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded text-xs font-bold">
            + 교육등록
          </button>
          <button className="flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 rounded text-xs text-slate-600">
            <svg className="w-3.5 h-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5z" /></svg>
            출력
          </button>
        </div>
      </div>

      {/* 테이블 */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-[11px]">
          <thead><tr className="bg-teal-50 border-b border-slate-300">
            <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-200 w-[30px]">
              <input type="checkbox" className="w-3 h-3" checked={allChecked} onChange={() => {
                if (allChecked) setChecked(new Set())
                else setChecked(new Set(filteredData.map(d => d.id)))
              }} />
            </th>
            <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-200 w-[40px]">번호</th>
            <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-200">교직원</th>
            <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-200">교육구분</th>
            <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-200">교육명</th>
            <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-200">교육시간</th>
            <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-200">교육시작일</th>
            <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-200">교육종료일</th>
            <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-200">교육기관</th>
            <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-200">이수상태</th>
            <th className="px-2 py-2 text-center font-bold text-slate-600">수료증</th>
          </tr></thead>
          <tbody>
            {filteredData.map(item => (
              <tr key={item.id} className="border-b border-slate-100 hover:bg-blue-50/40">
                <td className="px-2 py-1.5 text-center border-r border-slate-100">
                  <input type="checkbox" className="w-3 h-3" checked={checked.has(item.id)} onChange={() => {
                    const n = new Set(checked); n.has(item.id) ? n.delete(item.id) : n.add(item.id); setChecked(n)
                  }} />
                </td>
                <td className="px-2 py-1.5 text-center text-slate-500 border-r border-slate-100">{item.id}</td>
                <td className="px-2 py-1.5 text-slate-700 font-medium border-r border-slate-100">{item.name}</td>
                <td className="px-2 py-1.5 text-center text-slate-600 border-r border-slate-100">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                    item.type === '법정의무교육' ? 'bg-red-50 text-red-600' :
                    item.type === '보수교육' ? 'bg-blue-50 text-blue-600' :
                    item.type === '직무교육' ? 'bg-purple-50 text-purple-600' :
                    item.type === '승급교육' ? 'bg-amber-50 text-amber-600' :
                    'bg-slate-50 text-slate-600'
                  }`}>{item.type}</span>
                </td>
                <td className="px-2 py-1.5 text-slate-700 border-r border-slate-100">{item.title}</td>
                <td className="px-2 py-1.5 text-center text-slate-600 border-r border-slate-100">{item.hours}시간</td>
                <td className="px-2 py-1.5 text-center text-slate-500 border-r border-slate-100">{item.startDate}</td>
                <td className="px-2 py-1.5 text-center text-slate-500 border-r border-slate-100">{item.endDate}</td>
                <td className="px-2 py-1.5 text-slate-500 border-r border-slate-100">{item.institution}</td>
                <td className="px-2 py-1.5 text-center border-r border-slate-100">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    item.status === '이수' ? 'bg-green-50 text-green-600' :
                    item.status === '진행중' ? 'bg-yellow-50 text-yellow-600' :
                    'bg-red-50 text-red-600'
                  }`}>{item.status}</span>
                </td>
                <td className="px-2 py-1.5 text-center text-slate-500">
                  {item.certificate ? <span className="text-green-500">O</span> : <span className="text-slate-300">-</span>}
                </td>
              </tr>
            ))}
            {filteredData.length === 0 && (
              <tr><td colSpan={11} className="px-4 py-8 text-center text-slate-400 text-xs">조회된 교육이력이 없습니다.</td></tr>
            )}
          </tbody>
        </table>
        <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>총 {filteredData.length}건</span>
          <div className="flex items-center gap-2">
            <button className="hover:text-slate-700">이전</button>
            <span className="px-2 py-0.5 bg-blue-600 text-white rounded text-[10px] font-bold">1</span>
            <button className="hover:text-slate-700">다음</button>
          </div>
        </div>
      </div>
    </div>
  )
}
