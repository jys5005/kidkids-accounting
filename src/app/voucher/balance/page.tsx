'use client'

import { useState } from 'react'

interface MonthlyBalance {
  month: string
  label: string
  bankAmounts: Record<string, number>
  bankTotal: number
  accountBalance: number
  diff: number
  matched: boolean
}

interface DailyBalance {
  date: string
  label: string
  bankAmounts: Record<string, number>
  bankTotal: number
  bankTxTotal: number // 당일 계좌거래내역 합계 (입금-출금)
  accountBalance: number
  accountTxTotal: number // 당일 회계거래내역 합계 (수입-지출)
  diff: number
  matched: boolean
}

const banks = ['신한은행', '국민은행', '농협', '우리은행']

const sampleMonthly: MonthlyBalance[] = [
  { month: '2026-03', label: '2026년 03월', bankAmounts: { '신한은행': 39069438, '국민은행': 0, '농협': 0, '우리은행': 0 }, bankTotal: 39069438, accountBalance: -3469148, diff: 42538586, matched: false },
  { month: '2026-04', label: '2026년 04월', bankAmounts: { '신한은행': 0, '국민은행': 0, '농협': 0, '우리은행': 0 }, bankTotal: 0, accountBalance: 0, diff: 0, matched: true },
  { month: '2026-05', label: '2026년 05월', bankAmounts: { '신한은행': 0, '국민은행': 0, '농협': 0, '우리은행': 0 }, bankTotal: 0, accountBalance: 0, diff: 0, matched: true },
  { month: '2026-06', label: '2026년 06월', bankAmounts: { '신한은행': 0, '국민은행': 0, '농협': 0, '우리은행': 0 }, bankTotal: 0, accountBalance: 0, diff: 0, matched: true },
  { month: '2026-07', label: '2026년 07월', bankAmounts: { '신한은행': 0, '국민은행': 0, '농협': 0, '우리은행': 0 }, bankTotal: 0, accountBalance: 0, diff: 0, matched: true },
  { month: '2026-08', label: '2026년 08월', bankAmounts: { '신한은행': 0, '국민은행': 0, '농협': 0, '우리은행': 0 }, bankTotal: 0, accountBalance: 0, diff: 0, matched: true },
  { month: '2026-09', label: '2026년 09월', bankAmounts: { '신한은행': 0, '국민은행': 0, '농협': 0, '우리은행': 0 }, bankTotal: 0, accountBalance: 0, diff: 0, matched: true },
  { month: '2026-10', label: '2026년 10월', bankAmounts: { '신한은행': 0, '국민은행': 0, '농협': 0, '우리은행': 0 }, bankTotal: 0, accountBalance: 0, diff: 0, matched: true },
  { month: '2026-11', label: '2026년 11월', bankAmounts: { '신한은행': 0, '국민은행': 0, '농협': 0, '우리은행': 0 }, bankTotal: 0, accountBalance: 0, diff: 0, matched: true },
  { month: '2026-12', label: '2026년 12월', bankAmounts: { '신한은행': 0, '국민은행': 0, '농협': 0, '우리은행': 0 }, bankTotal: 0, accountBalance: 0, diff: 0, matched: true },
  { month: '2027-01', label: '2027년 01월', bankAmounts: { '신한은행': 0, '국민은행': 0, '농협': 0, '우리은행': 0 }, bankTotal: 0, accountBalance: 0, diff: 0, matched: true },
  { month: '2027-02', label: '2027년 02월', bankAmounts: { '신한은행': 0, '국민은행': 0, '농협': 0, '우리은행': 0 }, bankTotal: 0, accountBalance: 0, diff: 0, matched: true },
]

