'use client'
import React, { useMemo, useState } from 'react'

type Tab = 'withholding' | 'wage-statement' | 'retirement-statement'

const inputCls = "border border-teal-300 rounded px-2 py-1 text-[12px] focus:outline-none focus:border-teal-500"
const labelCls = "text-[12px] font-medium text-slate-700 bg-slate-50 px-3 py-2 border-r border-slate-200 whitespace-nowrap w-[140px] min-w-[140px]"
const cellCls = "px-3 py-2 text-[12px]"

const mockEmployer = {
  bizNo: '1234567890',
  name: '미래클어린이집',
  ceo: '김경미',
  director: '최은주',
  addr: '인천광역시 미추홀구 ○○로 12',
  taxOffice: '남인천세무서',
  taxOfficeCd: '137',
  phone: '032-584-9019',
  email: '',
}

// ===================== 공통 헬퍼 =====================
const won = (n: number) => n.toLocaleString('ko-KR')
const wonShort = (n: number) => {
  if (Math.abs(n) >= 10_000_000) return (n / 10_000_000).toFixed(1) + '천만'
  if (Math.abs(n) >= 10_000) return Math.round(n / 10_000).toLocaleString('ko-KR') + '만'
  return n.toLocaleString('ko-KR')
}
const stamp = () => new Date().toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })

// cp949 byte length 기준 (한글 2byte / ASCII 1byte)
function byteLen(s: string): number {
  let n = 0
  for (const ch of s) n += ((ch.codePointAt(0) ?? 0) < 128) ? 1 : 2
  return n
}
function padByte(s: string, len: number, ch = ' ', right = false): string {
  s = s ?? ''
  let out = ''
  let n = 0
  for (const c of s) {
    const w = ((c.codePointAt(0) ?? 0) < 128) ? 1 : 2
    if (n + w > len) break
    out += c
    n += w
  }
  while (n < len) { out = right ? ch + out : out + ch; n += 1 }
  return out
}
function padNum(n: number, len: number): string {
  const v = Math.trunc(n)
  if (v < 0) return '-' + String(-v).padStart(len - 1, '0')
  return String(v).padStart(len, '0')
}
const yyyymmdd = (d = new Date()) => `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`

// ===================== 원천세 본표 =====================
type WhCode = 'A01' | 'A02' | 'A03' | 'A10' | 'A20' | 'A99'
const WH_LABELS: Record<WhCode, string> = {
  A01: '근로소득 간이세액', A02: '근로소득 중도퇴사', A03: '근로소득 일용근로',
  A10: '근로소득 가감계', A20: '퇴직소득', A99: '총합계',
}
type WhRow = {
  code: WhCode
  count: number
  payAmt: number
  incomeTax: number      // 음수 가능: A02/A20 등
  ruralTax: number
  penalty: number
  monthlyRefund: number
  payIncomeTax: number
  payRuralTax: number
}

function makeMonthly(year: string): Record<string, WhRow[]> {
  const r: Record<string, WhRow[]> = {}
  for (let i = 1; i <= 12; i++) {
    const m = String(i).padStart(2, '0')
    const head = 8 + (i % 3 === 0 ? 1 : 0)
    const a01: WhRow = { code: 'A01', count: head, payAmt: 24_500_000 + i * 120_000, incomeTax: 412_330 + i * 4_500, ruralTax: 0, penalty: 0, monthlyRefund: 0, payIncomeTax: 412_330 + i * 4_500, payRuralTax: 0 }
    const a02: WhRow = i === 7
      ? { code: 'A02', count: 1, payAmt: 1_800_000, incomeTax: -85_000, ruralTax: 0, penalty: 0, monthlyRefund: 85_000, payIncomeTax: 0, payRuralTax: 0 }
      : { code: 'A02', count: 0, payAmt: 0, incomeTax: 0, ruralTax: 0, penalty: 0, monthlyRefund: 0, payIncomeTax: 0, payRuralTax: 0 }
    const a03: WhRow = { code: 'A03', count: 0, payAmt: 0, incomeTax: 0, ruralTax: 0, penalty: 0, monthlyRefund: 0, payIncomeTax: 0, payRuralTax: 0 }
    const a10: WhRow = {
      code: 'A10',
      count: a01.count + a02.count + a03.count,
      payAmt: a01.payAmt + a02.payAmt + a03.payAmt,
      incomeTax: a01.incomeTax + a02.incomeTax + a03.incomeTax,
      ruralTax: a01.ruralTax + a02.ruralTax + a03.ruralTax,
      penalty: 0,
      monthlyRefund: a01.monthlyRefund + a02.monthlyRefund + a03.monthlyRefund,
      payIncomeTax: Math.max(0, a01.incomeTax + a02.incomeTax + a03.incomeTax - (a01.monthlyRefund + a02.monthlyRefund + a03.monthlyRefund)),
      payRuralTax: 0,
    }
    const a20: WhRow = { code: 'A20', count: 0, payAmt: 0, incomeTax: 0, ruralTax: 0, penalty: 0, monthlyRefund: 0, payIncomeTax: 0, payRuralTax: 0 }
    const a99: WhRow = {
      code: 'A99',
      count: a10.count + a20.count,
      payAmt: a10.payAmt + a20.payAmt,
      incomeTax: a10.incomeTax + a20.incomeTax,
      ruralTax: a10.ruralTax + a20.ruralTax,
      penalty: 0,
      monthlyRefund: a10.monthlyRefund + a20.monthlyRefund,
      payIncomeTax: a10.payIncomeTax + a20.payIncomeTax,
      payRuralTax: 0,
    }
    r[m] = [a01, a02, a03, a10, a20, a99]
  }
  return r
}

function sumWh(rows: WhRow[]) {
  // A99(총합계)만 떼서 사용
  const tot = rows.find(r => r.code === 'A99')
  return tot ?? { count: 0, payAmt: 0, incomeTax: 0, ruralTax: 0, penalty: 0, monthlyRefund: 0, payIncomeTax: 0, payRuralTax: 0 } as WhRow
}

// ===================== 진짜 .01 빌드 함수 =====================
type FiscalCode = '01' | '02' | '03'  // 정기 / 수정 / 기한후

type Header21Opts = {
  bizNo: string; name: string; ceo: string; addr: string; phone: string; email: string;
  ym: string         // 귀속연월 YYYYMM
  payYm: string      // 지급연월 YYYYMM
  submitYm: string   // 제출연월 YYYYMM
  fiscalCode: FiscalCode  // 신고구분상세
  userId: string     // 홈택스 사용자ID
  refundYn: 'Y' | 'N'
  annualYn: 'Y' | 'N'
  monthlyOrSemi: '01' | '02'  // 매월/반기
}

