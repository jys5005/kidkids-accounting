'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import DraggableModal from '@/components/DraggableModal'
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

// 전표관리(voucher/input)와 동일한 필드만 사용 — 실제 저장된 전표 데이터 조회용
interface VoucherRow {
  id: number
  date: string
  type: '수입' | '지출' | '반납'
  amount: number
  summary: string
  accountCode?: string
  srcNo?: string
}

interface BasisItem { total: number }

type AccountRow = {
  code: string; name: string; budget: number; income: number; accumIncome: number
  expense: number; accumExpense: number; balance: number; rate: number; isSub?: boolean
  gwanCode?: string; gwanName?: string; hangCode?: string; hangName?: string
}

// 수입 관-항 매핑 (accounts.ts 의 accountCodeMap/subAccountCodeMap 이 실제로 만드는 코드 그대로 — 목 4자리 / 세목 5자리)
const incomeGwanHang: Record<string, { gwanCode: string; gwanName: string; hangCode: string; hangName: string }> = {
  '1111': { gwanCode: '01', gwanName: '보육료', hangCode: '11', hangName: '보육료' },
  '1112': { gwanCode: '01', gwanName: '보육료', hangCode: '11', hangName: '보육료' },
  '1211': { gwanCode: '02', gwanName: '수익자부담 수입', hangCode: '21', hangName: '선택적 보육활동비' },
  '1221': { gwanCode: '02', gwanName: '수익자부담 수입', hangCode: '22', hangName: '기타 필요경비' },
  '12211': { gwanCode: '02', gwanName: '수익자부담 수입', hangCode: '22', hangName: '기타 필요경비' },
  '12212': { gwanCode: '02', gwanName: '수익자부담 수입', hangCode: '22', hangName: '기타 필요경비' },
  '12213': { gwanCode: '02', gwanName: '수익자부담 수입', hangCode: '22', hangName: '기타 필요경비' },
  '12214': { gwanCode: '02', gwanName: '수익자부담 수입', hangCode: '22', hangName: '기타 필요경비' },
  '12215': { gwanCode: '02', gwanName: '수익자부담 수입', hangCode: '22', hangName: '기타 필요경비' },
  '12216': { gwanCode: '02', gwanName: '수익자부담 수입', hangCode: '22', hangName: '기타 필요경비' },
  '1311': { gwanCode: '03', gwanName: '보조금 및 지원금', hangCode: '31', hangName: '인건비 보조금' },
  '1312': { gwanCode: '03', gwanName: '보조금 및 지원금', hangCode: '32', hangName: '운영보조금' },
  '1321': { gwanCode: '03', gwanName: '보조금 및 지원금', hangCode: '32', hangName: '운영보조금' },
  '1323': { gwanCode: '03', gwanName: '보조금 및 지원금', hangCode: '32', hangName: '운영보조금' },
  '1324': { gwanCode: '03', gwanName: '보조금 및 지원금', hangCode: '32', hangName: '운영보조금' },
  '1331': { gwanCode: '03', gwanName: '보조금 및 지원금', hangCode: '33', hangName: '자본 보조금' },
  '1411': { gwanCode: '04', gwanName: '전입금', hangCode: '41', hangName: '전입금' },
  '1421': { gwanCode: '04', gwanName: '전입금', hangCode: '42', hangName: '차입금' },
  '1422': { gwanCode: '04', gwanName: '전입금', hangCode: '42', hangName: '차입금' },
  '1511': { gwanCode: '05', gwanName: '기부금', hangCode: '51', hangName: '기부금' },
  '1512': { gwanCode: '05', gwanName: '기부금', hangCode: '51', hangName: '기부금' },
  '1611': { gwanCode: '06', gwanName: '적립금', hangCode: '61', hangName: '적립금' },
  '1711': { gwanCode: '07', gwanName: '과년도 수입', hangCode: '71', hangName: '과년도 수입' },
  '1811': { gwanCode: '08', gwanName: '잡수입', hangCode: '81', hangName: '잡수입' },
  '1812': { gwanCode: '08', gwanName: '잡수입', hangCode: '81', hangName: '잡수입' },
  '1911': { gwanCode: '09', gwanName: '전년도 이월액', hangCode: '91', hangName: '전년도 이월액' },
  '1912': { gwanCode: '09', gwanName: '전년도 이월액', hangCode: '91', hangName: '전년도 이월액' },
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
  '21423': { gwanCode: '01', gwanName: '인건비', hangCode: '14', hangName: '법정부담금·퇴직금' },
  '21424': { gwanCode: '01', gwanName: '인건비', hangCode: '14', hangName: '법정부담금·퇴직금' },
  '2211': { gwanCode: '02', gwanName: '관리운영비', hangCode: '21', hangName: '기관운영비' },
  '2212': { gwanCode: '02', gwanName: '관리운영비', hangCode: '21', hangName: '기관운영비' },
  '2213': { gwanCode: '02', gwanName: '관리운영비', hangCode: '21', hangName: '기관운영비' },
  '2214': { gwanCode: '02', gwanName: '관리운영비', hangCode: '21', hangName: '기관운영비' },
  '2215': { gwanCode: '02', gwanName: '관리운영비', hangCode: '21', hangName: '기관운영비' },
  '2216': { gwanCode: '02', gwanName: '관리운영비', hangCode: '21', hangName: '기관운영비' },
  '2217': { gwanCode: '02', gwanName: '관리운영비', hangCode: '21', hangName: '기관운영비' },
  '22171': { gwanCode: '02', gwanName: '관리운영비', hangCode: '21', hangName: '기관운영비' },
  '22172': { gwanCode: '02', gwanName: '관리운영비', hangCode: '21', hangName: '기관운영비' },
  '2221': { gwanCode: '02', gwanName: '관리운영비', hangCode: '22', hangName: '업무추진비' },
  '2222': { gwanCode: '02', gwanName: '관리운영비', hangCode: '22', hangName: '업무추진비' },
  '2223': { gwanCode: '02', gwanName: '관리운영비', hangCode: '22', hangName: '업무추진비' },
  '2311': { gwanCode: '03', gwanName: '보육활동비', hangCode: '31', hangName: '보육활동운영비' },
  '2312': { gwanCode: '03', gwanName: '보육활동비', hangCode: '31', hangName: '보육활동운영비' },
  '2313': { gwanCode: '03', gwanName: '보육활동비', hangCode: '31', hangName: '보육활동운영비' },
  '2314': { gwanCode: '03', gwanName: '보육활동비', hangCode: '31', hangName: '보육활동운영비' },
  '2315': { gwanCode: '03', gwanName: '보육활동비', hangCode: '31', hangName: '보육활동운영비' },
  '2411': { gwanCode: '04', gwanName: '수익자부담 지출', hangCode: '41', hangName: '특별활동비' },
  '2421': { gwanCode: '04', gwanName: '수익자부담 지출', hangCode: '42', hangName: '기타필요경비지출' },
  '24211': { gwanCode: '04', gwanName: '수익자부담 지출', hangCode: '42', hangName: '기타필요경비지출' },
  '24212': { gwanCode: '04', gwanName: '수익자부담 지출', hangCode: '42', hangName: '기타필요경비지출' },
  '24213': { gwanCode: '04', gwanName: '수익자부담 지출', hangCode: '42', hangName: '기타필요경비지출' },
  '24214': { gwanCode: '04', gwanName: '수익자부담 지출', hangCode: '42', hangName: '기타필요경비지출' },
  '24215': { gwanCode: '04', gwanName: '수익자부담 지출', hangCode: '42', hangName: '기타필요경비지출' },
  '24216': { gwanCode: '04', gwanName: '수익자부담 지출', hangCode: '42', hangName: '기타필요경비지출' },
  '2511': { gwanCode: '05', gwanName: '적립금', hangCode: '51', hangName: '적립금' },
  '2611': { gwanCode: '06', gwanName: '상환금', hangCode: '61', hangName: '차입금상환' },
  '2612': { gwanCode: '06', gwanName: '상환금', hangCode: '61', hangName: '차입금상환' },
  '2621': { gwanCode: '06', gwanName: '상환금', hangCode: '62', hangName: '반환금' },
  '2622': { gwanCode: '06', gwanName: '상환금', hangCode: '62', hangName: '반환금' },
  '2623': { gwanCode: '06', gwanName: '상환금', hangCode: '63', hangName: '전출금' },
  '2711': { gwanCode: '07', gwanName: '시설비', hangCode: '71', hangName: '시설비' },
  '2712': { gwanCode: '07', gwanName: '시설비', hangCode: '71', hangName: '시설비' },
  '2721': { gwanCode: '07', gwanName: '시설비', hangCode: '72', hangName: '자산취득비' },
  '27211': { gwanCode: '07', gwanName: '시설비', hangCode: '72', hangName: '자산취득비' },
  '27212': { gwanCode: '07', gwanName: '시설비', hangCode: '72', hangName: '자산취득비' },
  '2811': { gwanCode: '08', gwanName: '과년도 지출', hangCode: '81', hangName: '과년도 지출' },
  '2911': { gwanCode: '09', gwanName: '잡지출·예비비', hangCode: '91', hangName: '잡지출·예비비' },
  '2991': { gwanCode: '09', gwanName: '잡지출·예비비', hangCode: '91', hangName: '잡지출·예비비' },
}