// 3월 일별 샘플 데이터
const sampleDaily: DailyBalance[] = Array.from({ length: 19 }, (_, i) => {
  const day = i + 1
  const label = `${String(day).padStart(2, '0')}일`
  const amounts: Record<number, number> = {
    1: 4486589, 2: 4436249, 3: 4169442, 4: 4936385, 5: 2377098,
    6: 4250268, 7: 4280568, 8: 4280568, 9: 4530597, 10: 22980844,
    11: 22360844, 12: 21520844, 13: 21140844, 14: 21340844, 15: 20940844,
    16: 20185844, 17: 16285844, 18: 15005844, 19: 39069438,
  }
  const acctBal: Record<number, number> = {
    1: -38258018, 2: -38258018, 3: -38258018, 4: -38258018, 5: -38258018,
    6: -38258018, 7: -38258018, 8: -38258018, 9: -38258018, 10: 22980844,
    11: 22360844, 12: 21520844, 13: 21140844, 14: 21040844, 15: 20940844,
    16: 20185844, 17: 16285844, 18: 15005844, 19: -3469148,
  }
  // 당일 거래내역 합계 (입금-출금 / 수입-지출)
  const bankTx: Record<number, number> = {
    1: 0, 2: -50340, 3: 28768960, 4: 766943, 5: -2559287,
    6: 1873170, 7: 30300, 8: 0, 9: 250029, 10: 3570000,
    11: -620000, 12: -840000, 13: -380000, 14: 200000, 15: -400000,
    16: -755000, 17: -3900000, 18: -1280000, 19: 24063594,
  }
  const acctTx: Record<number, number> = {
    1: -38248018, 2: 0, 3: 28768960, 4: 766943, 5: -1909287,
    6: 1873170, 7: 30300, 8: 0, 9: 250029, 10: 3570000,
    11: -620000, 12: -840000, 13: -380000, 14: -100000, 15: -400000,
    16: -755000, 17: -3900000, 18: -1280000, 19: -18474992,
  }
  const bankAmt = amounts[day] || 0
  const accBal = acctBal[day] || 0
  const diff = Math.abs(bankAmt - accBal)
  return {
    date: `2026-03-${String(day).padStart(2, '0')}`,
    label,
    bankAmounts: { '신한은행': bankAmt, '국민은행': 0, '농협': 0, '우리은행': 0 },
    bankTotal: bankAmt,
    bankTxTotal: bankTx[day] || 0,
    accountBalance: accBal,
    accountTxTotal: acctTx[day] || 0,
    diff,
    matched: diff === 0,
  }
})

const fmt = (n: number) => n ? n.toLocaleString('ko-KR') : '0'

// 적요 2자 이상 연속 일치 체크
function matchSummary(a: string, b: string): boolean {
  if (!a || !b) return false
  for (let i = 0; i <= a.length - 2; i++) {
    if (b.includes(a.substring(i, i + 2))) return true
  }
  return false
}

// 금액 + 적요 매칭
function findMatch(ledgerAmt: number, ledgerSummary: string, isIncome: boolean, bankTx: { deposit: number; withdrawal: number; detail: string }[], used: Set<number>): number {
  return bankTx.findIndex((b, i) => {
    if (used.has(i)) return false
    const amtMatch = isIncome ? b.deposit === ledgerAmt : b.withdrawal === ledgerAmt
    if (!amtMatch) return false
    return matchSummary(ledgerSummary, b.detail)
  })
}

const subTabs = ['월별 통장잔고 비교', '일별 통장잔고 비교'] as const

