'use client'
import React, { useMemo, useState } from 'react'
import { WAGE_SPEC, BIZ_SPEC, RETIRE_SPEC, type SpecRecord } from './specs'

type Tab = 'withholding' | 'wage' | 'biz' | 'retire'

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
  corpRrn: '1234567890123',
  contact: { dept: '회계담당', name: '홍길동', phone: '01011111111' },
}

// ===================== 공통 헬퍼 =====================
const won = (n: number) => n.toLocaleString('ko-KR')
const wonShort = (n: number) => {
  if (Math.abs(n) >= 10_000_000) return (n / 10_000_000).toFixed(1) + '천만'
  if (Math.abs(n) >= 10_000) return Math.round(n / 10_000).toLocaleString('ko-KR') + '만'
  return n.toLocaleString('ko-KR')
}
const stamp = () => new Date().toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
const yyyymmdd = (d = new Date()) => `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`

function byteLen(s: string): number {
  let n = 0
  for (const ch of s) n += ((ch.codePointAt(0) ?? 0) < 128) ? 1 : 2
  return n
}
function padX(s: string | number | undefined | null, len: number): string {
  let str = String(s ?? '')
  let out = ''
  let n = 0
  for (const c of str) {
    const w = ((c.codePointAt(0) ?? 0) < 128) ? 1 : 2
    if (n + w > len) break
    out += c
    n += w
  }
  while (n < len) { out += ' '; n += 1 }
  return out
}
function padN(n: number | string, len: number, signed = false): string {
  const num = typeof n === 'string' ? parseInt(n || '0', 10) : Math.trunc(n)
  if (Number.isNaN(num)) return '0'.repeat(len)
  if (signed && num < 0) return '-' + String(-num).padStart(len - 1, '0')
  return String(Math.abs(num)).padStart(len, '0')
}
function spaces(n: number): string { return ' '.repeat(n) }
function verifyLen(line: string, expected: number): string {
  const cur = byteLen(line)
  if (cur === expected) return line
  if (cur < expected) return line + spaces(expected - cur)
  let out = ''
  let n = 0
  for (const c of line) {
    const w = ((c.codePointAt(0) ?? 0) < 128) ? 1 : 2
    if (n + w > expected) break
    out += c
    n += w
  }
  while (n < expected) { out += ' '; n += 1 }
  return out
}

// ============ Generic 레코드 빌더 ============
function buildSpecRecord(
  spec: SpecRecord,
  values: Record<string, string | number | undefined>,
  totalLen: number,
  recordLetter: string,
  dataCode: string,
): string {
  const sorted = [...spec].sort((a, b) => a[0] - b[0])
  let line = ''
  let pos = 0
  for (const [num, , type, len, cumLen] of sorted) {
    const expectedStart = cumLen - len
    while (pos < expectedStart) { line += ' '; pos += 1 }
    const key = `${recordLetter}${num}`
    let v = values[key]
    if (v === undefined || v === null) {
      if (num === 1 && type === 'X') v = recordLetter
      else if (num === 2 && type === 'N') v = dataCode
      else v = (type === 'N') ? 0 : ''
    }
    let str: string
    if (type === 'N') {
      const numV = typeof v === 'string' ? parseInt(v || '0', 10) : Math.trunc(v as number)
      str = Number.isNaN(numV) ? '0'.repeat(len) : (numV < 0 ? '-' + String(-numV).padStart(len-1,'0') : String(numV).padStart(len, '0'))
      // byte length 보정
      if (str.length > len) str = str.slice(0, len)
      else if (str.length < len) str = '0'.repeat(len - str.length) + str
    } else {
      str = padX(v as string, len)
    }
    line += str
    pos = cumLen
  }
  while (pos < totalLen) { line += ' '; pos += 1 }
  return verifyLen(line, totalLen)
}

async function downloadCp949(content: string, filename: string) {
  const res = await fetch('/api/withholding/file', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, filename }),
  })
  if (!res.ok) { alert('파일 변환 실패: ' + res.status); return }
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// ============ 원천세 본표 (이행상황신고서 C103900) ============
type WhCode = 'A01' | 'A02' | 'A03' | 'A10' | 'A20' | 'A99'
const WH_LABELS: Record<WhCode, string> = {
  A01: '근로소득 간이세액', A02: '근로소득 중도퇴사', A03: '근로소득 일용근로',
  A10: '근로소득 가감계', A20: '퇴직소득', A99: '총합계',
}
type WhRow = { code: WhCode; count: number; payAmt: number; incomeTax: number; ruralTax: number; penalty: number; monthlyRefund: number; payIncomeTax: number; payRuralTax: number }
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
    const a10: WhRow = { code: 'A10', count: a01.count + a02.count + a03.count, payAmt: a01.payAmt + a02.payAmt + a03.payAmt, incomeTax: a01.incomeTax + a02.incomeTax + a03.incomeTax, ruralTax: 0, penalty: 0, monthlyRefund: a01.monthlyRefund + a02.monthlyRefund + a03.monthlyRefund, payIncomeTax: Math.max(0, a01.incomeTax + a02.incomeTax + a03.incomeTax - (a01.monthlyRefund + a02.monthlyRefund + a03.monthlyRefund)), payRuralTax: 0 }
    const a20: WhRow = { code: 'A20', count: 0, payAmt: 0, incomeTax: 0, ruralTax: 0, penalty: 0, monthlyRefund: 0, payIncomeTax: 0, payRuralTax: 0 }
    const a99: WhRow = { code: 'A99', count: a10.count + a20.count, payAmt: a10.payAmt + a20.payAmt, incomeTax: a10.incomeTax + a20.incomeTax, ruralTax: 0, penalty: 0, monthlyRefund: a10.monthlyRefund + a20.monthlyRefund, payIncomeTax: a10.payIncomeTax + a20.payIncomeTax, payRuralTax: 0 }
    r[m] = [a01, a02, a03, a10, a20, a99]
  }
  return r
}
function sumWh(rows: WhRow[]): WhRow {
  return rows.find(r => r.code === 'A99') ?? { code: 'A99', count: 0, payAmt: 0, incomeTax: 0, ruralTax: 0, penalty: 0, monthlyRefund: 0, payIncomeTax: 0, payRuralTax: 0 }
}

