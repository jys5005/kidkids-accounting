'use client'
import React, { useState, useMemo } from 'react'

type TabKey = 'store' | 'mobile' | 'transfer' | 'tax' | 'cash' | 'shopping' | 'insurance'

/* ── 가맹점별입금내역 mock 데이터 ── */
type DepositRow = {
  거래처: string; 카드사: string; 이름: string; 생년월일: string; 결제대상월: string
  결제구분: string; 결제취소: string; 결제일자: string; 입금일자: string
  결제금액소계: number; 결제정부지원금: number; 결제부모부담금: number; 결제필요경비: number
  입금금액: number; 입금수수료: number; 입금바우처지원수수료: number
  은행거래내역: string; 매칭상태: '매칭완료' | '미매칭'
}
const mockDeposits: DepositRow[] = [
  { 거래처:'bc카드', 카드사:'롯데카드', 이름:'강나윤', 생년월일:'20191117', 결제대상월:'202601', 결제구분:'보육료', 결제취소:'결제', 결제일자:'20260130', 입금일자:'20260203', 결제금액소계:280000, 결제정부지원금:280000, 결제부모부담금:0, 결제필요경비:0, 입금금액:279972, 입금수수료:28, 입금바우처지원수수료:0, 은행거래내역:'797831675B / 279,972', 매칭상태:'매칭완료' },
  { 거래처:'삼성카드', 카드사:'삼성카드', 이름:'김민아', 생년월일:'20221016', 결제대상월:'202601', 결제구분:'보육료', 결제취소:'결제', 결제일자:'20260202', 입금일자:'20260204', 결제금액소계:515000, 결제정부지원금:515000, 결제부모부담금:0, 결제필요경비:0, 입금금액:514949, 입금수수료:51, 입금바우처지원수수료:0, 은행거래내역:'삼성15875079 / 514,949', 매칭상태:'매칭완료' },
  { 거래처:'삼성카드', 카드사:'삼성카드', 이름:'경한울', 생년월일:'20221001', 결제대상월:'202601', 결제구분:'보육료', 결제취소:'결제', 결제일자:'20260204', 입금일자:'20260206', 결제금액소계:426000, 결제정부지원금:426000, 결제부모부담금:0, 결제필요경비:0, 입금금액:425958, 입금수수료:42, 입금바우처지원수수료:0, 은행거래내역:'삼성15875079 / 425,958', 매칭상태:'매칭완료' },
  { 거래처:'bc카드', 카드사:'nh농협', 이름:'홍하나', 생년월일:'20200826', 결제대상월:'202601', 결제구분:'보육료', 결제취소:'결제', 결제일자:'20260210', 입금일자:'20260212', 결제금액소계:280000, 결제정부지원금:280000, 결제부모부담금:0, 결제필요경비:0, 입금금액:279972, 입금수수료:28, 입금바우처지원수수료:0, 은행거래내역:'797831675B / 279,972', 매칭상태:'매칭완료' },
  { 거래처:'신한카드', 카드사:'신한카드', 이름:'김소이', 생년월일:'20220108', 결제대상월:'202601', 결제구분:'보육료', 결제취소:'결제', 결제일자:'20260210', 입금일자:'20260213', 결제금액소계:426000, 결제정부지원금:0, 결제부모부담금:0, 결제필요경비:0, 입금금액:425958, 입금수수료:42, 입금바우처지원수수료:0, 은행거래내역:'신한87502639 / 425,958', 매칭상태:'매칭완료' },
  { 거래처:'bc카드', 카드사:'신협', 이름:'이가은', 생년월일:'20190102', 결제대상월:'202602', 결제구분:'보육료', 결제취소:'결제', 결제일자:'20260221', 입금일자:'20260224', 결제금액소계:470000, 결제정부지원금:200000, 결제부모부담금:80000, 결제필요경비:190000, 입금금액:469953, 입금수수료:47, 입금바우처지원수수료:0, 은행거래내역:'797831675B / 10,340,972', 매칭상태:'매칭완료' },
  { 거래처:'bc카드', 카드사:'nh농협', 이름:'박도준', 생년월일:'20190108', 결제대상월:'202602', 결제구분:'보육료', 결제취소:'결제', 결제일자:'20260221', 입금일자:'20260224', 결제금액소계:280000, 결제정부지원금:280000, 결제부모부담금:0, 결제필요경비:0, 입금금액:279972, 입금수수료:28, 입금바우처지원수수료:0, 은행거래내역:'797831675B / 10,340,972', 매칭상태:'매칭완료' },
  { 거래처:'bc카드', 카드사:'우리카드', 이름:'함시아', 생년월일:'20190312', 결제대상월:'202602', 결제구분:'보육료', 결제취소:'결제', 결제일자:'20260221', 입금일자:'20260224', 결제금액소계:280000, 결제정부지원금:280000, 결제부모부담금:0, 결제필요경비:0, 입금금액:279972, 입금수수료:28, 입금바우처지원수수료:0, 은행거래내역:'797831675B / 10,340,972', 매칭상태:'매칭완료' },
  { 거래처:'bc카드', 카드사:'우체국', 이름:'최서하', 생년월일:'20190503', 결제대상월:'202602', 결제구분:'보육료', 결제취소:'결제', 결제일자:'20260221', 입금일자:'20260224', 결제금액소계:280000, 결제정부지원금:280000, 결제부모부담금:0, 결제필요경비:0, 입금금액:279972, 입금수수료:28, 입금바우처지원수수료:0, 은행거래내역:'797831675B / 10,340,972', 매칭상태:'매칭완료' },
  { 거래처:'bc카드', 카드사:'ibk기업은행', 이름:'체첼렌', 생년월일:'20200624', 결제대상월:'202602', 결제구분:'보육료', 결제취소:'결제', 결제일자:'20260221', 입금일자:'20260224', 결제금액소계:470000, 결제정부지원금:200000, 결제부모부담금:80000, 결제필요경비:190000, 입금금액:469953, 입금수수료:47, 입금바우처지원수수료:0, 은행거래내역:'797831675B / 10,340,972', 매칭상태:'매칭완료' },
  { 거래처:'bc카드', 카드사:'ibk기업은행', 이름:'고나경', 생년월일:'20200713', 결제대상월:'202602', 결제구분:'보육료', 결제취소:'결제', 결제일자:'20260221', 입금일자:'20260224', 결제금액소계:280000, 결제정부지원금:280000, 결제부모부담금:0, 결제필요경비:0, 입금금액:279972, 입금수수료:28, 입금바우처지원수수료:0, 은행거래내역:'797831675B / 10,340,972', 매칭상태:'매칭완료' },
  { 거래처:'bc카드', 카드사:'우체국', 이름:'최서후', 생년월일:'20200727', 결제대상월:'202602', 결제구분:'보육료', 결제취소:'결제', 결제일자:'20260221', 입금일자:'20260224', 결제금액소계:280000, 결제정부지원금:280000, 결제부모부담금:0, 결제필요경비:0, 입금금액:279972, 입금수수료:28, 입금바우처지원수수료:0, 은행거래내역:'797831675B / 10,340,972', 매칭상태:'매칭완료' },
]

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
            className="px-3 py-1.5 text-xs font-bold text-white bg-green-600 hover:bg-green-700 rounded transition-colors"
          >CIS조회</button>

          <div className="w-px h-5 bg-slate-200 mx-1" />

          <button className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded transition-colors">수납내역보기</button>
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
            className="px-3 py-1.5 text-xs font-bold rounded transition-colors bg-teal-500 hover:bg-orange-600 text-white"
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
        <table className="w-full text-xs border-collapse">
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
                  <button className="px-3 py-1.5 text-[11px] font-bold text-white bg-teal-500 hover:bg-orange-600 rounded transition-colors">매칭저장</button>
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

  return (
    <div className="p-6 space-y-5">
      {/* 상단 탭 메뉴 */}
      <div className="bg-white rounded-xl border border-teal-400/30 shadow-sm">
        <div className="flex border-b border-slate-200">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 px-4 py-3.5 text-sm font-bold transition-all relative ${
                activeTab === tab.key
                  ? 'text-[#d4a000] bg-gradient-to-b from-[#fffbeb] to-[#fff9e0]'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              {tab.label}
              {activeTab === tab.key && (
                <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-teal-500 rounded-t-full" />
              )}
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
                <button className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors">조회</button>
                <div className="ml-auto">
                  <button className="px-4 py-1.5 text-xs font-bold text-white bg-teal-500 hover:bg-orange-600 rounded transition-colors">일괄매칭</button>
                </div>
              </div>

              {/* 모바일 촬영영수증 테이블 */}
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-xs">
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
                  <button className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors">조회</button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-600 whitespace-nowrap">조회연월</span>
                  <select className="border border-slate-300 rounded px-2 py-1.5 text-xs">
                    <option>2026-03</option>
                    <option>2026-02</option>
                    <option>2026-01</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <button className="px-4 py-1.5 text-xs font-bold text-white bg-green-600 hover:bg-green-700 rounded transition-colors">데이터 조회 gnb</button>
                  <button className="px-4 py-1.5 text-xs font-bold text-white bg-green-600 hover:bg-green-700 rounded transition-colors">데이터 조회</button>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <button className="px-4 py-1.5 text-xs font-bold text-white bg-teal-500 hover:bg-orange-600 rounded transition-colors">일괄매칭</button>
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
                <table className="w-full text-xs">
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
                <button className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors">조회</button>
                <div className="flex items-center gap-2">
                  <button className="px-4 py-1.5 text-xs font-bold text-white bg-green-600 hover:bg-green-700 rounded transition-colors">데이터 조회 gnb</button>
                  <button className="px-4 py-1.5 text-xs font-bold text-white bg-green-600 hover:bg-green-700 rounded transition-colors">데이터 조회</button>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <button className="px-4 py-1.5 text-xs font-bold text-white bg-teal-500 hover:bg-orange-600 rounded transition-colors">일괄매칭</button>
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
                <table className="w-full text-xs">
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
                <button className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors">조회</button>
                <div className="flex items-center gap-2">
                  <button className="px-4 py-1.5 text-xs font-bold text-white bg-green-600 hover:bg-green-700 rounded transition-colors">데이터 조회 gnb</button>
                  <button className="px-4 py-1.5 text-xs font-bold text-white bg-green-600 hover:bg-green-700 rounded transition-colors">데이터 조회</button>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <button className="px-4 py-1.5 text-xs font-bold text-white bg-teal-500 hover:bg-orange-600 rounded transition-colors">일괄매칭</button>
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
                <table className="w-full text-xs">
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

          {activeTab === 'shopping' && (
            <div className="space-y-6">
              {/* 쇼핑몰 스크랩하기 섹션 */}
              <div>
                <div className="flex items-center justify-end gap-2 mb-3">
                  <a href="/cp_guide.pdf" target="_blank" rel="noopener noreferrer" className="px-4 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded transition-colors inline-block">쿠팡조회가이드</a>
                  <a href="/Web_Coupang_Setup.zip" download className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors inline-flex items-center gap-1"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>쿠팡조회설치</a>
                </div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-600 whitespace-nowrap">조회연월</span>
                    <select className="border border-slate-300 rounded px-2 py-1.5 text-xs">
                      <option>2026-03</option>
                      <option>2026-02</option>
                      <option>2026-01</option>
                    </select>
                    <button className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors">조회</button>
                  </div>
                </div>
                {/* 쇼핑몰 계정 테이블 */}
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-teal-50 border-b border-orange-200">
                        <th className="px-3 py-2.5 text-center font-bold text-slate-600 whitespace-nowrap">구분</th>
                        <th className="px-3 py-2.5 text-center font-bold text-slate-600 whitespace-nowrap">아이디</th>
                        <th className="px-3 py-2.5 text-center font-bold text-slate-600 whitespace-nowrap">비밀번호</th>
                        <th className="px-3 py-2.5 text-center font-bold text-slate-600 whitespace-nowrap">영수증수집</th>
                        <th className="px-3 py-2.5 text-center font-bold text-slate-600 whitespace-nowrap">수집자료보기</th>
                        <th className="px-3 py-2.5 text-center font-bold text-slate-600 whitespace-nowrap">품목삭제</th>
                        <th className="px-3 py-2.5 text-center font-bold text-slate-600 whitespace-nowrap">관리</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-3 py-2.5 text-center text-slate-700">지마켓</td>
                        <td className="px-3 py-2.5 text-center text-slate-700">min7709166</td>
                        <td className="px-3 py-2.5 text-center text-slate-700">min7128</td>
                        <td className="px-3 py-2.5 text-center"><button className="px-3 py-1 text-xs font-bold text-white bg-green-600 hover:bg-green-700 rounded transition-colors">영수증수집하기</button></td>
                        <td className="px-3 py-2.5 text-center"><button className="px-3 py-1 text-xs font-bold text-white bg-teal-500 hover:bg-orange-600 rounded transition-colors">수집자료보기</button></td>
                        <td className="px-3 py-2.5 text-center"><button className="px-3 py-1 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded transition-colors">구매품목삭제</button></td>
                        <td className="px-3 py-2.5 text-center"><button className="px-2 py-1 text-xs font-bold text-slate-500 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded transition-colors">관리</button></td>
                      </tr>
                      <tr className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-3 py-2.5 text-center text-slate-700">11번가</td>
                        <td className="px-3 py-2.5 text-center text-slate-700">sofsteel22</td>
                        <td className="px-3 py-2.5 text-center text-slate-700">jin38461</td>
                        <td className="px-3 py-2.5 text-center"><button className="px-3 py-1 text-xs font-bold text-white bg-green-600 hover:bg-green-700 rounded transition-colors">영수증수집하기</button></td>
                        <td className="px-3 py-2.5 text-center"><button className="px-3 py-1 text-xs font-bold text-white bg-teal-500 hover:bg-orange-600 rounded transition-colors">수집자료보기</button></td>
                        <td className="px-3 py-2.5 text-center"><button className="px-3 py-1 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded transition-colors">구매품목삭제</button></td>
                        <td className="px-3 py-2.5 text-center"><button className="px-2 py-1 text-xs font-bold text-slate-500 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded transition-colors">관리</button></td>
                      </tr>
                      <tr className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-3 py-2.5 text-center text-slate-700">쿠팡</td>
                        <td className="px-3 py-2.5 text-center text-slate-700">islim113@nate.com</td>
                        <td className="px-3 py-2.5 text-center text-slate-700">tjgus414</td>
                        <td className="px-3 py-2.5 text-center flex items-center justify-center gap-1">
                          <button className="px-3 py-1 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors">아이디등록</button>
                          <button className="px-3 py-1 text-xs font-bold text-white bg-green-600 hover:bg-green-700 rounded transition-colors">영수증수집하기</button>
                        </td>
                        <td className="px-3 py-2.5 text-center"><button className="px-3 py-1 text-xs font-bold text-white bg-teal-500 hover:bg-orange-600 rounded transition-colors">수집자료보기</button></td>
                        <td className="px-3 py-2.5 text-center"><button className="px-3 py-1 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded transition-colors">구매품목삭제</button></td>
                        <td className="px-3 py-2.5 text-center"><button className="px-2 py-1 text-xs font-bold text-slate-500 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded transition-colors">관리</button></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 쇼핑몰 거래목록 섹션 */}
              <div>
                <div className="flex items-center justify-end mb-3">
                  <button className="px-4 py-1.5 text-xs font-bold text-white bg-teal-500 hover:bg-orange-600 rounded transition-colors">쇼핑몰 영수증 자동매칭하기</button>
                </div>
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-teal-50 border-b border-orange-200">
                        <th className="px-3 py-2.5 text-center font-bold text-slate-600 whitespace-nowrap">쇼핑몰</th>
                        <th className="px-3 py-2.5 text-center font-bold text-slate-600 whitespace-nowrap">거래일자</th>
                        <th className="px-3 py-2.5 text-center font-bold text-slate-600 whitespace-nowrap">실결제합계</th>
                        <th className="px-3 py-2.5 text-center font-bold text-slate-600 whitespace-nowrap">가맹점명</th>
                        <th className="px-3 py-2.5 text-center font-bold text-slate-600 whitespace-nowrap">구매상품</th>
                        <th className="px-3 py-2.5 text-center font-bold text-slate-600 whitespace-nowrap">결재</th>
                        <th className="px-3 py-2.5 text-center font-bold text-slate-600 whitespace-nowrap">영수증</th>
                        <th className="px-3 py-2.5 text-center font-bold text-slate-600 whitespace-nowrap">전표</th>
                        <th className="px-3 py-2.5 text-center font-bold text-slate-600 whitespace-nowrap">매칭</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td colSpan={9} className="text-center py-12 text-slate-400 text-xs">수집된 쇼핑몰 거래내역이 없습니다.</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

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
                <button className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors">조회</button>
              </div>

              {/* 4대보험 고지서 매칭 테이블 */}
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-xs">
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
                        <td className="px-3 py-3 text-center"><button className="px-4 py-1 text-xs font-bold text-white bg-green-600 hover:bg-green-700 rounded transition-colors">보기</button></td>
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