// accountCodeMap(목) + subAccountCodeMap(세목) 기반 계정과목 뼈대(코드/이름/관/항) — 금액과 무관, 데이터 로드 전에도 고정
const skeletonRows: Omit<AccountRow, 'budget' | 'income' | 'accumIncome' | 'expense' | 'accumExpense' | 'balance' | 'rate'>[] = (() => {
  const rows: Omit<AccountRow, 'budget' | 'income' | 'accumIncome' | 'expense' | 'accumExpense' | 'balance' | 'rate'>[] = []
  const allItems = [...incomeAccounts, ...expenseAccounts]
  const seen = new Set<string>()

  for (const item of allItems) {
    if (item.isSub) {
      const label = item.label
      const valueKey = item.value.replace('세목:', '').replace('필:', '')
      const code = subAccountCodeMap[valueKey] || subAccountCodeMap[label] || subAccountCodeMap[label.replace('(지출)', '')]
      if (!code || seen.has(code)) continue
      seen.add(code)
      rows.push({ code, name: label, isSub: true })
    } else {
      const code = accountCodeMap[item.value] || accountCodeMap[item.label]
      if (!code || seen.has(code)) continue
      seen.add(code)
      rows.push({ code, name: item.label, isSub: false })
    }
  }

  rows.sort((a, b) => a.code.localeCompare(b.code))
  return rows.map(r => {
    const gh = incomeGwanHang[r.code] || expenseGwanHang[r.code]
    return { ...r, gwanCode: gh?.gwanCode, gwanName: gh?.gwanName, hangCode: gh?.hangCode, hangName: gh?.hangName }
  })
})()