// 팝업용 샘플 데이터
const sampleLedger: Record<string, { date: string; summary: string; income: number; expense: number; account: string }[]> = {
  '01': [
    { date: '2026-03-01', summary: '전년도이월금', income: -38248018, expense: 0, account: '전년도 이월금' },
    { date: '2026-03-01', summary: 'ㅇㅇㅇ', income: 0, expense: 10000, account: '자산취득비(자산취득비)' },
  ],
  '03': [
    { date: '2026-03-03', summary: '3월 정부지원 보육료 입금', income: 15524000, expense: 0, account: '정부지원 보육료' },
    { date: '2026-03-03', summary: '3월 인건비 보조금 입금', income: 8594960, expense: 0, account: '인건비 보조금' },
    { date: '2026-03-03', summary: '3월 기관보육료 입금', income: 3200000, expense: 0, account: '기관보육료' },
    { date: '2026-03-03', summary: '3월 연장보육료', income: 1450000, expense: 0, account: '연장보육료' },
  ],
  '05': [
    { date: '2026-03-05', summary: '3월 교직원 기본급 지급', income: 0, expense: 4404593, account: '보육교직원급여' },
    { date: '2026-03-05', summary: '3월 교직원 기본급(2)', income: 0, expense: 3850000, account: '보육교직원급여' },
    { date: '2026-03-05', summary: '3월 퇴직적립금', income: 0, expense: 650000, account: '퇴직금 및 퇴직적립금' },
  ],
}
const sampleBankTx: Record<string, { date: string; accountNo: string; detail: string; deposit: number; withdrawal: number }[]> = {
  '01': [],
  '03': [
    { date: '2026-03-03', accountNo: '110-xxx-xxxx', detail: '사회보장정보원', deposit: 15524000, withdrawal: 0 },
    { date: '2026-03-03', accountNo: '110-xxx-xxxx', detail: '구청 보조금', deposit: 8594960, withdrawal: 0 },
    { date: '2026-03-03', accountNo: '110-xxx-xxxx', detail: '기관보육료', deposit: 3200000, withdrawal: 0 },
    { date: '2026-03-03', accountNo: '110-xxx-xxxx', detail: '연장보육료', deposit: 1450000, withdrawal: 0 },
  ],
  '05': [
    { date: '2026-03-05', accountNo: '110-xxx-xxxx', detail: '급여이체', deposit: 0, withdrawal: 4404593 },
    { date: '2026-03-05', accountNo: '110-xxx-xxxx', detail: '급여이체(2)', deposit: 0, withdrawal: 3850000 },
  ],
}

