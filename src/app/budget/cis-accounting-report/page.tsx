'use client'

import React, { useState } from 'react'

const fmt = (n: number) => n.toLocaleString('ko-KR')

interface ReportRow {
  gwanCode?: string
  gwanName?: string
  hangCode?: string
  hangName?: string
  mokCode?: string
  mokName?: string
  semokCode?: string
  semokName?: string
  budget: number
  basis: string[]
  reportedAmount: number
}

const reportData: ReportRow[] = [
  // 01 보육료
  {
    gwanCode: '01', gwanName: '보육료', hangCode: '11', hangName: '보육료', mokCode: '111', mokName: '정부지원 보육료',
    budget: 186288000, reportedAmount: 186288000,
    basis: [
      '정부지원보육료 만0세 584,000원*6명*12월=42,048,000',
      '정부지원보육료 만1세 515,000원*8명*12월=49,440,000',
      '정부지원보육료 만2세 426,000원*10명*12월=51,120,000',
      '정부지원보육료 만3세 280,000원*6명*12월=20,160,000',
      '정부지원보육료 만5세 280,000원*7명*12월=23,520,000',
    ],
  },
  {
    mokCode: '112', mokName: '부모부담 보육료',
    budget: 0, reportedAmount: 0,
    basis: [],
  },
  // 02 수익자부담 수입
  {
    gwanCode: '02', gwanName: '수익자부담 수입', hangCode: '21', hangName: '선택적 보육활동비', mokCode: '211', mokName: '특별활동비',
    budget: 0, reportedAmount: 0,
    basis: [],
  },
  {
    hangCode: '22', hangName: '기타 필요경비', mokCode: '221', mokName: '기타 필요경비',
    semokCode: '221-111', semokName: '입학준비금',
    budget: 0, reportedAmount: 0,
    basis: [],
  },
  {
    semokCode: '221-112', semokName: '현장학습비',
    budget: 0, reportedAmount: 0,
    basis: [],
  },
  {
    semokCode: '221-113', semokName: '차량운행비',
    budget: 0, reportedAmount: 0,
    basis: [],
  },
  {
    semokCode: '221-121', semokName: '부모부담행사비',
    budget: 0, reportedAmount: 0,
    basis: [],
  },
  {
    semokCode: '221-131', semokName: '아침.저녁급식비',
    budget: 0, reportedAmount: 0,
    basis: [],
  },
  {
    semokCode: '221-141', semokName: '기타시도특성화비',
    budget: 0, reportedAmount: 0,
    basis: [],
  },
  // 03 보조금 및 지원금
  {
    gwanCode: '03', gwanName: '보조금 및 지원금', hangCode: '31', hangName: '인건비 보조금', mokCode: '311', mokName: '인건비 보조금',
    budget: 103139520, reportedAmount: 103139520,
    basis: [
      '보조교사 1,139,000*1명*12월=13,668,000',
      '연장교사 1,139,000*1명*12월=13,668,000',
      '행복도우미 1,139,000*1명*12월=13,668,000',
      '사용자부담금 63,830*2명*12월=1,531,920',
      '0세교사 2,479,600*1명*12월=29,755,200',
      '1세교사 2,570,700*1명*12월=30,848,400',
    ],
  },
  {
    hangCode: '32', hangName: '운영보조금', mokCode: '321', mokName: '기관보육료',
    budget: 0, reportedAmount: 0,
    basis: [],
  },
  {
    mokCode: '322', mokName: '연장보육료',
    budget: 4560000, reportedAmount: 4560000,
    basis: [
      '0세 3,000*3명*20회*12월=2,160,000',
      '영아반 2,000*2명*20회*12월=960,000',
      '유아반 1,000*6명*20회*12월=1,440,000',
    ],
  },
  {
    mokCode: '323', mokName: '공공형 운영비',
    budget: 0, reportedAmount: 0,
    basis: [],
  },
  {
    mokCode: '324', mokName: '그 밖의 지원금',
    budget: 54092000, reportedAmount: 54092000,
    basis: [
      '방과후과정비 100,000*2반*12월=2,400,000',
      '현장학습비 15,000*37명*12월=6,660,000',
      '행사비 100,000*37명*1월=3,700,000',
      '기타필요경비 20,000*10명*12월=2,400,000',
      '친환경농산물 13,000*37명*12월=5,772,000',
      '급간식 10,000*37명*12월=4,440,000',
      '교재교구 1,000,000*1회=1,000,000',
      '냉난방비 600,000*1회=600,000',
      '누리과정 50,000*13명*12월=7,800,000',
      '누리추가 70,000*13명*12월=10,920,000',
      '영아반 100,000*7반*12월=8,400,000',
    ],
  },
  {
    hangCode: '33', hangName: '자본 보조금', mokCode: '331', mokName: '자본보조금',
    budget: 0, reportedAmount: 0,
    basis: [],
  },
  // 04 전입금
  {
    gwanCode: '04', gwanName: '전입금', hangCode: '41', hangName: '전입금', mokCode: '411', mokName: '전입금',
    budget: 450000000, reportedAmount: 450000000,
    basis: ['전입금 450,000,000'],
  },
  {
    hangCode: '42', hangName: '차입금', mokCode: '421', mokName: '단기차입금',
    budget: 0, reportedAmount: 0,
    basis: [],
  },
  {
    mokCode: '422', mokName: '장기차입금',
    budget: 0, reportedAmount: 0,
    basis: [],
  },
  // 05 기부금
  {
    gwanCode: '05', gwanName: '기부금', hangCode: '51', hangName: '기부금', mokCode: '511', mokName: '지정후원금',
    budget: 0, reportedAmount: 0,
    basis: [],
  },
  {
    mokCode: '512', mokName: '비지정후원금',
    budget: 0, reportedAmount: 0,
    basis: [],
  },
  // 06 적립금
  {
    gwanCode: '06', gwanName: '적립금', hangCode: '61', hangName: '적립금', mokCode: '611', mokName: '적립금 처분 수입',
    budget: 0, reportedAmount: 0,
    basis: [],
  },
  // 07 과년도 수입
  {
    gwanCode: '07', gwanName: '과년도 수입', hangCode: '71', hangName: '과년도 수입', mokCode: '711', mokName: '과년도 수입',
    budget: 0, reportedAmount: 0,
    basis: [],
  },
  // 08 잡수입
  {
    gwanCode: '08', gwanName: '잡수입', hangCode: '81', hangName: '잡수입', mokCode: '811', mokName: '이자수입',
    budget: 1000000, reportedAmount: 1000000,
    basis: ['이자수입 1,000,000*1회=1,000,000'],
  },
  {
    mokCode: '812', mokName: '그 밖의 잡수입',
    budget: 0, reportedAmount: 0,
    basis: [],
  },
  // 09 전년도 이월액
  {
    gwanCode: '09', gwanName: '전년도 이월액', hangCode: '91', hangName: '전년도 이월액', mokCode: '911', mokName: '전년도 이월금',
    budget: 20000000, reportedAmount: 20000000,
    basis: ['전년도 이월금 20,000,000*1회=20,000,000'],
  },
  {
    mokCode: '912', mokName: '전년도 이월사업비',
    budget: 0, reportedAmount: 0,
    basis: [],
  },
]

