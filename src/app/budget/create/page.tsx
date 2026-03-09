'use client'

import React, { useState } from 'react'

interface BudgetRow {
  code: string
  name: string
  amount: number
  prevAmount: number
  change: number
  level: number // 0: 대분류, 1: 중분류, 2: 소분류, 3: 세분류
  basis?: string
}

const budgetData: BudgetRow[] = [
  { code: '01', name: '보육료', amount: 186288000, prevAmount: 0, change: 186288000, level: 0 },
  { code: '11', name: '보육료', amount: 186288000, prevAmount: 0, change: 186288000, level: 1 },
  { code: '111', name: '정부지원 보육료', amount: 186288000, prevAmount: 0, change: 186288000, level: 2, basis: '0세 584,000원*6명*12월=42,048,000 / 1세 515,000원*8명*12월=49,440,000 / 2세 426,000원*10명*12월=51,120,000 / 3세 280,000원*6명*12월=20,160,000 / 5세 280,000원*7명*12월=23,520,000' },
  { code: '112', name: '부모부담 보육료', amount: 0, prevAmount: 0, change: 0, level: 2 },

  { code: '02', name: '수익자부담 수입', amount: 0, prevAmount: 0, change: 0, level: 0 },
  { code: '21', name: '선택적 보육활동비', amount: 0, prevAmount: 0, change: 0, level: 1 },
  { code: '211', name: '특별활동비', amount: 0, prevAmount: 0, change: 0, level: 2 },
  { code: '22', name: '기타 필요경비', amount: 0, prevAmount: 0, change: 0, level: 1 },
  { code: '221', name: '기타 필요경비', amount: 0, prevAmount: 0, change: 0, level: 2 },
  { code: '221-111', name: '입학준비금', amount: 0, prevAmount: 0, change: 0, level: 3 },
  { code: '221-112', name: '현장학습비', amount: 0, prevAmount: 0, change: 0, level: 3 },
  { code: '221-113', name: '차량운행비', amount: 0, prevAmount: 0, change: 0, level: 3 },
  { code: '221-121', name: '부모부담행사비', amount: 0, prevAmount: 0, change: 0, level: 3 },
  { code: '221-131', name: '아침.저녁급식비', amount: 0, prevAmount: 0, change: 0, level: 3 },
  { code: '221-141', name: '기타시도특성화비', amount: 0, prevAmount: 0, change: 0, level: 3 },

  { code: '03', name: '보조금 및 지원금', amount: 161791520, prevAmount: 0, change: 161791520, level: 0 },
  { code: '31', name: '인건비 보조금', amount: 103139520, prevAmount: 0, change: 103139520, level: 1 },
  { code: '311', name: '인건비 보조금', amount: 103139520, prevAmount: 0, change: 103139520, level: 2, basis: '보조교사 1,139,000*1명*12월=13,668,000 / 연장교사 1,139,000*1명*12월=13,668,000 / 행복도우미 1,139,000*1명*12월=13,668,000 / 사용자부담금 63,830*2명*12월=1,531,920 / 0세교사 2,479,600*1명*12월=29,755,200 / 1세교사 2,570,700*1명*12월=30,848,400' },
  { code: '32', name: '운영보조금', amount: 58652000, prevAmount: 0, change: 58652000, level: 1 },
  { code: '321', name: '기관보육료', amount: 0, prevAmount: 0, change: 0, level: 2 },
  { code: '322', name: '연장보육료', amount: 4560000, prevAmount: 0, change: 4560000, level: 2, basis: '0세 3,000*3명*20회*12월=2,160,000 / 영아반 2,000*2명*20회*12월=960,000 / 유아반 1,000*6명*20회*12월=1,440,000' },
  { code: '323', name: '공공형 운영비', amount: 0, prevAmount: 0, change: 0, level: 2 },
  { code: '324', name: '그 밖의 지원금', amount: 54092000, prevAmount: 0, change: 54092000, level: 2, basis: '방과후과정비 100,000*2반*12월=2,400,000 / 현장학습비 15,000*37명*12월=6,660,000 / 행사비 100,000*37명*1월=3,700,000 / 기타필요경비 20,000*10명*12월=2,400,000 / 친환경농산물 13,000*37명*12월=5,772,000 / 급간식 10,000*37명*12월=4,440,000 / 교재교구 1,000,000*1회=1,000,000 / 냉난방비 600,000*1회=600,000 / 누리과정 50,000*13명*12월=7,800,000 / 누리추가 70,000*13명*12월=10,920,000 / 영아반 100,000*7반*12월=8,400,000' },
  { code: '33', name: '자본 보조금', amount: 0, prevAmount: 0, change: 0, level: 1 },
  { code: '331', name: '자본보조금', amount: 0, prevAmount: 0, change: 0, level: 2 },

  { code: '04', name: '전입금', amount: 450000000, prevAmount: 0, change: 450000000, level: 0 },
  { code: '41', name: '전입금', amount: 450000000, prevAmount: 0, change: 450000000, level: 1 },
  { code: '411', name: '전입금', amount: 450000000, prevAmount: 0, change: 450000000, level: 2, basis: '전입금 450,000,000' },
  { code: '42', name: '차입금', amount: 0, prevAmount: 0, change: 0, level: 1 },
  { code: '421', name: '단기차입금', amount: 0, prevAmount: 0, change: 0, level: 2 },
  { code: '422', name: '장기차입금', amount: 0, prevAmount: 0, change: 0, level: 2 },

  { code: '05', name: '기부금', amount: 0, prevAmount: 0, change: 0, level: 0 },
  { code: '51', name: '기부금', amount: 0, prevAmount: 0, change: 0, level: 1 },
  { code: '511', name: '지정후원금', amount: 0, prevAmount: 0, change: 0, level: 2 },
  { code: '512', name: '비지정후원금', amount: 0, prevAmount: 0, change: 0, level: 2 },

  { code: '06', name: '적립금', amount: 0, prevAmount: 0, change: 0, level: 0 },
  { code: '61', name: '적립금', amount: 0, prevAmount: 0, change: 0, level: 1 },
  { code: '611', name: '적립금 처분 수입', amount: 0, prevAmount: 0, change: 0, level: 2 },

  { code: '07', name: '과년도 수입', amount: 0, prevAmount: 0, change: 0, level: 0 },
  { code: '71', name: '과년도 수입', amount: 0, prevAmount: 0, change: 0, level: 1 },
  { code: '711', name: '과년도 수입', amount: 0, prevAmount: 0, change: 0, level: 2 },

  { code: '08', name: '잡수입', amount: 1000000, prevAmount: 0, change: 1000000, level: 0 },
  { code: '81', name: '잡수입', amount: 1000000, prevAmount: 0, change: 1000000, level: 1 },
  { code: '811', name: '이자수입', amount: 1000000, prevAmount: 0, change: 1000000, level: 2, basis: '이자수입 1,000,000*1회=1,000,000' },
  { code: '812', name: '그 밖의 잡수입', amount: 0, prevAmount: 0, change: 0, level: 2 },

  { code: '09', name: '전년도 이월액', amount: 20000000, prevAmount: 0, change: 20000000, level: 0 },
  { code: '91', name: '전년도 이월액', amount: 20000000, prevAmount: 0, change: 20000000, level: 1 },
  { code: '911', name: '전년도 이월금', amount: 20000000, prevAmount: 0, change: 20000000, level: 2, basis: '전년도 이월금 20,000,000*1회=20,000,000' },
  { code: '912', name: '전년도 이월사업비', amount: 0, prevAmount: 0, change: 0, level: 2 },
]

