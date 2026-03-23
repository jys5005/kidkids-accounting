'use client'

import { useState } from 'react'

export default function AccountingPage() {
  const [yearmon] = useState('2026-02')

  return (
    <div className="space-y-5 max-w-6xl">
      {/* 이달의 장부진행 */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 hover:bg-slate-50/50 transition-colors">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-slate-800">이달({yearmon})의 장부진행</h2>
        </div>

        {/* 마감 상태 */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-slate-50 rounded-lg p-3 text-center hover:bg-slate-100 transition-colors cursor-pointer">
            <p className="text-[11px] text-slate-400 mb-1">자료마감</p>
            <span className="text-xs font-semibold text-slate-500">-</span>
          </div>
          <div className="bg-slate-50 rounded-lg p-3 text-center hover:bg-slate-100 transition-colors cursor-pointer">
            <p className="text-[11px] text-slate-400 mb-1">조정마감여부</p>
            <span className="text-xs font-semibold text-slate-500">-</span>
          </div>
          <div className="bg-slate-50 rounded-lg p-3 text-center hover:bg-slate-100 transition-colors cursor-pointer">
            <p className="text-[11px] text-slate-400 mb-1">장부제본</p>
            <span className="text-xs font-semibold text-slate-500">-</span>
          </div>
        </div>

        {/* 주요 항목 요약 */}
        <div className="grid grid-cols-3 gap-3">
          <div className="border border-blue-100 bg-blue-50/50 rounded-lg p-3 hover:bg-blue-100/70 transition-colors cursor-pointer">
            <p className="text-[11px] text-blue-500 mb-2">수입</p>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-600">보육료수입</span>
                <span className="font-semibold text-slate-800">74,785,335</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-600">급간식비</span>
                <span className="font-semibold text-slate-800">2,251,050</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-600">기타필요경비</span>
                <span className="font-semibold text-slate-800">-</span>
              </div>
            </div>
          </div>
          <div className="border border-red-100 bg-red-50/50 rounded-lg p-3 hover:bg-red-100/70 transition-colors cursor-pointer">
            <p className="text-[11px] text-red-500 mb-2">지출</p>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-600">기본급</span>
                <span className="font-semibold text-slate-800">52,855,120</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-600">퇴직적립금</span>
                <span className="font-semibold text-slate-800">0</span>
              </div>
            </div>
          </div>
          <div className="border border-teal-100 bg-teal-50/50 rounded-lg p-3 hover:bg-teal-100/70 transition-colors cursor-pointer">
            <p className="text-[11px] text-teal-600 mb-2">공과금/경비</p>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-600">4대보험</span>
                <span className="font-semibold text-slate-800">9,220,470</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-600">공공요금/제세공과금</span>
                <span className="font-semibold text-slate-800">1,312,070</span>
              </div>
            </div>
          </div>
        </div>

        {/* 바로가기 */}
        <div className="mt-4 flex items-center gap-2">
          <span className="text-xs text-slate-500">재무회계 분석자료 :</span>
          <a href="/cash-ledger" className="text-xs text-blue-600 font-medium hover:underline">바로가기</a>
        </div>
      </div>

      {/* 회계마감잔고 */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 hover:bg-slate-50/50 transition-colors">
        <h3 className="text-sm font-bold text-slate-800 mb-3">회계마감잔고</h3>
        <div className="bg-gradient-to-r from-red-50 to-red-100/50 border border-red-200 rounded-lg p-4 flex items-center justify-between hover:from-red-100 hover:to-red-150/50 transition-colors cursor-pointer">
          <span className="text-sm text-slate-700 font-medium">{yearmon}월 회계마감잔고</span>
          <span className="text-lg font-bold text-red-600">-38,248,018 원</span>
        </div>
      </div>

      {/* 출납년월 / 기본정보 */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 hover:bg-slate-50/50 transition-colors">
        <div className="grid grid-cols-5 gap-3">
          <div>
            <label className="text-[11px] text-slate-500 mb-1 block font-medium">출납년월</label>
            <input type="month" defaultValue={yearmon} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
          </div>
          <div>
            <label className="text-[11px] text-slate-500 mb-1 block font-medium">아동인원</label>
            <div className="text-xs space-y-1 mt-1.5">
              <div className="flex items-center gap-1"><span className="text-slate-500">일반아동:</span><input className="w-14 px-2 py-1 border border-slate-200 rounded text-center text-xs" placeholder="명" /></div>
              <div className="flex items-center gap-1"><span className="text-slate-500">누리아동:</span><input className="w-14 px-2 py-1 border border-slate-200 rounded text-center text-xs" placeholder="명" /></div>
            </div>
          </div>
          <div>
            <label className="text-[11px] text-slate-500 mb-1 block font-medium">종사자수</label>
            <input className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-center" placeholder="명" />
          </div>
          <div>
            <label className="text-[11px] text-slate-500 mb-1 block font-medium">급식단가</label>
            <div className="text-xs space-y-1 mt-1.5">
              <div className="flex items-center gap-1"><span className="text-slate-500">일반:</span><span className="font-medium">3,000원</span></div>
              <div className="flex items-center gap-1"><span className="text-slate-500">누리:</span><span className="font-medium">3,000원</span></div>
            </div>
          </div>
          <div>
            <label className="text-[11px] text-slate-500 mb-1 block font-medium">보육일수</label>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-sm font-semibold text-slate-700">22일</span>
              <span className="text-[10px] text-slate-400">(지도점검기준)</span>
            </div>
            <button className="mt-1.5 px-3 py-1 text-[11px] font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors">제출</button>
          </div>
        </div>
      </div>

      {/* 분석 기준 안내 */}
      <div className="bg-teal-50 border border-teal-200 rounded-lg px-4 py-2.5">
        <p className="text-[11px] text-teal-700">※ 분석기준 표시: (-)금액: 미달, (+)금액: 초과</p>
      </div>

      {/* 급간식비 평가 */}
      <EvalSection
        title="급간식비 평가"
        notice="급간식비는 평균적으로 표준급식비만큼 세출처리하시면 됩니다. 일부러 매달 급식비를 맞추려고 하지는 않으셔도 됩니다."
        infoRows={[
          { label: '급식인원', value: '일반 0 명, 누리 0 명' },
          { label: '급식단가', value: '일반 : 0 원 / 누리 : 3,000 원' },
          { label: '보육일수', value: '22 일' },
        ]}
        headers={['표준급식비(A)', '당월지출비(B)', '차이액(B)-(A)', '분석', '평균단가']}
        rows={[['0', '2,251,050', '2,251,050', '초과', '0 원']]}
      />

      {/* 기타필요경비 평가 */}
      <EvalSection
        title="기타필요경비 평가"
        notice="누적 기타필요경비평가 차액이 마이너스가 발생하여도 문제없습니다. 2월까지 차액을 가급적 &quot;0&quot;에 맞추셔야합니다."
        headers={['구분', '수입(A)', '지출(B)', '차액(B)-(A)', '비율', '수입86%금액(C)', '86%차액(B)-(C)', '분석']}
        rows={[
          ['당월', '0', '80,000', '80,000', '0 %', '0', '80,000', '초과'],
          ['누계', '3,693,826', '2,476,550', '-1,217,276', '67.05 %', '3,176,690', '-700,140', '미달'],
        ]}
      />

      {/* 특별활동비 평가 */}
      <EvalSection
        title="특별활동비 평가"
        notice="누적 특별활동비 차액이 마이너스가 발생하여도 문제없습니다. 2월까지 차액을 가급적 &quot;0&quot;에 맞추셔야합니다."
        headers={['구분', '수입(A)', '지출(B)', '차액(B)-(A)', '비율', '분석']}
        rows={[
          ['당월', '0', '735,000', '735,000', '0 %', '초과'],
          ['누계', '10', '4,396,540', '4,396,530', '43965400 %', '초과'],
        ]}
      />

      {/* 차입금상환 평가 */}
      <EvalSection
        title="차입금상환 평가"
        notice="누적 차입금/상환금 차액이 마이너스가 발생하면 안됩니다."
        headers={['구분', '차입금(A)', '차입금상환(B)', '차액(B)-(A)', '분석']}
        rows={[
          ['당월', '0', '0', '0', ''],
          ['누계', '5,000,000', '23,000,000', '18,000,000', '초과'],
        ]}
      />

      {/* 기타운영비,적립금,차량할부금 평가 */}
      <EvalSection
        title="기타운영비, 적립금, 차량할부금 평가"
        notice="누적 기타운영비 차액이 마이너스가 발생하여도 문제없습니다."
        headers={['구분', '당월보육료수입', '한도액(15%)(A)', '기타운영비(B)', '차액(B)-(A)', '분석']}
        rows={[
          ['당월', '74,785,335', '11,217,800', '0', '-11,217,800', '미달'],
          ['누계', '460,103,956', '69,015,593', '0', '-69,015,593', '미달'],
        ]}
      />

      {/* 직책급 평가 */}
      <EvalSection
        title="직책급 평가"
        notice="누적 직책급 차액이 마이너스가 발생하여도 문제없습니다."
        headers={['구분', '지급한도액(A)', '지급액(B)', '차액(B)-(A)', '분석']}
        rows={[
          ['당월', '0', '0', '0', ''],
          ['누계', '0', '0', '0', ''],
        ]}
      />

      {/* 원장급여 평가 */}
      <EvalSection
        title="원장급여 평가"
        headers={['구분', '지급한도액(A)', '지급액(B)', '차액(B)-(A)', '분석']}
        rows={[
          ['당월', '3,500,000', '0', '-3,500,000', ''],
          ['누계', '42,000,000', '0', '-42,000,000', ''],
        ]}
      />

      {/* 원장수당 평가 */}
      <EvalSection
        title="원장수당 평가"
        headers={['구분', '지급한도액(A)', '지급액(B)', '차액(B)-(A)', '분석']}
        rows={[
          ['당월', '2,500,000', '0', '-2,500,000', ''],
          ['누계', '30,000,000', '0', '-30,000,000', ''],
        ]}
      />

      {/* 누리과정 평가 */}
      <EvalSection
        title="누리과정 평가"
        headers={['구분', '누리과정수입(A)', '누리과정지출(B)', '차액(B)-(A)', '분석']}
        rows={[
          ['당월', '0', '0', '0', ''],
          ['누계', '2,362,560', '0', '-2,362,560', ''],
        ]}
      />
    </div>
  )
}

function EvalSection({
  title,
  notice,
  infoRows,
  headers,
  rows,
}: {
  title: string
  notice?: string
  infoRows?: { label: string; value: string }[]
  headers: string[]
  rows: string[][]
}) {
  const getAnalysisStyle = (val: string) => {
    if (val === '초과') return 'text-red-600 font-semibold'
    if (val === '미달') return 'text-blue-600 font-semibold'
    return 'text-slate-600'
  }

  const getAmountStyle = (val: string) => {
    if (val.startsWith('-')) return 'text-red-600'
    return 'text-slate-700'
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
      <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
        <h3 className="text-sm font-bold text-slate-800">{title}</h3>
      </div>

      {notice && (
        <div className="px-5 py-2 bg-blue-50/50 border-b border-slate-100">
          <p className="text-[11px] text-slate-500">{notice}</p>
        </div>
      )}

      {infoRows && (
        <div className="px-5 py-2.5 border-b border-slate-100 flex gap-6">
          {infoRows.map((r) => (
            <div key={r.label} className="flex items-center gap-2 text-xs">
              <span className="text-slate-400">*{r.label}</span>
              <span className="text-slate-700 font-medium">{r.value}</span>
            </div>
          ))}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50">
              {headers.map((h, i) => (
                <th key={i} className={`px-4 py-2.5 font-semibold text-slate-500 whitespace-nowrap ${i === 0 ? 'text-left' : 'text-right'}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {rows.map((row, ri) => (
              <tr key={ri} className={`hover:bg-blue-50/40 transition-colors ${row[0] === '누계' ? 'bg-slate-50/50 font-medium' : ''}`}>
                {row.map((cell, ci) => {
                  const isAnalysis = headers[ci]?.includes('분석')
                  const isAmount = ci > 0 && !isAnalysis && !headers[ci]?.includes('비율') && !headers[ci]?.includes('구분')
                  return (
                    <td
                      key={ci}
                      className={`px-4 py-2.5 whitespace-nowrap ${ci === 0 ? 'text-left text-slate-600' : 'text-right'} ${
                        isAnalysis ? getAnalysisStyle(cell) : isAmount ? getAmountStyle(cell) : 'text-slate-700'
                      }`}
                    >
                      {cell || '-'}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