// 목(4자리) → 그 아래 세목(5자리) 코드 목록 — 세목이 있는 목은 자기 코드 + 세목들 합산해서 보여줌
const childCodesByParent: Record<string, string[]> = (() => {
  const map: Record<string, string[]> = {}
  for (const r of skeletonRows) {
    if (r.isSub && r.code.length >= 5) {
      const parent = r.code.substring(0, 4)
      if (!map[parent]) map[parent] = []
      map[parent].push(r.code)
    }
  }
  return map
})()

const TH = 'px-2 py-2.5 text-center font-bold text-slate-600 whitespace-nowrap border-b border-r border-slate-200 text-[11px]'
const TD = 'px-2 py-2 text-center border-b border-r border-slate-100 text-xs'

export default function MonthlyReportPage() {
  const ymOpts = useMemo(() => getYmOptions(), [])
  const [selectedYm, setSelectedYm] = useState(ymOpts[1])
  const [vouchers, setVouchers] = useState<VoucherRow[]>([])
  const [basisByMok, setBasisByMok] = useState<Record<string, BasisItem[]>>({})
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState('')

  const fiscalYear = useMemo(() => {
    const [y, m] = selectedYm.split('-').map(Number)
    return m >= 3 ? y : y - 1
  }, [selectedYm])

  const loadData = useCallback(async () => {
    setLoading(true); setLoadError('')
    try {
      const [voucherRes, budgetRes] = await Promise.all([
        fetch('/api/voucher/list?book=').then(r => r.json()),
        fetch(`/api/budget?book=&year=${fiscalYear}`).then(r => r.json()),
      ])
      setVouchers(Array.isArray(voucherRes?.list) ? voucherRes.list : [])
      const savedBasis = (Array.isArray(budgetRes?.list) && budgetRes.list[0] && budgetRes.list[0].basisByMok) || {}
      setBasisByMok(savedBasis)
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : '데이터 조회 실패')
    } finally {
      setLoading(false)
    }
  }, [fiscalYear])

  useEffect(() => { loadData() }, [loadData])

  // 회계연도 3월 시작 — 기초액(전월까지 누적)/당월/누적(연초~당월) 계산 기준일
  const fyStart = `${fiscalYear}-03-01`
  const monthStart = `${selectedYm}-01`
  const monthEnd = `${selectedYm}-32` // 문자열 비교용 상한(실제 존재하지 않는 날짜, 31일 이하는 전부 이보다 작음)

  const budgetSum = useCallback((code: string) => (basisByMok[code] || []).reduce((s, it) => s + (Number(it?.total) || 0), 0), [basisByMok])

  const accountSummary: AccountRow[] = useMemo(() => {
    const incomeByCode = new Map<string, VoucherRow[]>()
    const expenseByCode = new Map<string, VoucherRow[]>()
    for (const v of vouchers) {
      if (!v.accountCode) continue
      const map = v.type === '수입' ? incomeByCode : v.type === '지출' ? expenseByCode : null
      if (!map) continue
      if (!map.has(v.accountCode)) map.set(v.accountCode, [])
      map.get(v.accountCode)!.push(v)
    }

    return skeletonRows.map(r => {
      const isIncome = r.code.startsWith('1')
      const byCode = isIncome ? incomeByCode : expenseByCode
      const relatedCodes = r.isSub ? [r.code] : [r.code, ...(childCodesByParent[r.code] || [])]

      let curAmt = 0, accumAmt = 0
      for (const code of relatedCodes) {
        for (const v of byCode.get(code) || []) {
          if (v.date >= fyStart && v.date <= monthEnd) accumAmt += v.amount
          if (v.date >= monthStart && v.date <= monthEnd) curAmt += v.amount
        }
      }
      let budget = budgetSum(r.code)
      if (!r.isSub) for (const c of (childCodesByParent[r.code] || [])) budget += budgetSum(c)

      const balance = budget - accumAmt
      const rate = budget > 0 ? Math.round((accumAmt / budget) * 100) : 0

      return {
        ...r,
        budget,
        income: isIncome ? curAmt : 0,
        accumIncome: isIncome ? accumAmt : 0,
        expense: !isIncome ? curAmt : 0,
        accumExpense: !isIncome ? accumAmt : 0,
        balance,
        rate,
      }
    })
  }, [vouchers, fyStart, monthStart, monthEnd, budgetSum])

  // 기초액(전월까지 누적 수입-지출) / 당월 수입·지출 합계 / 회계잔액
  const baseAmount = useMemo(() => {
    let s = 0
    for (const v of vouchers) {
      if (v.date >= fyStart && v.date < monthStart) {
        if (v.type === '수입') s += v.amount
        else if (v.type === '지출') s -= v.amount
      }
    }
    return s
  }, [vouchers, fyStart, monthStart])
  const incomeTotal = useMemo(() => vouchers.filter(v => v.type === '수입' && v.date >= monthStart && v.date <= monthEnd).reduce((s, v) => s + v.amount, 0), [vouchers, monthStart, monthEnd])
  const expenseTotal = useMemo(() => vouchers.filter(v => v.type === '지출' && v.date >= monthStart && v.date <= monthEnd).reduce((s, v) => s + v.amount, 0), [vouchers, monthStart, monthEnd])
  const balanceTotal = baseAmount + incomeTotal - expenseTotal

  const [acctSort, setAcctSort] = useState<'asc' | 'desc'>('asc')
  const sortedAccounts = useMemo(() => [...accountSummary].sort((a, b) => acctSort === 'asc' ? a.code.localeCompare(b.code) : b.code.localeCompare(a.code)), [accountSummary, acctSort])
  const [detailAccount, setDetailAccount] = useState<AccountRow | null>(null)
  const [showSupplementary, setShowSupplementary] = useState(false)
  const [receiptSetting, setReceiptSetting] = useState('신청완료')
  const [showReceiptConfirm, setShowReceiptConfirm] = useState(false)
  const [showReceiptApply, setShowReceiptApply] = useState(false)

  // 세부내역 팝업용 — 선택한 계정(목/세목)의 당월 실제 전표만 날짜순으로
  const detailRows = useMemo(() => {
    if (!detailAccount) return []
    const codes = detailAccount.isSub ? [detailAccount.code] : [detailAccount.code, ...(childCodesByParent[detailAccount.code] || [])]
    const wantType = detailAccount.code.startsWith('1') ? '수입' : '지출'
    return vouchers
      .filter(v => v.accountCode && codes.includes(v.accountCode) && v.type === wantType && v.date >= monthStart && v.date <= monthEnd)
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [detailAccount, vouchers, monthStart, monthEnd])

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
            <button className="px-3 py-1.5 text-xs font-bold text-white bg-teal-500 hover:bg-teal-600 rounded transition-colors">{receiptSetting === '신청완료' ? 'step2. 회계전표 전송' : 'step1. 회계전표 전송'}</button>
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
                <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5z" /></svg>
              </button>
              <button className="w-8 h-8 flex items-center justify-center bg-white hover:bg-green-50 border border-green-400 rounded transition-colors" title="엑셀저장">
                <svg className="w-4 h-4 text-green-600" viewBox="0 0 24 24" fill="currentColor"><path d="M14.2 1H5.8C4.81 1 4 1.81 4 2.8v18.4c0 .99.81 1.8 1.8 1.8h12.4c.99 0 1.8-.81 1.8-1.8V6.8L14.2 1zM15.8 19.3l-2.1-3.5-2.1 3.5H9.8l3.2-5-2.9-4.7h1.8l2.1 3.3 2-3.3h1.8l-2.9 4.7 3.2 5h-2.3z" /></svg>
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
            <button onClick={loadData} disabled={loading} className="px-3 py-1.5 text-xs font-bold text-white bg-teal-500 hover:bg-teal-600 disabled:opacity-50 rounded transition-colors">
              {loading ? '조회 중…' : '조회'}
            </button>
            <label className="flex items-center gap-1 text-xs text-slate-600 cursor-pointer">
              <input type="checkbox" checked={showSupplementary} onChange={e => setShowSupplementary(e.target.checked)} className="rounded border-slate-300" />
              <span className="font-bold">추경필요경비선택</span>
            </label>
            {loadError && <span className="text-xs text-rose-600 font-medium">⚠ {loadError}</span>}
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
          <table className="w-full text-[11px] border-collapse">
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
          <table className="w-full text-[11px] border-collapse">
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
        <DraggableModal onClose={() => setShowReceiptConfirm(false)} title="영수증전송설정 변경" className="w-[380px]">
            <div className="px-5 py-5">
              <p className="text-xs text-slate-700">미신청으로 설정 시 영수증은 미전송 됩니다.</p>
            </div>
            <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button onClick={() => setShowReceiptConfirm(false)} className="px-4 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded transition-colors">취소</button>
              <button onClick={() => { setReceiptSetting('미신청'); setShowReceiptConfirm(false) }} className="px-4 py-1.5 text-xs font-bold text-white bg-teal-500 hover:bg-teal-600 rounded transition-colors">확인</button>
            </div>
        </DraggableModal>
      )}

      {/* 영수증전송설정 신청완료 팝업 */}
      {showReceiptApply && (
        <DraggableModal onClose={() => setShowReceiptApply(false)} title="영수증전송설정 변경" className="w-[380px]">
            <div className="px-5 py-5">
              <p className="text-xs text-slate-700">신청완료로 설정 시 영수증이 함께 전송됩니다.</p>
            </div>
            <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button onClick={() => setShowReceiptApply(false)} className="px-4 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded transition-colors">취소</button>
              <button onClick={() => { setReceiptSetting('신청완료'); setShowReceiptApply(false) }} className="px-4 py-1.5 text-xs font-bold text-white bg-teal-500 hover:bg-teal-600 rounded transition-colors">확인</button>
            </div>
        </DraggableModal>
      )}

      {/* 세부내역 팝업 — 선택 계정의 당월 실제 전표 */}
      {detailAccount && (
        <DraggableModal onClose={() => setDetailAccount(null)} title={`${detailAccount.code} ${detailAccount.name} 현금출납부`} className="w-[800px] max-h-[80vh] overflow-hidden">
            <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-4 text-xs">
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${detailAccount.code.startsWith('1') ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600'}`}>{detailAccount.isSub ? '세목' : '목'}</span>
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
              <table className="w-full text-[11px] border-collapse">
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
                  {detailRows.length === 0 ? (
                    <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-400">해당 월 전표가 없습니다.</td></tr>
                  ) : (
                    (() => {
                      let running = detailAccount.code.startsWith('1') ? (detailAccount.accumIncome - detailAccount.income) : detailAccount.balance
                      return detailRows.map((d, i) => {
                        if (detailAccount.code.startsWith('1')) running += d.amount
                        else running -= d.amount
                        return (
                          <tr key={d.id ?? i} className="hover:bg-slate-50">
                            <td className={`${TD} text-slate-600`}>{d.date.slice(5).replace('-', '/')}</td>
                            <td className={`${TD} text-left px-3 text-slate-700`}>{d.summary}</td>
                            <td className={`${TD} text-slate-500`}>{d.srcNo || d.id}</td>
                            <td className={`${TD} text-right font-medium ${detailAccount.code.startsWith('1') ? 'text-blue-700' : 'text-red-600'}`}>{fmt(d.amount)}</td>
                            <td className={`${TD} text-right text-green-700 border-r-0`}>{fmt(running)}</td>
                          </tr>
                        )
                      })
                    })()
                  )}
                </tbody>
              </table>
            </div>
        </DraggableModal>
      )}
    </div>
  )
}
