'use client'

import React, { useState } from 'react'

interface TransferRecord {
  id: number
  fromAccount: string
  toAccount: string
  year: number
  date: string
  budgetAmount: number
  transferAmount: number
  currentAmount: number
  note: string
  active: boolean
}

const EXPENSE_ACCOUNTS = [
  { code: 'E111', name: '원장급여', amount: 78000000 },
  { code: 'E112', name: '원장수당', amount: 600000 },
  { code: 'E121', name: '보육교직원급여', amount: 476237280 },
  { code: 'E122', name: '보육교직원수당', amount: 16800000 },
  { code: 'E131', name: '기타 인건비', amount: 5992800 },
  { code: 'E141', name: '법정부담금', amount: 57488377 },
  { code: 'E142', name: '퇴직금 및 퇴직적립금', amount: 39686440 },
  { code: 'E211', name: '수용비 및 수수료', amount: 67260000 },
  { code: 'E212', name: '공공요금 및 제세공과금', amount: 22600000 },
  { code: 'E215', name: '차량비', amount: 10200000 },
  { code: 'E216', name: '복리후생비', amount: 10110000 },
  { code: 'E217', name: '기타 운영비', amount: 21600000 },
  { code: 'E221', name: '업무추진비', amount: 4200000 },
  { code: 'E222', name: '직책급', amount: 12000000 },
  { code: 'E223', name: '회의비', amount: 1000000 },
  { code: 'E311', name: '교직원연수·연구비', amount: 6000000 },
  { code: 'E312', name: '교재·교구 구입비', amount: 40120000 },
  { code: 'E313', name: '행사비', amount: 9840000 },
  { code: 'E314', name: '영유아복리비', amount: 1000000 },
  { code: 'E315', name: '급식·간식재료비', amount: 103656000 },
  { code: 'E411', name: '특별활동비지출', amount: 53328000 },
  { code: 'E421', name: '기타 필요경비 지출', amount: 85160000 },
  { code: 'E611', name: '단기 차입금 상환', amount: 10000000 },
  { code: 'E621', name: '보조금 반환금', amount: 300000 },
  { code: 'E622', name: '보호자 반환금', amount: 300000 },
  { code: 'E711', name: '시설비', amount: 3000000 },
  { code: 'E712', name: '시설장비 유지비', amount: 6000000 },
  { code: 'E721', name: '자산취득비', amount: 12000000 },
  { code: 'E811', name: '과년도 지출', amount: 122192144 },
]

const fmt = (n: number) => n.toLocaleString('ko-KR')