export default function BalancePage() {
  const [year, setYear] = useState(2026)
  const [activeSubTab, setActiveSubTab] = useState<typeof subTabs[number]>('일별 통장잔고 비교')
  const [dailyMonth, setDailyMonth] = useState('2026-03')
  const [compareDay, setCompareDay] = useState<string | null>(null)
  const [showMismatch, setShowMismatch] = useState(false)
  const [compareFilter, setCompareFilter] = useState<'전체' | '일치' | '불일치'>('불일치')

  const yearOptions = Array.from({ length: 5 }, (_, i) => 2024 + i)

  // 월 드롭다운 (회계연도 3월~다음해2월)
  const monthOptions = (() => {
    const opts: { value: string; label: string }[] = []
    for (let m = 3; m <= 12; m++) opts.push({ value: `${year}-${String(m).padStart(2, '0')}`, label: `${year}년 ${m}월` })
    opts.push({ value: `${year + 1}-01`, label: `${year + 1}년 1월` })
    opts.push({ value: `${year + 1}-02`, label: `${year + 1}년 2월` })
    return opts
  })()

  const renderBalanceTable = (data: { label: string; bankAmounts: Record<string, number>; bankTotal: number; accountBalance: number; diff: number; matched: boolean }[], keyField: string) => (
    <div className="bg-white rounded-xl border border-teal-400/30 shadow-sm overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-teal-50 border-b border-teal-400/30">
            <th rowSpan={2} className="text-center px-4 py-2.5 font-normal text-slate-700 w-32 border-r border-teal-400/20">{keyField === 'month' ? '입금일자' : '일자'}</th>
            <th colSpan={banks.length + 1} className="text-center px-4 py-2 font-normal text-slate-700 border-r border-teal-400/20">계좌잔액</th>
            <th rowSpan={2} className="text-center px-4 py-2.5 font-normal text-slate-700 w-36 border-r border-teal-400/20">
              <div>회계잔액(B)</div>
              <div className="text-[9px] text-slate-400">(회계내역합계)</div>
            </th>
            <th rowSpan={2} className="text-center px-4 py-2.5 font-normal text-slate-700 w-36 border-r border-teal-400/20">
              <div>비교차액(A)-(B)</div>
              <div className="text-[9px] text-slate-400">(거래내역차액)</div>
            </th>
            <th rowSpan={2} className="text-center px-4 py-2.5 font-normal text-slate-700 w-20">
              <div className="relative group inline-flex items-center gap-0.5 cursor-help">
                확인
                <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 01.778-.332 48.294 48.294 0 005.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                </svg>
                <div className="hidden group-hover:block absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-white text-slate-700 text-[11px] rounded-lg px-3 py-2 z-50 w-[220px] shadow-xl border border-blue-200 font-normal">
                  <p>불일치: 당일거래내역 기준 (A)-(B)=차이액 발생</p>
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white border-l border-t border-blue-200 rotate-45"></div>
                </div>
              </div>
            </th>
            {keyField === 'daily' && <th rowSpan={2} className="text-center px-4 py-2.5 font-normal text-slate-700 w-28 border-l border-teal-400/20">전표/통장 비교</th>}
          </tr>
          <tr className="bg-teal-50 border-b border-teal-400/30">
            {banks.map(bank => (
              <th key={bank} className="text-center px-4 py-2 font-normal text-slate-600 w-32 border-r border-teal-400/10">{bank}</th>
            ))}
            <th className="text-center px-4 py-2 font-normal text-slate-700 w-32 border-r border-teal-400/20">
              <div>{keyField === 'daily' ? '계좌합계잔액(A)' : '합계'}</div>
              <div className="text-[9px] text-slate-400 font-normal">(계좌거래내역합계)</div>
            </th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr key={row.label} className={`border-b border-teal-400/20 hover:bg-teal-50 ${idx % 2 === 1 ? 'bg-teal-50/30' : 'bg-white'}`}>
              <td className="text-center px-4 py-3 font-medium text-slate-700 border-r border-teal-400/10">{row.label}</td>
              {banks.map(bank => (
                <td key={bank} className="text-right px-4 py-3 text-slate-600 border-r border-teal-400/10">{fmt(row.bankAmounts[bank])} 원</td>
              ))}
              {(() => {
                const txDiff = Math.abs((row as DailyBalance).bankTxTotal - (row as DailyBalance).accountTxTotal)
                const hasTxData = 'bankTxTotal' in row
                return (<>
                  <td className="text-right px-4 py-3 text-slate-700 font-medium border-r border-teal-400/10">
                    <div>{fmt(row.bankTotal)} 원</div>
                    {hasTxData && <div className="text-[9px] text-slate-400 font-normal">({fmt((row as DailyBalance).bankTxTotal)} 원)</div>}
                  </td>
                  <td className={`text-right px-4 py-3 font-medium border-r border-teal-400/10 ${row.accountBalance < 0 ? 'text-red-600' : 'text-slate-700'}`}>
                    <div>{fmt(row.accountBalance)} 원</div>
                    {hasTxData && <div className="text-[9px] text-slate-400 font-normal">({fmt((row as DailyBalance).accountTxTotal)} 원)</div>}
                  </td>
                  <td className="text-right px-4 py-3 text-slate-700 font-medium border-r border-teal-400/10">
                    <div>{fmt(row.diff)} 원</div>
                    {hasTxData && <div className={`text-[9px] font-normal ${txDiff !== 0 ? 'text-red-500 font-bold' : 'text-slate-400'}`}>({fmt(txDiff)} 원)</div>}
                  </td>
                </>)
              })()}
              <td className="text-center px-4 py-3">
                {!row.matched && row.diff !== 0 ? (
                  <span className="text-red-500 font-bold text-xs">불일치</span>
                ) : <span className="text-blue-500 text-xs font-bold">정상</span>}
              </td>
              {keyField === 'daily' && <td className="text-center px-3 py-3 border-l border-teal-400/20">
                {!row.matched && row.diff !== 0 ? (
                  <button onClick={() => setCompareDay(row.label.replace('일', ''))} className="px-3 py-1 text-[11px] font-bold text-white bg-teal-500 border border-teal-400 rounded hover:bg-teal-600 shadow-sm">보기</button>
                ) : null}
              </td>}
            </tr>
          ))}
          {/* 합계 */}
          {(() => {
            const totalBank: Record<string, number> = {}
            banks.forEach(b => { totalBank[b] = data.reduce((s, r) => s + (r.bankAmounts[b] || 0), 0) })
            const totalBankSum = data.reduce((s, r) => s + r.bankTotal, 0)
            const totalAccount = data.reduce((s, r) => s + r.accountBalance, 0)
            const totalDiff = Math.abs(totalBankSum - totalAccount)
            return (
              <tr className="bg-teal-50 border-t-2 border-teal-400/40 font-medium">
                <td className="text-center px-4 py-3 text-slate-700 border-r border-teal-400/10">합계</td>
                {banks.map(bank => (
                  <td key={bank} className="text-right px-4 py-3 text-slate-700 border-r border-teal-400/10">{fmt(totalBank[bank])} 원</td>
                ))}
                <td className="text-right px-4 py-3 text-slate-800 font-bold border-r border-teal-400/10">{fmt(totalBankSum)} 원</td>
                <td className={`text-right px-4 py-3 font-bold border-r border-teal-400/10 ${totalAccount < 0 ? 'text-red-600' : 'text-slate-800'}`}>{fmt(totalAccount)} 원</td>
                <td className="text-right px-4 py-3 text-slate-800 font-bold border-r border-teal-400/10">{fmt(totalDiff)} 원</td>
                <td className="text-center px-4 py-3">
                  {totalDiff !== 0 && <span className="text-red-500 font-bold text-xs">불일치</span>}
                </td>
                {keyField === 'daily' && <td className="border-l border-teal-400/20"></td>}
              </tr>
            )
          })()}
        </tbody>
      </table>
    </div>
  )

  return (
    <div className="space-y-3">
      {/* 상단 헤더 */}
      <div className="bg-white rounded-xl border border-teal-400/30 shadow-sm">
        <div className="px-4 py-3 flex items-center gap-3 border-b border-teal-400/20 flex-wrap">
          <div>
            <span className="text-sm font-bold text-slate-700">회계잔액 비교</span>
            <p className="text-[11px] text-slate-400">회계잔액과 계좌잔액을 월별 일자별로 비교합니다.</p>
          </div>
          <div className="relative group ml-auto">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg cursor-help">
              <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
              </svg>
              <span className="text-xs text-blue-600 font-medium">참고</span>
            </div>
            <div className="hidden group-hover:block absolute top-full right-0 mt-2 bg-white text-slate-700 text-[11px] rounded-xl px-4 py-3 z-50 w-[440px] shadow-xl border border-blue-200">
              <p className="mb-1.5 flex items-start gap-1"><span className="text-red-500 font-bold">*</span> 계좌잔액 합계잔고(A)와 회계잔액(B)는 반드시 일치해야 합니다</p>
              <p className="flex items-start gap-1"><span className="text-red-500 font-bold">*</span> 계좌잔액(A)와 회계잔액(B)는 미일치시는 통장등록(추가분) 여부 또는 수기입력(전년도이월금,반납전표 등) 반드시 체크바랍니다</p>
              <div className="absolute -top-1.5 right-5 w-3 h-3 bg-white border-l border-t border-blue-200 rotate-45"></div>
            </div>
          </div>
        </div>

        {/* 서브탭 */}
        <div className="px-4 py-2 flex items-center gap-2 border-b border-slate-100">
          <button onClick={() => setActiveSubTab('월별 통장잔고 비교')}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
              activeSubTab === '월별 통장잔고 비교'
                ? 'bg-teal-50 text-[teal-400] border-b-2 border-teal-400 font-bold'
                : 'text-slate-500 hover:text-slate-700'
            }`}>
            월별 통장잔고 비교
          </button>
          {activeSubTab === '월별 통장잔고 비교' && <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500 font-medium">조회년도</span>
            <select value={year} onChange={e => setYear(Number(e.target.value))}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-medium text-slate-700">
              {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>}
          <button onClick={() => setActiveSubTab('일별 통장잔고 비교')}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
              activeSubTab === '일별 통장잔고 비교'
                ? 'bg-teal-50 text-[teal-400] border-b-2 border-teal-400 font-bold'
                : 'text-slate-500 hover:text-slate-700'
            }`}>
            일별 통장잔고 비교
          </button>
          {activeSubTab === '일별 통장잔고 비교' && <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500 font-medium">조회월</span>
            <select value={dailyMonth} onChange={e => setDailyMonth(e.target.value)}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-medium text-slate-700">
              {monthOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>}
        </div>
      </div>

      {/* 월별 통장잔고 비교 */}
      {activeSubTab === '월별 통장잔고 비교' && renderBalanceTable(sampleMonthly, 'month')}

      {/* 일별 통장잔고 비교 */}
      {activeSubTab === '일별 통장잔고 비교' && renderBalanceTable(sampleDaily, 'daily')}

      <div className="pb-40"></div>

      {/* 전표/통장 비교 팝업 */}
      {compareDay && (() => {
        const dayKey = compareDay.padStart(2, '0')
        const dateStr = `${dailyMonth}-${dayKey}`
        const ledger = sampleLedger[dayKey] || []
        const bankTx = sampleBankTx[dayKey] || []
        const ledgerIncomeTotal = ledger.reduce((s, r) => s + r.income, 0)
        const ledgerExpenseTotal = ledger.reduce((s, r) => s + r.expense, 0)
        const bankDepositTotal = bankTx.reduce((s, r) => s + r.deposit, 0)
        const bankWithdrawalTotal = bankTx.reduce((s, r) => s + r.withdrawal, 0)
        const maxRows = Math.max(ledger.length, bankTx.length, 1)
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setCompareDay(null)}>
            <div className="bg-white rounded-xl shadow-2xl w-[1100px] max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="px-6 py-3 border-b border-teal-400/20 rounded-t-xl flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-700">{dateStr} 현금출납부 및 통장거래 현황</h3>
                <div className="flex items-center gap-2">
                  <button onClick={() => setCompareFilter('전체')}
                    className={`px-2 py-0.5 text-[10px] font-bold rounded ${compareFilter === '전체' ? 'bg-teal-500 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>전체</button>
                  <button onClick={() => setCompareFilter('일치')}
                    className={`px-2 py-0.5 text-[10px] font-bold rounded ${compareFilter === '일치' ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>일치</button>
                  <button onClick={() => setCompareFilter('불일치')}
                    className={`px-2 py-0.5 text-[10px] font-bold rounded ${compareFilter === '불일치' ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>불일치</button>
                </div>
              </div>
              <div className="overflow-auto flex-1">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-300">
                      <th colSpan={5} className="text-center px-3 py-2 font-normal text-slate-700 border-r border-slate-300">현금출납부</th>
                      <th colSpan={5} className="text-center px-3 py-2 font-normal text-slate-700">통장거래</th>
                    </tr>
                    <tr className="bg-teal-50 border-b border-teal-400/30">
                      <th className="text-center px-3 py-2 font-normal text-slate-700 w-24">일자</th>
                      <th className="text-left px-3 py-2 font-normal text-slate-700 w-36">적요</th>
                      <th className="text-right px-3 py-2 font-normal text-slate-700 w-28">수입액</th>
                      <th className="text-right px-3 py-2 font-normal text-slate-700 w-28">지출액</th>
                      <th className="text-left px-3 py-2 font-normal text-slate-700 w-40 border-r border-slate-300">계정</th>
                      <th className="text-center px-3 py-2 font-normal text-slate-700 w-24">일자</th>
                      <th className="text-center px-3 py-2 font-normal text-slate-700 w-28">계좌번호</th>
                      <th className="text-left px-3 py-2 font-normal text-slate-700 w-36">거래내역</th>
                      <th className="text-right px-3 py-2 font-normal text-slate-700 w-28">입금액</th>
                      <th className="text-right px-3 py-2 font-normal text-slate-700 w-28">출금액</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      // 매칭 계산
                      const ledgerMatched = new Set<number>()
                      const bankMatched = new Set<number>()
                      ledger.forEach((l, li) => {
                        const amt = l.income || l.expense
                        const isIncome = l.income !== 0
                        const mi = findMatch(amt, l.summary, isIncome, bankTx, bankMatched)
                        if (mi >= 0) { ledgerMatched.add(li); bankMatched.add(mi) }
                      })
                      // 필터링된 행 생성
                      const allRows = Array.from({ length: maxRows }, (_, i) => {
                        const l = ledger[i]
                        const b = bankTx[i]
                        const lMiss = l && !ledgerMatched.has(i)
                        const bMiss = b && !bankMatched.has(i)
                        const lOk = l && ledgerMatched.has(i)
                        const bOk = b && bankMatched.has(i)
                        return { i, l, b, lMiss, bMiss, lOk, bOk }
                      })
                      const filteredRows = allRows.filter(r => {
                        if (compareFilter === '전체') return true
                        if (compareFilter === '일치') return (r.lOk || r.bOk) && !r.lMiss && !r.bMiss
                        return r.lMiss || r.bMiss
                      })
                      return filteredRows.map((r, idx) => (
                        <tr key={r.i} className={`border-b border-teal-400/20 ${idx % 2 === 1 ? 'bg-teal-50/30' : 'bg-white'}`}>
                          <td className={`text-center px-3 py-2.5 text-slate-600 ${r.lMiss ? 'bg-red-100' : ''}`}>{r.l?.date.slice(5) || ''}</td>
                          <td className={`text-left px-3 py-2.5 text-slate-600 ${r.lMiss ? 'bg-red-100 font-bold' : ''}`}>{r.l?.summary || ''}{r.lMiss && <span className="ml-1 text-[9px] text-red-500 font-bold">불일치</span>}</td>
                          <td className={`text-right px-3 py-2.5 text-blue-600 font-medium ${r.lMiss ? 'bg-red-100' : ''}`}>{r.l?.income ? fmt(r.l.income) : ''}</td>
                          <td className={`text-right px-3 py-2.5 text-red-600 font-medium ${r.lMiss ? 'bg-red-100' : ''}`}>{r.l?.expense ? fmt(r.l.expense) : ''}</td>
                          <td className={`text-left px-3 py-2.5 text-slate-500 border-r border-slate-200 ${r.lMiss ? 'bg-red-100' : ''}`}>{r.l?.account || ''}</td>
                          <td className={`text-center px-3 py-2.5 text-slate-600 ${r.bMiss ? 'bg-red-100' : ''}`}>{r.b?.date.slice(5) || ''}</td>
                          <td className={`text-center px-3 py-2.5 text-slate-500 ${r.bMiss ? 'bg-red-100' : ''}`}>{r.b?.accountNo || ''}</td>
                          <td className={`text-left px-3 py-2.5 text-slate-600 ${r.bMiss ? 'bg-red-100 font-bold' : ''}`}>{r.b?.detail || ''}{r.bMiss && <span className="ml-1 text-[9px] text-red-500 font-bold">불일치</span>}</td>
                          <td className={`text-right px-3 py-2.5 text-blue-600 font-medium ${r.bMiss ? 'bg-red-100' : ''}`}>{r.b?.deposit ? fmt(r.b.deposit) : ''}</td>
                          <td className={`text-right px-3 py-2.5 text-red-600 font-medium ${r.bMiss ? 'bg-red-100' : ''}`}>{r.b?.withdrawal ? fmt(r.b.withdrawal) : ''}</td>
                        </tr>
                      ))
                    })()}
                    {/* 합계 */}
                    <tr className="bg-slate-50 border-t border-slate-300 font-medium">
                      <td className="text-center px-3 py-2.5 text-slate-700">합계</td>
                      <td></td>
                      <td className="text-right px-3 py-2.5 text-blue-700">{fmt(ledgerIncomeTotal)}</td>
                      <td className="text-right px-3 py-2.5 text-red-700">{fmt(ledgerExpenseTotal)}</td>
                      <td className="border-r border-slate-200"></td>
                      <td></td>
                      <td></td>
                      <td></td>
                      <td className="text-right px-3 py-2.5 text-blue-700">{fmt(bankDepositTotal)}</td>
                      <td className="text-right px-3 py-2.5 text-red-700">{fmt(bankWithdrawalTotal)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="px-6 py-3 border-t border-slate-100 flex justify-end">
                <button onClick={() => setCompareDay(null)} className="px-5 py-1.5 text-xs font-bold text-white bg-teal-500 rounded-lg hover:bg-teal-600">닫기</button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
