'use client'

import React, { useState } from 'react'

const reportSections = [
  { id: 'cover', title: '예산서 표지', icon: '📋', desc: '어린이집 예산서 표지 (기관명, 시설명)' },
  { id: 'general', title: '총칙', icon: '📜', desc: '예산 총칙 (예산 편성 기준, 적용 규정 등)' },
  { id: 'summary', title: '세입/세출 총괄표', icon: '📊', desc: '세입·세출 예산 총괄 요약표' },
  { id: 'income', title: '세입예산서', icon: '💰', desc: '세입 항목별 예산 내역서' },
  { id: 'expense', title: '세출예산서', icon: '💸', desc: '세출 항목별 예산 내역서' },
]

export default function BudgetReportPage() {
  const [selected, setSelected] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)

  return (
    <div className="p-3 space-y-3">
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
        </select>
        <button className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors">조회</button>
        <div className="ml-auto flex items-center gap-1.5">
          <label className="flex items-center gap-1 text-xs text-slate-600 cursor-pointer">
            <input type="checkbox" checked={showAll} onChange={e => { setShowAll(e.target.checked); if (e.target.checked) setSelected(null) }} className="w-3.5 h-3.5 rounded border-slate-300 accent-blue-600" />
            <span>전체</span>
          </label>
          <button className="flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 rounded text-xs text-slate-600 transition-colors" title="인쇄하기">
            <svg className="w-3.5 h-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5z" /></svg>
            인쇄
          </button>
          <button className="flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-green-50 border border-green-400 rounded text-xs text-green-600 transition-colors" title="엑셀다운로드">
            <svg className="w-3.5 h-3.5 text-green-600" viewBox="0 0 24 24" fill="currentColor"><path d="M14.2 1H5.8C4.81 1 4 1.81 4 2.8v18.4c0 .99.81 1.8 1.8 1.8h12.4c.99 0 1.8-.81 1.8-1.8V6.8L14.2 1zM15.8 19.3l-2.1-3.5-2.1 3.5H9.8l3.2-5-2.9-4.7h1.8l2.1 3.3 2-3.3h1.8l-2.9 4.7 3.2 5h-2.3z" /></svg>
            엑셀
          </button>
        </div>
      </div>

      {/* 보고서 섹션 박스 */}
      <div className="grid grid-cols-5 gap-3">
        {reportSections.map(section => (
          <button
            key={section.id}
            onClick={() => { setShowAll(false); setSelected(selected === section.id ? null : section.id) }}
            className={`flex flex-col items-center gap-2 px-4 py-5 rounded-xl border-2 transition-all cursor-pointer ${
              selected === section.id || showAll
                ? 'border-blue-500 bg-blue-50 shadow-md'
                : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/30 hover:shadow-sm'
            }`}
          >
            <span className="text-2xl">{section.icon}</span>
            <span className={`text-xs font-bold ${selected === section.id ? 'text-blue-700' : 'text-slate-700'}`}>{section.title}</span>
            <span className="text-[10px] text-slate-400 text-center leading-tight">{section.desc}</span>
          </button>
        ))}
      </div>

      {/* 선택된 보고서 내용 */}
      {showAll ? (
        <div className="space-y-4">
          {reportSections.map(section => (
            <div key={section.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              {section.id === 'cover' && <CoverSection />}
              {section.id === 'general' && <GeneralSection />}
              {section.id === 'summary' && <SummarySection />}
              {section.id === 'income' && <IncomeSection />}
              {section.id === 'expense' && <ExpenseSection />}
            </div>
          ))}
        </div>
      ) : selected && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {selected === 'cover' && <CoverSection />}
          {selected === 'general' && <GeneralSection />}
          {selected === 'summary' && <SummarySection />}
          {selected === 'income' && <IncomeSection />}
          {selected === 'expense' && <ExpenseSection />}
        </div>
      )}
    </div>
  )
}

const fmt = (n: number) => n.toLocaleString('ko-KR')

function CoverSection() {
  return (
    <div className="p-8 flex justify-center">
      <div className="border border-slate-400 w-[550px] aspect-[210/297] flex flex-col px-12 py-10">
        <div className="pt-16">
          <div className="border border-slate-600 px-8 py-4 text-center">
            <p className="text-xl tracking-[0.3em] text-slate-800">2026 년도  세입 · 세출 예산서</p>
          </div>
        </div>
        <div className="flex-1" />
        <div className="text-center pb-16">
          <p className="text-2xl font-bold text-purple-900 tracking-widest">예인어린이집</p>
        </div>
      </div>
    </div>
  )
}