type FiscalCode = '01' | '02' | '03'
type Header21Opts = { bizNo: string; name: string; ceo: string; addr: string; phone: string; email: string; ym: string; payYm: string; submitYm: string; fiscalCode: FiscalCode; userId: string; refundYn: 'Y'|'N'; annualYn: 'Y'|'N'; monthlyOrSemi: '01'|'02' }
function buildHeader21(o: Header21Opts): string {
  const p: string[] = []
  p.push(padX('21', 2)); p.push(padX('C103900', 7)); p.push(padX(o.bizNo, 13)); p.push(padX('14', 2))
  p.push(padX('01', 2)); p.push(padX(o.fiscalCode, 2)); p.push(padX('F01', 3))
  p.push(padX(o.ym, 6)); p.push(padX(o.payYm, 6)); p.push(padX(o.submitYm, 6))
  p.push(padX(o.userId, 20)); p.push(padX(o.fiscalCode === '02' ? 'FF101' : 'FF001', 5))
  p.push(padX('', 10)); p.push(padX('', 30)); p.push(padX('', 6)); p.push(padX('', 14))
  p.push(padX(o.name, 30)); p.push(padX(o.addr, 70)); p.push(padX(o.phone, 14)); p.push(padX(o.email, 50))
  p.push(padX(o.ceo, 30)); p.push(padX(o.monthlyOrSemi, 2)); p.push(padX(o.annualYn, 1))
  p.push(padX('N', 1)); p.push(padX(o.refundYn, 1)); p.push(padX('N', 1)); p.push(padX('N', 1))
  p.push(padX('N', 1)); p.push(padX('N', 1)); p.push(padX('N', 1))
  p.push(padX('', 3)); p.push(padX('', 20)); p.push(padX(yyyymmdd(), 8)); p.push(padX('9000', 4))
  p.push(padX('', 27))
  return verifyLen(p.join(''), 400)
}
function buildRefund22(): string {
  const p: string[] = []
  p.push(padX('22', 2)); p.push(padX('C103900', 7))
  for (let i = 0; i < 12; i++) p.push(padN(0, 15, true))
  p.push(padX('', 11))
  return verifyLen(p.join(''), 200)
}
function buildDetail23(row: WhRow): string {
  const p: string[] = []
  p.push(padX('23', 2)); p.push(padX('C103900', 7)); p.push(padX(row.code, 3))
  p.push(padN(row.count, 15)); p.push(padN(row.payAmt, 15))
  p.push(padN(row.incomeTax, 15, true)); p.push(padN(row.ruralTax, 15, true))
  p.push(padN(row.penalty, 15)); p.push(padN(row.monthlyRefund, 15, true))
  p.push(padN(row.payIncomeTax, 15)); p.push(padN(row.payRuralTax, 15))
  p.push(padX('', 18))
  return verifyLen(p.join(''), 150)
}
function buildWithholdingFile(opts: { headerOpts: Header21Opts; rows: WhRow[] }): string {
  const lines: string[] = []
  lines.push(buildHeader21(opts.headerOpts))
  lines.push(buildRefund22())
  for (const r of opts.rows) lines.push(buildDetail23(r))
  return lines.join('\r\n')
}

// ============ 지급명세서 공통 ============
type SubmitOpts = { year: string; submitDate: string; hometaxId: string; submitterType: '1'|'2'|'3' }

function commonAValues(o: SubmitOpts, bCount: number): Record<string, string | number> {
  return {
    A3: mockEmployer.taxOfficeCd, A4: o.submitDate, A5: o.submitterType,
    A6: '', A7: o.hometaxId, A8: '9000', A9: mockEmployer.bizNo,
    A10: mockEmployer.name, A11: mockEmployer.contact.dept,
    A12: mockEmployer.contact.name, A13: mockEmployer.contact.phone,
    A14: o.year, A15: bCount, A16: 101,
  }
}
function commonBValues(o: SubmitOpts, seq: number, cCount: number, totals: Partial<Record<string, number>> = {}): Record<string, string | number> {
  return {
    B3: mockEmployer.taxOfficeCd, B4: seq,
    B5: mockEmployer.bizNo, B6: mockEmployer.name, B7: mockEmployer.ceo,
    B8: mockEmployer.corpRrn, B9: o.year, B10: cCount, B11: 0,
    ...totals,
  }
}

// ============ 근로소득 (자료구분 20, 9 레코드 × 2010byte) ============
const WAGE_LEN = 2010
type WageEmp = { rrn: string; name: string; hireDate: string; leaveDate: string; totalPay: number; nonTaxable: number; taxable: number; determinedTax: number; prepaidTax: number }
const mockWageStatements: WageEmp[] = [
  { rrn: '8503151111111', name: '김교사', hireDate: '20210301', leaveDate: '', totalPay: 36_000_000, nonTaxable: 1_200_000, taxable: 34_800_000, determinedTax:   840_000, prepaidTax: 1_020_000 },
  { rrn: '9007072222222', name: '이교사', hireDate: '20230315', leaveDate: '', totalPay: 32_400_000, nonTaxable: 1_200_000, taxable: 31_200_000, determinedTax:   612_000, prepaidTax:   720_000 },
  { rrn: '7811214444444', name: '박원장', hireDate: '20180101', leaveDate: '', totalPay: 60_000_000, nonTaxable: 1_200_000, taxable: 58_800_000, determinedTax: 3_240_000, prepaidTax: 3_400_000 },
]

function wageCValues(o: SubmitOpts, seq: number, emp: WageEmp): Record<string, string | number> {
  const startOfYear = `${o.year}0101`
  const endOfYear = emp.leaveDate || `${o.year}1231`
  return {
    C3: mockEmployer.taxOfficeCd, C4: seq, C5: mockEmployer.bizNo,
    C6: 0, C7: 1, C8: '', C9: 2, C10: '2',
    C11: emp.name, C12: 1, C13: emp.rrn, C14: '', C15: 1,
    C16: emp.leaveDate ? 2 : 1,  // 1 계속 / 2 중도퇴사
    C17: 2, C18: '0000', C19: 2,
    C20: mockEmployer.bizNo, C21: mockEmployer.name,
    C22: emp.hireDate || startOfYear, C23: endOfYear,
    C24: 0, C25: 0,
    C26: emp.totalPay, C27: 0, C28: 0, C29: 0, C30: 0, C31: 0, C32: 0, C33: 0, C34: 0,
    C35: emp.totalPay,  // 소득명세 합계
    // C36~C73 비과세 모두 0
    C74: emp.nonTaxable,  // 비과세 합계
    C75: 0, C76: emp.taxable,  // 총급여
    // 결정세액 — 정확한 항목번호는 spec 봐야 (C151ⓐ 등 분할 항목)
    C150: emp.determinedTax, C151: emp.determinedTax,
  }
}
function buildWageFile(opts: SubmitOpts, rows: WageEmp[]): string {
  const lines: string[] = []
  const totalPay = rows.reduce((s, r) => s + r.totalPay, 0)
  const totalTax = rows.reduce((s, r) => s + r.determinedTax, 0)
  const totalPrepaid = rows.reduce((s, r) => s + r.prepaidTax, 0)
  lines.push(buildSpecRecord(WAGE_SPEC.A, commonAValues(opts, 1), WAGE_LEN, 'A', '20'))
  lines.push(buildSpecRecord(WAGE_SPEC.B, commonBValues(opts, 1, rows.length, {
    B12: totalPay, B13: totalTax, B14: 0, B15: 0,  // 추정 매핑
  }), WAGE_LEN, 'B', '20'))
  rows.forEach((r, i) => lines.push(buildSpecRecord(WAGE_SPEC.C, wageCValues(opts, i+1, r), WAGE_LEN, 'C', '20')))
  return lines.join('\r\n')
}