interface BasisItem {
  name: string
  unitPrice: number
  qty: number
  months: number
  total: number
}

interface BasisData {
  code: string
  label: string
  prevAmount: number
  items: BasisItem[]
}

const basisDetails: Record<string, BasisData> = {
  '111': {
    code: '111', label: '정부지원 보육료', prevAmount: 0,
    items: [
      { name: '0세 보육료 584,000원 *6명 * 12개월', unitPrice: 42048000, qty: 1, months: 1, total: 42048000 },
      { name: '1세 보육료 515,000원 * 8명 * 12개월', unitPrice: 49440000, qty: 1, months: 1, total: 49440000 },
      { name: '2세 보육료 426,000원 * 10명 * 12개월', unitPrice: 51120000, qty: 1, months: 1, total: 51120000 },
      { name: '3세 보육료 280,000원 * 6명 * 12개월', unitPrice: 20160000, qty: 1, months: 1, total: 20160000 },
      { name: '5세 보육료 280,000원 *7명 * 12개월', unitPrice: 23520000, qty: 1, months: 1, total: 23520000 },
    ],
  },
  '311': {
    code: '311', label: '인건비 보조금', prevAmount: 0,
    items: [
      { name: '보조교사인건비 1,139,000원 * 1명 * 12회', unitPrice: 13668000, qty: 1, months: 1, total: 13668000 },
      { name: '연장교사인건비 1,139,000원 * 1명 * 12개월', unitPrice: 13668000, qty: 1, months: 1, total: 13668000 },
      { name: '행복도우미 1,139,000원 * 1명 * 12개월', unitPrice: 13668000, qty: 1, months: 1, total: 13668000 },
      { name: '사용자부담금 63,830원 * 2명 * 12개월', unitPrice: 1531920, qty: 1, months: 1, total: 1531920 },
      { name: '0세교사인건비 2,479,600원 * 1명 * 12개월', unitPrice: 29755200, qty: 1, months: 1, total: 29755200 },
      { name: '1세교사인건비 2,570,700 * 1명 * 12개월', unitPrice: 30848400, qty: 1, months: 1, total: 30848400 },
    ],
  },
  '322': {
    code: '322', label: '연장보육료', prevAmount: 0,
    items: [
      { name: '0세 연장보육료 3,000원 * 3명 * 20회 * 12개월', unitPrice: 2160000, qty: 1, months: 1, total: 2160000 },
      { name: '영아반 연장보육료 2,000원 * 2명 * 20회 * 12개월', unitPrice: 960000, qty: 1, months: 1, total: 960000 },
      { name: '유아반 연장보육료 1,000원 * 6명 * 20회 * 12개월', unitPrice: 1440000, qty: 1, months: 1, total: 1440000 },
    ],
  },
  '324': {
    code: '324', label: '그 밖의 지원금', prevAmount: 0,
    items: [
      { name: '방과후과정비 100,000원 *2반 * 12개월', unitPrice: 2400000, qty: 1, months: 1, total: 2400000 },
      { name: '현장학습비 15,000원 * 37명 * 12개월', unitPrice: 6660000, qty: 1, months: 1, total: 6660000 },
      { name: '행사비 100,000원 * 37명 * 1개월', unitPrice: 3700000, qty: 1, months: 1, total: 3700000 },
      { name: '기타필요경비 20,000원 * 10명 * 12개월', unitPrice: 2400000, qty: 1, months: 1, total: 2400000 },
      { name: '친환경농산물지원비 13,000원 * 37명 * 12개월', unitPrice: 5772000, qty: 1, months: 1, total: 5772000 },
      { name: '급간식지원금 10,000원 * 37명 * 12개', unitPrice: 4440000, qty: 1, months: 1, total: 4440000 },
      { name: '교재교구비 1,000,000원 * 1명 * 1회', unitPrice: 1000000, qty: 1, months: 1, total: 1000000 },
      { name: '냉난방비 600,000원 * 1명 * 1회', unitPrice: 600000, qty: 1, months: 1, total: 600000 },
      { name: '누리과정지원금 50,000원 * 13명 * 12개월', unitPrice: 7800000, qty: 1, months: 1, total: 7800000 },
      { name: '누리과정추가지원금 70,000원 *13명 * 12개월', unitPrice: 10920000, qty: 1, months: 1, total: 10920000 },
      { name: '영아반지원금 100,000원 *7반 * 12개월', unitPrice: 8400000, qty: 1, months: 1, total: 8400000 },
    ],
  },
  '411': {
    code: '411', label: '전입금', prevAmount: 0,
    items: [
      { name: '전입금 450,000,000', unitPrice: 450000000, qty: 1, months: 1, total: 450000000 },
    ],
  },
  '811': {
    code: '811', label: '이자수입', prevAmount: 0,
    items: [
      { name: '이자수입 1,000,000원 * 1명 * 1회', unitPrice: 1000000, qty: 1, months: 1, total: 1000000 },
    ],
  },
  '911': {
    code: '911', label: '전년도 이월금', prevAmount: 0,
    items: [
      { name: '전년도 이월금 20,000,000원 *1회', unitPrice: 20000000, qty: 1, months: 1, total: 20000000 },
    ],
  },
}

