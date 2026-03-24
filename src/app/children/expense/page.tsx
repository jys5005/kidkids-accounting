'use client'
import React, { useState } from 'react'
import DraggableModal from '@/components/DraggableModal'
const fmt = (n: number) => n.toLocaleString('ko-KR')
const inputCls = "border border-amber-300 rounded px-2 py-1 text-[11px] text-right focus:outline-none focus:border-amber-500 w-[70px]"

const sampleChildren = [
  { id: 1, name: '곽이안', className: '예쁜반21세아반', residentNo: '231028-3' },
  { id: 2, name: '김다솜', className: '수리반12세아반', residentNo: '221110-4' },
  { id: 3, name: '김도하', className: '초롱반1연령혼합반(1,2세)', residentNo: '221115-4' },
  { id: 4, name: '김준민', className: '초롱반21세아반', residentNo: '230903-3' },
  { id: 5, name: '민이랑', className: '예쁜반21세아반', residentNo: '240103-4' },
  { id: 6, name: '정해인', className: '예쁜반11세아반', residentNo: '230408-3' },
  { id: 7, name: '조연서', className: '수리반12세아반', residentNo: '221018-4' },
  { id: 8, name: '장시윤', className: '아침이슬.0세아반', residentNo: '240826-3' },
  { id: 9, name: '조아란', className: '옹달샘연령혼합반(1,2세)', residentNo: '190223-4' },
]

type Step = 'select' | 'confirm' | 'edit'