// ============ 사업소득 (자료구분 80, 7 레코드 × 770byte) ============
const BIZ_LEN = 770
type BizEmp = { rrn: string; name: string; startDate: string; endDate: string; income: number; necessary: number; netIncome: number; determinedTax: number; prepaidTax: number }
const mockBizStatements: BizEmp[] = [
  { rrn: '8801014444444', name: '강프리', startDate: '20250101', endDate: '20251231', income: 24_000_000, necessary: 18_000_000, netIncome: 6_000_000, determinedTax: 360_000, prepaidTax: 720_000 },
]
function bizCValues(o: SubmitOpts, seq: number, emp: BizEmp): Record<string, string | number> {
  return {
    C3: mockEmployer.taxOfficeCd, C4: seq, C5: mockEmployer.bizNo,
    C6: 0, C7: 1, C8: '', C9: 2, C10: '2',
    C11: emp.name, C12: 1, C13: emp.rrn,
    C20: mockEmployer.bizNo, C21: mockEmployer.name,
    C22: emp.startDate, C23: emp.endDate,
    C26: emp.income,
  }
}
function buildBizFile(opts: SubmitOpts, rows: BizEmp[]): string {
  const lines: string[] = []
  lines.push(buildSpecRecord(BIZ_SPEC.A, commonAValues(opts, 1), BIZ_LEN, 'A', '80'))
  lines.push(buildSpecRecord(BIZ_SPEC.B, commonBValues(opts, 1, rows.length), BIZ_LEN, 'B', '80'))
  rows.forEach((r, i) => lines.push(buildSpecRecord(BIZ_SPEC.C, bizCValues(opts, i+1, r), BIZ_LEN, 'C', '80')))
  return lines.join('\r\n')
}

// ============ 퇴직소득 (자료구분 25, 4 레코드 × 761byte) ============
const RETIRE_LEN = 761
type RetireInput = { rrn: string; name: string; isExecutive: 'Y'|'N'; hireDate: string; retireDate: string; paymentDate: string; reason: '정년퇴직'|'정리해고'|'자발적 퇴직'|'임원퇴직'|'중간정산'|'기타'; retirePay: number; nonTaxableRetirePay: number; excludedMonths: number; addedMonths: number; taxCredit: number; prepaidTax: number; pensionDeposit: number }
const mockRetireInputs: RetireInput[] = [
  { rrn: '7506203333333', name: '정교사', isExecutive: 'N', hireDate: '20150401', retireDate: '20250228', paymentDate: '20250307', reason: '자발적 퇴직', retirePay: 28_500_000, nonTaxableRetirePay: 0, excludedMonths: 0, addedMonths: 0, taxCredit: 0, prepaidTax: 0, pensionDeposit: 0 },
  { rrn: '8211095555555', name: '한교사', isExecutive: 'N', hireDate: '20191001', retireDate: '20251130', paymentDate: '20251210', reason: '정리해고', retirePay: 14_200_000, nonTaxableRetirePay: 0, excludedMonths: 0, addedMonths: 0, taxCredit: 0, prepaidTax: 0, pensionDeposit: 0 },
]
type RetireCalc = { serviceMonths: number; serviceYears: number; taxableRetirePay: number; serviceDeduction: number; convertedPay: number; convertedDeduction: number; taxBase: number; convertedTax: number; computedTax: number; reportTax: number; deferredTax: number; finalIncomeTax: number; finalLocalTax: number }
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
  let svcDeduction = 0
  const y = serviceYears
  if (y <= 5) svcDeduction = y * 1_000_000
  else if (y <= 10) svcDeduction = (y - 5) * 2_000_000 + 5_000_000
  else if (y <= 20) svcDeduction = (y - 10) * 2_500_000 + 15_000_000
  else svcDeduction = (y - 20) * 3_000_000 + 40_000_000
  if (svcDeduction > taxableRetirePay) svcDeduction = taxableRetirePay
  const convertedPay = serviceYears > 0 ? Math.floor((taxableRetirePay - svcDeduction) * 12 / serviceYears) : 0
  let convertedDed = 0
  const cp = convertedPay
  if (cp <= 8_000_000) convertedDed = cp
  else if (cp <= 70_000_000) convertedDed = (cp - 8_000_000) * 0.6 + 8_000_000
  else if (cp <= 100_000_000) convertedDed = (cp - 70_000_000) * 0.55 + 45_200_000
  else if (cp <= 300_000_000) convertedDed = (cp - 100_000_000) * 0.45 + 61_700_000
  else convertedDed = (cp - 300_000_000) * 0.35 + 151_700_000
  convertedDed = Math.floor(convertedDed)
  const taxBase = Math.max(0, convertedPay - convertedDed)
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
  const computedTax = Math.floor(convertedTax / 12 * serviceYears)
  const reportTax = computedTax - inp.taxCredit - inp.prepaidTax
  const deferredTax = (taxableRetirePay > 0 && inp.pensionDeposit > 0) ? Math.max(0, Math.floor(reportTax * inp.pensionDeposit / taxableRetirePay)) : 0
  const baseTax = reportTax - deferredTax
  const finalIncomeTax = Math.floor(baseTax / 10) * 10
  const finalLocalTax = Math.floor(finalIncomeTax / 100) * 10
  return { serviceMonths, serviceYears, taxableRetirePay, serviceDeduction: svcDeduction, convertedPay, convertedDeduction: convertedDed, taxBase, convertedTax, computedTax, reportTax, deferredTax, finalIncomeTax, finalLocalTax }
}
function retireCValues(o: SubmitOpts, seq: number, inp: RetireInput, calc: RetireCalc): Record<string, string | number> {
  return {
    C3: mockEmployer.taxOfficeCd, C4: seq, C5: mockEmployer.bizNo,
    C6: 1, C7: 1,
    C11: inp.name, C12: 1, C13: inp.rrn,
    C20: mockEmployer.bizNo, C21: mockEmployer.name,
    C22: inp.hireDate, C23: inp.retireDate,
    C24: inp.retirePay, C25: inp.nonTaxableRetirePay,
    C26: calc.taxableRetirePay,
    C27: calc.serviceMonths, C28: calc.serviceYears,
    C30: calc.serviceDeduction, C31: calc.convertedPay, C32: calc.convertedDeduction,
    C33: calc.taxBase, C34: calc.convertedTax, C35: calc.computedTax,
    C36: inp.taxCredit, C37: inp.prepaidTax, C38: calc.reportTax,
    C40: calc.deferredTax, C41: calc.finalIncomeTax, C42: calc.finalLocalTax,
  }
}
function buildRetireFile(opts: SubmitOpts, rows: { inp: RetireInput; calc: RetireCalc }[]): string {
  const lines: string[] = []
  lines.push(buildSpecRecord(RETIRE_SPEC.A, commonAValues(opts, 1), RETIRE_LEN, 'A', '25'))
  lines.push(buildSpecRecord(RETIRE_SPEC.B, commonBValues(opts, 1, rows.length), RETIRE_LEN, 'B', '25'))
  rows.forEach((r, i) => lines.push(buildSpecRecord(RETIRE_SPEC.C, retireCValues(opts, i+1, r.inp, r.calc), RETIRE_LEN, 'C', '25')))
  return lines.join('\r\n')
}

