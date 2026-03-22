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
    <div className="p-3 space-y-3 max-w-6xl">
      {/* 상단 조건 */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-bold text-slate-700">회계연도</span>
        <select className="border border-slate-300 rounded px-2 py-1.5 text-xs">
          <option>2026년</option>
          <option>2025년</option>
        </select>
        <span className="text-xs font-bold text-slate-700">예산구분</span>
        <select className="border border-slate-300 rounded px-2 py-1.5 text-xs">
          <option>본예산</option>
          <option>추경예산</option>
        </select>
        <button className="px-3 py-1.5 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded hover:bg-amber-100 transition-colors">추경하기</button>
        <button className="px-4 py-1.5 text-xs font-bold text-white bg-[#f5b800] hover:bg-[#d4a000] rounded transition-colors">조회</button>
      </div>

      {/* 요약 */}
      <div className="flex items-center gap-6 px-2">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-blue-600">세입예산</span>
          <span className="text-sm font-bold text-blue-700">{fmt(totalIncome)}원</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-red-600">세출예산</span>
          <span className="text-sm font-bold text-red-600">{fmt(totalExpense)}원</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-emerald-600">차액예산</span>
          <span className="text-sm font-bold text-emerald-700">{fmt(totalIncome - totalExpense)}원</span>
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
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {/* 헤더 */}
        <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-6 text-[11px]">
              <span className="font-bold text-slate-600">목</span>
              <span className="font-bold text-slate-600">전년도결산액</span>
              <span className="font-bold text-slate-600">예산액</span>
            </div>
            <div className="w-px h-4 bg-slate-300" />
            <span className="text-[11px] font-bold text-slate-600">세부항목(항목/내용/합계)</span>
            <span className="text-[11px] text-red-500 font-medium">(정원:96 명)</span>
            <span className="text-[11px] text-slate-500">( [ 2026-02 ] 회계마감잔고117,139,911 원 )</span>
          </div>
        </div>

        {/* 합계 */}
        <div className="px-4 py-2 border-b border-slate-200 flex items-center gap-4">
          <span className="text-xs font-bold text-slate-700 w-[300px]"></span>
          <span className="text-xs font-bold text-slate-800">{fmt(tab === 'income' ? totalIncome : totalExpense)}</span>
          <div className="w-px h-4 bg-slate-200" />
          <button className="px-2.5 py-1 text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 rounded hover:bg-red-100 transition-colors">체크삭제</button>
          <span className="text-xs text-slate-500">{tab === 'income' ? '세입' : '세출'}합계금액: <span className="font-bold text-blue-700">{fmt(tab === 'income' ? totalIncome : totalExpense)}</span>원 , 차이액 <span className="font-bold">0</span> 원</span>
        </div>

        {/* 데이터 */}
        <div className="overflow-x-auto">
          {(tab === 'income' ? budgetData : []).map((row) => {
            if (row.level === 0) return (
              <div key={row.code} className="flex items-center bg-sky-200 border-b border-sky-300 px-3 py-2">
                <span className="text-[10px] font-bold text-white bg-sky-600 px-1.5 py-0.5 rounded mr-2">관</span>
                <span className="text-xs font-bold text-slate-800">{row.code} {row.name}</span>
                <span className="ml-auto text-xs font-bold text-slate-700">{fmt(row.amount)}</span>
              </div>
            )
            if (row.level === 1) return (
              <div key={row.code} className="flex items-center bg-sky-100/70 border-b border-sky-200 px-3 py-1.5">
                <span className="text-[10px] font-bold text-white bg-sky-400 px-1.5 py-0.5 rounded mr-2 ml-4">항</span>
                <span className="text-xs font-semibold text-slate-700">{row.code} {row.name}</span>
                <span className="ml-auto text-xs font-medium text-slate-600">{fmt(row.amount)}</span>
              </div>
            )
            if (row.level === 3) return null
            const basis = basisDetails[row.code]
            return (
              <div key={row.code} className="flex border-b border-slate-100">
                {/* 왼쪽: 목 코드/이름/전년도결산액/예산액 */}
                <div className="w-[120px] flex-shrink-0 border-r border-slate-100 px-3 py-2 flex flex-col justify-center">
                  <span className="text-xs font-bold text-slate-700">{row.code}</span>
                  <span className="text-[11px] text-slate-600">{row.name}</span>
                </div>
                <div className="w-[100px] flex-shrink-0 border-r border-slate-100 px-2 py-2 flex items-center justify-end">
                  <span className="text-xs text-slate-500">{fmt(row.prevAmount)}</span>
                </div>
                <div className="w-[110px] flex-shrink-0 border-r border-slate-100 px-2 py-2 flex items-center justify-end">
                  <input type="text" defaultValue={fmt(row.amount)} className="w-full px-2 py-1 border border-amber-300 rounded text-xs text-right bg-amber-50 focus:outline-none focus:border-blue-400" />
                </div>

                {/* 오른쪽: 세부항목 */}
                <div className="flex-1 divide-y divide-slate-50">
                  {(basis ? basis.items : [{ name: '', unitPrice: 0, qty: 0, months: 0, total: 0 }]).map((item, i) => (
                    <div key={i} className="flex items-center gap-1.5 px-2 py-1.5 hover:bg-slate-50 transition-colors">
                      <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-1 py-0.5 rounded flex-shrink-0">삭제</span>
                      <input type="checkbox" className="w-3 h-3 rounded border-slate-300 flex-shrink-0" />
                      <input type="text" defaultValue={item.name} placeholder="항목명 입력" className="w-40 px-1.5 py-1 border border-slate-200 rounded text-[11px] text-slate-700 placeholder:text-slate-300 focus:outline-none focus:border-blue-400 bg-white flex-shrink-0" />
                      <input type="text" defaultValue={item.total > 0 ? `${fmt(item.unitPrice)}원*${item.qty}명*${item.months}개월` : ''} placeholder="단가원*수량명*개월" className="w-48 px-1.5 py-1 border border-amber-300 rounded text-[11px] text-right bg-amber-50 placeholder:text-slate-300 focus:outline-none focus:border-blue-400 flex-shrink-0" />
                      <span className="text-xs text-slate-500 font-bold">=</span>
                      <span className="text-xs font-bold text-slate-800 min-w-[80px] text-right">{item.total > 0 ? fmt(item.total) : ''}</span>
                      <span className="text-[10px] text-slate-400">원</span>
                      <button className="w-4 h-4 flex items-center justify-center rounded-full bg-green-100 text-green-600 hover:bg-green-200 text-[10px] font-bold flex-shrink-0">+</button>
                      <button className="w-4 h-4 flex items-center justify-center rounded-full bg-red-100 text-red-500 hover:bg-red-200 text-[10px] font-bold flex-shrink-0">-</button>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}

          {tab === 'expense' && (
            <div className="py-16 text-center text-slate-400 text-sm">
              세출 예산 데이터를 준비중입니다
            </div>
          )}
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
    <div className="bg-amber-50/30 border-t-2 border-b-2 border-amber-200">
      {/* 헤더 */}
      <div className="px-4 py-2.5 bg-white/80 flex items-center justify-between border-b border-amber-100">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-slate-700">세부항목(항목/내용/합계)</span>
          <span className="text-[11px] text-slate-500">항목 {rows.length}개</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={deleteRows} className={`px-2.5 py-1 text-[10px] font-bold rounded transition-colors ${checked.size > 0 ? 'text-red-600 bg-red-50 border border-red-200 hover:bg-red-100' : 'text-slate-400 bg-slate-50 border border-slate-200 cursor-not-allowed'}`}>체크삭제{checked.size > 0 && ` (${checked.size})`}</button>
          <span className="text-xs text-slate-500">합계금액: <span className="font-bold text-blue-700">{fmt(grandTotal)}</span>원</span>
          <button className="px-3 py-1 text-[11px] font-bold text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors">저장</button>
          <button onClick={onClose} className="w-6 h-6 flex items-center justify-center rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      </div>

      {/* 산출 리스트 */}
      <div className="divide-y divide-amber-100">
        {rows.map((item, i) => (
          <div key={i} className={`flex items-center gap-2 px-4 py-2 ${checked.has(i) ? 'bg-amber-100/50' : 'bg-white/60 hover:bg-white'} transition-colors`}>
            <input type="checkbox" className="w-3.5 h-3.5 rounded border-slate-300 flex-shrink-0" checked={checked.has(i)} onChange={() => toggleCheck(i)} />
            <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded flex-shrink-0">산출</span>
            <input
              type="text"
              value={item.name}
              onChange={(e) => updateRow(i, 'name', e.target.value)}
              className="w-44 px-2 py-1.5 border border-slate-200 rounded text-xs font-medium text-slate-700 focus:outline-none focus:border-blue-400 bg-white flex-shrink-0"
            />
            <input
              type="text"
              value={fmt(item.unitPrice)}
              onChange={(e) => updateRow(i, 'unitPrice', e.target.value)}
              className="w-24 px-2 py-1.5 border border-amber-300 rounded text-xs text-right bg-amber-50 focus:outline-none focus:border-blue-400 flex-shrink-0"
            />
            <span className="text-xs text-slate-400">원*</span>
            <input
              type="text"
              value={String(item.qty)}
              onChange={(e) => updateRow(i, 'qty', e.target.value)}
              className="w-10 px-1 py-1.5 border border-amber-300 rounded text-xs text-center bg-amber-50 focus:outline-none focus:border-blue-400 flex-shrink-0"
            />
            <span className="text-xs text-slate-400">명*</span>
            <input
              type="text"
              value={String(item.months)}
              onChange={(e) => updateRow(i, 'months', e.target.value)}
              className="w-10 px-1 py-1.5 border border-amber-300 rounded text-xs text-center bg-amber-50 focus:outline-none focus:border-blue-400 flex-shrink-0"
            />
            <span className="text-xs text-slate-400">개월</span>
            <span className="text-xs text-slate-500 font-bold">=</span>
            <span className="text-sm font-bold text-slate-800 min-w-[90px] text-right">{fmt(item.total)}</span>
            <span className="text-[10px] text-slate-400">원</span>
            <button onClick={addRow} className="w-5 h-5 flex items-center justify-center rounded-full bg-green-100 text-green-600 hover:bg-green-200 transition-colors flex-shrink-0 text-sm font-bold">+</button>
            <button onClick={() => { setRows(prev => prev.filter((_, idx) => idx !== i)) }} className="w-5 h-5 flex items-center justify-center rounded-full bg-red-100 text-red-500 hover:bg-red-200 transition-colors flex-shrink-0 text-sm font-bold">-</button>
          </div>
        ))}
        {rows.length === 0 && (
          <div className="px-4 py-6 text-center text-xs text-slate-400">
            <button onClick={addRow} className="px-3 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 transition-colors">+ 항목 추가</button>
          </div>
        )}
      </div>
    </div>
  )
}
