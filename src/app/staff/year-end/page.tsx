'use client'
import React, { useEffect, useMemo, useState } from 'react'
import { WAGE_SPEC, BIZ_SPEC, RETIRE_SPEC, type SpecRecord } from './specs'

type Tab = 'withholding' | 'wage' | 'wage-calc' | 'biz' | 'retire' | 'retire-calc'

const inputCls = "border border-teal-300 rounded px-2 py-1 text-[12px] focus:outline-none focus:border-teal-500"
const labelCls = "text-[12px] font-medium text-slate-700 bg-slate-50 px-3 py-2 border-r border-slate-200 whitespace-nowrap w-[140px] min-w-[140px]"
const cellCls = "px-3 py-2 text-[12px]"

const mockEmployer = {
  bizNo: '',
  name: '',
  ceo: '',
  director: '',
  addr: '',
  taxOffice: '',
  taxOfficeCd: '',
  phone: '',
  email: '',
  corpRrn: '',
  contact: { dept: '', name: '', phone: '' },
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
const mockWageStatements: WageEmp[] = []

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
const mockBizStatements: BizEmp[] = []
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
const mockRetireInputs: RetireInput[] = []
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
            { id: 'wage-calc', label: '근로소득 연말정산계산기', spec: '소득세법 시행규칙 별지 제24호서식(1) — 원천징수영수증 양식' },
            { id: 'biz', label: '사업소득지급명세서', spec: '자료구분 80 · 770byte × 7레코드 (231 항목)' },
            { id: 'retire', label: '퇴직소득지급명세서', spec: '자료구분 25 · 761byte × 4레코드 (.01 전자파일)' },
            { id: 'retire-calc', label: '퇴직소득 세액계산기', spec: '소득세법 시행규칙 별지 제24호서식(2) — xlsx 양식 기반' },
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
          {tab === 'wage-calc' && <WageCalcPanel />}
          {tab === 'biz' && <BizStatementPanel />}
          {tab === 'retire' && <RetirementStatementPanel />}
          {tab === 'retire-calc' && <RetirementCalcPanel />}
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
                    <span className={`text-[9px] px-1 py-0.5 rounded font-bold ${isDl ? 'bg-teal-500 text-white' : 'bg-slate-200 text-slate-400'}`}>{isDl ? '✓다운' : '미다운'}</span>
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
      spec={{ dataCode: '25', recordLen: RETIRE_LEN, recordTypes: ['A','B','C','D'], specName: '퇴직소득 지급명세서 전산매체 제출요령(2025.08.04) — .01 전자파일 빌드', itemCount: retireItemCount }}
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

// ============== 5번째 탭: 퇴직소득 세액계산기 (xlsx 영수증 양식) ==============
function RetirementCalcPanel() {
  const [year, setYear] = useState('2025')
  const [list, setList] = useState<RetireInput[]>(mockRetireInputs)
  const [activeIdx, setActiveIdx] = useState(0)
  const inp = list[activeIdx]
  const calc = useMemo(() => computeRetire(inp), [inp])

  const update = (patch: Partial<RetireInput>) => setList(prev => prev.map((r, i) => i === activeIdx ? { ...r, ...patch } : r))
  const fmtRrn = (rrn: string) => rrn.length === 13 ? `${rrn.slice(0,6)}-${rrn.slice(6,7)}******` : rrn

  const taxRate = calc.taxBase <= 14_000_000 ? '6%' : calc.taxBase <= 50_000_000 ? '15% (-126만)' : calc.taxBase <= 88_000_000 ? '24% (-576만)' : calc.taxBase <= 150_000_000 ? '35% (-1,544만)' : calc.taxBase <= 300_000_000 ? '38% (-1,994만)' : calc.taxBase <= 500_000_000 ? '40% (-2,594만)' : calc.taxBase <= 1_000_000_000 ? '42% (-3,594만)' : '45% (-6,594만)'

  const cls_h = "px-2 py-1.5 text-[11px] font-bold text-slate-700 bg-slate-100 border border-slate-300 text-center"
  const cls_l = "px-2 py-1.5 text-[11px] font-medium text-slate-700 bg-slate-50 border border-slate-200 whitespace-nowrap"
  const cls_v = "px-2 py-1.5 text-[11px] text-right text-slate-800 border border-slate-200 bg-emerald-50/30 font-mono"
  const cls_i = "px-2 py-1.5 text-[11px] border border-slate-200 bg-blue-50/30"
  const ipt = "w-full text-[11px] border border-slate-300 rounded px-1.5 py-0.5 focus:outline-none focus:border-teal-500"
  const iptN = ipt + " text-right"

  return (
    <div className="space-y-3">
      <EmployerCard />

      <div className="px-3 py-2 bg-emerald-50 border border-emerald-200 rounded text-[11px] text-emerald-700">
        <strong>퇴직소득원천징수영수증 / 지급명세서</strong> — 소득세법 시행규칙 별지 제24호서식(2). xlsx "(상반기)2026년 귀속 퇴직소득 세액계산 프로그램_D251229.xlsx" 양식 기반. 입력값 변경 시 (27)~(44) 즉시 재계산.
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[11px] text-slate-500">퇴사자:</span>
        {list.map((r, i) => (
          <button key={i} onClick={() => setActiveIdx(i)} className={`px-3 py-1 text-[11px] font-bold rounded border ${activeIdx === i ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
            {r.name} ({fmtRrn(r.rrn).slice(0,8)})
          </button>
        ))}
        <span className="ml-auto text-[11px] text-slate-500">자료귀속연도</span>
        <input className={`${inputCls} w-20`} value={year} onChange={e => setYear(e.target.value)} maxLength={4} />
      </div>

      <div className="bg-white rounded border border-slate-300">
        <div className="px-3 py-2 bg-slate-100 border-b border-slate-300 text-[12px] font-bold text-slate-700">소득자 정보 + 퇴직사유</div>
        <table className="w-full">
          <tbody>
            <tr>
              <td className={cls_l + ' w-[120px]'}>⑥ 성명</td>
              <td className={cls_i + ' w-[200px]'}><input className={ipt} value={inp.name} onChange={e => update({ name: e.target.value })} /></td>
              <td className={cls_l + ' w-[120px]'}>⑦ 주민등록번호</td>
              <td className={cls_v + ' w-[200px]'}>{fmtRrn(inp.rrn)}</td>
              <td className={cls_l + ' w-[100px]'}>⑨ 임원여부</td>
              <td className={cls_i}>
                <select className={ipt} value={inp.isExecutive} onChange={e => update({ isExecutive: e.target.value as 'Y'|'N' })}>
                  <option value="N">2 (부)</option><option value="Y">1 (여)</option>
                </select>
              </td>
            </tr>
            <tr>
              <td className={cls_l}>(12) 퇴직사유</td>
              <td className={cls_i} colSpan={3}>
                <select className={ipt} value={inp.reason} onChange={e => update({ reason: e.target.value as RetireInput['reason'] })}>
                  <option>정년퇴직</option><option>정리해고</option><option>자발적 퇴직</option><option>임원퇴직</option><option>중간정산</option><option>기타</option>
                </select>
              </td>
              <td className={cls_l}>귀속연도</td>
              <td className={cls_v}>{year}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded border border-slate-300 overflow-x-auto">
        <div className="px-3 py-2 bg-slate-100 border-b border-slate-300 text-[12px] font-bold text-slate-700">근속연수</div>
        <table className="w-full text-[11px]">
          <thead>
            <tr>
              <th className={cls_h}>구분</th>
              <th className={cls_h}>(18)입사일</th>
              <th className={cls_h}>(19)기산일</th>
              <th className={cls_h}>(20)퇴사일</th>
              <th className={cls_h}>(21)지급일</th>
              <th className={cls_h}>(22)근속월수</th>
              <th className={cls_h}>(23)제외월수</th>
              <th className={cls_h}>(24)가산월수</th>
              <th className={cls_h}>(25)중복월수</th>
              <th className={cls_h}>(26)근속연수</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className={cls_l + ' text-center'}>최종</td>
              <td className={cls_i}><input className={ipt + ' text-center'} value={inp.hireDate} onChange={e => update({ hireDate: e.target.value })} placeholder="YYYYMMDD" /></td>
              <td className={cls_i}><input className={ipt + ' text-center'} value={inp.hireDate} onChange={e => update({ hireDate: e.target.value })} placeholder="YYYYMMDD" /></td>
              <td className={cls_i}><input className={ipt + ' text-center'} value={inp.retireDate} onChange={e => update({ retireDate: e.target.value })} placeholder="YYYYMMDD" /></td>
              <td className={cls_i}><input className={ipt + ' text-center'} value={inp.paymentDate} onChange={e => update({ paymentDate: e.target.value })} placeholder="YYYYMMDD" /></td>
              <td className={cls_v + ' text-center'}>{calc.serviceMonths}</td>
              <td className={cls_i}><input type="number" className={iptN} value={inp.excludedMonths} onChange={e => update({ excludedMonths: Number(e.target.value) })} /></td>
              <td className={cls_i}><input type="number" className={iptN} value={inp.addedMonths} onChange={e => update({ addedMonths: Number(e.target.value) })} /></td>
              <td className={cls_v + ' text-center'}>0</td>
              <td className={cls_v + ' text-center font-bold'}>{calc.serviceYears}년</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded border border-slate-300">
        <div className="px-3 py-2 bg-slate-100 border-b border-slate-300 text-[12px] font-bold text-slate-700">퇴직급여 현황</div>
        <table className="w-full text-[11px]">
          <thead>
            <tr>
              <th className={cls_h}>구분</th>
              <th className={cls_h}>(15) 퇴직급여</th>
              <th className={cls_h}>(16) 비과세 퇴직급여</th>
              <th className={cls_h}>(17) 과세대상 (15-16)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className={cls_l + ' text-center'}>최종</td>
              <td className={cls_i}><input type="number" className={iptN} value={inp.retirePay} onChange={e => update({ retirePay: Number(e.target.value) })} /></td>
              <td className={cls_i}><input type="number" className={iptN} value={inp.nonTaxableRetirePay} onChange={e => update({ nonTaxableRetirePay: Number(e.target.value) })} /></td>
              <td className={cls_v}>{won(calc.taxableRetirePay)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded border border-slate-300">
        <div className="px-3 py-2 bg-slate-100 border-b border-slate-300 text-[12px] font-bold text-slate-700">과세표준 계산</div>
        <table className="w-full text-[11px]">
          <tbody>
            <tr><td className={cls_l + ' w-[260px]'}>(27) 퇴직소득 (=17)</td><td className={cls_v}>{won(calc.taxableRetirePay)}</td></tr>
            <tr><td className={cls_l}>(28) 근속연수공제 (5/10/20년 누진)</td><td className={cls_v}>{won(calc.serviceDeduction)}</td></tr>
            <tr><td className={cls_l}>(29) 환산급여 [(27-28) × 12 / 정산근속연수]</td><td className={cls_v}>{won(calc.convertedPay)}</td></tr>
            <tr><td className={cls_l}>(30) 환산급여별 공제</td><td className={cls_v}>{won(calc.convertedDeduction)}</td></tr>
            <tr className="bg-emerald-50">
              <td className={cls_l + ' font-bold'}>(31) 퇴직소득과세표준 (29-30)</td>
              <td className={cls_v + ' font-bold text-emerald-800'}>{won(calc.taxBase)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded border border-slate-300">
        <div className="px-3 py-2 bg-slate-100 border-b border-slate-300 text-[12px] font-bold text-slate-700">퇴직소득세액 계산</div>
        <table className="w-full text-[11px]">
          <tbody>
            <tr>
              <td className={cls_l + ' w-[260px]'}>(32) 환산산출세액 (31 × 세율)</td>
              <td className={cls_v + ' w-[180px]'}>{won(calc.convertedTax)}</td>
              <td className={cls_l + ' w-[100px]'}>적용 세율</td>
              <td className={cls_v}>{taxRate}</td>
            </tr>
            <tr>
              <td className={cls_l + ' font-bold'}>(33) 퇴직소득 산출세액 (32 / 12 × 정산근속연수)</td>
              <td className={cls_v + ' font-bold'} colSpan={3}>{won(calc.computedTax)}</td>
            </tr>
            <tr>
              <td className={cls_l}>(34) 세액공제</td>
              <td className={cls_i} colSpan={3}><input type="number" className={iptN} value={inp.taxCredit} onChange={e => update({ taxCredit: Number(e.target.value) })} /></td>
            </tr>
            <tr>
              <td className={cls_l}>(35) 기납부(또는 기과세이연) 세액</td>
              <td className={cls_i} colSpan={3}><input type="number" className={iptN} value={inp.prepaidTax} onChange={e => update({ prepaidTax: Number(e.target.value) })} /></td>
            </tr>
            <tr className="bg-emerald-50">
              <td className={cls_l + ' font-bold'}>(36) 신고대상세액 (33 - 34 - 35)</td>
              <td className={cls_v + ' font-bold text-emerald-800'} colSpan={3}>{won(calc.reportTax)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded border border-slate-300">
        <div className="px-3 py-2 bg-slate-100 border-b border-slate-300 text-[12px] font-bold text-slate-700">이연퇴직소득세액 계산</div>
        <table className="w-full text-[11px]">
          <tbody>
            <tr>
              <td className={cls_l + ' w-[200px]'}>(37) 신고대상세액 (=36)</td>
              <td className={cls_v + ' w-[180px]'}>{won(calc.reportTax)}</td>
              <td className={cls_l + ' w-[180px]'}>(38) 연금계좌 입금금액</td>
              <td className={cls_i}><input type="number" className={iptN} value={inp.pensionDeposit} onChange={e => update({ pensionDeposit: Number(e.target.value) })} /></td>
            </tr>
            <tr>
              <td className={cls_l}>(39) 퇴직급여 (=17)</td>
              <td className={cls_v}>{won(calc.taxableRetirePay)}</td>
              <td className={cls_l + ' font-bold'}>(40) 이연퇴직소득세 (37 × 38 / 39)</td>
              <td className={cls_v + ' font-bold text-amber-700'}>{won(calc.deferredTax)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded border-2 border-teal-400">
        <div className="px-3 py-2 bg-teal-100 border-b border-teal-300 text-[12px] font-bold text-teal-800">납부명세 — 차감원천징수세액 (10원 절사)</div>
        <table className="w-full text-[11px]">
          <thead>
            <tr>
              <th className={cls_h + ' w-[200px]'}>구분</th>
              <th className={cls_h}>소득세</th>
              <th className={cls_h}>지방소득세 (소득세/10)</th>
              <th className={cls_h}>농어촌특별세</th>
              <th className={cls_h}>계</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className={cls_l}>(42) 신고대상세액 (=36)</td>
              <td className={cls_v}>{won(calc.reportTax)}</td>
              <td className={cls_v}>{won(Math.floor(calc.reportTax / 10))}</td>
              <td className={cls_v}>0</td>
              <td className={cls_v}>{won(calc.reportTax + Math.floor(calc.reportTax / 10))}</td>
            </tr>
            <tr>
              <td className={cls_l}>(43) 이연퇴직소득세 (=40)</td>
              <td className={cls_v}>{won(calc.deferredTax)}</td>
              <td className={cls_v}>{won(Math.floor(calc.deferredTax / 10))}</td>
              <td className={cls_v}>0</td>
              <td className={cls_v}>{won(calc.deferredTax + Math.floor(calc.deferredTax / 10))}</td>
            </tr>
            <tr className="bg-teal-50 border-t-2 border-teal-400">
              <td className={cls_l + ' font-bold text-teal-800'}>(44) 차감원천징수세액 (42-43)</td>
              <td className={cls_v + ' font-bold text-teal-800 text-base'}>{won(calc.finalIncomeTax)}</td>
              <td className={cls_v + ' font-bold text-teal-800 text-base'}>{won(calc.finalLocalTax)}</td>
              <td className={cls_v}>0</td>
              <td className={cls_v + ' font-bold text-teal-800 text-base'}>{won(calc.finalIncomeTax + calc.finalLocalTax)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="text-[11px] text-slate-500 text-right">
        ※ 위의 원천징수세액(퇴직소득)을 정히 영수(지급)합니다 — {mockEmployer.name} (대표자: {mockEmployer.ceo})
      </div>
    </div>
  )
}

// ============== 6번째 탭: 근로소득 연말정산계산기 (소득세법 시행규칙 별지 제24호서식(1)) ==============
type WageCalcInput = {
  rrn: string; name: string
  totalPay: number; nonTaxable: number
  // 인적공제 (PDF: 본인/배우자/부양 1.5 + 경로 1.0 + 장애 2.0 + 한부모 1.0 + 부녀자 0.5)
  spouse: number; dependents: number; elderly: number; disabled: number
  childTotal: number; childUnder6: number
  newbornCount: number     // 출생·입양 자녀 수 (당해, 첫째 30/둘째 50/셋째↑ 70만)
  singleParent: number     // 한부모 (배우자 없는 자녀양육자, 100만)
  womanWorker: number      // 부녀자 (종합소득 3천만↓, 50만, 한부모와 중복 시 한부모 우선)
  // 4대보험
  nationalPension: number; healthInsurance: number; employmentInsurance: number
  // 주택자금 (PDF §52)
  housingLeaseLoan: number   // 주택임차차입금 원리금 (40%, 주택마련저축 합산 400만 한도)
  housingMortgage: number    // 장기주택저당차입금 이자 (600~2000만 한도)
  housingSaving: number      // 주택마련저축
  // 신용카드 등 (PDF: 5종 차등)
  cardCredit: number        // 신용카드 (15%)
  cardCash: number          // 현금영수증·체크·직불·선불 (30%)
  cardBook: number          // 도서공연·미술관·박물관·체육시설 (30%)
  cardTraditional: number   // 전통시장 (40%)
  cardTransport: number     // 대중교통 (40%)
  // 보장성 보험 (분리)
  insuranceGeneral: number  // 일반 (12%, 100만 한도)
  insuranceDisabled: number // 장애인전용 (15%, 100만 한도)
  // 의료비 (PDF: 4종 차등)
  medicalSelf: number       // 본인/65+/6-/장애/특례 (15%, 한도 없음)
  medicalGeneral: number    // 일반 부양가족 (15%, 700만 한도, 총급여 3% 초과)
  medicalInfertility: number // 난임시술 (30%, 한도 없음)
  medicalPremature: number  // 미숙아·선천성이상아 (20%, 한도 없음)
  // 교육비 — 3종 분리
  educationOwn: number              // 본인 (15%, 한도없음, 대학원 포함)
  educationKidsKindergarten: number // 유아·초중고 부양가족 (1인당 300만)
  educationKidsUniversity: number   // 대학 부양가족 (1인당 900만)
  educationKidsKgCount: number      // 유아·초중고 인원
  educationKidsUniCount: number     // 대학 인원
  // 기부금 — 4종 분리 (정치/고향사랑/우리사주/일반)
  donationPolitical: number         // 정치자금 (10만↓ 100/110, ↑ 15%)
  donationHometown: number          // 고향사랑 (10만↓ 100/110, ↑ 15%, 한도 5,000,000)
  donationEmployeeStock: number     // 우리사주조합 (15%)
  donationGeneral: number           // 일반/지정/법정 (1천만↓ 15% / ↑ 30%)
  // 월세
  monthlyRent: number
  // 연금계좌
  pensionAccount: number            // 900만 한도 × 15/12%
  pensionISA: number                // ISA 만기 전환 (300만 한도)
  // 혼인 (24~26)
  marriedThisYear: number
  // 중소기업 취업자 감면 (조특법 §30)
  smeQualified: number              // 0/1 (감면 대상자)
  smeYouth: number                  // 0/1 (청년=90% / 일반=70%)
  // 외국납부세액공제
  foreignTaxPaid: number
  // 기납부
  prepaidIncomeTax: number
}
const mockWageCalcInputs: WageCalcInput[] = [
  { rrn: '8503151111111', name: '김교사', totalPay: 36_000_000, nonTaxable: 1_200_000, spouse: 1, dependents: 1, elderly: 0, disabled: 0, childTotal: 1, childUnder6: 0, newbornCount: 0, singleParent: 0, womanWorker: 0, nationalPension: 1_620_000, healthInsurance: 1_290_000, employmentInsurance: 280_000, housingLeaseLoan: 0, housingMortgage: 0, housingSaving: 0, cardCredit: 12_000_000, cardCash: 4_000_000, cardBook: 800_000, cardTraditional: 600_000, cardTransport: 600_000, insuranceGeneral: 600_000, insuranceDisabled: 0, medicalSelf: 200_000, medicalGeneral: 600_000, medicalInfertility: 0, medicalPremature: 0, educationOwn: 0, educationKidsKindergarten: 0, educationKidsUniversity: 0, educationKidsKgCount: 0, educationKidsUniCount: 0, donationPolitical: 0, donationHometown: 0, donationEmployeeStock: 0, donationGeneral: 100_000, monthlyRent: 0, pensionAccount: 1_200_000, pensionISA: 0, marriedThisYear: 0, smeQualified: 0, smeYouth: 0, foreignTaxPaid: 0, prepaidIncomeTax: 1_020_000 },
  { rrn: '9007072222222', name: '이교사', totalPay: 32_400_000, nonTaxable: 1_200_000, spouse: 0, dependents: 0, elderly: 0, disabled: 0, childTotal: 0, childUnder6: 0, newbornCount: 0, singleParent: 0, womanWorker: 1, nationalPension: 1_460_000, healthInsurance: 1_160_000, employmentInsurance: 250_000, housingLeaseLoan: 0, housingMortgage: 0, housingSaving: 0, cardCredit: 8_000_000, cardCash: 3_000_000, cardBook: 200_000, cardTraditional: 400_000, cardTransport: 400_000, insuranceGeneral: 360_000, insuranceDisabled: 0, medicalSelf: 200_000, medicalGeneral: 0, medicalInfertility: 0, medicalPremature: 0, educationOwn: 0, educationKidsKindergarten: 0, educationKidsUniversity: 0, educationKidsKgCount: 0, educationKidsUniCount: 0, donationPolitical: 0, donationHometown: 0, donationEmployeeStock: 0, donationGeneral: 0, monthlyRent: 6_000_000, pensionAccount: 0, pensionISA: 0, marriedThisYear: 1, smeQualified: 1, smeYouth: 1, foreignTaxPaid: 0, prepaidIncomeTax: 720_000 },
  { rrn: '7811214444444', name: '박원장', totalPay: 60_000_000, nonTaxable: 1_200_000, spouse: 1, dependents: 2, elderly: 1, disabled: 0, childTotal: 2, childUnder6: 0, newbornCount: 0, singleParent: 0, womanWorker: 0, nationalPension: 2_700_000, healthInsurance: 2_150_000, employmentInsurance: 470_000, housingLeaseLoan: 0, housingMortgage: 0, housingSaving: 0, cardCredit: 18_000_000, cardCash: 7_000_000, cardBook: 1_200_000, cardTraditional: 800_000, cardTransport: 1_000_000, insuranceGeneral: 1_000_000, insuranceDisabled: 0, medicalSelf: 500_000, medicalGeneral: 1_000_000, medicalInfertility: 0, medicalPremature: 0, educationOwn: 0, educationKidsKindergarten: 3_000_000, educationKidsUniversity: 0, educationKidsKgCount: 2, educationKidsUniCount: 0, donationPolitical: 0, donationHometown: 100_000, donationEmployeeStock: 0, donationGeneral: 400_000, monthlyRent: 0, pensionAccount: 4_000_000, pensionISA: 0, marriedThisYear: 0, smeQualified: 0, smeYouth: 0, foreignTaxPaid: 0, prepaidIncomeTax: 3_400_000 },
]

function calcWageDeduction(totalPay: number): number {
  if (totalPay <= 5_000_000) return Math.floor(totalPay * 0.7)
  if (totalPay <= 15_000_000) return Math.floor(3_500_000 + (totalPay - 5_000_000) * 0.4)
  if (totalPay <= 45_000_000) return Math.floor(7_500_000 + (totalPay - 15_000_000) * 0.15)
  if (totalPay <= 100_000_000) return Math.floor(12_000_000 + (totalPay - 45_000_000) * 0.05)
  return Math.floor(14_750_000 + (totalPay - 100_000_000) * 0.02)
}
function calcIncomeTax(taxBase: number): number {
  if (taxBase <= 0) return 0
  let t = 0
  if (taxBase <= 14_000_000) t = taxBase * 0.06
  else if (taxBase <= 50_000_000) t = taxBase * 0.15 - 1_260_000
  else if (taxBase <= 88_000_000) t = taxBase * 0.24 - 5_760_000
  else if (taxBase <= 150_000_000) t = taxBase * 0.35 - 15_440_000
  else if (taxBase <= 300_000_000) t = taxBase * 0.38 - 19_940_000
  else if (taxBase <= 500_000_000) t = taxBase * 0.40 - 25_940_000
  else if (taxBase <= 1_000_000_000) t = taxBase * 0.42 - 35_940_000
  else t = taxBase * 0.45 - 65_940_000
  return Math.max(0, Math.floor(t))
}
function taxRateLabel(taxBase: number): string {
  if (taxBase <= 14_000_000) return '6%'
  if (taxBase <= 50_000_000) return '15% (-126만)'
  if (taxBase <= 88_000_000) return '24% (-576만)'
  if (taxBase <= 150_000_000) return '35% (-1,544만)'
  if (taxBase <= 300_000_000) return '38% (-1,994만)'
  if (taxBase <= 500_000_000) return '40% (-2,594만)'
  if (taxBase <= 1_000_000_000) return '42% (-3,594만)'
  return '45% (-6,594만)'
}
function calcWageTaxCredit(computedTax: number, totalPay: number): number {
  // 근로소득세액공제 (소득세법 §59) — PDF: 130만 이하 55% / 초과 30%, 한도 74/66/50/20만
  const credit = computedTax <= 1_300_000 ? Math.floor(computedTax * 0.55) : Math.floor(715_000 + (computedTax - 1_300_000) * 0.3)
  let limit = 740_000
  if (totalPay <= 33_000_000) limit = 740_000
  else if (totalPay <= 70_000_000) limit = Math.max(660_000, 740_000 - Math.floor((totalPay - 33_000_000) * 0.008))
  else if (totalPay <= 120_000_000) limit = Math.max(500_000, 660_000 - Math.floor((totalPay - 70_000_000) * 0.5 / 1_000) * 1_000)
  else limit = Math.max(200_000, 500_000 - Math.floor((totalPay - 120_000_000) * 0.5 / 1_000) * 1_000)
  return Math.min(credit, limit)
}

type WageCalcResult = {
  taxablePay: number; wageDeduction: number; comprehensiveIncome: number
  personalDeduction: number; pensionDeduction: number; specialIncomeDeduction: number
  cardDeduction: number; housingDeduction: number; totalDeductions: number
  taxBase: number; computedTax: number; taxRateText: string
  wageTaxCredit: number; childTaxCredit: number; pensionTaxCredit: number; pensionISACredit: number
  insGeneralCredit: number; insDisabledCredit: number
  medSelfCredit: number; medGeneralCredit: number; medInfertilityCredit: number; medPrematureCredit: number; medicalCredit: number
  educationOwnCredit: number; educationKgCredit: number; educationUniCredit: number; educationCredit: number
  donationPoliticalCredit: number; donationHometownCredit: number; donationStockCredit: number; donationGeneralCredit: number; donationCredit: number
  rentCredit: number; marriageCredit: number
  smeReduction: number; foreignTaxCredit: number
  specialTaxCredit: number; standardCredit: number; totalTaxCredits: number
  determinedTax: number; finalTax: number
}
function computeWageCalc(inp: WageCalcInput): WageCalcResult {
  const taxablePay = Math.max(0, inp.totalPay - inp.nonTaxable)
  const wageDeduction = calcWageDeduction(inp.totalPay)
  const comprehensiveIncome = Math.max(0, taxablePay - wageDeduction)

  // 인적공제 — 한부모(100만) 우선, 부녀자(50만, 종합소득 3천만↓)
  let extraPersonal = 0
  if (inp.singleParent) extraPersonal += 1_000_000
  else if (inp.womanWorker && comprehensiveIncome <= 30_000_000) extraPersonal += 500_000
  const personalDeduction = 1_500_000 + inp.spouse * 1_500_000 + inp.dependents * 1_500_000
    + inp.elderly * 1_000_000 + inp.disabled * 2_000_000 + extraPersonal

  // 연금보험료 + 특별소득공제
  const pensionDeduction = inp.nationalPension
  const specialIncomeDeduction = inp.healthInsurance + inp.employmentInsurance

  // 주택자금 (임차차입금 원리금 40% + 주택마련저축, 합산 400만 한도) + (장기저당 이자 600~2000만 한도, 단순 600만)
  const housingLeaseAmt = Math.floor(inp.housingLeaseLoan * 0.4)
  const housingLease = Math.min(4_000_000, housingLeaseAmt + inp.housingSaving)
  const housingMortgage = Math.min(6_000_000, inp.housingMortgage)  // 단순화: 비거치식 600만 기본
  const housingDeduction = housingLease + housingMortgage

  // 신용카드 등 (PDF: 5종 차등 — 신용 15% / 현금·체크 30% / 도서공연 30% / 전통시장 40% / 대중교통 40%)
  const cardTotal = inp.cardCredit + inp.cardCash + inp.cardBook + inp.cardTraditional + inp.cardTransport
  const cardThreshold = inp.totalPay * 0.25
  let cardDeduction = 0
  if (cardTotal > cardThreshold) {
    const excess = cardTotal - cardThreshold
    // 사용 비중에 따라 차등 (단순화: 전체 대비 비율)
    const ratio = excess / cardTotal
    cardDeduction = Math.floor(
      inp.cardCredit * ratio * 0.15
      + inp.cardCash * ratio * 0.30
      + inp.cardBook * ratio * 0.30
      + inp.cardTraditional * ratio * 0.40
      + inp.cardTransport * ratio * 0.40
    )
    // 한도 (총급여 7천만↓ 300만 / ↑ 250만, 전통+대중+도서 각 100만 별도 — 단순화)
    const baseLimit = inp.totalPay <= 70_000_000 ? 3_000_000 : 2_500_000
    const extraLimit = 1_000_000 * 3  // 전통/대중/도서 각 100만
    cardDeduction = Math.min(baseLimit + extraLimit, cardDeduction)
  }

  const totalDeductions = personalDeduction + pensionDeduction + specialIncomeDeduction + housingDeduction + cardDeduction
  const taxBase = Math.max(0, comprehensiveIncome - totalDeductions)
  const computedTax = calcIncomeTax(taxBase)
  const taxRateText = taxRateLabel(taxBase)

  const wageTaxCredit = calcWageTaxCredit(computedTax, inp.totalPay)

  // 자녀세액공제 (8세 이상) + 출산·입양 추가공제 (당해 첫째 30/둘째 50/셋째↑ 70만)
  const childBase = inp.childTotal === 0 ? 0 : inp.childTotal === 1 ? 250_000 : inp.childTotal === 2 ? 550_000 : 550_000 + (inp.childTotal - 2) * 400_000
  let newbornAdd = 0
  if (inp.newbornCount === 1) newbornAdd = 300_000
  else if (inp.newbornCount === 2) newbornAdd = 800_000   // 30 + 50
  else if (inp.newbornCount >= 3) newbornAdd = 800_000 + (inp.newbornCount - 2) * 700_000  // 30 + 50 + (N-2)*70
  const childTaxCredit = childBase + newbornAdd

  // 연금계좌 (900만 한도 × 15/12%) + ISA (300만 한도 추가)
  const pensionRate = inp.totalPay <= 55_000_000 ? 0.15 : 0.12
  const pensionTaxCredit = Math.floor(Math.min(9_000_000, inp.pensionAccount) * pensionRate)
  const pensionISACredit = Math.floor(Math.min(3_000_000, inp.pensionISA) * pensionRate)

  // 보장성 보험 (일반 12%, 100만 한도 / 장애인전용 15%, 100만 한도, 별도)
  const insGeneralCredit = Math.floor(Math.min(1_000_000, inp.insuranceGeneral) * 0.12)
  const insDisabledCredit = Math.floor(Math.min(1_000_000, inp.insuranceDisabled) * 0.15)

  // 의료비 — 4종 차등
  const medicalThreshold = inp.totalPay * 0.03
  // 본인·65+·6-·장애·특례: 한도 없음, 3% 초과분 × 15%
  // 일반 부양가족: 700만 한도, 3% 초과분 × 15%
  // 본인계+일반계 합산 후 3% 차감 — 본인부터 차감 (사용자 유리)
  const medSelfRaw = inp.medicalSelf
  const medGeneralRaw = Math.min(7_000_000, inp.medicalGeneral)
  const medSelfEffective = Math.max(0, medSelfRaw - medicalThreshold)
  const remainThreshold = Math.max(0, medicalThreshold - medSelfRaw)
  const medGeneralEffective = Math.max(0, medGeneralRaw - remainThreshold)
  const medSelfCredit = Math.floor(medSelfEffective * 0.15)
  const medGeneralCredit = Math.floor(medGeneralEffective * 0.15)
  // 난임 30%, 미숙아 20% (한도 없음, 3% 차감 안 함 — 별도)
  const medInfertilityCredit = Math.floor(inp.medicalInfertility * 0.30)
  const medPrematureCredit = Math.floor(inp.medicalPremature * 0.20)
  const medicalCredit = medSelfCredit + medGeneralCredit + medInfertilityCredit + medPrematureCredit

  // 교육비 — 3종 분리 (본인 한도없음 / 유아초중고 1인당 300만 / 대학 1인당 900만, 모두 15%)
  const educationOwnCredit = Math.floor(inp.educationOwn * 0.15)
  const eduKgLimit = inp.educationKidsKgCount * 3_000_000
  const educationKgCredit = Math.floor(Math.min(eduKgLimit, inp.educationKidsKindergarten) * 0.15)
  const eduUniLimit = inp.educationKidsUniCount * 9_000_000
  const educationUniCredit = Math.floor(Math.min(eduUniLimit, inp.educationKidsUniversity) * 0.15)
  const educationCredit = educationOwnCredit + educationKgCredit + educationUniCredit

  // 기부금 — 4종 분리
  // 정치자금 (10만↓ 100/110, 초과 15%)
  const polBase = Math.min(100_000, inp.donationPolitical)
  const polOver = Math.max(0, inp.donationPolitical - 100_000)
  const donationPoliticalCredit = Math.floor(polBase * 100 / 110 + polOver * 0.15)
  // 고향사랑 (10만↓ 100/110, 초과 15%, 한도 5,000,000)
  const hometownAmt = Math.min(5_000_000, inp.donationHometown)
  const hometownBase = Math.min(100_000, hometownAmt)
  const hometownOver = Math.max(0, hometownAmt - 100_000)
  const donationHometownCredit = Math.floor(hometownBase * 100 / 110 + hometownOver * 0.15)
  // 우리사주조합 (15%)
  const donationStockCredit = Math.floor(inp.donationEmployeeStock * 0.15)
  // 일반/지정/법정 (1천만↓ 15% / ↑ 30%)
  const genBase = Math.min(10_000_000, inp.donationGeneral)
  const genOver = Math.max(0, inp.donationGeneral - 10_000_000)
  const donationGeneralCredit = Math.floor(genBase * 0.15 + genOver * 0.30)
  const donationCredit = donationPoliticalCredit + donationHometownCredit + donationStockCredit + donationGeneralCredit

  // 월세
  const rentRate = inp.totalPay <= 55_000_000 ? 0.17 : 0.15
  const rentCredit = Math.floor(Math.min(10_000_000, inp.monthlyRent) * rentRate)

  // 혼인세액공제 (50만, 24~26 혼인신고)
  const marriageCredit = inp.marriedThisYear ? 500_000 : 0

  const specialTaxCredit = insGeneralCredit + insDisabledCredit + medicalCredit + educationCredit + donationCredit + rentCredit

  // 표준세액공제: 특별 모두 0이면 13만 자동
  const totalSpecialIncome = inp.healthInsurance + inp.employmentInsurance + inp.housingLeaseLoan + inp.housingMortgage + inp.housingSaving
  const totalSpecialTax = inp.insuranceGeneral + inp.insuranceDisabled + inp.medicalSelf + inp.medicalGeneral + inp.medicalInfertility + inp.medicalPremature + inp.educationOwn + inp.educationKidsKindergarten + inp.educationKidsUniversity + inp.donationPolitical + inp.donationHometown + inp.donationEmployeeStock + inp.donationGeneral + inp.monthlyRent
  const standardCredit = (totalSpecialIncome + totalSpecialTax === 0) ? 130_000 : 0

  // 중소기업 취업자 감면 (조특법 §30) — 청년 90% / 일반 70%, 연 200만 한도
  // 산출세액 × 감면율로 단순화 (실제는 근로소득 산출세액 비례)
  const smeRate = inp.smeYouth ? 0.90 : 0.70
  const smeReduction = inp.smeQualified ? Math.min(2_000_000, Math.floor(computedTax * smeRate)) : 0

  // 외국납부세액공제 (국내 산출세액 한도 단순화)
  const foreignTaxCredit = Math.min(computedTax, inp.foreignTaxPaid)

  const totalTaxCredits = wageTaxCredit + childTaxCredit + pensionTaxCredit + pensionISACredit + specialTaxCredit + marriageCredit + standardCredit + smeReduction + foreignTaxCredit
  const determinedTax = Math.max(0, computedTax - totalTaxCredits)
  const finalTax = determinedTax - inp.prepaidIncomeTax

  return {
    taxablePay, wageDeduction, comprehensiveIncome, personalDeduction,
    pensionDeduction, specialIncomeDeduction, cardDeduction, housingDeduction, totalDeductions,
    taxBase, computedTax, taxRateText,
    wageTaxCredit, childTaxCredit, pensionTaxCredit, pensionISACredit,
    insGeneralCredit, insDisabledCredit,
    medSelfCredit, medGeneralCredit, medInfertilityCredit, medPrematureCredit, medicalCredit,
    educationOwnCredit, educationKgCredit, educationUniCredit, educationCredit,
    donationPoliticalCredit, donationHometownCredit, donationStockCredit, donationGeneralCredit, donationCredit,
    rentCredit, marriageCredit,
    smeReduction, foreignTaxCredit,
    specialTaxCredit, standardCredit, totalTaxCredits, determinedTax, finalTax,
  }
}

type FamilyMember = {
  id: string
  relation: '본인' | '배우자' | '직계존속(부)' | '직계존속(모)' | '직계존속(시부/장인)' | '직계존속(시모/장모)' | '직계비속(자녀)' | '직계비속(손자녀)' | '형제자매' | '입양자' | '위탁아동' | '장애인 직계존비속'
  name: string
  rrn: string
  birthYear: number
  basicDeduction: boolean        // 기본공제 (연소득 100만↓, 근로 500만↓)
  isElderly: boolean             // 70세 이상 (직계존속)
  isDisabled: boolean            // 장애인
  isChild8plus: boolean          // 자녀세액 대상 (8세 이상)
  isNewborn: boolean             // 출산·입양 (당해 출생/입양)
}
const mockFamily: FamilyMember[] = [
  { id: 'F1', relation: '본인', name: '김교사', rrn: '8503151111111', birthYear: 1985, basicDeduction: true, isElderly: false, isDisabled: false, isChild8plus: false, isNewborn: false },
  { id: 'F2', relation: '배우자', name: '김배우', rrn: '8607010000000', birthYear: 1986, basicDeduction: true, isElderly: false, isDisabled: false, isChild8plus: false, isNewborn: false },
  { id: 'F3', relation: '직계비속(자녀)', name: '김자녀', rrn: '1503010000000', birthYear: 2015, basicDeduction: true, isElderly: false, isDisabled: false, isChild8plus: true, isNewborn: false },
]

type DocCat = 'medical-self' | 'medical-general' | 'medical-infertility' | 'medical-premature'
  | 'education-own' | 'education-kg' | 'education-uni'
  | 'insurance-general' | 'insurance-disabled'
  | 'donation-political' | 'donation-hometown' | 'donation-stock' | 'donation-general'
  | 'card-credit' | 'card-cash' | 'card-book' | 'card-traditional' | 'card-transport'
  | 'rent' | 'pension-account' | 'pension-isa' | 'housing-lease' | 'housing-mortgage' | 'housing-saving'
const DOC_CAT_LABEL: Record<DocCat, string> = {
  'medical-self': '본인·65+·6-·장애·특례', 'medical-general': '일반 부양가족',
  'medical-infertility': '난임시술', 'medical-premature': '미숙아·선천성',
  'education-own': '본인', 'education-kg': '유아·초중고', 'education-uni': '대학',
  'insurance-general': '일반 보장성', 'insurance-disabled': '장애인전용',
  'donation-political': '정치자금', 'donation-hometown': '고향사랑',
  'donation-stock': '우리사주조합', 'donation-general': '일반/지정/법정',
  'card-credit': '신용카드', 'card-cash': '현금영수증·체크', 'card-book': '도서·공연·박물관·체육',
  'card-traditional': '전통시장', 'card-transport': '대중교통',
  'rent': '월세', 'pension-account': '연금계좌(퇴직+연금저축)', 'pension-isa': 'ISA 만기 연금계좌 전환',
  'housing-lease': '주택임차차입금 원리금', 'housing-mortgage': '장기주택저당 이자', 'housing-saving': '주택마련저축',
}
const DOC_GROUPS: { group: string; cats: DocCat[]; placeholder: string }[] = [
  { group: '의료비', cats: ['medical-self', 'medical-general', 'medical-infertility', 'medical-premature'], placeholder: '병원·약국명 (예: ○○병원)' },
  { group: '교육비', cats: ['education-own', 'education-kg', 'education-uni'], placeholder: '학교·학원명 (예: ○○대학교)' },
  { group: '보험료', cats: ['insurance-general', 'insurance-disabled'], placeholder: '보험사·상품명 (예: ○○생명 실손보험)' },
  { group: '기부금', cats: ['donation-political', 'donation-hometown', 'donation-stock', 'donation-general'], placeholder: '단체명 (예: ○○재단)' },
  { group: '신용카드 등', cats: ['card-credit', 'card-cash', 'card-book', 'card-traditional', 'card-transport'], placeholder: '카드사·합계 (예: 신한카드 합계)' },
  { group: '주택자금', cats: ['housing-lease', 'housing-mortgage', 'housing-saving'], placeholder: '은행·상품명 (예: 국민은행 주택임차자금)' },
  { group: '연금·월세', cats: ['rent', 'pension-account', 'pension-isa'], placeholder: '임대인·금융기관 (예: ○○ 임대인)' },
]
function docCatPlaceholder(cat: DocCat): string {
  const g = DOC_GROUPS.find(g => g.cats.includes(cat))
  return g?.placeholder ?? ''
}
type Document = {
  id: string
  cat: DocCat
  familyId: string
  desc: string
  amount: number
}
const mockDocs: Document[] = [
  { id: 'D1', cat: 'medical-general', familyId: 'F2', desc: '○○병원', amount: 600_000 },
  { id: 'D2', cat: 'medical-self', familyId: 'F1', desc: '본인 정기검진', amount: 200_000 },
  { id: 'D3', cat: 'insurance-general', familyId: 'F1', desc: '실손보험', amount: 600_000 },
  { id: 'D4', cat: 'donation-general', familyId: 'F1', desc: '○○법인', amount: 100_000 },
  { id: 'D5', cat: 'card-credit', familyId: 'F1', desc: '신용카드 합계', amount: 12_000_000 },
  { id: 'D6', cat: 'card-cash', familyId: 'F1', desc: '현금영수증·체크 합계', amount: 4_000_000 },
  { id: 'D7', cat: 'card-book', familyId: 'F1', desc: '도서·공연', amount: 800_000 },
  { id: 'D8', cat: 'card-traditional', familyId: 'F1', desc: '전통시장', amount: 600_000 },
  { id: 'D9', cat: 'card-transport', familyId: 'F1', desc: '대중교통', amount: 600_000 },
  { id: 'D10', cat: 'pension-account', familyId: 'F1', desc: '연금저축', amount: 1_200_000 },
]

function WageCalcPanel() {
  const [year, setYear] = useState('2025')
  const [list, setList] = useState<WageCalcInput[]>(mockWageCalcInputs)
  const [activeIdx, setActiveIdx] = useState(0)
  const baseInp = list[activeIdx]

  const [family, setFamily] = useState<FamilyMember[]>(mockFamily)
  const [docs, setDocs] = useState<Document[]>(mockDocs)
  // 매트릭스 셀 클릭 시 영수증 명세 모달
  const [activeCell, setActiveCell] = useState<{ cat: DocCat; familyId: string } | null>(null)

  // 근로자 선택 변경 시 부양가족 표의 '본인' 자동 동기화
  useEffect(() => {
    setFamily(prev => prev.map(f => f.relation === '본인' ? { ...f, name: baseInp.name, rrn: baseInp.rrn } : f))
  }, [baseInp.rrn, baseInp.name])

  // 부양가족 자동 인적공제 합계 계산
  const familyAggregate = useMemo(() => {
    let spouse = 0, dependents = 0, elderly = 0, disabled = 0, childTotal = 0, newbornCount = 0
    family.forEach(f => {
      if (!f.basicDeduction) return
      if (f.relation === '본인') return
      if (f.relation === '배우자') spouse += 1
      else if (f.relation === '직계비속(자녀)' || f.relation === '직계비속(손자녀)') {
        dependents += 1
        if (f.isChild8plus) childTotal += 1
        if (f.isNewborn) newbornCount += 1
      }
      else dependents += 1
      if (f.isElderly) elderly += 1
      if (f.isDisabled) disabled += 1
    })
    return { spouse, dependents, elderly, disabled, childTotal, newbornCount }
  }, [family])

  // 공제서류 자동 합계
  const docAggregate = useMemo(() => {
    const sum: Record<DocCat, number> = {} as any
    docs.forEach(d => { sum[d.cat] = (sum[d.cat] ?? 0) + d.amount })
    return sum
  }, [docs])

  // baseInp + 자동 합계 머지 (자동이 우선)
  const inp: WageCalcInput = useMemo(() => ({
    ...baseInp,
    spouse: familyAggregate.spouse,
    dependents: familyAggregate.dependents,
    elderly: familyAggregate.elderly,
    disabled: familyAggregate.disabled,
    childTotal: familyAggregate.childTotal,
    newbornCount: familyAggregate.newbornCount,
    medicalSelf: docAggregate['medical-self'] ?? 0,
    medicalGeneral: docAggregate['medical-general'] ?? 0,
    medicalInfertility: docAggregate['medical-infertility'] ?? 0,
    medicalPremature: docAggregate['medical-premature'] ?? 0,
    educationOwn: docAggregate['education-own'] ?? 0,
    educationKidsKindergarten: docAggregate['education-kg'] ?? 0,
    educationKidsUniversity: docAggregate['education-uni'] ?? 0,
    insuranceGeneral: docAggregate['insurance-general'] ?? 0,
    insuranceDisabled: docAggregate['insurance-disabled'] ?? 0,
    donationPolitical: docAggregate['donation-political'] ?? 0,
    donationHometown: docAggregate['donation-hometown'] ?? 0,
    donationEmployeeStock: docAggregate['donation-stock'] ?? 0,
    donationGeneral: docAggregate['donation-general'] ?? 0,
    cardCredit: docAggregate['card-credit'] ?? 0,
    cardCash: docAggregate['card-cash'] ?? 0,
    cardBook: docAggregate['card-book'] ?? 0,
    cardTraditional: docAggregate['card-traditional'] ?? 0,
    cardTransport: docAggregate['card-transport'] ?? 0,
    monthlyRent: docAggregate['rent'] ?? 0,
    pensionAccount: docAggregate['pension-account'] ?? 0,
    pensionISA: docAggregate['pension-isa'] ?? 0,
    housingLeaseLoan: docAggregate['housing-lease'] ?? 0,
    housingMortgage: docAggregate['housing-mortgage'] ?? 0,
    housingSaving: docAggregate['housing-saving'] ?? 0,
  }), [baseInp, familyAggregate, docAggregate])

  const calc = useMemo(() => computeWageCalc(inp), [inp])

  const update = (patch: Partial<WageCalcInput>) => setList(prev => prev.map((r, i) => i === activeIdx ? { ...r, ...patch } : r))
  const fmtRrn = (rrn: string) => rrn.length === 13 ? `${rrn.slice(0,6)}-${rrn.slice(6,7)}******` : rrn

  const addFamily = () => setFamily(prev => [...prev, { id: 'F' + (prev.length + 1), relation: '직계비속(자녀)', name: '', rrn: '', birthYear: 2020, basicDeduction: true, isElderly: false, isDisabled: false, isChild8plus: false, isNewborn: false }])
  const updateFamily = (id: string, patch: Partial<FamilyMember>) => setFamily(prev => prev.map(f => f.id === id ? { ...f, ...patch } : f))
  const removeFamily = (id: string) => setFamily(prev => prev.filter(f => f.id !== id))

  const addDoc = () => setDocs(prev => [...prev, { id: 'D' + (prev.length + 1) + '_' + Date.now(), cat: 'medical-general', familyId: family[0]?.id || '', desc: '', amount: 0 }])
  const updateDoc = (id: string, patch: Partial<Document>) => setDocs(prev => prev.map(d => d.id === id ? { ...d, ...patch } : d))
  const removeDoc = (id: string) => setDocs(prev => prev.filter(d => d.id !== id))

  const cls_h = "px-2 py-1.5 text-[11px] font-bold text-slate-700 bg-slate-100 border border-slate-300 text-center"
  const cls_l = "px-2 py-1.5 text-[11px] font-medium text-slate-700 bg-slate-50 border border-slate-200 whitespace-nowrap"
  const cls_v = "px-2 py-1.5 text-[11px] text-right text-slate-800 border border-slate-200 bg-emerald-50/30 font-mono"
  const cls_i = "px-2 py-1.5 text-[11px] border border-slate-200 bg-blue-50/30"
  const ipt = "w-full text-[11px] border border-slate-300 rounded px-1.5 py-0.5 focus:outline-none focus:border-teal-500"
  const iptN = ipt + " text-right"

  return (
    <div className="space-y-3">
      <EmployerCard />

      <div className="px-3 py-2 bg-emerald-50 border border-emerald-200 rounded text-[11px] text-emerald-700 space-y-1">
        <div><strong>근로소득 원천징수영수증 / 지급명세서</strong> — 소득세법 시행규칙 별지 제24호서식(1) 기준 자동 계산. 입력값 변경 시 즉시 재계산.</div>
        <div className="text-[10px]">📕 출처: 국세청 「2025년 원천징수의무자를 위한 연말정산 신고안내」(2025.12 발간, 26.02.03 수정사항 반영)</div>
        <div className="text-[10px]">⚖️ 풀스택 룰: 근로소득세액공제 · 자녀세액공제 · <strong>연금계좌+ISA</strong> · <strong>보장성 일반/장애인 분리</strong> · <strong>의료비 4종 차등(15%/15%/30%/20%)</strong> · <strong>교육비 3종(본인·유아초중고 300만/명·대학 900만/명)</strong> · <strong>기부금 4종(정치·고향사랑 10만↓ 100/110·우리사주·일반 누진 15/30%)</strong> · <strong>신용카드 5종 차등(15/30/30/40/40%)</strong> · <strong>주택자금 3종(임차 40%·저당·마련저축)</strong> · <strong>한부모(100만)/부녀자(50만)</strong> · <strong>혼인(50만)</strong> · <strong>중소기업 감면(70/90%, 200만 한도)</strong> · <strong>외국납부세액공제</strong> · 월세 · 표준세액공제</div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[11px] text-slate-500">근로자:</span>
        {list.map((r, i) => (
          <button key={i} onClick={() => setActiveIdx(i)} className={`px-3 py-1 text-[11px] font-bold rounded border ${activeIdx === i ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
            {r.name} ({fmtRrn(r.rrn).slice(0,8)})
          </button>
        ))}
        <span className="ml-auto text-[11px] text-slate-500">자료귀속연도</span>
        <input className={`${inputCls} w-20`} value={year} onChange={e => setYear(e.target.value)} maxLength={4} />
      </div>

      {/* I. 급여 */}
      <div className="bg-white rounded border border-slate-300">
        <div className="px-3 py-2 bg-slate-100 border-b border-slate-300 text-[12px] font-bold text-slate-700">I. 근무처별 소득명세 + 비과세</div>
        <table className="w-full">
          <tbody>
            <tr>
              <td className={cls_l + ' w-[140px]'}>⑥ 성명</td>
              <td className={cls_i + ' w-[180px]'}><input className={ipt} value={inp.name} onChange={e => update({ name: e.target.value })} /></td>
              <td className={cls_l + ' w-[140px]'}>⑦ 주민등록번호</td>
              <td className={cls_v}>{fmtRrn(inp.rrn)}</td>
            </tr>
            <tr>
              <td className={cls_l}>⑯ 급여(총급여)</td>
              <td className={cls_i}><input type="number" className={iptN} value={inp.totalPay} onChange={e => update({ totalPay: Number(e.target.value) })} /></td>
              <td className={cls_l}>⑰ 비과세</td>
              <td className={cls_i}><input type="number" className={iptN} value={inp.nonTaxable} onChange={e => update({ nonTaxable: Number(e.target.value) })} /></td>
            </tr>
            <tr className="bg-emerald-50/50">
              <td className={cls_l + ' font-bold'}>⑱ 과세대상 (16-17)</td>
              <td className={cls_v + ' font-bold'}>{won(calc.taxablePay)}</td>
              <td className={cls_l + ' font-bold'}>㉑ 근로소득공제</td>
              <td className={cls_v + ' font-bold'}>{won(calc.wageDeduction)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* II. 종합소득금액 */}
      <div className="bg-white rounded border border-slate-300">
        <div className="px-3 py-2 bg-slate-100 border-b border-slate-300 text-[12px] font-bold text-slate-700">II. 종합소득금액</div>
        <table className="w-full">
          <tbody>
            <tr className="bg-emerald-50">
              <td className={cls_l + ' w-[260px] font-bold'}>㉒ 근로소득금액 (18-21)</td>
              <td className={cls_v + ' font-bold'}>{won(calc.comprehensiveIncome)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* III-0. 부양가족 등록 */}
      <div className="bg-white rounded border border-slate-300">
        <div className="px-3 py-2 bg-slate-100 border-b border-slate-300 text-[12px] font-bold text-slate-700 flex items-center gap-2">
          <span>III-0. 부양가족 등록</span>
          <span className="text-[10px] text-slate-500 font-normal">— 표에 등록한 부양가족이 III. 인적공제에 자동 반영됩니다</span>
          <button onClick={addFamily} className="ml-auto px-2 py-0.5 text-[11px] bg-teal-500 hover:bg-teal-600 text-white rounded">+ 부양가족 추가</button>
        </div>
        <table className="w-full text-[11px]">
          <thead>
            <tr>
              <th className={cls_h + ' w-[40px]'}>No</th>
              <th className={cls_h}>관계</th>
              <th className={cls_h}>성명</th>
              <th className={cls_h}>주민번호</th>
              <th className={cls_h + ' w-[70px]'}>기본공제</th>
              <th className={cls_h + ' w-[60px]'}>경로(70+)</th>
              <th className={cls_h + ' w-[60px]'}>장애</th>
              <th className={cls_h + ' w-[80px]'}>자녀세액(8+)</th>
              <th className={cls_h + ' w-[60px]'}>출생·입양</th>
              <th className={cls_h + ' w-[60px]'}>삭제</th>
            </tr>
          </thead>
          <tbody>
            {family.map((f, i) => (
              <tr key={f.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                <td className="px-2 py-1 text-center text-slate-500 border-r border-slate-100">{i+1}</td>
                <td className="px-1 py-1 border-r border-slate-100 bg-blue-50/30">
                  <select className={ipt} value={f.relation} onChange={e => updateFamily(f.id, { relation: e.target.value as FamilyMember['relation'] })} disabled={f.relation === '본인'}>
                    <option>본인</option><option>배우자</option><option>직계존속(부)</option><option>직계존속(모)</option><option>직계존속(시부/장인)</option><option>직계존속(시모/장모)</option>
                    <option>직계비속(자녀)</option><option>직계비속(손자녀)</option><option>형제자매</option><option>입양자</option><option>위탁아동</option><option>장애인 직계존비속</option>
                  </select>
                </td>
                <td className="px-1 py-1 border-r border-slate-100 bg-blue-50/30"><input className={ipt} value={f.name} onChange={e => updateFamily(f.id, { name: e.target.value })} /></td>
                <td className="px-1 py-1 border-r border-slate-100 bg-blue-50/30"><input className={ipt + ' text-center'} value={f.rrn} onChange={e => updateFamily(f.id, { rrn: e.target.value })} maxLength={13} /></td>
                <td className="px-1 py-1 text-center border-r border-slate-100 bg-blue-50/30"><input type="checkbox" checked={f.basicDeduction} onChange={e => updateFamily(f.id, { basicDeduction: e.target.checked })} /></td>
                <td className="px-1 py-1 text-center border-r border-slate-100 bg-blue-50/30"><input type="checkbox" checked={f.isElderly} onChange={e => updateFamily(f.id, { isElderly: e.target.checked })} /></td>
                <td className="px-1 py-1 text-center border-r border-slate-100 bg-blue-50/30"><input type="checkbox" checked={f.isDisabled} onChange={e => updateFamily(f.id, { isDisabled: e.target.checked })} /></td>
                <td className="px-1 py-1 text-center border-r border-slate-100 bg-blue-50/30"><input type="checkbox" checked={f.isChild8plus} onChange={e => updateFamily(f.id, { isChild8plus: e.target.checked })} /></td>
                <td className="px-1 py-1 text-center border-r border-slate-100 bg-blue-50/30"><input type="checkbox" checked={f.isNewborn} onChange={e => updateFamily(f.id, { isNewborn: e.target.checked })} /></td>
                <td className="px-1 py-1 text-center">
                  {f.relation !== '본인' && <button onClick={() => removeFamily(f.id)} className="text-red-500 text-[10px] hover:underline">삭제</button>}
                </td>
              </tr>
            ))}
            <tr className="bg-emerald-50 font-bold">
              <td className={cls_l + ' text-center'} colSpan={4}>자동 합계</td>
              <td className={cls_v + ' text-center'} colSpan={2}>배우자 {familyAggregate.spouse} · 부양 {familyAggregate.dependents}</td>
              <td className={cls_v + ' text-center'}>경로 {familyAggregate.elderly}</td>
              <td className={cls_v + ' text-center'}>장애 {familyAggregate.disabled}</td>
              <td className={cls_v + ' text-center'}>자녀 {familyAggregate.childTotal}</td>
              <td className={cls_v + ' text-center'}>출생·입양 {familyAggregate.newbornCount}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* III. 인적공제 */}
      <div className="bg-white rounded border border-slate-300">
        <div className="px-3 py-2 bg-slate-100 border-b border-slate-300 text-[12px] font-bold text-slate-700">III. 인적공제 (본인 150만 / 배우자·부양 150만 / 경로 100만 / 장애 200만 / 한부모 100만 / 부녀자 50만) — 부양가족 표 자동 반영</div>
        <table className="w-full">
          <tbody>
            <tr>
              <td className={cls_l + ' w-[120px]'}>본인</td>
              <td className={cls_v + ' w-[120px]'}>1명 (자동)</td>
              <td className={cls_l + ' w-[120px]'}>배우자</td>
              <td className={cls_i + ' w-[100px]'}><select className={ipt} value={inp.spouse} onChange={e => update({ spouse: Number(e.target.value) })}><option value={0}>0</option><option value={1}>1</option></select></td>
              <td className={cls_l + ' w-[120px]'}>부양가족</td>
              <td className={cls_i}><input type="number" className={iptN} value={inp.dependents} onChange={e => update({ dependents: Number(e.target.value) })} /></td>
            </tr>
            <tr>
              <td className={cls_l}>경로(70세↑)</td>
              <td className={cls_i}><input type="number" className={iptN} value={inp.elderly} onChange={e => update({ elderly: Number(e.target.value) })} /></td>
              <td className={cls_l}>장애인</td>
              <td className={cls_i}><input type="number" className={iptN} value={inp.disabled} onChange={e => update({ disabled: Number(e.target.value) })} /></td>
              <td className={cls_l}>자녀</td>
              <td className={cls_i}><input type="number" className={iptN} value={inp.childTotal} onChange={e => update({ childTotal: Number(e.target.value) })} placeholder="자녀(8세↑)" /></td>
            </tr>
            <tr>
              <td className={cls_l}>한부모 (100만)</td>
              <td className={cls_i}><select className={ipt} value={inp.singleParent} onChange={e => update({ singleParent: Number(e.target.value) })}><option value={0}>0</option><option value={1}>1</option></select></td>
              <td className={cls_l}>부녀자 (50만)</td>
              <td className={cls_i}><select className={ipt} value={inp.womanWorker} onChange={e => update({ womanWorker: Number(e.target.value) })}><option value={0}>0</option><option value={1}>1</option></select></td>
              <td className={cls_l + ' text-[10px] text-slate-500'} colSpan={2}>※ 중복 시 한부모 우선 / 부녀자는 종합소득 3천만↓</td>
            </tr>
            <tr className="bg-emerald-50">
              <td className={cls_l + ' font-bold'} colSpan={5}>㉘ 인적공제 합계</td>
              <td className={cls_v + ' font-bold'}>{won(calc.personalDeduction)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* IV. 연금보험료 + 특별소득공제 */}
      <div className="bg-white rounded border border-slate-300">
        <div className="px-3 py-2 bg-slate-100 border-b border-slate-300 text-[12px] font-bold text-slate-700">IV. 연금보험료 + 특별소득공제 (4대보험)</div>
        <table className="w-full">
          <tbody>
            <tr>
              <td className={cls_l + ' w-[140px]'}>㉙ 국민연금</td>
              <td className={cls_i + ' w-[180px]'}><input type="number" className={iptN} value={inp.nationalPension} onChange={e => update({ nationalPension: Number(e.target.value) })} /></td>
              <td className={cls_l + ' w-[140px]'}>건강·장기요양</td>
              <td className={cls_i + ' w-[180px]'}><input type="number" className={iptN} value={inp.healthInsurance} onChange={e => update({ healthInsurance: Number(e.target.value) })} /></td>
              <td className={cls_l + ' w-[140px]'}>고용보험</td>
              <td className={cls_i}><input type="number" className={iptN} value={inp.employmentInsurance} onChange={e => update({ employmentInsurance: Number(e.target.value) })} /></td>
            </tr>
            <tr>
              <td className={cls_l + ' font-bold'}>㉚ 연금보험료공제</td>
              <td className={cls_v + ' font-bold'}>{won(calc.pensionDeduction)}</td>
              <td className={cls_l + ' font-bold'} colSpan={3}>㉛ 특별소득공제 (건강+고용)</td>
              <td className={cls_v + ' font-bold'}>{won(calc.specialIncomeDeduction)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* V-0. 공제서류 등록 — 매트릭스 그룹핑 */}
      <div className="bg-white rounded border border-slate-300">
        <div className="px-3 py-2 bg-slate-100 border-b border-slate-300 text-[12px] font-bold text-slate-700">
          V-0. 공제서류 등록 (매트릭스: 종류 × 부양가족, 셀 클릭 → 영수증 명세 입력)
        </div>
        <div className="p-2 grid grid-cols-1 md:grid-cols-2 gap-2">
          {DOC_GROUPS.map(g => {
            // 그룹별 매트릭스: 행=세부cat, 열=부양가족 + 합계
            const groupTotal = g.cats.reduce((s, c) => s + (docAggregate[c] ?? 0), 0)
            return (
              <div key={g.group} className="bg-white border border-slate-200 rounded overflow-hidden">
                <div className="px-2 py-1.5 bg-teal-50 border-b border-slate-200 text-[11px] font-bold text-teal-700 flex items-center">
                  <span>{g.group}</span>
                  <span className="ml-auto text-[10px] text-slate-600">합계 <strong className="text-teal-800">{won(groupTotal)}</strong></span>
                </div>
                <table className="w-full text-[10px]">
                  <thead>
                    <tr>
                      <th className="px-1.5 py-1 text-left bg-slate-50 border-b border-r border-slate-200 font-bold text-slate-600">세부 종류</th>
                      {family.map(f => (
                        <th key={f.id} className="px-1 py-1 text-center bg-slate-50 border-b border-r border-slate-200 font-bold text-slate-600 last:border-r-0" title={`${f.relation} ${f.name}`}>
                          {f.name || f.relation}
                        </th>
                      ))}
                      <th className="px-1 py-1 text-center bg-slate-50 border-b border-slate-200 font-bold text-slate-700 w-[70px]">행계</th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.cats.map(cat => {
                      const rowTotal = docs.filter(d => d.cat === cat).reduce((s, d) => s + d.amount, 0)
                      return (
                        <tr key={cat} className="border-b border-slate-100 last:border-b-0">
                          <td className="px-1.5 py-1 border-r border-slate-100 text-slate-700">{DOC_CAT_LABEL[cat]}</td>
                          {family.map(f => {
                            const cellDocs = docs.filter(d => d.cat === cat && d.familyId === f.id)
                            const cellTotal = cellDocs.reduce((s, d) => s + d.amount, 0)
                            const cnt = cellDocs.length
                            return (
                              <td key={f.id} className="border-r border-slate-100 last:border-r-0 p-0">
                                <button
                                  onClick={() => setActiveCell({ cat, familyId: f.id })}
                                  className={`w-full px-1 py-1 text-right hover:bg-teal-50 cursor-pointer transition-colors ${cellTotal > 0 ? 'bg-emerald-50/40 text-slate-800 font-mono' : 'text-slate-400'}`}>
                                  {cellTotal > 0 ? `${won(cellTotal)}${cnt > 1 ? ` (${cnt})` : ''}` : '+'}
                                </button>
                              </td>
                            )
                          })}
                          <td className="px-1 py-1 text-right text-slate-700 font-bold bg-slate-50/50">{rowTotal > 0 ? won(rowTotal) : '-'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )
          })}
        </div>
        <div className="px-3 py-2 bg-emerald-50 border-t border-emerald-200 text-[11px] text-emerald-800 flex items-center">
          <span>등록 영수증 <strong>{docs.length}</strong>건 · 총 합계</span>
          <span className="ml-auto font-bold">{won(docs.reduce((s, d) => s + d.amount, 0))}</span>
        </div>
      </div>

      {/* 영수증 명세 모달 */}
      {activeCell && (() => {
        const cell = activeCell
        const cellFamily = family.find(f => f.id === cell.familyId)
        const cellDocs = docs.filter(d => d.cat === cell.cat && d.familyId === cell.familyId)
        const groupName = DOC_GROUPS.find(g => g.cats.includes(cell.cat))?.group ?? ''
        const cellTotal = cellDocs.reduce((s, d) => s + d.amount, 0)
        const addReceipt = () => setDocs(prev => [...prev, { id: 'D' + Date.now(), cat: cell.cat, familyId: cell.familyId, desc: '', amount: 0 }])
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50" onClick={() => setActiveCell(null)}>
            <div className="bg-white rounded-lg shadow-xl w-[760px] max-h-[80vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="px-4 py-3 bg-teal-50 border-b border-teal-300 flex items-center gap-2">
                <span className="text-[13px] font-bold text-teal-800">{groupName} · {DOC_CAT_LABEL[cell.cat]}</span>
                <span className="text-[11px] text-slate-600">— {cellFamily?.relation} {cellFamily?.name || '(이름 미입력)'}</span>
                <button onClick={() => setActiveCell(null)} className="ml-auto text-slate-500 hover:text-slate-800 text-[14px]">✕</button>
              </div>
              <div className="flex-1 overflow-y-auto p-3">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr>
                      <th className={cls_h + ' w-[40px]'}>No</th>
                      <th className={cls_h}>내용 (기관·단체·상품 등)</th>
                      <th className={cls_h + ' w-[140px]'}>금액</th>
                      <th className={cls_h + ' w-[60px]'}>삭제</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cellDocs.map((d, i) => (
                      <tr key={d.id} className="border-b border-slate-100">
                        <td className="px-2 py-1 text-center text-slate-500 border-r border-slate-100">{i+1}</td>
                        <td className="px-1 py-1 border-r border-slate-100 bg-blue-50/30"><input className={ipt} value={d.desc} onChange={e => updateDoc(d.id, { desc: e.target.value })} placeholder={docCatPlaceholder(d.cat)} /></td>
                        <td className="px-1 py-1 border-r border-slate-100 bg-blue-50/30"><input type="number" className={iptN} value={d.amount} onChange={e => updateDoc(d.id, { amount: Number(e.target.value) })} /></td>
                        <td className="px-1 py-1 text-center"><button onClick={() => removeDoc(d.id)} className="text-red-500 text-[10px] hover:underline">삭제</button></td>
                      </tr>
                    ))}
                    {cellDocs.length === 0 && (
                      <tr><td colSpan={4} className="px-3 py-6 text-center text-slate-400 text-[11px]">등록된 영수증이 없습니다. [+ 영수증 추가] 버튼을 눌러 입력하세요.</td></tr>
                    )}
                    <tr className="bg-emerald-50 font-bold">
                      <td className={cls_l + ' text-center'} colSpan={2}>합계 ({cellDocs.length}건)</td>
                      <td className={cls_v + ' text-right'}>{won(cellTotal)}</td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 flex items-center gap-2">
                <button onClick={addReceipt} className="px-3 py-1 text-[12px] font-bold text-white bg-teal-500 hover:bg-teal-600 rounded">+ 영수증 추가</button>
                <span className="ml-auto text-[10px] text-slate-500">소계가 V/VI 카드 자동 합계에 반영됩니다</span>
                <button onClick={() => setActiveCell(null)} className="px-3 py-1 text-[12px] font-bold text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50">닫기</button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* V-1. 주택자금공제 */}
      <div className="bg-white rounded border border-slate-300">
        <div className="px-3 py-2 bg-slate-100 border-b border-slate-300 text-[12px] font-bold text-slate-700 flex items-center gap-2">
          <span>V-1. 주택자금공제 (PDF §52)</span>
          <span className="text-[10px] text-slate-500 font-normal">🔒 자동 산출 — V-0 공제서류 표에 [주택임차차입금/장기저당/주택마련저축] 등록</span>
        </div>
        <table className="w-full">
          <tbody>
            <tr>
              <td className={cls_l + ' w-[200px]'}>주택임차차입금 원리금</td>
              <td className={cls_v + ' w-[180px]'}>{won(inp.housingLeaseLoan)}</td>
              <td className={cls_l + ' w-[160px]'}>주택마련저축</td>
              <td className={cls_v}>{won(inp.housingSaving)}</td>
            </tr>
            <tr>
              <td className={cls_l}>장기주택저당차입금 이자</td>
              <td className={cls_v}>{won(inp.housingMortgage)}</td>
              <td className={cls_l + ' font-bold'}>주택자금 공제 (40%·합산 400만 / 600~2000만)</td>
              <td className={cls_v + ' font-bold'}>{won(calc.housingDeduction)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* V-2. 신용카드 등 사용금액 소득공제 (5종 차등) */}
      <div className="bg-white rounded border border-slate-300">
        <div className="px-3 py-2 bg-slate-100 border-b border-slate-300 text-[12px] font-bold text-slate-700 flex items-center gap-2">
          <span>V-2. 신용카드 등 (총급여 25% 초과분 × 차등 공제율)</span>
          <span className="text-[10px] text-slate-500 font-normal">🔒 자동 산출 — V-0 공제서류 표에 [신용/현금영수증·체크/도서공연/전통시장/대중교통] 등록</span>
        </div>
        <table className="w-full">
          <tbody>
            <tr>
              <td className={cls_l + ' w-[200px]'}>① 신용카드 (15%)</td>
              <td className={cls_v + ' w-[160px]'}>{won(inp.cardCredit)}</td>
              <td className={cls_l + ' w-[200px]'}>② 현금영수증·체크 (30%)</td>
              <td className={cls_v}>{won(inp.cardCash)}</td>
            </tr>
            <tr>
              <td className={cls_l}>③ 도서·공연·박물관·체육 (30%)</td>
              <td className={cls_v}>{won(inp.cardBook)}</td>
              <td className={cls_l}>④ 전통시장 (40%)</td>
              <td className={cls_v}>{won(inp.cardTraditional)}</td>
            </tr>
            <tr>
              <td className={cls_l}>⑤ 대중교통 (40%)</td>
              <td className={cls_v}>{won(inp.cardTransport)}</td>
              <td className={cls_l + ' font-bold'}>신용카드 등 공제</td>
              <td className={cls_v + ' font-bold'}>{won(calc.cardDeduction)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 과세표준 + 산출세액 */}
      <div className="bg-white rounded border border-slate-300">
        <div className="px-3 py-2 bg-slate-100 border-b border-slate-300 text-[12px] font-bold text-slate-700">과세표준 + 산출세액</div>
        <table className="w-full">
          <tbody>
            <tr>
              <td className={cls_l + ' w-[260px]'}>㊿ 종합소득공제 합계</td>
              <td className={cls_v}>{won(calc.totalDeductions)}</td>
            </tr>
            <tr className="bg-emerald-50">
              <td className={cls_l + ' font-bold'}>① 과세표준 (22 - 50)</td>
              <td className={cls_v + ' font-bold text-emerald-800'}>{won(calc.taxBase)}</td>
            </tr>
            <tr>
              <td className={cls_l}>적용 세율</td>
              <td className={cls_v + ' text-center'}>{calc.taxRateText}</td>
            </tr>
            <tr className="bg-emerald-50">
              <td className={cls_l + ' font-bold'}>② 산출세액 (누진세율)</td>
              <td className={cls_v + ' font-bold text-emerald-800'}>{won(calc.computedTax)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* VI. 세액공제 */}
      <div className="bg-white rounded border border-slate-300">
        <div className="px-3 py-2 bg-slate-100 border-b border-slate-300 text-[12px] font-bold text-slate-700 flex items-center gap-2">
          <span>VI-1. 자동 세액공제</span>
          <span className="text-[10px] text-slate-500 font-normal">🔒 연금계좌/ISA는 V-0 표 자동 / 혼인은 직접 토글</span>
        </div>
        <table className="w-full">
          <tbody>
            <tr>
              <td className={cls_l + ' w-[220px]'}>③ 근로소득세액공제 (74/66/50/20만 한도)</td>
              <td className={cls_v + ' w-[160px]'}>{won(calc.wageTaxCredit)}</td>
              <td className={cls_l + ' w-[180px]'}>④ 자녀세액공제 ({inp.childTotal}명{inp.newbornCount > 0 ? ` + 출산·입양 ${inp.newbornCount}명` : ''})</td>
              <td className={cls_v}>{won(calc.childTaxCredit)}</td>
            </tr>
            <tr>
              <td className={cls_l}>⑤ 연금계좌 (퇴직+연금저축, 900만 한도)</td>
              <td className={cls_v}>{won(inp.pensionAccount)}</td>
              <td className={cls_l}>연금계좌 세액공제 ({inp.totalPay <= 55_000_000 ? '15%' : '12%'})</td>
              <td className={cls_v}>{won(calc.pensionTaxCredit)}</td>
            </tr>
            <tr>
              <td className={cls_l}>⑤-2 ISA 만기 연금계좌 전환 (300만 한도)</td>
              <td className={cls_v}>{won(inp.pensionISA)}</td>
              <td className={cls_l}>ISA 추가 세액공제</td>
              <td className={cls_v}>{won(calc.pensionISACredit)}</td>
            </tr>
            <tr>
              <td className={cls_l}>혼인세액공제 (24~26 혼인신고, 50만)</td>
              <td className={cls_i}><select className={ipt} value={inp.marriedThisYear} onChange={e => update({ marriedThisYear: Number(e.target.value) })}><option value={0}>해당없음</option><option value={1}>혼인신고함</option></select></td>
              <td className={cls_l}>혼인세액공제</td>
              <td className={cls_v}>{won(calc.marriageCredit)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded border border-slate-300">
        <div className="px-3 py-2 bg-slate-100 border-b border-slate-300 text-[12px] font-bold text-slate-700 flex items-center gap-2">
          <span>VI-2. 보장성 보험료 (일반 12% / 장애인전용 15%, 각 100만 한도)</span>
          <span className="text-[10px] text-slate-500 font-normal">🔒 자동 산출 — V-0 표에 [보험료(일반/장애인)] 등록</span>
        </div>
        <table className="w-full">
          <tbody>
            <tr>
              <td className={cls_l + ' w-[200px]'}>일반 보장성 보험</td>
              <td className={cls_v + ' w-[160px]'}>{won(inp.insuranceGeneral)}</td>
              <td className={cls_l + ' w-[160px]'}>일반 보험 세액공제</td>
              <td className={cls_v}>{won(calc.insGeneralCredit)}</td>
            </tr>
            <tr>
              <td className={cls_l}>장애인전용 보장성 보험</td>
              <td className={cls_v}>{won(inp.insuranceDisabled)}</td>
              <td className={cls_l}>장애인전용 세액공제</td>
              <td className={cls_v}>{won(calc.insDisabledCredit)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded border border-slate-300">
        <div className="px-3 py-2 bg-slate-100 border-b border-slate-300 text-[12px] font-bold text-slate-700 flex items-center gap-2">
          <span>VI-3. 의료비 (4종 차등 — 본인 한도없음 / 일반 700만 / 난임 30% / 미숙아 20%, 총급여 3% 초과)</span>
          <span className="text-[10px] text-slate-500 font-normal">🔒 자동 산출 — V-0 표에 [의료비 4종] 등록</span>
        </div>
        <table className="w-full">
          <tbody>
            <tr>
              <td className={cls_l + ' w-[220px]'}>본인·65+·6-·장애·특례 (한도없음, 15%)</td>
              <td className={cls_v + ' w-[160px]'}>{won(inp.medicalSelf)}</td>
              <td className={cls_l + ' w-[160px]'}>본인계 세액공제</td>
              <td className={cls_v}>{won(calc.medSelfCredit)}</td>
            </tr>
            <tr>
              <td className={cls_l}>일반 부양가족 (700만, 15%)</td>
              <td className={cls_v}>{won(inp.medicalGeneral)}</td>
              <td className={cls_l}>일반 세액공제</td>
              <td className={cls_v}>{won(calc.medGeneralCredit)}</td>
            </tr>
            <tr>
              <td className={cls_l}>난임시술비 (한도없음, 30%)</td>
              <td className={cls_v}>{won(inp.medicalInfertility)}</td>
              <td className={cls_l}>난임 세액공제</td>
              <td className={cls_v}>{won(calc.medInfertilityCredit)}</td>
            </tr>
            <tr>
              <td className={cls_l}>미숙아·선천성이상아 (한도없음, 20%)</td>
              <td className={cls_v}>{won(inp.medicalPremature)}</td>
              <td className={cls_l + ' font-bold'}>의료비 세액공제 합계</td>
              <td className={cls_v + ' font-bold'}>{won(calc.medicalCredit)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded border border-slate-300">
        <div className="px-3 py-2 bg-slate-100 border-b border-slate-300 text-[12px] font-bold text-slate-700 flex items-center gap-2">
          <span>VI-4. 교육비 (3종 분리)</span>
          <span className="text-[10px] text-slate-500 font-normal">🔒 자동 산출 — V-0 표에 [교육비 본인/유아초중고/대학] 등록 + 부양가족 표 인원 자동</span>
        </div>
        <table className="w-full">
          <tbody>
            <tr>
              <td className={cls_l + ' w-[200px]'}>본인 (한도없음, 대학원 포함)</td>
              <td className={cls_v + ' w-[160px]'}>{won(inp.educationOwn)}</td>
              <td className={cls_l + ' w-[140px]'}>본인 세액공제 (15%)</td>
              <td className={cls_v}>{won(calc.educationOwnCredit)}</td>
            </tr>
            <tr>
              <td className={cls_l}>유아·초중고 (1인당 300만)</td>
              <td className={cls_v}>{won(inp.educationKidsKindergarten)} <span className="text-[10px] text-slate-400">({inp.educationKidsKgCount}명)</span></td>
              <td className={cls_l}>유아·초중고 세액공제</td>
              <td className={cls_v}>{won(calc.educationKgCredit)}</td>
            </tr>
            <tr>
              <td className={cls_l}>대학 (1인당 900만)</td>
              <td className={cls_v}>{won(inp.educationKidsUniversity)} <span className="text-[10px] text-slate-400">({inp.educationKidsUniCount}명)</span></td>
              <td className={cls_l + ' font-bold'}>교육비 합계</td>
              <td className={cls_v + ' font-bold'}>{won(calc.educationCredit)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded border border-slate-300">
        <div className="px-3 py-2 bg-slate-100 border-b border-slate-300 text-[12px] font-bold text-slate-700 flex items-center gap-2">
          <span>VI-5. 기부금 (4종 분리)</span>
          <span className="text-[10px] text-slate-500 font-normal">🔒 자동 산출 — V-0 표에 [기부금(정치/고향사랑/우리사주/일반)] 등록</span>
        </div>
        <table className="w-full">
          <tbody>
            <tr>
              <td className={cls_l + ' w-[200px]'}>정치자금 (10만↓ 100/110)</td>
              <td className={cls_v + ' w-[160px]'}>{won(inp.donationPolitical)}</td>
              <td className={cls_l + ' w-[160px]'}>정치자금 공제</td>
              <td className={cls_v}>{won(calc.donationPoliticalCredit)}</td>
            </tr>
            <tr>
              <td className={cls_l}>고향사랑 (10만↓ 100/110, 500만 한도)</td>
              <td className={cls_v}>{won(inp.donationHometown)}</td>
              <td className={cls_l}>고향사랑 공제</td>
              <td className={cls_v}>{won(calc.donationHometownCredit)}</td>
            </tr>
            <tr>
              <td className={cls_l}>우리사주조합 (15%)</td>
              <td className={cls_v}>{won(inp.donationEmployeeStock)}</td>
              <td className={cls_l}>우리사주 공제</td>
              <td className={cls_v}>{won(calc.donationStockCredit)}</td>
            </tr>
            <tr>
              <td className={cls_l}>일반·지정·법정 (1천만↓ 15% / ↑ 30%)</td>
              <td className={cls_v}>{won(inp.donationGeneral)}</td>
              <td className={cls_l + ' font-bold'}>기부금 합계</td>
              <td className={cls_v + ' font-bold'}>{won(calc.donationCredit)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded border border-slate-300">
        <div className="px-3 py-2 bg-slate-100 border-b border-slate-300 text-[12px] font-bold text-slate-700 flex items-center gap-2">
          <span>VI-6. 월세 / 표준세액공제</span>
          <span className="text-[10px] text-slate-500 font-normal">🔒 월세 자동 산출 — V-0 표에 [월세] 등록 / 표준은 자동 판정</span>
        </div>
        <table className="w-full">
          <tbody>
            <tr>
              <td className={cls_l + ' w-[200px]'}>월세 (1000만 한도)</td>
              <td className={cls_v + ' w-[160px]'}>{won(inp.monthlyRent)}</td>
              <td className={cls_l}>월세 세액공제 ({inp.totalPay <= 55_000_000 ? '17%' : '15%'})</td>
              <td className={cls_v}>{won(calc.rentCredit)}</td>
            </tr>
            <tr>
              <td className={cls_l}>표준세액공제 (특별 0일 때 자동 13만)</td>
              <td className={cls_v} colSpan={3}>{won(calc.standardCredit)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded border border-slate-300">
        <div className="px-3 py-2 bg-slate-100 border-b border-slate-300 text-[12px] font-bold text-slate-700">VI-7. 중소기업 취업자 감면 / 외국납부세액공제</div>
        <table className="w-full">
          <tbody>
            <tr>
              <td className={cls_l + ' w-[200px]'}>중소기업 감면 대상 (조특법 §30)</td>
              <td className={cls_i + ' w-[160px]'}><select className={ipt} value={inp.smeQualified} onChange={e => update({ smeQualified: Number(e.target.value) })}><option value={0}>해당없음</option><option value={1}>해당</option></select></td>
              <td className={cls_l}>청년(15~34세) 여부</td>
              <td className={cls_i}><select className={ipt} value={inp.smeYouth} onChange={e => update({ smeYouth: Number(e.target.value) })}><option value={0}>일반(70%)</option><option value={1}>청년(90%)</option></select></td>
            </tr>
            <tr>
              <td className={cls_l + ' font-bold'}>중소기업 감면액 (산출세액 × {inp.smeYouth ? '90%' : '70%'}, 200만 한도)</td>
              <td className={cls_v + ' font-bold'} colSpan={3}>{won(calc.smeReduction)}</td>
            </tr>
            <tr>
              <td className={cls_l}>외국납부세액 (소법 §57)</td>
              <td className={cls_i}><input type="number" className={iptN} value={inp.foreignTaxPaid} onChange={e => update({ foreignTaxPaid: Number(e.target.value) })} /></td>
              <td className={cls_l + ' font-bold'}>외국납부세액공제</td>
              <td className={cls_v + ' font-bold'}>{won(calc.foreignTaxCredit)}</td>
            </tr>
            <tr className="bg-emerald-50">
              <td className={cls_l + ' font-bold'} colSpan={3}>세액공제 총합계 (③④⑤+⑤-2+혼인+보험·의료·교육·기부·월세·표준+중소기업감면+외국납부)</td>
              <td className={cls_v + ' font-bold text-emerald-800'}>{won(calc.totalTaxCredits)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 결정세액 + 차감징수 */}
      <div className="bg-white rounded border-2 border-teal-400">
        <div className="px-3 py-2 bg-teal-100 border-b border-teal-300 text-[12px] font-bold text-teal-800">결정세액 + 차감징수세액</div>
        <table className="w-full">
          <tbody>
            <tr className="bg-emerald-50">
              <td className={cls_l + ' w-[260px] font-bold'}>⑪ 결정세액 (산출세액 - 세액공제)</td>
              <td className={cls_v + ' font-bold text-emerald-800'}>{won(calc.determinedTax)}</td>
            </tr>
            <tr>
              <td className={cls_l}>⑫ 기납부세액 (월별 원천징수 합)</td>
              <td className={cls_i}><input type="number" className={iptN} value={inp.prepaidIncomeTax} onChange={e => update({ prepaidIncomeTax: Number(e.target.value) })} /></td>
            </tr>
            <tr className="bg-teal-50 border-t-2 border-teal-400">
              <td className={cls_l + ' font-bold text-teal-800'}>⑬ 차감징수세액 (결정 - 기납부)</td>
              <td className={`px-2 py-1.5 text-[11px] text-right border border-slate-200 font-mono font-bold text-base ${calc.finalTax < 0 ? 'text-blue-700 bg-blue-50' : 'text-red-700 bg-red-50'}`}>
                {calc.finalTax < 0 ? `+${won(-calc.finalTax)} (환급)` : `-${won(calc.finalTax)} (추가 납부)`}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="text-[11px] text-slate-500 text-right">
        ※ 위의 결정세액 등을 적정하게 영수(계산)하였음을 확인합니다 — {mockEmployer.name} (대표자: {mockEmployer.ceo})
      </div>
    </div>
  )
}
