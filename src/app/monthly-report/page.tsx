'use client'

import { useState, useMemo } from 'react'
import { incomeAccounts, expenseAccounts, accountCodeMap, subAccountCodeMap } from '@/lib/accounts'

function fmt(n: number) { return n.toLocaleString('ko-KR') }

function getYmOptions() {
  const now = new Date()
  const opts: string[] = []
  for (let i = 0; i < 24; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    opts.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  return opts
}

type LedgerRow = {
  date: string
  summary: string
  receipt: boolean
  transfer: boolean
  bank: boolean
  tax: boolean
  cash: boolean
  attach: boolean
  docNo: string
  budget: number
  income: number
  expense: number
  balance: number
  linked: number
}

const mockData: LedgerRow[] = [
  { date: '', summary: '전월이월', receipt: false, transfer: false, bank: false, tax: false, cash: false, attach: false, docNo: '', budget: 422168000, income: 263466266, expense: 0, balance: 158701734, linked: 0 },
  { date: '02.03', summary: '롯데카드 강나윤 01월 280,000 정부지원 보육료', receipt: false, transfer: false, bank: false, tax: false, cash: false, attach: false, docNo: 'A000089', budget: 0, income: 279972, expense: 0, balance: 0, linked: 0 },
  { date: '02.04', summary: '삼성카드 김민아 01월 515,000 정부지원 보육료', receipt: false, transfer: false, bank: false, tax: false, cash: false, attach: false, docNo: 'A000090', budget: 0, income: 514949, expense: 0, balance: 0, linked: 0 },
  { date: '02.06', summary: '삼성카드 경한울 01월 426,000 정부지원 보육료', receipt: false, transfer: false, bank: false, tax: false, cash: false, attach: false, docNo: 'A000091', budget: 0, income: 425958, expense: 0, balance: 0, linked: 0 },
  { date: '02.12', summary: 'nh농협 홍하나 01월 280,000 정부지원 보육료', receipt: false, transfer: false, bank: false, tax: false, cash: false, attach: false, docNo: 'A000092', budget: 0, income: 279972, expense: 0, balance: 0, linked: 0 },
  { date: '02.13', summary: '신한카드 김소이 01월 426,000 정부지원 보육료', receipt: false, transfer: false, bank: false, tax: false, cash: false, attach: false, docNo: 'A000093', budget: 0, income: 425958, expense: 0, balance: 0, linked: 0 },
  { date: '02.23', summary: '수수료', receipt: false, transfer: false, bank: false, tax: false, cash: false, attach: false, docNo: 'A000049', budget: 0, income: 2517, expense: 0, balance: 0, linked: 0 },
  { date: '02.24', summary: '신협 이가은 02월 200,000 정부지원 보육료', receipt: false, transfer: false, bank: false, tax: false, cash: false, attach: false, docNo: 'A000094', budget: 0, income: 199980, expense: 0, balance: 0, linked: 0 },
  { date: '02.24', summary: 'nh농협 박도준 02월 280,000 정부지원 보육료', receipt: false, transfer: false, bank: false, tax: false, cash: false, attach: false, docNo: 'A000095', budget: 0, income: 279972, expense: 0, balance: 0, linked: 0 },
  { date: '02.24', summary: '우리카드 함시아 02월 280,000 정부지원 보육료', receipt: false, transfer: false, bank: false, tax: false, cash: false, attach: false, docNo: 'A000096', budget: 0, income: 279972, expense: 0, balance: 0, linked: 0 },
  { date: '02.24', summary: '우체국 최서하 02월 280,000 정부지원 보육료', receipt: false, transfer: false, bank: false, tax: false, cash: false, attach: false, docNo: 'A000097', budget: 0, income: 279972, expense: 0, balance: 0, linked: 0 },
  { date: '02.24', summary: 'ibk기업은행 체첼렌 02월 200,000 정부지원 보육료', receipt: false, transfer: false, bank: false, tax: false, cash: false, attach: false, docNo: 'A000098', budget: 0, income: 199980, expense: 0, balance: 0, linked: 0 },
]

type AccountRow = {
  code: string; name: string; budget: number; income: number; accumIncome: number
  expense: number; accumExpense: number; balance: number; rate: number; isSub?: boolean
  gwanCode?: string; gwanName?: string; hangCode?: string; hangName?: string
}

// 수입 관-항 매핑
const incomeGwanHang: Record<string, { gwanCode: string; gwanName: string; hangCode: string; hangName: string }> = {
  '1111': { gwanCode: '01', gwanName: '보육료', hangCode: '11', hangName: '보육료' },
  '1112': { gwanCode: '01', gwanName: '보육료', hangCode: '11', hangName: '보육료' },
  '1211': { gwanCode: '02', gwanName: '수익자부담 수입', hangCode: '21', hangName: '선택적 보육활동비' },
  '1221': { gwanCode: '02', gwanName: '수익자부담 수입', hangCode: '22', hangName: '기타 필요경비' },
  '1221111': { gwanCode: '02', gwanName: '수익자부담 수입', hangCode: '22', hangName: '기타 필요경비' },
  '1221112': { gwanCode: '02', gwanName: '수익자부담 수입', hangCode: '22', hangName: '기타 필요경비' },
  '1221113': { gwanCode: '02', gwanName: '수익자부담 수입', hangCode: '22', hangName: '기타 필요경비' },
  '1221121': { gwanCode: '02', gwanName: '수익자부담 수입', hangCode: '22', hangName: '기타 필요경비' },
  '1221131': { gwanCode: '02', gwanName: '수익자부담 수입', hangCode: '22', hangName: '기타 필요경비' },
  '1221141': { gwanCode: '02', gwanName: '수익자부담 수입', hangCode: '22', hangName: '기타 필요경비' },
  '1311': { gwanCode: '03', gwanName: '보조금 및 지원금', hangCode: '31', hangName: '인건비 보조금' },
  '1312': { gwanCode: '03', gwanName: '보조금 및 지원금', hangCode: '32', hangName: '운영보조금' },
  '1321': { gwanCode: '03', gwanName: '보조금 및 지원금', hangCode: '32', hangName: '운영보조금' },
  '1323': { gwanCode: '03', gwanName: '보조금 및 지원금', hangCode: '32', hangName: '운영보조금' },
  '1324': { gwanCode: '03', gwanName: '보조금 및 지원금', hangCode: '32', hangName: '운영보조금' },
  '1331': { gwanCode: '03', gwanName: '보조금 및 지원금', hangCode: '33', hangName: '자본 보조금' },
  '1411': { gwanCode: '04', gwanName: '전입금', hangCode: '41', hangName: '전입금' },
  '1511': { gwanCode: '04', gwanName: '전입금', hangCode: '42', hangName: '차입금' },
  '1521': { gwanCode: '04', gwanName: '전입금', hangCode: '42', hangName: '차입금' },
  '1611': { gwanCode: '05', gwanName: '기부금', hangCode: '51', hangName: '기부금' },
  '1612': { gwanCode: '05', gwanName: '기부금', hangCode: '51', hangName: '기부금' },
  '1711': { gwanCode: '06', gwanName: '적립금', hangCode: '61', hangName: '적립금' },
  '1811': { gwanCode: '07', gwanName: '과년도 수입', hangCode: '71', hangName: '과년도 수입' },
  '1911': { gwanCode: '08', gwanName: '잡수입', hangCode: '81', hangName: '잡수입' },
  '1921': { gwanCode: '08', gwanName: '잡수입', hangCode: '81', hangName: '잡수입' },
  '1991': { gwanCode: '09', gwanName: '전년도 이월액', hangCode: '91', hangName: '전년도 이월액' },
  '1992': { gwanCode: '09', gwanName: '전년도 이월액', hangCode: '91', hangName: '전년도 이월액' },
}

// 지출 관-항 매핑
const expenseGwanHang: Record<string, { gwanCode: string; gwanName: string; hangCode: string; hangName: string }> = {
  '2111': { gwanCode: '01', gwanName: '인건비', hangCode: '11', hangName: '원장인건비' },
  '2112': { gwanCode: '01', gwanName: '인건비', hangCode: '11', hangName: '원장인건비' },
  '2121': { gwanCode: '01', gwanName: '인건비', hangCode: '12', hangName: '보육교직원인건비' },
  '2122': { gwanCode: '01', gwanName: '인건비', hangCode: '12', hangName: '보육교직원인건비' },
  '2131': { gwanCode: '01', gwanName: '인건비', hangCode: '13', hangName: '기타인건비' },
  '2141': { gwanCode: '01', gwanName: '인건비', hangCode: '14', hangName: '법정부담금·퇴직금' },
  '2142': { gwanCode: '01', gwanName: '인건비', hangCode: '14', hangName: '법정부담금·퇴직금' },
  '2142311': { gwanCode: '01', gwanName: '인건비', hangCode: '14', hangName: '법정부담금·퇴직금' },
  '2142411': { gwanCode: '01', gwanName: '인건비', hangCode: '14', hangName: '법정부담금·퇴직금' },
  '2211': { gwanCode: '02', gwanName: '관리운영비', hangCode: '21', hangName: '기관운영비' },
  '2212': { gwanCode: '02', gwanName: '관리운영비', hangCode: '21', hangName: '기관운영비' },
  '2213': { gwanCode: '02', gwanName: '관리운영비', hangCode: '21', hangName: '기관운영비' },
  '2214': { gwanCode: '02', gwanName: '관리운영비', hangCode: '21', hangName: '기관운영비' },
  '2215': { gwanCode: '02', gwanName: '관리운영비', hangCode: '21', hangName: '기관운영비' },
  '2216': { gwanCode: '02', gwanName: '관리운영비', hangCode: '21', hangName: '기관운영비' },
  '2217': { gwanCode: '02', gwanName: '관리운영비', hangCode: '21', hangName: '기관운영비' },
  '2217111': { gwanCode: '02', gwanName: '관리운영비', hangCode: '21', hangName: '기관운영비' },
  '2217211': { gwanCode: '02', gwanName: '관리운영비', hangCode: '21', hangName: '기관운영비' },
  '2218': { gwanCode: '02', gwanName: '관리운영비', hangCode: '22', hangName: '업무추진비' },
  '2219': { gwanCode: '02', gwanName: '관리운영비', hangCode: '22', hangName: '업무추진비' },
  '2220': { gwanCode: '02', gwanName: '관리운영비', hangCode: '22', hangName: '업무추진비' },
  '2311': { gwanCode: '03', gwanName: '보육활동비', hangCode: '31', hangName: '보육활동운영비' },
  '2312': { gwanCode: '03', gwanName: '보육활동비', hangCode: '31', hangName: '보육활동운영비' },
  '2313': { gwanCode: '03', gwanName: '보육활동비', hangCode: '31', hangName: '보육활동운영비' },
  '2314': { gwanCode: '03', gwanName: '보육활동비', hangCode: '31', hangName: '보육활동운영비' },
  '2315': { gwanCode: '03', gwanName: '보육활동비', hangCode: '31', hangName: '보육활동운영비' },
  '2411': { gwanCode: '04', gwanName: '수익자부담 지출', hangCode: '41', hangName: '특별활동비' },
  '2421': { gwanCode: '04', gwanName: '수익자부담 지출', hangCode: '42', hangName: '기타필요경비지출' },
  '2421111': { gwanCode: '04', gwanName: '수익자부담 지출', hangCode: '42', hangName: '기타필요경비지출' },
  '2421112': { gwanCode: '04', gwanName: '수익자부담 지출', hangCode: '42', hangName: '기타필요경비지출' },
  '2421113': { gwanCode: '04', gwanName: '수익자부담 지출', hangCode: '42', hangName: '기타필요경비지출' },
  '2421121': { gwanCode: '04', gwanName: '수익자부담 지출', hangCode: '42', hangName: '기타필요경비지출' },
  '2421131': { gwanCode: '04', gwanName: '수익자부담 지출', hangCode: '42', hangName: '기타필요경비지출' },
  '2511': { gwanCode: '05', gwanName: '적립금', hangCode: '51', hangName: '적립금' },
  '2611': { gwanCode: '06', gwanName: '상환금', hangCode: '61', hangName: '차입금상환' },
  '2621': { gwanCode: '06', gwanName: '상환금', hangCode: '61', hangName: '차입금상환' },
  '2631': { gwanCode: '06', gwanName: '상환금', hangCode: '62', hangName: '반환금' },
  '2632': { gwanCode: '06', gwanName: '상환금', hangCode: '62', hangName: '반환금' },
  '2641': { gwanCode: '06', gwanName: '상환금', hangCode: '63', hangName: '전출금' },
  '2711': { gwanCode: '07', gwanName: '시설비', hangCode: '71', hangName: '시설비' },
  '2712': { gwanCode: '07', gwanName: '시설비', hangCode: '71', hangName: '시설비' },
  '2721': { gwanCode: '07', gwanName: '시설비', hangCode: '72', hangName: '자산취득비' },
  '2721111': { gwanCode: '07', gwanName: '시설비', hangCode: '72', hangName: '자산취득비' },
  '2721211': { gwanCode: '07', gwanName: '시설비', hangCode: '72', hangName: '자산취득비' },
  '2811': { gwanCode: '08', gwanName: '과년도 지출', hangCode: '81', hangName: '과년도 지출' },
  '2911': { gwanCode: '09', gwanName: '잡지출·예비비', hangCode: '91', hangName: '잡지출·예비비' },
  '2991': { gwanCode: '09', gwanName: '잡지출·예비비', hangCode: '91', hangName: '잡지출·예비비' },
}

// accountCodeMap(목) + subAccountCodeMap(세목) 기반 계정과목 목록 생성
// 거래내역 페이지와 동일한 구조: account(목) → code 4자리, subAccount(세목) → code 5자리
const accountSummary: AccountRow[] = (() => {
  const rows: AccountRow[] = []
  const allItems = [...incomeAccounts, ...expenseAccounts]
  const seen = new Set<string>()

  for (const item of allItems) {
    if (item.isSub) {
      // 세목: subAccountCodeMap에서 코드 조회 (value 기반 → label 기반 → (지출) 포함 기반)
      const label = item.label
      const valueKey = item.value.replace('세목:', '').replace('필:', '')
      const code = subAccountCodeMap[valueKey] || subAccountCodeMap[label] || subAccountCodeMap[label.replace('(지출)', '')]
      if (!code || seen.has(code)) continue
      seen.add(code)
      rows.push({ code, name: label, isSub: true, budget: 0, income: 0, accumIncome: 0, expense: 0, accumExpense: 0, balance: 0, rate: 0 })
    } else {
      // 목: accountCodeMap에서 코드 조회
      const code = accountCodeMap[item.value] || accountCodeMap[item.label]
      if (!code || seen.has(code)) continue
      seen.add(code)
      rows.push({ code, name: item.label, isSub: false, budget: 0, income: 0, accumIncome: 0, expense: 0, accumExpense: 0, balance: 0, rate: 0 })
    }
  }

  // 코드순 정렬 (목 아래에 세목이 오도록)
  rows.sort((a, b) => a.code.localeCompare(b.code))

  // mock 금액 적용
  const amounts: Record<string, Partial<AccountRow>> = {
    '1111': { budget:422168000, income:26720862, accumIncome:290187128, balance:131980872, rate:68 },
    '1112': { budget:27600000, income:2509952, accumIncome:27501918, balance:98082, rate:99 },
    '1211': { budget:64190800, income:2660000, accumIncome:30611019, balance:33579781, rate:47 },
    '1221': { budget:123940318, income:4034896, accumIncome:49461527, balance:74478791, rate:39 },
    '1221111': { budget:5000000, income:0, accumIncome:2500000, balance:2500000, rate:50 },
    '1221112': { budget:8000000, income:800000, accumIncome:4800000, balance:3200000, rate:60 },
    '1221113': { budget:36000000, income:1234896, accumIncome:14161527, balance:21838473, rate:39 },
    '1221121': { budget:12000000, income:500000, accumIncome:6000000, balance:6000000, rate:50 },
    '1221131': { budget:3000000, income:300000, accumIncome:2400000, balance:600000, rate:80 },
    '1221141': { budget:5940318, income:200000, accumIncome:1600000, balance:4340318, rate:26 },
    '1311': { budget:140941350, income:12960310, accumIncome:140941350, balance:0, rate:100 },
    '1312': { budget:149048000, income:11646000, accumIncome:114751150, balance:34296850, rate:76 },
    '1321': { budget:22320000, income:1679500, accumIncome:19327500, balance:2992500, rate:86 },
    '1323': { budget:86280000, income:7340000, accumIncome:85335000, balance:945000, rate:98 },
    '1324': { budget:150054970, income:12484960, accumIncome:150054970, balance:0, rate:100 },
    '1411': { budget:2364000, income:140000, accumIncome:1680000, balance:684000, rate:71 },
    '1511': { budget:10000000 },
    '2111': { budget:48000000, expense:4000000, accumExpense:44000000, balance:4000000, rate:91 },
    '2112': { budget:6000000, expense:500000, accumExpense:5500000, balance:500000, rate:91 },
    '2121': { budget:180000000, expense:15000000, accumExpense:165000000, balance:15000000, rate:91 },
    '2122': { budget:24000000, expense:2000000, accumExpense:22000000, balance:2000000, rate:91 },
    '2131': { budget:12000000, expense:1000000, accumExpense:11000000, balance:1000000, rate:91 },
    '2141': { budget:36000000, expense:3000000, accumExpense:33000000, balance:3000000, rate:91 },
    '2142': { budget:18000000, expense:1500000, accumExpense:16500000, balance:1500000, rate:91 },
    '2142311': { budget:9000000, expense:750000, accumExpense:8250000, balance:750000, rate:91 },
    '2142411': { budget:9000000, expense:750000, accumExpense:8250000, balance:750000, rate:91 },
    '2211': { budget:24000000, expense:2100000, accumExpense:21500000, balance:2500000, rate:89 },
    '2212': { budget:18000000, expense:1500000, accumExpense:16800000, balance:1200000, rate:93 },
    '2213': { budget:6000000, expense:500000, accumExpense:5500000, balance:500000, rate:91 },
    '2215': { budget:8400000, expense:700000, accumExpense:7700000, balance:700000, rate:91 },
    '2216': { budget:3600000, expense:300000, accumExpense:3300000, balance:300000, rate:91 },
    '2217': { budget:6000000, expense:500000, accumExpense:5200000, balance:800000, rate:86 },
    '2217111': { budget:3000000, expense:250000, accumExpense:2600000, balance:400000, rate:86 },
    '2217211': { budget:3000000, expense:250000, accumExpense:2600000, balance:400000, rate:86 },
    '2311': { budget:2400000, expense:200000, accumExpense:1800000, balance:600000, rate:75 },
    '2312': { budget:4800000, expense:400000, accumExpense:4400000, balance:400000, rate:91 },
    '2315': { budget:48000000, expense:4000000, accumExpense:44000000, balance:4000000, rate:91 },
    '2411': { budget:64190800, expense:2660000, accumExpense:30611019, balance:33579781, rate:47 },
    '2421': { budget:123940318, expense:4034896, accumExpense:49461527, balance:74478791, rate:39 },
  }

  return rows.map(r => {
    const gh = incomeGwanHang[r.code] || expenseGwanHang[r.code]
    return { ...r, ...(amounts[r.code] || {}), gwanCode: gh?.gwanCode, gwanName: gh?.gwanName, hangCode: gh?.hangCode, hangName: gh?.hangName }
  })
})()

const TH = 'px-2 py-2.5 text-center font-bold text-slate-600 whitespace-nowrap border-b border-r border-slate-200 text-[11px]'
const TD = 'px-2 py-2 text-center border-b border-r border-slate-100 text-xs'

export default function MonthlyReportPage() {
  const ymOpts = useMemo(() => getYmOptions(), [])
  const [selectedYm, setSelectedYm] = useState(ymOpts[1])

  const baseAmount = 119329633
  const incomeTotal = 82205830
  const expenseTotal = 84395552
  const balanceTotal = 117139911
  const [acctSort, setAcctSort] = useState<'asc' | 'desc'>('asc')
  const sortedAccounts = useMemo(() => [...accountSummary].sort((a, b) => acctSort === 'asc' ? a.code.localeCompare(b.code) : b.code.localeCompare(a.code)), [acctSort])
  const [detailAccount, setDetailAccount] = useState<AccountRow | null>(null)
  const [showSupplementary, setShowSupplementary] = useState(false)
  const [receiptSetting, setReceiptSetting] = useState('신청완료')
  const [showReceiptConfirm, setShowReceiptConfirm] = useState(false)
  const [showReceiptApply, setShowReceiptApply] = useState(false)

  return (
    <div className="p-6 space-y-4">
      {/* 전표 연동 스텝 */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-4 py-3 border-b border-slate-100">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded">인천 전표 연동</span>
            <div className="relative group">
              <svg className="w-4 h-4 text-slate-400 cursor-pointer hover:text-slate-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
              <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-[9999] hidden group-hover:block pointer-events-none">
                <div className="bg-slate-800 text-white text-[11px] rounded-lg px-4 py-3 shadow-xl leading-relaxed whitespace-nowrap">
                  <div className="absolute left-1/2 -translate-x-1/2 -top-1 w-2 h-2 bg-slate-800 rotate-45" />
                  <p>* 지역연동 회계보고 서비스를 사용 중입니다.</p>
                  <p className="mt-1">* 1번부터 차례대로 눌러주세요. 꼭 개인 인증서로 선택하여 연동하세요.</p>
                  <p className="mt-1">* 회계전표 전송 전 이미지생성은 필수입니다.</p>
                  <p className="mt-1 text-red-300">* 전표전송 중 이미지 미전송 시는 영수증전송설정을 미신청으로 설정바랍니다.</p>
                </div>
              </div>
            </div>
            {receiptSetting === '신청완료' && <button className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded transition-colors">step1. 영수증 이미지생성</button>}
            <button className="px-3 py-1.5 text-xs font-bold text-white bg-teal-500 hover:bg-orange-600 rounded transition-colors">{receiptSetting === '신청완료' ? 'step2. 회계전표 전송' : 'step1. 회계전표 전송'}</button>
            <div className="w-px h-5 bg-slate-200 mx-1" />
            <span className="text-[11px] text-slate-500">전표 전송 : 2026-03-13 17:42:11</span>
            <div className="w-px h-5 bg-slate-200 mx-1" />
            <select className="border border-slate-300 rounded px-2 py-1.5 text-xs font-bold text-slate-600">
              <option>마감전</option>
              <option>조정완료</option>
            </select>
            <div className="w-px h-5 bg-slate-200 mx-1" />
            <span className="text-xs font-bold text-slate-700">영수증전송설정</span>
            <select value={receiptSetting} onChange={e => { if (e.target.value === '미신청') { setShowReceiptConfirm(true) } else { setShowReceiptApply(true) } }} className="border border-slate-300 rounded px-2 py-1 text-xs">
              <option>신청완료</option>
              <option>미신청</option>
            </select>
            <div className="ml-auto flex items-center gap-2">
              <button className="w-8 h-8 flex items-center justify-center bg-white hover:bg-slate-50 border border-slate-300 rounded transition-colors" title="인쇄하기">
                <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2z" /></svg>
              </button>
              <button className="w-8 h-8 flex items-center justify-center bg-white hover:bg-green-50 border border-green-400 rounded transition-colors" title="엑셀저장">
                <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              </button>
            </div>
          </div>
        </div>


      </div>

      {/* 출납연월 요약 */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-4 py-3 flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700">출납연월</span>
            <select value={selectedYm} onChange={e => setSelectedYm(e.target.value)} className="border border-slate-300 rounded px-2 py-1.5 text-xs">
              {ymOpts.map(ym => <option key={ym} value={ym}>{ym}</option>)}
            </select>
            <button className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors">조회</button>
            <label className="flex items-center gap-1 text-xs text-slate-600 cursor-pointer">
              <input type="checkbox" checked={showSupplementary} onChange={e => setShowSupplementary(e.target.checked)} className="rounded border-slate-300" />
              <span className="font-bold">추경필요경비선택</span>
            </label>
          </div>
          <div className="flex items-center gap-6 flex-wrap flex-1 justify-end">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-600">기초액</span>
              <span className="text-sm font-bold text-slate-800">{fmt(baseAmount)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-blue-600">수입액</span>
              <span className="text-sm font-bold text-blue-800">{fmt(incomeTotal)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-red-600">지출액</span>
              <span className="text-sm font-bold text-red-800">{fmt(expenseTotal)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-green-600">잔액</span>
              <span className="text-sm font-bold text-green-800">{fmt(balanceTotal)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 계정과목별 요약 - 수입(좌) / 지출(우) */}
      <div className="grid grid-cols-2 gap-4">
        {/* 수입 */}
        <div className="overflow-x-auto border border-slate-200 rounded-lg bg-white">
          <div className="px-4 py-2 border-b border-blue-200 bg-blue-50">
            <span className="text-xs font-bold text-blue-700">수입</span>
          </div>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-blue-50 border-b border-blue-200">
                <th className={`${TH} w-8`}>관</th>
                <th className={`${TH} w-20`}></th>
                <th className={`${TH} w-8`}>항</th>
                <th className={`${TH} w-20`}></th>
                <th className={`${TH} w-16`}>목</th>
                <th className={TH}>계정과목</th>
                <th className={`${TH} w-12`}>보기</th>
                <th className={`${TH} w-24`}>예산액</th>
                <th className={`${TH} w-24`}>수입금액</th>
                <th className={`${TH} w-24`}>누적수입금액</th>
                <th className={`${TH} w-24`}>잔액</th>
                <th className={`${TH} w-14 border-r-0`}>집행율</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const rows = sortedAccounts.filter(r => r.code.startsWith('1'))
                let prevGwan = '', prevHang = ''
                return rows.map((row, idx) => {
                  const showGwan = row.gwanCode !== prevGwan && !row.isSub
                  const showHang = (row.hangCode !== prevHang || showGwan) && !row.isSub
                  if (!row.isSub) { prevGwan = row.gwanCode || ''; prevHang = row.hangCode || '' }
                  const rawCode = row.code.substring(1)
                  const mokCode = row.isSub ? rawCode.substring(0, 3) + '-' + rawCode.substring(3) : rawCode
                  return (
                    <tr key={idx} className={`transition-colors ${showSupplementary && row.rate > 100 ? 'bg-red-50' : 'hover:bg-slate-50'}`}>
                      <td className={`${TD} text-slate-500 font-medium`}>{showGwan ? row.gwanCode : ''}</td>
                      <td className={`${TD} text-left text-slate-600 text-[11px]`}>{showGwan ? row.gwanName : ''}</td>
                      <td className={`${TD} text-slate-500 font-medium`}>{showHang ? row.hangCode : ''}</td>
                      <td className={`${TD} text-left text-slate-600 text-[11px]`}>{showHang ? row.hangName : ''}</td>
                      <td className={`${TD} font-medium ${row.isSub ? 'text-slate-400' : 'text-slate-600'}`}>{mokCode}</td>
                      <td className={`${TD} text-left px-2 ${row.isSub ? 'text-slate-500 pl-4' : 'text-slate-700 font-medium'}`}>{row.name}</td>
                      <td className={`${TD}`}>
                        {row.income > 0 && <button onClick={() => setDetailAccount(row)} className="text-[10px] font-bold text-blue-600 hover:text-blue-700 px-2 py-0.5 border border-blue-300 bg-blue-50 hover:bg-blue-100 rounded transition-colors">보기</button>}
                      </td>
                      <td className={`${TD} text-right ${row.budget > 0 ? 'text-slate-800 font-medium' : 'text-slate-300'}`}>{fmt(row.budget)}</td>
                      <td className={`${TD} text-right ${row.income > 0 ? 'text-blue-700 font-medium' : 'text-slate-300'}`}>{row.income > 0 ? fmt(row.income) : ''}</td>
                      <td className={`${TD} text-right ${row.accumIncome > 0 ? 'text-slate-800' : 'text-slate-300'}`}>{fmt(row.accumIncome)}</td>
                      <td className={`${TD} text-right ${row.balance > 0 ? 'text-slate-800 font-medium' : 'text-slate-300'}`}>{fmt(row.balance)}</td>
                      <td className={`${TD} text-right border-r-0 font-medium ${row.rate > 100 ? 'text-red-600' : 'text-slate-800'}`}>{row.rate} %</td>
                    </tr>
                  )
                })
              })()}
            </tbody>
          </table>
        </div>

        {/* 지출 */}
        <div className="overflow-x-auto border border-slate-200 rounded-lg bg-white">
          <div className="px-4 py-2 border-b border-red-200 bg-red-50">
            <span className="text-xs font-bold text-red-700">지출</span>
          </div>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-red-50 border-b border-red-200">
                <th className={`${TH} w-8`}>관</th>
                <th className={`${TH} w-20`}></th>
                <th className={`${TH} w-8`}>항</th>
                <th className={`${TH} w-20`}></th>
                <th className={`${TH} w-16`}>목</th>
                <th className={TH}>계정과목</th>
                <th className={`${TH} w-12`}>보기</th>
                <th className={`${TH} w-24`}>예산액</th>
                <th className={`${TH} w-24`}>지출금액</th>
                <th className={`${TH} w-24`}>누적지출금액</th>
                <th className={`${TH} w-24`}>잔액</th>
                <th className={`${TH} w-14 border-r-0`}>집행율</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const rows = sortedAccounts.filter(r => r.code.startsWith('2'))
                let prevGwan = '', prevHang = ''
                return rows.map((row, idx) => {
                  const showGwan = row.gwanCode !== prevGwan && !row.isSub
                  const showHang = (row.hangCode !== prevHang || showGwan) && !row.isSub
                  if (!row.isSub) { prevGwan = row.gwanCode || ''; prevHang = row.hangCode || '' }
                  const rawCode = row.code.substring(1)
                  const mokCode = row.isSub ? rawCode.substring(0, 3) + '-' + rawCode.substring(3) : rawCode
                  return (
                    <tr key={idx} className={`transition-colors ${showSupplementary && row.rate > 100 ? 'bg-red-50' : 'hover:bg-slate-50'}`}>
                      <td className={`${TD} text-slate-500 font-medium`}>{showGwan ? row.gwanCode : ''}</td>
                      <td className={`${TD} text-left text-slate-600 text-[11px]`}>{showGwan ? row.gwanName : ''}</td>
                      <td className={`${TD} text-slate-500 font-medium`}>{showHang ? row.hangCode : ''}</td>
                      <td className={`${TD} text-left text-slate-600 text-[11px]`}>{showHang ? row.hangName : ''}</td>
                      <td className={`${TD} font-medium ${row.isSub ? 'text-slate-400' : 'text-slate-600'}`}>{mokCode}</td>
                      <td className={`${TD} text-left px-2 ${row.isSub ? 'text-slate-500 pl-4' : 'text-slate-700 font-medium'}`}>{row.name}</td>
                      <td className={`${TD}`}>
                        {row.expense > 0 && <button onClick={() => setDetailAccount(row)} className="text-[10px] font-bold text-red-500 hover:text-red-600 px-2 py-0.5 border border-red-300 bg-red-50 hover:bg-red-100 rounded transition-colors">보기</button>}
                      </td>
                      <td className={`${TD} text-right ${row.budget > 0 ? 'text-slate-800 font-medium' : 'text-slate-300'}`}>{fmt(row.budget)}</td>
                      <td className={`${TD} text-right ${row.expense > 0 ? 'text-red-600 font-medium' : 'text-slate-300'}`}>{row.expense > 0 ? fmt(row.expense) : ''}</td>
                      <td className={`${TD} text-right ${row.accumExpense > 0 ? 'text-slate-800' : 'text-slate-300'}`}>{fmt(row.accumExpense)}</td>
                      <td className={`${TD} text-right ${row.balance > 0 ? 'text-slate-800 font-medium' : 'text-slate-300'}`}>{fmt(row.balance)}</td>
                      <td className={`${TD} text-right border-r-0 font-medium ${row.rate > 100 ? 'text-red-600' : 'text-slate-800'}`}>{row.rate} %</td>
                    </tr>
                  )
                })
              })()}
            </tbody>
          </table>
        </div>
      </div>
      {/* 영수증전송설정 확인 팝업 */}
      {showReceiptConfirm && (
        <div className="fixed inset-0 bg-black/40 z-[9999] flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-2xl w-[380px] overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200">
              <p className="text-sm font-bold text-slate-800">영수증전송설정 변경</p>
            </div>
            <div className="px-5 py-5">
              <p className="text-xs text-slate-700">미신청으로 설정 시 영수증은 미전송 됩니다.</p>
            </div>
            <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button onClick={() => setShowReceiptConfirm(false)} className="px-4 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded transition-colors">취소</button>
              <button onClick={() => { setReceiptSetting('미신청'); setShowReceiptConfirm(false) }} className="px-4 py-1.5 text-xs font-bold text-white bg-teal-500 hover:bg-orange-600 rounded transition-colors">확인</button>
            </div>
          </div>
        </div>
      )}

      {/* 영수증전송설정 신청완료 팝업 */}
      {showReceiptApply && (
        <div className="fixed inset-0 bg-black/40 z-[9999] flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-2xl w-[380px] overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200">
              <p className="text-sm font-bold text-slate-800">영수증전송설정 변경</p>
            </div>
            <div className="px-5 py-5">
              <p className="text-xs text-slate-700">신청완료로 설정 시 영수증이 함께 전송됩니다.</p>
            </div>
            <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button onClick={() => setShowReceiptApply(false)} className="px-4 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded transition-colors">취소</button>
              <button onClick={() => { setReceiptSetting('신청완료'); setShowReceiptApply(false) }} className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors">확인</button>
            </div>
          </div>
        </div>
      )}

      {/* 세부내역 팝업 */}
      {detailAccount && (
        <div className="fixed inset-0 bg-black/40 z-[9999] flex items-center justify-center" onClick={() => setDetailAccount(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-[800px] max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${detailAccount.code.startsWith('1') ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600'}`}>{detailAccount.isSub ? '세목' : '목'}</span>
                <span className="text-sm font-bold text-slate-800">{detailAccount.code} {detailAccount.name}</span>
                <span className="text-xs text-slate-400">현금출납부</span>
              </div>
              <button onClick={() => setDetailAccount(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-4 text-xs">
              <span className="text-slate-500">예산액 <span className="font-bold text-slate-700">{fmt(detailAccount.budget)}</span></span>
              {detailAccount.code.startsWith('1') ? (
                <>
                  <span className="text-slate-500">수입금액 <span className="font-bold text-blue-700">{fmt(detailAccount.income)}</span></span>
                  <span className="text-slate-500">누적수입 <span className="font-bold text-blue-600">{fmt(detailAccount.accumIncome)}</span></span>
                </>
              ) : (
                <>
                  <span className="text-slate-500">지출금액 <span className="font-bold text-red-600">{fmt(detailAccount.expense)}</span></span>
                  <span className="text-slate-500">누적지출 <span className="font-bold text-red-500">{fmt(detailAccount.accumExpense)}</span></span>
                </>
              )}
              <span className="text-slate-500">잔액 <span className="font-bold text-green-700">{fmt(detailAccount.balance)}</span></span>
              <span className="text-slate-500">집행율 <span className="font-bold">{detailAccount.rate}%</span></span>
            </div>
            <div className="overflow-auto max-h-[55vh]">
              <table className="w-full text-xs border-collapse">
                <thead className="sticky top-0">
                  <tr className="bg-teal-50 border-b border-orange-200">
                    <th className={`${TH} w-16`}>월일</th>
                    <th className={`${TH} min-w-[240px]`}>적요</th>
                    <th className={`${TH} w-24`}>증빙서번호</th>
                    <th className={`${TH} w-28`}>{detailAccount.code.startsWith('1') ? '수입금액' : '지출금액'}</th>
                    <th className={`${TH} w-28 border-r-0`}>잔액</th>
                  </tr>
                </thead>
                <tbody>
                  {detailAccount.code.startsWith('1') ? (
                    <>
                      <tr className="bg-slate-50"><td className={TD}></td><td className={`${TD} text-left px-3 font-medium text-slate-600`}>전월이월</td><td className={TD}></td><td className={`${TD} text-right font-medium text-blue-700`}>{fmt(detailAccount.accumIncome - detailAccount.income)}</td><td className={`${TD} text-right font-medium text-green-700 border-r-0`}>{fmt(detailAccount.accumIncome - detailAccount.income)}</td></tr>
                      {mockData.filter(d => d.docNo).slice(0, 6).map((d, i) => (
                        <tr key={i} className="hover:bg-slate-50"><td className={`${TD} text-slate-600`}>{d.date.replace('20260', '0')}</td><td className={`${TD} text-left px-3 text-slate-700`}>{d.summary}</td><td className={`${TD} text-slate-500`}>{d.docNo}</td><td className={`${TD} text-right text-blue-700 font-medium`}>{fmt(d.income || Math.floor(Math.random() * 500000) + 100000)}</td><td className={`${TD} text-right text-green-700 border-r-0`}>{fmt(detailAccount.accumIncome - detailAccount.income + (i + 1) * 280000)}</td></tr>
                      ))}
                    </>
                  ) : (
                    <>
                      {mockData.filter(d => d.expense > 0).slice(0, 8).map((d, i) => (
                        <tr key={i} className="hover:bg-slate-50"><td className={`${TD} text-slate-600`}>{d.date.replace('2026-', '')}</td><td className={`${TD} text-left px-3 text-slate-700`}>{d.summary}</td><td className={`${TD} text-slate-500`}>{d.docNo}</td><td className={`${TD} text-right text-red-600 font-medium`}>{fmt(d.expense)}</td><td className={`${TD} text-right text-green-700 border-r-0`}>{fmt(detailAccount.balance + (8 - i) * d.expense)}</td></tr>
                      ))}
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