export default function ExpensePage() {
  const now = new Date()
  const [yearMonth, setYearMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)
  const [step, setStep] = useState<Step>('select')
  const [checked, setChecked] = useState<Set<number>>(new Set())
  const [splitType, setSplitType] = useState<'equal' | 'custom'>('equal')
  const [splitAmount, setSplitAmount] = useState(100000)
  const [searchName, setSearchName] = useState('')
  const [filterClass, setFilterClass] = useState('선택')
  const [showConfirm, setShowConfirm] = useState(false)

  // 분리적용 편집 데이터
  const [editRows, setEditRows] = useState<{ id: number; name: string; className: string; etcFee: number; entrance: number; fieldTrip: number; vehicle: number; event: number; mealFee: number; special: number; specialAct: number; applyMonth: string; amount: number }[]>([])

  const classes = [...new Set(sampleChildren.map(c => c.className))]
  const filtered = sampleChildren.filter(c =>
    (filterClass === '선택' || c.className === filterClass) &&
    (searchName === '' || c.name.includes(searchName))
  )

  const toggleCheck = (id: number) => {
    const next = new Set(checked)
    next.has(id) ? next.delete(id) : next.add(id)
    setChecked(next)
  }
  const toggleAll = () => {
    if (checked.size === filtered.length) setChecked(new Set())
    else setChecked(new Set(filtered.map(c => c.id)))
  }

  const handleNext = () => {
    if (checked.size === 0) { alert('원아를 선택해주세요.'); return }
    setShowConfirm(true)
  }

  const handleConfirm = () => {
    setShowConfirm(false)
    const selected = sampleChildren.filter(c => checked.has(c.id))
    const perChild = splitType === 'equal' ? Math.floor(splitAmount / selected.length) : 0
    setEditRows(selected.map(c => ({
      id: c.id, name: c.name, className: c.className,
      etcFee: 0, entrance: 0, fieldTrip: 0, vehicle: 0, event: 0, mealFee: 0, special: 0, specialAct: 0,
      applyMonth: yearMonth, amount: perChild,
    })))
    setStep('edit')
  }

  const updateEditRow = (id: number, key: string, val: number | string) => {
    setEditRows(prev => prev.map(r => r.id === id ? { ...r, [key]: val } : r))
  }

  const totalSplit = editRows.reduce((s, r) => s + r.amount, 0)
  const diff = splitAmount - totalSplit

  // Step: 원아 선택
  if (step === 'select') {
    return (
      <div className="p-3 space-y-3">
        <div className="bg-white rounded-xl border border-teal-400/30 shadow-sm">
          <div className="px-4 py-3 border-b border-teal-400/20">
            <span className="text-sm font-bold text-slate-700">기타필요경비 분리적용</span>
          </div>
        </div>

        {/* 안내 */}
        <div className="bg-yellow-50 border border-yellow-300 rounded-lg px-4 py-3 text-[12px] text-yellow-800 space-y-1">
          <p className="font-bold">[참조] 분리적용할 원아를 선택하신 후 다음을 클릭하세요.</p>
          <p className="ml-4">분리적용할 경우 이름앞에 체크하신 후 다음을 클릭하세요.</p>
          <p className="text-blue-700 font-bold">[분리할 수입내역 적요] : {yearMonth.replace('-', '년 ')}월 입소로 정용</p>
          <p className="text-red-600 font-bold">[분리할 금액] {fmt(splitAmount)}원</p>
        </div>

        {/* 옵션 */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <span className="text-[12px] font-bold text-slate-700">원아검색</span>
            <label className="text-[11px]"><input type="radio" name="status" defaultChecked className="mr-0.5" />현원 기준</label>
            <label className="text-[11px]"><input type="radio" name="status" className="mr-0.5" />퇴소일 무시</label>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[12px] font-bold text-slate-700">반선택</span>
            <select value={filterClass} onChange={e => setFilterClass(e.target.value)} className="border border-teal-300 rounded px-2 py-1 text-[12px]">
              <option>선택</option>
              {classes.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[12px] font-bold text-slate-700">원아명/반</span>
            <input value={searchName} onChange={e => setSearchName(e.target.value)} className="border border-teal-300 rounded px-2 py-1 text-[12px] w-28" />
            <button className="px-3 py-1 text-[11px] font-bold text-white bg-blue-600 rounded">검색</button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <label className="text-[12px]"><input type="radio" name="split" checked={splitType === 'equal'} onChange={() => setSplitType('equal')} className="mr-1" />균등분할</label>
          <label className="text-[12px]"><input type="radio" name="split" checked={splitType === 'custom'} onChange={() => setSplitType('custom')} className="mr-1" />개별금액분할</label>
          <div className="flex items-center gap-1">
            <span className="text-[12px] font-bold text-slate-700">분리할 금액:</span>
            <input type="text" value={fmt(splitAmount)} onChange={e => setSplitAmount(Number(e.target.value.replace(/[^0-9]/g, '')) || 0)} className="border border-teal-300 rounded px-2 py-1 text-[12px] w-32 text-right" />
            <span className="text-[12px] text-slate-500">원</span>
          </div>
        </div>

        {/* 원아명 색상 안내 */}
        <p className="text-[10px]">
          * 원아명 색상 : <span className="text-red-500">특별활동참여 안함</span>, <span className="text-green-600">기타필요경비 참여 안함</span>, <span className="text-blue-600">특별활동참여 + 기타필요경비 참여 안함</span>, 해당사항없음
        </p>

        {/* 다음 버튼 */}
        <div className="flex justify-center">
          <button onClick={handleNext} className="px-10 py-2 text-[13px] font-bold text-white bg-teal-600 rounded hover:bg-teal-700">다 음</button>
        </div>

        {/* 테이블 */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
          <table className="w-full text-[11px] border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-300">
                <th className="px-1 py-2 border-r border-slate-200 w-[30px]"><input type="checkbox" checked={checked.size === filtered.length && filtered.length > 0} onChange={toggleAll} /></th>
                <th className="px-2 py-2 font-bold text-slate-600 border-r border-slate-200">이름</th>
                <th className="px-2 py-2 font-bold text-slate-600 border-r border-slate-200">반</th>
                <th className="px-2 py-2 font-bold text-slate-600 border-r border-slate-200">퇴소일</th>
                <th className="px-2 py-2 font-bold text-slate-600 border-r border-slate-200">주민번호</th>
                <th className="px-2 py-2 font-bold text-slate-600 border-r border-slate-200">기타<br/>필요경비</th>
                <th className="px-2 py-2 font-bold text-slate-600 border-r border-slate-200">입학<br/>준비금</th>
                <th className="px-2 py-2 font-bold text-slate-600 border-r border-slate-200">현장<br/>학습비</th>
                <th className="px-2 py-2 font-bold text-slate-600 border-r border-slate-200">차량<br/>운행비</th>
                <th className="px-2 py-2 font-bold text-slate-600 border-r border-slate-200">행사비</th>
                <th className="px-2 py-2 font-bold text-slate-600 border-r border-slate-200">조석식비</th>
                <th className="px-2 py-2 font-bold text-slate-600 border-r border-slate-200">특성화비</th>
                <th className="px-2 py-2 font-bold text-slate-600 border-r border-slate-200">특별<br/>활동비</th>
                <th className="px-2 py-2 font-bold text-slate-600 border-r border-slate-200">적용월<br/>(등록시적용)</th>
                <th className="px-2 py-2 font-bold text-slate-600">단일<br/>적용</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} className="border-b border-slate-100 hover:bg-blue-50/30">
                  <td className="px-1 py-1.5 text-center border-r border-slate-100"><input type="checkbox" checked={checked.has(c.id)} onChange={() => toggleCheck(c.id)} /></td>
                  <td className="px-2 py-1.5 border-r border-slate-100 whitespace-nowrap">{c.name}</td>
                  <td className="px-2 py-1.5 border-r border-slate-100 text-[10px]">{c.className}</td>
                  <td className="px-2 py-1.5 text-center text-slate-400 border-r border-slate-100">-</td>
                  <td className="px-2 py-1.5 text-center border-r border-slate-100">{c.residentNo}</td>
                  <td className="px-2 py-1.5 text-center border-r border-slate-100">0</td>
                  <td className="px-2 py-1.5 text-center border-r border-slate-100 text-green-600">0</td>
                  <td className="px-2 py-1.5 text-center border-r border-slate-100 text-green-600">0</td>
                  <td className="px-2 py-1.5 text-center border-r border-slate-100 text-green-600">0</td>
                  <td className="px-2 py-1.5 text-center border-r border-slate-100 text-green-600">0</td>
                  <td className="px-2 py-1.5 text-center border-r border-slate-100">0</td>
                  <td className="px-2 py-1.5 text-center border-r border-slate-100">0</td>
                  <td className="px-2 py-1.5 text-center border-r border-slate-100">0</td>
                  <td className="px-2 py-1.5 text-center border-r border-slate-100">
                    <select className="border border-slate-200 rounded px-1 py-0.5 text-[10px]">
                      <option>{yearMonth}</option>
                    </select>
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <button className="text-[10px] font-bold text-white bg-blue-600 px-2 py-0.5 rounded">적용</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 확인 팝업 */}
        {showConfirm && (
          <DraggableModal onClose={() => setShowConfirm(false)} title="확인" className="w-[400px]">
            <div className="p-6">
              <p className="text-[14px] text-slate-700 mb-2">선택된 원아를 기준으로 분할 관리됩니다.</p>
              <p className="text-[13px] text-slate-600 mb-6">계속하시려면 확인을 클릭하세요</p>
              <div className="flex items-center justify-center gap-3">
                <button onClick={handleConfirm} className="px-8 py-2 text-[13px] font-bold text-white bg-slate-800 rounded hover:bg-slate-900">확인</button>
                <button onClick={() => setShowConfirm(false)} className="px-8 py-2 text-[13px] font-bold text-slate-600 bg-slate-200 rounded hover:bg-slate-300">취소</button>
              </div>
            </div>
          </DraggableModal>
        )}
      </div>
    )
  }

  // Step: 분리적용 편집
  return (
    <div className="p-3 space-y-3">
      <div className="bg-white rounded-xl border border-teal-400/30 shadow-sm">
        <div className="px-4 py-3 border-b border-teal-400/20">
          <span className="text-sm font-bold text-slate-700">기타필요경비 분리적용</span>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-300 rounded-lg px-4 py-3 text-[12px] text-yellow-800 space-y-1">
        <p className="font-bold">[참조] 분리적용할 원아금액을 확인하신 후 저장을 클릭하세요.</p>
        <p className="text-blue-700 font-bold">[분리할 수입내역 적요] : {yearMonth.replace('-', '년 ')}월 입소로 정용</p>
        <p className="text-red-600 font-bold">[분리할 금액] {fmt(splitAmount)}원을 {splitType === 'equal' ? '균등분할' : '개별금액분할'}로 처리합니다.</p>
      </div>

      <div className="flex justify-center gap-3">
        <button onClick={() => setStep('select')} className="px-8 py-2 text-[12px] font-bold text-slate-600 bg-slate-200 rounded hover:bg-slate-300">뒤로</button>
        <button onClick={() => alert('저장되었습니다.')} className="px-8 py-2 text-[12px] font-bold text-white bg-teal-600 rounded hover:bg-teal-700">저 장</button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-[11px] border-collapse min-w-[1000px]">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-300">
              <th className="px-2 py-2 font-bold text-slate-600 border-r border-slate-200">이름</th>
              <th className="px-2 py-2 font-bold text-slate-600 border-r border-slate-200">반</th>
              <th className="px-2 py-2 font-bold text-slate-600 border-r border-slate-200">기타<br/>필요경비</th>
              <th className="px-2 py-2 font-bold text-slate-600 border-r border-slate-200">입학<br/>준비금</th>
              <th className="px-2 py-2 font-bold text-slate-600 border-r border-slate-200">현장<br/>학습비</th>
              <th className="px-2 py-2 font-bold text-slate-600 border-r border-slate-200">차량<br/>운행비</th>
              <th className="px-2 py-2 font-bold text-slate-600 border-r border-slate-200">행사비</th>
              <th className="px-2 py-2 font-bold text-slate-600 border-r border-slate-200">조석식비</th>
              <th className="px-2 py-2 font-bold text-slate-600 border-r border-slate-200">특성화비</th>
              <th className="px-2 py-2 font-bold text-slate-600 border-r border-slate-200">특별<br/>활동비</th>
              <th className="px-2 py-2 font-bold text-slate-600 border-r border-slate-200">적용월<br/>(등록시적용)</th>
              <th className="px-2 py-2 font-bold text-slate-600 border-r border-slate-200">금액</th>
              <th className="px-2 py-2 font-bold text-slate-600">차액적용</th>
            </tr>
          </thead>
          <tbody>
            {editRows.map(r => (
              <tr key={r.id} className="border-b border-slate-100">
                <td className="px-2 py-1.5 border-r border-slate-100 whitespace-nowrap">{r.name}</td>
                <td className="px-2 py-1.5 border-r border-slate-100 text-[10px]">{r.className}</td>
                <td className="px-1 py-1 border-r border-slate-100 text-center">0</td>
                <td className="px-1 py-1 border-r border-slate-100 text-center">0</td>
                <td className="px-1 py-1 border-r border-slate-100 text-center">0</td>
                <td className="px-1 py-1 border-r border-slate-100 text-center">0</td>
                <td className="px-1 py-1 border-r border-slate-100 text-center">0</td>
                <td className="px-1 py-1 border-r border-slate-100 text-center">0</td>
                <td className="px-1 py-1 border-r border-slate-100 text-center">0</td>
                <td className="px-1 py-1 border-r border-slate-100 text-center">0</td>
                <td className="px-1 py-1 border-r border-slate-100 text-center">
                  <select value={r.applyMonth} onChange={e => updateEditRow(r.id, 'applyMonth', e.target.value)} className="border border-slate-200 rounded px-1 py-0.5 text-[10px]">
                    <option>{yearMonth}</option>
                  </select>
                </td>
                <td className="px-1 py-1 border-r border-slate-100">
                  <input value={r.amount} onChange={e => updateEditRow(r.id, 'amount', Number(e.target.value) || 0)} className={inputCls} />
                </td>
                <td className="px-2 py-1.5 text-center">
                  <button className="text-[10px] font-bold text-white bg-orange-500 px-2 py-0.5 rounded">차액적용</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-center gap-3">
        <button onClick={() => setStep('select')} className="px-8 py-2 text-[12px] font-bold text-slate-600 bg-slate-200 rounded hover:bg-slate-300">뒤로</button>
        <button onClick={() => alert('저장되었습니다.')} className="px-8 py-2 text-[12px] font-bold text-white bg-teal-600 rounded hover:bg-teal-700">저 장</button>
      </div>

      <div className="text-right text-[12px] text-slate-600">
        (원금액-분리증금액=차액) : {fmt(splitAmount)} - {fmt(totalSplit)} = {fmt(diff)}
      </div>
    </div>
  )
}