function buildHeader21(o: Header21Opts): string {
  const parts: string[] = []
  parts.push(padByte('21', 2))                // 1. 자료구분
  parts.push(padByte('C103900', 7))           // 2. 서식코드
  parts.push(padByte(o.bizNo, 13))            // 3. 납세자ID
  parts.push(padByte('14', 2))                // 4. 세목코드
  parts.push(padByte('01', 2))                // 5. 신고구분코드 (정기)
  parts.push(padByte(o.fiscalCode, 2))        // 6. 신고구분상세
  parts.push(padByte('F01', 3))               // 7. 신고서종류코드
  parts.push(padByte(o.ym, 6))                // 8. 귀속연월
  parts.push(padByte(o.payYm, 6))             // 9. 지급연월
  parts.push(padByte(o.submitYm, 6))          // 10. 제출연월
  parts.push(padByte(o.userId, 20))           // 11. 사용자ID
  parts.push(padByte(o.fiscalCode === '02' ? 'FF101' : 'FF001', 5))  // 12. 민원종류
  parts.push(padByte('', 10))                 // 13. 세무대리인 사업자번호
  parts.push(padByte('', 30))                 // 14. 세무대리인 성명
  parts.push(padByte('', 6))                  // 15. 세무대리인 관리번호
  parts.push(padByte('', 14))                 // 16. 세무대리인 전화번호
  parts.push(padByte(o.name, 30))             // 17. 법인명(상호)
  parts.push(padByte(o.addr, 70))             // 18. 사업장 소재지
  parts.push(padByte(o.phone, 14))            // 19. 사업장 전화번호
  parts.push(padByte(o.email, 50))            // 20. 전자메일
  parts.push(padByte(o.ceo, 30))              // 21. 성명(대표자)
  parts.push(padByte(o.monthlyOrSemi, 2))     // 22. 원천신고구분 (01 매월/02 반기)
  parts.push(padByte(o.annualYn, 1))          // 23. 연말정산여부
  parts.push(padByte('N', 1))                 // 24. 소득처분여부
  parts.push(padByte(o.refundYn, 1))          // 25. 환급신청여부
  parts.push(padByte('N', 1))                 // 26. 일괄납부여부
  parts.push(padByte('N', 1))                 // 27. 사업자단위과세
  parts.push(padByte('N', 1))                 // 28. 신고서부표여부
  parts.push(padByte('N', 1))                 // 29. 차월이월 승계명세
  parts.push(padByte('N', 1))                 // 30. 기납부세액명세서 제출
  parts.push(padByte('', 3))                  // 31. 예입처(은행코드)
  parts.push(padByte('', 20))                 // 32. 계좌번호
  parts.push(padByte(yyyymmdd(), 8))          // 33. 작성일자
  parts.push(padByte('9000', 4))              // 34. 세무프로그램코드
  parts.push(padByte('', 27))                 // 35. 공란
  const line = parts.join('')
  // 검증: byte length 400
  return line
}

function buildRefund22(): string {
  // 환급세액 조정 — 미사용 시 모두 0
  const parts: string[] = []
  parts.push(padByte('22', 2))
  parts.push(padByte('C103900', 7))
  for (let i = 0; i < 12; i++) parts.push(padNum(0, 15))  // (12)~(21) + 승계대상 = 12개 NUMBER 15
  parts.push(padByte('', 11))  // 공란
  return parts.join('')
}

function buildDetail23(row: WhRow): string {
  const parts: string[] = []
  parts.push(padByte('23', 2))
  parts.push(padByte('C103900', 7))
  parts.push(padByte(row.code, 3))
  parts.push(padNum(row.count, 15))
  parts.push(padNum(row.payAmt, 15))
  parts.push(padNum(row.incomeTax, 15))
  parts.push(padNum(row.ruralTax, 15))
  parts.push(padNum(row.penalty, 15))
  parts.push(padNum(row.monthlyRefund, 15))
  parts.push(padNum(row.payIncomeTax, 15))
  parts.push(padNum(row.payRuralTax, 15))
  parts.push(padByte('', 18))
  return parts.join('')
}

function buildWithholdingFile(opts: { headerOpts: Header21Opts; rows: WhRow[] }): string {
  const lines: string[] = []
  lines.push(buildHeader21(opts.headerOpts))
  lines.push(buildRefund22())
  // 모든 코드(A01~A99)를 명세 23 로 출력
  for (const r of opts.rows) lines.push(buildDetail23(r))
  return lines.join('\r\n')
}

