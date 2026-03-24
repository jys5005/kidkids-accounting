'use client'
import React, { useState } from 'react'
import DraggableModal from '@/components/DraggableModal'
const inputCls = "border border-teal-300 rounded px-2 py-1 text-[12px] focus:outline-none focus:border-teal-500"

const classData = [
  { id: 19, name: '2025푸른바다5세아반', count: 0, type: '0세아 반', extended: '' },
  { id: 18, name: '2025밝은햇살4세아반', count: 1, type: '0세아 반', extended: '' },
  { id: 17, name: '2025파란하늘3세아반', count: 2, type: '0세아 반', extended: '' },
  { id: 16, name: '2025들꽃2세아반', count: 0, type: '0세아 반', extended: '' },
  { id: 15, name: '2025하늘구름누리장애아반', count: 1, type: '', extended: '' },
  { id: 14, name: '2025향기2세아반', count: 5, type: '0세아 반', extended: '' },
  { id: 13, name: '2025맑은샘물누리장애아반', count: 1, type: '', extended: '' },
  { id: 12, name: '2025풀잎반연령혼합반(1.2세)', count: 6, type: '', extended: '' },
  { id: 11, name: '2025초록풀잎1세아반', count: 4, type: '0세아 반', extended: '' },
  { id: 10, name: '2025아침이슬0세아반', count: 3, type: '0세아 반', extended: '' },
  { id: 9, name: '푸른바다5세아반', count: 2, type: '0세아 반', extended: '' },
  { id: 8, name: '파란하늘반3세아반', count: 0, type: '0세아 반', extended: '' },
  { id: 7, name: '맑은샘물누리장애아반', count: 0, type: '', extended: '' },
  { id: 6, name: '들꽃향기2세아반', count: 0, type: '0세아 반', extended: '' },
  { id: 5, name: '아침이슬2세아반', count: 1, type: '0세아 반', extended: '' },
  { id: 4, name: '밝은햇살반4.5세이상반', count: 0, type: '', extended: '' },
  { id: 3, name: '초록풀잎11세아반', count: 1, type: '0세아 반', extended: '' },
  { id: 2, name: '아기구름0세아반', count: 2, type: '0세아 반', extended: '' },
  { id: 1, name: '아침이슬.0세아반', count: 2, type: '0세아 반', extended: '' },
]

const classTypes = ['선택','0세아 반','1세아 반','2세아 반','3세아 반','4세아 반','5세아 반','4.5세이상 반','연령혼합반(0.1세)','연령혼합반(1.2세)','연령혼합반(2.3세)','연령혼합반(3.4세 이상)','방과후반','장애아기본반','장애아방과후반','누리장애아반','연장반(0세)']

export default function ClassPage() {
  const [searchField, setSearchField] = useState('반명')
  const [search, setSearch] = useState('')
  const [showDetail, setShowDetail] = useState(false)
  const [selectedClass, setSelectedClass] = useState<typeof classData[0] | null>(null)

  const filtered = classData.filter(c => search === '' || c.name.includes(search))

  return (
    <div className="p-3 space-y-3">
      <div className="bg-white rounded-xl border border-teal-400/30 shadow-sm">
        <div className="px-4 py-3 border-b border-teal-400/20 flex items-center gap-2 flex-wrap">
          <span className="text-sm font-bold text-slate-700">반편성관리</span>
          <select value={searchField} onChange={e => setSearchField(e.target.value)} className={`${inputCls} w-20 ml-4`}>
            <option>반명</option>
          </select>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} className={`${inputCls} w-40`} />
          <button className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded">조회</button>
          <button onClick={() => { setSelectedClass(null); setShowDetail(true) }} className="ml-auto px-4 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded">반등록</button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-[11px]">
          <thead><tr className="bg-teal-50 border-b border-slate-300">
            <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-200 w-[50px]">번호</th>
            <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-200 w-[300px]">반명</th>
            <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-200 w-[90px]">소속원아수</th>
            <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-200 w-[90px]">구분</th>
            <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-200 w-[120px]">시간연장여부</th>
            <th className="px-2 py-2 text-center font-bold text-slate-600 w-[50px]">보기</th>
          </tr></thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.id} className="border-b border-slate-100 hover:bg-blue-50/40">
                <td className="px-2 py-1.5 text-center text-slate-500 border-r border-slate-100">{c.id}</td>
                <td className="px-2 py-1.5 text-center text-slate-700 border-r border-slate-100">{c.name}</td>
                <td className="px-2 py-1.5 text-center text-slate-600 border-r border-slate-100">{c.count} 명</td>
                <td className="px-2 py-1.5 text-center text-slate-600 border-r border-slate-100">{c.type}</td>
                <td className="px-2 py-1.5 text-center text-slate-500 border-r border-slate-100">{c.extended}</td>
                <td className="px-2 py-1.5 text-center"><button onClick={() => { setSelectedClass(c); setShowDetail(true) }} className="px-2 py-0.5 text-[10px] text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded">보기</button></td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-center gap-2 text-xs text-slate-500">
          <button className="hover:text-slate-700">이전</button>
          <span className="px-2 py-0.5 bg-blue-600 text-white rounded text-[10px] font-bold">1</span>
          <button className="hover:text-slate-700">다음</button>
        </div>

      </div>
      {showDetail && selectedClass && (
        <DraggableModal onClose={() => setShowDetail(false)} title="반 등록" className="w-full max-w-[700px]">
            <div className="p-4">
              <table className="w-full text-[12px] border-collapse">
                <colgroup><col style={{width:'15%'}}/><col style={{width:'50%'}}/><col style={{width:'10%'}}/><col style={{width:'25%'}}/></colgroup>
                <tbody>
                  <tr className="border-b border-slate-100">
                    <td className="font-medium text-slate-700 bg-slate-100 px-3 py-2.5 border-r border-slate-200 text-center">반명</td>
                    <td className="px-3 py-2.5"><input type="text" defaultValue={selectedClass.name} className={`${inputCls} w-full`} /></td>
                    <td className="font-medium text-slate-700 bg-slate-100 px-3 py-2.5 border-r border-slate-200 text-center">구분</td>
                    <td className="px-3 py-2.5">
                      <select defaultValue={selectedClass.type} className={`${inputCls} w-full`}>
                        {classTypes.map(t => <option key={t}>{t}</option>)}
                      </select>
                    </td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="font-medium text-slate-700 bg-slate-100 px-3 py-2.5 border-r border-slate-200 text-center">시간연장여부</td>
                    <td colSpan={3} className="px-3 py-2.5">
                      <label className="text-xs"><input type="radio" name="extended" className="mr-0.5" />종일반</label>
                      <label className="text-xs ml-3"><input type="radio" name="extended" className="mr-0.5" />시간연장반</label>
                    </td>
                  </tr>
                  <tr>
                    <td className="font-medium text-slate-700 bg-slate-100 px-3 py-2.5 border-r border-slate-200 text-center">비고</td>
                    <td colSpan={3} className="px-3 py-2.5"><input type="text" className={`${inputCls} w-full`} /></td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-end gap-2">
              <button className="px-6 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded">저장</button>
              <button className="px-6 py-2 text-xs font-bold text-white bg-green-600 hover:bg-green-700 rounded">삭제</button>
              <button onClick={() => setShowDetail(false)} className="px-6 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded">취소</button>
            </div>
        </DraggableModal>
      )}
    </div>
  )
}
