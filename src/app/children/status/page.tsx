'use client'
import React, { useState, useEffect, useCallback, useMemo } from 'react'

/**
 * 아동현황 — 인천시어린이집관리시스템 [아동 > 아동 등록/수정] 인터페이스와 동일 구성.
 *
 * 인천시 화면정의(childRegUdt.xml) + API(childBasicInfoList.do / getChildDetailInfo.do /
 * searchChildClasList.do / getKidBillKeywordList.do)를 그대로 옮긴 것. 좌측 목록(나이/성명/반명)
 * → 우측 상세 폼 레이아웃까지 동일.
 *
 * ★ CHIL_SN(아동 고유키)
 *   인천시 필요경비 정산 화면은 키가 이름+반뿐이라 동명이인 충돌 위험이 있었는데(실측 5,863명
 *   중 3건), 아동 API 는 CHIL_SN 을 준다. 정산 자동화는 이 CHIL_SN 을 기준키로 쓴다.
 *
 * ★ 자동등록 키워드
 *   인천시 원문 안내: "보호자가 필요경비 입금 시, 통장에 찍히는 문구를 등록하시면 자동
 *   매칭됩니다. 최대 4개까지 등록 가능합니다." → 필요경비정산 자동화의 핵심 축이라 그대로 노출.
 *
 * 데이터는 통합e page_data(field='incheon-children' / 'incheon-keywords')에 인천시 필드명
 * 그대로 저장돼 있고, [인천시에서 가져오기]가 로컬 에이전트로 실제 조회해 갱신한다.
 */

const inputCls = 'border border-teal-300 rounded px-2 py-1 text-[12px] focus:outline-none focus:border-teal-500 w-full'
const roCls = 'border border-slate-200 bg-slate-50 rounded px-2 py-1 text-[12px] w-full text-slate-600'

/** 인천시 아동 (childBasicInfoList.do → childBasicInfoList[]) — 필드명 원본 그대로 */
type IncheonChild = {
  CHIL_SN: number          // ★ 아동 고유키
  CHIL_NM: string          // 성명
  CHILINNB: string         // 아동고유번호
  BRTHDY: string           // 생년월일 YYYYMMDD
  CHILD_CARE_AGE: number   // 보육나이
  CLAS_SN: string          // 반 고유키
  CLAS_NM: string          // 반명
  ENTRNC_DE: string        // 입소일
  RETIRE_DE: string | null // 퇴소일
  STTUS: string            // 상태코드
  KID_STATE_NM: string     // 상태명 (현원/퇴소)
  CARETIME_CD: string
  TIME_NAME: string        // 보육시간명
  CARERIG_CD: string
  CARERIG_STDDE: string    // 보육기준일
  ADRES: string | null     // 주소
  DISP_NAME: string        // 반유형 표시
  FRGNR_SE: string         // 외국인 여부
  NRTR_CHRGE: number       // 보육료
  SPORT_RT: string | null  // 지원율
  CHLDSBUS_USE_BGNDE: string | null  // 통학차량 이용 시작일
  CHLDSBUS_USE_ENDDE: string | null  // 통학차량 이용 종료일
}

type IncheonKeyword = { CHIL_SN: number; KEYWORD_NM: string }

