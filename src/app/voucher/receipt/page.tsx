'use client'
import React, { useState, useMemo, useEffect, useRef } from 'react'

type TabKey = 'store' | 'mobile' | 'transfer' | 'tax' | 'cash' | 'shopping' | 'insurance'

/* ── 가맹점별입금내역 mock 데이터 ── */
type DepositRow = {
  거래처: string; 카드사: string; 이름: string; 생년월일: string; 결제대상월: string
  결제구분: string; 결제취소: string; 결제일자: string; 입금일자: string
  결제금액소계: number; 결제정부지원금: number; 결제부모부담금: number; 결제필요경비: number
  입금금액: number; 입금수수료: number; 입금바우처지원수수료: number
  은행거래내역: string; 매칭상태: '매칭완료' | '미매칭'
}
const mockDeposits: DepositRow[] = []

function fmt(n: number) { return n.toLocaleString('ko-KR') }
function fmtDate(d: string) { return d.length === 8 ? `${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}` : d }
function fmtYm(d: string) { return d.length === 6 ? `${d.slice(0,4)}-${d.slice(4,6)}` : d }

const tabs: { key: TabKey; label: string }[] = [
  { key: 'store', label: '가맹점별입금내역' },
  { key: 'mobile', label: '모바일영수증' },
  { key: 'transfer', label: '계좌이체증' },
  { key: 'tax', label: '전자(세금)계산서' },
  { key: 'cash', label: '현금영수증' },
  { key: 'shopping', label: '쇼핑몰' },
  { key: 'insurance', label: '4대보험' },
]