async function downloadCp949(content: string, filename: string) {
  const res = await fetch('/api/withholding/file', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, filename }),
  })
  if (!res.ok) {
    alert('파일 변환 실패: ' + res.status)
    return
  }
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function downloadText(name: string, body: string) {
  const blob = new Blob([body], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = name; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// ===================== 지급명세서(근로소득) =====================
type WageEmp = {
  rrn: string; name: string; hireDate: string; leaveDate: string
  totalPay: number; nonTaxable: number; taxable: number
  determinedTax: number; prepaidTax: number
}
const mockWageStatements: WageEmp[] = [
  { rrn: '8503151111111', name: '김교사', hireDate: '20210301', leaveDate: '', totalPay: 36_000_000, nonTaxable: 1_200_000, taxable: 34_800_000, determinedTax:   840_000, prepaidTax: 1_020_000 },
  { rrn: '9007072222222', name: '이교사', hireDate: '20230315', leaveDate: '', totalPay: 32_400_000, nonTaxable: 1_200_000, taxable: 31_200_000, determinedTax:   612_000, prepaidTax:   720_000 },
  { rrn: '7811214444444', name: '박원장', hireDate: '20180101', leaveDate: '', totalPay: 60_000_000, nonTaxable: 1_200_000, taxable: 58_800_000, determinedTax: 3_240_000, prepaidTax: 3_400_000 },
]
const padOld = (s: string | number, len: number, ch = ' ', right = false) => {
  const v = String(s ?? '')
  if (v.length >= len) return v.slice(0, len)
  return right ? v.padStart(len, ch) : v.padEnd(len, ch)
}
const padNOld = (n: number, len: number) => padOld(Math.max(0, Math.trunc(n)), len, '0', true)
function buildWageStatementFile(year: string, rows: WageEmp[]): string {
  const lines: string[] = []
  lines.push('A' + padOld(year, 4) + padOld(mockEmployer.bizNo, 10) + padOld(mockEmployer.name, 40) + padOld(mockEmployer.ceo, 20) + padOld(mockEmployer.taxOfficeCd, 3) + padNOld(rows.length, 6))
  rows.forEach((r, i) => {
    const refund = r.prepaidTax - r.determinedTax
    lines.push('B' + padOld(i+1, 5, '0', true) + padOld(r.rrn, 13) + padOld(r.name, 20) + padOld(r.hireDate, 8) + padOld(r.leaveDate || '00000000', 8) + padNOld(r.totalPay, 14) + padNOld(r.nonTaxable, 14) + padNOld(r.taxable, 14) + padNOld(r.determinedTax, 12) + padNOld(r.prepaidTax, 12) + (refund < 0 ? '-' : '+') + padNOld(Math.abs(refund), 11))
  })
  return lines.join('\r\n')
}

// ===================== 퇴직소득 (xlsx 계산식 이식) =====================
type RetireInput = {
  rrn: string
  name: string
  isExecutive: 'Y' | 'N'           // 임원여부
  hireDate: string                  // YYYYMMDD
  retireDate: string                // YYYYMMDD
  paymentDate: string               // YYYYMMDD 지급일
  reason: '정년퇴직' | '정리해고' | '자발적 퇴직' | '임원퇴직' | '중간정산' | '기타'
  retirePay: number                 // (15)
  nonTaxableRetirePay: number       // (16)
  excludedMonths: number            // (23) 제외월수
  addedMonths: number               // (24) 가산월수
  taxCredit: number                 // (34) 세액공제
  prepaidTax: number                // (35) 기납부세액
  pensionDeposit: number            // (38) 연금계좌 입금금액 (이연)
}

const mockRetireInputs: RetireInput[] = [
  { rrn: '7506203333333', name: '정교사', isExecutive: 'N', hireDate: '20150401', retireDate: '20250228', paymentDate: '20250307', reason: '자발적 퇴직', retirePay: 28_500_000, nonTaxableRetirePay: 0, excludedMonths: 0, addedMonths: 0, taxCredit: 0, prepaidTax: 0, pensionDeposit: 0 },
  { rrn: '8211095555555', name: '한교사', isExecutive: 'N', hireDate: '20191001', retireDate: '20251130', paymentDate: '20251210', reason: '정리해고', retirePay: 14_200_000, nonTaxableRetirePay: 0, excludedMonths: 0, addedMonths: 0, taxCredit: 0, prepaidTax: 0, pensionDeposit: 0 },
]

type RetireCalc = {
  serviceMonths: number       // (22)
  serviceYears: number        // (26) 정산근속연수 (ceil)
  taxableRetirePay: number    // (27) = (15)-(16)
  serviceDeduction: number    // (28) 근속연수공제
  convertedPay: number        // (29) 환산급여
  convertedDeduction: number  // (30) 환산급여별 공제
  taxBase: number             // (31) 과세표준
  convertedTax: number        // (32) 환산산출세액
  computedTax: number         // (33) 산출세액
  reportTax: number           // (36) 신고대상세액
  deferredTax: number         // (40) 이연퇴직소득세
  finalIncomeTax: number      // (44) 차감원천징수 소득세
  finalLocalTax: number       // 지방소득세
}

function diffMonthsInclusive(start: string, end: string): number {
  if (!start || !end || start.length !== 8 || end.length !== 8) return 0
  const s = new Date(`${start.slice(0,4)}-${start.slice(4,6)}-${start.slice(6,8)}`)
  const e = new Date(`${end.slice(0,4)}-${end.slice(4,6)}-${end.slice(6,8)}`)
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return 0
  return (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth()) + 1
}

function computeRetire(inp: RetireInput): RetireCalc {
  const serviceMonths = diffMonthsInclusive(inp.hireDate, inp.retireDate)
  const adjMonths = serviceMonths - inp.excludedMonths + inp.addedMonths
  const serviceYears = adjMonths > 0 ? Math.ceil(adjMonths / 12) : 0
  const taxableRetirePay = Math.max(0, inp.retirePay - inp.nonTaxableRetirePay)

  // (28) 근속연수공제
  let svcDeduction = 0
  const y = serviceYears
  if (y <= 5) svcDeduction = y * 1_000_000
  else if (y <= 10) svcDeduction = (y - 5) * 2_000_000 + 5_000_000
  else if (y <= 20) svcDeduction = (y - 10) * 2_500_000 + 15_000_000
  else svcDeduction = (y - 20) * 3_000_000 + 40_000_000
  if (svcDeduction > taxableRetirePay) svcDeduction = taxableRetirePay

  // (29) 환산급여
  const convertedPay = serviceYears > 0 ? Math.floor((taxableRetirePay - svcDeduction) * 12 / serviceYears) : 0

  // (30) 환산급여별 공제
  let convertedDed = 0
  const cp = convertedPay
  if (cp <= 8_000_000) convertedDed = cp
  else if (cp <= 70_000_000) convertedDed = (cp - 8_000_000) * 0.6 + 8_000_000
  else if (cp <= 100_000_000) convertedDed = (cp - 70_000_000) * 0.55 + 45_200_000
  else if (cp <= 300_000_000) convertedDed = (cp - 100_000_000) * 0.45 + 61_700_000
  else convertedDed = (cp - 300_000_000) * 0.35 + 151_700_000
  convertedDed = Math.floor(convertedDed)

  // (31) 과세표준
  const taxBase = Math.max(0, convertedPay - convertedDed)

  // (32) 환산산출세액 — 종합소득세 누진율
  let convertedTax = 0
  const tb = taxBase
  if (tb <= 14_000_000) convertedTax = tb * 0.06
  else if (tb <= 50_000_000) convertedTax = tb * 0.15 - 1_260_000
  else if (tb <= 88_000_000) convertedTax = tb * 0.24 - 5_760_000
  else if (tb <= 150_000_000) convertedTax = tb * 0.35 - 15_440_000
  else if (tb <= 300_000_000) convertedTax = tb * 0.38 - 19_940_000
  else if (tb <= 500_000_000) convertedTax = tb * 0.4 - 25_940_000
  else if (tb <= 1_000_000_000) convertedTax = tb * 0.42 - 35_940_000
  else convertedTax = tb * 0.45 - 65_940_000
  convertedTax = Math.floor(Math.max(0, convertedTax))

  // (33) 산출세액 = (32) / 12 × 정산근속연수
  const computedTax = Math.floor(convertedTax / 12 * serviceYears)

  // (36) 신고대상세액
  const reportTax = computedTax - inp.taxCredit - inp.prepaidTax

  // (40) 이연퇴직소득세 = (37 신고대상) × (38 입금) / (39 퇴직급여 = (17))
  const deferredTax = (taxableRetirePay > 0 && inp.pensionDeposit > 0)
    ? Math.max(0, Math.floor(reportTax * inp.pensionDeposit / taxableRetirePay))
    : 0

  // (44) 차감원천징수세액 (10원 단위 절사)
  const baseTax = reportTax - deferredTax
  const finalIncomeTax = Math.floor(baseTax / 10) * 10
  const finalLocalTax = Math.floor(finalIncomeTax / 100) * 10  // 소득세 / 10, 10원 단위

  return {
    serviceMonths, serviceYears, taxableRetirePay,
    serviceDeduction: svcDeduction, convertedPay,
    convertedDeduction: convertedDed, taxBase,
    convertedTax, computedTax, reportTax, deferredTax,
    finalIncomeTax, finalLocalTax,
  }
}

function buildRetirementStatementFile(year: string, rows: { inp: RetireInput; calc: RetireCalc }[]): string {
  const lines: string[] = []
  lines.push('A' + padOld(year, 4) + padOld(mockEmployer.bizNo, 10) + padOld(mockEmployer.name, 40) + padOld(mockEmployer.ceo, 20) + padOld(mockEmployer.taxOfficeCd, 3) + padNOld(rows.length, 6))
  rows.forEach((r, i) => {
    lines.push('B' + padOld(i+1, 5, '0', true) + padOld(r.inp.rrn, 13) + padOld(r.inp.name, 20) + padOld(r.inp.hireDate, 8) + padOld(r.inp.retireDate, 8) + padOld(r.inp.reason, 8) + padNOld(r.calc.serviceMonths, 4) + padNOld(r.inp.retirePay, 14) + padNOld(r.inp.nonTaxableRetirePay, 14) + padNOld(r.calc.taxableRetirePay, 14) + padNOld(r.calc.finalIncomeTax, 12) + padNOld(r.calc.finalLocalTax, 12))
  })
  return lines.join('\r\n')
}

// ===================== 페이지 본체 =====================
export default function YearEndPage() {
  const [tab, setTab] = useState<Tab>('withholding')

  return (
    <div className="p-3 space-y-3">
      <div className="bg-white rounded-xl border border-teal-400/30 shadow-sm">
        <div className="px-4 py-3 border-b border-teal-400/20 flex items-center gap-2">
          <span className="text-sm font-bold text-slate-700">연말정산 · 원천세</span>
          <span className="text-xs text-slate-400">홈택스 신고용 전자파일을 생성합니다.</span>
          <span className="ml-auto text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">원천세: 진짜 명세 기반 (KSC-5601, C103900)</span>
        </div>
        <div className="px-3 pt-2 flex gap-1">
          {([
            { id: 'withholding', label: '원천세' },
            { id: 'wage-statement', label: '지급명세(근로소득세)' },
            { id: 'retirement-statement', label: '지급명세서(퇴직소득)' },
          ] as { id: Tab; label: string }[]).map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-3 py-1.5 text-[12px] font-bold rounded-t border-b-2 ${tab === t.id ? 'border-teal-500 text-teal-700 bg-teal-50' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="p-4">
          {tab === 'withholding' && <WithholdingPanel />}
          {tab === 'wage-statement' && <WageStatementPanel />}
          {tab === 'retirement-statement' && <RetirementStatementPanel />}
        </div>
      </div>
    </div>
  )
}

function EmployerCard() {
  return (
    <div className="bg-white rounded border border-slate-200 overflow-hidden mb-3">
      <div className="text-[12px] font-bold text-slate-700 px-3 py-2 bg-slate-50 border-b border-slate-200">원천징수의무자 정보</div>
      <table className="w-full">
        <tbody>
          <tr className="border-b border-slate-100">
            <td className={labelCls}>사업자등록번호</td>
            <td className={cellCls}>{mockEmployer.bizNo}</td>
            <td className={labelCls}>상호(법인명)</td>
            <td className={cellCls}>{mockEmployer.name}</td>
          </tr>
          <tr className="border-b border-slate-100">
            <td className={labelCls}>대표자</td>
            <td className={cellCls}>
              {mockEmployer.ceo}
              {mockEmployer.director && mockEmployer.director !== mockEmployer.ceo && (
                <span className="ml-2 text-[11px] text-slate-500">(원장: {mockEmployer.director})</span>
              )}
              {mockEmployer.director === mockEmployer.ceo && (
                <span className="ml-2 text-[11px] text-emerald-600">· 원장 겸임</span>
              )}
            </td>
            <td className={labelCls}>관할 세무서</td>
            <td className={cellCls}>{mockEmployer.taxOffice} ({mockEmployer.taxOfficeCd})</td>
          </tr>
          <tr>
            <td className={labelCls}>사업장 소재지</td>
            <td className={cellCls} colSpan={3}>{mockEmployer.addr}</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function StatCard({ label, value, tone }: { label: string; value: string; tone: 'slate' | 'teal' | 'emerald' | 'amber' }) {
  const toneCls = {
    slate: 'border-slate-200 bg-white text-slate-700',
    teal: 'border-teal-300 bg-teal-50 text-teal-800',
    emerald: 'border-emerald-300 bg-emerald-50 text-emerald-800',
    amber: 'border-amber-300 bg-amber-50 text-amber-800',
  }[tone]
  return (
    <div className={`rounded border ${toneCls} p-2.5`}>
      <div className="text-[10px] opacity-70 mb-0.5">{label}</div>
      <div className="text-[14px] font-bold">{value}</div>
    </div>
  )
}

function WithholdingPanel() {
  const [year, setYear] = useState('2025')
  const [month, setMonth] = useState('12')
  const [fiscalCode, setFiscalCode] = useState<FiscalCode>('01')
  const [userId, setUserId] = useState('')
  const monthly = useMemo(() => makeMonthly(year), [year])
  const rows = monthly[month] ?? []
  const tot = sumWh(rows)

  const [generated, setGenerated] = useState<Set<string>>(new Set())
  const [downloaded, setDownloaded] = useState<Set<string>>(new Set())
  const [generatedAt, setGeneratedAt] = useState<Record<string, string>>({})
  const [downloadedAt, setDownloadedAt] = useState<Record<string, string>>({})
  const [preview, setPreview] = useState('')

  const ym = `${year}${month}`
  const payYm = ym
  const submitYm = (() => {
    // 정기: 다음달 (예: 12월 신고분 → 다음달 1월)
    const y = parseInt(year, 10), m = parseInt(month, 10)
    const ny = m === 12 ? y + 1 : y
    const nm = m === 12 ? 1 : m + 1
    return `${ny}${String(nm).padStart(2, '0')}`
  })()

  const headerOpts: Header21Opts = {
    bizNo: mockEmployer.bizNo, name: mockEmployer.name, ceo: mockEmployer.ceo,
    addr: mockEmployer.addr, phone: mockEmployer.phone, email: mockEmployer.email,
    ym, payYm, submitYm, fiscalCode, userId,
    refundYn: 'N', annualYn: 'N', monthlyOrSemi: '01',
  }

  const markGen = (k: string) => { setGenerated(p => new Set(p).add(k)); setGeneratedAt(p => ({ ...p, [k]: stamp() })) }
  const markDl = (k: string) => { setDownloaded(p => new Set(p).add(k)); setDownloadedAt(p => ({ ...p, [k]: stamp() })) }

  const handleBuild = () => {
    setPreview(buildWithholdingFile({ headerOpts, rows }))
    markGen(ym)
  }
  const handleDownload = async () => {
    const content = buildWithholdingFile({ headerOpts, rows })
    const filename = `${yyyymmdd()}C103900.${fiscalCode}`
    await downloadCp949(content, filename)
    markGen(ym); markDl(ym)
  }
  const handleJson = () => setPreview(JSON.stringify({ headerOpts, rows }, null, 2))
  const handleBatchAll = async () => {
    for (const m of Object.keys(monthly)) {
      const k = `${year}${m}`
      const submitYm2 = (() => {
        const y = parseInt(year,10), mm = parseInt(m,10)
        return `${mm===12?y+1:y}${String(mm===12?1:mm+1).padStart(2,'0')}`
      })()
      const ho: Header21Opts = { ...headerOpts, ym: k, payYm: k, submitYm: submitYm2 }
      const content = buildWithholdingFile({ headerOpts: ho, rows: monthly[m] })
      const filename = `${yyyymmdd()}C103900.${fiscalCode}_${k}`
      await downloadCp949(content, filename)
      markGen(k); markDl(k)
      await new Promise(r => setTimeout(r, 250))
    }
  }

  const overall = useMemo(() => {
    const months = Object.keys(monthly)
    let totIncome = 0, totPay = 0, totHead = 0
    months.forEach(m => {
      const t = sumWh(monthly[m])
      totIncome += t.incomeTax; totPay += t.payAmt; totHead += t.count
    })
    const genCnt = months.filter(m => generated.has(`${year}${m}`)).length
    const dlCnt = months.filter(m => downloaded.has(`${year}${m}`)).length
    return { totIncome, totPay, totHead, genCnt, dlCnt, total: months.length }
  }, [monthly, generated, downloaded, year])

  return (
    <div className="space-y-3">
      <EmployerCard />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        <StatCard label="연 인원(연인원)" value={`${overall.totHead}명`} tone="slate" />
        <StatCard label="연 총지급액" value={won(overall.totPay) + '원'} tone="slate" />
        <StatCard label="연 소득세 합계" value={won(overall.totIncome) + '원'} tone="teal" />
        <StatCard label="전자파일 생성" value={`${overall.genCnt} / ${overall.total}월`} tone={overall.genCnt === overall.total ? 'emerald' : 'amber'} />
        <StatCard label="다운로드 완료" value={`${overall.dlCnt} / ${overall.total}월`} tone={overall.dlCnt === overall.total ? 'emerald' : 'amber'} />
      </div>

      <div className="bg-white rounded border border-slate-200 overflow-hidden">
        <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center gap-2 flex-wrap">
          <span className="text-[12px] font-bold text-slate-700">월별 신고 상황판 ({year}년)</span>
          <span className="text-[11px] text-slate-400">셀 클릭 → 해당 월</span>
          <span className="ml-auto flex items-center gap-2">
            <label className="text-[11px] text-slate-500">신고구분</label>
            <select className={`${inputCls} w-24`} value={fiscalCode} onChange={e => setFiscalCode(e.target.value as FiscalCode)}>
              <option value="01">정기</option>
              <option value="02">수정</option>
              <option value="03">기한후</option>
            </select>
            <label className="text-[11px] text-slate-500">사용자ID</label>
            <input className={`${inputCls} w-32`} placeholder="홈택스 ID" value={userId} onChange={e => setUserId(e.target.value)} />
            <input className={`${inputCls} w-20`} value={year} onChange={e => setYear(e.target.value)} maxLength={4} />
            <button onClick={handleBatchAll} className="px-3 py-1 text-[11px] font-bold text-white bg-teal-500 hover:bg-teal-600 rounded">12개월 일괄 다운로드</button>
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 p-2">
          {Object.keys(monthly).map(m => {
            const k = `${year}${m}`
            const s = sumWh(monthly[m])
            const isGen = generated.has(k); const isDl = downloaded.has(k)
            const active = month === m
            return (
              <button key={m} onClick={() => setMonth(m)}
                className={`text-left p-2 rounded border transition-all ${active ? 'border-teal-500 bg-teal-50 ring-2 ring-teal-200' : 'border-slate-200 bg-white hover:border-teal-300 hover:bg-teal-50/30'}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[13px] font-bold text-slate-700">{Number(m)}월</span>
                  <div className="flex gap-1">
                    <span className={`text-[9px] px-1 py-0.5 rounded font-bold ${isGen ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400'}`}>{isGen ? '✓생성' : '미생성'}</span>
                    <span className={`text-[9px] px-1 py-0.5 rounded font-bold ${isDl ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-400'}`}>{isDl ? '✓다운' : '미다운'}</span>
                  </div>
                </div>
                <div className="text-[10px] text-slate-500 space-y-0.5">
                  <div className="flex justify-between"><span>인원</span><span className="text-slate-700 font-medium">{s.count}명</span></div>
                  <div className="flex justify-between"><span>지급</span><span className="text-slate-700 font-medium">{wonShort(s.payAmt)}</span></div>
                  <div className="flex justify-between"><span>소득세</span><span className="text-teal-700 font-bold">{wonShort(s.incomeTax)}</span></div>
                </div>
                {(generatedAt[k] || downloadedAt[k]) && (
                  <div className="mt-1 pt-1 border-t border-slate-100 text-[9px] text-slate-400 space-y-0.5">
                    {generatedAt[k] && <div>생성 {generatedAt[k]}</div>}
                    {downloadedAt[k] && <div>다운 {downloadedAt[k]}</div>}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex items-end gap-3 flex-wrap">
        <div>
          <div className="text-[11px] text-slate-500 mb-1">선택 월 (귀속={ym}, 지급={payYm}, 제출={submitYm})</div>
          <div className="text-[14px] font-bold text-teal-700 px-3 py-1.5 bg-teal-50 border border-teal-300 rounded">{year}년 {Number(month)}월</div>
        </div>
        <div className="ml-auto flex gap-2">
          <button onClick={handleJson} className="px-3 py-1.5 text-[12px] font-bold text-slate-600 bg-white border border-slate-300 rounded hover:bg-slate-50">JSON 미리보기</button>
          <button onClick={handleBuild} className="px-3 py-1.5 text-[12px] font-bold text-teal-700 bg-teal-50 border border-teal-300 rounded hover:bg-teal-100">전자파일 미리보기</button>
          <button onClick={handleDownload} className="px-3 py-1.5 text-[12px] font-bold text-white bg-teal-500 hover:bg-teal-600 rounded">전자파일 다운로드 (cp949)</button>
        </div>
      </div>

      <div className="bg-white rounded border border-slate-200 overflow-hidden">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="bg-teal-50 border-b border-slate-300">
              <th className="px-2 py-2 border-r border-slate-200 w-[60px]">코드</th>
              <th className="px-2 py-2 border-r border-slate-200">소득구분</th>
              <th className="px-2 py-2 border-r border-slate-200 w-[70px]">인원(4)</th>
              <th className="px-2 py-2 border-r border-slate-200">총지급액(5)</th>
              <th className="px-2 py-2 border-r border-slate-200">소득세(6)</th>
              <th className="px-2 py-2 border-r border-slate-200">농특세(7)</th>
              <th className="px-2 py-2 border-r border-slate-200">가산세(8)</th>
              <th className="px-2 py-2 border-r border-slate-200">조정환급(9)</th>
              <th className="px-2 py-2 border-r border-slate-200">납부소득세(10)</th>
              <th className="px-2 py-2">납부농특세(11)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className={`border-b border-slate-100 ${r.code === 'A99' ? 'bg-teal-50/30 font-bold' : r.code === 'A10' ? 'bg-slate-50/50 font-medium' : ''}`}>
                <td className="px-2 py-1.5 text-center text-slate-600 border-r border-slate-100 font-mono">{r.code}</td>
                <td className="px-2 py-1.5 text-slate-700 border-r border-slate-100">{WH_LABELS[r.code]}</td>
                <td className="px-2 py-1.5 text-center text-slate-700 border-r border-slate-100">{r.count}</td>
                <td className="px-2 py-1.5 text-right text-slate-700 border-r border-slate-100">{won(r.payAmt)}</td>
                <td className={`px-2 py-1.5 text-right border-r border-slate-100 ${r.incomeTax < 0 ? 'text-red-600' : 'text-slate-700'}`}>{won(r.incomeTax)}</td>
                <td className="px-2 py-1.5 text-right text-slate-700 border-r border-slate-100">{won(r.ruralTax)}</td>
                <td className="px-2 py-1.5 text-right text-slate-700 border-r border-slate-100">{won(r.penalty)}</td>
                <td className="px-2 py-1.5 text-right text-slate-700 border-r border-slate-100">{won(r.monthlyRefund)}</td>
                <td className="px-2 py-1.5 text-right text-slate-700 border-r border-slate-100">{won(r.payIncomeTax)}</td>
                <td className="px-2 py-1.5 text-right text-slate-700">{won(r.payRuralTax)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {preview && (
        <div className="bg-slate-900 rounded p-3 overflow-auto">
          <div className="text-[11px] text-slate-400 mb-2">
            byte 길이 검증 — Header(21) {byteLen(preview.split('\r\n')[0] || '')}/400, 환급(22) {byteLen(preview.split('\r\n')[1] || '')}/200, 명세(23) 각 {byteLen(preview.split('\r\n')[2] || '')}/150
          </div>
          <pre className="text-[11px] text-emerald-200 font-mono whitespace-pre">{preview}</pre>
        </div>
      )}
    </div>
  )
}

function WageStatementPanel() {
  const [year, setYear] = useState('2025')
  const [rows] = useState<WageEmp[]>(mockWageStatements)
  const [preview, setPreview] = useState('')
  const [generated, setGenerated] = useState(false)
  const [downloaded, setDownloaded] = useState(false)
  const [generatedAt, setGeneratedAt] = useState('')
  const [downloadedAt, setDownloadedAt] = useState('')

  const totals = useMemo(() => rows.reduce(
    (s, r) => ({ totalPay: s.totalPay + r.totalPay, nonTaxable: s.nonTaxable + r.nonTaxable, taxable: s.taxable + r.taxable, determinedTax: s.determinedTax + r.determinedTax, prepaidTax: s.prepaidTax + r.prepaidTax }),
    { totalPay: 0, nonTaxable: 0, taxable: 0, determinedTax: 0, prepaidTax: 0 },
  ), [rows])

  const handleBuild = () => { setPreview(buildWageStatementFile(year, rows)); setGenerated(true); setGeneratedAt(stamp()) }
  const handleDownload = () => { const body = buildWageStatementFile(year, rows); downloadText(`wage_${year}_${mockEmployer.bizNo}.01`, body); setGenerated(true); setGeneratedAt(stamp()); setDownloaded(true); setDownloadedAt(stamp()) }
  const handleJson = () => setPreview(JSON.stringify({ year, employer: mockEmployer, rows, totals }, null, 2))
  const fmtRrn = (rrn: string) => rrn.length === 13 ? `${rrn.slice(0,6)}-${rrn.slice(6,7)}******` : rrn
  const fmtDate = (d: string) => d ? `${d.slice(0,4)}.${d.slice(4,6)}.${d.slice(6,8)}` : '-'

  return (
    <div className="space-y-3">
      <EmployerCard />
      <div className="px-3 py-2 bg-amber-50 border border-amber-200 rounded text-[11px] text-amber-700">샘플 포맷 — 국세청 정식 명세서 입수 후 buildWageStatementFile 함수 교체 필요</div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <StatCard label="근로자" value={`${rows.length}명`} tone="slate" />
        <StatCard label="총급여 합계" value={won(totals.totalPay) + '원'} tone="slate" />
        <StatCard label="결정세액 합계" value={won(totals.determinedTax) + '원'} tone="teal" />
        <StatCard label="신고 진행" value={generated ? (downloaded ? '다운로드 완료' : '파일 생성됨') : '미생성'} tone={downloaded ? 'emerald' : generated ? 'amber' : 'slate'} />
      </div>
      <div className="flex items-end gap-3 flex-wrap">
        <div>
          <div className="text-[11px] text-slate-500 mb-1">자료귀속연도</div>
          <input className={`${inputCls} w-24`} value={year} onChange={e => setYear(e.target.value)} maxLength={4} />
        </div>
        <div className="text-[11px] text-slate-500 self-end pb-1 space-y-0.5">
          {generatedAt && <div>마지막 생성 {generatedAt}</div>}
          {downloadedAt && <div>마지막 다운 {downloadedAt}</div>}
        </div>
        <div className="ml-auto flex gap-2">
          <button onClick={handleJson} className="px-3 py-1.5 text-[12px] font-bold text-slate-600 bg-white border border-slate-300 rounded hover:bg-slate-50">JSON 미리보기</button>
          <button onClick={handleBuild} className="px-3 py-1.5 text-[12px] font-bold text-teal-700 bg-teal-50 border border-teal-300 rounded hover:bg-teal-100">전자파일 미리보기</button>
          <button onClick={handleDownload} className="px-3 py-1.5 text-[12px] font-bold text-white bg-teal-500 hover:bg-teal-600 rounded">전자파일 다운로드</button>
        </div>
      </div>
      <div className="bg-white rounded border border-slate-200 overflow-hidden">
        <table className="w-full text-[11px]">
          <thead><tr className="bg-teal-50 border-b border-slate-300">
            <th className="px-2 py-2 border-r border-slate-200 w-[40px]">No</th>
            <th className="px-2 py-2 border-r border-slate-200">성명</th>
            <th className="px-2 py-2 border-r border-slate-200">주민번호</th>
            <th className="px-2 py-2 border-r border-slate-200">입사일</th>
            <th className="px-2 py-2 border-r border-slate-200">퇴사일</th>
            <th className="px-2 py-2 border-r border-slate-200">총급여</th>
            <th className="px-2 py-2 border-r border-slate-200">비과세</th>
            <th className="px-2 py-2 border-r border-slate-200">과세대상</th>
            <th className="px-2 py-2 border-r border-slate-200">결정세액</th>
            <th className="px-2 py-2 border-r border-slate-200">기납부세액</th>
            <th className="px-2 py-2">차감징수</th>
          </tr></thead>
          <tbody>
            {rows.map((r, i) => {
              const refund = r.prepaidTax - r.determinedTax
              return (
                <tr key={i} className="border-b border-slate-100">
                  <td className="px-2 py-1.5 text-center text-slate-500 border-r border-slate-100">{i+1}</td>
                  <td className="px-2 py-1.5 text-slate-700 font-medium border-r border-slate-100">{r.name}</td>
                  <td className="px-2 py-1.5 text-center text-slate-500 border-r border-slate-100">{fmtRrn(r.rrn)}</td>
                  <td className="px-2 py-1.5 text-center text-slate-500 border-r border-slate-100">{fmtDate(r.hireDate)}</td>
                  <td className="px-2 py-1.5 text-center text-slate-500 border-r border-slate-100">{fmtDate(r.leaveDate)}</td>
                  <td className="px-2 py-1.5 text-right text-slate-700 border-r border-slate-100">{won(r.totalPay)}</td>
                  <td className="px-2 py-1.5 text-right text-slate-700 border-r border-slate-100">{won(r.nonTaxable)}</td>
                  <td className="px-2 py-1.5 text-right text-slate-700 border-r border-slate-100">{won(r.taxable)}</td>
                  <td className="px-2 py-1.5 text-right text-slate-700 border-r border-slate-100">{won(r.determinedTax)}</td>
                  <td className="px-2 py-1.5 text-right text-slate-700 border-r border-slate-100">{won(r.prepaidTax)}</td>
                  <td className={`px-2 py-1.5 text-right ${refund < 0 ? 'text-red-600' : 'text-blue-600'}`}>{refund < 0 ? '+' : '-'}{won(Math.abs(refund))}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {preview && <div className="bg-slate-900 rounded p-3 overflow-auto"><pre className="text-[11px] text-emerald-200 font-mono whitespace-pre">{preview}</pre></div>}
    </div>
  )
}

function RetirementStatementPanel() {
  const [year, setYear] = useState('2025')
  const [inputs, setInputs] = useState<RetireInput[]>(mockRetireInputs)
  const [preview, setPreview] = useState('')
  const [generated, setGenerated] = useState(false)
  const [downloaded, setDownloaded] = useState(false)
  const [generatedAt, setGeneratedAt] = useState('')
  const [downloadedAt, setDownloadedAt] = useState('')

  const calcs = useMemo(() => inputs.map(inp => ({ inp, calc: computeRetire(inp) })), [inputs])
  const totals = useMemo(() => calcs.reduce(
    (s, x) => ({
      retirePay: s.retirePay + x.inp.retirePay,
      taxableRetirePay: s.taxableRetirePay + x.calc.taxableRetirePay,
      reportTax: s.reportTax + x.calc.reportTax,
      finalIncomeTax: s.finalIncomeTax + x.calc.finalIncomeTax,
      finalLocalTax: s.finalLocalTax + x.calc.finalLocalTax,
    }),
    { retirePay: 0, taxableRetirePay: 0, reportTax: 0, finalIncomeTax: 0, finalLocalTax: 0 },
  ), [calcs])

  const handleBuild = () => { setPreview(buildRetirementStatementFile(year, calcs)); setGenerated(true); setGeneratedAt(stamp()) }
  const handleDownload = () => { const body = buildRetirementStatementFile(year, calcs); downloadText(`retirement_${year}_${mockEmployer.bizNo}.01`, body); setGenerated(true); setGeneratedAt(stamp()); setDownloaded(true); setDownloadedAt(stamp()) }
  const handleJson = () => setPreview(JSON.stringify({ year, employer: mockEmployer, rows: calcs }, null, 2))

  const fmtRrn = (rrn: string) => rrn.length === 13 ? `${rrn.slice(0,6)}-${rrn.slice(6,7)}******` : rrn
  const fmtDate = (d: string) => d ? `${d.slice(0,4)}.${d.slice(4,6)}.${d.slice(6,8)}` : '-'
  const fmtServiceYears = (m: number) => `${Math.floor(m/12)}년 ${m%12}개월`

  const updateInput = (idx: number, patch: Partial<RetireInput>) => {
    setInputs(prev => prev.map((r, i) => i === idx ? { ...r, ...patch } : r))
  }

  return (
    <div className="space-y-3">
      <EmployerCard />
      <div className="px-3 py-2 bg-emerald-50 border border-emerald-200 rounded text-[11px] text-emerald-700">
        퇴직소득 계산식 이식 완료 (소득세법 시행규칙 별지 제24호서식(2) 기준) — 근속연수공제, 환산급여, 환산급여별공제, 환산산출세액, 산출세액(누진율 6~45%), 신고대상세액, 이연퇴직소득세, 차감원천징수세액 자동 계산
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        <StatCard label="퇴사자" value={`${inputs.length}명`} tone="slate" />
        <StatCard label="퇴직급여 합계" value={won(totals.retirePay) + '원'} tone="slate" />
        <StatCard label="신고대상세액" value={won(totals.reportTax) + '원'} tone="teal" />
        <StatCard label="차감원천징수 소득세" value={won(totals.finalIncomeTax) + '원'} tone="teal" />
        <StatCard label="신고 진행" value={generated ? (downloaded ? '다운로드 완료' : '파일 생성됨') : '미생성'} tone={downloaded ? 'emerald' : generated ? 'amber' : 'slate'} />
      </div>

      <div className="flex items-end gap-3 flex-wrap">
        <div>
          <div className="text-[11px] text-slate-500 mb-1">자료귀속연도</div>
          <input className={`${inputCls} w-24`} value={year} onChange={e => setYear(e.target.value)} maxLength={4} />
        </div>
        <div className="text-[11px] text-slate-500 self-end pb-1 space-y-0.5">
          {generatedAt && <div>마지막 생성 {generatedAt}</div>}
          {downloadedAt && <div>마지막 다운 {downloadedAt}</div>}
        </div>
        <div className="ml-auto flex gap-2">
          <button onClick={handleJson} className="px-3 py-1.5 text-[12px] font-bold text-slate-600 bg-white border border-slate-300 rounded hover:bg-slate-50">JSON 미리보기</button>
          <button onClick={handleBuild} className="px-3 py-1.5 text-[12px] font-bold text-teal-700 bg-teal-50 border border-teal-300 rounded hover:bg-teal-100">전자파일 미리보기</button>
          <button onClick={handleDownload} className="px-3 py-1.5 text-[12px] font-bold text-white bg-teal-500 hover:bg-teal-600 rounded">전자파일 다운로드</button>
        </div>
      </div>

      {/* 입력 + 계산 결과 한 줄에 */}
      <div className="bg-white rounded border border-slate-200 overflow-x-auto">
        <table className="w-full text-[11px] min-w-[1400px]">
          <thead>
            <tr className="bg-teal-50 border-b border-slate-300">
              <th className="px-2 py-2 border-r border-slate-200">성명</th>
              <th className="px-2 py-2 border-r border-slate-200">주민번호</th>
              <th className="px-2 py-2 border-r border-slate-200">입사일</th>
              <th className="px-2 py-2 border-r border-slate-200">퇴사일</th>
              <th className="px-2 py-2 border-r border-slate-200">사유</th>
              <th className="px-2 py-2 border-r border-slate-200">근속</th>
              <th className="px-2 py-2 border-r border-slate-200">(15)퇴직급여</th>
              <th className="px-2 py-2 border-r border-slate-200">(16)비과세</th>
              <th className="px-2 py-2 border-r border-slate-200">(28)근속공제</th>
              <th className="px-2 py-2 border-r border-slate-200">(29)환산급여</th>
              <th className="px-2 py-2 border-r border-slate-200">(31)과세표준</th>
              <th className="px-2 py-2 border-r border-slate-200">(33)산출세액</th>
              <th className="px-2 py-2 border-r border-slate-200">(36)신고대상</th>
              <th className="px-2 py-2 border-r border-slate-200">이연(40)</th>
              <th className="px-2 py-2 border-r border-slate-200">소득세(44)</th>
              <th className="px-2 py-2">지방세</th>
            </tr>
          </thead>
          <tbody>
            {calcs.map(({ inp, calc }, i) => (
              <tr key={i} className="border-b border-slate-100">
                <td className="px-2 py-1.5 border-r border-slate-100">
                  <input className="w-20 text-[11px] border border-slate-200 rounded px-1 py-0.5" value={inp.name} onChange={e => updateInput(i, { name: e.target.value })} />
                </td>
                <td className="px-2 py-1.5 border-r border-slate-100 text-slate-500">{fmtRrn(inp.rrn)}</td>
                <td className="px-2 py-1.5 border-r border-slate-100">
                  <input className="w-24 text-[11px] border border-slate-200 rounded px-1 py-0.5" value={inp.hireDate} onChange={e => updateInput(i, { hireDate: e.target.value })} placeholder="YYYYMMDD" />
                </td>
                <td className="px-2 py-1.5 border-r border-slate-100">
                  <input className="w-24 text-[11px] border border-slate-200 rounded px-1 py-0.5" value={inp.retireDate} onChange={e => updateInput(i, { retireDate: e.target.value })} placeholder="YYYYMMDD" />
                </td>
                <td className="px-2 py-1.5 border-r border-slate-100">
                  <select className="text-[11px] border border-slate-200 rounded px-1 py-0.5" value={inp.reason} onChange={e => updateInput(i, { reason: e.target.value as RetireInput['reason'] })}>
                    <option>정년퇴직</option><option>정리해고</option><option>자발적 퇴직</option><option>임원퇴직</option><option>중간정산</option><option>기타</option>
                  </select>
                </td>
                <td className="px-2 py-1.5 border-r border-slate-100 text-center text-slate-500 text-[10px]">{fmtServiceYears(calc.serviceMonths)}<br/>({calc.serviceYears}년)</td>
                <td className="px-2 py-1.5 border-r border-slate-100">
                  <input type="number" className="w-24 text-[11px] border border-slate-200 rounded px-1 py-0.5 text-right" value={inp.retirePay} onChange={e => updateInput(i, { retirePay: Number(e.target.value) })} />
                </td>
                <td className="px-2 py-1.5 border-r border-slate-100">
                  <input type="number" className="w-20 text-[11px] border border-slate-200 rounded px-1 py-0.5 text-right" value={inp.nonTaxableRetirePay} onChange={e => updateInput(i, { nonTaxableRetirePay: Number(e.target.value) })} />
                </td>
                <td className="px-2 py-1.5 text-right text-slate-700 border-r border-slate-100">{won(calc.serviceDeduction)}</td>
                <td className="px-2 py-1.5 text-right text-slate-700 border-r border-slate-100">{won(calc.convertedPay)}</td>
                <td className="px-2 py-1.5 text-right text-slate-700 border-r border-slate-100">{won(calc.taxBase)}</td>
                <td className="px-2 py-1.5 text-right text-slate-700 border-r border-slate-100">{won(calc.computedTax)}</td>
                <td className="px-2 py-1.5 text-right text-slate-700 border-r border-slate-100">{won(calc.reportTax)}</td>
                <td className="px-2 py-1.5 text-right text-slate-500 border-r border-slate-100">{won(calc.deferredTax)}</td>
                <td className="px-2 py-1.5 text-right text-teal-700 font-bold border-r border-slate-100">{won(calc.finalIncomeTax)}</td>
                <td className="px-2 py-1.5 text-right text-teal-700 font-bold">{won(calc.finalLocalTax)}</td>
              </tr>
            ))}
            <tr className="bg-slate-50 font-bold border-t border-slate-300">
              <td className="px-2 py-1.5 text-center text-slate-600 border-r border-slate-100" colSpan={6}>합계</td>
              <td className="px-2 py-1.5 text-right text-slate-700 border-r border-slate-100">{won(totals.retirePay)}</td>
              <td className="px-2 py-1.5 text-right text-slate-700 border-r border-slate-100">-</td>
              <td className="px-2 py-1.5 text-right text-slate-700 border-r border-slate-100">-</td>
              <td className="px-2 py-1.5 text-right text-slate-700 border-r border-slate-100">-</td>
              <td className="px-2 py-1.5 text-right text-slate-700 border-r border-slate-100">-</td>
              <td className="px-2 py-1.5 text-right text-slate-700 border-r border-slate-100">-</td>
              <td className="px-2 py-1.5 text-right text-slate-700 border-r border-slate-100">{won(totals.reportTax)}</td>
              <td className="px-2 py-1.5 text-right text-slate-700 border-r border-slate-100">-</td>
              <td className="px-2 py-1.5 text-right text-teal-700 border-r border-slate-100">{won(totals.finalIncomeTax)}</td>
              <td className="px-2 py-1.5 text-right text-teal-700">{won(totals.finalLocalTax)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {preview && <div className="bg-slate-900 rounded p-3 overflow-auto"><pre className="text-[11px] text-emerald-200 font-mono whitespace-pre">{preview}</pre></div>}
    </div>
  )
}