/** YYYYMMDD → YYYY-MM-DD */
function fmtDate(v: string | null | undefined): string {
  if (!v) return ''
  const d = String(v).replace(/[^0-9]/g, '')
  if (d.length !== 8) return String(v)
  return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`
}

export default function ChildStatusPage() {
  const year = String(new Date().getFullYear())
  const [children, setChildren] = useState<IncheonChild[]>([])
  const [keywords, setKeywords] = useState<IncheonKeyword[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [msg, setMsg] = useState('')
  const [savedAt, setSavedAt] = useState<string | null>(null)

  // 인천시 화면의 검색 조건 — 반 / 성명
  // ⚠ 상태 필터는 두지 않는다 — 현재 가져오는 건 현원(SCH_STTUS='000')뿐이라
  //   "전체" 옵션을 두면 퇴소 아동도 있는 것처럼 오해를 준다. 퇴소 상태코드 확정 후 추가.
  const [schClas, setSchClas] = useState('all')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<number | null>(null)  // CHIL_SN

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/incheon/children?year=${year}`)
      const j = await res.json()
      if (j.success) {
        setChildren((j.children || []) as IncheonChild[])
        setKeywords((j.keywords || []) as IncheonKeyword[])
        setSavedAt(j.savedAt || null)
      } else {
        setMsg(j.error || '조회 실패')
      }
    } catch {
      setMsg('통합e 서버에 연결할 수 없습니다.')
    } finally {
      setLoading(false)
    }
  }, [year])

  useEffect(() => { load() }, [load])

  const handleSync = async () => {
    setSyncing(true); setMsg('인천시 조회 중… (로컬 에이전트 경유, 수십 초 걸립니다)')
    try {
      const res = await fetch('/api/incheon/children', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year }),
      })
      const j = await res.json()
      if (j.success) {
        setMsg(`✅ 아동 ${j.childCount}명 · 반 ${j.clasCount}개 · 키워드 ${j.keywordCount}건 가져왔습니다.`)
        await load()
      } else {
        setMsg(`❌ ${j.error || '가져오기 실패'}`)
      }
    } catch {
      setMsg('❌ 통합e 서버에 연결할 수 없습니다.')
    } finally {
      setSyncing(false)
    }
  }

  // 반 목록 — 아동 데이터에서 도출(반설정 화면과 별개 호출 없이)
  const clasOptions = useMemo(() => {
    const m = new Map<string, string>()
    children.forEach(c => { if (c.CLAS_SN) m.set(String(c.CLAS_SN), c.CLAS_NM) })
    return Array.from(m, ([sn, nm]) => ({ sn, nm })).sort((a, b) => a.nm.localeCompare(b.nm, 'ko'))
  }, [children])

  const filtered = useMemo(() => children.filter(c => {
    if (schClas !== 'all' && String(c.CLAS_SN) !== schClas) return false
    if (search && !(c.CHIL_NM || '').includes(search)) return false
    return true
  }), [children, schClas, search])

  const cur = children.find(c => c.CHIL_SN === selected) || null
  const curKeywords = keywords.filter(k => Number(k.CHIL_SN) === selected).map(k => k.KEYWORD_NM)

  return (
    <div className="p-3 space-y-3">
      {/* 헤더 — 인천시 childRegUdt.xml 상단 (보육년도 + 조회조건) */}
      <div className="bg-white rounded-xl border border-teal-400/30 shadow-sm">
        <div className="px-4 py-3 border-b border-teal-400/20 flex items-center gap-2 flex-wrap">
          <span className="text-sm font-bold text-slate-700">아동 등록/수정</span>
          <span className="text-[11px] text-slate-500">보육년도 {year}년</span>

          <form onSubmit={e => { e.preventDefault(); setSearch(searchInput) }} className="flex items-center gap-2 ml-4">
            <span className="text-[11px] text-slate-500 whitespace-nowrap">현원</span>
            <select value={schClas} onChange={e => setSchClas(e.target.value)} className={`${inputCls} !w-36`}>
              <option value="all">전체 반</option>
              {clasOptions.map(o => <option key={o.sn} value={o.sn}>{o.nm}</option>)}
            </select>
            <input
              type="text" placeholder="성명"
              value={searchInput} onChange={e => setSearchInput(e.target.value)}
              className={`${inputCls} !w-32`}
            />
            <button type="submit" className="px-3 py-1.5 text-xs font-bold text-white bg-teal-500 hover:bg-teal-600 rounded whitespace-nowrap">조회</button>
          </form>

          <div className="ml-auto flex items-center gap-2">
            {savedAt && <span className="text-[11px] text-slate-400">최근 동기화 {new Date(savedAt).toLocaleString('ko-KR')}</span>}
            <button
              onClick={handleSync}
              disabled={syncing}
              className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 rounded whitespace-nowrap"
            >
              {syncing ? '가져오는 중…' : '📥 인천시에서 가져오기'}
            </button>
          </div>
        </div>
        {msg && <div className="px-4 py-2 text-[11px] border-t border-slate-100 text-slate-600 bg-slate-50">{msg}</div>}
      </div>

      {/* 본문 — 인천시와 동일: 좌측 목록(나이/성명/반명) + 우측 상세 */}
      <div className="flex gap-3 items-start">
        {/* 좌측 목록 */}
        <div className="w-[280px] shrink-0 bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-[11px]">
            <thead><tr className="bg-teal-50 border-b border-slate-300">
              <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-200 w-[45px]">나이</th>
              <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-200 w-[80px]">성명</th>
              <th className="px-2 py-2 text-center font-bold text-slate-600">반명</th>
            </tr></thead>
          </table>
          <div className="max-h-[calc(100vh-220px)] overflow-y-auto">
            <table className="w-full text-[11px]">
              <tbody>
                {loading ? (
                  <tr><td colSpan={3} className="px-2 py-8 text-center text-slate-400">불러오는 중…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={3} className="px-2 py-8 text-center text-slate-400">
                    {children.length === 0 ? '저장된 아동이 없습니다.' : '검색 결과 없음'}
                  </td></tr>
                ) : filtered.map(c => (
                  <tr
                    key={c.CHIL_SN}
                    onClick={() => setSelected(c.CHIL_SN)}
                    className={`border-b border-slate-100 cursor-pointer ${selected === c.CHIL_SN ? 'bg-blue-100' : 'hover:bg-blue-50/40'}`}
                  >
                    <td className="px-2 py-1.5 text-center text-slate-500 border-r border-slate-100 w-[45px]">{c.CHILD_CARE_AGE}</td>
                    <td className="px-2 py-1.5 text-center text-slate-700 border-r border-slate-100 w-[80px]">{c.CHIL_NM}</td>
                    <td className="px-2 py-1.5 text-center text-slate-600">{c.CLAS_NM}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!loading && (
            <div className="px-3 py-2 border-t border-slate-200 text-[11px] text-slate-500">총 {filtered.length}명</div>
          )}
        </div>

        {/* 우측 상세 */}
        <div className="flex-1 bg-white rounded-xl border border-slate-200 overflow-hidden min-w-0">
          {!cur ? (
            <div className="px-4 py-20 text-center text-slate-400 text-xs">
              {children.length === 0
                ? '저장된 아동이 없습니다. [📥 인천시에서 가져오기]를 눌러주세요.'
                : '좌측 목록에서 아동을 선택하세요.'}
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {/* 기본정보 — 인천시 childRegUdt.xml 필드 순서 그대로 */}
              <div>
                <div className="text-[12px] font-bold text-slate-700 mb-1.5">기본정보</div>
                <table className="w-full text-[12px] border-collapse">
                  <colgroup><col className="w-[110px]" /><col /><col className="w-[110px]" /><col /></colgroup>
                  <tbody>
                    <tr className="border-b border-slate-100">
                      <Th>아동실명</Th><Td><input className={roCls} value={cur.CHIL_NM} readOnly /></Td>
                      <Th>아동별칭</Th><Td><input className={roCls} value={cur.CHIL_NM} readOnly /></Td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <Th>생년월일</Th><Td><input className={roCls} value={fmtDate(cur.BRTHDY)} readOnly /></Td>
                      <Th>보육나이</Th><Td><input className={roCls} value={`${cur.CHILD_CARE_AGE}세`} readOnly /></Td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <Th>입소일</Th><Td><input className={roCls} value={fmtDate(cur.ENTRNC_DE)} readOnly /></Td>
                      <Th>상태</Th><Td>
                        <input
                          className={`${roCls} ${cur.STTUS === '000' ? 'text-emerald-600' : 'text-pink-600'}`}
                          value={cur.KID_STATE_NM + (cur.RETIRE_DE ? ` (${fmtDate(cur.RETIRE_DE)})` : '')}
                          readOnly
                        />
                      </Td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <Th>보육시간</Th><Td><input className={roCls} value={cur.TIME_NAME || ''} readOnly /></Td>
                      <Th>보육기준<br />변경일</Th><Td><input className={roCls} value={fmtDate(cur.CARERIG_STDDE)} readOnly /></Td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <Th>주소</Th><Td colSpan={3}><input className={roCls} value={cur.ADRES || ''} readOnly /></Td>
                    </tr>
                    <tr>
                      <Th>아동고유번호</Th><Td><input className={`${roCls} font-mono`} value={cur.CHILINNB || ''} readOnly /></Td>
                      <Th>외국인</Th><Td><input className={roCls} value={cur.FRGNR_SE === 'Y' ? '예' : '아니오'} readOnly /></Td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* 자동등록 키워드 — 인천시 원문 안내 그대로 */}
              <div>
                <div className="text-[12px] font-bold text-slate-700 mb-1.5">자동등록 키워드</div>
                <div className="border border-slate-200 rounded p-2.5 bg-slate-50/60">
                  <div className="flex flex-wrap gap-1.5 min-h-[26px]">
                    {curKeywords.length === 0
                      ? <span className="text-[11px] text-slate-400 py-1">등록된 키워드가 없습니다.</span>
                      : curKeywords.map((k, i) => (
                          <span key={i} className="px-2 py-1 text-[11px] bg-white border border-teal-300 text-teal-700 rounded">{k}</span>
                        ))}
                  </div>
                  <div className="mt-2 text-[10px] text-slate-500 leading-relaxed">
                    ⓘ 자동등록 키워드 : 보호자가 필요경비 입금 시, 통장에 찍히는 문구를 등록하시면 자동 매칭됩니다.<br />
                    최대 4개까지 등록 가능합니다.
                  </div>
                </div>
              </div>

              {/* 반 배정 — 인천시는 반 변경 내역을 이력으로 관리(반유형/반명/반배정일/퇴반일/비고) */}
              <div>
                <div className="text-[12px] font-bold text-slate-700 mb-1.5">반 배정</div>
                <table className="w-full text-[11px] border border-slate-200">
                  <thead><tr className="bg-teal-50 border-b border-slate-200">
                    <th className="px-2 py-1.5 text-center font-bold text-slate-600 border-r border-slate-200 w-[80px]">반유형</th>
                    <th className="px-2 py-1.5 text-center font-bold text-slate-600 border-r border-slate-200">반명</th>
                    <th className="px-2 py-1.5 text-center font-bold text-slate-600 border-r border-slate-200 w-[100px]">반배정일</th>
                    <th className="px-2 py-1.5 text-center font-bold text-slate-600 border-r border-slate-200 w-[100px]">퇴반일</th>
                    <th className="px-2 py-1.5 text-center font-bold text-slate-600 w-[110px]">비고</th>
                  </tr></thead>
                  <tbody>
                    <tr className="border-b border-slate-100">
                      <td className="px-2 py-1.5 text-center text-slate-600 border-r border-slate-100">{cur.DISP_NAME || '기본'}반</td>
                      <td className="px-2 py-1.5 text-center text-slate-700 border-r border-slate-100">{cur.CLAS_NM}</td>
                      <td className="px-2 py-1.5 text-center text-sky-600 border-r border-slate-100">{fmtDate(cur.CARERIG_STDDE)}</td>
                      <td className="px-2 py-1.5 text-center text-pink-600 border-r border-slate-100">{fmtDate(cur.RETIRE_DE)}</td>
                      <td className="px-2 py-1.5 text-center text-slate-400">-</td>
                    </tr>
                  </tbody>
                </table>
                <div className="mt-1 text-[10px] text-amber-600">
                  ⚠ 현재는 아동 목록의 현재 반만 표시합니다. 반 변경 이력(연장반·방과후반 등 다중 배정)은
                  인천시 searchClasChilHistList.do 를 아동별로 호출해야 채워집니다 — 다음 단계.
                </div>
              </div>

              {/* 통학차량 */}
              <div>
                <div className="text-[12px] font-bold text-slate-700 mb-1.5">통학차량</div>
                <table className="w-full text-[12px] border-collapse">
                  <colgroup><col className="w-[110px]" /><col /><col className="w-[110px]" /><col /></colgroup>
                  <tbody>
                    <tr>
                      <Th>이용 시작일</Th><Td><input className={roCls} value={fmtDate(cur.CHLDSBUS_USE_BGNDE)} readOnly /></Td>
                      <Th>이용 종료일</Th><Td><input className={roCls} value={fmtDate(cur.CHLDSBUS_USE_ENDDE)} readOnly /></Td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="pt-1 text-[10px] text-slate-400">
                아동 고유키 CHIL_SN = <span className="font-mono text-slate-600">{cur.CHIL_SN}</span>
                {' · '}반 고유키 CLAS_SN = <span className="font-mono text-slate-600">{cur.CLAS_SN}</span>
                {' — 필요경비 정산 자동화가 이 키로 인천시와 대조합니다.'}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return <td className="font-medium text-slate-700 bg-slate-100 px-3 py-2 border-r border-slate-200 text-center align-middle">{children}</td>
}
function Td({ children, colSpan }: { children: React.ReactNode; colSpan?: number }) {
  return <td colSpan={colSpan} className="px-3 py-2">{children}</td>
}
