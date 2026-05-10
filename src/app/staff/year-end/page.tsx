'use client'
import React, { useMemo, useState } from 'react'

type Tab = 'withholding' | 'wage-statement'

const inputCls = "border border-teal-300 rounded px-2 py-1 text-[12px] focus:outline-none focus:border-teal-500"
const labelCls = "text-[12px] font-medium text-slate-700 bg-slate-50 px-3 py-2 border-r border-slate-200 whitespace-nowrap w-[140px] min-w-[140px]"
const cellCls = "px-3 py-2 text-[12px]"

const mockEmployer = {
  bizNo: '1234567890',
  name: '미래클어린이집',
  ceo: '최은주',
  addr: '인천광역시 미추홀구 ○○로 12',
  taxOffice: '남인천세무서',
  taxOfficeCd: '137',
}

type WhEmp = {
  category: '간이세액' | '중도퇴사' | '일용근로'
  count: number
  payAmt: number
  incomeTax: number
  localTax: number
}

function makeMonthly(year: string): Record<string, WhEmp[]> {
  const r: Record<string, WhEmp[]> = {}
  for (let i = 1; i <= 12; i++) {
    const m = String(i).padStart(2, '0')
    const head = 8 + (i % 3 === 0 ? 1 : 0)
    r[m] = [
      { category: '간이세액', count: head, payAmt: 24_500_000 + i * 120_000, incomeTax: 412_330 + i * 4_500, localTax: 41_230 + i * 450 },
      { category: '중도퇴사', count: i === 7 ? 1 : 0, payAmt: i === 7 ? 1_800_000 : 0, incomeTax: 0, localTax: 0 },
      { category: '일용근로', count: 0, payAmt: 0, incomeTax: 0, localTax: 0 },
    ]
  }
  return r
}

type WageEmp = {
  rrn: string
  name: string
  hireDate: string
  leaveDate: string
  totalPay: number
  nonTaxable: number
  taxable: number
  determinedTax: number
  prepaidTax: number
}
const mockWageStatements: WageEmp[] = [
  { rrn: '8503151111111', name: '김교사', hireDate: '20210301', leaveDate: '', totalPay: 36_000_000, nonTaxable: 1_200_000, taxable: 34_800_000, determinedTax:   840_000, prepaidTax: 1_020_000 },
  { rrn: '9007072222222', name: '이교사', hireDate: '20230315', leaveDate: '', totalPay: 32_400_000, nonTaxable: 1_200_000, taxable: 31_200_000, determinedTax:   612_000, prepaidTax:   720_000 },
  { rrn: '7811214444444', name: '박원장', hireDate: '20180101', leaveDate: '', totalPay: 60_000_000, nonTaxable: 1_200_000, taxable: 58_800_000, determinedTax: 3_240_000, prepaidTax: 3_400_000 },
]

const won = (n: number) => n.toLocaleString('ko-KR')
const wonShort = (n: number) => {
  if (n >= 10_000_000) return (n / 10_000_000).toFixed(1) + '천만'
  if (n >= 10_000) return Math.round(n / 10_000).toLocaleString('ko-KR') + '만'
  return n.toLocaleString('ko-KR')
}
const pad = (s: string | number, len: number, ch = ' ', right = false) => {
  const v = String(s ?? '')
  if (v.length >= len) return v.slice(0, len)
  return right ? v.padStart(len, ch) : v.padEnd(len, ch)
}
const padN = (n: number, len: number) => pad(Math.max(0, Math.trunc(n)), len, '0', true)

function sumWh(rows: WhEmp[]) {
  return rows.reduce(
    (s, r) => ({ count: s.count + r.count, payAmt: s.payAmt + r.payAmt, incomeTax: s.incomeTax + r.incomeTax, localTax: s.localTax + r.localTax }),
    { count: 0, payAmt: 0, incomeTax: 0, localTax: 0 },
  )
}

function buildWithholdingFile(year: string, month: string, rows: WhEmp[]): string {
  const lines: string[] = []
  lines.push(
    'A' +
    pad(`${year}${month}`, 6) +
    pad(mockEmployer.bizNo, 10) +
    pad(mockEmployer.name, 40) +
    pad(mockEmployer.ceo, 20) +
    pad(mockEmployer.taxOfficeCd, 3),
  )
  rows.forEach((r, i) => {
    lines.push(
      'B' +
      pad(i + 1, 3, '0', true) +
      pad(r.category, 10) +
      padN(r.count, 6) +
      padN(r.payAmt, 14) +
      padN(r.incomeTax, 12) +
      padN(r.localTax, 12),
    )
  })
  const tot = sumWh(rows)
  lines.push('T' + padN(tot.count, 6) + padN(tot.payAmt, 14) + padN(tot.incomeTax, 12) + padN(tot.localTax, 12))
  return lines.join('\r\n')
}

