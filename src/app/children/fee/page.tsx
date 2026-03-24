'use client'
import React, { useState } from 'react'
const fmt = (n: number) => n.toLocaleString('ko-KR')
const inputCls = "border border-amber-300 rounded px-2 py-1 text-[11px] text-right focus:outline-none focus:border-amber-500 w-[80px]"

const sampleChildren = [
  { id: 1, name: '곽이안', status: '현원', residentNo: '231028-3', className: '예쁜반21세아반', enterDate: '2024-11-01', fee: 0, etcFee: 0, etcExpense: 0, specialFee: 0, etcMealFee: 0, paid: false, receipt: false },
  { id: 2, name: '김가은', status: '퇴소', residentNo: '200301-3', className: '', enterDate: '2022-03-02', fee: 0, etcFee: 0, etcExpense: 0, specialFee: 0, etcMealFee: 0, paid: false, receipt: false },
  { id: 3, name: '김가율', status: '퇴소', residentNo: '201018-4', className: '', enterDate: '2022-03-02', fee: 0, etcFee: 0, etcExpense: 0, specialFee: 0, etcMealFee: 0, paid: false, receipt: false },
  { id: 4, name: '김건후', status: '퇴소', residentNo: '220312-3', className: '', enterDate: '2023-03-01', fee: 0, etcFee: 0, etcExpense: 0, specialFee: 0, etcMealFee: 0, paid: false, receipt: false },
  { id: 5, name: '김다솜', status: '현원', residentNo: '221110-4', className: '수리반12세아반', enterDate: '2024-09-01', fee: 0, etcFee: 0, etcExpense: 0, specialFee: 0, etcMealFee: 0, paid: false, receipt: false },
  { id: 6, name: '김다온', status: '퇴소', residentNo: '201016-3', className: '', enterDate: '2022-03-02', fee: 0, etcFee: 0, etcExpense: 0, specialFee: 0, etcMealFee: 0, paid: false, receipt: false },
  { id: 7, name: '김도하', status: '현원', residentNo: '221115-4', className: '초롱반1연령혼합반(1,2세)', enterDate: '2024-03-02', fee: 0, etcFee: 0, etcExpense: 0, specialFee: 0, etcMealFee: 0, paid: false, receipt: false },
  { id: 8, name: '김서울', status: '퇴소', residentNo: '200831-3', className: '', enterDate: '2021-09-01', fee: 0, etcFee: 0, etcExpense: 0, specialFee: 0, etcMealFee: 0, paid: false, receipt: false },
  { id: 9, name: '김준민', status: '현원', residentNo: '230903-3', className: '초롱반21세아반', enterDate: '2024-09-01', fee: 0, etcFee: 0, etcExpense: 0, specialFee: 0, etcMealFee: 0, paid: false, receipt: false },
  { id: 10, name: '민이랑', status: '현원', residentNo: '240103-4', className: '예쁜반21세아반', enterDate: '2024-11-01', fee: 0, etcFee: 0, etcExpense: 0, specialFee: 0, etcMealFee: 0, paid: false, receipt: false },
  { id: 11, name: '정해인', status: '현원', residentNo: '230408-3', className: '예쁜반11세아반', enterDate: '2024-03-02', fee: 0, etcFee: 0, etcExpense: 0, specialFee: 0, etcMealFee: 0, paid: false, receipt: false },
  { id: 12, name: '조연서', status: '현원', residentNo: '221018-4', className: '수리반12세아반', enterDate: '2024-03-02', fee: 0, etcFee: 0, etcExpense: 0, specialFee: 0, etcMealFee: 0, paid: false, receipt: false },
]