function GeneralSection() {
  const [loanLimit, setLoanLimit] = useState('10000000')
  const [reserveFund, setReserveFund] = useState('0')

  const incomeTotal = 1276671
  const expenseTotal = 1276671
  const prevDiff = 281

  return (
    <div className="p-8 space-y-8">
      <h2 className="text-2xl font-bold text-slate-800 text-center tracking-[1em]">예 산 총 칙</h2>

      {/* 제1조 */}
      <div className="space-y-4">
        <p className="text-xs text-slate-700">○ <span className="font-bold">제1조 : 2026</span>년도 세입,세출 예산 총액은 다음과 같다.</p>
        <p className="text-[10px] text-slate-500 text-right">( 단위 : 천원 )</p>
        <table className="w-full text-[11px] border border-slate-300">
          <thead>
            <tr>
              <th rowSpan={2} className="border border-slate-300 px-3 py-2 text-center text-slate-600 w-[160px]">구 분</th>
              <th colSpan={3} className="border border-slate-300 px-3 py-2 text-center text-slate-600">세입,세출 예산 총액</th>
            </tr>
            <tr>
              <th className="border border-slate-300 px-3 py-2 text-center text-slate-600 w-[140px]">세입예산액</th>
              <th className="border border-slate-300 px-3 py-2 text-center text-slate-600 w-[140px]">세출예산액</th>
              <th className="border border-slate-300 px-3 py-2 text-center text-slate-600 w-[100px]">증감<br />(전년대비)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-slate-300 px-3 py-3 text-center text-slate-600">
                <div>시설회계</div>
                <div>보육사업비</div>
                <div className="mt-1 text-slate-800">예인어린이집</div>
              </td>
              <td className="border border-slate-300 px-3 py-3 text-right text-slate-700">{fmt(incomeTotal)}</td>
              <td className="border border-slate-300 px-3 py-3 text-right text-slate-700">{fmt(expenseTotal)}</td>
              <td className="border border-slate-300 px-3 py-3 text-right text-slate-700">{prevDiff}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 제2조 */}
      <p className="text-xs text-slate-700">○ <span className="font-bold">제2조</span> : 세입,세출예산의 명세는 별첨 &quot;세입·세출예산&quot;과 같다.</p>

      {/* 제3조 */}
      <p className="text-xs text-slate-700">
        ○ <span className="font-bold">제3조 : 2026</span>년도 일시차입금은{' '}
        <input type="text" value={loanLimit} onChange={e => setLoanLimit(e.target.value)} className="border border-slate-300 rounded px-2 py-0.5 text-xs w-28 text-right" />
        원 한도내에서 일시 차입 할 수 있다.
      </p>

      {/* 제4조 */}
      <p className="text-xs text-slate-700">
        ○ <span className="font-bold">제4조</span> : 일반 회계 예비비는{' '}
        <input type="text" value={reserveFund} onChange={e => setReserveFund(e.target.value)} className="border border-slate-300 rounded px-2 py-0.5 text-xs w-28 text-right" />
        원으로 한다.
      </p>
    </div>
  )
}