export default function BudgetTransferPage() {
  const [year, setYear] = useState(2026)
  const [records, setRecords] = useState<TransferRecord[]>([])
  const [showPopup, setShowPopup] = useState(false)

  // 신규 작성 폼 상태
  const [formFrom, setFormFrom] = useState('')
  const [formTo, setFormTo] = useState('')
  const [formDate, setFormDate] = useState('')
  const [formAmount, setFormAmount] = useState('')
  const [formNote, setFormNote] = useState('')
  const [formActive, setFormActive] = useState(true)
  const [editId, setEditId] = useState<number | null>(null)

  const getAccount = (code: string) => EXPENSE_ACCOUNTS.find(a => a.code === code)

  const getCurrentAmount = (code: string) => {
    const account = getAccount(code)
    if (!account) return 0
    let amount = account.amount
    // 전용으로 나간 금액 차감, 들어온 금액 추가
    records.filter(r => r.active).forEach(r => {
      const from = EXPENSE_ACCOUNTS.find(a => `${a.name} ( ${fmt(a.amount)} 원 )` === r.fromAccount || a.code === r.fromAccount)
      const to = EXPENSE_ACCOUNTS.find(a => `${a.name} ( ${fmt(a.amount)} 원 )` === r.toAccount || a.code === r.toAccount)
      if (from?.code === code) amount -= r.transferAmount
      if (to?.code === code) amount += r.transferAmount
    })
    return amount
  }

  const handleSave = () => {
    if (!formFrom || !formTo || !formDate || !formAmount) return
    const fromAcc = getAccount(formFrom)
    const toAcc = getAccount(formTo)
    if (!fromAcc || !toAcc) return

    if (editId !== null) {
      setRecords(prev => prev.map(r => r.id === editId ? {
        ...r,
        fromAccount: `${fromAcc.name} ( ${fmt(fromAcc.amount)} 원 )`,
        toAccount: `${toAcc.name} ( ${fmt(toAcc.amount)} 원 )`,
        year,
        date: formDate,
        budgetAmount: fromAcc.amount,
        transferAmount: parseInt(formAmount.replace(/,/g, '')) || 0,
        currentAmount: getCurrentAmount(fromAcc.code),
        note: formNote,
        active: formActive,
      } : r))
    } else {
      const newRecord: TransferRecord = {
        id: Date.now(),
        fromAccount: `${fromAcc.name} ( ${fmt(fromAcc.amount)} 원 )`,
        toAccount: `${toAcc.name} ( ${fmt(toAcc.amount)} 원 )`,
        year,
        date: formDate,
        budgetAmount: fromAcc.amount,
        transferAmount: parseInt(formAmount.replace(/,/g, '')) || 0,
        currentAmount: getCurrentAmount(fromAcc.code),
        note: formNote,
        active: formActive,
      }
      setRecords(prev => [...prev, newRecord])
    }

    resetForm()
    setShowPopup(false)
  }

  const resetForm = () => {
    setFormFrom('')
    setFormTo('')
    setFormDate('')
    setFormAmount('')
    setFormNote('')
    setFormActive(true)
    setEditId(null)
  }

  const handleEdit = (record: TransferRecord) => {
    const fromAcc = EXPENSE_ACCOUNTS.find(a => record.fromAccount.includes(a.name))
    const toAcc = EXPENSE_ACCOUNTS.find(a => record.toAccount.includes(a.name))
    if (fromAcc) setFormFrom(fromAcc.code)
    if (toAcc) setFormTo(toAcc.code)
    setFormDate(record.date)
    setFormAmount(record.transferAmount.toString())
    setFormNote(record.note)
    setFormActive(record.active)
    setEditId(record.id)
    setShowPopup(true)
  }

  const handleDelete = (id: number) => {
    setRecords(prev => prev.filter(r => r.id !== id))
  }

  return (
    <div className="p-3 space-y-3">
      {/* 상단 조건 */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-bold text-slate-700">회계연도</span>
        <select value={year} onChange={e => setYear(Number(e.target.value))} className="border border-slate-300 rounded px-2 py-1.5 text-xs">
          <option value={2026}>2026년</option>
          <option value={2025}>2025년</option>
        </select>
        <button className="px-4 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors">세출결산서 기초자료</button>
        <button onClick={() => { resetForm(); setShowPopup(true) }} className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors">신규 작성</button>
        <button className="flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 rounded text-xs text-slate-600 transition-colors" title="인쇄하기">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2z" /></svg>
          인쇄
        </button>
      </div>

      {/* 테이블 */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="bg-teal-50 border-b border-slate-300">
              <th className="px-2 py-2.5 text-center font-bold text-slate-600 border-r border-slate-200">번호</th>
              <th className="px-2 py-2.5 text-center font-bold text-slate-600 border-r border-slate-200">과목</th>
              <th className="px-2 py-2.5 text-center font-bold text-slate-600 border-r border-slate-200">전용과목</th>
              <th className="px-2 py-2.5 text-center font-bold text-slate-600 border-r border-slate-200">회계년도</th>
              <th className="px-2 py-2.5 text-center font-bold text-slate-600 border-r border-slate-200">전용년월일</th>
              <th className="px-2 py-2.5 text-center font-bold text-slate-600 border-r border-slate-200">예산액</th>
              <th className="px-2 py-2.5 text-center font-bold text-slate-600 border-r border-slate-200">전용액</th>
              <th className="px-2 py-2.5 text-center font-bold text-slate-600 border-r border-slate-200">현액</th>
              <th className="px-2 py-2.5 text-center font-bold text-slate-600">비고</th>
            </tr>
          </thead>
          <tbody>
            {records.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-8 text-slate-400 text-xs">등록된 내용이 없습니다.</td>
              </tr>
            ) : (
              records.map((record, idx) => (
                <tr key={record.id} className="border-b border-slate-100 hover:bg-blue-50/30 transition-colors cursor-pointer" onClick={() => handleEdit(record)}>
                  <td className="px-2 py-2 text-center text-slate-600 border-r border-slate-100">{idx + 1}</td>
                  <td className="px-2 py-2 text-slate-700 border-r border-slate-100">{record.fromAccount}</td>
                  <td className="px-2 py-2 text-slate-700 border-r border-slate-100">{record.toAccount}</td>
                  <td className="px-2 py-2 text-center text-slate-600 border-r border-slate-100">{record.year}</td>
                  <td className="px-2 py-2 text-center text-slate-600 border-r border-slate-100">{record.date}</td>
                  <td className="px-2 py-2 text-right text-slate-700 border-r border-slate-100">{fmt(record.budgetAmount)}</td>
                  <td className="px-2 py-2 text-right text-blue-700 font-bold border-r border-slate-100">{fmt(record.transferAmount)}</td>
                  <td className="px-2 py-2 text-right text-slate-700 border-r border-slate-100">{fmt(record.budgetAmount - record.transferAmount)}</td>
                  <td className="px-2 py-2 text-slate-500 flex items-center justify-between">
                    <span>{record.note}</span>
                    <div className="flex items-center gap-1">
                      {!record.active && <span className="text-[9px] font-bold text-red-500 bg-red-50 px-1 py-0.5 rounded">비활성</span>}
                      <button onClick={e => { e.stopPropagation(); handleDelete(record.id) }} className="text-[9px] font-bold text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-1.5 py-0.5 rounded transition-colors">삭제</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 참고/비활성 탭 */}
      <div className="flex items-center gap-0.5">
        <span className="px-3 py-1.5 text-[10px] font-bold text-slate-600 bg-slate-100 border border-slate-200 rounded-t">참고</span>
        <span className="px-3 py-1.5 text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 rounded-t">* 비활성처리 시 예산서 미반영</span>
      </div>

      {/* 신규 작성 팝업 */}
      {showPopup && (
        <div className="fixed inset-0 bg-black/40 z-[9999] flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-2xl w-[680px] overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
              <p className="text-sm font-bold text-slate-800">과목전용 조서 {editId ? '수정' : '신규등록'}</p>
              <button onClick={() => { setShowPopup(false); resetForm() }} className="text-slate-400 hover:text-slate-600 text-lg">×</button>
            </div>
            <div className="px-5 py-5 space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-600 w-20 text-right">회계년도</span>
                <select value={year} onChange={e => setYear(Number(e.target.value))} className="border border-slate-300 rounded px-2 py-1.5 text-xs">
                  <option value={2026}>2026</option>
                  <option value={2025}>2025</option>
                </select>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-600 w-20 text-right">전용일자</span>
                <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} className="border border-teal-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-blue-400" />
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-600 w-20 text-right">과목</span>
                <select value={formFrom} onChange={e => setFormFrom(e.target.value)} className="border border-slate-300 rounded px-2 py-1.5 text-xs flex-1">
                  <option value="">선택</option>
                  {EXPENSE_ACCOUNTS.filter(a => a.amount > 0).map(a => (
                    <option key={a.code} value={a.code}>{a.name} ( {fmt(a.amount)} 원 )</option>
                  ))}
                </select>
                <span className="text-xs font-bold text-slate-500">전용과목</span>
                <select value={formTo} onChange={e => setFormTo(e.target.value)} className="border border-slate-300 rounded px-2 py-1.5 text-xs flex-1">
                  <option value="">선택</option>
                  {EXPENSE_ACCOUNTS.filter(a => a.amount > 0).map(a => (
                    <option key={a.code} value={a.code}>{a.name} ( {fmt(a.amount)} 원 )</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-600 w-20 text-right">전용액</span>
                <input type="text" value={formAmount} onChange={e => setFormAmount(e.target.value.replace(/[^0-9]/g, ''))} placeholder="금액 입력" className="border border-teal-300 rounded px-2 py-1.5 text-xs w-32 text-right focus:outline-none focus:border-blue-400" />
                <span className="text-[10px] text-slate-400">원</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-600 w-20 text-right">사유</span>
                <input type="text" value={formNote} onChange={e => setFormNote(e.target.value)} placeholder="" className="border border-teal-300 rounded px-2 py-1.5 text-xs flex-1 focus:outline-none focus:border-blue-400" />
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-600 w-20 text-right">상태</span>
                <label className="flex items-center gap-1 text-xs text-slate-600 cursor-pointer">
                  <input type="radio" name="status" checked={formActive} onChange={() => setFormActive(true)} className="w-3 h-3 accent-blue-600" />
                  활성
                </label>
                <label className="flex items-center gap-1 text-xs text-slate-600 cursor-pointer">
                  <input type="radio" name="status" checked={!formActive} onChange={() => setFormActive(false)} className="w-3 h-3 accent-blue-600" />
                  비활성
                </label>
              </div>
              <div className="text-[10px] text-slate-400 space-y-0.5 pt-2 border-t border-slate-100">
                <p>* 정확한 내용을 입력하신 후 저장을 클릭하세요.</p>
                <p className="ml-2">전용액이 등록 되어야만 저장됩니다.</p>
                <p className="text-red-500 font-bold">* 과목별 금액은 현재월 기준으로 적용되었습니다.</p>
                <p className="ml-2 text-red-500">전용일자에 따라서 달라질 수 있습니다.</p>
              </div>
            </div>
            <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-center">
              <button onClick={handleSave} className="px-8 py-2 text-xs font-bold text-white bg-slate-700 hover:bg-slate-800 rounded transition-colors">저 장</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
