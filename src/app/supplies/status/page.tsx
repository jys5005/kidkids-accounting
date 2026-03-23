'use client'
import React, { useState } from 'react'
const fmt = (n: number) => n.toLocaleString('ko-KR')
const inputCls = "border border-teal-300 rounded px-2 py-1 text-[12px] focus:outline-none focus:border-teal-500"

const items = [
  { id: 1, date: '2013-06-18', name: '아이들이불장', model: '', vendor: '', price: 1644000, qty: '', usage: '', current: '', lostDate: '', manager: '' },
  { id: 2, date: '2013-07-18', name: '아이들이불장', model: '', vendor: '', price: 1644000, qty: '', usage: '', current: '', lostDate: '', manager: '' },
  { id: 3, date: '2014-03-10', name: '의자구입', model: '', vendor: '', price: 60000, qty: '', usage: '', current: '', lostDate: '', manager: '' },
  { id: 4, date: '2014-03-31', name: '진공청소기외', model: '', vendor: '', price: 602220, qty: '', usage: '', current: '', lostDate: '', manager: '' },
  { id: 5, date: '2014-04-26', name: '밥솥', model: '', vendor: '', price: 170000, qty: '', usage: '', current: '', lostDate: '', manager: '' },
  { id: 6, date: '2014-05-31', name: '컴퓨터모니터구입', model: '', vendor: '', price: 221400, qty: '', usage: '', current: '', lostDate: '', manager: '' },
  { id: 7, date: '2014-06-30', name: '선풍기구입', model: '', vendor: '', price: 228000, qty: '', usage: '', current: '', lostDate: '', manager: '' },
  { id: 8, date: '2014-07-28', name: '돌심교구장', model: '', vendor: '', price: 189000, qty: '', usage: '', current: '', lostDate: '', manager: '' },
  { id: 9, date: '2014-07-28', name: '돌심교구장', model: '', vendor: '', price: 189000, qty: '', usage: '', current: '', lostDate: '', manager: '' },
  { id: 10, date: '2014-08-08', name: '냉장고구입', model: '', vendor: '', price: 900000, qty: '', usage: '', current: '', lostDate: '', manager: '' },
  { id: 11, date: '2014-08-29', name: '보안도어락', model: '', vendor: '', price: 200000, qty: '', usage: '', current: '', lostDate: '', manager: '' },
  { id: 12, date: '2014-09-03', name: '모니터구입외', model: '', vendor: '', price: 175000, qty: '', usage: '', current: '', lostDate: '', manager: '' },
  { id: 13, date: '2014-09-06', name: '책장', model: '', vendor: '', price: 150000, qty: '', usage: '', current: '', lostDate: '', manager: '' },
  { id: 14, date: '2014-10-07', name: '청소기구매', model: '', vendor: '', price: 131900, qty: '', usage: '', current: '', lostDate: '', manager: '' },
  { id: 15, date: '2014-10-07', name: '청소기구매', model: '', vendor: '', price: 131900, qty: '', usage: '', current: '', lostDate: '', manager: '' },
  { id: 16, date: '2014-11-01', name: '업소용정소기', model: '', vendor: '', price: 210000, qty: '', usage: '', current: '', lostDate: '', manager: '' },
]