function SummarySection() {
  const income = [
    { name: '* 총 계 *', amount: 1276671, prev: 1276390, diff: 281, isTotal: true },
    { name: '보육료', amount: 445864, prev: 449768, diff: -3904 },
    { name: '수익자부담 수입', amount: 138488, prev: 188131, diff: -49643 },
    { name: '보조금 및 지원금', amount: 553023, prev: 548644, diff: 4379 },
    { name: '전입금', amount: 12556, prev: 12364, diff: 192 },
    { name: '기부금', amount: 0, prev: 0, diff: 0 },
    { name: '적립금', amount: 6000, prev: 6000, diff: 0 },
    { name: '과년도 수입', amount: 500, prev: 500, diff: 0 },
    { name: '잡수입', amount: 3100, prev: 3100, diff: 0 },
    { name: '전년도 이월액', amount: 117140, prev: 67882, diff: 49257 },
  ]
  const expense = [
    { name: '* 총 계 *', amount: 1276671, prev: 1276390, diff: 281, isTotal: true },
    { name: '인건비', amount: 674805, prev: 641779, diff: 33026 },
    { name: '운영비', amount: 148970, prev: 187494, diff: -38524 },
    { name: '보육활동비', amount: 160616, prev: 153576, diff: 7040 },
    { name: '수익자 부담경비', amount: 138488, prev: 188131, diff: -49643 },
    { name: '적립금', amount: 0, prev: 0, diff: 0 },
    { name: '상환·반환금', amount: 10600, prev: 10600, diff: 0 },
    { name: '재산조성비', amount: 21000, prev: 27000, diff: -6000 },
    { name: '과년도 지출', amount: 122192, prev: 10000, diff: 112192 },
    { name: '잡지출', amount: 0, prev: 473, diff: -473 },
    { name: '예비비', amount: 0, prev: 57337, diff: -57337 },
  ]

  return (
    <div className="p-8 space-y-4">
      <div className="border border-slate-600 px-6 py-3 text-center">
        <p className="text-xl tracking-[0.5em] text-slate-800">2026 년도 세입 · 세출 예산 총괄표</p>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-600">예인어린이집</span>
        <span className="text-[10px] text-slate-500">금액단위:천원</span>
      </div>

      {/* 세입/세출 나란히 */}
      <div className="grid grid-cols-2 gap-0">
        {/* 세입 */}
        <div>
          <table className="w-full text-[11px] border-collapse">
            <thead>
              <tr className="bg-blue-50">
                <th colSpan={4} className="border border-slate-300 px-2 py-1.5 text-center font-bold text-blue-700">세 입</th>
              </tr>
              <tr className="bg-slate-50">
                <th className="border border-slate-300 px-2 py-1.5 text-center font-bold text-slate-600 w-[90px]">구 분</th>
                <th className="border border-slate-300 px-2 py-1.5 text-center font-bold text-slate-600 w-[90px]">예산액</th>
                <th className="border border-slate-300 px-2 py-1.5 text-center font-bold text-slate-600 w-[90px]">전년도<br/>예산액</th>
                <th className="border border-slate-300 px-2 py-1.5 text-center font-bold text-slate-600 w-[70px]">증감</th>
                {/* 비고 생략 */}
              </tr>
            </thead>
            <tbody>
              {income.map((r, i) => (
                <tr key={i} className={r.isTotal ? 'bg-teal-50 font-bold' : ''}>
                  <td className={`border border-slate-300 px-2 py-1.5 ${r.isTotal ? 'text-center text-red-600' : 'text-slate-600'}`}>{r.name}</td>
                  <td className="border border-slate-300 px-2 py-1.5 text-right text-slate-700">{fmt(r.amount)}</td>
                  <td className="border border-slate-300 px-2 py-1.5 text-right text-slate-700">{fmt(r.prev)}</td>
                  <td className={`border border-slate-300 px-2 py-1.5 text-right ${r.diff < 0 ? 'text-red-600' : 'text-slate-700'}`}>{r.diff !== 0 ? fmt(r.diff) : '0'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* 세출 */}
        <div>
          <table className="w-full text-[11px] border-collapse">
            <thead>
              <tr className="bg-red-50">
                <th colSpan={4} className="border border-slate-300 px-2 py-1.5 text-center font-bold text-red-700">세 출</th>
              </tr>
              <tr className="bg-slate-50">
                <th className="border border-slate-300 px-2 py-1.5 text-center font-bold text-slate-600 w-[90px]">구 분</th>
                <th className="border border-slate-300 px-2 py-1.5 text-center font-bold text-slate-600 w-[90px]">예산액</th>
                <th className="border border-slate-300 px-2 py-1.5 text-center font-bold text-slate-600 w-[90px]">전년도<br/>예산액</th>
                <th className="border border-slate-300 px-2 py-1.5 text-center font-bold text-slate-600 w-[70px]">증감</th>
              </tr>
            </thead>
            <tbody>
              {expense.map((r, i) => (
                <tr key={i} className={r.isTotal ? 'bg-teal-50 font-bold' : ''}>
                  <td className={`border border-slate-300 px-2 py-1.5 ${r.isTotal ? 'text-center text-red-600' : 'text-slate-600'}`}>{r.name}</td>
                  <td className="border border-slate-300 px-2 py-1.5 text-right text-slate-700">{fmt(r.amount)}</td>
                  <td className="border border-slate-300 px-2 py-1.5 text-right text-slate-700">{fmt(r.prev)}</td>
                  <td className={`border border-slate-300 px-2 py-1.5 text-right ${r.diff < 0 ? 'text-red-600' : 'text-slate-700'}`}>{r.diff !== 0 ? fmt(r.diff) : '0'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function IncomeSection() {
  const data = [
    { code: '01', name: '보육료', amount: 186288000, prevAmount: 0, level: 0 },
    { code: '11', name: '보육료', amount: 186288000, prevAmount: 0, level: 1 },
    { code: '111', name: '정부지원 보육료', amount: 186288000, prevAmount: 0, level: 2, basis: '0세 584,000원*6명*12월=42,048,000 / 1세 515,000원*8명*12월=49,440,000 / 2세 426,000원*10명*12월=51,120,000 / 3세 280,000원*6명*12월=20,160,000 / 5세 280,000원*7명*12월=23,520,000' },
    { code: '112', name: '부모부담 보육료', amount: 0, prevAmount: 0, level: 2 },
    { code: '02', name: '수익자부담 수입', amount: 0, prevAmount: 0, level: 0 },
    { code: '21', name: '선택적 보육활동비', amount: 0, prevAmount: 0, level: 1 },
    { code: '211', name: '특별활동비', amount: 0, prevAmount: 0, level: 2 },
    { code: '22', name: '기타 필요경비', amount: 0, prevAmount: 0, level: 1 },
    { code: '221', name: '기타 필요경비', amount: 0, prevAmount: 0, level: 2 },
    { code: '221-111', name: '입학준비금', amount: 0, prevAmount: 0, level: 3 },
    { code: '221-112', name: '현장학습비', amount: 0, prevAmount: 0, level: 3 },
    { code: '221-113', name: '차량운행비', amount: 0, prevAmount: 0, level: 3 },
    { code: '221-121', name: '부모부담행사비', amount: 0, prevAmount: 0, level: 3 },
    { code: '221-131', name: '아침.저녁급식비', amount: 0, prevAmount: 0, level: 3 },
    { code: '221-141', name: '기타시도특성화비', amount: 0, prevAmount: 0, level: 3 },
    { code: '03', name: '보조금 및 지원금', amount: 161791520, prevAmount: 0, level: 0 },
    { code: '31', name: '인건비 보조금', amount: 103139520, prevAmount: 0, level: 1 },
    { code: '311', name: '인건비 보조금', amount: 103139520, prevAmount: 0, level: 2, basis: '보조교사 1,139,000*1명*12월=13,668,000 / 연장교사 1,139,000*1명*12월=13,668,000 / 행복도우미 1,139,000*1명*12월=13,668,000 / 사용자부담금 63,830*2명*12월=1,531,920 / 0세교사 2,479,600*1명*12월=29,755,200 / 1세교사 2,570,700*1명*12월=30,848,400' },
    { code: '32', name: '운영보조금', amount: 58652000, prevAmount: 0, level: 1 },
    { code: '321', name: '기관보육료', amount: 0, prevAmount: 0, level: 2 },
    { code: '322', name: '연장보육료', amount: 4560000, prevAmount: 0, level: 2, basis: '0세 3,000*3명*20회*12월=2,160,000 / 영아반 2,000*2명*20회*12월=960,000 / 유아반 1,000*6명*20회*12월=1,440,000' },
    { code: '323', name: '공공형 운영비', amount: 0, prevAmount: 0, level: 2 },
    { code: '324', name: '그 밖의 지원금', amount: 54092000, prevAmount: 0, level: 2, basis: '방과후과정비 100,000*2반*12월=2,400,000 / 현장학습비 15,000*37명*12월=6,660,000 / 행사비 100,000*37명*1월=3,700,000 / 기타필요경비 20,000*10명*12월=2,400,000 / 친환경농산물 13,000*37명*12월=5,772,000 / 급간식 10,000*37명*12월=4,440,000 / 교재교구 1,000,000*1회=1,000,000 / 냉난방비 600,000*1회=600,000 / 누리과정 50,000*13명*12월=7,800,000 / 누리추가 70,000*13명*12월=10,920,000 / 영아반 100,000*7반*12월=8,400,000' },
    { code: '33', name: '자본 보조금', amount: 0, prevAmount: 0, level: 1 },
    { code: '331', name: '자본보조금', amount: 0, prevAmount: 0, level: 2 },
    { code: '04', name: '전입금', amount: 450000000, prevAmount: 0, level: 0 },
    { code: '41', name: '전입금', amount: 450000000, prevAmount: 0, level: 1 },
    { code: '411', name: '전입금', amount: 450000000, prevAmount: 0, level: 2, basis: '전입금 450,000,000' },
    { code: '42', name: '차입금', amount: 0, prevAmount: 0, level: 1 },
    { code: '421', name: '단기차입금', amount: 0, prevAmount: 0, level: 2 },
    { code: '422', name: '장기차입금', amount: 0, prevAmount: 0, level: 2 },
    { code: '05', name: '기부금', amount: 0, prevAmount: 0, level: 0 },
    { code: '51', name: '기부금', amount: 0, prevAmount: 0, level: 1 },
    { code: '511', name: '지정후원금', amount: 0, prevAmount: 0, level: 2 },
    { code: '512', name: '비지정후원금', amount: 0, prevAmount: 0, level: 2 },
    { code: '06', name: '적립금', amount: 0, prevAmount: 0, level: 0 },
    { code: '61', name: '적립금', amount: 0, prevAmount: 0, level: 1 },
    { code: '611', name: '적립금 처분 수입', amount: 0, prevAmount: 0, level: 2 },
    { code: '07', name: '과년도 수입', amount: 0, prevAmount: 0, level: 0 },
    { code: '71', name: '과년도 수입', amount: 0, prevAmount: 0, level: 1 },
    { code: '711', name: '과년도 수입', amount: 0, prevAmount: 0, level: 2 },
    { code: '08', name: '잡수입', amount: 1000000, prevAmount: 0, level: 0 },
    { code: '81', name: '잡수입', amount: 1000000, prevAmount: 0, level: 1 },
    { code: '811', name: '이자수입', amount: 1000000, prevAmount: 0, level: 2, basis: '이자수입 1,000,000*1회=1,000,000' },
    { code: '812', name: '그 밖의 잡수입', amount: 0, prevAmount: 0, level: 2 },
    { code: '09', name: '전년도 이월액', amount: 20000000, prevAmount: 0, level: 0 },
    { code: '91', name: '전년도 이월액', amount: 20000000, prevAmount: 0, level: 1 },
    { code: '911', name: '전년도 이월금', amount: 20000000, prevAmount: 0, level: 2, basis: '전년도 이월금 20,000,000*1회=20,000,000' },
    { code: '912', name: '전년도 이월사업비', amount: 0, prevAmount: 0, level: 2 },
  ]
  return <BudgetReportTable title="세입예산서" data={data} color="blue" />
}

function ExpenseSection() {
  const data = [
    { code: 'E100', name: '인건비', amount: 674804897, prevAmount: 0, level: 0 },
    { code: 'E110', name: '원장인건비', amount: 78600000, prevAmount: 0, level: 1 },
    { code: 'E111', name: '원장급여', amount: 78000000, prevAmount: 76387190, level: 2 },
    { code: 'E112', name: '원장수당', amount: 600000, prevAmount: 0, level: 2 },
    { code: 'E120', name: '보육교직원인건비', amount: 493037280, prevAmount: 0, level: 1 },
    { code: 'E121', name: '보육교직원급여', amount: 476237280, prevAmount: 392202020, level: 2 },
    { code: 'E122', name: '보육교직원수당', amount: 16800000, prevAmount: 4735000, level: 2 },
    { code: 'E130', name: '기타인건비', amount: 5992800, prevAmount: 0, level: 1 },
    { code: 'E131', name: '기타 인건비', amount: 5992800, prevAmount: 191000, level: 2 },
    { code: 'E140', name: '기관부담금', amount: 97174817, prevAmount: 0, level: 1 },
    { code: 'E141', name: '법정부담금', amount: 57488377, prevAmount: 39771280, level: 2 },
    { code: 'E142', name: '퇴직금 및 퇴직적립금', amount: 39686440, prevAmount: 30803721, level: 2 },
    { code: 'E200', name: '운영비', amount: 133770000, prevAmount: 0, level: 0 },
    { code: 'E210', name: '관리운영비', amount: 131770000, prevAmount: 0, level: 1 },
    { code: 'E211', name: '수용비 및 수수료', amount: 67260000, prevAmount: 14867129, level: 2 },
    { code: 'E212', name: '공공요금 및 제세공과금', amount: 22600000, prevAmount: 10098780, level: 2 },
    { code: 'E213', name: '연료비', amount: 0, prevAmount: 0, level: 2 },
    { code: 'E214', name: '여비', amount: 0, prevAmount: 0, level: 2 },
    { code: 'E215', name: '차량비', amount: 10200000, prevAmount: 3564000, level: 2 },
    { code: 'E216', name: '복리후생비', amount: 10110000, prevAmount: 7226680, level: 2 },
    { code: 'E217', name: '기타 운영비', amount: 21600000, prevAmount: 17058755, level: 2 },
    { code: 'E220', name: '업무추진비', amount: 0, prevAmount: 0, level: 1 },
    { code: 'E221', name: '업무추진비', amount: 4200000, prevAmount: 15000, level: 2 },
    { code: 'E222', name: '직책급', amount: 12000000, prevAmount: 7300000, level: 2 },
    { code: 'E223', name: '회의비', amount: 1000000, prevAmount: 54000, level: 2 },
    { code: 'E300', name: '보육활동비', amount: 160616000, prevAmount: 0, level: 0 },
    { code: 'E310', name: '기본보육활동비', amount: 160616000, prevAmount: 0, level: 1 },
    { code: 'E311', name: '교직원연수·연구비', amount: 6000000, prevAmount: 1531770, level: 2 },
    { code: 'E312', name: '교재·교구 구입비', amount: 40120000, prevAmount: 3779370, level: 2 },
    { code: 'E313', name: '행사비', amount: 9840000, prevAmount: 1618900, level: 2 },
    { code: 'E314', name: '영유아복리비', amount: 1000000, prevAmount: 79700, level: 2 },
    { code: 'E315', name: '급식·간식재료비', amount: 103656000, prevAmount: 61932476, level: 2 },
    { code: 'E400', name: '수익자 부담경비', amount: 138488000, prevAmount: 0, level: 0 },
    { code: 'E410', name: '선택적 보육활동비', amount: 53328000, prevAmount: 0, level: 1 },
    { code: 'E411', name: '특별활동비지출', amount: 53328000, prevAmount: 64190800, level: 2 },
    { code: 'E420', name: '기타 필요경비', amount: 85160000, prevAmount: 0, level: 1 },
    { code: 'E421', name: '기타 필요경비 지출', amount: 85160000, prevAmount: 120257698, level: 2 },
    { code: 'E500', name: '적립금', amount: 0, prevAmount: 0, level: 0 },
    { code: 'E510', name: '적립금', amount: 0, prevAmount: 0, level: 1 },
    { code: 'E511', name: '적립금', amount: 0, prevAmount: 0, level: 2 },
    { code: 'E600', name: '상환·반환금', amount: 10600000, prevAmount: 0, level: 0 },
    { code: 'E610', name: '차입금 상환', amount: 10000000, prevAmount: 0, level: 1 },
    { code: 'E611', name: '단기 차입금 상환', amount: 10000000, prevAmount: 0, level: 2 },
    { code: 'E612', name: '장기 차입금 상환', amount: 0, prevAmount: 0, level: 2 },
    { code: 'E620', name: '반환금', amount: 600000, prevAmount: 0, level: 1 },
    { code: 'E621', name: '보조금 반환금', amount: 300000, prevAmount: 0, level: 2 },
    { code: 'E622', name: '보호자 반환금', amount: 300000, prevAmount: 0, level: 2 },
    { code: 'E623', name: '법인회계 전출금', amount: 0, prevAmount: 0, level: 2 },
    { code: 'E700', name: '재산조성비', amount: 21000000, prevAmount: 0, level: 0 },
    { code: 'E710', name: '시설비', amount: 9000000, prevAmount: 0, level: 1 },
    { code: 'E711', name: '시설비', amount: 3000000, prevAmount: 660000, level: 2 },
    { code: 'E712', name: '시설장비 유지비', amount: 6000000, prevAmount: 839000, level: 2 },
    { code: 'E720', name: '자산구입비', amount: 12000000, prevAmount: 0, level: 1 },
    { code: 'E721', name: '자산취득비', amount: 12000000, prevAmount: 1111450, level: 2 },
    { code: 'E800', name: '과년도 지출', amount: 122192144, prevAmount: 0, level: 0 },
    { code: 'E810', name: '과년도 지출', amount: 122192144, prevAmount: 0, level: 1 },
    { code: 'E811', name: '과년도 지출', amount: 122192144, prevAmount: 7160800, level: 2 },
    { code: 'E900', name: '잡지출', amount: 0, prevAmount: 0, level: 0 },
    { code: 'E910', name: '잡지출', amount: 0, prevAmount: 0, level: 1 },
    { code: 'E911', name: '잡지출', amount: 0, prevAmount: 0, level: 2 },
    { code: 'E1000', name: '예비비', amount: 0, prevAmount: 0, level: 0 },
    { code: 'E1010', name: '예비비', amount: 0, prevAmount: 0, level: 1 },
    { code: 'E1011', name: '예비비', amount: 0, prevAmount: 0, level: 2 },
  ]
  return <BudgetReportTable title="세출예산서" data={data} color="red" />
}

interface ReportRow {
  code: string; name: string; amount: number; prevAmount: number; level: number; basis?: string
}

function BudgetReportTable({ title, data, color }: { title: string; data: ReportRow[]; color: 'blue' | 'red' }) {
  const total = data.filter(r => r.level === 0).reduce((s, r) => s + r.amount, 0)
  const bgHeader = color === 'blue' ? 'bg-blue-50' : 'bg-red-50'
  const textColor = color === 'blue' ? 'text-blue-700' : 'text-red-700'
  const borderColor = color === 'blue' ? 'border-blue-200' : 'border-red-200'

  return (
    <div className="p-6 space-y-3">
      <h3 className="text-sm font-bold text-slate-800 text-center pb-2 border-b border-slate-200">{title}</h3>
      <p className="text-[10px] text-slate-500 text-right">( 단위 : 원 )</p>
      <table className="w-full text-[11px] border-collapse">
        <thead>
          <tr className={`${bgHeader} border border-slate-300`}>
            <th className="border border-slate-300 px-2 py-2 text-center font-bold text-slate-600 w-[50px]">관</th>
            <th className="border border-slate-300 px-2 py-2 text-center font-bold text-slate-600 w-[70px]">항</th>
            <th className="border border-slate-300 px-2 py-2 text-center font-bold text-slate-600 w-[90px]">목</th>
            <th className="border border-slate-300 px-2 py-2 text-center font-bold text-slate-600">과목명</th>
            <th className="border border-slate-300 px-2 py-2 text-center font-bold text-slate-600 w-[120px]">전년도결산액</th>
            <th className="border border-slate-300 px-2 py-2 text-center font-bold text-slate-600 w-[120px]">예산액</th>
            <th className="border border-slate-300 px-2 py-2 text-center font-bold text-slate-600">산출기초</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} className={row.level === 0 ? `${bgHeader} font-bold` : ''}>
              <td className="border border-slate-300 px-2 py-1.5 text-center text-slate-500">{row.level === 0 ? row.code.replace('E', '') : ''}</td>
              <td className="border border-slate-300 px-2 py-1.5 text-center text-slate-500">{row.level === 1 ? row.code.replace('E', '') : ''}</td>
              <td className="border border-slate-300 px-2 py-1.5 text-center text-slate-500">{row.level >= 2 ? row.code.replace('E', '') : ''}</td>
              <td className={`border border-slate-300 px-2 py-1.5 ${row.level === 0 ? textColor : row.level === 1 ? 'text-slate-700 font-semibold' : row.level === 3 ? 'text-slate-500 pl-8' : 'text-slate-600 pl-4'}`}>{row.name}</td>
              <td className="border border-slate-300 px-2 py-1.5 text-right text-slate-500">{row.prevAmount > 0 ? fmt(row.prevAmount) : ''}</td>
              <td className={`border border-slate-300 px-2 py-1.5 text-right ${row.level === 0 ? textColor : 'text-slate-700'}`}>{row.amount > 0 ? fmt(row.amount) : ''}</td>
              <td className="border border-slate-300 px-2 py-1.5 text-[10px] text-slate-500">
                {row.basis ? row.basis.split(' / ').map((item, j) => (
                  <div key={j}>{item}</div>
                )) : ''}
              </td>
            </tr>
          ))}
          <tr className={`${bgHeader} font-bold border-t-2 ${borderColor}`}>
            <td colSpan={5} className={`border border-slate-300 px-2 py-2 text-center ${textColor}`}>합 계</td>
            <td className={`border border-slate-300 px-2 py-2 text-right ${textColor}`}>{fmt(total)}</td>
            <td className="border border-slate-300"></td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