export default function CisAccountingReportPage() {
  const [tab, setTab] = useState<'report' | 'history'>('report')

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
        <span className="text-[10px] text-slate-400">전송시간: {new Date().toLocaleString('ko-KR')}</span>
        <button onClick={() => setTab('report')} className={`ml-auto px-4 py-1.5 text-xs font-bold rounded transition-colors ${tab === 'report' ? 'text-white bg-blue-600' : 'text-slate-600 bg-white border border-slate-300 hover:bg-slate-50'}`}>보육통합(CIS) 예산보고</button>
      </div>

      {tab === 'report' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-[11px] border-collapse">
            <thead>
              <tr className="bg-sky-100 border-b border-sky-300">
                <th className="border-r border-sky-200 px-2 py-2 text-center font-bold text-slate-600 w-[30px]">구분</th>
                <th className="border-r border-sky-200 px-2 py-2 text-center font-bold text-slate-600 w-[90px]">관</th>
                <th className="border-r border-sky-200 px-2 py-2 text-center font-bold text-slate-600 w-[130px]">항</th>
                <th className="border-r border-sky-200 px-2 py-2 text-center font-bold text-slate-600 w-[120px]">목</th>
                <th className="border-r border-sky-200 px-2 py-2 text-center font-bold text-slate-600 w-[120px]">세목</th>
                <th className="border-r border-sky-200 px-2 py-2 text-center font-bold text-slate-600 w-[100px]">예산액</th>
                <th className="border-r border-sky-200 px-2 py-2 text-center font-bold text-slate-600">산출기초</th>
                <th className="px-2 py-2 text-center font-bold text-slate-600 w-[110px]">보고한 예산액</th>
              </tr>
            </thead>
            <tbody>
              {reportData.map((row, ri) => {
                const rows = row.basis.length > 0 ? row.basis : ['']
                const basisRows = rows.length
                return rows.map((b, bi) => (
                  <tr key={`${ri}-${bi}`} className="border-b border-slate-100 hover:bg-slate-50/50">
                    {bi === 0 && (
                      <>
                        <td rowSpan={basisRows} className="border-r border-slate-100 px-1 py-1.5 text-center align-top">
                          {row.gwanCode && <button className="w-5 h-5 flex items-center justify-center rounded-full bg-blue-100 text-blue-600 text-[10px] font-bold">+</button>}
                        </td>
                        <td rowSpan={basisRows} className="border-r border-slate-100 px-2 py-1.5 text-slate-600 align-top">
                          {row.gwanCode && <><span className="text-[10px] text-slate-400">{row.gwanCode}</span> {row.gwanName}</>}
                        </td>
                        <td rowSpan={basisRows} className="border-r border-slate-100 px-2 py-1.5 text-slate-600 align-top">
                          {row.hangCode && <><span className="text-[10px] text-slate-400">{row.hangCode}</span> {row.hangName}</>}
                        </td>
                        <td rowSpan={basisRows} className="border-r border-slate-100 px-2 py-1.5 text-slate-600 align-top">
                          {row.mokCode && <><span className="text-[10px] text-slate-400">{row.mokCode}</span> {row.mokName}</>}
                        </td>
                        <td rowSpan={basisRows} className="border-r border-slate-100 px-2 py-1.5 text-slate-600 align-top">
                          {row.semokCode && <><span className="text-[10px] text-slate-400">{row.semokCode}</span> {row.semokName}</>}
                        </td>
                        <td rowSpan={basisRows} className="border-r border-slate-100 px-2 py-1.5 text-right text-blue-600 font-bold align-top">
                          {row.budget > 0 ? fmt(row.budget) : ''}
                        </td>
                      </>
                    )}
                    <td className="border-r border-slate-100 px-2 py-1 text-slate-500 text-[10px]">{b}</td>
                    {bi === 0 && (
                      <td rowSpan={basisRows} className="px-2 py-1.5 text-right text-slate-700 font-bold align-top">
                        {row.reportedAmount > 0 ? fmt(row.reportedAmount) : ''}
                      </td>
                    )}
                  </tr>
                ))
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
