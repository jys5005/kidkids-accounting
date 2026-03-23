'use client'
import React, { useState } from 'react'
const inputCls = "border border-teal-300 rounded px-2 py-1 text-[12px] focus:outline-none focus:border-teal-500"

const classNames = ['전체','2025푸른바다5세아반','2025밝은햇살4세아반','2025파란하늘3세아반','2025들꽃2세아반','2025하늘구름누리장애아반','2025향기2세아반','2025맑은샘물누리장애아반','2025풀잎반연령혼합반(1.2세)','2025초록풀잎1세아반','2025아침이슬0세아반']

const sampleChildren = [
  { name: '강나윤', phone: '010-5277-2609' },
  { name: '경한울', phone: '010-4785-5616' },
  { name: '고나경', phone: '010-9774-7037' },
  { name: '권서현', phone: '010-4695-8245' },
  { name: '권지희', phone: '010-7582-2028' },
  { name: '김가은', phone: '010-6768-6168' },
  { name: '김가율', phone: '010-8427-9500' },
  { name: '김건호', phone: '010-7103-0653' },
  { name: '김다솜', phone: '010-3445-9607' },
]

export default function AttendancePage() {
  const [month, setMonth] = useState('2026-03')
  const [selectedClass, setSelectedClass] = useState('전체')
  const [sortBy, setSortBy] = useState<'name' | 'date'>('name')

  const year = parseInt(month.split('-')[0])
  const mon = parseInt(month.split('-')[1])
  const daysInMonth = new Date(year, mon, 0).getDate()
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  return (
    <div className="p-3 space-y-3">
      <div className="bg-white rounded-xl border border-teal-400/30 shadow-sm">
        <div className="px-4 py-3 border-b border-teal-400/20">
          <span className="text-sm font-bold text-slate-700">출석부</span>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-[12px]">
          <tbody>
            <tr>
              <td className="font-medium text-slate-700 bg-teal-50 px-3 py-2.5 border-r border-slate-200 text-center w-[100px]">출력년월</td>
              <td className="px-3 py-2.5 w-[150px]"><input type="month" value={month} onChange={e => setMonth(e.target.value)} className={inputCls} /></td>
              <td className="font-medium text-slate-700 bg-teal-50 px-3 py-2.5 border-r border-slate-200 text-center w-[80px]">반선택</td>
              <td className="px-3 py-2.5"><select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className={`${inputCls} w-52`}>{classNames.map(c => <option key={c}>{c}</option>)}</select></td>
              <td className="px-3 py-2.5 text-center"><button onClick={() => window.print()} className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded">출석부 출력</button></td>
              <td className="font-medium text-slate-700 bg-teal-50 px-3 py-2.5 border-r border-slate-200 text-center w-[80px]">정렬순서</td>
              <td className="px-3 py-2.5">
                <label className="text-xs"><input type="radio" name="sort" checked={sortBy === 'name'} onChange={() => setSortBy('name')} className="mr-0.5" />원아명</label>
                <label className="text-xs ml-2"><input type="radio" name="sort" checked={sortBy === 'date'} onChange={() => setSortBy('date')} className="mr-0.5" />입소일자</label>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="bg-teal-50 border border-slate-300 text-center py-2 text-sm font-bold text-slate-700">{month} 출석부</div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table className="text-[10px] border-collapse min-w-[900px]">
          <thead>
            <tr className="bg-teal-50 border-b border-slate-300">
              <th className="px-1 py-1 text-center font-bold text-slate-600 border-r border-slate-200 w-[30px]">번호</th>
              <th className="px-1 py-1 text-center font-bold text-slate-600 border-r border-slate-200 w-[80px]">성명</th>
              <th className="px-1 py-1 text-center font-bold text-slate-600 border-r border-slate-200 w-[70px]">전화번호</th>
              {days.map(d => (
                <th key={d} className={`px-0.5 py-1 text-center font-bold border-r border-slate-200 w-[22px] ${new Date(year, mon-1, d).getDay() === 0 ? 'text-red-500' : new Date(year, mon-1, d).getDay() === 6 ? 'text-blue-500' : 'text-slate-600'}`}>{d}</th>
              ))}
              <th className="px-1 py-1 text-center font-bold text-slate-600 border-r border-slate-200 w-[22px]">계</th>
              <th className="px-1 py-1 text-center font-bold text-slate-600 w-[22px]">비고</th>
            </tr>
          </thead>
          <tbody>
            {sampleChildren.map((child, i) => (
              <tr key={i} className="border-b border-slate-100">
                <td className="px-1 py-1 text-center text-slate-500 border-r border-slate-100">{i + 1}</td>
                <td className="px-1 py-1 text-center text-slate-700 font-medium border-r border-slate-100">{child.name}</td>
                <td className="px-1 py-1 text-center text-slate-500 border-r border-slate-100 text-[8px]">{child.phone}</td>
                {days.map(d => (<td key={d} className="px-0.5 py-1 text-center border-r border-slate-100"></td>))}
                <td className="px-1 py-1 text-center border-r border-slate-100"></td>
                <td className="px-1 py-1 text-center"></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
