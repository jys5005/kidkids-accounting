'use client'
import React, { useState } from 'react'
const fmt = (n: number) => n.toLocaleString('ko-KR')
const inputCls = "border border-teal-300 rounded px-3 py-2 text-[13px] text-right focus:outline-none focus:border-teal-500"

const RATES = {
  pension: { total: 0.095, worker: 0.0475, employer: 0.0475 },
  health: { total: 0.0719, worker: 0.03595, employer: 0.03595 },
  longterm: { rate: 0.009448 },
  employ: {
    worker: 0.009,
    employer: { under150: 0.0025, over150: 0.0045, over150_1000: 0.0065, over1000: 0.0085 },
  },
}

type Tab = 'all' | 'pension' | 'health' | 'employ' | 'injury'
type Size = 'under150' | 'over150' | 'over150_1000' | 'over1000'

export default function InsuranceCalcPage() {
  const [tab, setTab] = useState<Tab>('all')
  const [salaryStr, setSalaryStr] = useState('')
  const [calcSalary, setCalcSalary] = useState(0)
  const salary = Number(salaryStr.replace(/[^0-9]/g, '')) || 0
  const [workerSize, setWorkerSize] = useState<Size>('over1000')

  const s = calcSalary
  const pensionBase = Math.min(s, 6370000) // 국민연금 기준소득월액 상한 637만원
  const pensionTotal = Math.round(pensionBase * RATES.pension.total)
  const pensionWorker = Math.round(pensionBase * RATES.pension.worker)
  const pensionEmployer = Math.round(pensionBase * RATES.pension.employer)

  const healthTotal = Math.round(s * RATES.health.total)
  const healthWorker = Math.round(s * RATES.health.worker)
  const healthEmployer = Math.round(s * RATES.health.employer)

  const longtermTotal = Math.round(healthTotal * RATES.longterm.rate / RATES.health.total)
  const longtermWorker = Math.round(longtermTotal / 2)
  const longtermEmployer = longtermTotal - longtermWorker

  const employWorker = Math.floor(s * RATES.employ.worker)
  const employEmployerBase = Math.floor(s * RATES.employ.worker) // 사업주 실업급여 0.9%
  const employEmployerStab = Math.floor(s * RATES.employ.employer[workerSize]) // 고용안정 각 요율
  const employEmployer = employEmployerBase + employEmployerStab
  const employTotal = employWorker + employEmployer

  const allTotal = pensionTotal + healthTotal + longtermTotal + employTotal
  const allWorker = pensionWorker + healthWorker + longtermWorker + employWorker
  const allEmployer = pensionEmployer + healthEmployer + longtermEmployer + (employTotal - employWorker)

  const reset = () => { setSalaryStr(''); setCalcSalary(0) }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'all', label: '전체' }, { key: 'pension', label: '국민연금' }, { key: 'health', label: '건강보험' }, { key: 'employ', label: '고용보험' }, { key: 'injury', label: '산재보험' },
  ]

  const ResultRow = ({ label, total, worker, employer }: { label: string; total: number; worker: number; employer: number }) => (
    <tr className="border-b border-slate-200">
      <td className="px-4 py-3 text-center text-slate-700 border-r border-slate-200 whitespace-pre-line">{label}</td>
      <td className="px-3 py-2 border-r border-slate-200"><div className="flex items-center gap-1"><input readOnly value={fmt(total)} className={`${inputCls} flex-1 bg-slate-50`} /><span className="text-slate-500 text-xs">원</span></div></td>
      <td className="px-3 py-2 border-r border-slate-200"><div className="flex items-center gap-1"><input readOnly value={fmt(worker)} className={`${inputCls} flex-1 bg-slate-50`} /><span className="text-slate-500 text-xs">원</span></div></td>
      <td className="px-3 py-2"><div className="flex items-center gap-1"><input readOnly value={fmt(employer)} className={`${inputCls} flex-1 bg-slate-50`} /><span className="text-slate-500 text-xs">원</span></div></td>
    </tr>
  )

  const salaryInputJsx = (
    <div className="px-4 mt-4 flex items-center gap-3">
      <span className="text-[13px] font-bold text-slate-700">월 급여</span>
      <input type="text" value={salaryStr ? Number(salaryStr).toLocaleString('ko-KR') : ''} onChange={e => setSalaryStr(e.target.value.replace(/[^0-9]/g, ''))} className={`${inputCls} w-80`} placeholder="0" />
      <span className="text-[13px] text-slate-500">원</span>
      <button onClick={() => setCalcSalary(salary)} className="px-4 py-2 text-[13px] font-bold text-white bg-blue-600 hover:bg-blue-700 rounded">계산</button>
      <button onClick={reset} className="px-4 py-2 text-[13px] font-bold text-slate-600 bg-slate-200 hover:bg-slate-300 rounded">초기화</button>
    </div>
  )

  const SizeSelector = () => (
    <div className="px-4 mt-3 flex items-start gap-3">
      <span className="text-[13px] font-bold text-slate-700 pt-0.5">근로자수</span>
      <div className="grid grid-cols-2 gap-x-8 gap-y-1">
        {([['under150','150인 미만 기업'],['over150','150인 이상 (우선지원대상기업)'],['over150_1000','150인 이상 1,000인 미만 기업'],['over1000','1,000인 이상 기업, 국가 지방자치단체']] as [Size,string][]).map(([val, label]) => (
          <label key={val} className="text-[12px] text-slate-600"><input type="radio" name="size" checked={workerSize === val} onChange={() => setWorkerSize(val)} className="mr-1" />{label}</label>
        ))}
      </div>
    </div>
  )

  return (
    <div className="p-3 space-y-3">
      <div className="bg-white rounded-xl border border-teal-400/30 shadow-sm">
        <div className="px-4 py-3 border-b border-teal-400/20 flex items-center justify-between">
          <span className="text-lg font-black text-slate-800">4대사회보험료 모의계산</span>
        </div>

        <div className="px-4 pt-4 flex items-center gap-0">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} className={`px-5 py-2 text-[13px] font-bold border transition-colors ${tab === t.key ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}>{t.label}</button>
          ))}
        </div>

        <div className="mx-4 mt-3 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 flex items-center gap-2">
          <span className="text-blue-600 font-bold">ⓘ</span>
          <span className="text-[12px] text-slate-600">2026년 기준(계산내용은 모의계산이기 때문에 실제와 다를 수 있습니다.)</span>
        </div>

        {salaryInputJsx}

        {/* 전체 탭 */}
        {tab === 'all' && <>
          <div className="px-4 mt-5 mb-4">
            <table className="w-full text-[13px] border-collapse border border-slate-200">
              <thead><tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-center font-bold text-slate-700 border-r border-slate-200 w-[120px]">구분</th>
                <th className="px-4 py-3 text-center font-bold text-slate-700 border-r border-slate-200">보험료 총액</th>
                <th className="px-4 py-3 text-center font-bold text-slate-700 border-r border-slate-200">근로자 부담금</th>
                <th className="px-4 py-3 text-center font-bold text-slate-700">사업주 부담금</th>
              </tr></thead>
              <tbody>
                <ResultRow label="국민연금" total={pensionTotal} worker={pensionWorker} employer={pensionEmployer} />
                <ResultRow label="건강보험" total={healthTotal} worker={healthWorker} employer={healthEmployer} />
                <ResultRow label={'건강보험\n(장기요양)'} total={longtermTotal} worker={longtermWorker} employer={longtermEmployer} />
                <ResultRow label="고용보험" total={employTotal} worker={employWorker} employer={employTotal - employWorker} />
                <tr className="bg-slate-50 font-bold">
                  <td className="px-4 py-3 text-center text-slate-800 border-r border-slate-200">합 계</td>
                  <td className="px-3 py-2 border-r border-slate-200"><div className="flex items-center gap-1"><input readOnly value={fmt(allTotal)} className={`${inputCls} flex-1 bg-slate-100 font-bold`} /><span className="text-slate-500 text-xs">원</span></div></td>
                  <td className="px-3 py-2 border-r border-slate-200"><div className="flex items-center gap-1"><input readOnly value={fmt(allWorker)} className={`${inputCls} flex-1 bg-slate-100 font-bold`} /><span className="text-slate-500 text-xs">원</span></div></td>
                  <td className="px-3 py-2"><div className="flex items-center gap-1"><input readOnly value={fmt(allEmployer)} className={`${inputCls} flex-1 bg-slate-100 font-bold`} /><span className="text-slate-500 text-xs">원</span></div></td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="px-4 mb-4">
            <p className="text-[11px] text-red-500 font-bold">※ 산재보험료는 별도로 확인하시기 바랍니다.</p>
            <a href="https://www.comwel.or.kr/comwel/paym/insu/chek1.jsp" target="_blank" rel="noopener noreferrer" className="mt-1 px-3 py-1.5 text-[11px] text-slate-600 bg-white border border-slate-300 rounded hover:bg-slate-50 inline-block">산재보험료율 및 산재보험료 알아보기</a>
          </div>
        </>}

        {/* 국민연금 탭 */}
        {tab === 'pension' && <div className="px-4 mt-4 mb-4 space-y-4">
          <table className="w-full text-[13px] border-collapse border border-slate-200">
            <thead><tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-4 py-3 text-center font-bold text-slate-700 border-r border-slate-200">연금보험료(전체)</th>
              <th className="px-4 py-3 text-center font-bold text-slate-700 border-r border-slate-200">근로자 부담금</th>
              <th className="px-4 py-3 text-center font-bold text-slate-700">사업주 부담금</th>
            </tr></thead>
            <tbody><tr>
              <td className="px-3 py-2 border-r border-slate-200"><div className="flex items-center gap-1"><input readOnly value={fmt(pensionTotal)} className={`${inputCls} flex-1 bg-slate-50`} /><span className="text-xs text-slate-500">원</span></div></td>
              <td className="px-3 py-2 border-r border-slate-200"><div className="flex items-center gap-1"><input readOnly value={fmt(pensionWorker)} className={`${inputCls} flex-1 bg-slate-50`} /><span className="text-xs text-slate-500">원</span></div></td>
              <td className="px-3 py-2"><div className="flex items-center gap-1"><input readOnly value={fmt(pensionEmployer)} className={`${inputCls} flex-1 bg-slate-50`} /><span className="text-xs text-slate-500">원</span></div></td>
            </tr></tbody>
          </table>
          <table className="w-full text-[12px] border-collapse border border-slate-200">
            <thead><tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-3 py-2 border-r border-slate-200">구분</th><th className="px-3 py-2 border-r border-slate-200">연금보험료(전체)</th><th className="px-3 py-2 border-r border-slate-200">근로자</th><th className="px-3 py-2">사업주</th>
            </tr></thead>
            <tbody><tr className="text-center border-b border-slate-100">
              <td className="px-3 py-2 border-r border-slate-200">기준 소득월액</td><td className="px-3 py-2 border-r border-slate-200">9.5%</td><td className="px-3 py-2 border-r border-slate-200">4.75%</td><td className="px-3 py-2">4.75%</td>
            </tr></tbody>
          </table>
          <div className="text-[11px] text-slate-600 space-y-1">
            <p className="font-bold text-blue-700 underline">연금보험료 = 기준소득월액 X 9.5%(연금보험료율)</p>
            <p className="font-bold">기준소득월액</p>
            <p>기준소득월액이란 국민연금의 보험료 및 급여 산정을 위하여 가입자가 신고한 소득월액에서 천원미만을 절사한 금액을 말하며, 최저40만원에서 최고 637만원까지의 범위로 결정하게 됩니다.</p>
            <p>따라서, <strong>신고한 소득월액이 40만원보다 적으면 40만원을 기준소득월액으로 하고, 637만원보다 많으면 637만원을 기준소득월액</strong>으로 합니다. (2025.7.1 기준)</p>
            <p className="font-bold">기준소득월액 상한액과 하한액</p>
            <p>기준소득월액 상한액과 하한액은 국민연금 사업장가입자와 지역가입자 전원(납부예외자 제외)의 평균소득월액의 3년간 변동하는 비율을 반영하여 매년 3월말까지 보건복지부 장관이 고시하며 해당연도 7월부터 1년간 적용합니다.</p>
            <p>○ 2025.7.1.~2026.6.30. (최저) 40만원 / (최고) 637만원</p>
          </div>
          <a href="https://www.4insure.or.kr/pbiz/ntcn/npsEarnInclsYnPopup.do" target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 text-[11px] text-slate-600 bg-white border border-slate-300 rounded hover:bg-slate-50 inline-block">근로소득 각종 수당의 국민연금 소득 포함 여부</a>
        </div>}

        {/* 건강보험 탭 */}
        {tab === 'health' && <div className="px-4 mt-4 mb-4 space-y-4">
          <p className="text-[11px] text-slate-500">· 아래 계산내용은 직장가입자의 보수월액에 따른 모의계산결과로서 실제와 다를 수 있으며 보수(월급) 외 소득(연 2000만원 초과)이 있으면 실제 보험료와는 차이가 있을 수 있습니다.</p>
          <table className="w-full text-[13px] border-collapse border border-slate-200">
            <thead><tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-3 py-2 border-r border-slate-200 w-[100px]">구분</th><th className="px-3 py-2 border-r border-slate-200">총액</th><th className="px-3 py-2 border-r border-slate-200">근로자 부담액</th><th className="px-3 py-2">사업주 부담액</th>
            </tr></thead>
            <tbody>
              <ResultRow label="건강보험료" total={healthTotal} worker={healthWorker} employer={healthEmployer} />
              <ResultRow label="장기요양보험료" total={longtermTotal} worker={longtermWorker} employer={longtermEmployer} />
            </tbody>
          </table>
          <table className="w-full text-[12px] border-collapse border border-slate-200">
            <thead><tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-3 py-2 border-r border-slate-200">구분</th><th className="px-3 py-2 border-r border-slate-200">기준액</th><th className="px-3 py-2 border-r border-slate-200">보험료율</th><th className="px-3 py-2" colSpan={2}>보험료 부담률</th>
            </tr></thead>
            <tbody>
              <tr className="text-center border-b border-slate-100">
                <td className="px-3 py-2 border-r border-slate-200">건강보험료</td><td className="px-3 py-2 border-r border-slate-200">보수월액</td><td className="px-3 py-2 border-r border-slate-200">7.19%</td><td className="px-3 py-2" colSpan={2}>근로자 50% / 사업주 50%</td>
              </tr>
              <tr className="text-center">
                <td className="px-3 py-2 border-r border-slate-200">장기요양보험료</td><td className="px-3 py-2 border-r border-slate-200">건강보험료</td><td className="px-3 py-2 border-r border-slate-200">0.9448%</td><td className="px-3 py-2" colSpan={2}>근로자 50% / 사업주 50%</td>
              </tr>
            </tbody>
          </table>
          <div className="text-[11px] text-slate-600 space-y-1">
            <p className="font-bold">▶ 직장가입자 본인 부담분 계산식(2026년 기준)</p>
            <p>- 건강보험료 = 보수월액 × 건강보험료율(7.19%) × 보험료 부담률(50%) (원 단위 절사)</p>
            <p>- 장기요양보험료 = 건강보험료 × (장기요양보험료율(0.9448%))/(건강보험료율(7.19%))(원 단위 절사)</p>
            {calcSalary > 0 && <>
              <p className="font-bold mt-2">▶ 예) 보수월액이 {fmt(calcSalary)}원인 경우</p>
              <p>- 건강보험료: {fmt(calcSalary)} × 7.19% × 50% = {fmt(healthWorker)}원</p>
              <p>- 장기요양보험료: {fmt(healthWorker)} × ((0.9448%)/(7.19%)) = {fmt(longtermWorker)}원</p>
              <p>⇒ 직장가입자 본인 부담분: {fmt(healthWorker)} + {fmt(longtermWorker)} = {fmt(healthWorker + longtermWorker)}원</p>
              <p>⇒ 사업장에서 납부할 보험료: 근로자 부담금({fmt(healthWorker + longtermWorker)}) + 사용자 부담금({fmt(healthEmployer + longtermEmployer)}) = {fmt(healthTotal + longtermTotal)}원</p>
            </>}
          </div>
        </div>}

        {/* 고용보험 탭 */}
        {tab === 'employ' && <div className="px-4 mt-4 mb-4 space-y-4">
          <table className="w-full text-[13px] border-collapse border border-slate-200 mt-3">
            <thead><tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-3 py-2 border-r border-slate-200">총액</th>
              <th className="px-3 py-2 border-r border-slate-200">근로자 부담액<br/><span className="text-[10px] font-normal">(실업급여 부담금)</span></th>
              <th className="px-3 py-2">사업주 부담액<br/><span className="text-[10px] font-normal">(실업급여+고용안정직능개발 부담금)</span></th>
            </tr></thead>
            <tbody><tr>
              <td className="px-3 py-2 border-r border-slate-200"><div className="flex items-center gap-1"><input readOnly value={fmt(employTotal)} className={`${inputCls} flex-1 bg-slate-50`} /><span className="text-xs text-slate-500">원</span></div></td>
              <td className="px-3 py-2 border-r border-slate-200"><div className="flex items-center gap-1"><input readOnly value={fmt(employWorker)} className={`${inputCls} flex-1 bg-slate-50`} /><span className="text-xs text-slate-500">원</span></div></td>
              <td className="px-3 py-2"><div className="flex items-center gap-1"><input readOnly value={fmt(employTotal - employWorker)} className={`${inputCls} flex-1 bg-slate-50`} /><span className="text-xs text-slate-500">원</span></div></td>
            </tr></tbody>
          </table>
          <table className="w-full text-[12px] border-collapse border border-slate-200">
            <thead><tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-3 py-2 border-r border-slate-200" colSpan={2}>구분</th><th className="px-3 py-2 border-r border-slate-200">근로자</th><th className="px-3 py-2">사업주</th>
            </tr></thead>
            <tbody>
              <tr className="text-center border-b border-slate-100"><td className="px-3 py-2 border-r border-slate-200" colSpan={2}>실업급여 (2022.07.01 기준)</td><td className="px-3 py-2 border-r border-slate-200">0.9%</td><td className="px-3 py-2">0.9%</td></tr>
              <tr className="text-center border-b border-slate-100"><td className="px-3 py-2 border-r border-slate-200" rowSpan={4}>고용안정,<br/>직업능력 개발사업</td><td className="px-3 py-2 border-r border-slate-200">150인 미만 기업</td><td className="px-3 py-2 border-r border-slate-200">-</td><td className="px-3 py-2">0.25%</td></tr>
              <tr className="text-center border-b border-slate-100"><td className="px-3 py-2 border-r border-slate-200">150인 이상 (우선지원대상기업)</td><td className="px-3 py-2 border-r border-slate-200">-</td><td className="px-3 py-2">0.45%</td></tr>
              <tr className="text-center border-b border-slate-100"><td className="px-3 py-2 border-r border-slate-200">150인 이상 1,000인 미만 기업</td><td className="px-3 py-2 border-r border-slate-200">-</td><td className="px-3 py-2">0.65%</td></tr>
              <tr className="text-center"><td className="px-3 py-2 border-r border-slate-200">1,000인 이상 기업,<br/>국가 지방자치단체</td><td className="px-3 py-2 border-r border-slate-200">-</td><td className="px-3 py-2">0.85%</td></tr>
            </tbody>
          </table>
          <div className="text-[11px] text-slate-600 space-y-1">
            <p className="font-bold">우선지원대상기업이란?</p>
            <p className="ml-2">제조업 500명 이하/ 건설업,운수 및 창고업 300명 이하/ 도·소매업, 숙박 및 음식점 등 200명 이하/ 그 밖의 업종 100명 이하</p>
            <p className="font-bold mt-1">고용보험 실업급여요율이 1.6%에서 1.8%로 0.2% 인상되었습니다.(2022.7.1 부터)</p>
            <p className="ml-2">(단, 예술인·노무제공자의 경우 1.4%에서 1.6%로 0.2% 인상)</p>
          </div>
        </div>}

        {/* 산재보험 탭 */}
        {tab === 'injury' && <div className="px-4 mt-4 mb-4 space-y-4 text-[12px] text-slate-700">
          <div>
            <p className="font-bold text-[14px]">1. 산재보험료</p>
            <p className="ml-3">= 보수총액(월 평균보수) X 보험료율 ÷ 1000</p>
            <p className="ml-3 mt-1">*산재보험료율</p>
            <p className="ml-3">&apos;사업종류별 산재보험료율 및 사업종류 예시&apos;를 기준으로 적용하고 있으며 이는 매년 6월 30일 현재, 과거 3년간의 보수총액에 대한 보험급여 총액의 비율을 기초로 재해 발생의 위험성에 따라 분류된 사업종류별 보험료율을 세분화하여 동년 12월 31일 경에 고시하여 다음 년도에 적용하고 있습니다.</p>
          </div>
          <p className="text-red-500 font-bold">2. 산재보험료율 결정은 근로복지공단에서 사업장성립신고서가 접수된 후 관할지사 담당자가 사업장실태확인 후 적용하며 처리기한은 5일 정도 소요됩니다.</p>
          <div>
            <p className="font-bold text-[14px]">3. 산재보험료율 적용의 기본원칙</p>
            <p className="ml-3">- 하나의 적용사업장에 대하여는 하나의 보험료율을 적용한다.</p>
            <p className="ml-3">- 하나의 사업장 안에서 보험료율이 다른 2종이상의 사업이 행해지는 경우에는 다음 순서에 따라 주된 사업을 결정하여 적용한다.</p>
            <p className="ml-6">①근로자수가 많은 사업</p>
            <p className="ml-6">②근로자수가 같거나 그 수를 파악할 수 없는 경우에는 보수총액이 많은 사업</p>
            <p className="ml-6">③상기 방법에 의하여 주된 사업을 결정할 수 없는 경우에는 매출액이 많은 제품을 제조하거나 서비스를 제공하는 사업</p>
          </div>
          <p className="font-bold text-[14px]">4. 산재보험료율 문의: 근로복지공단 1588-0075</p>
          <a href="https://www.comwel.or.kr/comwel/paym/insu/chek1.jsp" target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 text-[11px] text-slate-600 bg-white border border-slate-300 rounded hover:bg-slate-50 inline-block">산재보험료율 및 산재보험료 알아보기</a>
        </div>}

        <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-center gap-3">
          <button onClick={() => window.print()} className="px-8 py-2 text-[13px] font-bold text-white bg-slate-700 hover:bg-slate-800 rounded">출력</button>
          <button className="px-8 py-2 text-[13px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded">닫기</button>
        </div>
      </div>
    </div>
  )
}