function getYmOptions() {
  const now = new Date()
  const opts: string[] = []
  for (let i = 0; i < 24; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    opts.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`)
  }
  return opts
}

function StoreDepositTab() {
  const ymOpts = useMemo(() => getYmOptions(), [])
  const [storeYm, setStoreYm] = useState(ymOpts[1])  // 전월 기본
  const [storeChecked, setStoreChecked] = useState<Set<number>>(new Set())
  const [saved, setSaved] = useState(true)
  const [costSaved, setCostSaved] = useState(true)
  const [collecting, setCollecting] = useState(false)

  const data = mockDeposits
  const govSubsidy = 26718345
  const totalDeposit = data.reduce((s, d) => s + d.입금금액, 0)
  const allChecked = data.length > 0 && data.every((_, i) => storeChecked.has(i))
  const TH = 'px-2 py-2.5 text-center font-bold text-slate-600 whitespace-nowrap border-b border-r border-slate-200 text-[11px]'
  const TD = 'px-2 py-2 text-center border-b border-r border-slate-100 text-xs'

  return (
    <div className="space-y-3">
      {/* 상단 버튼바 */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-slate-600">조회연월</span>
          <select value={storeYm} onChange={e => setStoreYm(e.target.value)} className="border border-slate-300 rounded px-2 py-1.5 text-xs">
            {ymOpts.map(ym => <option key={ym} value={ym}>{ym}</option>)}
          </select>
          <button className="px-3 py-1.5 text-xs font-bold text-white bg-teal-500 hover:bg-teal-600 rounded transition-colors">검색</button>

          <div className="w-px h-5 bg-slate-200 mx-1" />

          <button
            onClick={() => window.open(process.env.NEXT_PUBLIC_PLATFORM_URL || 'http://localhost:3000' + '/admin/cis-transactions', '_blank')}
            className="px-3 py-1.5 text-xs font-bold text-white bg-teal-500 hover:bg-teal-600 rounded transition-colors"
          >CIS조회</button>

        </div>
      </div>

      {/* 금액 요약 + 출력/삭제 */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500">현금출납부</span>
            <span className="text-xs font-bold text-blue-700">정부지원보육료</span>
            <span className="text-sm font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded">{fmt(govSubsidy)}원</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-green-700">가맹점입금내역</span>
            <span className="text-xs text-slate-500">합계금액</span>
            <span className="text-sm font-bold text-green-800 bg-green-50 px-2 py-0.5 rounded">{fmt(totalDeposit)}원</span>
            {govSubsidy === totalDeposit
              ? <span className="text-[11px] font-bold text-green-600 bg-green-100 px-1.5 py-0.5 rounded">일치</span>
              : <span className="text-[11px] font-bold text-red-500 bg-red-100 px-1.5 py-0.5 rounded">불일치</span>
            }
          </div>
          <div className="w-px h-5 bg-slate-200 mx-1" />
          <label className="flex items-center gap-1 text-xs text-slate-600 cursor-pointer">
            <input type="checkbox" className="rounded border-slate-300" />
            <span className="font-bold">필요경비수용비분리</span>
          </label>
          <button
            onClick={() => setSaved(!saved)}
            className="px-3 py-1.5 text-xs font-bold rounded transition-colors bg-teal-500 hover:bg-teal-600 text-white"
          >전표저장</button>
          <div className="relative group">
            <svg className="w-4 h-4 text-slate-400 cursor-pointer hover:text-slate-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
            <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-[9999] hidden group-hover:block pointer-events-none">
              <div className="bg-slate-800 text-white text-[11px] rounded-lg px-4 py-3 shadow-xl leading-relaxed whitespace-nowrap">
                <div className="absolute left-1/2 -translate-x-1/2 -top-1 w-2 h-2 bg-slate-800 rotate-45" />
                <p>전표저장 시 회계내역의 정부지원보육료와 치환처리됩니다.</p>
                <p className="mt-1">필요경비 저장 시 필요경비수용비분리는 체크 후 전표저장하세요.</p>
                <p className="mt-1 text-red-300">* 지역형회계시스템 전표전송 시 반드시 계좌매칭 후 전표저장 바랍니다.</p>
              </div>
            </div>
          </div>
          {saved && <span className="text-[11px] text-orange-600 font-medium">저장:2026.03.17 14:30</span>}
        </div>
        <div className="flex items-center gap-2">
          <button className="w-8 h-8 flex items-center justify-center bg-white hover:bg-slate-50 border border-slate-300 rounded transition-colors" title="출력하기">
            <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5z" /></svg>
          </button>
          <button className="w-8 h-8 flex items-center justify-center bg-white hover:bg-green-50 border border-green-400 rounded transition-colors" title="엑셀저장">
            <svg className="w-4 h-4 text-green-600" viewBox="0 0 24 24" fill="currentColor"><path d="M14.2 1H5.8C4.81 1 4 1.81 4 2.8v18.4c0 .99.81 1.8 1.8 1.8h12.4c.99 0 1.8-.81 1.8-1.8V6.8L14.2 1zM15.8 19.3l-2.1-3.5-2.1 3.5H9.8l3.2-5-2.9-4.7h1.8l2.1 3.3 2-3.3h1.8l-2.9 4.7 3.2 5h-2.3z" /></svg>
          </button>
          <button className="px-3 py-1.5 text-xs font-bold text-red-500 bg-red-50 hover:bg-red-100 border border-red-200 rounded transition-colors">내용삭제</button>
        </div>
      </div>

      {/* 테이블 */}
      <div className="overflow-x-auto border border-slate-200 rounded-lg">
        <table className="w-full text-[11px] border-collapse">
          <thead>
            <tr className="bg-teal-50 border-b border-orange-200">
              <th className={`${TH} w-8`}>
                <input type="checkbox" checked={allChecked} onChange={() => { if (allChecked) setStoreChecked(new Set()); else setStoreChecked(new Set(data.map((_,i) => i))) }} className="rounded" />
              </th>
              <th className={TH}>거래처</th>
              <th className={TH}>카드사</th>
              <th className={TH}>이름</th>
              <th className={TH}>생년월일</th>
              <th className={TH}>결제<br/>대상월</th>
              <th className={TH}>결제구분</th>
              <th className={TH}>결제취소</th>
              <th className={TH}>결제일자</th>
              <th className={TH}>입금일자</th>
              <th className={TH}>결제금액<br/>소계</th>
              <th className={TH}>결제<br/>정부지원금</th>
              <th className={TH}>결제<br/>부모부담금</th>
              <th className={TH}>결제<br/>필요경비</th>
              <th className={TH}>입금금액</th>
              <th className={TH}>입금<br/>수수료</th>
              <th className={TH}>입금바우처<br/>지원수수료</th>
              <th className={`${TH} min-w-[160px]`}>은행거래내역</th>
              <th className={`${TH} min-w-[130px] border-r-0`}>
                <div className="flex items-center justify-center gap-1.5">
                  <span>계좌매칭</span>
                  <button className="px-3 py-1.5 text-[11px] font-bold text-white bg-teal-500 hover:bg-teal-600 rounded transition-colors">매칭저장</button>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((d, idx) => (
              <tr key={idx} className="hover:bg-slate-50 transition-colors">
                <td className={TD}>
                  <input type="checkbox" checked={storeChecked.has(idx)} onChange={() => { setStoreChecked(prev => { const n = new Set(prev); n.has(idx) ? n.delete(idx) : n.add(idx); return n }) }} className="rounded" />
                </td>
                <td className={`${TD} font-medium text-slate-700`}>{d.거래처}</td>
                <td className={TD}>{d.카드사}</td>
                <td className={`${TD} font-medium`}>{d.이름}</td>
                <td className={`${TD} text-slate-500`}>{d.생년월일}</td>
                <td className={TD}>{fmtYm(d.결제대상월)}</td>
                <td className={TD}>{d.결제구분}</td>
                <td className={TD}>
                  <span className={`text-[11px] font-medium ${d.결제취소 === '결제' ? 'text-blue-600' : 'text-red-500'}`}>{d.결제취소}</span>
                </td>
                <td className={`${TD} text-slate-500`}>{fmtDate(d.결제일자)}</td>
                <td className={`${TD} text-slate-500`}>{fmtDate(d.입금일자)}</td>
                <td className={`${TD} text-right font-medium`}>{fmt(d.결제금액소계)}</td>
                <td className={`${TD} text-right ${d.결제정부지원금 > 0 ? 'text-blue-600 font-medium' : 'text-slate-400'}`}>{fmt(d.결제정부지원금)}</td>
                <td className={`${TD} text-right ${d.결제부모부담금 > 0 ? 'text-orange-600 font-medium' : 'text-slate-400'}`}>{fmt(d.결제부모부담금)}</td>
                <td className={`${TD} text-right ${d.결제필요경비 > 0 ? 'text-purple-600 font-medium' : 'text-slate-400'}`}>{fmt(d.결제필요경비)}</td>
                <td className={`${TD} text-right font-medium text-green-700`}>{fmt(d.입금금액)}</td>
                <td className={`${TD} text-right text-slate-500`}>{fmt(d.입금수수료)}</td>
                <td className={`${TD} text-right text-slate-400`}>{fmt(d.입금바우처지원수수료)}</td>
                <td className={TD}>
                  <select className="px-1.5 py-1 border border-slate-200 rounded text-[11px] bg-white w-full min-w-[140px]">
                    <option>{d.은행거래내역}</option>
                  </select>
                </td>
                <td className={`${TD} border-r-0`}>
                  <div className="flex items-center justify-center gap-1">
                    <select className={`px-1.5 py-1 border rounded text-[11px] min-w-[80px] text-center ${d.매칭상태 === '매칭완료' ? 'border-green-300 bg-green-50 text-green-700' : 'border-red-300 bg-red-50 text-red-600'}`}>
                      <option>{d.매칭상태 === '매칭완료' ? '매칭완료' : '미매칭'}</option>
                      <option>{d.매칭상태 === '매칭완료' ? '미매칭' : '매칭완료'}</option>
                    </select>
                  </div>
                </td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr><td colSpan={19} className="text-center py-12 text-slate-400 text-xs">조회된 입금내역이 없습니다.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 하단 합계 */}
      <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5">
        <span className="text-xs text-slate-500">총 <span className="font-bold text-slate-700">{data.length}</span>건</span>
        <div className="flex items-center gap-4 text-xs">
          <span className="text-slate-500">결제합계 <span className="font-bold text-slate-700">{fmt(data.reduce((s,d)=>s+d.결제금액소계,0))}</span></span>
          <span className="text-slate-500">정부지원금 <span className="font-bold text-blue-600">{fmt(data.reduce((s,d)=>s+d.결제정부지원금,0))}</span></span>
          <span className="text-slate-500">부모부담금 <span className="font-bold text-orange-600">{fmt(data.reduce((s,d)=>s+d.결제부모부담금,0))}</span></span>
          <span className="text-slate-500">입금합계 <span className="font-bold text-green-700">{fmt(totalDeposit)}</span></span>
          <span className="text-slate-500">수수료합계 <span className="font-bold text-slate-600">{fmt(data.reduce((s,d)=>s+d.입금수수료,0))}</span></span>
        </div>
      </div>
    </div>
  )
}

export default function ReceiptPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('store')

  // 새로고침 시 마지막 탭 유지
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const saved = localStorage.getItem('voucher-receipt-tab') as TabKey | null
      if (saved && tabs.some(t => t.key === saved)) setActiveTab(saved)
    } catch {}
  }, [])
  useEffect(() => {
    try { localStorage.setItem('voucher-receipt-tab', activeTab) } catch {}
  }, [activeTab])

  return (
    <div className="p-6 space-y-5">
      {/* 상단 탭 메뉴 */}
      <div className="bg-white rounded-xl border border-teal-400/30 shadow-sm">
        <div className="flex flex-wrap gap-2 px-4 py-3 border-b border-slate-200">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3.5 py-1.5 text-[11px] font-bold rounded-full border transition-all ${
                activeTab === tab.key
                  ? 'bg-teal-500 text-white border-teal-500 shadow-sm'
                  : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100 hover:text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 탭 콘텐츠 영역 */}
        <div className="p-6">
          {activeTab === 'store' && <StoreDepositTab />}

          {activeTab === 'mobile' && (
            <div className="space-y-4">
              {/* 검색 필터 바 */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-600 whitespace-nowrap">조회연월</span>
                  <select className="border border-slate-300 rounded px-2 py-1.5 text-xs">
                    <option>2026-03</option>
                    <option>2026-02</option>
                    <option>2026-01</option>
                  </select>
                </div>
                <button className="px-3 py-1.5 text-xs font-bold text-white bg-teal-500 hover:bg-teal-600 rounded transition-colors">조회</button>
                <div className="ml-auto">
                  <button className="px-4 py-1.5 text-xs font-bold text-white bg-teal-500 hover:bg-teal-600 rounded transition-colors">일괄매칭</button>
                </div>
              </div>

              {/* 모바일 촬영영수증 테이블 */}
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="bg-teal-50 border-b border-orange-200">
                      <th className="px-2 py-2.5 text-center w-8"><input type="checkbox" className="rounded" /></th>
                      <th className="px-2 py-2.5 text-center font-bold text-slate-600 whitespace-nowrap">등록여부</th>
                      <th className="px-2 py-2.5 text-center font-bold text-slate-600 whitespace-nowrap">사용일</th>
                      <th className="px-3 py-2.5 text-center font-bold text-slate-600 whitespace-nowrap min-w-[280px]">적요</th>
                      <th className="px-2 py-2.5 text-center font-bold text-slate-600 whitespace-nowrap">전표</th>
                      <th className="px-2 py-2.5 text-center font-bold text-slate-600 whitespace-nowrap">영수</th>
                      <th className="px-2 py-2.5 text-center font-bold text-slate-600 whitespace-nowrap">수입액</th>
                      <th className="px-2 py-2.5 text-center font-bold text-slate-600 whitespace-nowrap">지출액</th>
                      <th className="px-3 py-2.5 text-center font-bold text-slate-600 whitespace-nowrap min-w-[120px]">비고</th>
                      <th className="px-3 py-2.5 text-center font-bold text-slate-600 whitespace-nowrap min-w-[180px]">매칭</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-100">
                      <td colSpan={10} className="px-3 py-2">
                        <button className="px-4 py-1.5 text-xs font-bold text-slate-600 bg-slate-200 hover:bg-slate-300 border border-slate-300 rounded transition-colors">입력값 저장</button>
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={10} className="text-center py-12 text-slate-400 text-xs">수집된 모바일 영수증이 없습니다.</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* 하단 안내 */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-1.5">
                <p className="text-xs text-orange-600">* 등록 시 연동번호를 기준으로 등록됩니다.</p>
                <p className="text-xs text-orange-600">* 등록 후 재 등록하려면 회계입력에서 삭제 후 재입력해야합니다.</p>
                <p className="text-xs text-orange-600">* 분리된 전표가 하나라도 남아있을경우 등록 상태로 확인됩니다.</p>
                <p className="text-xs text-orange-600">* 전표 분리 등 각종 작업 전에 미리 등록하신 후 이용하세요.</p>
                <p className="text-xs text-orange-600">* 연동번호 클릭 시 등록된 전표를 확인 하실 수 있습니다.</p>
              </div>
            </div>
          )}

          {activeTab === 'transfer' && (
            <div className="space-y-4">
              {/* 검색 필터 바 */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-600 whitespace-nowrap">조회은행</span>
                  <select className="border border-slate-300 rounded px-2 py-1.5 text-xs min-w-[240px]">
                    <option>026 . 신한은행 100034682383</option>
                    <option>004 . 국민은행 68120100238901</option>
                    <option>003 . 기업은행 07010312345678</option>
                    <option>011 . 농협 30112005678901</option>
                  </select>
                  <button className="px-3 py-1.5 text-xs font-bold text-white bg-teal-500 hover:bg-teal-600 rounded transition-colors">조회</button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-600 whitespace-nowrap">조회연월</span>
                  <select className="border border-slate-300 rounded px-2 py-1.5 text-xs">
                    <option>2026-03</option>
                    <option>2026-02</option>
                    <option>2026-01</option>
                  </select>
                </div>
                <button onClick={() => window.open(`${process.env.NEXT_PUBLIC_PLATFORM_URL || 'http://localhost:3000'}/admin/bank-transactions`, '_blank')} className="px-4 py-1.5 text-xs font-bold text-white bg-teal-500 hover:bg-teal-600 rounded transition-colors">계좌이체증조회</button>
                <div className="ml-auto flex items-center gap-2">
                  <button className="px-4 py-1.5 text-xs font-bold text-white bg-teal-500 hover:bg-teal-600 rounded transition-colors">일괄매칭</button>
                  <div className="relative group">
                    <button className="w-6 h-6 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-500 text-xs flex items-center justify-center transition-colors">?</button>
                    <div className="absolute right-0 top-full mt-2 w-[420px] bg-white text-slate-600 border border-slate-200 text-[12px] leading-[1.8] rounded-xl px-5 py-4 shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-30" style={{ fontFamily: "'Pretendard', 'Apple SD Gothic Neo', sans-serif" }}>
                      <div className="absolute -top-1.5 right-3 w-3 h-3 bg-white border-l border-t border-slate-200 rotate-45"></div>
                      <div className="space-y-1.5">
                        <p className="flex gap-1.5"><span className="text-teal-500">•</span><span><span className="text-orange-600 font-semibold">&quot;이체 자동매칭하기&quot;</span> 클릭 시 <span className="text-orange-600 font-semibold">장부에 등록된 전표와 날짜, 금액을 비교하여 자동매칭</span>합니다.</span></p>
                        <p className="flex gap-1.5"><span className="text-teal-500">•</span><span><span className="text-orange-600 font-semibold">&quot;매칭하기&quot;</span> 선택 시 이체내역과 장부를 매칭합니다. <span className="text-emerald-600 font-semibold">장부에 신규전표가 등록되지 않습니다.</span></span></p>
                        <p className="flex gap-1.5"><span className="text-teal-500">•</span><span>등록 시 이체내역 건별로 등록됩니다.</span></p>
                        <p className="flex gap-1.5"><span className="text-teal-500">•</span><span>등록 후 재 등록하려면 회계입력에서 삭제 후 재입력해야합니다.</span></p>
                        <p className="flex gap-1.5"><span className="text-teal-500">•</span><span>분리된 전표가 하나라도 남아있을경우 등록 상태로 확인됩니다.</span></p>
                        <p className="flex gap-1.5"><span className="text-teal-500">•</span><span>전표 분리 등 각종 작업 전에 미리 등록하신 후 이용하세요.</span></p>
                        <p className="flex gap-1.5"><span className="text-teal-500">•</span><span><span className="text-emerald-600 font-semibold">&quot;전표&quot;버튼 클릭 시 등록된 전표를 확인 하실 수 있습니다.</span></span></p>
                      </div>
                    </div>
                  </div>
                  <button className="px-4 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded transition-colors">수집내역보기</button>
                </div>
              </div>

              {/* 이체내역 테이블 */}
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="bg-teal-50 border-b border-orange-200">
                      <th className="px-2 py-2.5 text-center w-8"><input type="checkbox" className="rounded" /></th>
                      <th className="px-2 py-2.5 text-center font-bold text-slate-600 whitespace-nowrap">등록여부</th>
                      <th className="px-2 py-2.5 text-center font-bold text-slate-600 whitespace-nowrap">거래일자</th>
                      <th className="px-2 py-2.5 text-center font-bold text-slate-600 whitespace-nowrap">거래시간</th>
                      <th className="px-2 py-2.5 text-center font-bold text-slate-600 whitespace-nowrap">출금계좌번호</th>
                      <th className="px-2 py-2.5 text-center font-bold text-slate-600 whitespace-nowrap">출금<br/>기록사항</th>
                      <th className="px-2 py-2.5 text-center font-bold text-slate-600 whitespace-nowrap">입금통장표시내용</th>
                      <th className="px-2 py-2.5 text-center font-bold text-slate-600 whitespace-nowrap">입금계좌번호</th>
                      <th className="px-2 py-2.5 text-center font-bold text-slate-600 whitespace-nowrap">입금은행명</th>
                      <th className="px-2 py-2.5 text-center font-bold text-slate-600 whitespace-nowrap">받는분</th>
                      <th className="px-2 py-2.5 text-center font-bold text-slate-600 whitespace-nowrap">이체<br/>수수료</th>
                      <th className="px-2 py-2.5 text-center font-bold text-slate-600 whitespace-nowrap">이체금액</th>
                      <th className="px-2 py-2.5 text-center font-bold text-slate-600 whitespace-nowrap">처리결과</th>
                      <th className="px-2 py-2.5 text-center font-bold text-slate-600 whitespace-nowrap">이체증</th>
                      <th className="px-2 py-2.5 text-center font-bold text-slate-600 whitespace-nowrap">전표</th>
                      <th className="px-2 py-2.5 text-center font-bold text-slate-600 whitespace-nowrap">매칭</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td colSpan={16} className="text-center py-12 text-slate-400 text-xs">수집된 이체내역이 없습니다.</td>
                    </tr>
                  </tbody>
                </table>
              </div>

            </div>
          )}

          {activeTab === 'tax' && (
            <div className="space-y-4">
              {/* 검색 필터 바 */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-600 whitespace-nowrap">조회연월</span>
                  <select className="border border-slate-300 rounded px-2 py-1.5 text-xs">
                    <option>2026-03</option>
                    <option>2026-02</option>
                    <option>2026-01</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-600 whitespace-nowrap">영수/청구 구분</span>
                  <select className="border border-slate-300 rounded px-2 py-1.5 text-xs">
                    <option>전체</option>
                    <option>영수</option>
                    <option>청구</option>
                  </select>
                </div>
                <label className="flex items-center gap-1 text-xs text-slate-600">
                  <input type="checkbox" className="rounded" />
                  계산서 삭제시 체크
                </label>
                <button className="px-3 py-1.5 text-xs font-bold text-white bg-teal-500 hover:bg-teal-600 rounded transition-colors">조회</button>
                <button onClick={() => window.open(`${process.env.NEXT_PUBLIC_PLATFORM_URL || 'http://localhost:3000'}/dashboard/hometax`, '_blank')} className="px-4 py-1.5 text-xs font-bold text-white bg-teal-500 hover:bg-teal-600 rounded transition-colors">세금계산서조회</button>
                <div className="flex items-center gap-2">
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <button className="px-4 py-1.5 text-xs font-bold text-white bg-teal-500 hover:bg-teal-600 rounded transition-colors">일괄매칭</button>
                  <div className="relative group">
                    <button className="w-6 h-6 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-500 text-xs flex items-center justify-center transition-colors">?</button>
                    <div className="absolute right-0 top-full mt-2 w-[420px] bg-white text-slate-600 border border-slate-200 text-[12px] leading-[1.8] rounded-xl px-5 py-4 shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-30" style={{ fontFamily: "'Pretendard', 'Apple SD Gothic Neo', sans-serif" }}>
                      <div className="absolute -top-1.5 right-3 w-3 h-3 bg-white border-l border-t border-slate-200 rotate-45"></div>
                      <div className="space-y-1.5">
                        <p className="flex gap-1.5"><span className="text-teal-500">•</span><span><span className="text-orange-600 font-semibold">&quot;매칭하기&quot;</span> 선택 시 세금계산서 내역과 장부를 매칭합니다. <span className="text-emerald-600 font-semibold">장부에 신규전표가 등록되지 않습니다.</span></span></p>
                        <p className="flex gap-1.5"><span className="text-teal-500">•</span><span>등록 시 계산서별로 등록됩니다.</span></p>
                        <p className="flex gap-1.5"><span className="text-teal-500">•</span><span>등록 후 재 등록하려면 회계입력에서 삭제 후 재입력해야합니다.</span></p>
                        <p className="flex gap-1.5"><span className="text-teal-500">•</span><span>분리된 전표가 하나라도 남아있을경우 등록 상태로 확인됩니다.</span></p>
                        <p className="flex gap-1.5"><span className="text-teal-500">•</span><span>전표 분리 등 각종 작업 전에 미리 등록하신 후 이용하세요.</span></p>
                        <p className="flex gap-1.5"><span className="text-teal-500">•</span><span><span className="text-emerald-600 font-semibold">&quot;전표&quot;버튼 클릭 시 등록된 전표를 확인 하실 수 있습니다.</span></span></p>
                      </div>
                    </div>
                  </div>
                  <button className="px-4 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded transition-colors">수집내역보기</button>
                </div>
              </div>

              {/* 세금계산서 테이블 */}
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="bg-teal-50 border-b border-orange-200">
                      <th className="px-2 py-2.5 text-center w-8"><input type="checkbox" className="rounded" /></th>
                      <th className="px-2 py-2.5 text-center font-bold text-slate-600 whitespace-nowrap">등록여부</th>
                      <th className="px-2 py-2.5 text-center font-bold text-slate-600 whitespace-nowrap">구분</th>
                      <th className="px-2 py-2.5 text-center font-bold text-slate-600 whitespace-nowrap">발급일자</th>
                      <th className="px-2 py-2.5 text-center font-bold text-slate-600 whitespace-nowrap">작성일자</th>
                      <th className="px-2 py-2.5 text-center font-bold text-slate-600 whitespace-nowrap">공급자 상호명</th>
                      <th className="px-2 py-2.5 text-center font-bold text-slate-600 whitespace-nowrap">구분</th>
                      <th className="px-2 py-2.5 text-center font-bold text-slate-600 whitespace-nowrap">공급받는자 상호명</th>
                      <th className="px-2 py-2.5 text-center font-bold text-slate-600 whitespace-nowrap">공급가액</th>
                      <th className="px-2 py-2.5 text-center font-bold text-slate-600 whitespace-nowrap">세액</th>
                      <th className="px-2 py-2.5 text-center font-bold text-slate-600 whitespace-nowrap">합계금액</th>
                      <th className="px-2 py-2.5 text-center font-bold text-slate-600 whitespace-nowrap">품목</th>
                      <th className="px-2 py-2.5 text-center font-bold text-slate-600 whitespace-nowrap">계산서</th>
                      <th className="px-2 py-2.5 text-center font-bold text-slate-600 whitespace-nowrap">매칭</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td colSpan={14} className="text-center py-12 text-slate-400 text-xs">수집된 세금계산서 내역이 없습니다.</td>
                    </tr>
                  </tbody>
                </table>
              </div>

            </div>
          )}

          {activeTab === 'cash' && (
            <div className="space-y-4">
              {/* 검색 필터 바 */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-600 whitespace-nowrap">조회연월</span>
                  <select className="border border-slate-300 rounded px-2 py-1.5 text-xs">
                    <option>2026-03</option>
                    <option>2026-02</option>
                    <option>2026-01</option>
                  </select>
                </div>
                <button className="px-3 py-1.5 text-xs font-bold text-white bg-teal-500 hover:bg-teal-600 rounded transition-colors">조회</button>
                <button onClick={() => window.open(`${process.env.NEXT_PUBLIC_PLATFORM_URL || 'http://localhost:3000'}/dashboard/hometax`, '_blank')} className="px-4 py-1.5 text-xs font-bold text-white bg-teal-500 hover:bg-teal-600 rounded transition-colors">현금영수증조회</button>
                <div className="ml-auto flex items-center gap-2">
                  <button className="px-4 py-1.5 text-xs font-bold text-white bg-teal-500 hover:bg-teal-600 rounded transition-colors">일괄매칭</button>
                  <div className="relative group">
                    <button className="w-6 h-6 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-500 text-xs flex items-center justify-center transition-colors">?</button>
                    <div className="absolute right-0 top-full mt-2 w-[420px] bg-white text-slate-600 border border-slate-200 text-[12px] leading-[1.8] rounded-xl px-5 py-4 shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-30" style={{ fontFamily: "'Pretendard', 'Apple SD Gothic Neo', sans-serif" }}>
                      <div className="absolute -top-1.5 right-3 w-3 h-3 bg-white border-l border-t border-slate-200 rotate-45"></div>
                      <div className="space-y-1.5">
                        <p className="flex gap-1.5"><span className="text-teal-500">•</span><span>수집완료된 현금영수증 내역입니다.</span></p>
                      </div>
                    </div>
                  </div>
                  <button className="px-4 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded transition-colors">수집내역보기</button>
                </div>
              </div>

              {/* 현금영수증 테이블 */}
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="bg-teal-50 border-b border-orange-200">
                      <th className="px-2 py-2.5 text-center w-8"><input type="checkbox" className="rounded" /></th>
                      <th className="px-2 py-2.5 text-center font-bold text-slate-600 whitespace-nowrap">매입일시</th>
                      <th className="px-2 py-2.5 text-center font-bold text-slate-600 whitespace-nowrap">매입시간</th>
                      <th className="px-2 py-2.5 text-center font-bold text-slate-600 whitespace-nowrap">사용자명</th>
                      <th className="px-2 py-2.5 text-center font-bold text-slate-600 whitespace-nowrap">가맹점명</th>
                      <th className="px-2 py-2.5 text-center font-bold text-slate-600 whitespace-nowrap">가맹점사업자번호</th>
                      <th className="px-2 py-2.5 text-center font-bold text-slate-600 whitespace-nowrap">공급가액</th>
                      <th className="px-2 py-2.5 text-center font-bold text-slate-600 whitespace-nowrap">부가세</th>
                      <th className="px-2 py-2.5 text-center font-bold text-slate-600 whitespace-nowrap">봉사료</th>
                      <th className="px-2 py-2.5 text-center font-bold text-slate-600 whitespace-nowrap">매입금액</th>
                      <th className="px-2 py-2.5 text-center font-bold text-slate-600 whitespace-nowrap">승인번호</th>
                      <th className="px-2 py-2.5 text-center font-bold text-slate-600 whitespace-nowrap">발급수단</th>
                      <th className="px-2 py-2.5 text-center font-bold text-slate-600 whitespace-nowrap">거래구분</th>
                      <th className="px-2 py-2.5 text-center font-bold text-slate-600 whitespace-nowrap">공제여부</th>
                      <th className="px-2 py-2.5 text-center font-bold text-slate-600 whitespace-nowrap">영수증</th>
                      <th className="px-2 py-2.5 text-center font-bold text-slate-600 whitespace-nowrap">전표</th>
                      <th className="px-2 py-2.5 text-center font-bold text-slate-600 whitespace-nowrap">매칭</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td colSpan={17} className="text-center py-12 text-slate-400 text-xs">수집된 현금영수증 내역이 없습니다.</td>
                    </tr>
                  </tbody>
                </table>
              </div>

            </div>
          )}

          {activeTab === 'shopping' && <ShoppingTab />}

          {activeTab === 'insurance' && (
            <div className="space-y-4">
              {/* 검색 필터 바 */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-600 whitespace-nowrap">조회연도</span>
                  <select className="border border-slate-300 rounded px-2 py-1.5 text-xs">
                    <option>2026</option>
                    <option>2025</option>
                    <option>2024</option>
                  </select>
                  <span className="text-xs text-slate-500">년 EDI 자료</span>
                </div>
                <button className="px-3 py-1.5 text-xs font-bold text-white bg-teal-500 hover:bg-teal-600 rounded transition-colors">조회</button>
                <button onClick={() => window.open(`${process.env.NEXT_PUBLIC_PLATFORM_URL || 'http://localhost:3000'}/dashboard/insurance`, '_blank')} className="px-4 py-1.5 text-xs font-bold text-white bg-teal-500 hover:bg-teal-600 rounded transition-colors">EDI조회</button>
              </div>

              {/* 4대보험 고지서 매칭 테이블 */}
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="bg-teal-50 border-b border-orange-200">
                      <th className="px-3 py-2.5 text-center font-bold text-slate-600 whitespace-nowrap w-32"></th>
                      <th className="px-3 py-2.5 text-center font-bold text-slate-600 whitespace-nowrap">건강보험EDI</th>
                      <th className="px-3 py-2.5 text-center font-bold text-slate-600 whitespace-nowrap">국민연금EDI</th>
                      <th className="px-3 py-2.5 text-center font-bold text-slate-600 whitespace-nowrap">고용보험EDI</th>
                      <th className="px-3 py-2.5 text-center font-bold text-slate-600 whitespace-nowrap">산재보험EDI</th>
                      <th className="px-3 py-2.5 text-center font-bold text-slate-600 whitespace-nowrap">고지서보기</th>
                      <th className="px-3 py-2.5 text-center font-bold text-slate-600 whitespace-nowrap">매칭</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 12 }, (_, i) => (
                      <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-3 py-3 text-center text-slate-700 font-mEDIum">2026년 {String(i + 1).padStart(2, '0')}월</td>
                        <td className="px-3 py-3 text-center text-slate-500">0</td>
                        <td className="px-3 py-3 text-center text-slate-500">0</td>
                        <td className="px-3 py-3 text-center text-slate-500">0</td>
                        <td className="px-3 py-3 text-center text-slate-500">0</td>
                        <td className="px-3 py-3 text-center"><button className="px-4 py-1 text-xs font-bold text-white bg-teal-500 hover:bg-teal-600 rounded transition-colors">보기</button></td>
                        <td className="px-3 py-3 text-center"><button className="px-4 py-1 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded transition-colors">{`매칭하기 ('0' 매칭됨)`}</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ───────────────────────────────────────────────────
   쇼핑몰 탭 — 7 sub-tabs (전체 + 6 쇼핑몰)
   - 통합e shop_accounts 와 page_data(field='shop-{kind}') 연동
   - 영수증수집하기: /api/voucher/shop/scrape (오아시스만 구현, 그 외 안내)
   - 수집자료보기: 모달 (KCP 매출전표 + 주문확인서)
─────────────────────────────────────────────────── */
type SubTab = '전체' | '쿠팡' | '11번가' | '지마켓' | '옥션' | '오아시스' | '네이버'
const SUB_TABS: SubTab[] = ['전체', '쿠팡', '11번가', '지마켓', '옥션', '오아시스', '네이버']
const SCRAPABLE_SHOPS: Set<string> = new Set(['오아시스'])

const SHOP_FAVICON: Record<string, string> = {
  '쿠팡':     'https://www.google.com/s2/favicons?domain=coupang.com&sz=32',
  '11번가':   'https://www.google.com/s2/favicons?domain=11st.co.kr&sz=32',
  '지마켓':   'https://www.google.com/s2/favicons?domain=gmarket.co.kr&sz=32',
  '옥션':     'https://www.google.com/s2/favicons?domain=auction.co.kr&sz=32',
  '오아시스': 'https://www.google.com/s2/favicons?domain=www.oasis.co.kr&sz=32',
  '네이버':   '',
}

type ShopAccount = {
  bizNo: string
  bizName: string
  accountingId: string
  shopType: string
  shopId: string
  shopPw: string
  status?: string
}
type ShopOrder = any  // 통합e 의 OasisOrder shape (orderId/orderDate/productName/totalAmount/status/receipt/confirm)
type ShopDataRow = {
  shopId: string
  queryCount?: number
  lastQueryTime?: string
  accountStatus?: '정상' | '오류'
  errorMessage?: string
  buyerName?: string
  dateRange?: string
  orders?: ShopOrder[]
}

function ShoppingTab() {
  const [sub, setSub] = useState<SubTab>('전체')

  // 새로고침 시 마지막 sub 탭 유지
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const saved = localStorage.getItem('voucher-receipt-shopping-sub') as SubTab | null
      if (saved && SUB_TABS.includes(saved)) setSub(saved)
    } catch {}
  }, [])
  useEffect(() => {
    try { localStorage.setItem('voucher-receipt-shopping-sub', sub) } catch {}
  }, [sub])
  const [accounts, setAccounts] = useState<ShopAccount[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [dataMap, setDataMap] = useState<Record<string, ShopDataRow>>({})  // shopId(per shopType-prefix) → row
  const [bizNo, setBizNo] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const [busyShopId, setBusyShopId] = useState<string | null>(null)
  const [detail, setDetail] = useState<{ account: ShopAccount; data: ShopDataRow | null } | null>(null)

  // 마운트: 계정 + 건수 + 데이터(쇼핑몰별) 일괄 로드
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [acctR, countR] = await Promise.all([
          fetch('/api/voucher/shop/accounts').then(r => r.json()),
          fetch('/api/voucher/shop/accounts?counts=1').then(r => r.json()),
        ])
        if (cancelled) return
        if (!acctR.success) { setErrorMsg(acctR.error || '계정 조회 실패'); setLoading(false); return }
        setBizNo(acctR.bizNo || null)
        setAccounts(Array.isArray(acctR.accounts) ? acctR.accounts : [])
        setCounts(countR?.counts || {})

        // 등록된 쇼핑몰만 page_data 병렬 fetch
        const shopTypesPresent = Array.from(new Set((acctR.accounts || []).map((a: ShopAccount) => a.shopType))).filter(Boolean) as string[]
        const dataRes = await Promise.all(
          shopTypesPresent.map(st =>
            fetch(`/api/voucher/shop/data?shopType=${encodeURIComponent(st)}`).then(r => r.json()).then(j => ({ st, list: Array.isArray(j.list) ? j.list : [] }))
          )
        )
        if (cancelled) return
        const map: Record<string, ShopDataRow> = {}
        for (const { st, list } of dataRes) {
          for (const r of list as ShopDataRow[]) {
            if (r && r.shopId) map[`${st}::${r.shopId}`] = r
          }
        }
        setDataMap(map)
      } catch (e: any) {
        setErrorMsg(e?.message || '로딩 실패')
      } finally {
        setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const filtered = sub === '전체' ? accounts : accounts.filter(a => a.shopType === sub)
  const totalAll = Object.values(counts).reduce((s, n) => s + (Number(n) || 0), 0)

  // 정상여부 (가벼운 로그인만 검증, 5~15초)
  const checkLogin = async (a: ShopAccount) => {
    if (!SCRAPABLE_SHOPS.has(a.shopType)) {
      alert(`${a.shopType} 정상여부 체크는 아직 준비중입니다.`)
      return
    }
    if (!a.shopPw) { alert('비밀번호가 등록되어 있지 않습니다. 관리자에게 문의하세요.'); return }
    setBusyShopId(`${a.shopType}::${a.shopId}`)
    try {
      const r = await fetch('/api/voucher/shop/login-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shopType: a.shopType, shopId: a.shopId, shopPw: a.shopPw }),
      })
      const j = await r.json()
      const now = new Date().toLocaleString('ko-KR')
      const ok = r.ok && j.success
      // 결과를 dataMap 에 즉시 반영 (UI 갱신용)
      setDataMap(prev => ({
        ...prev,
        [`${a.shopType}::${a.shopId}`]: {
          ...(prev[`${a.shopType}::${a.shopId}`] || { shopId: a.shopId }),
          accountStatus: ok ? '정상' : '오류',
          errorMessage:  ok ? undefined : (j?.message || j?.error || `HTTP ${r.status}`),
          buyerName:     ok ? (j.buyerName || prev[`${a.shopType}::${a.shopId}`]?.buyerName) : undefined,
          lastQueryTime: now,
        },
      }))
    } catch (e: any) {
      const now = new Date().toLocaleString('ko-KR')
      setDataMap(prev => ({
        ...prev,
        [`${a.shopType}::${a.shopId}`]: {
          ...(prev[`${a.shopType}::${a.shopId}`] || { shopId: a.shopId }),
          accountStatus: '오류',
          errorMessage: e?.message || '연결 실패',
          lastQueryTime: now,
        },
      }))
    } finally {
      setBusyShopId(null)
    }
  }

  const TH = 'px-3 py-2.5 text-center font-bold text-slate-600 whitespace-nowrap text-xs'

  // 거래목록 (수집된 모든 주문 flat) — 현재 sub 탭에 해당하는 것만
  const orders: { acct: ShopAccount; order: ShopOrder; data: ShopDataRow }[] = []
  for (const a of filtered) {
    const data = dataMap[`${a.shopType}::${a.shopId}`]
    if (!data || !Array.isArray(data.orders)) continue
    for (const o of data.orders) orders.push({ acct: a, order: o, data })
  }
  orders.sort((a, b) => (b.order.orderDate || '').localeCompare(a.order.orderDate || ''))

  return (
    <div className="space-y-6">
      {/* 안내 + bizNo 표시 */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {SUB_TABS.map(t => {
            const cnt = t === '전체' ? totalAll : (counts[t] || 0)
            const isActive = sub === t
            return (
              <button
                key={t}
                onClick={() => setSub(t)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                  isActive
                    ? 'bg-teal-500 text-white border-teal-500 shadow-sm shadow-teal-200'
                    : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                }`}
              >
                {SHOP_FAVICON[t] && <img src={SHOP_FAVICON[t]} alt="" className="w-3.5 h-3.5 rounded-sm" />}
                {t === '네이버' && !SHOP_FAVICON[t] && <span className={`w-3.5 h-3.5 inline-flex items-center justify-center rounded-sm font-black text-[9px] ${isActive ? 'bg-white text-emerald-600' : 'bg-emerald-500 text-white'}`}>N</span>}
                {t}
                <span className={`ml-0.5 text-[10px] ${isActive ? 'text-white/80' : 'text-slate-400'}`}>{cnt}</span>
              </button>
            )
          })}
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          {bizNo && <span>사업자번호: <span className="font-mono text-slate-700">{bizNo}</span></span>}
          <a href="/cp_guide.pdf" target="_blank" rel="noopener noreferrer" className="px-3 py-1 text-[11px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded">쿠팡조회가이드</a>
          <button onClick={() => window.open(`${process.env.NEXT_PUBLIC_PLATFORM_URL || 'http://localhost:3000'}/admin/shop-transactions`, '_blank')} className="px-4 py-1.5 text-xs font-bold text-white bg-teal-500 hover:bg-teal-600 rounded transition-colors">쇼핑몰조회</button>
        </div>
      </div>

      {/* 안내 — 이 화면은 등록된 쇼핑몰의 로그인 정상여부만 확인 */}
      <div className="flex items-center gap-3 flex-wrap bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg">
        <span className="text-xs text-amber-700">
          이 화면은 <span className="font-bold">로그인 정상여부</span>만 확인합니다 (5~15초 소요). 실제 영수증 수집은 별도 진행됩니다.
        </span>
      </div>

      {/* 쇼핑몰 계정 테이블 */}
      <div>
        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="bg-teal-50 border-b border-orange-200">
                <th className={TH}>구분</th>
                <th className={TH}>아이디</th>
                <th className={TH}>비밀번호</th>
                <th className={TH}>최근수집</th>
                <th className={TH}>건수</th>
                <th className={TH}>상태</th>
                <th className={TH}>정상여부</th>
                <th className={TH}>수집자료보기</th>
                <th className={TH}>관리</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={9} className="text-center py-12 text-slate-400 text-xs">불러오는 중...</td></tr>
              )}
              {!loading && errorMsg && (
                <tr><td colSpan={9} className="text-center py-12 text-red-500 text-xs">{errorMsg}</td></tr>
              )}
              {!loading && !errorMsg && filtered.length === 0 && (
                <tr><td colSpan={9} className="text-center py-12 text-slate-400 text-xs">
                  {bizNo ? `등록된 쇼핑몰 계정이 없습니다 (사업자번호: ${bizNo}).` : '본인 사업자번호 정보가 없습니다 — 통합e 회원정보를 확인하세요.'}
                </td></tr>
              )}
              {!loading && filtered.map((a, idx) => {
                const key = `${a.shopType}::${a.shopId}`
                const d = dataMap[key]
                const busy = busyShopId === key
                const scrapable = SCRAPABLE_SHOPS.has(a.shopType)
                return (
                  <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-3 py-2.5 text-center text-slate-700 font-medium">
                      <span className="inline-flex items-center gap-1.5">
                        {SHOP_FAVICON[a.shopType] && <img src={SHOP_FAVICON[a.shopType]} alt="" className="w-3.5 h-3.5" />}
                        {a.shopType}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center text-slate-700">{a.shopId}</td>
                    <td className="px-3 py-2.5 text-center text-slate-400 font-mono">{a.shopPw ? '****' : <span className="text-amber-500">미등록</span>}</td>
                    <td className="px-3 py-2.5 text-center text-slate-500 text-[11px]">{d?.lastQueryTime || '-'}</td>
                    <td className="px-3 py-2.5 text-center text-slate-700 font-semibold">{d?.queryCount ?? '-'}</td>
                    <td className="px-3 py-2.5 text-center">
                      {d?.accountStatus === '정상' && <span className="text-emerald-600 font-semibold">정상</span>}
                      {d?.accountStatus === '오류' && (
                        <span title={d.errorMessage || ''} className="text-red-500 font-semibold cursor-help">오류</span>
                      )}
                      {!d?.accountStatus && <span className="text-slate-300">-</span>}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {busy ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-blue-600 font-semibold">
                          <span className="inline-block w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />확인중
                        </span>
                      ) : (
                        <button
                          disabled={!scrapable}
                          onClick={() => checkLogin(a)}
                          title={!scrapable ? `${a.shopType} 정상여부 체크는 준비중입니다.` : '클릭하여 로그인 정상여부 확인 (5~15초)'}
                          className={`px-3 py-1 text-xs font-bold rounded transition-colors ${
                            scrapable ? 'text-white bg-teal-500 hover:bg-teal-600' : 'text-slate-400 bg-slate-100 cursor-not-allowed'
                          }`}
                        >정상여부</button>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <button
                        disabled={!d?.orders || d.orders.length === 0}
                        onClick={() => setDetail({ account: a, data: d })}
                        className={`px-3 py-1 text-xs font-bold rounded transition-colors ${
                          d?.orders && d.orders.length > 0
                            ? 'text-white bg-teal-500 hover:bg-teal-600'
                            : 'text-slate-400 bg-slate-100 cursor-not-allowed'
                        }`}
                      >수집자료보기</button>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <a
                        href={`${process.env.NEXT_PUBLIC_PLATFORM_URL || 'http://localhost:3000'}/admin/shop-account`}
                        target="_blank" rel="noopener noreferrer"
                        className="inline-block px-2 py-1 text-xs font-bold text-slate-500 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded"
                      >관리</a>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 수집된 거래목록 (현재 탭) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-bold text-slate-700">수집된 쇼핑몰 거래내역 <span className="text-slate-400 font-normal">{orders.length}건</span></p>
          <button className="px-4 py-1.5 text-xs font-bold text-white bg-teal-500 hover:bg-teal-600 rounded transition-colors">쇼핑몰 영수증 자동매칭하기</button>
        </div>
        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="bg-teal-50 border-b border-orange-200">
                <th className={TH}>쇼핑몰</th>
                <th className={TH}>거래일자</th>
                <th className={TH}>실결제합계</th>
                <th className={TH}>가맹점명</th>
                <th className={TH}>구매상품</th>
                <th className={TH}>결재</th>
                <th className={TH}>승인번호</th>
                <th className={TH}>전표</th>
                <th className={TH}>매칭</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-12 text-slate-400 text-xs">수집된 쇼핑몰 거래내역이 없습니다.</td></tr>
              ) : orders.map(({ acct, order: o }, idx) => (
                <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-3 py-2 text-center text-slate-700">
                    <span className="inline-flex items-center gap-1">
                      {SHOP_FAVICON[acct.shopType] && <img src={SHOP_FAVICON[acct.shopType]} alt="" className="w-3 h-3" />}
                      {acct.shopType}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center text-slate-600">{o.orderDate || '-'}</td>
                  <td className="px-3 py-2 text-right text-slate-800 font-semibold">{typeof o.totalAmount === 'number' ? o.totalAmount.toLocaleString() : '-'}</td>
                  <td className="px-3 py-2 text-center text-slate-600">{o.receipt?.sellerName || acct.shopType}</td>
                  <td className="px-3 py-2 text-left text-slate-700 truncate max-w-xs" title={o.productName}>{o.productName || '-'}</td>
                  <td className="px-3 py-2 text-center text-slate-600 text-[11px]">{o.receipt?.cardCompany || o.paymentMethod || '-'}</td>
                  <td className="px-3 py-2 text-center text-slate-500 font-mono text-[11px]">{o.receipt?.approvalNumber || '-'}</td>
                  <td className="px-3 py-2 text-center"><span className="text-slate-300">-</span></td>
                  <td className="px-3 py-2 text-center">
                    <button onClick={() => setDetail({ account: acct, data: dataMap[`${acct.shopType}::${acct.shopId}`] })} className="text-blue-600 hover:underline text-[11px]">상세</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 상세 모달 */}
      {detail && (
        <ShoppingDetailModal
          account={detail.account}
          data={detail.data}
          onClose={() => setDetail(null)}
        />
      )}
    </div>
  )
}

function ShoppingDetailModal({ account, data, onClose }: {
  account: ShopAccount
  data: ShopDataRow | null
  onClose: () => void
}) {
  const [openIdx, setOpenIdx] = useState<number | null>(null)
  const orders = Array.isArray(data?.orders) ? data!.orders! : []
  const fmtPrice = (n: any) => typeof n === 'number' ? n.toLocaleString() + '원' : '-'

  return (
    <div className="fixed inset-0 z-[120] bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 text-xs text-slate-500">
              {SHOP_FAVICON[account.shopType] && <img src={SHOP_FAVICON[account.shopType]} alt="" className="w-4 h-4 rounded-sm" />}
              <span className="font-medium">{account.shopType}</span>
              <span className="text-slate-300">·</span>
              <span>{account.shopId}</span>
            </div>
            <h3 className="text-lg font-bold text-slate-800">{account.bizName}</h3>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-slate-500">
              {account.bizNo && <span>사업자번호: <span className="font-mono text-slate-700">{account.bizNo}</span></span>}
              {data?.buyerName && <span>구매자: <span className="font-medium text-slate-700">{data.buyerName}</span></span>}
              {data?.dateRange && <span>기간: <span className="text-slate-700">{data.dateRange}</span></span>}
              <span>총 <span className="font-semibold text-blue-600">{orders.length}건</span></span>
            </div>
          </div>
          <button onClick={onClose} className="flex-shrink-0 w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="flex-1 overflow-auto p-6">
          {orders.length === 0 ? (
            <p className="text-center text-sm text-slate-400 py-12">조회된 주문이 없습니다</p>
          ) : (
            <div className="space-y-2">
              {orders.map((o: any, idx: number) => {
                const isOpen = openIdx === idx
                return (
                  <div key={idx} className="border border-slate-200 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setOpenIdx(prev => prev === idx ? null : idx)}
                      className={`w-full text-left px-4 py-3 flex items-center justify-between gap-3 transition-colors ${isOpen ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 text-xs">
                          <span className="text-slate-500">{o.orderDate || '-'}</span>
                          <span className="text-slate-300">·</span>
                          <span className="font-mono text-slate-400">{o.orderId || '-'}</span>
                          {o.status && <span className="ml-1 px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-medium">{o.status}</span>}
                        </div>
                        <p className="text-sm font-medium text-slate-700 truncate">{o.productName || '-'}</p>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <p className="text-sm font-bold text-slate-800">{fmtPrice(o.totalAmount)}</p>
                        {o.paymentMethod && <p className="text-[11px] text-slate-400">{o.paymentMethod}</p>}
                      </div>
                      <svg className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </button>
                    {isOpen && (
                      <div className="border-t border-slate-200 bg-slate-50/50 p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white rounded-lg border border-slate-200 p-4">
                          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5"><span className="inline-block w-1 h-3 bg-emerald-500 rounded-sm" />KCP 매출전표</h4>
                          {o.receipt ? (
                            <dl className="space-y-1.5 text-xs">
                              <DR k="카드사"     v={o.receipt.cardCompany} />
                              <DR k="카드번호"    v={o.receipt.cardNumberMasked} mono />
                              <DR k="승인번호"    v={o.receipt.approvalNumber} mono />
                              <DR k="할부"       v={o.receipt.installment} />
                              <DR k="거래일시"    v={o.receipt.transactionAt} />
                              <DR k="거래금액"    v={fmtPrice(o.receipt.totalAmount)} bold />
                              <div className="pt-2 mt-2 border-t border-slate-100 space-y-1.5">
                                <DR k="판매자"     v={o.receipt.sellerName} />
                                <DR k="대표"       v={o.receipt.ceoName} />
                                <DR k="사업자번호" v={o.receipt.bizNo} mono />
                                <DR k="연락처"     v={o.receipt.sellerPhone} />
                              </div>
                            </dl>
                          ) : <p className="text-xs text-slate-400 italic">{o.receiptError || '영수증 정보 없음'}</p>}
                        </div>
                        <div className="bg-white rounded-lg border border-slate-200 p-4">
                          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5"><span className="inline-block w-1 h-3 bg-teal-500 rounded-sm" />주문확인서</h4>
                          {o.confirm ? (
                            <dl className="space-y-1.5 text-xs">
                              <DR k="수령인"   v={o.confirm.receiverName} />
                              <DR k="휴대폰"   v={o.confirm.receiverPhone} />
                              <DR k="배송지"   v={o.confirm.receiverAddress} />
                              {Array.isArray(o.confirm.items) && o.confirm.items.length > 0 && (
                                <div className="pt-2 mt-2 border-t border-slate-100">
                                  <p className="text-[10px] text-slate-400 uppercase mb-1">상품 ({o.confirm.items.length})</p>
                                  <ul className="space-y-1">
                                    {o.confirm.items.slice(0, 8).map((it: any, i: number) => (
                                      <li key={i} className="flex justify-between gap-2">
                                        <span className="text-slate-600 truncate">{it.name}{it.qty ? ` × ${it.qty}` : ''}</span>
                                        {typeof it.price === 'number' && <span className="text-slate-700 font-medium flex-shrink-0">{it.price.toLocaleString()}원</span>}
                                      </li>
                                    ))}
                                    {o.confirm.items.length > 8 && <li className="text-[10px] text-slate-400">… 외 {o.confirm.items.length - 8}건</li>}
                                  </ul>
                                </div>
                              )}
                              <div className="pt-2 mt-2 border-t border-slate-100 space-y-1.5">
                                <DR k="상품구매가" v={fmtPrice(o.confirm.totalAmount)} />
                                <DR k="배송비"     v={fmtPrice(o.confirm.shippingFee)} />
                                {typeof o.confirm.couponAmount === 'number' && <DR k="쿠폰" v={fmtPrice(o.confirm.couponAmount)} />}
                                <DR k="합계"       v={fmtPrice(o.confirm.finalAmount ?? o.confirm.totalAmount)} bold />
                              </div>
                            </dl>
                          ) : <p className="text-xs text-slate-400 italic">{o.confirmError || '주문확인서 정보 없음'}</p>}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function DR({ k, v, mono, bold }: { k: string; v: any; mono?: boolean; bold?: boolean }) {
  if (v === null || v === undefined || v === '') return null
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-slate-400 flex-shrink-0">{k}</dt>
      <dd className={`text-right ${bold ? 'font-bold text-slate-800' : 'text-slate-700'} ${mono ? 'font-mono' : ''}`}>{v}</dd>
    </div>
  )
}