function buildWageStatementFile(year: string, rows: WageEmp[]): string {
  const lines: string[] = []
  lines.push(
    'A' +
    pad(year, 4) +
    pad(mockEmployer.bizNo, 10) +
    pad(mockEmployer.name, 40) +
    pad(mockEmployer.ceo, 20) +
    pad(mockEmployer.taxOfficeCd, 3) +
    padN(rows.length, 6),
  )
  rows.forEach((r, i) => {
    const refund = r.prepaidTax - r.determinedTax
    lines.push(
      'B' +
      pad(i + 1, 5, '0', true) +
      pad(r.rrn, 13) +
      pad(r.name, 20) +
      pad(r.hireDate, 8) +
      pad(r.leaveDate || '00000000', 8) +
      padN(r.totalPay, 14) +
      padN(r.nonTaxable, 14) +
      padN(r.taxable, 14) +
      padN(r.determinedTax, 12) +
      padN(r.prepaidTax, 12) +
      (refund < 0 ? '-' : '+') +
      padN(Math.abs(refund), 11),
    )
  })
  return lines.join('\r\n')
}

function downloadText(name: string, body: string) {
  const blob = new Blob([body], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export default function YearEndPage() {
  const [tab, setTab] = useState<Tab>('withholding')

  return (
    <div className="p-3 space-y-3">
      <div className="bg-white rounded-xl border border-teal-400/30 shadow-sm">
        <div className="px-4 py-3 border-b border-teal-400/20 flex items-center gap-2">
          <span className="text-sm font-bold text-slate-700">연말정산 · 원천세</span>
          <span className="text-xs text-slate-400">홈택스 신고용 전자파일을 생성합니다 (가정 데이터, 추정 레이아웃).</span>
          <span className="ml-auto text-[11px] text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">국세청 정식 명세서 입수 후 레이아웃 교체 필요</span>
        </div>
        <div className="px-3 pt-2 flex gap-1">
          {([
            { id: 'withholding', label: '원천세' },
            { id: 'wage-statement', label: '지급명세서(근로소득)' },
          ] as { id: Tab; label: string }[]).map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-3 py-1.5 text-[12px] font-bold rounded-t border-b-2 ${
                tab === t.id ? 'border-teal-500 text-teal-700 bg-teal-50' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="p-4">{tab === 'withholding' ? <WithholdingPanel /> : <WageStatementPanel />}</div>
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
            <td className={cellCls}>{mockEmployer.ceo}</td>
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

function WithholdingPanel() {
  const [year, setYear] = useState('2025')
  const [month, setMonth] = useState('12')
  const monthly = useMemo(() => makeMonthly(year), [year])
  const rows = monthly[month] ?? []
  const totals = useMemo(() => sumWh(rows), [rows])

  const [generated, setGenerated] = useState<Set<string>>(new Set())
  const [downloaded, setDownloaded] = useState<Set<string>>(new Set())
  const [generatedAt, setGeneratedAt] = useState<Record<string, string>>({})
  const [downloadedAt, setDownloadedAt] = useState<Record<string, string>>({})
  const [preview, setPreview] = useState('')

  const ym = `${year}${month}`
  const stamp = () => new Date().toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })

  const markGenerated = (k: string) => {
    setGenerated(prev => new Set(prev).add(k))
    setGeneratedAt(prev => ({ ...prev, [k]: stamp() }))
  }
  const markDownloaded = (k: string) => {
    setDownloaded(prev => new Set(prev).add(k))
    setDownloadedAt(prev => ({ ...prev, [k]: stamp() }))
  }

  const handleBuild = () => {
    setPreview(buildWithholdingFile(year, month, rows))
    markGenerated(ym)
  }
  const handleDownload = () => {
    const body = buildWithholdingFile(year, month, rows)
    downloadText(`withholding_${ym}_${mockEmployer.bizNo}.01`, body)
    markGenerated(ym)
    markDownloaded(ym)
  }
  const handleJson = () => setPreview(JSON.stringify({ year, month, employer: mockEmployer, rows, totals }, null, 2))

  const handleBatchAll = () => {
    Object.keys(monthly).forEach(m => {
      const k = `${year}${m}`
      const body = buildWithholdingFile(year, m, monthly[m])
      downloadText(`withholding_${k}_${mockEmployer.bizNo}.01`, body)
      markGenerated(k)
      markDownloaded(k)
    })
  }

  const overallStats = useMemo(() => {
    const months = Object.keys(monthly)
    let totIncomeTax = 0
    let totPay = 0
    let totHead = 0
    months.forEach(m => {
      const s = sumWh(monthly[m])
      totIncomeTax += s.incomeTax
      totPay += s.payAmt
      totHead += s.count
    })
    const genCnt = months.filter(m => generated.has(`${year}${m}`)).length
    const dlCnt = months.filter(m => downloaded.has(`${year}${m}`)).length
    return { totIncomeTax, totPay, totHead, genCnt, dlCnt, total: months.length }
  }, [monthly, generated, downloaded, year])

  return (
    <div className="space-y-3">
      <EmployerCard />

      {/* 상황판 — 연도 요약 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        <StatCard label="연 인원(연인원)" value={`${overallStats.totHead}명`} tone="slate" />
        <StatCard label="연 총지급액" value={won(overallStats.totPay) + '원'} tone="slate" />
        <StatCard label="연 소득세 합계" value={won(overallStats.totIncomeTax) + '원'} tone="teal" />
        <StatCard label="전자파일 생성" value={`${overallStats.genCnt} / ${overallStats.total}월`} tone={overallStats.genCnt === overallStats.total ? 'emerald' : 'amber'} />
        <StatCard label="다운로드 완료" value={`${overallStats.dlCnt} / ${overallStats.total}월`} tone={overallStats.dlCnt === overallStats.total ? 'emerald' : 'amber'} />
      </div>

      {/* 월별 상황판 */}
      <div className="bg-white rounded border border-slate-200 overflow-hidden">
        <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
          <span className="text-[12px] font-bold text-slate-700">월별 신고 상황판 ({year}년)</span>
          <span className="text-[11px] text-slate-400">셀 클릭 시 해당 월 상세로 이동</span>
          <input className={`${inputCls} w-20 ml-auto`} value={year} onChange={e => setYear(e.target.value)} maxLength={4} />
          <button onClick={handleBatchAll} className="px-3 py-1 text-[11px] font-bold text-white bg-teal-500 hover:bg-teal-600 rounded">12개월 일괄 다운로드</button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 p-2">
          {Object.keys(monthly).map(m => {
            const k = `${year}${m}`
            const s = sumWh(monthly[m])
            const isGen = generated.has(k)
            const isDl = downloaded.has(k)
            const active = month === m
            return (
              <button
                key={m}
                onClick={() => setMonth(m)}
                className={`text-left p-2 rounded border transition-all ${
                  active ? 'border-teal-500 bg-teal-50 ring-2 ring-teal-200' : 'border-slate-200 bg-white hover:border-teal-300 hover:bg-teal-50/30'
                }`}
              >
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
          <div className="text-[11px] text-slate-500 mb-1">선택 월</div>
          <div className="text-[14px] font-bold text-teal-700 px-3 py-1.5 bg-teal-50 border border-teal-300 rounded">{year}년 {Number(month)}월</div>
        </div>
        <div className="ml-auto flex gap-2">
          <button onClick={handleJson} className="px-3 py-1.5 text-[12px] font-bold text-slate-600 bg-white border border-slate-300 rounded hover:bg-slate-50">JSON 미리보기</button>
          <button onClick={handleBuild} className="px-3 py-1.5 text-[12px] font-bold text-teal-700 bg-teal-50 border border-teal-300 rounded hover:bg-teal-100">전자파일 미리보기</button>
          <button onClick={handleDownload} className="px-3 py-1.5 text-[12px] font-bold text-white bg-teal-500 hover:bg-teal-600 rounded">전자파일 다운로드</button>
        </div>
      </div>

      <div className="bg-white rounded border border-slate-200 overflow-hidden">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="bg-teal-50 border-b border-slate-300">
              <th className="px-2 py-2 border-r border-slate-200 w-[40px]">No</th>
              <th className="px-2 py-2 border-r border-slate-200">소득구분</th>
              <th className="px-2 py-2 border-r border-slate-200 w-[80px]">인원</th>
              <th className="px-2 py-2 border-r border-slate-200">총지급액</th>
              <th className="px-2 py-2 border-r border-slate-200">소득세</th>
              <th className="px-2 py-2">지방소득세</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-slate-100">
                <td className="px-2 py-1.5 text-center text-slate-500 border-r border-slate-100">{i + 1}</td>
                <td className="px-2 py-1.5 text-slate-700 border-r border-slate-100">{r.category}</td>
                <td className="px-2 py-1.5 text-center text-slate-700 border-r border-slate-100">{r.count}</td>
                <td className="px-2 py-1.5 text-right text-slate-700 border-r border-slate-100">{won(r.payAmt)}</td>
                <td className="px-2 py-1.5 text-right text-slate-700 border-r border-slate-100">{won(r.incomeTax)}</td>
                <td className="px-2 py-1.5 text-right text-slate-700">{won(r.localTax)}</td>
              </tr>
            ))}
            <tr className="bg-slate-50 font-bold border-t border-slate-300">
              <td className="px-2 py-1.5 text-center text-slate-600 border-r border-slate-100" colSpan={2}>합계</td>
              <td className="px-2 py-1.5 text-center text-slate-700 border-r border-slate-100">{totals.count}</td>
              <td className="px-2 py-1.5 text-right text-slate-700 border-r border-slate-100">{won(totals.payAmt)}</td>
              <td className="px-2 py-1.5 text-right text-slate-700 border-r border-slate-100">{won(totals.incomeTax)}</td>
              <td className="px-2 py-1.5 text-right text-slate-700">{won(totals.localTax)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {preview && (
        <div className="bg-slate-900 rounded p-3 overflow-auto">
          <pre className="text-[11px] text-emerald-200 font-mono whitespace-pre">{preview}</pre>
        </div>
      )}
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

function WageStatementPanel() {
  const [year, setYear] = useState('2025')
  const [rows] = useState<WageEmp[]>(mockWageStatements)
  const [preview, setPreview] = useState('')
  const [generated, setGenerated] = useState(false)
  const [downloaded, setDownloaded] = useState(false)
  const [generatedAt, setGeneratedAt] = useState('')
  const [downloadedAt, setDownloadedAt] = useState('')

  const totals = useMemo(() => rows.reduce(
    (s, r) => ({
      totalPay: s.totalPay + r.totalPay,
      nonTaxable: s.nonTaxable + r.nonTaxable,
      taxable: s.taxable + r.taxable,
      determinedTax: s.determinedTax + r.determinedTax,
      prepaidTax: s.prepaidTax + r.prepaidTax,
    }),
    { totalPay: 0, nonTaxable: 0, taxable: 0, determinedTax: 0, prepaidTax: 0 },
  ), [rows])

  const stamp = () => new Date().toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
  const handleBuild = () => {
    setPreview(buildWageStatementFile(year, rows))
    setGenerated(true)
    setGeneratedAt(stamp())
  }
  const handleDownload = () => {
    const body = buildWageStatementFile(year, rows)
    downloadText(`wage_${year}_${mockEmployer.bizNo}.01`, body)
    setGenerated(true)
    setGeneratedAt(stamp())
    setDownloaded(true)
    setDownloadedAt(stamp())
  }
  const handleJson = () => setPreview(JSON.stringify({ year, employer: mockEmployer, rows, totals }, null, 2))

  const fmtRrn = (rrn: string) => rrn.length === 13 ? `${rrn.slice(0, 6)}-${rrn.slice(6, 7)}******` : rrn
  const fmtDate = (d: string) => d ? `${d.slice(0, 4)}.${d.slice(4, 6)}.${d.slice(6, 8)}` : '-'

  return (
    <div className="space-y-3">
      <EmployerCard />

      {/* 상황판 */}
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
          <thead>
            <tr className="bg-teal-50 border-b border-slate-300">
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
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const refund = r.prepaidTax - r.determinedTax
              return (
                <tr key={i} className="border-b border-slate-100">
                  <td className="px-2 py-1.5 text-center text-slate-500 border-r border-slate-100">{i + 1}</td>
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
            <tr className="bg-slate-50 font-bold border-t border-slate-300">
              <td className="px-2 py-1.5 text-center text-slate-600 border-r border-slate-100" colSpan={5}>합계</td>
              <td className="px-2 py-1.5 text-right text-slate-700 border-r border-slate-100">{won(totals.totalPay)}</td>
              <td className="px-2 py-1.5 text-right text-slate-700 border-r border-slate-100">{won(totals.nonTaxable)}</td>
              <td className="px-2 py-1.5 text-right text-slate-700 border-r border-slate-100">{won(totals.taxable)}</td>
              <td className="px-2 py-1.5 text-right text-slate-700 border-r border-slate-100">{won(totals.determinedTax)}</td>
              <td className="px-2 py-1.5 text-right text-slate-700 border-r border-slate-100">{won(totals.prepaidTax)}</td>
              <td className="px-2 py-1.5"></td>
            </tr>
          </tbody>
        </table>
      </div>

      {preview && (
        <div className="bg-slate-900 rounded p-3 overflow-auto">
          <pre className="text-[11px] text-emerald-200 font-mono whitespace-pre">{preview}</pre>
        </div>
      )}
    </div>
  )
}