export default function ChildFeePage() {
  const now = new Date()
  const [yearMonth, setYearMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)
  const [filterClass, setFilterClass] = useState('선택')
  const [searchName, setSearchName] = useState('')
  const [rows, setRows] = useState(sampleChildren.map(c => ({ ...c })))
  const [checked, setChecked] = useState<Set<number>>(new Set())
  const [payDate, setPayDate] = useState(now.toISOString().slice(0, 10))

  const filtered = rows.filter(r =>
    (filterClass === '선택' || r.className.includes(filterClass)) &&
    (searchName === '' || r.name.includes(searchName))
  )

  const toggleCheck = (id: number) => {
    const next = new Set(checked)
    next.has(id) ? next.delete(id) : next.add(id)
    setChecked(next)
  }
  const toggleAll = () => {
    if (checked.size === filtered.length) setChecked(new Set())
    else setChecked(new Set(filtered.map(r => r.id)))
  }

  const updateRow = (id: number, key: string, val: number) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, [key]: val } : r))
  }

  const totals = filtered.reduce((acc, r) => ({
    fee: acc.fee + r.fee,
    etcFee: acc.etcFee + r.etcFee,
    etcExpense: acc.etcExpense + r.etcExpense,
    etcMealFee: acc.etcMealFee + r.etcMealFee,
    specialFee: acc.specialFee + r.specialFee,
    total: acc.total + r.fee + r.etcFee + r.etcExpense + r.etcMealFee + r.specialFee,
  }), { fee: 0, etcFee: 0, etcExpense: 0, etcMealFee: 0, specialFee: 0, total: 0 })

  const classes = [...new Set(sampleChildren.map(c => c.className).filter(Boolean))]

  return (
    <div className="p-3 space-y-3">
      <div className="bg-white rounded-xl border border-teal-400/30 shadow-sm">
        <div className="px-4 py-3 border-b border-teal-400/20">
          <span className="text-sm font-bold text-slate-700">보육료 납부</span>
        </div>
      </div>

      {/* 필터 */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1">
          <span className="text-[12px] font-bold text-slate-700">반선택</span>
          <select value={filterClass} onChange={e => setFilterClass(e.target.value)} className="border border-teal-300 rounded px-2 py-1 text-[12px]">
            <option>선택</option>
            {classes.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[12px] font-bold text-slate-700">원아명</span>
          <input value={searchName} onChange={e => setSearchName(e.target.value)} className="border border-teal-300 rounded px-2 py-1 text-[12px] w-28" />
          <button className="px-3 py-1 text-[11px] font-bold text-white bg-blue-600 rounded hover:bg-blue-700">검색</button>
        </div>
        <button className="px-3 py-1 text-[11px] font-bold text-white bg-slate-600 rounded hover:bg-slate-700 ml-auto">회계장부 자료가져오기</button>
      </div>

      <p className="text-[11px] text-red-500">* 마감안된 월은 현금출납부 대장에 기록됩니다.</p>

      {/* 년월 + 버튼들 */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1">
          <span className="text-[12px] font-bold text-slate-700">년월 :</span>
          <input type="month" value={yearMonth} onChange={e => setYearMonth(e.target.value)} className="border border-teal-300 rounded px-2 py-1 text-[12px]" />
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          <button className="px-3 py-1.5 text-[10px] font-bold text-white bg-blue-600 rounded">보육료 수납영수증</button>
          <button className="px-3 py-1.5 text-[10px] font-bold text-white bg-amber-600 rounded">보육료 불입통지서</button>
          <button className="px-3 py-1.5 text-[10px] font-bold text-white bg-red-500 rounded">수익자부담금 불입통지서</button>
          <button className="px-3 py-1.5 text-[10px] font-bold text-white bg-teal-600 rounded">특별활동비 불입통지서</button>
          <button className="px-3 py-1.5 text-[10px] font-bold text-slate-700 bg-slate-200 border border-slate-300 rounded">보육료 연간 납입증명서</button>
          <button className="px-3 py-1.5 text-[10px] font-bold text-slate-700 bg-slate-200 border border-slate-300 rounded">보육료 납입증명서</button>
          <button className="px-3 py-1.5 text-[10px] font-bold text-slate-700 bg-slate-200 border border-slate-300 rounded">기타필요경비 연간 납입증명서</button>
          <button className="px-3 py-1.5 text-[10px] font-bold text-white bg-purple-600 rounded">특별활동비 연간 납입증명서</button>
        </div>
      </div>
      <div className="flex justify-center">
        <button className="px-4 py-1.5 text-[11px] font-bold text-white bg-slate-800 rounded">보육료 대장</button>
      </div>

      {/* 테이블 */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-[11px] border-collapse min-w-[1100px]">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-300">
              <th className="px-1 py-2 border-r border-slate-200 w-[30px]"><input type="checkbox" checked={checked.size === filtered.length && filtered.length > 0} onChange={toggleAll} /></th>
              <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-200">원아명(상태)</th>
              <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-200">주민번호</th>
              <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-200">소속반</th>
              <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-200">입소일</th>
              <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-200">보육료</th>
              <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-200">기타필요경비</th>
              <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-200">기타필요경비<br/>(조석식비)</th>
              <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-200">특별활동비</th>
              <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-200">합계</th>
              <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-200">납부여부</th>
              <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-200">반영여부</th>
              <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-200">영수증</th>
              <th className="px-2 py-2 text-center font-bold text-slate-600 w-[40px]">삭제</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => {
              const total = r.fee + r.etcFee + r.etcExpense + r.etcMealFee + r.specialFee
              return (
                <tr key={r.id} className="border-b border-slate-100 hover:bg-blue-50/30">
                  <td className="px-1 py-1.5 text-center border-r border-slate-100"><input type="checkbox" checked={checked.has(r.id)} onChange={() => toggleCheck(r.id)} /></td>
                  <td className="px-2 py-1.5 border-r border-slate-100 whitespace-nowrap">
                    <span className={r.status === '현원' ? 'text-slate-800' : 'text-red-500'}>{r.name}({r.status})</span>
                  </td>
                  <td className="px-2 py-1.5 text-center text-slate-600 border-r border-slate-100">{r.residentNo}</td>
                  <td className="px-2 py-1.5 text-slate-600 border-r border-slate-100 text-[10px]">{r.className}</td>
                  <td className="px-2 py-1.5 text-center text-slate-500 border-r border-slate-100">{r.enterDate}</td>
                  <td className="px-1 py-1 border-r border-slate-100"><input value={r.fee} onChange={e => updateRow(r.id, 'fee', Number(e.target.value) || 0)} className={inputCls} /></td>
                  <td className="px-1 py-1 border-r border-slate-100"><input value={r.etcFee} onChange={e => updateRow(r.id, 'etcFee', Number(e.target.value) || 0)} className={inputCls} /></td>
                  <td className="px-1 py-1 border-r border-slate-100"><input value={r.etcMealFee} onChange={e => updateRow(r.id, 'etcMealFee', Number(e.target.value) || 0)} className={inputCls} /></td>
                  <td className="px-1 py-1 border-r border-slate-100"><input value={r.specialFee} onChange={e => updateRow(r.id, 'specialFee', Number(e.target.value) || 0)} className={inputCls} /></td>
                  <td className="px-2 py-1.5 text-right border-r border-slate-100 font-bold">{total > 0 ? fmt(total) : ''}</td>
                  <td className="px-2 py-1.5 text-center border-r border-slate-100 text-slate-400">미저장</td>
                  <td className="px-2 py-1.5 text-center border-r border-slate-100 text-slate-400">미반영</td>
                  <td className="px-2 py-1.5 text-center border-r border-slate-100">
                    <button className="text-[10px] text-blue-500 hover:underline">영수증</button>
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <button className="text-[10px] text-red-400 hover:text-red-600">삭제</button>
                  </td>
                </tr>
              )
            })}
            {/* 합계 행 */}
            <tr className="bg-slate-50 font-bold border-t border-slate-300">
              <td className="px-2 py-2 text-center border-r border-slate-200" colSpan={5}>합 계</td>
              <td className="px-2 py-2 text-right border-r border-slate-200">{totals.fee > 0 ? fmt(totals.fee) : '0'}</td>
              <td className="px-2 py-2 text-right border-r border-slate-200">{totals.etcFee > 0 ? fmt(totals.etcFee) : '0'}</td>
              <td className="px-2 py-2 text-right border-r border-slate-200">{totals.etcMealFee > 0 ? fmt(totals.etcMealFee) : '0'}</td>
              <td className="px-2 py-2 text-right border-r border-slate-200">{totals.specialFee > 0 ? fmt(totals.specialFee) : '0'}</td>
              <td className="px-2 py-2 text-right border-r border-slate-200">{totals.total > 0 ? fmt(totals.total) : '0'}</td>
              <td colSpan={4}></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 하단: 납부일자 + 저장 */}
      <div className="flex items-center justify-end gap-3">
        <span className="text-[12px] text-slate-600">장부 기장을 위한 납부일자 :</span>
        <input type="date" value={payDate} onChange={e => setPayDate(e.target.value)} className="border border-teal-300 rounded px-2 py-1 text-[12px]" />
        <button className="px-6 py-2 text-[12px] font-bold text-white bg-blue-600 rounded hover:bg-blue-700">납부 저장하기</button>
      </div>
    </div>
  )
}