const fmt = (n: number) => n.toLocaleString('ko-KR')

export default function BudgetCreatePage() {
  const [tab, setTab] = useState<'income' | 'expense'>('income')
  const [modalCode, setModalCode] = useState<string | null>(null)

  const totalIncome = 819079520
  const totalExpense = 819079520

  return (
    <div className="space-y-4 max-w-6xl">
      {/* 상단 조건 */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 hover:bg-slate-50/50 transition-colors">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <label className="text-[11px] text-slate-500 block mb-1 font-medium">회계구분</label>
              <select className="px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-700">
                <option>표준재무회계</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] text-slate-500 block mb-1 font-medium">회계연도</label>
              <select className="px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-700">
                <option>2026년</option>
                <option>2025년</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] text-slate-500 block mb-1 font-medium">예산구분</label>
              <div className="flex items-center gap-2">
                <select className="px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-700">
                  <option>본예산</option>
                  <option>추경예산</option>
                </select>
                <button className="px-3 py-2 text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors">추경하기</button>
              </div>
            </div>
          </div>
          <button className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">조회</button>
        </div>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-blue-200 p-4 hover:bg-blue-50/50 transition-colors cursor-pointer">
          <p className="text-[11px] text-blue-500 mb-1">세입예산</p>
          <p className="text-xl font-bold text-blue-700">{fmt(totalIncome)}원</p>
        </div>
        <div className="bg-white rounded-xl border border-red-200 p-4 hover:bg-red-50/50 transition-colors cursor-pointer">
          <p className="text-[11px] text-red-500 mb-1">세출예산</p>
          <p className="text-xl font-bold text-red-600">{fmt(totalExpense)}원</p>
        </div>
        <div className="bg-white rounded-xl border border-emerald-200 p-4 hover:bg-emerald-50/50 transition-colors cursor-pointer">
          <p className="text-[11px] text-emerald-500 mb-1">차액예산</p>
          <p className="text-xl font-bold text-emerald-700">{fmt(totalIncome - totalExpense)}원</p>
        </div>
      </div>

      {/* 탭 + 버튼 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
          <button
            onClick={() => setTab('income')}
            className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${
              tab === 'income' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            세입
          </button>
          <button
            onClick={() => setTab('expense')}
            className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${
              tab === 'expense' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            세출
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-3 py-1.5 text-[11px] font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
            예산서 출력
          </button>
          <button className="px-3 py-1.5 text-[11px] font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
            계정과목
          </button>
          <span className="text-[11px] text-slate-400 ml-1">원단위</span>
        </div>
      </div>

      {/* 예산 테이블 */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
        <div className="overflow-x-auto">
          <table className="w-full text-xs table-fixed">
            <colgroup>
              <col className="w-[280px]" />
              <col className="w-[140px]" />
              <col className="w-[140px]" />
              <col className="w-[140px]" />
              <col />
            </colgroup>
            <thead>
              <tr className="bg-slate-50">
                <th className="text-left px-4 py-3 font-semibold text-slate-500">계정과목</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-500">예산액</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-500">이전예산액</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-500">증감</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-500">산출기초</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {(tab === 'income' ? budgetData : []).map((row) => {
                const levelStyle = [
                  'bg-sky-200 text-black font-bold',
                  'bg-sky-100/70 font-semibold text-black',
                  'bg-sky-50/40 text-black',
                  'text-black',
                ][row.level]

                const indent = row.level * 16
                const isOpen = modalCode === row.code

                return (
                  <React.Fragment key={row.code}>
                    <tr
                      className={`hover:bg-blue-50/40 transition-colors ${row.level === 0 ? levelStyle : ''}`}
                    >
                      <td className={`px-4 py-2.5 whitespace-nowrap ${row.level === 0 ? '' : levelStyle}`}>
                        <div className="flex items-center gap-2" style={{ paddingLeft: indent }}>
                          <span className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-bold min-w-[18px] ${
                            row.level === 0 ? 'bg-sky-600 text-white' :
                            row.level === 1 ? 'bg-sky-400 text-white' :
                            row.level === 2 ? 'bg-sky-200 text-sky-800' :
                            'bg-slate-200 text-slate-600'
                          }`}>
                            {row.level === 0 ? '관' : row.level === 1 ? '항' : row.level === 2 ? '목' : '세'}
                          </span>
                          <span className={`${row.level <= 1 ? 'font-semibold' : ''}`}>
                            {row.code} {row.name}
                          </span>
                        </div>
                      </td>
                      <td className={`px-4 py-2.5 text-right font-medium truncate ${row.amount > 0 ? 'text-slate-800' : 'text-slate-400'}`}>
                        {fmt(row.amount)}
                      </td>
                      <td className={`px-4 py-2.5 text-right truncate text-slate-400`}>
                        {fmt(row.prevAmount)}
                      </td>
                      <td className={`px-4 py-2.5 text-right font-medium truncate ${row.change > 0 ? 'text-blue-600' : row.change < 0 ? 'text-red-600' : 'text-slate-400'}`}>
                        {fmt(row.change)}
                      </td>
                      <td className="px-4 py-2.5 text-slate-500 max-w-[300px]">
                        {row.basis && (
                          <button
                            onClick={() => setModalCode(isOpen ? null : row.code)}
                            className={`text-[10px] font-medium hover:underline transition-colors ${isOpen ? 'text-red-500 hover:text-red-700' : 'text-blue-500 hover:text-blue-700'}`}
                          >
                            {isOpen ? '접기' : '산출내역 보기'}
                          </button>
                        )}
                      </td>
                    </tr>
                    {/* 인라인 산출기초 패널 */}
                    {isOpen && basisDetails[row.code] && (
                      <tr>
                        <td colSpan={5} className="p-0">
                          <BasisPanel
                            data={basisDetails[row.code]}
                            onClose={() => setModalCode(null)}
                          />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              })}

              {tab === 'expense' && (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-slate-400 text-sm">
                    세출 예산 데이터를 준비중입니다
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function BasisPanel({ data, onClose }: { data: BasisData; onClose: () => void }) {
  const emptyRow: BasisItem = { name: '', unitPrice: 0, qty: 1, months: 1, total: 0 }
  const [rows, setRows] = useState<BasisItem[]>([...data.items])
  const [checked, setChecked] = useState<Set<number>>(new Set())
  const [clipboard, setClipboard] = useState<BasisItem[]>([])

  const grandTotal = rows.reduce((sum, item) => sum + item.total, 0)

  const toggleCheck = (i: number) => {
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  const toggleAll = () => {
    if (checked.size === rows.length) setChecked(new Set())
    else setChecked(new Set(rows.map((_, i) => i)))
  }

  const addRow = () => {
    setRows((prev) => [...prev, { ...emptyRow }])
  }

  const deleteRows = () => {
    if (checked.size === 0) return
    setRows((prev) => prev.filter((_, i) => !checked.has(i)))
    setChecked(new Set())
  }

  const copyRows = () => {
    if (checked.size === 0) return
    const sorted = Array.from(checked).sort((a, b) => a - b)
    setClipboard(sorted.map((i) => ({ ...rows[i] })))
  }

  const pasteRows = () => {
    if (clipboard.length === 0) return
    setRows((prev) => [...prev, ...clipboard.map((r) => ({ ...r }))])
  }

  const updateRow = (i: number, field: keyof BasisItem, value: string) => {
    setRows((prev) => {
      const next = [...prev]
      const row = { ...next[i] }
      if (field === 'name') {
        row.name = value
      } else {
        const num = Number(value.replace(/,/g, '')) || 0
        ;(row[field] as number) = num
        row.total = row.unitPrice * row.qty * row.months
      }
      next[i] = row
      return next
    })
  }

  return (
    <div className="bg-blue-50/30 border-t-2 border-b-2 border-blue-200">
      {/* 헤더 */}
      <div className="px-5 py-3 bg-white/80 flex items-center justify-between border-b border-blue-100">
        <div className="flex items-center gap-4">
          <div>
            <span className="text-[10px] text-slate-400 block">계정과목</span>
            <span className="text-xs font-semibold text-blue-700">[{data.code}] {data.label}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block">이전예산액</span>
            <div className="flex items-center gap-1">
              <input
                type="text"
                defaultValue={fmt(data.prevAmount)}
                className="w-28 px-2 py-1 border border-slate-200 rounded text-xs text-right font-semibold text-slate-700 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
              />
              <span className="text-[10px] text-slate-400">원</span>
            </div>
          </div>
          <span className="text-[11px] text-slate-500">항목 {rows.length}개</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={addRow} className="px-2 py-0.5 text-[10px] font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 transition-colors">행추가</button>
          <button onClick={deleteRows} className={`px-2 py-0.5 text-[10px] font-medium rounded transition-colors ${checked.size > 0 ? 'text-red-600 bg-red-50 border border-red-200 hover:bg-red-100' : 'text-slate-400 bg-slate-50 border border-slate-200 cursor-not-allowed'}`}>행삭제{checked.size > 0 && ` (${checked.size})`}</button>
          <button onClick={copyRows} className={`px-2 py-0.5 text-[10px] font-medium rounded transition-colors ${checked.size > 0 ? 'text-slate-600 bg-white border border-slate-200 hover:bg-slate-50' : 'text-slate-400 bg-slate-50 border border-slate-200 cursor-not-allowed'}`}>복사{checked.size > 0 && ` (${checked.size})`}</button>
          <button onClick={pasteRows} className={`px-2 py-0.5 text-[10px] font-medium rounded transition-colors ${clipboard.length > 0 ? 'text-emerald-600 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100' : 'text-slate-400 bg-slate-50 border border-slate-200 cursor-not-allowed'}`}>붙여넣기{clipboard.length > 0 && ` (${clipboard.length})`}</button>
          <button onClick={onClose} className="ml-2 w-6 h-6 flex items-center justify-center rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* 산출 테이블 */}
      <table className="w-full text-xs table-fixed">
        <colgroup>
          <col className="w-[36px]" />
          <col />
          <col className="w-[120px]" />
          <col className="w-[80px]" />
          <col className="w-[80px]" />
          <col className="w-[70px]" />
          <col className="w-[70px]" />
          <col className="w-[70px]" />
          <col className="w-[120px]" />
        </colgroup>
        <thead>
          <tr className="bg-slate-100/80">
            <th className="text-center px-2 py-2 font-semibold text-slate-500">
              <input type="checkbox" className="rounded border-slate-300" checked={checked.size === rows.length && rows.length > 0} onChange={toggleAll} />
            </th>
            <th className="text-center px-3 py-2 font-semibold text-slate-500">산출기초명</th>
            <th className="text-right px-3 py-2 font-semibold text-slate-500">단가</th>
            <th className="text-center px-3 py-2 font-semibold text-slate-500">수량(명)</th>
            <th className="text-center px-3 py-2 font-semibold text-slate-500">개월(회)</th>
            <th className="text-center px-3 py-2 font-semibold text-slate-500">항목1</th>
            <th className="text-center px-3 py-2 font-semibold text-slate-500">항목2</th>
            <th className="text-center px-3 py-2 font-semibold text-slate-500">항목3</th>
            <th className="text-right px-3 py-2 font-semibold text-slate-500">합계</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-blue-100/50">
          {rows.map((item, i) => (
            <tr key={i} className={`hover:bg-white transition-colors ${checked.has(i) ? 'bg-blue-100/50' : 'bg-white/60'}`}>
              <td className="text-center px-2 py-2">
                <input type="checkbox" className="rounded border-slate-300" checked={checked.has(i)} onChange={() => toggleCheck(i)} />
              </td>
              <td className="px-3 py-2">
                <input
                  type="text"
                  value={item.name}
                  onChange={(e) => updateRow(i, 'name', e.target.value)}
                  className="w-full px-2 py-1 border border-slate-200 rounded text-xs text-center font-medium text-slate-700 focus:ring-1 focus:ring-blue-500 outline-none bg-white"
                />
              </td>
              <td className="px-3 py-2 text-right">
                <input
                  type="text"
                  value={fmt(item.unitPrice)}
                  onChange={(e) => updateRow(i, 'unitPrice', e.target.value)}
                  className="w-full px-2 py-1 border border-slate-200 rounded text-right text-xs focus:ring-1 focus:ring-blue-500 outline-none bg-white"
                />
              </td>
              <td className="px-3 py-2 text-center">
                <div className="flex items-center gap-1 justify-center">
                  <input type="number" value={item.qty} onChange={(e) => updateRow(i, 'qty', e.target.value)} className="w-10 px-1 py-1 border border-slate-200 rounded text-center text-xs focus:ring-1 focus:ring-blue-500 outline-none bg-white" />
                  <span className="text-[10px] text-slate-400">명</span>
                </div>
              </td>
              <td className="px-3 py-2 text-center">
                <div className="flex items-center gap-1 justify-center">
                  <input type="number" value={item.months} onChange={(e) => updateRow(i, 'months', e.target.value)} className="w-10 px-1 py-1 border border-slate-200 rounded text-center text-xs focus:ring-1 focus:ring-blue-500 outline-none bg-white" />
                  <span className="text-[10px] text-slate-400">개월</span>
                </div>
              </td>
              <td className="px-3 py-2 text-center">
                <div className="flex items-center gap-1 justify-center">
                  <input defaultValue="1" className="w-8 px-1 py-1 border border-slate-200 rounded text-center text-xs bg-white" />
                  <span className="text-[10px] text-slate-400">식</span>
                </div>
              </td>
              <td className="px-3 py-2 text-center">
                <div className="flex items-center gap-1 justify-center">
                  <input defaultValue="1" className="w-8 px-1 py-1 border border-slate-200 rounded text-center text-xs bg-white" />
                  <span className="text-[10px] text-slate-400">식</span>
                </div>
              </td>
              <td className="px-3 py-2 text-center">
                <div className="flex items-center gap-1 justify-center">
                  <input defaultValue="1" className="w-8 px-1 py-1 border border-slate-200 rounded text-center text-xs bg-white" />
                  <span className="text-[10px] text-slate-400">식</span>
                </div>
              </td>
              <td className="px-3 py-2 text-right font-semibold text-slate-800 truncate">{fmt(item.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* 합계 + 하단 */}
      <div className="px-5 py-2.5 bg-white/80 border-t border-blue-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button className="px-2.5 py-1 text-[10px] font-medium text-slate-600 bg-white border border-slate-200 rounded hover:bg-slate-50">[목/세목]예시 가져오기</button>
          <button className="px-2.5 py-1 text-[10px] font-medium text-slate-600 bg-white border border-slate-200 rounded hover:bg-slate-50">[보육료/인건비]단가표</button>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500">합계</span>
            <span className="text-sm font-bold text-blue-700">{fmt(grandTotal)}</span>
          </div>
          <button className="px-3 py-1 text-[11px] font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors">저장</button>
        </div>
      </div>
    </div>
  )
}