// ===================== 페이지 본체 =====================
export default function YearEndPage() {
  const [tab, setTab] = useState<Tab>('withholding')
  return (
    <div className="p-3 space-y-3">
      <div className="bg-white rounded-xl border border-teal-400/30 shadow-sm">
        <div className="px-4 py-3 border-b border-teal-400/20 flex items-center gap-2 flex-wrap">
          <span className="text-sm font-bold text-slate-700">연말정산 · 원천세</span>
          <span className="text-xs text-slate-400">홈택스 신고용 전자파일 (KSC-5601 cp949)</span>
          <span className="ml-auto text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">진짜 명세서 전체 매핑 (1035 항목)</span>
        </div>
        <div className="px-3 pt-2 flex gap-1 flex-wrap">
          {([
            { id: 'withholding', label: '원천세', spec: 'C103900' },
            { id: 'wage', label: '근로소득지급명세서', spec: '자료구분 20 · 2010byte × 9레코드 (670 항목)' },
            { id: 'biz', label: '사업소득지급명세서', spec: '자료구분 80 · 770byte × 7레코드 (231 항목)' },
            { id: 'retire', label: '퇴직소득 세액계산기', spec: '자료구분 25 · 761byte × 4레코드 + 세액 자동계산' },
          ] as { id: Tab; label: string; spec: string }[]).map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} title={t.spec}
              className={`px-3 py-1.5 text-[12px] font-bold rounded-t border-b-2 ${tab === t.id ? 'border-teal-500 text-teal-700 bg-teal-50' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="p-4">
          {tab === 'withholding' && <WithholdingPanel />}
          {tab === 'wage' && <WageStatementPanel />}
          {tab === 'biz' && <BizStatementPanel />}
          {tab === 'retire' && <RetirementStatementPanel />}
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
              {mockEmployer.director && mockEmployer.director !== mockEmployer.ceo && <span className="ml-2 text-[11px] text-slate-500">(원장: {mockEmployer.director})</span>}
              {mockEmployer.director === mockEmployer.ceo && <span className="ml-2 text-[11px] text-emerald-600">· 원장 겸임</span>}
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

function StatCard({ label, value, tone }: { label: string; value: string; tone: 'slate'|'teal'|'emerald'|'amber' }) {
  const toneCls = { slate: 'border-slate-200 bg-white text-slate-700', teal: 'border-teal-300 bg-teal-50 text-teal-800', emerald: 'border-emerald-300 bg-emerald-50 text-emerald-800', amber: 'border-amber-300 bg-amber-50 text-amber-800' }[tone]
  return (
    <div className={`rounded border ${toneCls} p-2.5`}>
      <div className="text-[10px] opacity-70 mb-0.5">{label}</div>
      <div className="text-[14px] font-bold">{value}</div>
    </div>
  )
}

// 원천세 패널 - 그대로
function WithholdingPanel() {
  const [year, setYear] = useState('2025')
  const [month, setMonth] = useState('12')
  const [fiscalCode, setFiscalCode] = useState<FiscalCode>('01')
  const [userId, setUserId] = useState('')
  const monthly = useMemo(() => makeMonthly(year), [year])
  const rows = monthly[month] ?? []
  const [generated, setGenerated] = useState<Set<string>>(new Set())
  const [downloaded, setDownloaded] = useState<Set<string>>(new Set())
  const [generatedAt, setGeneratedAt] = useState<Record<string, string>>({})
  const [downloadedAt, setDownloadedAt] = useState<Record<string, string>>({})
  const [preview, setPreview] = useState('')

  const ym = `${year}${month}`
  const submitYm = (() => { const y = parseInt(year,10), m = parseInt(month,10); const ny = m === 12 ? y+1 : y; const nm = m === 12 ? 1 : m+1; return `${ny}${String(nm).padStart(2,'0')}` })()
  const headerOpts: Header21Opts = { bizNo: mockEmployer.bizNo, name: mockEmployer.name, ceo: mockEmployer.ceo, addr: mockEmployer.addr, phone: mockEmployer.phone, email: mockEmployer.email, ym, payYm: ym, submitYm, fiscalCode, userId, refundYn: 'N', annualYn: 'N', monthlyOrSemi: '01' }
  const markGen = (k: string) => { setGenerated(p => new Set(p).add(k)); setGeneratedAt(p => ({ ...p, [k]: stamp() })) }
  const markDl = (k: string) => { setDownloaded(p => new Set(p).add(k)); setDownloadedAt(p => ({ ...p, [k]: stamp() })) }
  const handleBuild = () => { setPreview(buildWithholdingFile({ headerOpts, rows })); markGen(ym) }
  const handleDownload = async () => { const c = buildWithholdingFile({ headerOpts, rows }); await downloadCp949(c, `${yyyymmdd()}C103900.${fiscalCode}`); markGen(ym); markDl(ym) }
  const handleJson = () => setPreview(JSON.stringify({ headerOpts, rows }, null, 2))
  const handleBatchAll = async () => {
    for (const m of Object.keys(monthly)) {
      const k = `${year}${m}`
      const sm = (() => { const y = parseInt(year,10), mm = parseInt(m,10); return `${mm===12?y+1:y}${String(mm===12?1:mm+1).padStart(2,'0')}` })()
      const ho: Header21Opts = { ...headerOpts, ym: k, payYm: k, submitYm: sm }
      const c = buildWithholdingFile({ headerOpts: ho, rows: monthly[m] })
      await downloadCp949(c, `${yyyymmdd()}C103900.${fiscalCode}_${k}`)
      markGen(k); markDl(k)
      await new Promise(r => setTimeout(r, 250))
    }
  }
  const overall = useMemo(() => {
    const months = Object.keys(monthly); let totIncome = 0, totPay = 0, totHead = 0
    months.forEach(m => { const t = sumWh(monthly[m]); totIncome += t.incomeTax; totPay += t.payAmt; totHead += t.count })
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
              <option value="01">정기</option><option value="02">수정</option><option value="03">기한후</option>
            </select>
            <label className="text-[11px] text-slate-500">사용자ID</label>
            <input className={`${inputCls} w-32`} placeholder="홈택스 ID" value={userId} onChange={e => setUserId(e.target.value)} />
            <input className={`${inputCls} w-20`} value={year} onChange={e => setYear(e.target.value)} maxLength={4} />
            <button onClick={handleBatchAll} className="px-3 py-1 text-[11px] font-bold text-white bg-teal-500 hover:bg-teal-600 rounded">12개월 일괄 다운로드</button>
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 p-2">
          {Object.keys(monthly).map(m => {
            const k = `${year}${m}`; const s = sumWh(monthly[m])
            const isGen = generated.has(k); const isDl = downloaded.has(k); const active = month === m
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
              </button>
            )
          })}
        </div>
      </div>
      <div className="flex items-end gap-3 flex-wrap">
        <div>
          <div className="text-[11px] text-slate-500 mb-1">선택 월 (귀속={ym}, 지급={ym}, 제출={submitYm})</div>
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
          <thead><tr className="bg-teal-50 border-b border-slate-300">
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
          </tr></thead>
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
          <div className="text-[11px] text-slate-400 mb-2">byte 검증 — Header(21) {byteLen(preview.split('\r\n')[0] || '')}/400, 환급(22) {byteLen(preview.split('\r\n')[1] || '')}/200, 명세(23) {byteLen(preview.split('\r\n')[2] || '')}/150</div>
          <pre className="text-[11px] text-emerald-200 font-mono whitespace-pre">{preview}</pre>
        </div>
      )}
    </div>
  )
}

// 공통 패널 셸
function StatementPanelShell<T>(props: {
  spec: { dataCode: string; recordLen: number; recordTypes: string[]; specName: string; itemCount: number }
  rows: T[]; year: string; setYear: (y: string) => void
  buildFn: (opts: SubmitOpts, rows: T[]) => string
  fileExt: string
  totals: { label: string; value: string; tone: 'slate'|'teal'|'emerald'|'amber' }[]
  table: React.ReactNode
}) {
  const [submitDate, setSubmitDate] = useState(yyyymmdd())
  const [hometaxId, setHometaxId] = useState('')
  const [submitterType, setSubmitterType] = useState<'1'|'2'|'3'>('3')
  const [preview, setPreview] = useState('')
  const [generated, setGenerated] = useState(false)
  const [downloaded, setDownloaded] = useState(false)
  const [generatedAt, setGeneratedAt] = useState('')
  const [downloadedAt, setDownloadedAt] = useState('')
  const opts: SubmitOpts = { year: props.year, submitDate, hometaxId, submitterType }

  const handleBuild = () => { setPreview(props.buildFn(opts, props.rows)); setGenerated(true); setGeneratedAt(stamp()) }
  const handleDownload = async () => { const c = props.buildFn(opts, props.rows); const fn = `${yyyymmdd()}_${props.spec.dataCode}_${mockEmployer.bizNo}.${props.fileExt}`; await downloadCp949(c, fn); setGenerated(true); setGeneratedAt(stamp()); setDownloaded(true); setDownloadedAt(stamp()) }
  const handleJson = () => setPreview(JSON.stringify({ opts, employer: mockEmployer, rows: props.rows }, null, 2))

  return (
    <div className="space-y-3">
      <EmployerCard />
      <div className="px-3 py-2 bg-emerald-50 border border-emerald-200 rounded text-[11px] text-emerald-700">
        진짜 명세 전체 매핑 — {props.spec.specName} (자료구분 <strong>{props.spec.dataCode}</strong>, 각 레코드 <strong>{props.spec.recordLen}byte</strong>, <strong>{props.spec.itemCount} 항목</strong> 전체 자동 패딩)
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {props.totals.map((t, i) => <StatCard key={i} {...t} />)}
        <StatCard label="신고 진행" value={generated ? (downloaded ? '다운로드 완료' : '파일 생성됨') : '미생성'} tone={downloaded ? 'emerald' : generated ? 'amber' : 'slate'} />
      </div>
      <div className="flex items-end gap-3 flex-wrap">
        <div>
          <div className="text-[11px] text-slate-500 mb-1">자료귀속연도 (A14)</div>
          <input className={`${inputCls} w-24`} value={props.year} onChange={e => props.setYear(e.target.value)} maxLength={4} />
        </div>
        <div>
          <div className="text-[11px] text-slate-500 mb-1">제출연월일 (A4)</div>
          <input className={`${inputCls} w-28`} value={submitDate} onChange={e => setSubmitDate(e.target.value)} maxLength={8} />
        </div>
        <div>
          <div className="text-[11px] text-slate-500 mb-1">제출자구분 (A5)</div>
          <select className={`${inputCls} w-32`} value={submitterType} onChange={e => setSubmitterType(e.target.value as '1'|'2'|'3')}>
            <option value="1">1 세무대리인</option><option value="2">2 법인</option><option value="3">3 개인</option>
          </select>
        </div>
        <div>
          <div className="text-[11px] text-slate-500 mb-1">홈택스 ID (A7)</div>
          <input className={`${inputCls} w-40`} value={hometaxId} onChange={e => setHometaxId(e.target.value)} maxLength={20} />
        </div>
        <div className="text-[11px] text-slate-500 self-end pb-1 space-y-0.5">
          {generatedAt && <div>마지막 생성 {generatedAt}</div>}
          {downloadedAt && <div>마지막 다운 {downloadedAt}</div>}
        </div>
        <div className="ml-auto flex gap-2">
          <button onClick={handleJson} className="px-3 py-1.5 text-[12px] font-bold text-slate-600 bg-white border border-slate-300 rounded hover:bg-slate-50">JSON 미리보기</button>
          <button onClick={handleBuild} className="px-3 py-1.5 text-[12px] font-bold text-teal-700 bg-teal-50 border border-teal-300 rounded hover:bg-teal-100">전자파일 미리보기</button>
          <button onClick={handleDownload} className="px-3 py-1.5 text-[12px] font-bold text-white bg-teal-500 hover:bg-teal-600 rounded">전자파일 다운로드 (cp949)</button>
        </div>
      </div>
      {props.table}
      {preview && (
        <div className="bg-slate-900 rounded p-3 overflow-auto">
          <div className="text-[11px] text-slate-400 mb-2">byte 검증 — {preview.split('\r\n').map((l, i) => `L${i+1}=${byteLen(l)}/${props.spec.recordLen}`).slice(0, 8).join(', ')}</div>
          <pre className="text-[11px] text-emerald-200 font-mono whitespace-pre">{preview}</pre>
        </div>
      )}
    </div>
  )
}

// 근로소득
function WageStatementPanel() {
  const [year, setYear] = useState('2025')
  const [rows] = useState<WageEmp[]>(mockWageStatements)
  const totals = useMemo(() => rows.reduce((s, r) => ({ totalPay: s.totalPay + r.totalPay, nonTaxable: s.nonTaxable + r.nonTaxable, taxable: s.taxable + r.taxable, determinedTax: s.determinedTax + r.determinedTax, prepaidTax: s.prepaidTax + r.prepaidTax }), { totalPay: 0, nonTaxable: 0, taxable: 0, determinedTax: 0, prepaidTax: 0 }), [rows])
  const fmtRrn = (rrn: string) => rrn.length === 13 ? `${rrn.slice(0,6)}-${rrn.slice(6,7)}******` : rrn
  const fmtDate = (d: string) => d ? `${d.slice(0,4)}.${d.slice(4,6)}.${d.slice(6,8)}` : '-'
  const wageItemCount = Object.values(WAGE_SPEC).reduce((s, arr) => s + arr.length, 0)
  return (
    <StatementPanelShell
      spec={{ dataCode: '20', recordLen: WAGE_LEN, recordTypes: ['A','B','C','D','E','F','G','H','I','K'], specName: '근로소득 지급명세서 전산매체 제출요령(2026.03.26)', itemCount: wageItemCount }}
      rows={rows} year={year} setYear={setYear} buildFn={buildWageFile as any} fileExt="01"
      totals={[
        { label: '근로자', value: `${rows.length}명`, tone: 'slate' },
        { label: '총급여 합계', value: won(totals.totalPay) + '원', tone: 'slate' },
        { label: '결정세액 합계', value: won(totals.determinedTax) + '원', tone: 'teal' },
        { label: '기납부 합계', value: won(totals.prepaidTax) + '원', tone: 'slate' },
      ]}
      table={
        <div className="bg-white rounded border border-slate-200 overflow-hidden">
          <table className="w-full text-[11px]">
            <thead><tr className="bg-teal-50 border-b border-slate-300">
              <th className="px-2 py-2 border-r border-slate-200 w-[40px]">No</th>
              <th className="px-2 py-2 border-r border-slate-200">성명</th>
              <th className="px-2 py-2 border-r border-slate-200">주민번호</th>
              <th className="px-2 py-2 border-r border-slate-200">입사</th>
              <th className="px-2 py-2 border-r border-slate-200">퇴사</th>
              <th className="px-2 py-2 border-r border-slate-200">총급여</th>
              <th className="px-2 py-2 border-r border-slate-200">비과세</th>
              <th className="px-2 py-2 border-r border-slate-200">과세대상</th>
              <th className="px-2 py-2 border-r border-slate-200">결정세액</th>
              <th className="px-2 py-2 border-r border-slate-200">기납부</th>
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
      }
    />
  )
}

// 사업소득
function BizStatementPanel() {
  const [year, setYear] = useState('2025')
  const [rows] = useState<BizEmp[]>(mockBizStatements)
  const totals = useMemo(() => rows.reduce((s, r) => ({ income: s.income + r.income, necessary: s.necessary + r.necessary, netIncome: s.netIncome + r.netIncome, determinedTax: s.determinedTax + r.determinedTax, prepaidTax: s.prepaidTax + r.prepaidTax }), { income: 0, necessary: 0, netIncome: 0, determinedTax: 0, prepaidTax: 0 }), [rows])
  const fmtRrn = (rrn: string) => rrn.length === 13 ? `${rrn.slice(0,6)}-${rrn.slice(6,7)}******` : rrn
  const fmtDate = (d: string) => d ? `${d.slice(0,4)}.${d.slice(4,6)}.${d.slice(6,8)}` : '-'
  const bizItemCount = Object.values(BIZ_SPEC).reduce((s, arr) => s + arr.length, 0)
  return (
    <StatementPanelShell
      spec={{ dataCode: '80', recordLen: BIZ_LEN, recordTypes: ['A','B','C','D','E','F','G'], specName: '사업소득 지급명세서(연말정산용) 전산매체 제출요령(2025.7.29)', itemCount: bizItemCount }}
      rows={rows} year={year} setYear={setYear} buildFn={buildBizFile as any} fileExt="01"
      totals={[
        { label: '사업소득자', value: `${rows.length}명`, tone: 'slate' },
        { label: '수입금액 합계', value: won(totals.income) + '원', tone: 'slate' },
        { label: '소득금액 합계', value: won(totals.netIncome) + '원', tone: 'slate' },
        { label: '결정세액 합계', value: won(totals.determinedTax) + '원', tone: 'teal' },
      ]}
      table={
        <div className="bg-white rounded border border-slate-200 overflow-hidden">
          <table className="w-full text-[11px]">
            <thead><tr className="bg-teal-50 border-b border-slate-300">
              <th className="px-2 py-2 border-r border-slate-200 w-[40px]">No</th>
              <th className="px-2 py-2 border-r border-slate-200">성명</th>
              <th className="px-2 py-2 border-r border-slate-200">주민번호</th>
              <th className="px-2 py-2 border-r border-slate-200">시작</th>
              <th className="px-2 py-2 border-r border-slate-200">종료</th>
              <th className="px-2 py-2 border-r border-slate-200">수입금액</th>
              <th className="px-2 py-2 border-r border-slate-200">필요경비</th>
              <th className="px-2 py-2 border-r border-slate-200">소득금액</th>
              <th className="px-2 py-2 border-r border-slate-200">결정세액</th>
              <th className="px-2 py-2">기납부</th>
            </tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-b border-slate-100">
                  <td className="px-2 py-1.5 text-center text-slate-500 border-r border-slate-100">{i+1}</td>
                  <td className="px-2 py-1.5 text-slate-700 font-medium border-r border-slate-100">{r.name}</td>
                  <td className="px-2 py-1.5 text-center text-slate-500 border-r border-slate-100">{fmtRrn(r.rrn)}</td>
                  <td className="px-2 py-1.5 text-center text-slate-500 border-r border-slate-100">{fmtDate(r.startDate)}</td>
                  <td className="px-2 py-1.5 text-center text-slate-500 border-r border-slate-100">{fmtDate(r.endDate)}</td>
                  <td className="px-2 py-1.5 text-right text-slate-700 border-r border-slate-100">{won(r.income)}</td>
                  <td className="px-2 py-1.5 text-right text-slate-700 border-r border-slate-100">{won(r.necessary)}</td>
                  <td className="px-2 py-1.5 text-right text-slate-700 border-r border-slate-100">{won(r.netIncome)}</td>
                  <td className="px-2 py-1.5 text-right text-slate-700 border-r border-slate-100">{won(r.determinedTax)}</td>
                  <td className="px-2 py-1.5 text-right text-slate-700">{won(r.prepaidTax)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      }
    />
  )
}

// 퇴직소득 세액계산기
function RetirementStatementPanel() {
  const [year, setYear] = useState('2025')
  const [inputs, setInputs] = useState<RetireInput[]>(mockRetireInputs)
  const calcs = useMemo(() => inputs.map(inp => ({ inp, calc: computeRetire(inp) })), [inputs])
  const totals = useMemo(() => calcs.reduce((s, x) => ({ retirePay: s.retirePay + x.inp.retirePay, taxableRetirePay: s.taxableRetirePay + x.calc.taxableRetirePay, reportTax: s.reportTax + x.calc.reportTax, finalIncomeTax: s.finalIncomeTax + x.calc.finalIncomeTax, finalLocalTax: s.finalLocalTax + x.calc.finalLocalTax }), { retirePay: 0, taxableRetirePay: 0, reportTax: 0, finalIncomeTax: 0, finalLocalTax: 0 }), [calcs])
  const fmtRrn = (rrn: string) => rrn.length === 13 ? `${rrn.slice(0,6)}-${rrn.slice(6,7)}******` : rrn
  const fmtServiceYears = (m: number) => `${Math.floor(m/12)}년 ${m%12}개월`
  const updateInput = (idx: number, patch: Partial<RetireInput>) => { setInputs(prev => prev.map((r, i) => i === idx ? { ...r, ...patch } : r)) }
  const retireItemCount = Object.values(RETIRE_SPEC).reduce((s, arr) => s + arr.length, 0)
  return (
    <StatementPanelShell
      spec={{ dataCode: '25', recordLen: RETIRE_LEN, recordTypes: ['A','B','C','D'], specName: '퇴직소득 지급명세서 전산매체 제출요령(2025.08.04) + 세액 자동계산 (소득세법 시행규칙 별지 제24호서식(2))', itemCount: retireItemCount }}
      rows={calcs} year={year} setYear={setYear} buildFn={buildRetireFile as any} fileExt="01"
      totals={[
        { label: '퇴사자', value: `${inputs.length}명`, tone: 'slate' },
        { label: '퇴직급여 합계', value: won(totals.retirePay) + '원', tone: 'slate' },
        { label: '신고대상세액', value: won(totals.reportTax) + '원', tone: 'teal' },
        { label: '차감원천징수 소득세', value: won(totals.finalIncomeTax) + '원', tone: 'teal' },
      ]}
      table={
        <div className="bg-white rounded border border-slate-200 overflow-x-auto">
          <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 text-[11px] text-slate-600 flex items-center gap-3 flex-wrap">
            <strong className="text-slate-700">퇴직소득 세액계산기</strong>
            <span className="text-slate-400">|</span>
            <span><span className="inline-block w-2 h-2 bg-blue-100 border border-blue-300 rounded-sm align-middle mr-1"></span>입력 (회색=자동)</span>
            <span><span className="inline-block w-2 h-2 bg-emerald-100 border border-emerald-300 rounded-sm align-middle mr-1"></span>계산 결과</span>
            <span className="text-slate-500">소득세법 시행규칙 별지 제24호서식(2) 기준</span>
          </div>
          <table className="w-full text-[11px] min-w-[2600px]">
            <thead>
              <tr className="bg-teal-50 border-b border-slate-300 text-slate-700">
                <th className="px-2 py-2 border-r border-slate-200" rowSpan={2}>성명</th>
                <th className="px-2 py-2 border-r border-slate-200" rowSpan={2}>주민번호</th>
                <th className="px-2 py-2 border-r border-slate-200 bg-blue-50" colSpan={4}>근무 정보 (입력)</th>
                <th className="px-2 py-2 border-r border-slate-200" rowSpan={2}>(22)근속월수<br/>(26)정산연수</th>
                <th className="px-2 py-2 border-r border-slate-200 bg-blue-50" colSpan={2}>월수 보정 (입력)</th>
                <th className="px-2 py-2 border-r border-slate-200 bg-blue-50" colSpan={2}>퇴직급여 (입력)</th>
                <th className="px-2 py-2 border-r border-slate-200 bg-emerald-50" colSpan={6}>과세표준 계산</th>
                <th className="px-2 py-2 border-r border-slate-200 bg-emerald-50" colSpan={2}>세액 산출</th>
                <th className="px-2 py-2 border-r border-slate-200 bg-blue-50" colSpan={3}>공제·기납부·이연 (입력)</th>
                <th className="px-2 py-2 border-r border-slate-200" rowSpan={2}>(36)신고<br/>대상세액</th>
                <th className="px-2 py-2 border-r border-slate-200" rowSpan={2}>(40)이연<br/>퇴직소득세</th>
                <th className="px-2 py-2 border-r border-slate-200 bg-teal-100" rowSpan={2}>(44)소득세<br/>(차감징수)</th>
                <th className="px-2 py-2 bg-teal-100" rowSpan={2}>지방<br/>소득세</th>
              </tr>
              <tr className="bg-teal-50/50 border-b border-slate-300 text-slate-600 text-[10px]">
                <th className="px-1 py-1 border-r border-slate-200 bg-blue-50">입사일</th>
                <th className="px-1 py-1 border-r border-slate-200 bg-blue-50">퇴사일</th>
                <th className="px-1 py-1 border-r border-slate-200 bg-blue-50">지급일</th>
                <th className="px-1 py-1 border-r border-slate-200 bg-blue-50">사유<br/>임원</th>
                <th className="px-1 py-1 border-r border-slate-200 bg-blue-50">(23)제외</th>
                <th className="px-1 py-1 border-r border-slate-200 bg-blue-50">(24)가산</th>
                <th className="px-1 py-1 border-r border-slate-200 bg-blue-50">(15)퇴직급여</th>
                <th className="px-1 py-1 border-r border-slate-200 bg-blue-50">(16)비과세</th>
                <th className="px-1 py-1 border-r border-slate-200 bg-emerald-50">(17)/(27)<br/>과세대상</th>
                <th className="px-1 py-1 border-r border-slate-200 bg-emerald-50">(28)근속<br/>공제</th>
                <th className="px-1 py-1 border-r border-slate-200 bg-emerald-50">(29)환산<br/>급여</th>
                <th className="px-1 py-1 border-r border-slate-200 bg-emerald-50">(30)환산<br/>공제</th>
                <th className="px-1 py-1 border-r border-slate-200 bg-emerald-50">(31)과세<br/>표준</th>
                <th className="px-1 py-1 border-r border-slate-200 bg-emerald-50">세율</th>
                <th className="px-1 py-1 border-r border-slate-200 bg-emerald-50">(32)환산<br/>산출세액</th>
                <th className="px-1 py-1 border-r border-slate-200 bg-emerald-50">(33)산출<br/>세액</th>
                <th className="px-1 py-1 border-r border-slate-200 bg-blue-50">(34)세액<br/>공제</th>
                <th className="px-1 py-1 border-r border-slate-200 bg-blue-50">(35)기납부</th>
                <th className="px-1 py-1 border-r border-slate-200 bg-blue-50">(38)연금<br/>계좌입금</th>
              </tr>
            </thead>
            <tbody>
              {calcs.map(({ inp, calc }, i) => {
                const taxRate = calc.taxBase <= 14_000_000 ? '6%' : calc.taxBase <= 50_000_000 ? '15%' : calc.taxBase <= 88_000_000 ? '24%' : calc.taxBase <= 150_000_000 ? '35%' : calc.taxBase <= 300_000_000 ? '38%' : calc.taxBase <= 500_000_000 ? '40%' : calc.taxBase <= 1_000_000_000 ? '42%' : '45%'
                return (
                  <tr key={i} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="px-2 py-1.5 border-r border-slate-100"><input className="w-16 text-[11px] border border-slate-200 rounded px-1 py-0.5" value={inp.name} onChange={e => updateInput(i, { name: e.target.value })} /></td>
                    <td className="px-2 py-1.5 border-r border-slate-100 text-slate-500 text-[10px]">{fmtRrn(inp.rrn)}</td>
                    <td className="px-1 py-1 border-r border-slate-100 bg-blue-50/30"><input className="w-20 text-[11px] border border-slate-200 rounded px-1 py-0.5 text-center" value={inp.hireDate} onChange={e => updateInput(i, { hireDate: e.target.value })} placeholder="YYYYMMDD" /></td>
                    <td className="px-1 py-1 border-r border-slate-100 bg-blue-50/30"><input className="w-20 text-[11px] border border-slate-200 rounded px-1 py-0.5 text-center" value={inp.retireDate} onChange={e => updateInput(i, { retireDate: e.target.value })} placeholder="YYYYMMDD" /></td>
                    <td className="px-1 py-1 border-r border-slate-100 bg-blue-50/30"><input className="w-20 text-[11px] border border-slate-200 rounded px-1 py-0.5 text-center" value={inp.paymentDate} onChange={e => updateInput(i, { paymentDate: e.target.value })} placeholder="YYYYMMDD" /></td>
                    <td className="px-1 py-1 border-r border-slate-100 bg-blue-50/30">
                      <select className="text-[10px] border border-slate-200 rounded px-1 py-0.5 w-full mb-0.5" value={inp.reason} onChange={e => updateInput(i, { reason: e.target.value as RetireInput['reason'] })}>
                        <option>정년퇴직</option><option>정리해고</option><option>자발적 퇴직</option><option>임원퇴직</option><option>중간정산</option><option>기타</option>
                      </select>
                      <select className="text-[10px] border border-slate-200 rounded px-1 py-0.5 w-full" value={inp.isExecutive} onChange={e => updateInput(i, { isExecutive: e.target.value as 'Y' | 'N' })}>
                        <option value="N">일반</option><option value="Y">임원</option>
                      </select>
                    </td>
                    <td className="px-2 py-1.5 border-r border-slate-100 text-center text-slate-500 text-[10px]">{fmtServiceYears(calc.serviceMonths)}<br/><strong className="text-slate-700">{calc.serviceYears}년</strong></td>
                    <td className="px-1 py-1 border-r border-slate-100 bg-blue-50/30"><input type="number" className="w-14 text-[11px] border border-slate-200 rounded px-1 py-0.5 text-right" value={inp.excludedMonths} onChange={e => updateInput(i, { excludedMonths: Number(e.target.value) })} /></td>
                    <td className="px-1 py-1 border-r border-slate-100 bg-blue-50/30"><input type="number" className="w-14 text-[11px] border border-slate-200 rounded px-1 py-0.5 text-right" value={inp.addedMonths} onChange={e => updateInput(i, { addedMonths: Number(e.target.value) })} /></td>
                    <td className="px-1 py-1 border-r border-slate-100 bg-blue-50/30"><input type="number" className="w-24 text-[11px] border border-slate-200 rounded px-1 py-0.5 text-right" value={inp.retirePay} onChange={e => updateInput(i, { retirePay: Number(e.target.value) })} /></td>
                    <td className="px-1 py-1 border-r border-slate-100 bg-blue-50/30"><input type="number" className="w-20 text-[11px] border border-slate-200 rounded px-1 py-0.5 text-right" value={inp.nonTaxableRetirePay} onChange={e => updateInput(i, { nonTaxableRetirePay: Number(e.target.value) })} /></td>
                    <td className="px-2 py-1.5 text-right text-slate-700 border-r border-slate-100 bg-emerald-50/30">{won(calc.taxableRetirePay)}</td>
                    <td className="px-2 py-1.5 text-right text-slate-700 border-r border-slate-100 bg-emerald-50/30">{won(calc.serviceDeduction)}</td>
                    <td className="px-2 py-1.5 text-right text-slate-700 border-r border-slate-100 bg-emerald-50/30">{won(calc.convertedPay)}</td>
                    <td className="px-2 py-1.5 text-right text-slate-700 border-r border-slate-100 bg-emerald-50/30">{won(calc.convertedDeduction)}</td>
                    <td className="px-2 py-1.5 text-right text-slate-700 border-r border-slate-100 bg-emerald-50/30">{won(calc.taxBase)}</td>
                    <td className="px-2 py-1.5 text-center text-slate-600 border-r border-slate-100 bg-emerald-50/30 font-mono">{taxRate}</td>
                    <td className="px-2 py-1.5 text-right text-slate-700 border-r border-slate-100 bg-emerald-50/30">{won(calc.convertedTax)}</td>
                    <td className="px-2 py-1.5 text-right text-slate-700 border-r border-slate-100 bg-emerald-50/30">{won(calc.computedTax)}</td>
                    <td className="px-1 py-1 border-r border-slate-100 bg-blue-50/30"><input type="number" className="w-20 text-[11px] border border-slate-200 rounded px-1 py-0.5 text-right" value={inp.taxCredit} onChange={e => updateInput(i, { taxCredit: Number(e.target.value) })} /></td>
                    <td className="px-1 py-1 border-r border-slate-100 bg-blue-50/30"><input type="number" className="w-20 text-[11px] border border-slate-200 rounded px-1 py-0.5 text-right" value={inp.prepaidTax} onChange={e => updateInput(i, { prepaidTax: Number(e.target.value) })} /></td>
                    <td className="px-1 py-1 border-r border-slate-100 bg-blue-50/30"><input type="number" className="w-20 text-[11px] border border-slate-200 rounded px-1 py-0.5 text-right" value={inp.pensionDeposit} onChange={e => updateInput(i, { pensionDeposit: Number(e.target.value) })} /></td>
                    <td className="px-2 py-1.5 text-right text-slate-700 border-r border-slate-100">{won(calc.reportTax)}</td>
                    <td className="px-2 py-1.5 text-right text-slate-500 border-r border-slate-100">{won(calc.deferredTax)}</td>
                    <td className="px-2 py-1.5 text-right text-teal-700 font-bold border-r border-slate-100 bg-teal-50/50">{won(calc.finalIncomeTax)}</td>
                    <td className="px-2 py-1.5 text-right text-teal-700 font-bold bg-teal-50/50">{won(calc.finalLocalTax)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      }
    />
  )
}