export default function SuppliesStatusPage() {
  const [searchField, setSearchField] = useState('물품명')
  const [search, setSearch] = useState('')
  const [showRegister, setShowRegister] = useState(false)

  return (
    <div className="p-3 space-y-3">
      <div className="bg-white rounded-xl border border-teal-400/30 shadow-sm">
        <div className="px-4 py-3 border-b border-teal-400/20">
          <span className="text-sm font-bold text-slate-700">물품관리</span>
        </div>
        <div className="px-4 py-3 flex items-center gap-2 flex-wrap">
          <select value={searchField} onChange={e => setSearchField(e.target.value)} className={`${inputCls} w-20`}>
            <option>물품명</option><option>구입처</option><option>관리자</option>
          </select>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} className={`${inputCls} w-40`} />
          <button className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded">조회</button>
          <button onClick={() => setShowRegister(true)} className="px-4 py-1.5 text-xs font-bold text-white bg-slate-600 hover:bg-slate-700 rounded">비품등록</button>
          <div className="ml-auto flex items-center gap-1.5">
            <button onClick={() => window.print()} className="flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 rounded text-xs text-slate-600">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2z" /></svg>출력</button>
            <button className="flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-green-50 border border-green-400 rounded text-xs text-green-600">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>엑셀</button>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-[11px]">
          <thead><tr className="bg-slate-200 border-b border-slate-300">
            <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-300 w-[40px]">번호</th>
            <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-300 w-[80px]">구입일</th>
            <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-300">물품명</th>
            <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-300">모델명</th>
            <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-300">구입처</th>
            <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-300 w-[80px]">가격</th>
            <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-300 w-[60px]">구입수량</th>
            <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-300">사용처</th>
            <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-300">현재량</th>
            <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-300">망실파손년월일</th>
            <th className="px-2 py-2 text-center font-bold text-slate-600">관리자</th>
          </tr></thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id} className="border-b border-slate-100 hover:bg-blue-50/40">
                <td className="px-2 py-1.5 text-center text-slate-500 border-r border-slate-100">{item.id}</td>
                <td className="px-2 py-1.5 text-center text-slate-500 border-r border-slate-100">{item.date}</td>
                <td className="px-2 py-1.5 text-slate-700 border-r border-slate-100">{item.name}</td>
                <td className="px-2 py-1.5 text-slate-500 border-r border-slate-100">{item.model}</td>
                <td className="px-2 py-1.5 text-slate-500 border-r border-slate-100">{item.vendor}</td>
                <td className="px-2 py-1.5 text-right text-slate-700 border-r border-slate-100">{fmt(item.price)}</td>
                <td className="px-2 py-1.5 text-center text-slate-500 border-r border-slate-100">{item.qty}</td>
                <td className="px-2 py-1.5 text-slate-500 border-r border-slate-100">{item.usage}</td>
                <td className="px-2 py-1.5 text-slate-500 border-r border-slate-100">{item.current}</td>
                <td className="px-2 py-1.5 text-center text-slate-500 border-r border-slate-100">{item.lostDate}</td>
                <td className="px-2 py-1.5 text-slate-500">{item.manager}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showRegister && (
        <div className="fixed inset-0 bg-black/40 z-[9999] flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-[750px] border border-slate-300" onClick={e => e.stopPropagation()}>
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <span className="text-sm font-bold text-slate-700">비품등록</span>
              <button onClick={() => setShowRegister(false)} className="text-slate-400 hover:text-slate-600 text-lg">×</button>
            </div>
            <div className="p-4">
              <table className="w-full text-[12px] border-collapse">
                <colgroup><col style={{width:'15%'}}/><col style={{width:'35%'}}/><col style={{width:'15%'}}/><col style={{width:'35%'}}/></colgroup>
                <tbody>
                  <tr className="border-b border-slate-100">
                    <td className="font-medium text-slate-700 bg-slate-100 px-3 py-2.5 border-r border-slate-200 text-center">물품명</td>
                    <td className="px-3 py-2.5"><input type="text" className={`${inputCls} w-full`} /></td>
                    <td className="font-medium text-slate-700 bg-slate-100 px-3 py-2.5 border-r border-slate-200 text-center">모델명</td>
                    <td className="px-3 py-2.5"><input type="text" className={`${inputCls} w-full`} /></td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="font-medium text-slate-700 bg-slate-100 px-3 py-2.5 border-r border-slate-200 text-center">구입년월일</td>
                    <td className="px-3 py-2.5"><input type="date" className={inputCls} /></td>
                    <td className="font-medium text-slate-700 bg-slate-100 px-3 py-2.5 border-r border-slate-200 text-center">구입처</td>
                    <td className="px-3 py-2.5"><input type="text" className={`${inputCls} w-full`} /></td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="font-medium text-slate-700 bg-slate-100 px-3 py-2.5 border-r border-slate-200 text-center">가격</td>
                    <td className="px-3 py-2.5"><input type="number" className={`${inputCls} w-full text-right`} /></td>
                    <td className="font-medium text-slate-700 bg-slate-100 px-3 py-2.5 border-r border-slate-200 text-center">구입수량</td>
                    <td className="px-3 py-2.5"><input type="number" className={`${inputCls} w-full text-right`} /></td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="font-medium text-slate-700 bg-slate-100 px-3 py-2.5 border-r border-slate-200 text-center">사용처</td>
                    <td colSpan={3} className="px-3 py-2.5"><input type="text" className={`${inputCls} w-full`} /></td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="font-medium text-slate-700 bg-slate-100 px-3 py-2.5 border-r border-slate-200 text-center">망실파손년월일</td>
                    <td className="px-3 py-2.5"><input type="date" className={inputCls} /></td>
                    <td className="font-medium text-slate-700 bg-slate-100 px-3 py-2.5 border-r border-slate-200 text-center">현재수량</td>
                    <td className="px-3 py-2.5"><input type="number" className={`${inputCls} w-full text-right`} /></td>
                  </tr>
                  <tr>
                    <td className="font-medium text-slate-700 bg-slate-100 px-3 py-2.5 border-r border-slate-200 text-center">관리자</td>
                    <td className="px-3 py-2.5"><input type="text" className={`${inputCls} w-full`} /></td>
                    <td colSpan={2}></td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t border-slate-200 flex justify-end gap-2">
              <button className="px-6 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded">등록</button>
              <button onClick={() => setShowRegister(false)} className="px-6 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded">취소</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
