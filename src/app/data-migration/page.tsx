'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import * as XLSX from 'xlsx'
import { getActiveBook, setActiveBook, BOOK_CHANGE_EVENT, bookLabel, ILOVECHILD_BOOKS } from '@/lib/ilovechild-books'
import { GWIN_BUDGETS } from '@/data/gwin-budgets'

// 로컬 에이전트 꺼짐 오류 메시지 안에 "🔌 에이전트 실행" 원클릭 버튼을 끼워 넣어 표시.
// 설치 시 등록된 childcare-agent:// 커스텀 프로토콜을 호출 — 사용자 PC 에 없으면 아무 반응 없음(안전).
function AgentAwareMessage({ text, className }: { text: string; className?: string }) {
  const isAgentOffline = text.includes('에이전트가 실행 중이 아닙니다')
  return (
    <div className={className}>
      <div>{text}</div>
      {isAgentOffline && (
        <a
          href="childcare-agent://start"
          className="inline-flex items-center gap-1 mt-2 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-[11px] font-semibold rounded-lg"
        >
          🔌 에이전트 실행
        </a>
      )}
    </div>
  )
}

// 걸음마 전표 원시 필드 → 한글 컬럼명(미리보기 헤더용). 매핑 없으면 원본 표시.
const GWIN_COL_LABEL: Record<string, string> = {
  _bookLabel: '장부', BILL_DATE: '날짜', BILL_ORDER_DATE: '거래일자', BILL_MONEY: '금액',
  ESTI_INOUT: '수입/지출', ESTI_NAME: '계정과목(목)', ESTI_NAME_DETAIL: '계정과목상세',
  ESTI_NAME_1: '관', ESTI_NAME_2: '항', ESTI_NAME_3: '목', ESTI_NAME_4: '세목', ESTI_DISPLAY: '목코드',
  BILL_MEMO: '적요', BILL_BIGO: '비고', CREDITOR: '거래처', SETLE_MTHD_NAME: '결제방식',
  ACCOUNT_NICKNAME: '통장', BILL_SUPPORT_AT: '보조금', BILL_NURI_AT: '누리', BILL_ATCH_TYPE: '첨부유형',
  BILL_NUM: '증빙번호', BILL_NUMDETAIL: '증빙상세', BILL_IDX: '전표ID', FCLTCD: '시설코드', BOOK_GB: '장부구분',
  _receiptImage: '영수증', _receiptImages: '영수증(전체)',
}

interface GgCardInfo {
  crdNo?: string; cardBank?: string; approvalNo?: string; approvalDate?: string
  approvalTime?: string; amount?: number; merchant?: string; merchantBzno?: string; industry?: string; purchaseDate?: string
}
interface CashLedgerRow {
  idx: number
  date: string
  docNo: string
  accountCode: string
  accountName: string
  subAccountName?: string
  summary: string
  income: number
  expense: number
  balance: number
  agreeDate: string
  _receiptImages?: string[]     // accgg 영수증 이미지 URL
  _cardInfo?: GgCardInfo[]       // accgg 카드매핑 정보
  _payMethod?: string           // 결제방식 코드(stlmMtcd, accgg)
  demandCoName?: string         // 거래처 (gbccm 등)
  _note?: string                // 비고 (gbccm)
  _paymentMethod?: string       // 결제방식 명칭 (gbccm — accgg 의 _payMethod 코드값과 별개)
  _subsidyType?: string         // 보조금 유형 (gbccm)
  // 실제 이미지/상세는 못 가져오지만 있다/없다 여부만 아는 경우(gbccm) — 존재 배지 표시용
  _receiptExists?: boolean
  _cardMappingExists?: boolean
}

interface CashLedgerSummary {
  prevIncome: number
  prevExpense: number
  monthStart: number
  monthIncome: number
  monthExpense: number
  bankBalance?: number   // accgg 월말 총 계좌잔액 (allCcnBlce)
  acctBalance?: number   // accgg 월말 회계잔액 (actgBlce)
}

interface CashLedgerResult {
  yearMonth: string
  rows: CashLedgerRow[]
  summary: CashLedgerSummary
}

const SOURCE_OPTIONS = [
  { value: 'by24', label: '보육나라', url: 'by24.co.kr', features: ['현금출납부'], authType: 'idpw' as const },
  { value: 'jangbunara', label: '장부나라', url: 'jangbunara.com', features: ['현금출납부'], authType: 'idpw' as const },
  { value: 'prime', label: '프라임전자장부', url: '', features: [], authType: 'idpw' as const },
  { value: 'kidshome', label: '키즈홈', url: 'ikidshome.co.kr', features: ['현금출납부'], authType: 'idpw' as const },
  { value: 'kidkids', label: '키드키즈', url: 'kidkids.net', features: [], authType: 'idpw' as const },
  { value: 'easys', label: '이편한시스템', url: '', features: [], authType: 'idpw' as const },
  { value: 'mores', label: '더편한시스템', url: '', features: [], authType: 'idpw' as const },
  { value: 'incheon', label: '인천시어린이집관리시스템', url: 'aincheon.co.kr', features: ['현금출납부'], authType: 'cert' as const },
  { value: 'gyeonggi', label: '경기도어린이집관리시스템', url: 'accgg.co.kr', features: [], authType: 'cert' as const },
  { value: 'seoul', label: '서울시어린이집관리시스템', url: '', features: [], authType: 'idpw' as const },
  { value: 'wisean', label: '와이즈안', url: 'waisn.wisearn.co.kr', features: ['현금출납부'], authType: 'idpw' as const },
  { value: 'ifriends', label: '아이프렌즈', url: 'i-friends.co.kr', features: ['현금출납부'], authType: 'idpw' as const },
  { value: 'cykids', label: '꼬마집', url: 'center.cykids.net', features: [], authType: 'idpw' as const },
  { value: 'walk', label: '걸음마회계', url: '', features: [], authType: 'idpw' as const },
  { value: 'gbccm', label: '경상북도어린이집관리시스템', url: 'gbccm.co.kr', features: ['현금출납부'], authType: 'session' as const },
  // 충남(농협)은 경북과 같은 NH 솔루션의 형제 시스템 — 엔드포인트·세션쿠키(DCPU_SSID)가 동일해
  // 통합e 가 gbccm 로직을 site='cnccm' 으로 재사용한다(2026-07-21 실측 검증).
  // ⚠ unverified — 엔드포인트·세션쿠키가 경북과 동일한 것은 실측했으나, 실제 계정으로 데이터를
  //    받아본 적이 없다. 첫 실사용에서 조회·계정코드 매핑이 확인되면 이 플래그를 지운다.
  { value: 'cnccm', label: '충청남도어린이집관리시스템(농협)', url: 'cnccm.co.kr', features: ['현금출납부'], authType: 'session' as const, unverified: true },
] as const

type SourceType = typeof SOURCE_OPTIONS[number]['value']

// 보육나라 ↔ 수전자장부 매핑 테이블
const MAPPING_TABLE_BASE = {
  by24: {
    income: [
      { by24: '1111', by24Name: '정부지원보육료', sunote: '1111', sunoteNote: '' },
      { by24: '1112', by24Name: '부모부담보육료', sunote: '1112', sunoteNote: '' },
      { by24: '1211', by24Name: '특별활동비', sunote: '1211', sunoteNote: '' },
      { by24: '1221', by24Name: '필요경비(수입)', sunote: '1221', sunoteNote: '4자리 기본', group: true },
      { by24: '1221111', by24Name: '  입학금', sunote: '1221-111', sunoteNote: '' },
      { by24: '1221112', by24Name: '  현장학습비', sunote: '1221-112', sunoteNote: '' },
      { by24: '1221113', by24Name: '  차량운행비', sunote: '1221-113', sunoteNote: '' },
      { by24: '1221121', by24Name: '  부모부담행사비', sunote: '1221-121', sunoteNote: '' },
      { by24: '1221131', by24Name: '  조석식비', sunote: '1221-131', sunoteNote: '' },
      { by24: '1221141', by24Name: '  특성화비', sunote: '1221-141', sunoteNote: '기본값' },
      { by24: '1311', by24Name: '인건비보조금', sunote: '1311', sunoteNote: '누리→13111' },
      { by24: '1321', by24Name: '기관보육료', sunote: '1321', sunoteNote: '' },
      { by24: '1322', by24Name: '연장보육료', sunote: '1322', sunoteNote: '' },
      { by24: '1323', by24Name: '공공형운영비', sunote: '1323', sunoteNote: '환경개선→13231' },
      { by24: '1324', by24Name: '그밖의지원금', sunote: '1324', sunoteNote: '누리→13241, 필요경비→13242' },
      { by24: '1331', by24Name: '자본보조금', sunote: '1331', sunoteNote: '' },
      { by24: '1411', by24Name: '전입금', sunote: '1411-*', sunoteNote: '1:특별활동, 2:입학, 3:현장학습, 4:차량, 5:행사, 6:조석, 7:특성화, 8:기타' },
      { by24: '1421', by24Name: '단기차입금', sunote: '1421', sunoteNote: '' },
      { by24: '1422', by24Name: '장기차입금', sunote: '1422', sunoteNote: '' },
      { by24: '1511', by24Name: '지정후원금', sunote: '1511', sunoteNote: '' },
      { by24: '1512', by24Name: '비지정후원금', sunote: '1512', sunoteNote: '' },
      { by24: '1611', by24Name: '적립금처분수입', sunote: '1611', sunoteNote: '' },
      { by24: '1711', by24Name: '과년도수입', sunote: '1711', sunoteNote: '' },
      { by24: '1811', by24Name: '이자수입', sunote: '1811', sunoteNote: '' },
      { by24: '1812', by24Name: '잡수입', sunote: '1812', sunoteNote: '' },
      { by24: '1911', by24Name: '전년도이월금', sunote: '1911', sunoteNote: '이관 시 스킵' },
    ],
    expense: [
      { by24: '2111', by24Name: '원장급여', sunote: '2111', sunoteNote: '' },
      { by24: '2112', by24Name: '원장수당', sunote: '2112', sunoteNote: '' },
      { by24: '2121', by24Name: '보육교직원급여', sunote: '2121', sunoteNote: '누리→21211' },
      { by24: '2122', by24Name: '보육교직원수당', sunote: '2122', sunoteNote: '누리→21221' },
      { by24: '2131', by24Name: '기타인건비', sunote: '2131', sunoteNote: '누리→21311' },
      { by24: '2141', by24Name: '법정부담금', sunote: '2141', sunoteNote: '누리→21411' },
      { by24: '2142', by24Name: '퇴직금및퇴직적립금', sunote: '2142', sunoteNote: '4자리 기본', group: true },
      { by24: '2142112', by24Name: '  퇴직금', sunote: '2142-112', sunoteNote: '퇴직금/퇴직 키워드' },
      { by24: '2142121', by24Name: '  퇴직적립금', sunote: '2142-121', sunoteNote: '기본값' },
      { by24: '2211', by24Name: '수용비및수수료', sunote: '2211-*', sunoteNote: '1:누리, 2:특별활동, 3:입학, 4:현장학습, 5:차량, 6:행사, 7:조석, 8:특성화' },
      { by24: '2212', by24Name: '공공요금및제세공과금', sunote: '2212', sunoteNote: '' },
      { by24: '2213', by24Name: '연료비', sunote: '2213', sunoteNote: '' },
      { by24: '2214', by24Name: '여비', sunote: '2214', sunoteNote: '' },
      { by24: '2215', by24Name: '차량비', sunote: '2215', sunoteNote: '' },
      { by24: '2216', by24Name: '복리후생비', sunote: '2216', sunoteNote: '누리→22161' },
      { by24: '2217', by24Name: '기타운영비', sunote: '2217', sunoteNote: '4자리 기본', group: true },
      { by24: '2217111', by24Name: '  임대료', sunote: '2217-111', sunoteNote: '임대/월세 키워드, 기본값' },
      { by24: '2217121', by24Name: '  융자이자', sunote: '2217-121', sunoteNote: '융자/이자 키워드' },
      { by24: '2221', by24Name: '업무추진비', sunote: '2221', sunoteNote: '' },
      { by24: '2222', by24Name: '직책급', sunote: '2222', sunoteNote: '' },
      { by24: '2223', by24Name: '회의비', sunote: '2223', sunoteNote: '' },
      { by24: '2311', by24Name: '교직원연수·연구비', sunote: '2311', sunoteNote: '누리→23111' },
      { by24: '2312', by24Name: '교재·교구구입비', sunote: '2312', sunoteNote: '누리→23121, 공공형→23123' },
      { by24: '2313', by24Name: '행사비', sunote: '2313', sunoteNote: '누리→23131' },
      { by24: '2314', by24Name: '영유아복리비', sunote: '2314', sunoteNote: '' },
      { by24: '2315', by24Name: '급식·간식재료비', sunote: '2315', sunoteNote: '누리→23151, 청정→23152' },
      { by24: '2411', by24Name: '특별활동비지출', sunote: '2411', sunoteNote: '' },
      { by24: '2421', by24Name: '필요경비지출', sunote: '2421', sunoteNote: '4자리 기본', group: true },
      { by24: '2421111', by24Name: '  입학금', sunote: '2421-111', sunoteNote: '' },
      { by24: '2421121', by24Name: '  현장학습비', sunote: '2421-121', sunoteNote: '' },
      { by24: '2421131', by24Name: '  차량운행비', sunote: '2421-131', sunoteNote: '' },
      { by24: '2421141', by24Name: '  부모부담행사비', sunote: '2421-141', sunoteNote: '' },
      { by24: '2421151', by24Name: '  조석식비', sunote: '2421-151', sunoteNote: '' },
      { by24: '2421161', by24Name: '  특성화비', sunote: '2421-161', sunoteNote: '기본값' },
      { by24: '2511', by24Name: '적립금', sunote: '2511', sunoteNote: '' },
      { by24: '2611', by24Name: '단기차입금상환', sunote: '2611', sunoteNote: '' },
      { by24: '2612', by24Name: '장기차입금상환', sunote: '2612', sunoteNote: '' },
      { by24: '2621', by24Name: '보조금반환금', sunote: '2621', sunoteNote: '' },
      { by24: '2622', by24Name: '보호자반환금', sunote: '2622', sunoteNote: '' },
      { by24: '2623', by24Name: '법인회계전출금', sunote: '2623', sunoteNote: '' },
      { by24: '2711', by24Name: '시설비', sunote: '2711', sunoteNote: '누리→27111' },
      { by24: '2712', by24Name: '시설장비유지비', sunote: '2712', sunoteNote: '누리→27121' },
      { by24: '2721', by24Name: '자산취득비', sunote: '2721', sunoteNote: '4자리 기본', group: true },
      { by24: '2721001', by24Name: '  차량할부금', sunote: '2721-001', sunoteNote: '차량/할부 키워드' },
      { by24: '2721002', by24Name: '  자산취득비', sunote: '2721-002', sunoteNote: '기본값' },
      { by24: '2811', by24Name: '과년도지출', sunote: '2811', sunoteNote: '누리→28111' },
      { by24: '2911', by24Name: '잡지출', sunote: '2911', sunoteNote: '' },
    ],
    pattern: '7자리 코드(AAAABBB) → AAAA-BBB 자동 변환 (예: 1221111→1221-111, 2421141→2421-141)',
  },
  kidshome: {
    income: [
      { by24: '', by24Name: '정부지원보육료', sunote: '1111', sunoteNote: '' },
      { by24: '', by24Name: '부모부담보육료', sunote: '1112', sunoteNote: '' },
      { by24: '', by24Name: '특별활동비', sunote: '1211', sunoteNote: '' },
      { by24: '', by24Name: '기타필요경비', sunote: '1221', sunoteNote: '', group: true },
      { by24: '', by24Name: '  입학준비금', sunote: '1221-111', sunoteNote: '', sub: true },
      { by24: '', by24Name: '  현장학습비', sunote: '1221-112', sunoteNote: '', sub: true },
      { by24: '', by24Name: '  차량운행비', sunote: '1221-113', sunoteNote: '', sub: true },
      { by24: '', by24Name: '  부모부담행사비', sunote: '1221-121', sunoteNote: '', sub: true },
      { by24: '', by24Name: '  조석식비', sunote: '1221-131', sunoteNote: '', sub: true },
      { by24: '', by24Name: '  특성화비', sunote: '1221-141', sunoteNote: '', sub: true },
      { by24: '', by24Name: '인건비보조금', sunote: '1311', sunoteNote: '' },
      { by24: '', by24Name: '기관보육료', sunote: '1321', sunoteNote: '' },
      { by24: '', by24Name: '연장보육료', sunote: '1322', sunoteNote: '' },
      { by24: '', by24Name: '공공형운영비', sunote: '1323', sunoteNote: '' },
      { by24: '', by24Name: '그밖의지원금', sunote: '1324', sunoteNote: '' },
      { by24: '', by24Name: '자본보조금', sunote: '1331', sunoteNote: '' },
      { by24: '', by24Name: '전입금', sunote: '1411', sunoteNote: '' },
      { by24: '', by24Name: '단기차입금', sunote: '1421', sunoteNote: '' },
      { by24: '', by24Name: '장기차입금', sunote: '1422', sunoteNote: '' },
      { by24: '', by24Name: '지정후원금', sunote: '1511', sunoteNote: '' },
      { by24: '', by24Name: '비지정후원금', sunote: '1512', sunoteNote: '' },
      { by24: '', by24Name: '적립금처분수입', sunote: '1611', sunoteNote: '' },
      { by24: '', by24Name: '과년도수입', sunote: '1711', sunoteNote: '' },
      { by24: '', by24Name: '이자수입', sunote: '1811', sunoteNote: '' },
      { by24: '', by24Name: '잡수입', sunote: '1812', sunoteNote: '' },
      { by24: '', by24Name: '전년도이월금', sunote: '1911', sunoteNote: '이관 시 스킵' },
    ],
    expense: [
      { by24: '', by24Name: '원장급여', sunote: '2111', sunoteNote: '' },
      { by24: '', by24Name: '원장수당', sunote: '2112', sunoteNote: '' },
      { by24: '', by24Name: '보육교직원급여', sunote: '2121', sunoteNote: '' },
      { by24: '', by24Name: '보육교직원수당', sunote: '2122', sunoteNote: '' },
      { by24: '', by24Name: '기타인건비', sunote: '2131', sunoteNote: '' },
      { by24: '', by24Name: '법정부담금', sunote: '2141', sunoteNote: '' },
      { by24: '', by24Name: '퇴직금및퇴직적립금', sunote: '2142', sunoteNote: '', group: true },
      { by24: '', by24Name: '  퇴직금', sunote: '2142-112', sunoteNote: '적요 키워드 자동', sub: true },
      { by24: '', by24Name: '  퇴직적립금', sunote: '2142-121', sunoteNote: '적요 키워드 자동', sub: true },
      { by24: '', by24Name: '수용비및수수료', sunote: '2211', sunoteNote: '' },
      { by24: '', by24Name: '공공요금및제세공과금', sunote: '2212', sunoteNote: '' },
      { by24: '', by24Name: '연료비', sunote: '2213', sunoteNote: '' },
      { by24: '', by24Name: '여비', sunote: '2214', sunoteNote: '' },
      { by24: '', by24Name: '차량비', sunote: '2215', sunoteNote: '' },
      { by24: '', by24Name: '복리후생비', sunote: '2216', sunoteNote: '' },
      { by24: '', by24Name: '기타운영비', sunote: '2217', sunoteNote: '' },
      { by24: '', by24Name: '업무추진비', sunote: '2221', sunoteNote: '' },
      { by24: '', by24Name: '직책급', sunote: '2222', sunoteNote: '' },
      { by24: '', by24Name: '회의비', sunote: '2223', sunoteNote: '' },
      { by24: '', by24Name: '교직원연수·연구비', sunote: '2311', sunoteNote: '' },
      { by24: '', by24Name: '교재.교구구입비', sunote: '2312', sunoteNote: '' },
      { by24: '', by24Name: '행사비', sunote: '2313', sunoteNote: '' },
      { by24: '', by24Name: '영유아복리비', sunote: '2314', sunoteNote: '' },
      { by24: '', by24Name: '급식.간식재료비', sunote: '2315', sunoteNote: '' },
      { by24: '', by24Name: '특별활동비지출', sunote: '2411', sunoteNote: '' },
      { by24: '', by24Name: '기타필요경비지출', sunote: '2421', sunoteNote: '', group: true },
      { by24: '', by24Name: '  입학준비금', sunote: '2421-111', sunoteNote: '', sub: true },
      { by24: '', by24Name: '  현장학습비', sunote: '2421-121', sunoteNote: '', sub: true },
      { by24: '', by24Name: '  차량운행비', sunote: '2421-131', sunoteNote: '', sub: true },
      { by24: '', by24Name: '  부모부담행사비', sunote: '2421-141', sunoteNote: '', sub: true },
      { by24: '', by24Name: '  조석식비', sunote: '2421-151', sunoteNote: '', sub: true },
      { by24: '', by24Name: '  특성화비', sunote: '2421-161', sunoteNote: '', sub: true },
      { by24: '', by24Name: '적립금', sunote: '2511', sunoteNote: '' },
      { by24: '', by24Name: '단기차입금상환', sunote: '2611', sunoteNote: '' },
      { by24: '', by24Name: '장기차입금상환', sunote: '2612', sunoteNote: '' },
      { by24: '', by24Name: '보조금반환금', sunote: '2621', sunoteNote: '' },
      { by24: '', by24Name: '보호자반환금', sunote: '2622', sunoteNote: '' },
      { by24: '', by24Name: '법인회계전출금', sunote: '2623', sunoteNote: '' },
      { by24: '', by24Name: '시설비', sunote: '2711', sunoteNote: '' },
      { by24: '', by24Name: '시설장비유지비', sunote: '2712', sunoteNote: '' },
      { by24: '', by24Name: '자산취득비', sunote: '2721', sunoteNote: '' },
      { by24: '', by24Name: '과년도지출', sunote: '2811', sunoteNote: '' },
      { by24: '', by24Name: '잡지출', sunote: '2911', sunoteNote: '' },
    ],
    pattern: '계정명 → sunote 코드 자동 매핑 (계정명 기반)',
  },
  ifriends: {
    income: [
      { by24: '', by24Name: '정부지원보육료', sunote: '1111', sunoteNote: '' },
      { by24: '', by24Name: '부모부담보육료', sunote: '1112', sunoteNote: '' },
      { by24: '', by24Name: '특별활동비', sunote: '1211', sunoteNote: '' },
      { by24: '', by24Name: '기타필요경비', sunote: '1221', sunoteNote: '', group: true },
      { by24: '', by24Name: '  입학준비금', sunote: '1221-111', sunoteNote: '', sub: true },
      { by24: '', by24Name: '  현장학습비', sunote: '1221-112', sunoteNote: '', sub: true },
      { by24: '', by24Name: '  차량운행비', sunote: '1221-113', sunoteNote: '', sub: true },
      { by24: '', by24Name: '  부모부담행사비', sunote: '1221-121', sunoteNote: '', sub: true },
      { by24: '', by24Name: '  조석식비', sunote: '1221-131', sunoteNote: '', sub: true },
      { by24: '', by24Name: '  특성화비', sunote: '1221-141', sunoteNote: '', sub: true },
      { by24: '', by24Name: '인건비보조금', sunote: '1311', sunoteNote: '' },
      { by24: '', by24Name: '기관보육료', sunote: '1321', sunoteNote: '' },
      { by24: '', by24Name: '연장보육료', sunote: '1322', sunoteNote: '' },
      { by24: '', by24Name: '공공형운영비', sunote: '1323', sunoteNote: '' },
      { by24: '', by24Name: '그밖의지원금', sunote: '1324', sunoteNote: '' },
      { by24: '', by24Name: '자본보조금', sunote: '1331', sunoteNote: '' },
      { by24: '', by24Name: '전입금', sunote: '1411', sunoteNote: '' },
      { by24: '', by24Name: '단기차입금', sunote: '1421', sunoteNote: '' },
      { by24: '', by24Name: '장기차입금', sunote: '1422', sunoteNote: '' },
      { by24: '', by24Name: '지정후원금', sunote: '1511', sunoteNote: '' },
      { by24: '', by24Name: '비지정후원금', sunote: '1512', sunoteNote: '' },
      { by24: '', by24Name: '적립금처분수입', sunote: '1611', sunoteNote: '' },
      { by24: '', by24Name: '과년도수입', sunote: '1711', sunoteNote: '' },
      { by24: '', by24Name: '이자수입', sunote: '1811', sunoteNote: '' },
      { by24: '', by24Name: '잡수입', sunote: '1812', sunoteNote: '' },
      { by24: '', by24Name: '전년도이월금', sunote: '1911', sunoteNote: '이관 시 스킵' },
    ],
    expense: [
      { by24: '', by24Name: '원장급여', sunote: '2111', sunoteNote: '' },
      { by24: '', by24Name: '원장수당', sunote: '2112', sunoteNote: '' },
      { by24: '', by24Name: '보육교직원급여', sunote: '2121', sunoteNote: '' },
      { by24: '', by24Name: '보육교직원수당', sunote: '2122', sunoteNote: '' },
      { by24: '', by24Name: '기타인건비', sunote: '2131', sunoteNote: '' },
      { by24: '', by24Name: '법정부담금', sunote: '2141', sunoteNote: '' },
      { by24: '', by24Name: '퇴직금및퇴직적립금', sunote: '2142', sunoteNote: '', group: true },
      { by24: '', by24Name: '  퇴직금', sunote: '2142-112', sunoteNote: '적요 키워드 자동', sub: true },
      { by24: '', by24Name: '  퇴직적립금', sunote: '2142-121', sunoteNote: '적요 키워드 자동', sub: true },
      { by24: '', by24Name: '수용비및수수료', sunote: '2211', sunoteNote: '' },
      { by24: '', by24Name: '공공요금및제세공과금', sunote: '2212', sunoteNote: '' },
      { by24: '', by24Name: '연료비', sunote: '2213', sunoteNote: '' },
      { by24: '', by24Name: '여비', sunote: '2214', sunoteNote: '' },
      { by24: '', by24Name: '차량비', sunote: '2215', sunoteNote: '' },
      { by24: '', by24Name: '복리후생비', sunote: '2216', sunoteNote: '' },
      { by24: '', by24Name: '기타운영비', sunote: '2217', sunoteNote: '' },
      { by24: '', by24Name: '업무추진비', sunote: '2221', sunoteNote: '' },
      { by24: '', by24Name: '직책급', sunote: '2222', sunoteNote: '' },
      { by24: '', by24Name: '회의비', sunote: '2223', sunoteNote: '' },
      { by24: '', by24Name: '교직원연수·연구비', sunote: '2311', sunoteNote: '' },
      { by24: '', by24Name: '교재.교구구입비', sunote: '2312', sunoteNote: '' },
      { by24: '', by24Name: '행사비', sunote: '2313', sunoteNote: '' },
      { by24: '', by24Name: '영유아복리비', sunote: '2314', sunoteNote: '' },
      { by24: '', by24Name: '급식.간식재료비', sunote: '2315', sunoteNote: '' },
      { by24: '', by24Name: '특별활동비지출', sunote: '2411', sunoteNote: '' },
      { by24: '', by24Name: '기타필요경비지출', sunote: '2421', sunoteNote: '', group: true },
      { by24: '', by24Name: '  입학준비금', sunote: '2421-111', sunoteNote: '', sub: true },
      { by24: '', by24Name: '  현장학습비', sunote: '2421-121', sunoteNote: '', sub: true },
      { by24: '', by24Name: '  차량운행비', sunote: '2421-131', sunoteNote: '', sub: true },
      { by24: '', by24Name: '  부모부담행사비', sunote: '2421-141', sunoteNote: '', sub: true },
      { by24: '', by24Name: '  조석식비', sunote: '2421-151', sunoteNote: '', sub: true },
      { by24: '', by24Name: '  특성화비', sunote: '2421-161', sunoteNote: '', sub: true },
      { by24: '', by24Name: '적립금', sunote: '2511', sunoteNote: '' },
      { by24: '', by24Name: '단기차입금상환', sunote: '2611', sunoteNote: '' },
      { by24: '', by24Name: '장기차입금상환', sunote: '2612', sunoteNote: '' },
      { by24: '', by24Name: '보조금반환금', sunote: '2621', sunoteNote: '' },
      { by24: '', by24Name: '보호자반환금', sunote: '2622', sunoteNote: '' },
      { by24: '', by24Name: '법인회계전출금', sunote: '2623', sunoteNote: '' },
      { by24: '', by24Name: '시설비', sunote: '2711', sunoteNote: '' },
      { by24: '', by24Name: '시설장비유지비', sunote: '2712', sunoteNote: '' },
      { by24: '', by24Name: '자산취득비', sunote: '2721', sunoteNote: '' },
      { by24: '', by24Name: '과년도지출', sunote: '2811', sunoteNote: '' },
      { by24: '', by24Name: '잡지출', sunote: '2911', sunoteNote: '' },
    ],
    pattern: '계정명 → sunote 코드 자동 매핑 (계정명 기반)',
  },
  jangbunara: {
    income: [
      { by24: '1|01110', by24Name: '정부지원보육료', sunote: '1111', sunoteNote: '' },
      { by24: '1|01120', by24Name: '부모부담보육료', sunote: '1112', sunoteNote: '' },
      { by24: '1|02110', by24Name: '특별활동비', sunote: '1211', sunoteNote: '' },
      { by24: '1|02210', by24Name: '기타필요경비(수입)', sunote: '1221', sunoteNote: '통합(~24.2)', group: true },
      { by24: '1|02211', by24Name: '  입학준비금', sunote: '1221-111', sunoteNote: '24.3~ 세목' },
      { by24: '1|02212', by24Name: '  현장학습비', sunote: '1221-112', sunoteNote: '24.3~ 세목' },
      { by24: '1|02213', by24Name: '  차량운행비', sunote: '1221-113', sunoteNote: '24.3~ 세목' },
      { by24: '1|02214', by24Name: '  부모부담행사비', sunote: '1221-121', sunoteNote: '24.3~ 세목' },
      { by24: '1|02215', by24Name: '  아침,저녁급식비', sunote: '1221-131', sunoteNote: '24.3~ 세목' },
      { by24: '1|02216', by24Name: '  기타시도특성화비', sunote: '1221-141', sunoteNote: '24.3~ 세목' },
      { by24: '1|03110', by24Name: '인건비보조금', sunote: '1311', sunoteNote: '' },
      { by24: '1|03210', by24Name: '기관보육료', sunote: '1321', sunoteNote: '' },
      { by24: '1|03220', by24Name: '연장보육료', sunote: '1322', sunoteNote: '' },
      { by24: '1|03230', by24Name: '공공형운영비', sunote: '1323', sunoteNote: '' },
      { by24: '1|03240', by24Name: '그밖의지원금', sunote: '1324', sunoteNote: '' },
      { by24: '1|03310', by24Name: '자본보조금', sunote: '1331', sunoteNote: '' },
      { by24: '1|04110', by24Name: '전입금', sunote: '1411', sunoteNote: '' },
      { by24: '1|04210', by24Name: '단기차입금', sunote: '1421', sunoteNote: '' },
      { by24: '1|04220', by24Name: '장기차입금', sunote: '1422', sunoteNote: '' },
      { by24: '1|05110', by24Name: '지정후원금', sunote: '1511', sunoteNote: '' },
      { by24: '1|05120', by24Name: '비지정후원금', sunote: '1512', sunoteNote: '' },
      { by24: '1|06110', by24Name: '적립금처분수입', sunote: '1611', sunoteNote: '' },
      { by24: '1|07110', by24Name: '과년도수입', sunote: '1711', sunoteNote: '' },
      { by24: '1|08110', by24Name: '이자수입', sunote: '1811', sunoteNote: '' },
      { by24: '1|08120', by24Name: '그밖의잡수입', sunote: '1812', sunoteNote: '' },
      { by24: '1|09110', by24Name: '전년도이월금', sunote: '1911', sunoteNote: '이관 시 스킵' },
      { by24: '1|09120', by24Name: '전년도이월사업비', sunote: '1912', sunoteNote: '' },
    ],
    expense: [
      { by24: '2|01110', by24Name: '원장급여', sunote: '2111', sunoteNote: '' },
      { by24: '2|01120', by24Name: '원장수당', sunote: '2112', sunoteNote: '' },
      { by24: '2|01210', by24Name: '보육교직원급여', sunote: '2121', sunoteNote: '' },
      { by24: '2|01220', by24Name: '보육교직원수당', sunote: '2122', sunoteNote: '' },
      { by24: '2|01310', by24Name: '기타인건비', sunote: '2131', sunoteNote: '' },
      { by24: '2|01410', by24Name: '법정부담금', sunote: '2141', sunoteNote: '' },
      { by24: '2|01420', by24Name: '퇴직금및퇴직적립금', sunote: '2142', sunoteNote: '통합(~24.2)', group: true },
      { by24: '2|01421', by24Name: '  퇴직금', sunote: '2142-112', sunoteNote: '24.3~ 세목' },
      { by24: '2|01422', by24Name: '  퇴직적립금', sunote: '2142-121', sunoteNote: '24.3~ 세목' },
      { by24: '2|02110', by24Name: '수용비및수수료', sunote: '2211', sunoteNote: '' },
      { by24: '2|02120', by24Name: '공공요금및제세공과금', sunote: '2212', sunoteNote: '' },
      { by24: '2|02130', by24Name: '연료비', sunote: '2213', sunoteNote: '' },
      { by24: '2|02140', by24Name: '여비', sunote: '2214', sunoteNote: '' },
      { by24: '2|02150', by24Name: '차량비', sunote: '2215', sunoteNote: '' },
      { by24: '2|02160', by24Name: '복리후생비', sunote: '2216', sunoteNote: '' },
      { by24: '2|02170', by24Name: '기타운영비', sunote: '2217', sunoteNote: '통합(~24.2)', group: true },
      { by24: '2|02171', by24Name: '  임대료', sunote: '2217-111', sunoteNote: '24.3~ 세목' },
      { by24: '2|02172', by24Name: '  건물융자금의이자', sunote: '2217-121', sunoteNote: '24.3~ 세목' },
      { by24: '2|02210', by24Name: '업무추진비', sunote: '2221', sunoteNote: '' },
      { by24: '2|02220', by24Name: '직책급', sunote: '2222', sunoteNote: '' },
      { by24: '2|02230', by24Name: '회의비', sunote: '2223', sunoteNote: '' },
      { by24: '2|03110', by24Name: '교직원연수·연구비', sunote: '2311', sunoteNote: '' },
      { by24: '2|03120', by24Name: '교재·교구구입비', sunote: '2312', sunoteNote: '' },
      { by24: '2|03130', by24Name: '행사비', sunote: '2313', sunoteNote: '' },
      { by24: '2|03140', by24Name: '영유아복리비', sunote: '2314', sunoteNote: '' },
      { by24: '2|03150', by24Name: '급식·간식재료비', sunote: '2315', sunoteNote: '' },
      { by24: '2|04110', by24Name: '특별활동비지출', sunote: '2411', sunoteNote: '' },
      { by24: '2|04210', by24Name: '기타필요경비지출', sunote: '2421', sunoteNote: '통합(~24.2)', group: true },
      { by24: '2|04211', by24Name: '  입학준비금지출', sunote: '2421-111', sunoteNote: '24.3~ 세목' },
      { by24: '2|04212', by24Name: '  현장학습비지출', sunote: '2421-121', sunoteNote: '24.3~ 세목' },
      { by24: '2|04213', by24Name: '  차량운행비지출', sunote: '2421-131', sunoteNote: '24.3~ 세목' },
      { by24: '2|04214', by24Name: '  부모부담행사비지출', sunote: '2421-141', sunoteNote: '24.3~ 세목' },
      { by24: '2|04215', by24Name: '  아침,저녁급식비지출', sunote: '2421-151', sunoteNote: '24.3~ 세목' },
      { by24: '2|04216', by24Name: '  기타시도특성화비지출', sunote: '2421-161', sunoteNote: '24.3~ 세목' },
      { by24: '2|05110', by24Name: '적립금', sunote: '2511', sunoteNote: '' },
      { by24: '2|06110', by24Name: '단기차입금상환', sunote: '2611', sunoteNote: '' },
      { by24: '2|06120', by24Name: '장기차입금상환', sunote: '2612', sunoteNote: '' },
      { by24: '2|06210', by24Name: '보조금반환금', sunote: '2621', sunoteNote: '' },
      { by24: '2|06220', by24Name: '보호자반환금', sunote: '2622', sunoteNote: '' },
      { by24: '2|06230', by24Name: '법인회계전출금', sunote: '2623', sunoteNote: '' },
      { by24: '2|07110', by24Name: '시설비', sunote: '2711', sunoteNote: '' },
      { by24: '2|07120', by24Name: '시설장비유지비', sunote: '2712', sunoteNote: '' },
      { by24: '2|07210', by24Name: '자산취득비', sunote: '2721', sunoteNote: '통합(~24.2)', group: true },
      { by24: '2|07211', by24Name: '  차량할부금', sunote: '2721-001', sunoteNote: '24.3~ 세목' },
      { by24: '2|07212', by24Name: '  자산취득', sunote: '2721-002', sunoteNote: '24.3~ 세목' },
      { by24: '2|08110', by24Name: '과년도지출', sunote: '2811', sunoteNote: '' },
      { by24: '2|09110', by24Name: '잡지출', sunote: '2911', sunoteNote: '' },
      { by24: '2|10110', by24Name: '예비비', sunote: '2991', sunoteNote: '' },
    ],
    pattern: '장부나라 코드(type|code) → sunote 코드. 24년2월까지=통합 목(4자리) / 24년3월~=세목 세분화(4-3자리) 자동 분기',
  },
  incheon: {
    income: [
      { by24: '', by24Name: '정부지원보육료', sunote: '1111', sunoteNote: '' },
      { by24: '', by24Name: '부모부담보육료', sunote: '1112', sunoteNote: '' },
      { by24: '', by24Name: '특별활동비', sunote: '1211', sunoteNote: '' },
      { by24: '', by24Name: '기타필요경비', sunote: '1221', sunoteNote: '', group: true },
      { by24: '', by24Name: '  입학준비금', sunote: '1221-111', sunoteNote: '목[세목] 명 기반', sub: true },
      { by24: '', by24Name: '  현장학습비', sunote: '1221-112', sunoteNote: '목[세목] 명 기반', sub: true },
      { by24: '', by24Name: '  차량운행비', sunote: '1221-113', sunoteNote: '목[세목] 명 기반', sub: true },
      { by24: '', by24Name: '  부모부담행사비', sunote: '1221-121', sunoteNote: '목[세목] 명 기반', sub: true },
      { by24: '', by24Name: '  조석식비', sunote: '1221-131', sunoteNote: '목[세목] 명 기반', sub: true },
      { by24: '', by24Name: '  특성화비', sunote: '1221-141', sunoteNote: '목[세목] 명 기반', sub: true },
      { by24: '', by24Name: '인건비보조금', sunote: '1311', sunoteNote: '' },
      { by24: '', by24Name: '기관보육료', sunote: '1321', sunoteNote: '' },
      { by24: '', by24Name: '연장보육료', sunote: '1322', sunoteNote: '' },
      { by24: '', by24Name: '공공형운영비', sunote: '1323', sunoteNote: '' },
      { by24: '', by24Name: '그밖의지원금', sunote: '1324', sunoteNote: '' },
      { by24: '', by24Name: '전입금', sunote: '1411', sunoteNote: '' },
      { by24: '', by24Name: '단기차입금', sunote: '1421', sunoteNote: '' },
      { by24: '', by24Name: '장기차입금', sunote: '1422', sunoteNote: '' },
      { by24: '', by24Name: '이자수입', sunote: '1811', sunoteNote: '' },
      { by24: '', by24Name: '잡수입', sunote: '1812', sunoteNote: '' },
      { by24: '', by24Name: '전년도이월금', sunote: '1911', sunoteNote: '이관 시 스킵' },
    ],
    expense: [
      { by24: '', by24Name: '원장급여', sunote: '2111', sunoteNote: '' },
      { by24: '', by24Name: '원장수당', sunote: '2112', sunoteNote: '' },
      { by24: '', by24Name: '보육교직원급여', sunote: '2121', sunoteNote: '' },
      { by24: '', by24Name: '보육교직원수당', sunote: '2122', sunoteNote: '' },
      { by24: '', by24Name: '기타인건비', sunote: '2131', sunoteNote: '' },
      { by24: '', by24Name: '법정부담금', sunote: '2141', sunoteNote: '' },
      { by24: '', by24Name: '퇴직금및퇴직적립금', sunote: '2142', sunoteNote: '', group: true },
      { by24: '', by24Name: '  퇴직금', sunote: '2142-112', sunoteNote: '적요 키워드 자동', sub: true },
      { by24: '', by24Name: '  퇴직적립금', sunote: '2142-121', sunoteNote: '적요 키워드 자동', sub: true },
      { by24: '', by24Name: '수용비및수수료', sunote: '2211', sunoteNote: '' },
      { by24: '', by24Name: '공공요금및제세공과금', sunote: '2212', sunoteNote: '' },
      { by24: '', by24Name: '연료비', sunote: '2213', sunoteNote: '' },
      { by24: '', by24Name: '여비', sunote: '2214', sunoteNote: '' },
      { by24: '', by24Name: '차량비', sunote: '2215', sunoteNote: '' },
      { by24: '', by24Name: '복리후생비', sunote: '2216', sunoteNote: '' },
      { by24: '', by24Name: '기타운영비', sunote: '2217', sunoteNote: '' },
      { by24: '', by24Name: '업무추진비', sunote: '2221', sunoteNote: '' },
      { by24: '', by24Name: '교직원연수·연구비', sunote: '2311', sunoteNote: '' },
      { by24: '', by24Name: '교재.교구구입비', sunote: '2312', sunoteNote: '' },
      { by24: '', by24Name: '행사비', sunote: '2313', sunoteNote: '' },
      { by24: '', by24Name: '영유아복리비', sunote: '2314', sunoteNote: '' },
      { by24: '', by24Name: '급식.간식재료비', sunote: '2315', sunoteNote: '' },
      { by24: '', by24Name: '특별활동비지출', sunote: '2411', sunoteNote: '' },
      { by24: '', by24Name: '기타필요경비지출', sunote: '2421', sunoteNote: '', group: true },
      { by24: '', by24Name: '  입학준비금', sunote: '2421-111', sunoteNote: '목[세목] 명 기반', sub: true },
      { by24: '', by24Name: '  현장학습비', sunote: '2421-121', sunoteNote: '목[세목] 명 기반', sub: true },
      { by24: '', by24Name: '  차량운행비', sunote: '2421-131', sunoteNote: '목[세목] 명 기반', sub: true },
      { by24: '', by24Name: '  부모부담행사비', sunote: '2421-141', sunoteNote: '목[세목] 명 기반', sub: true },
      { by24: '', by24Name: '  조석식비', sunote: '2421-151', sunoteNote: '목[세목] 명 기반', sub: true },
      { by24: '', by24Name: '  특성화비', sunote: '2421-161', sunoteNote: '목[세목] 명 기반', sub: true },
      { by24: '', by24Name: '단기차입금상환', sunote: '2611', sunoteNote: '' },
      { by24: '', by24Name: '장기차입금상환', sunote: '2612', sunoteNote: '' },
      { by24: '', by24Name: '시설비', sunote: '2711', sunoteNote: '' },
      { by24: '', by24Name: '시설장비유지비', sunote: '2712', sunoteNote: '' },
      { by24: '', by24Name: '자산취득비', sunote: '2721', sunoteNote: '' },
      { by24: '', by24Name: '과년도지출', sunote: '2811', sunoteNote: '' },
      { by24: '', by24Name: '잡지출', sunote: '2911', sunoteNote: '' },
    ],
    pattern: '인천시 계정과목명(목[세목]) → sunote 코드 (계정명 기반). 공동인증서 로그인, ESTI_CODE + 목[세목]명으로 매핑',
  },
  wisean: {
    income: [
      { by24: '1911', by24Name: '전년도이월금', sunote: '1911', sunoteNote: '이관 시 스킵' },
      { by24: '1111', by24Name: '정부지원보육료', sunote: '1111', sunoteNote: '' },
      { by24: '1112', by24Name: '부모부담보육료', sunote: '1112', sunoteNote: '' },
      { by24: '1211', by24Name: '특별활동비', sunote: '1211', sunoteNote: '' },
      { by24: '1221', by24Name: '기타필요경비', sunote: '1221', sunoteNote: '4자리 기본', group: true },
      { by24: '12211', by24Name: '  입학준비금', sunote: '1221-111', sunoteNote: '입학 키워드', sub: true },
      { by24: '12212', by24Name: '  현장학습비', sunote: '1221-112', sunoteNote: '현장학습 키워드', sub: true },
      { by24: '12213', by24Name: '  차량운행비', sunote: '1221-113', sunoteNote: '차량 키워드', sub: true },
      { by24: '12214', by24Name: '  부모부담행사비', sunote: '1221-121', sunoteNote: '행사 키워드', sub: true },
      { by24: '12215', by24Name: '  조석식비', sunote: '1221-131', sunoteNote: '조석/급식 키워드', sub: true },
      { by24: '12216', by24Name: '  특성화비', sunote: '1221-141', sunoteNote: '특성화 키워드', sub: true },
      { by24: '1311', by24Name: '인건비보조금', sunote: '1311', sunoteNote: '' },
      { by24: '1321', by24Name: '기관보육료', sunote: '1321', sunoteNote: '' },
      { by24: '1322', by24Name: '연장보육료', sunote: '1322', sunoteNote: '' },
      { by24: '1324', by24Name: '그밖의지원금', sunote: '1324', sunoteNote: '' },
      { by24: '1411', by24Name: '전입금', sunote: '1411', sunoteNote: '' },
      { by24: '1811', by24Name: '이자수입', sunote: '1811', sunoteNote: '' },
      { by24: '1812', by24Name: '그밖의잡수입', sunote: '1812', sunoteNote: '' },
    ],
    expense: [
      { by24: '2111', by24Name: '원장급여', sunote: '2111', sunoteNote: '' },
      { by24: '2112', by24Name: '원장수당', sunote: '2112', sunoteNote: '' },
      { by24: '2121', by24Name: '보육교직원급여', sunote: '2121', sunoteNote: '' },
      { by24: '2122', by24Name: '보육교직원수당', sunote: '2122', sunoteNote: '' },
      { by24: '2131', by24Name: '기타인건비', sunote: '2131', sunoteNote: '' },
      { by24: '2141', by24Name: '법정부담금', sunote: '2141', sunoteNote: '' },
      { by24: '2142', by24Name: '퇴직금및퇴직적립금', sunote: '2142', sunoteNote: '4자리 기본', group: true },
      { by24: '21423', by24Name: '  퇴직금', sunote: '2142-112', sunoteNote: '퇴직금 키워드', sub: true },
      { by24: '21424', by24Name: '  퇴직적립금', sunote: '2142-121', sunoteNote: '기본값', sub: true },
      { by24: '2211', by24Name: '수용비및수수료', sunote: '2211', sunoteNote: '' },
      { by24: '2212', by24Name: '공공요금및제세공과금', sunote: '2212', sunoteNote: '' },
      { by24: '2213', by24Name: '연료비', sunote: '2213', sunoteNote: '' },
      { by24: '2214', by24Name: '여비', sunote: '2214', sunoteNote: '' },
      { by24: '2215', by24Name: '차량비', sunote: '2215', sunoteNote: '' },
      { by24: '2216', by24Name: '복리후생비', sunote: '2216', sunoteNote: '' },
      { by24: '2217', by24Name: '기타운영비', sunote: '2217', sunoteNote: '4자리 기본', group: true },
      { by24: '22171', by24Name: '  임대료', sunote: '2217-111', sunoteNote: '임대/임차 키워드, 기본값', sub: true },
      { by24: '22172', by24Name: '  건물융자이자', sunote: '2217-121', sunoteNote: '융자/이자 키워드', sub: true },
      { by24: '2221', by24Name: '업무추진비', sunote: '2221', sunoteNote: '' },
      { by24: '2311', by24Name: '교직원연수연구비', sunote: '2311', sunoteNote: '' },
      { by24: '2312', by24Name: '교재교구구입비', sunote: '2312', sunoteNote: '' },
      { by24: '2313', by24Name: '행사비', sunote: '2313', sunoteNote: '' },
      { by24: '2314', by24Name: '영유아복리비', sunote: '2314', sunoteNote: '' },
      { by24: '2315', by24Name: '급식간식재료비', sunote: '2315', sunoteNote: '' },
      { by24: '2411', by24Name: '특별활동비지출', sunote: '2411', sunoteNote: '' },
      { by24: '2421', by24Name: '기타필요경비지출', sunote: '2421', sunoteNote: '4자리 기본', group: true },
      { by24: '24211', by24Name: '  입학준비금', sunote: '2421-111', sunoteNote: '입학 키워드', sub: true },
      { by24: '24212', by24Name: '  현장학습비', sunote: '2421-121', sunoteNote: '현장학습 키워드', sub: true },
      { by24: '24213', by24Name: '  차량운행비', sunote: '2421-131', sunoteNote: '차량 키워드', sub: true },
      { by24: '24214', by24Name: '  부모부담행사비', sunote: '2421-141', sunoteNote: '행사 키워드', sub: true },
      { by24: '24215', by24Name: '  조석식비', sunote: '2421-151', sunoteNote: '조석/급식 키워드', sub: true },
      { by24: '24216', by24Name: '  특성화비', sunote: '2421-161', sunoteNote: '특성화 키워드', sub: true },
      { by24: '2711', by24Name: '시설비', sunote: '2711', sunoteNote: '' },
      { by24: '2712', by24Name: '시설장비유지비', sunote: '2712', sunoteNote: '' },
      { by24: '2721', by24Name: '자산취득비', sunote: '2721', sunoteNote: '4자리 기본', group: true },
      { by24: '27211', by24Name: '  차량할부금', sunote: '2721-001', sunoteNote: '차량/할부 키워드', sub: true },
      { by24: '27212', by24Name: '  자산취득비', sunote: '2721-002', sunoteNote: '기본값', sub: true },
      { by24: '2811', by24Name: '과년도지출', sunote: '2811', sunoteNote: '' },
      { by24: '2911', by24Name: '잡지출', sunote: '2911', sunoteNote: '' },
    ],
    pattern: '와이즈안 계정과목명 → sunote 코드 (수입=목 앞1·지출=앞2). 세목 5계정만 세분화: 기타필요경비(수입/지출)·기타운영비·자산취득비·퇴직적립금 → 세목코드, 나머지 목 4자리',
  },
  gbccm: {
    income: [
      { by24: '111', by24Name: '정부지원 보육료', sunote: '1111', sunoteNote: '' },
      { by24: '112', by24Name: '부모부담 보육료', sunote: '1112', sunoteNote: '' },
      { by24: '121', by24Name: '특별활동비', sunote: '1211', sunoteNote: '' },
      { by24: '221', by24Name: '기타필요경비', sunote: '1221', sunoteNote: '4자리 기본', group: true },
      { by24: '  221', by24Name: '  입학준비금', sunote: '1221-111', sunoteNote: '입학 키워드', sub: true },
      { by24: '  221', by24Name: '  현장학습비', sunote: '1221-112', sunoteNote: '현장학습 키워드', sub: true },
      { by24: '  221', by24Name: '  차량운행비', sunote: '1221-113', sunoteNote: '차량 키워드', sub: true },
      { by24: '  221', by24Name: '  부모부담행사비', sunote: '1221-121', sunoteNote: '행사 키워드', sub: true },
      { by24: '  221', by24Name: '  조석식비', sunote: '1221-131', sunoteNote: '조석/급식 키워드', sub: true },
      { by24: '  221', by24Name: '  특성화비', sunote: '1221-141', sunoteNote: '특성화 키워드, 기본값', sub: true },
      { by24: '311', by24Name: '인건비보조금', sunote: '1311', sunoteNote: '' },
      { by24: '321', by24Name: '기관보육료', sunote: '1321', sunoteNote: '' },
      { by24: '322', by24Name: '연장보육료', sunote: '1322', sunoteNote: '' },
      { by24: '324', by24Name: '그밖의지원금', sunote: '1324', sunoteNote: '' },
      { by24: '411', by24Name: '전입금', sunote: '1411', sunoteNote: '' },
      { by24: '811', by24Name: '이자수입', sunote: '1811', sunoteNote: '' },
      { by24: '812', by24Name: '그밖의잡수입', sunote: '1812', sunoteNote: '' },
      { by24: '911', by24Name: '전년도이월금', sunote: '1911', sunoteNote: '이관 시 스킵' },
    ],
    expense: [
      { by24: '111', by24Name: '원장급여', sunote: '2111', sunoteNote: '' },
      { by24: '112', by24Name: '원장수당', sunote: '2112', sunoteNote: '' },
      { by24: '121', by24Name: '보육교직원급여', sunote: '2121', sunoteNote: '' },
      { by24: '122', by24Name: '보육교직원수당', sunote: '2122', sunoteNote: '' },
      { by24: '131', by24Name: '기타인건비', sunote: '2131', sunoteNote: '' },
      { by24: '141', by24Name: '법정부담금', sunote: '2141', sunoteNote: '' },
      { by24: '142', by24Name: '퇴직금및퇴직적립금', sunote: '2142', sunoteNote: '4자리 기본', group: true },
      { by24: '  142', by24Name: '  퇴직금', sunote: '2142-112', sunoteNote: '퇴직금 키워드', sub: true },
      { by24: '  142', by24Name: '  퇴직적립금', sunote: '2142-121', sunoteNote: '기본값', sub: true },
      { by24: '211', by24Name: '수용비 및 수수료', sunote: '2211', sunoteNote: '실측 확인' },
      { by24: '212', by24Name: '공공요금 및 제세공과금', sunote: '2212', sunoteNote: '실측 확인' },
      { by24: '213', by24Name: '연료비', sunote: '2213', sunoteNote: '' },
      { by24: '214', by24Name: '여비', sunote: '2214', sunoteNote: '' },
      { by24: '215', by24Name: '차량비', sunote: '2215', sunoteNote: '' },
      { by24: '216', by24Name: '복리후생비', sunote: '2216', sunoteNote: '' },
      { by24: '217', by24Name: '기타운영비', sunote: '2217', sunoteNote: '4자리 기본', group: true },
      { by24: '  217', by24Name: '  임대료', sunote: '2217-111', sunoteNote: '임대/임차 키워드, 기본값', sub: true },
      { by24: '  217', by24Name: '  건물융자이자', sunote: '2217-121', sunoteNote: '융자/이자 키워드', sub: true },
      { by24: '221', by24Name: '업무추진비', sunote: '2221', sunoteNote: '' },
      { by24: '311', by24Name: '교직원연수·연구비', sunote: '2311', sunoteNote: '' },
      { by24: '312', by24Name: '교재·교구구입비', sunote: '2312', sunoteNote: '' },
      { by24: '313', by24Name: '행사비', sunote: '2313', sunoteNote: '' },
      { by24: '314', by24Name: '영유아복리비', sunote: '2314', sunoteNote: '' },
      { by24: '315', by24Name: '급식·간식 재료비', sunote: '2315', sunoteNote: '실측 확인' },
      { by24: '411', by24Name: '특별활동비지출', sunote: '2411', sunoteNote: '' },
      { by24: '421', by24Name: '기타필요경비지출', sunote: '2421', sunoteNote: '4자리 기본', group: true },
      { by24: '  421', by24Name: '  입학준비금', sunote: '2421-111', sunoteNote: '입학 키워드', sub: true },
      { by24: '  421', by24Name: '  현장학습비', sunote: '2421-121', sunoteNote: '현장학습 키워드', sub: true },
      { by24: '  421', by24Name: '  차량운행비', sunote: '2421-131', sunoteNote: '차량 키워드', sub: true },
      { by24: '  421', by24Name: '  부모부담행사비', sunote: '2421-141', sunoteNote: '행사 키워드', sub: true },
      { by24: '  421', by24Name: '  조석식비', sunote: '2421-151', sunoteNote: '조석/급식 키워드', sub: true },
      { by24: '  421', by24Name: '  특성화비', sunote: '2421-161', sunoteNote: '특성화 키워드, 기본값', sub: true },
      { by24: '711', by24Name: '시설비', sunote: '2711', sunoteNote: '' },
      { by24: '712', by24Name: '시설장비유지비', sunote: '2712', sunoteNote: '' },
      { by24: '721', by24Name: '자산취득비', sunote: '2721', sunoteNote: '4자리 기본', group: true },
      { by24: '  721', by24Name: '  차량할부금', sunote: '2721-001', sunoteNote: '차량/할부 키워드', sub: true },
      { by24: '  721', by24Name: '  자산취득비', sunote: '2721-002', sunoteNote: '기본값', sub: true },
      { by24: '811', by24Name: '과년도지출', sunote: '2811', sunoteNote: '' },
      { by24: '911', by24Name: '잡지출', sunote: '2911', sunoteNote: '' },
    ],
    pattern: '경상북도(gbccm) SCRN_MKNM(3자리) → sunote 코드 (수입=앞에1·지출=앞에2, 와이즈안과 동일 체계). "실측 확인" 표시된 3개(111/211/212/315)만 실 데이터로 검증됨, 나머지는 같은 체계 유추 — 이관 전 계정과목별 매핑 확인 필요. 세목 5계정(기타필요경비 수입/지출·퇴직적립금·기타운영비·자산취득비)은 적요 키워드로 세분화.',
  },
  gyeonggi: {
    income: [
      { by24: '', by24Name: '정부지원보육료', sunote: '1111', sunoteNote: '' },
      { by24: '', by24Name: '부모부담보육료', sunote: '1112', sunoteNote: '' },
      { by24: '', by24Name: '특별활동비', sunote: '1211', sunoteNote: '' },
      { by24: '', by24Name: '기타필요경비', sunote: '1221', sunoteNote: '', group: true },
      { by24: '', by24Name: '  입학준비금', sunote: '1221-111', sunoteNote: '계정과목 [세목]명 기반', sub: true },
      { by24: '', by24Name: '  현장학습비', sunote: '1221-112', sunoteNote: '계정과목 [세목]명 기반', sub: true },
      { by24: '', by24Name: '  차량운행비', sunote: '1221-113', sunoteNote: '계정과목 [세목]명 기반', sub: true },
      { by24: '', by24Name: '  부모부담행사비', sunote: '1221-121', sunoteNote: '계정과목 [세목]명 기반', sub: true },
      { by24: '', by24Name: '  조석식비', sunote: '1221-131', sunoteNote: '계정과목 [세목]명 기반', sub: true },
      { by24: '', by24Name: '  특성화비', sunote: '1221-141', sunoteNote: '계정과목 [세목]명 기반', sub: true },
      { by24: '', by24Name: '인건비보조금', sunote: '1311', sunoteNote: '' },
      { by24: '', by24Name: '기관보육료', sunote: '1321', sunoteNote: '' },
      { by24: '', by24Name: '연장보육료', sunote: '1322', sunoteNote: '' },
      { by24: '', by24Name: '공공형운영비', sunote: '1323', sunoteNote: '' },
      { by24: '', by24Name: '그밖의지원금', sunote: '1324', sunoteNote: '' },
      { by24: '', by24Name: '전입금', sunote: '1411', sunoteNote: '' },
      { by24: '', by24Name: '단기차입금', sunote: '1421', sunoteNote: '' },
      { by24: '', by24Name: '장기차입금', sunote: '1422', sunoteNote: '' },
      { by24: '', by24Name: '이자수입', sunote: '1811', sunoteNote: '' },
      { by24: '', by24Name: '그밖의잡수입', sunote: '1812', sunoteNote: '' },
      { by24: '', by24Name: '잡수입', sunote: '1812', sunoteNote: '' },
      { by24: '', by24Name: '전년도이월금', sunote: '1911', sunoteNote: '이관 시 스킵' },
    ],
    expense: [
      { by24: '', by24Name: '원장급여', sunote: '2111', sunoteNote: '' },
      { by24: '', by24Name: '원장수당', sunote: '2112', sunoteNote: '' },
      { by24: '', by24Name: '보육교직원급여', sunote: '2121', sunoteNote: '' },
      { by24: '', by24Name: '보육교직원수당', sunote: '2122', sunoteNote: '' },
      { by24: '', by24Name: '기타인건비', sunote: '2131', sunoteNote: '' },
      { by24: '', by24Name: '법정부담금', sunote: '2141', sunoteNote: '' },
      { by24: '', by24Name: '퇴직금및퇴직적립금', sunote: '2142', sunoteNote: '', group: true },
      { by24: '', by24Name: '  퇴직금', sunote: '2142-112', sunoteNote: '적요 키워드 자동', sub: true },
      { by24: '', by24Name: '  퇴직적립금', sunote: '2142-121', sunoteNote: '적요 키워드 자동', sub: true },
      { by24: '', by24Name: '수용비및수수료', sunote: '2211', sunoteNote: '' },
      { by24: '', by24Name: '공공요금및제세공과금', sunote: '2212', sunoteNote: '' },
      { by24: '', by24Name: '연료비', sunote: '2213', sunoteNote: '' },
      { by24: '', by24Name: '여비', sunote: '2214', sunoteNote: '' },
      { by24: '', by24Name: '차량비', sunote: '2215', sunoteNote: '' },
      { by24: '', by24Name: '복리후생비', sunote: '2216', sunoteNote: '' },
      { by24: '', by24Name: '기타운영비', sunote: '2217', sunoteNote: '' },
      { by24: '', by24Name: '업무추진비', sunote: '2221', sunoteNote: '' },
      { by24: '223', by24Name: '회의비', sunote: '2223', sunoteNote: 'accgg 코드 223' },
      { by24: '', by24Name: '교직원연수·연구비', sunote: '2311', sunoteNote: '' },
      { by24: '', by24Name: '교재.교구구입비', sunote: '2312', sunoteNote: '' },
      { by24: '', by24Name: '행사비', sunote: '2313', sunoteNote: '' },
      { by24: '', by24Name: '영유아복리비', sunote: '2314', sunoteNote: '' },
      { by24: '', by24Name: '급식.간식재료비', sunote: '2315', sunoteNote: '' },
      { by24: '', by24Name: '특별활동비지출', sunote: '2411', sunoteNote: '' },
      { by24: '', by24Name: '기타필요경비지출', sunote: '2421', sunoteNote: '', group: true },
      { by24: '', by24Name: '  입학준비금', sunote: '2421-111', sunoteNote: '계정과목 [세목]명 기반', sub: true },
      { by24: '', by24Name: '  현장학습비', sunote: '2421-121', sunoteNote: '계정과목 [세목]명 기반', sub: true },
      { by24: '', by24Name: '  차량운행비', sunote: '2421-131', sunoteNote: '계정과목 [세목]명 기반', sub: true },
      { by24: '', by24Name: '  부모부담행사비', sunote: '2421-141', sunoteNote: '계정과목 [세목]명 기반', sub: true },
      { by24: '', by24Name: '  조석식비', sunote: '2421-151', sunoteNote: '계정과목 [세목]명 기반', sub: true },
      { by24: '', by24Name: '  특성화비', sunote: '2421-161', sunoteNote: '계정과목 [세목]명 기반', sub: true },
      { by24: '', by24Name: '단기차입금상환', sunote: '2611', sunoteNote: '' },
      { by24: '', by24Name: '장기차입금상환', sunote: '2612', sunoteNote: '' },
      { by24: '', by24Name: '시설비', sunote: '2711', sunoteNote: '' },
      { by24: '', by24Name: '시설장비유지비', sunote: '2712', sunoteNote: '' },
      { by24: '', by24Name: '자산취득비', sunote: '2721', sunoteNote: '' },
      { by24: '', by24Name: '과년도지출', sunote: '2811', sunoteNote: '' },
      { by24: '', by24Name: '잡지출', sunote: '2911', sunoteNote: '' },
    ],
    pattern: '경기도(accgg) 계정과목명(목 [세목]) → sunote 코드. [전표 목록 출력] 엑셀 업로드. 계정과목에서 [세목] 추출·수입/지출은 계정명으로 자동 판정.',
  },
} as const

/**
 * 충남(농협, cnccm)은 경북(gbccm)과 **같은 NH 솔루션**이라 계정체계·응답필드가 동일하다
 * (2026-07-21 실측: 엔드포인트·에러코드·세션쿠키까지 일치). 그래서 매핑표를 복제하지 않고
 * gbccm 것을 그대로 참조한다 — 복제하면 나중에 한쪽만 고쳐져 두 지역 매핑이 어긋난다.
 * ⚠ 충남 실데이터로 계정코드를 검증한 적은 아직 없다. 첫 이관 때 매핑표와 실제 값을 대조할 것.
 */
const MAPPING_TABLE = { ...MAPPING_TABLE_BASE, cnccm: MAPPING_TABLE_BASE.gbccm } as const

// 세목 코드(XXXX-YYY 형식) → 수전자장부 확정 5자리 코드(목4자리+세목순번1자리)
// (src/lib/accounts.ts subAccountCodeMap 과 동일 기준, 2026-07-07 확정 규칙)
const SUBCODE_TO_5DIGIT: Record<string, string> = {
  '1221-111': '12211', '1221-112': '12212', '1221-113': '12213',
  '1221-121': '12214', '1221-131': '12215', '1221-141': '12216',
  '2142-112': '21423', '2142-121': '21424',
  '2217-111': '22171', '2217-121': '22172',
  '2421-111': '24211', '2421-121': '24212', '2421-131': '24213',
  '2421-141': '24214', '2421-151': '24215', '2421-161': '24216',
  '2721-001': '27211', '2721-002': '27212',
}

function fmtAmt(n: number): string {
  if (!n) return ''
  return n.toLocaleString()
}

/**
 * 경기도(accgg) 브라우저 스크래퍼 (북마클릿/콘솔용).
 * accgg 로그인 브라우저에서 실행 → 전표 API 응답(가장 큰 객체배열)을 가로채 통합e 서버로 POST.
 * '__KEY__' 는 런타임에 collectKey(인증서명)로 치환. 패널 메시지는 href ASCII 안전을 위해 영문.
 */
const GG_SCRAPER =
  "javascript:(function(){var K='__KEY__',EP='https://www.cert24.kr/api/gyeonggi/browser-collect';" +
  "function pnl(h){var p=document.getElementById('gg-p');if(!p){p=document.createElement('div');p.id='gg-p';" +
  "p.style.cssText='position:fixed;top:12px;right:12px;z-index:2147483647;background:#0f172a;color:#fff;font:13px sans-serif;padding:12px 14px;border-radius:10px;box-shadow:0 6px 24px rgba(0,0,0,.4);width:290px';document.body.appendChild(p);}p.innerHTML=h;}" +
  "function big(j){var b=null;(function v(x){if(x&&typeof x==='object'){if(Array.isArray(x)){if(x.length&&x[0]&&typeof x[0]==='object'&&!Array.isArray(x[0])&&(!b||x.length>b.length))b=x;for(var i=0;i<x.length;i++)v(x[i]);}else{for(var k in x){try{v(x[k]);}catch(e){}}}}})(j);return b;}" +
  "function post(a){pnl('sending '+a.length+' rows...');fetch(EP,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({collectKey:K,ccctNm:document.title||'',rows:a})}).then(function(r){return r.json();}).then(function(d){pnl(d.success?('<b>OK</b> - '+d.count+' rows sent to server. go back to data-migration.'):('FAIL: '+(d.error||'')));}).catch(function(e){pnl('ERROR: '+e);});}" +
  "function scan(t){if(!t)return;var j;try{j=JSON.parse(t);}catch(e){return;}var a=big(j);if(a&&a.length&&Object.keys(a[0]).length>=4)post(a);}" +
  "var XS=XMLHttpRequest.prototype.send;XMLHttpRequest.prototype.send=function(){var s=this;s.addEventListener('load',function(){try{var t=s.responseText;if(!t&&s.response)t=JSON.stringify(s.response);scan(t);}catch(e){}});return XS.apply(this,arguments);};" +
  "var OF=window.fetch;window.fetch=function(){var a=arguments;return OF.apply(this,a).then(function(r){try{r.clone().text().then(scan);}catch(e){}return r;});};" +
  "pnl('READY - now click the Search button on accgg (jo-hoe)');})();"

/** certName 등 비ASCII를 \\uXXXX 로 이스케이프해 javascript: URL 을 ASCII 안전하게 유지 */
function ggScraperCode(collectKey: string): string {
  const esc = Array.from(collectKey || '')
    .map(c => { const h = c.charCodeAt(0); return h < 128 ? c : '\\u' + h.toString(16).padStart(4, '0') })
    .join('')
    .replace(/'/g, '')
  return GG_SCRAPER.replace('__KEY__', esc)
}

/**
 * 경기도(accgg) [전표 목록 출력] 엑셀(aoa) → CashLedgerResult[].
 * 헤더 2줄(일자/증빙번호/계정과목/금액/적요/비고/거래처…) + 하단 세입합계/세출합계/합계.
 * 계정과목 "기타 필요경비 지출 [부모부담행사비]" → 목명(기타필요경비지출)·세목([부모부담행사비]) 분리.
 * 수입/지출은 계정명이 MAPPING_TABLE.gyeonggi.income/expense 중 어디에 있는지로 판정.
 */
function parseAccggRows(aoa: unknown[][]): CashLedgerResult[] {
  const norm = (s: string) => s.replace(/[.\s·[\]]/g, '').trim()
  type MapItem = { by24Name: string; sunote: string; sub?: boolean }
  const inc = MAPPING_TABLE.gyeonggi.income as ReadonlyArray<MapItem>
  const exp = MAPPING_TABLE.gyeonggi.expense as ReadonlyArray<MapItem>

  const subMap: Record<string, Record<string, string>> = {
    '1221': { '입학': '1221-111', '현장학습': '1221-112', '차량': '1221-113', '행사': '1221-121', '조석': '1221-131', '특성화': '1221-141' },
    '2421': { '입학': '2421-111', '현장학습': '2421-121', '차량': '2421-131', '행사': '2421-141', '조석': '2421-151', '특성화': '2421-161' },
    '2142': { '퇴직적립': '2142-121', '퇴직연금': '2142-121', '퇴직금': '2142-112' },
  }

  const classify = (acctRaw: string, subName: string): { dir: 'income' | 'expense'; code: string } => {
    const base = norm(acctRaw.replace(/\[[^\]]*\]/g, ''))
    let dir: 'income' | 'expense' = 'expense'
    let item = inc.find(m => !(m as { sub?: boolean }).sub && norm(m.by24Name) === base)
    if (item) dir = 'income'
    else {
      item = exp.find(m => !(m as { sub?: boolean }).sub && norm(m.by24Name) === base)
      if (item) dir = 'expense'
    }
    if (!item) {
      const isInc = /(수입|보육료|보조금|지원금|전입금|이월금|이자|후원)/.test(acctRaw) && !/(지출|상환|적립|부담금)/.test(acctRaw)
      return { dir: isInc ? 'income' : 'expense', code: '' }
    }
    let code: string = item.sunote
    const sm = subMap[code]
    if (sm && subName) {
      for (const [kw, sub] of Object.entries(sm)) { if (subName.includes(kw)) { code = sub; break } }
    }
    code = SUBCODE_TO_5DIGIT[code] || code
    return { dir, code }
  }

  // 헤더 행 탐색 (일자 & 계정과목 & 금액)
  let hIdx = -1
  for (let i = 0; i < Math.min(aoa.length, 6); i++) {
    const j = (aoa[i] || []).map(c => String(c ?? ''))
    if (j.some(x => x.includes('일자')) && j.some(x => x.includes('계정과목')) && j.some(x => x.includes('금액'))) { hIdx = i; break }
  }
  const hdr = (hIdx >= 0 ? aoa[hIdx] : []).map(c => String(c ?? '').trim())
  const colOf = (kw: string, dflt: number) => { const i = hdr.findIndex(h => h.includes(kw)); return i >= 0 ? i : dflt }
  const cDate = colOf('일자', 0), cDoc = colOf('증빙', 1), cAcct = colOf('계정과목', 2)
  const cAmt = colOf('금액', 3), cMemo = colOf('적요', 4), cPartner = colOf('거래처', 6)

  // 데이터 시작: 헤더 다음, 병합 2줄 헤더면 한 줄 더 스킵
  let start = hIdx >= 0 ? hIdx + 1 : 0
  if (hIdx >= 0 && aoa[start] && String((aoa[start] as unknown[])[cDate] ?? '').includes('일자')) start += 1

  const byMonth = new Map<string, CashLedgerRow[]>()
  for (let i = start; i < aoa.length; i++) {
    const row = (aoa[i] || []) as unknown[]
    const dateRaw = String(row[cDate] ?? '').trim()
    if (!dateRaw || /합계/.test(dateRaw)) continue
    const m = dateRaw.match(/(\d{4})-(\d{2})-(\d{2})/)
    if (!m) continue
    const acctRaw = String(row[cAcct] ?? '').trim()
    if (!acctRaw) continue
    const ym = `${m[1]}-${m[2]}`
    const amount = Math.round(Number(String(row[cAmt] ?? '0').replace(/[^0-9.-]/g, '')) || 0)
    let summary = String(row[cMemo] ?? '').trim()
    const br = acctRaw.match(/\[([^\]]+)\]/)
    const subName = br ? br[1].trim() : ''
    const acctName = acctRaw.replace(/\[[^\]]*\]/g, '').replace(/\s+/g, ' ').trim()
    const partner = String(row[cPartner] ?? '').trim()
    if (partner) summary = `${summary}${summary ? ' ' : ''}(${partner})`
    const { dir, code } = classify(acctRaw, subName)
    const r: CashLedgerRow = {
      idx: 0, date: `${m[1]}-${m[2]}-${m[3]}`, docNo: String(row[cDoc] ?? '').trim(),
      accountCode: code, accountName: acctName, subAccountName: subName, summary,
      income: dir === 'income' ? amount : 0, expense: dir === 'expense' ? amount : 0,
      balance: 0, agreeDate: `${m[1]}-${m[2]}-${m[3]}`,
    }
    if (!byMonth.has(ym)) byMonth.set(ym, [])
    byMonth.get(ym)!.push(r)
  }

  const results: CashLedgerResult[] = []
  for (const ym of Array.from(byMonth.keys()).sort()) {
    const rows = byMonth.get(ym)!.sort((a, b) => a.date.localeCompare(b.date))
    rows.forEach((r, i) => { r.idx = i + 1 })
    results.push({
      yearMonth: ym, rows,
      summary: { prevIncome: 0, prevExpense: 0, monthStart: 0, monthIncome: rows.reduce((s, r) => s + r.income, 0), monthExpense: rows.reduce((s, r) => s + r.expense, 0) },
    })
  }
  return results
}

// 경기도(accgg) 에이전트 수집분: raw 전표(chit JSON) → CashLedgerResult[]
// 필드: chitDe(날짜) / accgIppSecd(I수입·O지출) / chitAmt(금액) / mokAccgNm·semokAccgNm(목·세목) / chitMemo(적요)
function parseAccggChits(rawRows: unknown[]): CashLedgerResult[] {
  const norm = (s: string) => s.replace(/[.\s·[\]]/g, '').trim()
  type MapItem = { by24Name: string; sunote: string; sub?: boolean }
  const inc = MAPPING_TABLE.gyeonggi.income as ReadonlyArray<MapItem>
  const exp = MAPPING_TABLE.gyeonggi.expense as ReadonlyArray<MapItem>
  const subMap: Record<string, Record<string, string>> = {
    '1221': { '입학': '1221-111', '현장학습': '1221-112', '차량': '1221-113', '행사': '1221-121', '조석': '1221-131', '특성화': '1221-141' },
    '2421': { '입학': '2421-111', '현장학습': '2421-121', '차량': '2421-131', '행사': '2421-141', '조석': '2421-151', '특성화': '2421-161' },
    '2142': { '퇴직적립': '2142-121', '퇴직연금': '2142-121', '퇴직금': '2142-112' },
  }
  const codeFor = (dir: 'income' | 'expense', mok: string, semok: string): string => {
    const base = norm(mok)
    const pool = dir === 'income' ? inc : exp
    const item = pool.find(m => !m.sub && norm(m.by24Name) === base)
    if (!item) return ''
    let code: string = item.sunote
    const sm = subMap[code]
    if (sm && semok) { for (const [kw, sub] of Object.entries(sm)) { if (semok.includes(kw)) { code = sub; break } } }
    return SUBCODE_TO_5DIGIT[code] || code
  }
  // accgg 자체 계정코드(scrnNdctAccgVal: "223"/"911"/"421-111") → sunote 코드
  //   와이즈안 룰과 동일: 수입=1/지출=2 접두. 세목(3-3)은 SUBCODE_TO_5DIGIT 로 5자리.
  //   이름 매핑에 없는 계정(회의비 등)도 코드로 자동 매핑됨. 실패 시 이름 매핑 폴백.
  const codeFromScrn = (isInc: boolean, scrnRaw: unknown): string => {
    let s = String(scrnRaw ?? '').trim()
    if (/^\d{6}$/.test(s)) s = `${s.slice(0, 3)}-${s.slice(3)}`  // 421111 → 421-111
    const pre = isInc ? '1' : '2'
    if (/^\d{3}$/.test(s)) return pre + s                          // 223 → 2223
    if (/^\d{3}-\d{3}$/.test(s)) {
      const full = pre + s                                          // 421-111 → 2421-111
      return SUBCODE_TO_5DIGIT[full] || full
    }
    return ''
  }
  const byMonth = new Map<string, CashLedgerRow[]>()
  // 월별 잔액 meta (에이전트가 /api/blce 로 수집한 총계좌잔액/회계잔액)
  const blceByYm = new Map<string, { bank: number; acct: number }>()
  for (const raw of rawRows) {
    const r = raw as Record<string, unknown>
    if (r._meta === 'blce') {
      const ymM = String(r._ym || '')
      if (ymM) blceByYm.set(ymM, { bank: Number(r.allCcnBlce ?? 0) || 0, acct: Number(r.actgBlce ?? 0) || 0 })
      continue
    }
    const de = String(r.chitDe ?? '').replace(/[^0-9]/g, '')
    if (de.length < 8) continue
    const y = de.slice(0, 4), mo = de.slice(4, 6), d = de.slice(6, 8)
    const ym = `${y}-${mo}`
    const isInc = String(r.accgIppSecd ?? '') === 'I'
    const amount = Math.round(Number(String(r.chitAmt ?? '0').replace(/[^0-9.-]/g, '')) || 0)
    const mok = String(r.mokAccgNm ?? r.hangAccgNm ?? '').trim()
    const semok = String(r.semokAccgNm ?? '').trim()
    const row: CashLedgerRow = {
      idx: 0, date: `${y}-${mo}-${d}`, docNo: String(r.prufNo ?? '').trim(),
      accountCode: codeFromScrn(isInc, r.scrnNdctAccgVal) || codeFor(isInc ? 'income' : 'expense', mok, semok),
      accountName: mok, subAccountName: semok, summary: String(r.chitMemo ?? '').trim(),
      income: isInc ? amount : 0, expense: isInc ? 0 : amount, balance: 0, agreeDate: `${y}-${mo}-${d}`,
      _receiptImages: Array.isArray(r._receiptImages) ? (r._receiptImages as string[]) : undefined,
      _cardInfo: Array.isArray(r._cardMappings) ? (r._cardMappings as GgCardInfo[]) : undefined,
      _payMethod: r.stlmMtcd ? String(r.stlmMtcd) : undefined,
    }
    if (!byMonth.has(ym)) byMonth.set(ym, [])
    byMonth.get(ym)!.push(row)
  }
  const results: CashLedgerResult[] = []
  for (const ym of Array.from(byMonth.keys()).sort()) {
    const rows = byMonth.get(ym)!.sort((a, b) => a.date.localeCompare(b.date))
    rows.forEach((r, i) => { r.idx = i + 1 })
    const blce = blceByYm.get(ym)
    results.push({
      yearMonth: ym, rows,
      summary: {
        prevIncome: 0, prevExpense: 0, monthStart: 0,
        monthIncome: rows.reduce((s, r) => s + r.income, 0), monthExpense: rows.reduce((s, r) => s + r.expense, 0),
        bankBalance: blce?.bank, acctBalance: blce?.acct,
      },
    })
  }
  return results
}

// 미리보기 셀 — accgg 영수증 이미지 썸네일 (카드매핑은 별도 컬럼)
function GgRowExtra({ row, onOpen }: { row: CashLedgerRow; onOpen: (urls: string[], i: number) => void }) {
  const imgs = row._receiptImages || []
  if (!imgs.length) return null
  return (
    <div className="flex flex-wrap items-center gap-1 mt-1">
      {imgs.map((u, i) => (
        <img key={i} src={u} alt="영수증" onClick={() => onOpen(imgs, i)}
          className="w-8 h-8 object-cover rounded border border-slate-200 cursor-pointer hover:ring-2 hover:ring-indigo-400"
          loading="lazy" />
      ))}
      {imgs.length > 0 && <span className="text-[9px] text-slate-400">🧾{imgs.length}</span>}
      {/* 카드매핑 표시는 별도 '카드매핑' 컬럼(빨간 C)으로 이동 */}
    </div>
  )
}

export default function DataMigrationPage() {
  // 출발지
  const [source, setSource] = useState<SourceType>('by24')
  // 영수증 갤러리 모달
  const [gallery, setGallery] = useState<{ urls: string[]; idx: number } | null>(null)
  // 걸음마회계 출발지는 아이사랑꿈터 유형만 노출 (어린이집은 기존 목록 그대로)
  const [isIlovechild, setIsIlovechild] = useState(false)
  const [centerName, setCenterName] = useState('')  // 로그인 시설명 (경기도 캐시/수집 키)
  // ★ 지역형(설정>지역시스템)으로 출발지를 정했으면 아래 자동선택이 덮어쓰지 않게 하는 플래그
  const regionPickedRef = useRef(false)
  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json())
      .then(d => {
        const ilove = ((d?.institutionType || d?.profile?.institutionType || 'childcare') as string) === 'ilovechild'
        setIsIlovechild(ilove)
        setCenterName(String(d?.centerName || d?.profile?.centerName || '').trim())
        if (ilove) { regionPickedRef.current = true; setSource('walk'); return } // 아이사랑꿈터는 걸음마만 사용
        /**
         * ★ 지역형으로 등록한 시설이면 그 지역 시스템을 출발지 기본값으로 (2026-07-20).
         *
         * 옛 코드는 regionSystem 을 아예 안 봐서, [설정]에서 '인천형'으로 등록해둔 시설도
         * 데이터이관을 열면 보육나라(by24, 기본값)가 떴다. 인천형 시설이 보육나라에서
         * 가져올 일은 없으므로 매번 드롭다운을 손으로 바꿔야 했다.
         * REGION_SYSTEMS 와 SOURCE_OPTIONS 는 같은 코드('incheon'/'gbccm'/'gyeonggi'…)를 쓴다.
         */
        const rs = String(d?.profile?.regionSystem || '').trim()
        if (rs && SOURCE_OPTIONS.some(o => o.value === rs)) {
          regionPickedRef.current = true
          setSource(rs as SourceType)
        }
      })
      .catch(() => {})
  }, [])
  const autoSelectedRef = useRef(false)
  // 화면 열 때: (1) 마지막 선택 출발지(localStorage) 우선 복원 → (2) 없으면 저장된 인증정보 있는 출발지 자동선택
  useEffect(() => {
    if (autoSelectedRef.current) return
    autoSelectedRef.current = true
    let restored = false
    try {
      const last = localStorage.getItem('data-migration:source')
      if (last && SOURCE_OPTIONS.some(o => o.value === last)) { setSource(last as SourceType); restored = true }
    } catch {}
    if (restored) return
    fetch('/api/migration-auth?list=1')
      .then(res => res.json())
      .then(json => {
        const saved: string[] = json.sources || []
        // 저장된 인증정보가 있는 출발지 중 by24(보육나라 기본) 이 아닌 것을 우선 선택
        const pick = saved.find(s => s !== 'by24' && SOURCE_OPTIONS.some(o => o.value === s))
          || saved.find(s => SOURCE_OPTIONS.some(o => o.value === s))
        // ⚠ 지역형(인천형 등)으로 이미 정해졌으면 덮어쓰지 않는다 — 두 fetch 의 완료 순서와 무관하게 지역형 우선
        if (pick && !regionPickedRef.current) setSource(pick as SourceType)
      })
      .catch(() => {})
  }, [])

  // 선택한 출발지 기억 (다음에 열 때 복원) — 첫 렌더(초기값)는 저장 건너뜀
  const sourcePersistRef = useRef(false)
  useEffect(() => {
    if (!sourcePersistRef.current) { sourcePersistRef.current = true; return }
    try { localStorage.setItem('data-migration:source', source) } catch {}
  }, [source])
  const [sourceId, setSourceId] = useState('')
  const [sourcePw, setSourcePw] = useState('')
  // 조회월 — 마지막으로 조회했던 월을 기억해 다음에 열 때 기본값으로 복원 (출발지와 동일한 localStorage 패턴)
  const [yearMonth, setYearMonth] = useState(() => {
    try {
      const last = localStorage.getItem('data-migration:yearMonth')
      if (last && /^\d{6}$/.test(last)) return last
    } catch {}
    const d = new Date()
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const ymPersistRef = useRef(false)
  useEffect(() => {
    if (!ymPersistRef.current) { ymPersistRef.current = true; return }
    try { localStorage.setItem('data-migration:yearMonth', yearMonth) } catch {}
  }, [yearMonth])

  // sunote (목적지)
  const [sunoteId, setSunoteId] = useState('')
  const [sunotePw, setSunotePw] = useState('')

  // 상태
  const [loading, setLoading] = useState(false)
  const [transferring, setTransferring] = useState(false)
  const [transferringYm, setTransferringYm] = useState<string | null>(null) // 현재 이관 중인 월
  const [transferredYms, setTransferredYms] = useState<Record<string, string>>({}) // 월별 이관 결과
  const [gbccmSaving, setGbccmSaving] = useState(false)
  const [gbccmSaveMsg, setGbccmSaveMsg] = useState('')
  const [data, setData] = useState<CashLedgerResult | null>(null)
  const [multiData, setMultiData] = useState<CashLedgerResult[]>([])
  const [error, setError] = useState('')
  const [transferResult, setTransferResult] = useState('')
  const [unmappedCodes, setUnmappedCodes] = useState<{ code: string; name: string; summary: string; yearMonth?: string }[]>([])
  const [customMappings, setCustomMappings] = useState<Record<string, string>>({}) // by24 code → sunote code
  const [showMappings, setShowMappings] = useState(false)
  const [showMappingModal, setShowMappingModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteStartYm, setDeleteStartYm] = useState('')
  const [deleteEndYm, setDeleteEndYm] = useState('')
  const [deleting, setDeleting] = useState(false)
  // 삭제 모달 조회월 옵션 — 2021년 3월(장부나라 초기 데이터 기준)부터 현재월까지, 최신순
  const deleteMonthOptions = useMemo(() => {
    const now = new Date()
    const opts: string[] = []
    let y = now.getFullYear(), m = now.getMonth() + 1
    while (y > 2021 || (y === 2021 && m >= 3)) {
      opts.push(`${y}${String(m).padStart(2, '0')}`)
      m--; if (m < 1) { m = 12; y-- }
    }
    return opts
  }, [])
  const [deleteResult, setDeleteResult] = useState('')
  const [mode, setMode] = useState<'single' | 'range'>('single')
  const [startYm, setStartYm] = useState('')
  const [endYm, setEndYm] = useState('')

  // 로컬 에이전트 상태 — 화면 상단에 항상 노출 (10초 주기 갱신)
  const [agentAlive, setAgentAlive] = useState<boolean | null>(null)  // null=확인 전
  const [agentSecondsAgo, setAgentSecondsAgo] = useState<number | null>(null)
  useEffect(() => {
    let stop = false
    const check = () => {
      fetch('/api/agent-health', { cache: 'no-store' })
        .then(r => r.json())
        .then(j => {
          if (stop) return
          setAgentAlive(!!j.alive)
          setAgentSecondsAgo(typeof j.secondsAgo === 'number' ? j.secondsAgo : null)
        })
        .catch(() => { if (!stop) setAgentAlive(false) })
    }
    check()
    const id = setInterval(check, 10000)
    return () => { stop = true; clearInterval(id) }
  }, [])

  // 프로그램 인증 정보 (등록된 정보 자동 로드)
  // certEndDt = 인증서 만기일(YYYYMMDD) — 백엔드(/api/settings/program-auth)가 이미 주고 있었으나
  // 프론트 타입에 없어서 화면에 안 보였음. 등록일(savedAt)만 뜨니 "언제 만료되는지" 를 알 수 없었다(2026-07-17).
  const [programAuth, setProgramAuth] = useState<{ authType: string; hasUserId?: boolean; hasUserPw?: boolean; certName?: string; hasCertPw?: boolean; certEndDt?: string; savedAt?: string } | null>(null)
  const [authLoading, setAuthLoading] = useState(false)
  // 업체(로그인)별 저장 인증정보
  const [savedAuthAt, setSavedAuthAt] = useState('')       // 저장 시각 (있으면 "저장됨" 표시)
  const [authSaving, setAuthSaving] = useState(false)
  const [authSaveMsg, setAuthSaveMsg] = useState('')

  // 소스 변경 시 등록된 인증 정보 자동 로드
  const reloadProgramAuth = useCallback(async () => {
    setAuthLoading(true)
    try {
      const json = await fetch(`/api/settings/program-auth?programId=${source}`).then(r => r.json())
      setProgramAuth(json.success && json.data ? json.data : null)
    } catch { /* 무시 */ }
    finally { setAuthLoading(false) }
  }, [source])
  useEffect(() => { setProgramAuth(null); setError(''); reloadProgramAuth() }, [source, reloadProgramAuth])

  // 등록된 인증정보 삭제.
  // ⚠ [수정] 링크는 통합e 인증설정 페이지를 새 탭으로 열 뿐이라, 거기서 인증서를 지워도
  //   이 화면이 쓰는 program_auth 등록정보(인증서명·비번·만기)는 그대로 남는다 — 저장소가 다름.
  //   그래서 여기서 직접 지울 수단이 필요(2026-07-17 사용자 지적: "수정 들어가니 통합e 꺼만 삭제됨").
  //   통합e 의 인증서 보관(cert_signcert)은 건드리지 않는다 — 이 화면 등록정보만 지움.
  const [authDeleting, setAuthDeleting] = useState(false)
  const handleDeleteProgramAuth = useCallback(async () => {
    const label = SOURCE_OPTIONS.find(o => o.value === source)?.label || source
    if (!confirm(`${label} 등록 인증정보를 삭제합니다.\n\n· 이 화면의 등록정보(인증서명·비밀번호·만기)만 지웁니다\n· 통합e 의 인증서 보관함은 그대로 유지됩니다\n\n삭제 후 다시 등록하셔야 조회가 됩니다. 계속할까요?`)) return
    setAuthDeleting(true)
    try {
      const res = await fetch(`/api/settings/program-auth?programId=${encodeURIComponent(source)}`, { method: 'DELETE' })
      const json = await res.json().catch(() => ({}))
      if (res.ok && json.success) {
        setProgramAuth(null)
        setAuthSaveMsg('🗑 등록 인증정보를 삭제했습니다. 다시 등록해주세요.')
        await reloadProgramAuth()
      } else {
        setAuthSaveMsg(`삭제 실패: ${json.message || res.status}`)
      }
    } catch (e) {
      setAuthSaveMsg(`삭제 실패: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setAuthDeleting(false)
    }
  }, [source, reloadProgramAuth])

  // 경기도(accgg) 자동로그인 자격증명 캐시 등록 여부 (등록돼 있으면 CROSSCERT 없이 빠른 로그인)
  const [ggCache, setGgCache] = useState<{ exists: boolean; updatedAt?: string } | null>(null)
  const [ggCacheLoading, setGgCacheLoading] = useState(false)
  const reloadGgCache = useCallback(async () => {
    if (source !== 'gyeonggi') { setGgCache(null); return }
    setGgCacheLoading(true)
    try {
      // facilityKey 미전달 → 프록시가 세션 시설명(centerName)으로 자동 해석
      const q = centerName ? `?facilityKey=${encodeURIComponent(centerName)}` : ''
      const j = await fetch(`/api/gyeonggi/cert-creds${q}`).then(r => r.json())
      setGgCache(j.success ? { exists: !!j.exists, updatedAt: j.updatedAt } : { exists: false })
    } catch { setGgCache({ exists: false }) }
    finally { setGgCacheLoading(false) }
  }, [source, centerName])
  useEffect(() => { reloadGgCache() }, [reloadGgCache])

  // 인천시(aincheon) 로그인 세션쿠키 캐시 등록 여부 ("로그인세션등록" 버튼 상태 배지)
  const [incheonSession, setIncheonSession] = useState<{ exists: boolean; savedAt?: string } | null>(null)
  const [incheonSessionLoading, setIncheonSessionLoading] = useState(false)
  const reloadIncheonSession = useCallback(async () => {
    if (source !== 'incheon') { setIncheonSession(null); return }
    setIncheonSessionLoading(true)
    try {
      const j = await fetch('/api/incheon/session-status').then(r => r.json())
      setIncheonSession(j.success ? { exists: !!j.exists, savedAt: j.savedAt } : { exists: false })
    } catch { setIncheonSession({ exists: false }) }
    finally { setIncheonSessionLoading(false) }
  }, [source])
  useEffect(() => { reloadIncheonSession() }, [reloadIncheonSession])

  // [로그인세션등록] — 인증서로 UniSign 로그인 1회 실행(에이전트 경유) → 성공 시 세션쿠키 자동 캐시.
  // 등록 후에는 아래 [데이터 가져오기]가 캐시된 세션을 재사용해 인증서 선택 과정을 건너뜀.
  const [incheonRegistering, setIncheonRegistering] = useState(false)
  const [incheonRegisterMsg, setIncheonRegisterMsg] = useState('')
  const handleIncheonRegisterSession = useCallback(async () => {
    setIncheonRegistering(true); setIncheonRegisterMsg(''); setError('')
    try {
      const res = await fetch('/api/incheon/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ useSavedCert: true }),
      })
      const j = await res.json().catch(() => ({}))
      if (j.success) {
        setIncheonRegisterMsg('✅ 세션 확보 완료')
        await reloadIncheonSession()
      } else {
        setIncheonRegisterMsg(`❌ ${j.error || '로그인 실패'}`)
      }
    } catch (e) {
      setIncheonRegisterMsg(`❌ ${e instanceof Error ? e.message : '연결 실패'}`)
    } finally {
      setIncheonRegistering(false)
    }
  }, [reloadIncheonSession])

  // 인천시 바로가기 — 에이전트가 인천시에 로그인된 상태로 상단 탭(예산관리/월회계보고/결산관리)까지 이동
  // (gbccm 과 달리 window.open 불가 — 공동인증서(UniSign)라 반드시 에이전트 경유)
  const [incheonNavigating, setIncheonNavigating] = useState('')
  const [incheonNavMsg, setIncheonNavMsg] = useState('')
  const handleIncheonNavigate = useCallback(async (menuName: string) => {
    setIncheonNavigating(menuName); setIncheonNavMsg(`⏳ ${menuName} 이동 중… (에이전트가 인천시 화면을 엽니다, 최대 5분)`)
    try {
      const res = await fetch('/api/incheon/navigate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ menuName }),
      })
      const j = await res.json().catch(() => ({}))
      if (j.success) {
        setIncheonNavMsg(`✅ ${menuName} 화면을 열었습니다. (원장님 PC 브라우저 확인)`)
      } else if (j.agentOffline) {
        setIncheonNavMsg('❌ 로컬 에이전트가 꺼져 있습니다. 우상단 [에이전트 실행]으로 켠 뒤 다시 시도하세요.')
      } else {
        setIncheonNavMsg(`❌ ${j.error || '이동 실패'}`)
      }
    } catch (e) {
      setIncheonNavMsg(`❌ ${e instanceof Error ? e.message : '연결 실패'}`)
    } finally {
      setIncheonNavigating('')
    }
  }, [])

  /*
   * 세션쿠키(DCPU_SSID) 붙여넣기로 인증하는 출발지 — 경북(gbccm) / 충남농협(cnccm).
   * 둘은 같은 NH 솔루션이라 등록·조회 흐름이 동일하고, API 네임스페이스만 소스명으로 갈린다.
   *
   * 경북은 로컬 보안프로그램(npPfs) 때문에 자동 로그인이 안 돼서(2026-07-10 확인) 원장이 실제 브라우저로
   * 로그인 후 DCPU_SSID 를 1회 붙여넣는다. 충남은 로그인 화면에 보안프로그램 안내가 없었지만 실제
   * 로그인 자동화는 미검증이라, 일단 경북과 같은 수동 등록 방식으로 연다.
   *
   * ⚠ 상태 변수명은 gbccm* 을 그대로 두었다(호출처가 많아 일괄 개명 시 회귀 위험) — 실제로는
   *   "세션쿠키 방식 출발지 공용" 상태다.
   */
  const SESSION_COOKIE_SOURCES = ['gbccm', 'cnccm']
  const isSessionCookieSource = SESSION_COOKIE_SOURCES.includes(source)
  const [gbccmSession, setGbccmSession] = useState<{ exists: boolean; savedAt?: string } | null>(null)
  const [gbccmSessionLoading, setGbccmSessionLoading] = useState(false)
  const gbccmSessionRegistered = !!gbccmSession?.exists
  const reloadGbccmSession = useCallback(async () => {
    if (!SESSION_COOKIE_SOURCES.includes(source)) { setGbccmSession(null); return }
    setGbccmSessionLoading(true)
    try {
      const j = await fetch(`/api/${source}/register-session`).then(r => r.json())
      setGbccmSession({ exists: !!j.exists, savedAt: j.savedAt })
    } catch { setGbccmSession({ exists: false }) }
    finally { setGbccmSessionLoading(false) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source])
  useEffect(() => { reloadGbccmSession() }, [reloadGbccmSession])

  const [gbccmCookieInput, setGbccmCookieInput] = useState('')
  const [gbccmRegistering, setGbccmRegistering] = useState(false)
  const [gbccmRegisterMsg, setGbccmRegisterMsg] = useState('')
  const handleGbccmRegisterSession = useCallback(async () => {
    if (!gbccmCookieInput.trim()) { setGbccmRegisterMsg('❌ 쿠키값을 입력하세요'); return }
    setGbccmRegistering(true); setGbccmRegisterMsg(''); setError('')
    try {
      // 세션쿠키 방식 출발지(경북/충남농협) 공용 — 소스명이 곧 API 네임스페이스
      const res = await fetch(`/api/${source}/register-session`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionCookie: gbccmCookieInput.trim() }),
      })
      const j = await res.json().catch(() => ({}))
      if (j.success) {
        setGbccmRegisterMsg('✅ 세션 등록 완료')
        setGbccmCookieInput('')
        await reloadGbccmSession()
      } else {
        setGbccmRegisterMsg(`❌ ${j.error || '등록 실패'}`)
      }
    } catch (e) {
      setGbccmRegisterMsg(`❌ ${e instanceof Error ? e.message : '연결 실패'}`)
    } finally {
      setGbccmRegistering(false)
    }
  }, [gbccmCookieInput, reloadGbccmSession, source])

  // 자동로그인 — 저장된 세션(DCPU_SSID)으로 로컬 에이전트가 로그인된 화면을 새 브라우저창으로 띄움
  // (서버는 원장 브라우저 탭에 gbccm 쿠키를 못 심음 → 원장 PC 에이전트가 헤드풀 브라우저에 주입)
  const [gbccmOpening, setGbccmOpening] = useState('')
  const [gbccmOpenMsg, setGbccmOpenMsg] = useState('')
  const handleGbccmOpenBrowser = useCallback(async (targetUrl: string, label: string, tabLabel: string) => {
    setGbccmOpening(targetUrl); setGbccmOpenMsg(`⏳ ${label} 자동로그인 중… (에이전트가 브라우저를 엽니다)`)
    try {
      const res = await fetch('/api/gbccm/open-browser', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUrl, tabLabel }),
      })
      const j = await res.json().catch(() => ({}))
      if (j.ok) {
        // 탭 자동클릭 진단: 각 단계 라벨을 몇 개 찾고 클릭했는지 (안 가면 원인 파악용)
        const navMsg = Array.isArray(j.nav) && j.nav.length
          ? ' · 탭: ' + j.nav.map((n: { step: string; found: number; clicked: boolean }) => `${n.step}(${n.clicked ? '클릭' : n.found === 0 ? '못찾음' : '찾음'})`).join(' → ')
          : ''
        setGbccmOpenMsg(`✅ ${label} 로그인된 화면을 열었습니다. (원장님 PC 브라우저 확인)${navMsg}`)
      } else {
        setGbccmOpenMsg(`❌ ${j.error || '자동로그인 실패'}`)
      }
    } catch (e) {
      setGbccmOpenMsg(`❌ ${e instanceof Error ? e.message : '연결 실패'}`)
    } finally {
      setGbccmOpening('')
    }
  }, [])

  // [통합e 인증서 가져오기] — 통합e 등록 인증서를 이 출발지 인증으로 복사 (비번은 서버에서만)
  const [certImporting, setCertImporting] = useState(false)
  const [certImportMsg, setCertImportMsg] = useState('')
  const handleImportCert = useCallback(async () => {
    setCertImporting(true); setCertImportMsg('')
    try {
      const res = await fetch('/api/settings/program-auth', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ programId: source, copyFromCert: true }),
      })
      const j = await res.json()
      if (j.success) { setCertImportMsg(`✅ ${j.certName || '인증서'} 가져옴`); setError(''); await reloadProgramAuth() }
      else setCertImportMsg(`❌ ${j.message || '가져오기 실패'}`)
    } catch { setCertImportMsg('❌ 통합e 서버 연결 실패') }
    finally { setCertImporting(false) }
  }, [source, reloadProgramAuth])

  // 소스 변경 시 업체별 저장 인증정보 자동 입력
  useEffect(() => {
    setSavedAuthAt(''); setAuthSaveMsg('')
    fetch(`/api/migration-auth?source=${source}`)
      .then(res => res.json())
      .then(json => {
        if (json.saved) {
          if (json.userId) setSourceId(json.userId)
          if (json.password) setSourcePw(json.password)
          setSavedAuthAt(json.savedAt || '')
        }
      })
      .catch(() => {})
  }, [source])

  // 업체별 인증정보 저장 (출발지)
  const saveMigrationAuth = async () => {
    if (!sourceId || !sourcePw) { setAuthSaveMsg('아이디/비밀번호를 입력하세요.'); return }
    setAuthSaving(true); setAuthSaveMsg('')
    try {
      const res = await fetch('/api/migration-auth', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source, userId: sourceId, password: sourcePw }),
      })
      const json = await res.json()
      if (json.success) { setSavedAuthAt(new Date().toISOString()); setAuthSaveMsg('저장됨 ✓') }
      else setAuthSaveMsg(json.error || '저장 실패')
    } catch { setAuthSaveMsg('저장 실패') }
    finally { setAuthSaving(false) }
  }

  // 목적지(수전자장부) 저장 인증정보 — 업체별
  const [sunoteSavedAt, setSunoteSavedAt] = useState('')
  const [sunoteSaving, setSunoteSaving] = useState(false)
  const [sunoteSaveMsg, setSunoteSaveMsg] = useState('')

  // 목적지 저장 인증정보 자동 입력 (1회)
  useEffect(() => {
    fetch('/api/migration-auth?source=sunote-target')
      .then(res => res.json())
      .then(json => {
        if (json.saved) {
          if (json.userId) setSunoteId(json.userId)
          if (json.password) setSunotePw(json.password)
          setSunoteSavedAt(json.savedAt || '')
        }
      })
      .catch(() => {})
  }, [])

  const saveSunoteAuth = async () => {
    if (!sunoteId || !sunotePw) { setSunoteSaveMsg('아이디/비밀번호를 입력하세요.'); return }
    setSunoteSaving(true); setSunoteSaveMsg('')
    try {
      const res = await fetch('/api/migration-auth', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: 'sunote-target', userId: sunoteId, password: sunotePw }),
      })
      const json = await res.json()
      if (json.success) { setSunoteSavedAt(new Date().toISOString()); setSunoteSaveMsg('저장됨 ✓') }
      else setSunoteSaveMsg(json.error || '저장 실패')
    } catch { setSunoteSaveMsg('저장 실패') }
    finally { setSunoteSaving(false) }
  }

  // 계정코드 커스텀 매핑 — 업체+출발지별 저장/복원
  const [mapSaving, setMapSaving] = useState(false)
  const [mapSaveMsg, setMapSaveMsg] = useState('')
  const [mapSavedAt, setMapSavedAt] = useState('')

  // 출발지 변경 시 저장된 매핑 자동 로드
  useEffect(() => {
    setMapSaveMsg(''); setMapSavedAt('')
    fetch(`/api/migration-mapping?source=${source}`)
      .then(res => res.json())
      .then(json => {
        if (json.mappings && Object.keys(json.mappings).length > 0) {
          setCustomMappings(json.mappings)
          setMapSavedAt(json.savedAt || '')
        }
      })
      .catch(() => {})
  }, [source])

  const saveMappings = async () => {
    setMapSaving(true); setMapSaveMsg('')
    try {
      const res = await fetch('/api/migration-mapping', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source, mappings: customMappings }),
      })
      const json = await res.json()
      if (json.success) { setMapSavedAt(new Date().toISOString()); setMapSaveMsg('저장됨 ✓') }
      else setMapSaveMsg(json.error || '저장 실패')
    } catch { setMapSaveMsg('저장 실패') }
    finally { setMapSaving(false) }
  }

  // 월 옵션 생성
  const monthOptions = (() => {
    const opts: { value: string; label: string }[] = []
    const now = new Date()
    for (let i = 0; i < 120; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const val = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = `${d.getFullYear()}년 ${String(d.getMonth() + 1).padStart(2, '0')}월`
      opts.push({ value: val, label })
    }
    return opts
  })()

  const currentSource = SOURCE_OPTIONS.find((s) => s.value === source)!
  // 목적지 명칭: 아이사랑꿈터는 통합e 회계로 이관, 그 외는 수전자장부
  const destName = isIlovechild ? '통합e 회계' : '수전자장부'

  // 걸음마 예산 가져오기(아이사랑꿈터) — 3장부(보육정보센터+보조금+이용료) 토글, [가져오기]→미리보기→[저장]
  type GbBasis = Record<string, { total?: number }[]>
  const [gbYear, setGbYear] = useState('2026')
  const [gbSelBooks, setGbSelBooks] = useState<string[]>(['subsidy']) // ⚠ 단일 선택(한 장부씩). 예산·전표 모두 선택한 1개 장부만 조회
  const [gbPreviewByBook, setGbPreviewByBook] = useState<Record<string, GbBasis> | null>(null)
  const [gbSaving, setGbSaving] = useState(false)
  const [gbMsg, setGbMsg] = useState('')
  const [gbLoading, setGbLoading] = useState(false)
  const toggleGbBook = (code: string) => {
    setGbPreviewByBook(null); setGbMsg('')
    setGbSelBooks([code]) // 단일 선택(라디오): 항상 1개 장부만
  }
  // 걸음마 실시간 조회 — 선택 장부별로 로그인 후 예산 가져오기 (3장부 반복)
  const loadGwinBudget = async () => {
    if (!sourceId || !sourcePw) { setGbPreviewByBook(null); setGbMsg('걸음마 아이디/비밀번호를 먼저 입력(또는 저장)하세요.'); return }
    if (gbSelBooks.length === 0) { setGbMsg('가져올 장부를 하나 이상 선택하세요.'); return }
    setGbLoading(true); setGbPreviewByBook(null); setGbMsg('걸음마 로그인 후 예산을 가져오는 중…')
    const out: Record<string, GbBasis> = {}; const errs: string[] = []
    for (const book of gbSelBooks) {
      try {
        const res = await fetch('/api/gwin/budget', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
          body: JSON.stringify({ id: sourceId, password: sourcePw, book, year: gbYear }),
        })
        const j = await res.json().catch(() => ({}))
        if (j?.success && j.basisByMok) out[book] = j.basisByMok
        else errs.push(`${bookLabel(book)}: ${j?.error || '실패'}`)
      } catch (e) { errs.push(`${bookLabel(book)}: ${e instanceof Error ? e.message : '오류'}`) }
    }
    setGbLoading(false)
    if (Object.keys(out).length) {
      setGbPreviewByBook(out)
      setGbMsg(`✅ ${Object.keys(out).length}개 장부 조회 완료${errs.length ? ` (실패: ${errs.join(' / ')})` : ''}. [저장]을 눌러야 반영됩니다.`)
    } else { setGbPreviewByBook(null); setGbMsg(`❌ ${errs.join(' / ') || '조회 실패'}`) }
  }
  // 저장된 데이터(정적 스냅샷)로 미리보기 — 선택 장부
  const loadGwinBudgetStatic = () => {
    const out: Record<string, GbBasis> = {}
    for (const book of gbSelBooks) {
      const d = GWIN_BUDGETS[book] as GbBasis | undefined
      if (d && Object.keys(d).length) out[book] = d
    }
    if (Object.keys(out).length) { setGbPreviewByBook(out); setGbMsg('저장된 스냅샷 미리보기입니다. [저장]을 눌러야 반영됩니다.') }
    else { setGbPreviewByBook(null); setGbMsg('선택한 장부의 저장된 스냅샷이 없습니다.') }
  }
  // 걸음마 전표 가져오기 — 여기에 미리보기(원시행) 저장·표시 → 별도 [전표관리로 저장]
  const [gbVLoading, setGbVLoading] = useState(false)
  const [gbVFrom, setGbVFrom] = useState('03') // 회계연도 시작(3월)
  const [gbVTo, setGbVTo] = useState('02') // 회계연도 종료(익년 2월)
  const FISCAL_MONTHS = ['03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '01', '02']
  const [gbVRows, setGbVRows] = useState<Record<string, unknown>[] | null>(null)
  const [gbVKeys, setGbVKeys] = useState<string[]>([])
  const [gbVBook, setGbVBook] = useState('')
  const [gbVSaving, setGbVSaving] = useState(false)
  const [gbVSavedBook, setGbVSavedBook] = useState('') // 저장 완료된 장부(→ 전표관리로 이동 버튼용)
  const [gbVSavedYm, setGbVSavedYm] = useState('')     // 저장 데이터의 첫 달(YYYY-MM) — 전표입력을 그 달로 열기
  const [gbVSavedSig, setGbVSavedSig] = useState('')   // 마지막으로 저장한 데이터 시그니처(중복 저장 방지)
  const [gbVConfirmOpen, setGbVConfirmOpen] = useState(false) // 중복 저장 확인 팝업
  const [gbVPartialYm, setGbVPartialYm] = useState('') // 조회 중단된 달(YYYY-MM) — 있으면 다음 조회는 이어받기(merge)
  const [gbVWithReceipts, setGbVWithReceipts] = useState(true) // 영수증 사진까지 가져오기
  const loadGwinVouchers = async () => {
    if (!sourceId || !sourcePw) { setGbMsg('걸음마 아이디/비밀번호를 먼저 입력(또는 저장)하세요.'); return }
    const books = gbSelBooks.length ? gbSelBooks : ['subsidy']
    const cacheKey = books.join(',')
    const resuming = !!gbVPartialYm                 // 직전 조회가 중간에 끊겼으면 이어받기(merge)
    const prevRows = resuming ? (gbVRows || []) : []
    setGbVLoading(true); if (!resuming) setGbVRows(null)
    setGbMsg(`걸음마 전표 조회 중(${books.map(bookLabel).join('·')} · ${gbYear}.${gbVFrom}~${gbVTo}월)${resuming ? ' — 이어받기' : ''}${gbVWithReceipts ? ' + 영수증 사진(시간 걸림)' : ''}…`)
    // BILL_IDX 기준 중복 제거(이어받기 시 겹치는 달 안전)
    const dedupById = (arr: Record<string, unknown>[]) => { const m = new Map<string, Record<string, unknown>>(); for (const r of arr) m.set(String(r.BILL_IDX ?? JSON.stringify(r)), r); return [...m.values()].sort((a, b) => String(a.BILL_DATE ?? '').localeCompare(String(b.BILL_DATE ?? ''))) }
    try {
      const res = await fetch('/api/gwin/vouchers', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ id: sourceId, password: sourcePw, books, year: gbYear, monthFrom: gbVFrom, monthTo: gbVTo, withReceipts: gbVWithReceipts }),
      })
      const j = await res.json().catch(() => ({}))
      if (j?.success && Array.isArray(j.rows)) {
        const merged = resuming ? dedupById([...prevRows, ...j.rows]) : j.rows
        setGbVRows(merged); setGbVKeys(j.keys || gbVKeys); setGbVBook(cacheKey); setGbVSavedSig('') // 새 조회 → 저장가드 해제
        const rc = j.receiptBills ? ` · 🧾 영수증 ${j.receiptPhotos}장(${j.receiptBills}건)` : ''
        const pb = Array.isArray(j.perBook) ? ' · ' + j.perBook.map((p: { label: string; count: number }) => `${p.label} ${p.count}건`).join(' / ') : ''
        if (j.partial && j.failedYm) {
          const fm = String(j.failedYm).slice(5, 7)
          if (fm) setGbVFrom(fm)                    // 시작월을 실패한 달로 자동 세팅 → 다시 누르면 이어받기
          setGbVPartialYm(String(j.failedYm))
          setGbMsg(`⚠️ ${j.failedYm} 조회 중 끊김 — ${j.lastOkYm || '이전'}월까지 총 ${merged.length}건 확보. 시작월을 ${Number(fm)}월로 맞췄습니다. 다시 [🧾 전표 가져오기]를 누르면 ${Number(fm)}월부터 이어서 가져옵니다.`)
        } else {
          setGbVPartialYm('')
          setGbMsg(`✅ 전표 ${merged.length}건 조회${pb}${rc}. 아래 미리보기 확인 후 [전표관리로 저장].`)
        }
        // 조회 결과 저장(덮어쓰기) — 새로고침/재방문 시 복원용(누적본 저장)
        fetch('/api/gwin/vouchers/cache', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
          body: JSON.stringify({ book: cacheKey, year: gbYear, rows: merged, keys: j.keys || gbVKeys, from: gbVFrom, to: gbVTo, receiptPhotos: j.receiptPhotos || 0, receiptBills: j.receiptBills || 0 }),
        }).catch(() => {})
      } else {
        if (!resuming) setGbVRows(null)             // 이어받기 실패 시 기존 누적본 보존
        if (j?.failedYm) {                          // 첫 달부터 실패 → 그 달부터 재시도 안내
          const fm = String(j.failedYm).slice(5, 7); if (fm) setGbVFrom(fm)
          setGbVPartialYm(String(j.failedYm))
          setGbMsg(`⚠️ ${j.failedYm}월 조회 실패. 잠시 후 다시 [🧾 전표 가져오기]를 누르면 ${Number(fm)}월부터 다시 시도합니다.`)
        } else {
          const bill = j?.billStatus !== undefined ? ` | getBillList:${j.billStatus}` : ''
          setGbMsg(`❌ ${j?.error || '전표 조회 실패'}${bill}`)
        }
      }
    } catch (e) { setGbVRows(null); setGbMsg(`❌ 전표 조회 오류: ${e instanceof Error ? e.message : ''}`) }
    finally { setGbVLoading(false) }
  }
  // 현재 미리보기 데이터의 저장 시그니처(장부·연도·기간·건수) — 같으면 이미 저장한 것
  const gbVSig = () => `${gbSelBooks[0] || 'subsidy'}|${gbYear}|${gbVFrom}|${gbVTo}|${gbVRows?.length || 0}`
  // 저장 버튼 클릭 → 이미 저장한 데이터면 중복 확인 팝업, 아니면 바로 저장
  const saveGwinVouchers = () => {
    if (!gbVRows || gbVRows.length === 0) return
    if (gbVSaving) return // 저장 중 중복 클릭 방지
    if (gbVSavedSig && gbVSavedSig === gbVSig()) { setGbVConfirmOpen(true); return } // 이미 저장됨 → 확인 팝업
    doSaveVouchers()
  }
  // 실제 저장 실행 (전표관리 voucher-input 로 반영)
  const doSaveVouchers = async () => {
    setGbVConfirmOpen(false)
    if (!gbVRows || gbVRows.length === 0) return
    setGbVSaving(true)
    try {
      const res = await fetch('/api/gwin/vouchers/save', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ book: gbVBook, year: gbYear, rows: gbVRows }),
      })
      const j = await res.json().catch(() => ({}))
      const pb = Array.isArray(j?.perBook) ? ' (' + j.perBook.map((p: { book: string; saved: number }) => `${bookLabel(p.book)} ${p.saved}건`).join(' / ') + ')' : ''
      if (j?.success) {
        const savedBook = gbSelBooks[0] || 'subsidy'
        setGbVSavedSig(gbVSig())       // 이 데이터는 저장됨 → 재클릭 시 중복 확인
        setActiveBook(savedBook)       // 활성 장부를 저장한 장부로 전환 → 전표관리(전표입력)에서 바로 보이게
        setGbVSavedBook(savedBook)      // [전표관리로 이동] 버튼 노출
        // 저장 데이터의 첫 달(YYYY-MM) 계산 → 전표입력을 그 달로 열기(기본 2026-03 이라 안 보이던 문제 해결)
        const dts = (gbVRows || []).map(r => String((r as Record<string, unknown>).BILL_DATE || '').replace(/[^0-9]/g, '').slice(0, 6)).filter(d => d.length === 6).sort()
        const firstYm = dts[0] ? `${dts[0].slice(0, 4)}-${dts[0].slice(4, 6)}` : ''
        setGbVSavedYm(firstYm)
        setGbMsg(`✅ 전표관리 저장 완료 — ${j.saved || gbVRows.length}건${pb}. 장부 '${bookLabel(savedBook)}'${firstYm ? ` · 조회월 ${firstYm}` : ''}(으)로 맞췄습니다. [→ 전표관리로 이동]에서 확인하세요.`)
      } else { setGbMsg(`❌ ${j?.error || '전표관리 저장 실패'}`) }
    } catch (e) { setGbMsg(`❌ 전표 저장 오류: ${e instanceof Error ? e.message : ''}`) }
    finally { setGbVSaving(false) }
  }
  // 페이지 열 때 / 장부·연도 변경 시: 저장된 전표 조회 결과 복원 (체크한 장부 조합 기준)
  const activeVBook = (gbSelBooks.length ? gbSelBooks : ['subsidy']).join(',')
  useEffect(() => {
    if (!isIlovechild) return
    setGbVPartialYm('') // 장부/연도 변경 → 이어받기 상태 초기화
    let cancelled = false
    fetch(`/api/gwin/vouchers/cache?book=${encodeURIComponent(activeVBook)}&year=${encodeURIComponent(gbYear)}`, { credentials: 'include' })
      .then(r => r.json()).then(j => {
        if (cancelled) return
        const s = j?.snapshot as { rows?: Record<string, unknown>[]; keys?: string[]; from?: string; to?: string; count?: number; receiptPhotos?: number; receiptBills?: number } | null
        if (s && Array.isArray(s.rows) && s.rows.length) {
          setGbVRows(s.rows); setGbVKeys(s.keys || []); setGbVBook(activeVBook)
          if (s.from) setGbVFrom(s.from); if (s.to) setGbVTo(s.to)
          const rc = s.receiptBills ? ` · 🧾 영수증 ${s.receiptPhotos}장` : ''
          const labels = activeVBook.split(',').map(bookLabel).join('·')
          setGbMsg(`💾 저장된 조회 결과 ${s.count || s.rows.length}건 표시 (${labels} · ${gbYear})${rc}. 다시 [전표 가져오기] 하면 갱신됩니다.`)
        } else {
          setGbVRows(null)
        }
      }).catch(() => {})
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeVBook, gbYear, isIlovechild])
  const saveGwinBudget = async () => {
    if (!gbPreviewByBook) return
    setGbSaving(true)
    const saved: string[] = []; const errs: string[] = []
    for (const [book, basis] of Object.entries(gbPreviewByBook)) {
      try {
        const res = await fetch('/api/budget', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ book, year: gbYear, basisByMok: basis }) })
        const j = await res.json().catch(() => ({}))
        if (j?.success !== false) saved.push(bookLabel(book)); else errs.push(bookLabel(book))
      } catch { errs.push(bookLabel(book)) }
    }
    setGbSaving(false)
    setGbMsg(`✅ 저장: ${saved.join(', ') || '없음'}${errs.length ? ` / 실패: ${errs.join(', ')}` : ''} (${gbYear}년). 예산작성에서 확인하세요.`)
  }

  // 경기도(accgg) 스크래핑 방식 토글/피드백
  const [ggScrapeOpen, setGgScrapeOpen] = useState(false)
  const [ggScrapeMsg, setGgScrapeMsg] = useState('')
  // 경기도 수동 방식(엑셀/스크래핑) 섹션 접기 — 자동 수집이 기본이라 기본 접힘
  const [ggManualOpen, setGgManualOpen] = useState(false)
  // 엑셀 파싱 전용 busy (자동 수집 loading 과 분리 — "엑셀 분석 중" 오표시 방지)
  const [ggExcelBusy, setGgExcelBusy] = useState(false)

  // 스크래퍼 코드 복사 (새 탭 안 엶 — 이미 로그인된 accgg 탭에서 실행해야 함)
  const handleGgScraperCopy = async () => {
    const key = programAuth?.certName || ''
    if (!key) { setGgScrapeMsg('먼저 통합e 인증서가 등록되어야 합니다.'); return }
    const code = ggScraperCode(key)
    try {
      await navigator.clipboard.writeText(code)
      setGgScrapeMsg('✅ 복사됨! ⚠ 로그인 화면 말고, 이미 로그인된 accgg [전표관리] 화면에서 F12 콘솔에 붙여넣고 [조회]를 누르세요.')
    } catch {
      setGgScrapeMsg('복사 실패 — 아래 "코드 직접 복사"를 펼쳐 코드를 복사하세요.')
    }
  }

  // 저장된(수집된) 경기도 전표 불러오기 (통합e page_data[시설명]['gyeonggi-vouchers-raw'] → 표 변환)
  const handleGgScrapeLoad = async (keyOverride?: string) => {
    // key 없으면 프록시가 세션 시설명으로 자동 해석
    const key = keyOverride || centerName || ''
    setLoading(true); setError(''); setData(null); setMultiData([]); setTransferResult('')
    try {
      const res = await fetch(`/api/gyeonggi/stored?${key ? `userId=${encodeURIComponent(key)}&` : ''}latest=1`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || '수집 데이터 없음')
      const raw: unknown[] = json.list || []
      const results = parseAccggChits(raw)
      if (!results.length) throw new Error('저장된 전표가 없습니다. [데이터 수집]을 먼저 눌러주세요.')
      if (results.length === 1) setData(results[0]); else setMultiData(results)
      const total = results.reduce((s, r) => s + r.rows.length, 0)
      const yms = results.map(r => r.yearMonth).sort()
      const span = yms.length ? `${yms[0]}${yms.length > 1 ? `~${yms[yms.length - 1]}` : ''}` : ''
      setTransferResult(`📂 저장된 전표: ${span} · ${results.length}개월 ${total}건 (선택 기간과 다르면 [데이터 수집]을 다시 누르세요)`)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally { setLoading(false) }
  }

  // 경기도(accgg) 원클릭 수집 — 기간 설정 + [데이터 수집] → 에이전트 자동로그인+수집→DB저장→표시
  const now = new Date()
  const curFiscalYear = now.getMonth() + 1 >= 3 ? now.getFullYear() : now.getFullYear() - 1
  const [ggYear, setGgYear] = useState(String(curFiscalYear))
  const [ggMonthFrom, setGgMonthFrom] = useState('03')
  const [ggMonthTo, setGgMonthTo] = useState('02')
  const [ggCollecting, setGgCollecting] = useState(false)

  // 경기도(accgg) 자동로그인 — 저장된 cert 자격으로 에이전트가 로그인된 accgg 새창을 띄움
  // (gbccm 과 달리 공동인증서(CROSSCERT) + 안티봇이라 window.open 불가 → 에이전트 필수)
  const [ggLoggingIn, setGgLoggingIn] = useState(false)
  const [ggLoginMsg, setGgLoginMsg] = useState('')
  const handleGyeonggiOpenBrowser = async () => {
    setGgLoggingIn(true); setGgLoginMsg('⏳ 경기도 자동로그인 중… (에이전트가 로그인된 accgg 창을 엽니다, 최대 1~2분)')
    try {
      const res = await fetch('/api/gyeonggi/open-browser', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const j = await res.json().catch(() => ({}))
      if (j.ok) {
        const m = j.member as { mberNm?: string; ccctNm?: string } | undefined
        setGgLoginMsg(`✅ 로그인된 accgg 창을 열었습니다.${m?.ccctNm ? ` (${m.ccctNm})` : ''} 원장님 PC 브라우저를 확인하세요.`)
      } else if (j.agentOffline) {
        setGgLoginMsg('❌ 로컬 에이전트가 꺼져 있습니다. 우상단 [에이전트 실행]으로 켠 뒤 다시 시도하세요.')
      } else {
        setGgLoginMsg(`❌ ${j.error || '자동로그인 실패'}`)
      }
    } catch (e) {
      setGgLoginMsg(`❌ ${e instanceof Error ? e.message : '연결 실패'}`)
    } finally {
      setGgLoggingIn(false)
    }
  }
  // 기간(연도/월) 바꾸면 화면에 남은 옛 데이터 즉시 지움 — 선택연도와 표시연도 불일치 혼동 방지
  const clearGgShown = () => {
    setData(null); setMultiData([]); setTransferResult('')
    setError('')
  }
  const handleGgCollect = async () => {
    setGgCollecting(true); setLoading(true); setError(''); setData(null); setMultiData([]); setTransferResult('')
    try {
      // 수집 전 저장시각 — 새 저장(에이전트 자체저장) 이 반영됐는지 폴링 판별용
      let prevSavedAt = ''
      try {
        const s0 = await fetch(`/api/gyeonggi/stored?${centerName ? `userId=${encodeURIComponent(centerName)}&` : ''}latest=1`).then(r => r.json())
        prevSavedAt = s0.savedAt || ''
      } catch {}
      // facilityKey 는 서버(통합e)가 세션 시설명으로 자동 해석 — 클라이언트 값 있으면 전달
      const res = await fetch('/api/gyeonggi/cash-ledger', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...(centerName ? { facilityKey: centerName } : {}), year: ggYear, monthFrom: ggMonthFrom, monthTo: ggMonthTo }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        if (json.agentOffline) throw new Error('로컬 에이전트가 꺼져 있습니다. 상단 배지의 [에이전트 실행]을 눌러 켠 뒤 다시 시도하세요.')
        throw new Error(json.error || '수집 실패')
      }
      await reloadGgCache()  // 첫 수집 후 캐시 등록됨으로 갱신
      const key = json.facilityKey
      if (json.pending) {
        // 백그라운드 수집(영수증 이미지 다운로드로 오래 걸림) — 에이전트 자체저장을 폴링
        setTransferResult('⏳ 백그라운드 수집 중… (영수증 이미지 다운로드로 최대 몇 분 소요)')
        for (let i = 0; i < 40; i++) {   // 최대 ~8분 폴링
          await new Promise(r => setTimeout(r, 12000))
          try {
            const s = await fetch(`/api/gyeonggi/stored?${key ? `userId=${encodeURIComponent(key)}&` : ''}latest=1`).then(r => r.json())
            const raw: unknown[] = s.list || []
            // 새 저장(savedAt 변경) 이 반영됐을 때만 완료 처리 (옛 데이터 오인 방지)
            if (raw.length && s.savedAt && s.savedAt !== prevSavedAt) {
              const results = parseAccggChits(raw)
              if (results.length === 1) setData(results[0]); else setMultiData(results)
              const total = results.reduce((a, r) => a + r.rows.length, 0)
              const yms = results.map(r => r.yearMonth).sort()
              const span = yms.length ? `${yms[0]}${yms.length > 1 ? `~${yms[yms.length - 1]}` : ''}` : ''
              setTransferResult(`✅ 수집 완료: ${span} · ${total}건 — 미리보기 표시됨`)
              return
            }
          } catch { /* 계속 폴링 */ }
          setTransferResult(`⏳ 백그라운드 수집 중… (${(i + 1) * 12}초 경과, 이미지 다운로드 중)`)
        }
        setTransferResult('⏳ 수집이 오래 걸립니다. 잠시 후 [저장된 데이터 불러오기]를 눌러 확인하세요.')
        return
      }
      setTransferResult(`✅ 수집 완료: ${json.count}건${json.partial ? ' (일부 월 실패)' : ''} — 표 불러오는 중…`)
      await handleGgScrapeLoad(key)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally { setGgCollecting(false); setLoading(false) }
  }

  // 경기도(accgg): [전표 목록 출력] 엑셀 업로드 → 파싱 → 미리보기
  const handleGyeonggiFile = async (file?: File | null) => {
    if (!file) return
    setLoading(true)
    setGgExcelBusy(true)
    setError('')
    setData(null)
    setMultiData([])
    setTransferResult('')
    try {
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const aoa = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '' }) as unknown[][]
      const results = parseAccggRows(aoa)
      if (results.length === 0) {
        setError('엑셀에서 전표를 찾지 못했습니다. accgg [전표 목록 출력]로 저장한 파일이 맞는지, 전표를 전체 선택했는지 확인하세요.')
        return
      }
      if (results.length === 1) setData(results[0])
      else setMultiData(results)
      const total = results.reduce((s, r) => s + r.rows.length, 0)
      const unmatched = results.flatMap(r => r.rows).filter(r => !r.accountCode)
      setTransferResult(
        `엑셀 파싱 완료: ${results.length}개월, ${total}건` +
        (unmatched.length ? ` · ⚠ 계정코드 미매칭 ${unmatched.length}건 (미리보기에서 계정과목 확인 후 이관)` : ''),
      )
    } catch (err) {
      setError('엑셀 파싱 실패: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setLoading(false)
      setGgExcelBusy(false)
    }
  }

  // 출발지에서 데이터 가져오기
  const handleFetch = async () => {
    // 준비중 출발지(백엔드 미구현) — 조회 시도 시 404 HTML → JSON 파싱 에러 방지
    if (currentSource.features.length === 0) {
      setError(`${currentSource.label}은(는) 아직 준비 중인 출발지입니다. 현재 지원: 보육나라 · 장부나라 · 키즈홈 · 인천시어린이집관리시스템 · 아이프렌즈`)
      return
    }
    // 등록된 인증 정보가 없고, 직접 입력도 없는 경우
    if (!programAuth) {
      if (currentSource.authType === 'cert') {
        setError('인증서가 등록되지 않았습니다. 통합e 인증설정에서 등록하세요.')
        return
      } else if (currentSource.authType === 'session') {
        if (!gbccmSessionRegistered) {
          setError('세션쿠키가 등록되지 않았습니다. 아래에서 먼저 등록해주세요.')
          return
        }
      } else if (!sourceId || !sourcePw) {
        setError(`${currentSource.label} 아이디/비밀번호를 입력하세요.`)
        return
      }
    }
    setLoading(true)
    setError('')
    setData(null)
    setMultiData([])
    setTransferResult('')

    try {
      const authFields = programAuth
        ? (currentSource.authType === 'cert' ? { useSavedCert: true } : { useSavedAuth: true })
        : currentSource.authType === 'cert'
          ? { useSavedCert: true }
          : currentSource.authType === 'session'
            ? {}
            : { userId: sourceId, password: sourcePw }
      const body =
        mode === 'single'
          ? { ...authFields, yearMonth }
          : { ...authFields, startYm, endYm }

      const res = await fetch(`/api/${source}/cash-ledger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const raw = await res.text()
      let json: { error?: string; [k: string]: unknown }
      try {
        json = JSON.parse(raw)
      } catch {
        throw new Error(
          res.ok
            ? '조회 서버가 예상치 못한 응답을 반환했습니다. (준비 중 출발지이거나 서버 오류)'
            : `조회 실패 (HTTP ${res.status}) — 해당 출발지 조회 기능이 없거나 서버 오류입니다.`,
        )
      }

      if (!res.ok) throw new Error(json.error || '조회 실패')

      // 계정명(+적요 세목) → sunote 코드 자동 매핑
      const autoMap = (rawResults: CashLedgerResult[]) => {
        // 카드매핑/영수증 필드명 통일 — 백엔드(인천시 등)는 _cardMappings(accgg-vouchers.ts 와 동일
        // 관례)로 보내는데, 화면 렌더링은 _cardInfo 를 읽음(accgg 저장분 파서 규칙과 동일하게 맞춤).
        // 모든 출발지에 적용(MAPPING_TABLE 등록 여부 무관) — 여기서 못 해두면 카드/영수증 데이터가
        // 있어도 화면에 안 보임.
        const results = rawResults.map(r => ({
          ...r,
          rows: r.rows.map(row => {
            const raw = row as unknown as CashLedgerRow & { _cardMappings?: GgCardInfo[] }
            return raw._cardMappings ? { ...row, _cardInfo: raw._cardMappings } : row
          }),
        }))
        if (!(source in MAPPING_TABLE)) return results
        const mapping = MAPPING_TABLE[source as keyof typeof MAPPING_TABLE]
        const allItems = [...mapping.income, ...mapping.expense]

        // 키즈홈 세목 → sunote 세부코드 매핑 (적요 [세목명] 기반)
        const subCodeMap: Record<string, Record<string, string>> = {
          // 기타필요경비(수입) 1221
          '1221': {
            '입학준비금': '1221-111', '현장학습비': '1221-112', '차량운행비': '1221-113',
            '부모부담행사비': '1221-121', '조석식비': '1221-131',
            '기타시도특성화비': '1221-141', '특성화비': '1221-141',
          },
          // 그밖의지원금 1324
          '1324': { '누리과정지원금': '1324-1' },
          // 공공형운영비 1323
          '1323': { '환경개선비': '1323-1' },
          // 퇴직금및퇴직적립금 2142
          '2142': { '퇴직금': '2142-112', '퇴직적립금': '2142-121' },
          // 수용비및수수료 2211
          '2211': { '누리': '2211-1' },
          // 기타필요경비지출 2421
          '2421': {
            '입학준비금': '2421-111', '현장학습비': '2421-121', '차량운행비': '2421-131',
            '부모부담행사비': '2421-141', '조석식비': '2421-151',
            '기타시도특성화비': '2421-161', '특성화비': '2421-161',
          },
        }

        return results.map(r => ({
          ...r,
          rows: r.rows.map(row => {
            if (row.accountCode && !row.accountCode.includes('|') && row.accountCode.length <= 8) {
              // 세목 코드(XXXX-YYY)는 이미 매핑되어 있어도 확정 5자리로 변환
              return { ...row, accountCode: SUBCODE_TO_5DIGIT[row.accountCode] || row.accountCode }
            }

            const name = row.accountName.replace(/[.\s·]/g, '')
            const match = allItems.find(m => {
              const mName = m.by24Name.replace(/[.\s·]/g, '').trim()
              return mName === name
            })
            if (!match) return row

            let code: string = match.sunote

            // 적요에서 [세목명] 추출 → 세부코드 매핑
            const subMap = subCodeMap[code]
            if (subMap) {
              const bracketMatch = row.summary.match(/\[([^\]]+)\]/)
              if (bracketMatch) {
                const subName = bracketMatch[1]
                for (const [keyword, subCode] of Object.entries(subMap)) {
                  if (subName.includes(keyword)) { code = subCode; break }
                }
              }
              // 퇴직금: 적요에 괄호 없어도 키워드 체크
              if (code === '2142') {
                if (row.summary.includes('퇴직적립') || row.summary.includes('퇴직연금')) code = '2142-121'
                else if (row.summary.includes('퇴직금')) code = '2142-112'
                else code = '2142-121' // 기본: 적립금
              }
            }

            // 세목 코드는 수전자장부 확정 5자리로 최종 변환 (엑셀 업로드 바로 가능하게)
            code = SUBCODE_TO_5DIGIT[code] || code

            return { ...row, accountCode: code }
          }),
        }))
      }

      if (mode === 'single') {
        const mapped = autoMap([json as unknown as CashLedgerResult])
        setData(mapped[0])
        setTransferResult(`조회 완료: 1개월, ${mapped[0].rows.length}건 (${new Date().toISOString().substring(0, 16)})`)
      } else {
        const mapped = autoMap(json as unknown as CashLedgerResult[])
        setMultiData(mapped)
        const total = mapped.reduce((s, r) => s + r.rows.length, 0)
        setTransferResult(`조회 완료: ${mapped.length}개월, ${total}건 (${new Date().toISOString().substring(0, 16)})`)
      }
      setTransferredYms({})
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  // 이관 중지
  const handleStop = async () => {
    try {
      await fetch('/api/sunote/stop', { method: 'POST' })
      setError('중지 요청됨 — 현재 배치 완료 후 중단됩니다.')
    } catch {
      setError('중지 요청 실패')
    }
  }

  // 월별 이관
  const handleTransferMonth = async (ym: string) => {
    if (!sunoteId || !sunotePw) {
      setError('수전자장부 아이디/비밀번호를 입력하세요.')
      return
    }

    const allData = data ? [data] : multiData
    const monthData = allData.find((d) => d.yearMonth === ym)
    if (!monthData) return

    setTransferring(true)
    setTransferringYm(ym)
    setError('')

    try {
      const res = await fetch('/api/sunote/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: sunoteId,
          password: sunotePw,
          data: [monthData],
          customMappings: Object.keys(customMappings).length > 0 ? customMappings : undefined,
          trustCode: source === 'jangbunara', // 장부나라: 코드값만 따라감(적요 세목 추론 끔)
        }),
      })
      const json = await res.json()

      if (!res.ok) throw new Error(json.error || '이관 실패')
      const stopMsg = json.stopped ? ' (중지됨)' : ''
      setTransferredYms((prev) => ({
        ...prev,
        [ym]: `${json.transferred || 0}건 완료${stopMsg}`,
      }))
      if (json.unmappedCodes?.length > 0) {
        setUnmappedCodes((prev) => [...prev, ...json.unmappedCodes])
      }
    } catch (e) {
      setTransferredYms((prev) => ({
        ...prev,
        [ym]: `실패: ${e instanceof Error ? e.message : String(e)}`,
      }))
    } finally {
      setTransferring(false)
      setTransferringYm(null)
    }
  }

  // 경상북도(gbccm, authType:'session') → 통합e 전표관리(voucher-input) 직접 저장.
  // sunote 를 안 거치는 소스라 sunoteId/Pw 불필요 — displayData 의 모든 행을 그대로 전송.
  //
  // ⚠ 2026-07-13 fix: 인천시(aincheon) 등 일부 출발지는 row.date 에 "일(day)"만 담김(예: "01") —
  // 월 정보는 부모 CashLedgerResult.yearMonth 에 따로 있음(handleExcelDownload 가 이미 이 패턴을
  // 씀). flatMap 으로 그냥 펼치면 이 yearMonth 컨텍스트가 사라지고, 저장 API(/api/gbccm/vouchers/save)
  // 의 toIsoDate() 는 8자리 YYYYMMDD 만 인식해 2자리 day 는 빈 날짜('')로 저장 — voucher/input 화면의
  // 월 필터에 절대 걸리지 않아 "조회는 되는데 저장하면 안 보인다"는 버그가 있었음. 저장 전에
  // yearMonth+day 로 8자리 날짜를 미리 조립해서 보낸다.
  const handleGbccmSaveToVoucherInput = async () => {
    const allRows = displayData.flatMap((d) => d.rows.map((row) => {
      const digits = String(row.date || '').replace(/\D/g, '')
      const fullDate = digits.length >= 8 ? digits : `${d.yearMonth}${digits.padStart(2, '0')}`
      return { ...row, date: fullDate }
    }))
    if (allRows.length === 0) { setGbccmSaveMsg('❌ 저장할 전표가 없습니다.'); return }
    setGbccmSaving(true); setGbccmSaveMsg('')
    try {
      const res = await fetch('/api/gbccm/vouchers/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: allRows, source }),
      })
      const j = await res.json()
      if (j.success) {
        setGbccmSaveMsg(`✅ 전표관리에 ${j.saved}건 저장 완료`)
      } else {
        setGbccmSaveMsg(`❌ ${j.error || '저장 실패'}`)
      }
    } catch (e) {
      setGbccmSaveMsg(`❌ ${e instanceof Error ? e.message : '연결 실패'}`)
    } finally {
      setGbccmSaving(false)
    }
  }

  // 전체 일괄 이관 (월별 루프)
  const handleTransferAll = async () => {
    if (!sunoteId || !sunotePw) {
      setError('수전자장부 아이디/비밀번호를 입력하세요.')
      return
    }
    const allData = data ? [data] : multiData
    if (allData.length === 0) return

    setTransferring(true)
    setError('')
    setUnmappedCodes([])

    for (const monthData of allData) {
      const ym = monthData.yearMonth
      if (transferredYms[ym] && !transferredYms[ym].startsWith('실패')) continue // 이미 완료된 월 스킵

      setTransferringYm(ym)
      try {
        const res = await fetch('/api/sunote/transfer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: sunoteId,
            password: sunotePw,
            data: [monthData],
            customMappings: Object.keys(customMappings).length > 0 ? customMappings : undefined,
          trustCode: source === 'jangbunara', // 장부나라: 코드값만 따라감(적요 세목 추론 끔)
          }),
        })
        const json = await res.json()

        if (!res.ok) throw new Error(json.error || '이관 실패')
        const stopMsg = json.stopped ? ' (중지됨)' : ''
        setTransferredYms((prev) => ({ ...prev, [ym]: `${json.transferred || 0}건 완료${stopMsg}` }))
        if (json.unmappedCodes?.length > 0) {
          setUnmappedCodes((prev) => [...prev, ...json.unmappedCodes])
        }
        if (json.stopped) break // 중지 요청 시 루프 종료
      } catch (e) {
        setTransferredYms((prev) => ({ ...prev, [ym]: `실패: ${e instanceof Error ? e.message : String(e)}` }))
        break // 에러 시 루프 중단
      }
    }

    setTransferring(false)
    setTransferringYm(null)
  }

  // 엑셀 다운로드
  const handleExcelDownload = () => {
    const allData = data ? [data] : multiData
    if (allData.length === 0) return

    const wb = XLSX.utils.book_new()

    for (const result of allData) {
      const ym = result.yearMonth
      const label = `${ym.substring(0, 4)}년 ${ym.substring(4)}월`

      // 요약 행 + 헤더 + 데이터
      const rows = [
        [`[${label}] 현금출납부`],
        [`전월이월: ${fmtAmt(result.summary.monthStart)}원`, '', '', `수입합계: ${fmtAmt(result.summary.monthIncome)}원`, '', `지출합계: ${fmtAmt(result.summary.monthExpense)}원`],
        [],
        ['일자', '발행번호', '계정코드', '계정과목', '세목', '적요', '수입금액', '지출금액', '잔액'],
        ...result.rows.map((r) => {
          // 날짜에 하이픈이 이미 포함된 경우(YYYY-MM-DD)와 순수 숫자(YYYYMMDD) 모두 처리
          const digits = r.date.replace(/\D/g, '')
          let dateStr: string
          if (digits.length >= 8) {
            dateStr = `${digits.substring(0, 4)}/${digits.substring(4, 6)}/${digits.substring(6, 8)}`
          } else {
            dateStr = `${ym.substring(0, 4)}/${ym.substring(4)}/${digits.padStart(2, '0')}`
          }
          return [
          dateStr,
          r.docNo,
          r.accountCode,
          r.accountName,
          r.subAccountName || '',
          r.summary,
          r.income || '',
          r.expense || '',
          r.balance || '',
        ]}),
      ]

      const ws = XLSX.utils.aoa_to_sheet(rows)
      // 열 너비 설정
      ws['!cols'] = [
        { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 18 }, { wch: 18 }, { wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
      ]
      XLSX.utils.book_append_sheet(wb, ws, label)
    }

    const fileName = allData.length === 1
      ? `현금출납부_${allData[0].yearMonth}.xlsx`
      : `현금출납부_${allData[0].yearMonth}-${allData[allData.length - 1].yearMonth}.xlsx`
    XLSX.writeFile(wb, fileName)
  }

  // 일괄 엑셀 다운로드 (한 시트, 날짜 YYYY/MM/DD)
  const handleExcelDownloadAll = () => {
    const allData = data ? [data] : multiData
    if (allData.length === 0) return

    const wb = XLSX.utils.book_new()
    const rows: (string | number)[][] = [
      ['날짜', '발행번호', '계정코드', '계정과목', '세목', '적요', '수입금액', '지출금액', '잔액'],
    ]

    for (const result of allData) {
      for (const r of result.rows) {
        // date: "20210309" (8자리, 하이픈 있을 수도 있음) 또는 "9" (일자만)
        const digits = r.date.replace(/\D/g, '')
        let dateStr: string
        if (digits.length >= 8) {
          dateStr = `${digits.substring(0, 4)}/${digits.substring(4, 6)}/${digits.substring(6, 8)}`
        } else {
          const yyyy = result.yearMonth.substring(0, 4)
          const mm = result.yearMonth.substring(4)
          dateStr = `${yyyy}/${mm}/${digits.padStart(2, '0')}`
        }
        rows.push([
          dateStr,
          r.docNo,
          r.accountCode,
          r.accountName,
          r.subAccountName || '',
          r.summary,
          r.income || '',
          r.expense || '',
          r.balance || '',
        ])
      }
    }

    const ws = XLSX.utils.aoa_to_sheet(rows)
    ws['!cols'] = [
      { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 15 }, { wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
    ]
    XLSX.utils.book_append_sheet(wb, ws, '현금출납부')

    const fileName = allData.length === 1
      ? `현금출납부_일괄_${allData[0].yearMonth}.xlsx`
      : `현금출납부_일괄_${allData[0].yearMonth}-${allData[allData.length - 1].yearMonth}.xlsx`
    XLSX.writeFile(wb, fileName)
  }

  const displayData = data ? [data] : multiData
  const totalRows = displayData.reduce((sum, d) => sum + d.rows.length, 0)

  // 고유 계정코드 추출
  const uniqueAccounts = (() => {
    const map = new Map<string, { code: string; name: string; count: number }>()
    for (const d of displayData) {
      for (const r of d.rows) {
        if (!r.accountCode) continue
        const key = r.accountCode
        const existing = map.get(key)
        if (existing) {
          existing.count++
        } else {
          map.set(key, { code: key, name: r.accountName, count: 1 })
        }
      }
    }
    return Array.from(map.values()).sort((a, b) => a.code.localeCompare(b.code))
  })()

  return (
    <div className="space-y-6">
      {/* ⚠ 언더바 탭(데이터이관/자동로그인)은 전역 메뉴(Sidebar.tsx)가 이미 서브탭으로 제공 —
          여기서 또 렌더하면 화면에 같은 탭이 두 줄로 중복 표시되어 제거함(2026-07-11). */}
      {/* 제목 + 로컬 에이전트 상태(항상 노출) */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">데이터 이관</h1>
          <p className="text-[11px] text-slate-500 mt-1">
            {currentSource.label}({currentSource.url}) → {destName}{isIlovechild ? '' : '(sunote.co.kr)'} 현금출납부 이관
          </p>
        </div>
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-medium ${
          agentAlive === null ? 'bg-slate-100 text-slate-500'
          : agentAlive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          <span className={`w-2 h-2 rounded-full ${
            agentAlive === null ? 'bg-slate-400' : agentAlive ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'
          }`} />
          {agentAlive === null ? '로컬 에이전트 확인 중...'
            : agentAlive ? `로컬 에이전트 실행 중 (${agentSecondsAgo}초 전 응답)`
            : '로컬 에이전트 꺼짐'}
          {!agentAlive && (
            <a
              href="childcare-agent://start"
              className="ml-1 inline-flex items-center gap-1 px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white text-[11px] font-semibold rounded-lg"
            >
              🔌 에이전트 실행
            </a>
          )}
        </div>
      </div>

      {/* 걸음마 예산 가져오기 — 아이사랑꿈터 + 출발지 걸음마 */}
      {isIlovechild && source === 'walk' && (
        <div className="bg-white rounded-xl border-2 border-amber-200 p-5 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-amber-800 font-bold text-[11px]">🐤 걸음마 예산·전표 가져오기</span>
            <span className="ml-2 text-[11px] font-bold text-slate-600">회계연도</span>
            <select value={gbYear} onChange={e => { setGbYear(e.target.value); setGbPreviewByBook(null); setGbMsg('') }} className="border border-slate-300 rounded px-2 py-1.5 text-[11px]">
              <option value="2026">2026년</option><option value="2025">2025년</option><option value="2024">2024년</option>
            </select>
          </div>
          {/* 장부 선택 — 단일 선택(한 장부씩 조회·저장). 여러 장부는 장부를 바꿔가며 각각 진행 */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-bold text-slate-500">가져올 장부 <span className="text-slate-400 font-normal">(한 개씩)</span></span>
            {ILOVECHILD_BOOKS.map(b => {
              const on = gbSelBooks.includes(b.code)
              return (
                <button key={b.code} onClick={() => toggleGbBook(b.code)}
                  className={`px-3 py-1 text-[11px] font-bold rounded-full border transition-colors ${on ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-slate-500 border-slate-300 hover:border-amber-400'}`}>
                  {on ? '✓ ' : ''}{b.label}
                </button>
              )
            })}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={loadGwinBudget} disabled={gbLoading} className="px-3 py-1.5 text-[11px] font-bold text-amber-800 bg-amber-100 border border-amber-300 rounded hover:bg-amber-200 disabled:opacity-50">{gbLoading ? '⏳ 걸음마 조회 중…' : '📥 예산 가져오기 (실시간)'}</button>
            <button onClick={saveGwinBudget} disabled={!gbPreviewByBook || gbSaving} className="px-4 py-1.5 text-[11px] font-bold text-white bg-teal-500 hover:bg-teal-600 rounded disabled:opacity-40">💾 저장</button>
            <button onClick={loadGwinBudgetStatic} className="px-2 py-1.5 text-[11px] font-bold text-slate-500 bg-white border border-slate-200 rounded hover:bg-slate-50" title="실시간 조회 실패 시 마지막 저장된 스냅샷으로 미리보기">저장 데이터로 보기</button>
            <span className="text-[11px] font-bold text-slate-500 ml-1">전표기간</span>
            <select value={gbVFrom} onChange={e => setGbVFrom(e.target.value)} className="border border-slate-300 rounded px-1.5 py-1.5 text-[11px]" title="시작월(회계연도 3월~익년2월)">
              {FISCAL_MONTHS.map(m => <option key={m} value={m}>{Number(m)}월{Number(m) < 3 ? '(익년)' : ''}</option>)}
            </select>
            <span className="text-slate-400 text-[11px]">~</span>
            <select value={gbVTo} onChange={e => setGbVTo(e.target.value)} className="border border-slate-300 rounded px-1.5 py-1.5 text-[11px]" title="종료월(회계연도 3월~익년2월)">
              {FISCAL_MONTHS.map(m => <option key={m} value={m}>{Number(m)}월{Number(m) < 3 ? '(익년)' : ''}</option>)}
            </select>
            <label className="flex items-center gap-1 text-[11px] text-slate-600 select-none cursor-pointer" title="첨부된 영수증 사진까지 함께 가져와 전표에 붙입니다(시간이 더 걸립니다)">
              <input type="checkbox" checked={gbVWithReceipts} onChange={e => setGbVWithReceipts(e.target.checked)} /> 🧾 영수증 사진 포함
            </label>
            <button onClick={loadGwinVouchers} disabled={gbVLoading} className="px-3 py-1.5 text-[11px] font-bold text-amber-800 bg-amber-100 border border-amber-300 rounded hover:bg-amber-200 disabled:opacity-50" title="걸음마 전표(현금출납부) 조회">{gbVLoading ? '⏳ 전표 조회 중…' : '🧾 전표 가져오기'}</button>
            <button onClick={saveGwinVouchers} disabled={!gbVRows || !gbVRows.length || gbVSaving} className="px-3 py-1.5 text-[11px] font-bold text-white bg-teal-600 hover:bg-teal-700 rounded disabled:opacity-40" title="가져온 전표를 전표관리로 저장">{gbVSaving ? '저장 중…' : '📒 전표관리로 저장'}</button>
            {gbVSavedBook && <a href={`/voucher/input${gbVSavedYm ? `?ym=${gbVSavedYm}` : ''}`} className="px-3 py-1.5 text-[11px] font-bold text-white bg-teal-500 hover:bg-teal-600 rounded" title={`${bookLabel(gbVSavedBook)} 전표관리(전표입력)${gbVSavedYm ? ` ${gbVSavedYm}` : ''}로 이동`}>→ 전표관리로 이동</a>}
            {gbMsg && <span className={`text-[11px] font-semibold ${gbMsg.startsWith('❌') ? 'text-rose-600' : 'text-emerald-700'}`}>{gbMsg}</span>}
          </div>
          {gbPreviewByBook && (
            <div className="text-[11px] text-slate-600 bg-amber-50 rounded px-3 py-2 space-y-0.5">
              {Object.entries(gbPreviewByBook).map(([book, basis]) => {
                const keys = Object.keys(basis)
                const total = keys.reduce((s, k) => s + (basis[k] || []).reduce((a, it) => a + (it.total || 0), 0), 0)
                return <div key={book}>· <b className="text-amber-800">{bookLabel(book)}</b> — 목 {keys.length}개 · 합계 <b>{total.toLocaleString('ko-KR')}원</b></div>
              })}
              <div className="text-slate-500 pt-0.5"><b className="text-blue-700">[저장]</b>을 눌러야 실제 반영됩니다.</div>
            </div>
          )}
          {/* 가져온 전표 미리보기 (여기에 표시) */}
          {gbVRows && gbVRows.length > 0 && (
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="bg-slate-50 px-3 py-1.5 text-[11px] font-bold text-slate-600 flex items-center gap-2">
                🧾 가져온 전표 {gbVRows.length}건 <span className="text-slate-400 font-normal">({gbVBook.split(',').map(bookLabel).join('·')} · {gbYear}.{gbVFrom}~{gbVTo}월) — [📒 전표관리로 저장]으로 반영</span>
              </div>
              <div className="overflow-x-auto max-h-64 overflow-y-auto">
                <table className="text-[11px] w-full">
                  <thead className="bg-slate-100 sticky top-0"><tr>{gbVKeys.map(k => <th key={k} className="px-2 py-1 text-left font-semibold text-slate-500 whitespace-nowrap border-b border-slate-200">{GWIN_COL_LABEL[k] || k}</th>)}</tr></thead>
                  <tbody>
                    {gbVRows.slice(0, 100).map((r, i) => (
                      <tr key={i} className="border-b border-slate-50 hover:bg-amber-50/40">
                        {gbVKeys.map(k => {
                          // 영수증 컬럼은 긴 URL 대신 장수로 예쁘게
                          if (k === '_receiptImages') { const n = String(r[k] ?? '').split(',').filter(Boolean).length; return <td key={k} className="px-2 py-1 whitespace-nowrap text-center">{n > 0 ? <span className="text-blue-600 font-semibold">🧾 {n}장</span> : <span className="text-slate-300">-</span>}</td> }
                          if (k === '_receiptImage') { return <td key={k} className="px-2 py-1 whitespace-nowrap text-center">{r[k] ? <span className="text-slate-500">대표1</span> : <span className="text-slate-300">-</span>}</td> }
                          return <td key={k} className="px-2 py-1 text-slate-600 whitespace-nowrap">{String(r[k] ?? '')}</td>
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {gbVRows.length > 100 && <div className="px-3 py-1 text-[11px] text-slate-400">미리보기 100건 표시 (전체 {gbVRows.length}건 저장됨)</div>}
            </div>
          )}
          <p className="text-[11px] text-slate-400">· 예산은 <b className="text-slate-600">예산관리 › 예산작성</b>에, 전표는 <b className="text-slate-600">전표관리 › 전표입력</b>에 반영됩니다.</p>

          {/* 중복 저장 확인 팝업 */}
          {gbVConfirmOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setGbVConfirmOpen(false)}>
              <div className="bg-white rounded-xl shadow-2xl w-[92vw] max-w-md p-5" onClick={e => e.stopPropagation()}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">⚠️</span>
                  <h3 className="text-base font-bold text-slate-800">이미 저장한 전표입니다</h3>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  이 전표는 방금 <b className="text-teal-700">전표관리에 저장</b>되었습니다.<br />
                  다시 저장하면 <b className="text-rose-600">재등록되어 중복될 수 있습니다.</b><br />
                  그래도 저장하시겠습니까?
                </p>
                <div className="flex justify-end gap-2 mt-5">
                  <button onClick={() => setGbVConfirmOpen(false)} className="px-4 py-2 text-[11px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded">취소</button>
                  <button onClick={doSaveVouchers} className="px-4 py-2 text-[11px] font-bold text-white bg-rose-600 hover:bg-rose-700 rounded">그래도 저장</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2열 레이아웃: 출발지 / 목적지 (아이사랑꿈터는 자체 저장 → 단일 컬럼) */}
      <div className={`grid grid-cols-1 gap-6 ${isIlovechild ? '' : 'lg:grid-cols-2'}`}>
        {/* 출발지 */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-blue-600 font-bold text-[11px]">1</span>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-slate-800">출발지</h2>
                <select
                  value={source}
                  onChange={(e) => {
                    setSource(e.target.value as SourceType)
                    setData(null)
                    setMultiData([])
                    setError('')
                    setTransferResult('')
                  }}
                  className="px-2 py-1 border border-slate-200 rounded-lg text-[11px] font-medium text-blue-700 bg-blue-50"
                >
                  {/* 아이사랑꿈터는 걸음마만(어린이집 이관원 제외), 어린이집은 걸음마 제외 */}
                  {/* (가능)=조회 기능 구현됨. 단 실데이터로 검증 안 된 출발지는 (가능·미검증)으로 구분해
                      "동작이 보장된 것"처럼 읽히지 않게 한다. */}
                  {SOURCE_OPTIONS.filter((o) => isIlovechild ? o.value === 'walk' : o.value !== 'walk').map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                      {o.features.length > 0 ? ('unverified' in o && o.unverified ? '  (가능·미검증)' : '  (가능)') : ''}
                    </option>
                  ))}
                </select>
                {source in MAPPING_TABLE && (
                  <button
                    onClick={() => setShowMappingModal(true)}
                    className="px-2 py-1 text-[11px] bg-violet-50 text-violet-700 border border-violet-200 rounded-lg hover:bg-violet-100 font-medium"
                  >
                    매핑 코드
                  </button>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <p className="text-[11px] text-slate-400">{currentSource.url}</p>
                {isIlovechild && source === 'walk' ? (
                  <span className="text-[11px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded font-medium">예산 실시간</span>
                ) : currentSource.features.length > 0 ? (
                  currentSource.features.map((f) => (
                    <span key={f} className="text-[11px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded font-medium">{f}</span>
                  ))
                ) : source === 'gyeonggi' ? (
                  <span className="text-[11px] px-1.5 py-0.5 bg-teal-100 text-teal-700 rounded font-medium">엑셀 업로드</span>
                ) : (
                  <span className="text-[11px] px-1.5 py-0.5 bg-slate-100 text-slate-400 rounded">준비중</span>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {/* 인증 정보 영역 */}
            {authLoading ? (
              <div className="text-[11px] text-slate-400 py-2">인증 정보 확인 중...</div>
            ) : programAuth ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-600 text-lg">&#x2713;</span>
                  <div className="flex-1">
                    <p className="text-[11px] font-semibold text-emerald-800">
                      {programAuth.authType === 'cert'
                        ? `인증서 등록됨: ${programAuth.certName}`
                        : '아이디/비밀번호 등록됨'}
                    </p>
                    <p className="text-[11px] text-emerald-600 mt-0.5">
                      통합e 인증설정에서 등록 · 바로 사용 가능
                      {programAuth.savedAt && ` · 등록 ${new Date(programAuth.savedAt).toLocaleDateString('ko-KR')}`}
                    </p>
                    {/* 인증서 만기일 — 만료되면 로그인이 조용히 실패하므로 D-day 로 미리 경고 */}
                    {programAuth.authType === 'cert' && programAuth.certEndDt && (() => {
                      const s = programAuth.certEndDt
                      if (!/^\d{8}$/.test(s)) return null
                      const end = new Date(Number(s.slice(0, 4)), Number(s.slice(4, 6)) - 1, Number(s.slice(6, 8)))
                      const today = new Date(); today.setHours(0, 0, 0, 0)
                      const dday = Math.round((end.getTime() - today.getTime()) / 86400000)
                      const label = `${s.slice(0, 4)}.${s.slice(4, 6)}.${s.slice(6, 8)}`
                      const tone = dday < 0 ? 'text-rose-600 font-semibold'
                        : dday <= 30 ? 'text-amber-600 font-semibold'
                        : 'text-emerald-600'
                      const suffix = dday < 0 ? ` (${-dday}일 지남 · 갱신 후 재등록 필요)`
                        : dday <= 30 ? ` (D-${dday} · 곧 만료)`
                        : ` (D-${dday})`
                      return <p className={`text-[11px] mt-0.5 ${tone}`}>🔐 인증서 만기: {label}{suffix}</p>
                    })()}
                    {source === 'gyeonggi' && programAuth.authType === 'cert' && (
                      <p className="text-[11px] mt-1">
                        {ggCacheLoading ? (
                          <span className="text-slate-400">🔑 자동로그인 캐시 확인 중…</span>
                        ) : ggCache?.exists ? (
                          <span className="font-semibold text-emerald-700">
                            🔑 자동로그인 캐시: ✓ 등록됨 (CROSSCERT 없이 빠른 로그인)
                            {ggCache.updatedAt && ` · ${new Date(ggCache.updatedAt).toLocaleDateString('ko-KR')}`}
                          </span>
                        ) : (
                          <span className="font-semibold text-amber-600">
                            🔑 자동로그인 캐시: ✗ 미등록 (첫 수집 시 인증서로 1회 로그인 → 자동 캐시)
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <a href={`${process.env.NEXT_PUBLIC_PLATFORM_URL || 'http://localhost:3000'}/dashboard/settings/cis-auth`}
                      target="_blank" rel="noopener noreferrer"
                      className="text-[11px] text-blue-600 hover:text-blue-700 px-2 py-1 rounded hover:bg-blue-50">
                      수정
                    </a>
                    {/* 삭제 — [수정]은 통합e 인증설정을 새 탭으로 열 뿐이라 거기서 지워도 이 등록정보는 남는다.
                        비번이 틀렸을 때 여기서 지우고 다시 등록할 수 있어야 함. */}
                    <button type="button" onClick={handleDeleteProgramAuth} disabled={authDeleting}
                      title="이 화면의 등록 인증정보만 삭제합니다 (통합e 인증서 보관함은 유지)"
                      className="text-[11px] text-rose-600 hover:text-rose-700 px-2 py-1 rounded hover:bg-rose-50 disabled:opacity-50">
                      {authDeleting ? '삭제 중…' : '삭제'}
                    </button>
                  </div>
                </div>
                {/* 경기도 자동로그인 — cert 자격 캐시가 등록됐을 때만. 에이전트가 로그인된 accgg 새창을 엶 */}
                {source === 'gyeonggi' && ggCache?.exists && (
                  <div className="mt-2 pt-2 border-t border-emerald-200">
                    <button type="button" disabled={ggLoggingIn}
                      onClick={handleGyeonggiOpenBrowser}
                      className="px-3 py-1.5 text-[11px] font-bold rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50">
                      {ggLoggingIn ? '자동로그인 중…' : '🔓 경기도 자동로그인 (accgg 창 열기)'}
                    </button>
                    {ggLoginMsg && <p className="text-[11px] mt-1.5 text-slate-600">{ggLoginMsg}</p>}
                    <p className="text-[10px] text-slate-400 mt-1">· 에이전트가 저장된 인증서로 로그인된 accgg 화면을 새 창으로 엽니다. (PC 에이전트 켜짐 필요)</p>
                  </div>
                )}
                {/* 경기도 화면 바로가기 — gbccm/인천시와 동일한 패턴으로 노출하되, accgg 는 아직
                    "로그인된 화면"으로 자동 연결이 안 돼(실측 확인됨) 개발중 표시만 하고 로그인
                    페이지로 보냄. 버튼 자체는 숨기지 않음(사용자 요청) — 완성되면 링크만 실제
                    딥링크 URL로 교체하면 됨. */}
                {source === 'gyeonggi' && (
                  <div className="mt-2 pt-2 border-t border-emerald-200">
                    <div className="flex flex-wrap gap-1.5">
                      <a href="https://www.accgg.co.kr/websquare/user_index.html" target="_blank" rel="noopener noreferrer"
                        title="개발중 — 아직 로그인된 화면으로 자동 연결되지 않습니다. 로그인 페이지가 열리면 직접 로그인해주세요."
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg border border-amber-300 bg-white hover:bg-amber-50 text-amber-700">
                        📊 예산관리 바로가기 <span aria-hidden="true">❗</span>
                      </a>
                      <a href="https://www.accgg.co.kr/websquare/user_index.html" target="_blank" rel="noopener noreferrer"
                        title="개발중 — 아직 로그인된 화면으로 자동 연결되지 않습니다. 로그인 페이지가 열리면 직접 로그인해주세요."
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg border border-amber-300 bg-white hover:bg-amber-50 text-amber-700">
                        📅 월회계보고 바로가기 <span aria-hidden="true">❗</span>
                      </a>
                      <a href="https://www.accgg.co.kr/websquare/user_index.html" target="_blank" rel="noopener noreferrer"
                        title="개발중 — 아직 로그인된 화면으로 자동 연결되지 않습니다. 로그인 페이지가 열리면 직접 로그인해주세요."
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg border border-amber-300 bg-white hover:bg-amber-50 text-amber-700">
                        📑 결산관리 바로가기 <span aria-hidden="true">❗</span>
                      </a>
                    </div>
                    <p className="text-[10px] text-amber-600 mt-1">· ❗ 개발중 — 클릭하면 accgg 로그인 화면이 열립니다. 로그인된 화면으로 바로 이동하는 기능은 아직 준비 중입니다.</p>
                  </div>
                )}
              </div>
            ) : currentSource.authType === 'cert' ? (
              <div className="bg-teal-50 border border-teal-200 rounded-lg p-3">
                <p className="text-[11px] text-teal-700 font-medium">인증서가 등록되지 않았습니다.</p>
                <p className="text-[11px] text-slate-500 mt-1">통합e에 등록된 인증서를 이 출발지로 바로 가져올 수 있습니다.</p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <button
                    onClick={handleImportCert}
                    disabled={certImporting}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-[11px] font-semibold rounded-lg">
                    {certImporting ? '가져오는 중...' : '📥 통합e 인증서 가져오기'}
                  </button>
                  <a href={`${process.env.NEXT_PUBLIC_PLATFORM_URL || 'http://localhost:3000'}/dashboard/settings/cis-auth`}
                    target="_blank" rel="noopener noreferrer"
                    className="text-[11px] text-teal-700 font-medium underline">
                    또는 인증설정에서 등록
                  </a>
                </div>
                {certImportMsg && <p className="text-[11px] mt-1.5 text-slate-600">{certImportMsg}</p>}
              </div>
            ) : currentSource.authType === 'session' ? (
              gbccmSessionRegistered ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-600 text-lg">&#x2713;</span>
                    <div className="flex-1">
                      <p className="text-[11px] font-semibold text-emerald-800">세션쿠키 등록됨</p>
                      <p className="text-[11px] text-emerald-600 mt-0.5">
                        {gbccmSession?.savedAt && `${new Date(gbccmSession.savedAt).toLocaleString('ko-KR')} 등록`}
                        {' '}· 세션 유효시간(약 60분) 동안 재사용됩니다. 만료되면 재등록하세요.
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="text"
                      value={gbccmCookieInput}
                      onChange={(e) => setGbccmCookieInput(e.target.value)}
                      className="flex-1 px-2 py-1.5 border border-emerald-200 rounded-lg text-[11px]"
                      placeholder="세션이 만료됐으면 새 DCPU_SSID 값을 여기에 붙여넣고 재등록"
                    />
                    <button
                      type="button"
                      onClick={handleGbccmRegisterSession}
                      disabled={gbccmRegistering}
                      className="px-3 py-1.5 text-[11px] font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white"
                    >
                      {gbccmRegistering ? '등록 중…' : '재등록'}
                    </button>
                  </div>
                  {gbccmRegisterMsg && <p className="text-[11px] mt-1.5 text-slate-600">{gbccmRegisterMsg}</p>}
                  {/* 등록된 세션(=원장이 이미 로그인한 그 브라우저)으로 실제 사이트를 새 탭으로 열면
                      만료 전까지는 로그인 상태 그대로 확인 가능 — 서버가 쿠키를 주입하는 게 아니라
                      "원장 본인 브라우저에 이미 있는 gbccm.co.kr 쿠키"를 그대로 재사용하는 것뿐이라
                      경기도(accgg) WebSquare 세션 주입과 달리 안전하게 동작(단순 새 탭 열기).
                      ⚠ gbccm 은 SPA(하부 탭이 URL 하나만 씀) + cross-origin 이라 서브탭 자동이동 불가 —
                      진입 후 상단 탭에서 직접 이동. 에이전트 방식(자동로그인)은 별도창이라 미채택(2026-07-12 결정).
                      2026-07-12 실사용자 스크린샷으로 확인: U02M02T01D000 은 "예산관리"가 아니라
                      "정산/결산 > 보육통합 결산보고"(결산관리)로 열림 — 결산관리로 재배정.
                      예산관리/월회계보고는 정확한 코드가 미확인이라 안전한 기본 진입점(M01T01=회계현황,
                      docs 상 확정값)으로 열고 상단 탭에서 직접 클릭하도록 안내. */}
                  {/* ⚠ 주소는 선택된 출발지(currentSource.url) 기준 — 경북 주소를 박으면 충남에서 오작동.
                      화면 코드(m=...)는 경북 실측값이라 충남에서도 같은지는 미검증(같은 솔루션이라 확률 높음). */}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <a href={`https://www.${currentSource.url}/ccmc_2040.act?m=U02M01T01D000`} target="_blank" rel="noopener noreferrer"
                      className="px-2.5 py-1 text-[11px] font-semibold rounded-lg border border-emerald-300 bg-white hover:bg-emerald-50 text-emerald-700">
                      📊 예산관리 바로가기
                    </a>
                    <a href={`https://www.${currentSource.url}/ccmc_2040.act?m=U02M01T01D000`} target="_blank" rel="noopener noreferrer"
                      className="px-2.5 py-1 text-[11px] font-semibold rounded-lg border border-emerald-300 bg-white hover:bg-emerald-50 text-emerald-700">
                      📅 월회계보고 바로가기
                    </a>
                    <a href={`https://www.${currentSource.url}/ccmc_2040.act?m=U02M02T01D000`} target="_blank" rel="noopener noreferrer"
                      className="px-2.5 py-1 text-[11px] font-semibold rounded-lg border border-emerald-300 bg-white hover:bg-emerald-50 text-emerald-700">
                      📑 결산관리 바로가기
                    </a>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">· 결산관리는 확인된 화면으로 바로 열립니다. 예산관리·월회계보고는 아직 정확한 화면 코드가 확인되지 않아 회계현황 화면이 열리니, 상단 탭에서 직접 클릭해주세요.</p>
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-[11px] text-amber-700 font-medium">세션쿠키가 등록되지 않았습니다.</p>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    {/*
                      ⚠ 주소를 하드코딩하지 말 것 — 세션쿠키 방식 출발지가 경북/충남농협 둘이라,
                      경북 주소를 박아두면 충남 원장이 엉뚱한 사이트(경북)로 가서 없는 쿠키를 찾게 된다.
                      currentSource.url 로 선택된 출발지 주소를 그대로 쓴다.
                    */}
                    이 시스템은 로컬 보안프로그램 때문에 자동 로그인이 안 됩니다. 아래 순서로 1회만 등록하면 됩니다:<br />
                    1) 실제 브라우저로 <a href={`https://www.${currentSource.url}`} target="_blank" rel="noopener noreferrer" className="underline">{currentSource.url}</a>에 로그인<br />
                    2) F12(개발자도구) → Application → Cookies → {currentSource.url} → <b>DCPU_SSID</b> 값 복사<br />
                    3) 아래에 붙여넣고 [등록]
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="text"
                      value={gbccmCookieInput}
                      onChange={(e) => setGbccmCookieInput(e.target.value)}
                      className="flex-1 px-2 py-1.5 border border-amber-200 rounded-lg text-[11px]"
                      placeholder="DCPU_SSID 쿠키값 붙여넣기"
                    />
                    <button
                      type="button"
                      onClick={handleGbccmRegisterSession}
                      disabled={gbccmRegistering}
                      className="px-3 py-1.5 text-[11px] font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white"
                    >
                      {gbccmRegistering ? '등록 중…' : '등록'}
                    </button>
                  </div>
                  {gbccmRegisterMsg && <p className="text-[11px] mt-1.5 text-slate-600">{gbccmRegisterMsg}</p>}
                </div>
              )
            ) : (
              <>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">아이디</label>
                  <input
                    type="text"
                    value={sourceId}
                    onChange={(e) => setSourceId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-[11px]"
                    placeholder={`${currentSource.label} 아이디`}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">비밀번호</label>
                  <input
                    type="password"
                    value={sourcePw}
                    onChange={(e) => setSourcePw(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-[11px]"
                    placeholder="비밀번호"
                  />
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={saveMigrationAuth}
                    disabled={authSaving}
                    className="px-3 py-1.5 text-[11px] font-semibold rounded-lg bg-[#1A73E8] hover:bg-[#1557b0] disabled:bg-[#8ab4f8] text-white transition-colors"
                  >
                    {authSaving ? '저장 중…' : '💾 이 업체 로그인정보 저장'}
                  </button>
                  {savedAuthAt && (
                    <span className="text-[11px] text-emerald-600">
                      저장됨 · {new Date(savedAuthAt).toLocaleDateString('ko-KR')}
                    </span>
                  )}
                  {authSaveMsg && <span className="text-[11px] text-slate-500">{authSaveMsg}</span>}
                </div>
                <p className="text-[11px] text-slate-400">
                  이 업체 계정으로 로그인한 상태에서 저장하면, 다음에 이 화면 열 때 자동으로 채워집니다. (업체별로 따로 저장)
                </p>
              </>
            )}

            {/* 조회 모드 — 어린이집 현금출납부 이관 전용. 아이사랑꿈터는 상단 걸음마 예산·전표 패널 사용 → 숨김 */}
            {!isIlovechild && (source === 'gyeonggi' ? (
            <div className="space-y-2">
              {/* 🚀 자동 수집 (권장) — 캐시된 인증서로 자동로그인 → 전표 수집 → 저장 */}
              <div className="bg-indigo-50 border-2 border-indigo-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <b className="text-[11px] text-indigo-800">🚀 자동 수집 (권장)</b>
                  {ggCache?.exists
                    ? <span className="text-[10px] text-emerald-700 font-semibold">🔑 자동로그인 준비됨</span>
                    : <span className="text-[10px] text-amber-600 font-semibold">🔑 첫 수집 시 인증서 1회 확인</span>}
                </div>
                <p className="text-[10px] text-slate-500 mb-2">기간만 정하고 [데이터 수집]을 누르면 자동로그인 → 전표 수집 → 저장까지 한 번에.</p>
                <div className="flex items-center gap-1.5 mb-2 text-[11px]">
                  <select value={ggYear} onChange={e => { setGgYear(e.target.value); clearGgShown() }} className="border border-slate-300 rounded px-1.5 py-1">
                    {Array.from({ length: 6 }, (_, i) => String(curFiscalYear - i)).map(y => <option key={y} value={y}>{y}년도</option>)}
                  </select>
                  <select value={ggMonthFrom} onChange={e => { setGgMonthFrom(e.target.value); clearGgShown() }} className="border border-slate-300 rounded px-1.5 py-1">
                    {['03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '01', '02'].map(m => <option key={m} value={m}>{m}월</option>)}
                  </select>
                  <span className="text-slate-400">~</span>
                  <select value={ggMonthTo} onChange={e => { setGgMonthTo(e.target.value); clearGgShown() }} className="border border-slate-300 rounded px-1.5 py-1">
                    {['03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '01', '02'].map(m => <option key={m} value={m}>{m}월</option>)}
                  </select>
                  <span className="text-[10px] text-slate-400">← 회계연도 {ggYear}</span>
                </div>
                <button type="button" disabled={ggCollecting || loading} onClick={handleGgCollect}
                  className={`w-full py-2.5 rounded-lg text-[11px] font-bold text-white ${ggCollecting || loading ? 'bg-indigo-300' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
                  {ggCollecting ? '수집 중… (자동로그인 → 전표 조회)' : '📥 데이터 수집'}
                </button>
                <button type="button" onClick={() => handleGgScrapeLoad()} className="w-full mt-1 py-1 text-[10px] text-indigo-600 hover:underline">
                  저장된 데이터 불러오기
                </button>
              </div>

              <button type="button" onClick={() => setGgManualOpen(v => !v)}
                className="w-full text-[10px] text-slate-400 hover:text-slate-600 text-center py-0.5">
                {ggManualOpen ? '▲ 수동 방식 접기' : '또는 — 수동 방식 (엑셀/스크래핑) ▾'}
              </button>

              {ggManualOpen && (<>
              <div className="bg-teal-50 border border-teal-200 rounded-lg p-3 text-[11px] text-teal-800 leading-relaxed">
                <b>📥 accgg 엑셀 업로드 방식</b> — 에이전트·설치 불필요, 휴대폰에서도 가능
                <ol className="list-decimal ml-4 mt-1 space-y-0.5 text-slate-600">
                  <li>accgg 로그인 → <b>회계 &gt; 전표관리</b></li>
                  <li>연도·월(또는 [기간별조회]) 선택 후 좌측 상단 <b>전체 체크</b></li>
                  <li>우측 하단 <b>[전표 목록 출력]</b> → 뷰어 좌측 <b>💾 저장 → Excel</b></li>
                  <li>저장된 엑셀 파일을 아래에 올리기</li>
                </ol>
              </div>
              <label className={`w-full py-2.5 rounded-lg text-[11px] font-medium flex items-center justify-center gap-2 cursor-pointer text-white ${ggExcelBusy ? 'bg-teal-300' : 'bg-teal-500 hover:bg-teal-600'}`}>
                {ggExcelBusy ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    엑셀 분석 중...
                  </span>
                ) : '📊 accgg 전표 엑셀 올리기'}
                <input type="file" accept=".xlsx,.xls" className="hidden" disabled={loading}
                  onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; handleGyeonggiFile(f) }} />
              </label>

              {/* 또는 — 엑셀 없이 스크래핑 (고급) */}
              <button
                type="button"
                onClick={() => setGgScrapeOpen(v => !v)}
                className="w-full text-[11px] text-slate-500 hover:text-slate-700 py-1"
              >
                {ggScrapeOpen ? '▲ 접기' : '🔖 또는 — 엑셀 없이 스크래핑으로 (고급)'}
              </button>
              {ggScrapeOpen && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2">
                  <div className="text-[11px] text-slate-600 leading-relaxed">
                    엑셀 다운로드 없이 accgg 화면에서 바로 긁어옵니다. (accgg 방화벽 때문에 서버가 아닌 <b>원장님 브라우저</b>에서 실행)
                    <ol className="list-decimal ml-4 mt-1 space-y-0.5">
                      <li>accgg에 <b>로그인 → 회계 &gt; 전표관리</b> 화면까지 이동 (⚠ 로그인 화면에서 실행 금지)</li>
                      <li><b>[스크래퍼 코드 복사]</b> 클릭</li>
                      <li>그 전표관리 화면에서 <b>F12 → Console</b> → <b>붙여넣기(Ctrl+V) → Enter</b></li>
                      <li>화면에서 <b>[조회]</b> 클릭 → 우측 위 "OK - N rows sent" 뜨면 성공</li>
                      <li>여기로 돌아와 <b>[스크래핑 전표 가져오기]</b> 클릭</li>
                    </ol>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    <button
                      type="button"
                      onClick={handleGgScraperCopy}
                      className="w-full py-2 rounded-lg text-[11px] font-medium bg-indigo-600 hover:bg-indigo-700 text-white"
                    >
                      📋 스크래퍼 코드 복사
                    </button>
                    <button
                      type="button"
                      onClick={() => handleGgScrapeLoad()}
                      disabled={loading}
                      className="w-full py-2 rounded-lg text-[11px] font-medium bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-white"
                    >
                      🔖 스크래핑 전표 가져오기
                    </button>
                  </div>
                  {ggScrapeMsg && <p className="text-[11px] text-slate-600">{ggScrapeMsg}</p>}
                  <details className="text-[11px] text-slate-400">
                    <summary className="cursor-pointer">복사가 안 되면 — 코드 직접 복사</summary>
                    <textarea readOnly value={ggScraperCode(programAuth?.certName || '')} onFocus={e => e.currentTarget.select()}
                      className="w-full h-16 mt-1 p-1 border border-slate-200 rounded text-[10px] font-mono" />
                  </details>
                </div>
              )}
              </>)}
            </div>
            ) : (<>
            {source === 'incheon' && (
              <div className="bg-indigo-50 border-2 border-indigo-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <b className="text-[11px] text-indigo-800">🔐 로그인세션등록</b>
                  {incheonSessionLoading ? (
                    <span className="text-[10px] text-slate-400">확인 중…</span>
                  ) : incheonSession?.exists ? (
                    <span className="text-[10px] text-emerald-700 font-semibold">
                      ✓ 세션완료{incheonSession.savedAt && ` · ${new Date(incheonSession.savedAt).toLocaleString('ko-KR')}`}
                    </span>
                  ) : (
                    <span className="text-[10px] text-amber-600 font-semibold">✗ 미등록</span>
                  )}
                </div>
                <p className="text-[10px] text-slate-500 mb-2">
                  인증서로 1회 로그인해 세션을 확보해두면, 아래 [데이터 가져오기]가 인증서 선택 과정 없이 바로 조회합니다.
                </p>
                <button type="button" disabled={incheonRegistering} onClick={handleIncheonRegisterSession}
                  className={`w-full py-2.5 rounded-lg text-[11px] font-bold text-white ${incheonRegistering ? 'bg-indigo-300' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
                  {incheonRegistering ? '로그인 세션 등록 중… (인증서 목록 확인, 최대 5분)' : (incheonSession?.exists ? '🔄 세션 다시 등록' : '🔐 로그인세션등록')}
                </button>
                {incheonRegisterMsg && <p className="text-[11px] mt-1.5 text-slate-600">{incheonRegisterMsg}</p>}

                {/* 세션이 등록(세션완료)됐을 때만 바로가기 노출 — 에이전트가 인천시에 로그인된 상태로 해당
                    상단 탭까지 이동(공동인증서라 window.open 불가). 세션 없으면 이동 자체가 안 되므로 숨김. */}
                {incheonSession?.exists && (
                  <div className="mt-3 pt-2 border-t border-indigo-200">
                    <div className="flex flex-wrap gap-1.5">
                      <button type="button" disabled={!!incheonNavigating}
                        onClick={() => handleIncheonNavigate('예산관리')}
                        className="px-2.5 py-1 text-[11px] font-semibold rounded-lg border border-indigo-300 bg-white hover:bg-indigo-50 disabled:opacity-50 text-indigo-700">
                        📊 예산관리 바로가기
                      </button>
                      <button type="button" disabled={!!incheonNavigating}
                        onClick={() => handleIncheonNavigate('월회계보고')}
                        className="px-2.5 py-1 text-[11px] font-semibold rounded-lg border border-indigo-300 bg-white hover:bg-indigo-50 disabled:opacity-50 text-indigo-700">
                        📅 월회계보고 바로가기
                      </button>
                      <button type="button" disabled={!!incheonNavigating}
                        onClick={() => handleIncheonNavigate('결산관리')}
                        className="px-2.5 py-1 text-[11px] font-semibold rounded-lg border border-indigo-300 bg-white hover:bg-indigo-50 disabled:opacity-50 text-indigo-700">
                        📑 결산관리 바로가기
                      </button>
                    </div>
                    {incheonNavMsg && <p className="text-[11px] mt-1.5 text-slate-600">{incheonNavMsg}</p>}
                    <p className="text-[10px] text-slate-400 mt-1">· 에이전트가 인천시에 로그인된 상태로 해당 화면을 엽니다. (PC 에이전트 켜짐 필요)</p>
                  </div>
                )}
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => setMode('single')}
                className={`px-3 py-1.5 text-[11px] rounded-lg ${
                  mode === 'single'
                    ? 'bg-teal-500 text-white'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                단일 월
              </button>
              <button
                onClick={() => setMode('range')}
                className={`px-3 py-1.5 text-[11px] rounded-lg ${
                  mode === 'range'
                    ? 'bg-teal-500 text-white'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                기간 조회
              </button>
            </div>

            {mode === 'single' ? (
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">조회월</label>
                <select
                  value={yearMonth}
                  onChange={(e) => setYearMonth(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-[11px]"
                >
                  {monthOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">시작월</label>
                  <select
                    value={startYm}
                    onChange={(e) => setStartYm(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-[11px]"
                  >
                    <option value="">선택</option>
                    {monthOptions.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">종료월</label>
                  <select
                    value={endYm}
                    onChange={(e) => setEndYm(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-[11px]"
                  >
                    <option value="">선택</option>
                    {monthOptions.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <button
              onClick={handleFetch}
              disabled={loading}
              className="w-full py-2.5 bg-teal-500 text-white rounded-lg text-[11px] font-medium hover:bg-teal-600 disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  로그인 + 데이터 조회 중...
                </span>
              ) : (
                '데이터 가져오기'
              )}
            </button>
            </>))}

            {/* 저장된 데이터 불러오기 — 매핑표(MAPPING_TABLE) 있는 출발지면 자동 노출.
                ⚠ 새 출발지 추가 시 MAPPING_TABLE 엔트리 + /api/{source}/stored 프록시만 만들면
                   [매핑 코드] 버튼과 [저장된 데이터 불러오기] 버튼이 함께 자동으로 뜬다(게이팅 하드코딩 금지). */}
            {/* 경기도(gyeonggi)는 엑셀 업로드 방식이라 서버 스크래핑 저장분(/stored) 없음 → 이 버튼 숨김 */}
            {source in MAPPING_TABLE && source !== 'gyeonggi' && (
              <button
                onClick={async () => {
                  // gbccm(authType:'session')은 출발지 자체 로그인 아이디가 없음 —
                  // 서버가 auth_session 쿠키(통합e 로그인 계정)로 자동 판별하므로 userId 불필요
                  const storedUserId = currentSource.authType === 'cert'
                    ? (programAuth?.certName || '')
                    : currentSource.authType === 'session'
                      ? '__session__'
                      : sourceId
                  if (!storedUserId) { setError(currentSource.authType === 'cert' ? '등록된 인증서가 없습니다.' : '아이디를 입력하세요.'); return }
                  setLoading(true); setError('')
                  try {
                    let storedUrl = currentSource.authType === 'session'
                      ? `/api/${source}/stored?latest=1`
                      : `/api/${source}/stored?userId=${encodeURIComponent(storedUserId)}&latest=1`
                    if (mode === 'single' && yearMonth) {
                      storedUrl += `&startYm=${yearMonth}&endYm=${yearMonth}`
                    } else if (mode === 'range' && startYm && endYm) {
                      storedUrl += `&startYm=${startYm}&endYm=${endYm}`
                    }
                    const res = await fetch(storedUrl)
                    const json = await res.json()
                    if (!res.ok) throw new Error(json.error || '저장된 데이터 없음')
                    const results = json.data as CashLedgerResult[]
                    if (!results || results.length === 0) throw new Error('저장된 데이터가 없습니다')
                    // autoMap 적용
                    if (source in MAPPING_TABLE) {
                      const mapping = MAPPING_TABLE[source as keyof typeof MAPPING_TABLE]
                      const allItems = [...mapping.income, ...mapping.expense]
                      const subCodeMap: Record<string, Record<string, string>> = {
                        '1221': { '입학준비금': '1221-111', '현장학습비': '1221-112', '차량운행비': '1221-113', '부모부담행사비': '1221-121', '조석식비': '1221-131', '기타시도특성화비': '1221-141', '특성화비': '1221-141' },
                        '1324': { '누리과정지원금': '1324-1' }, '1323': { '환경개선비': '1323-1' },
                        '2142': { '퇴직금': '2142-112', '퇴직적립금': '2142-121' }, '2211': { '누리': '2211-1' },
                        '2421': { '입학준비금': '2421-111', '현장학습비': '2421-121', '차량운행비': '2421-131', '부모부담행사비': '2421-141', '조석식비': '2421-151', '기타시도특성화비': '2421-161', '특성화비': '2421-161' },
                      }
                      const mapped = results.map(r => ({
                        ...r,
                        rows: r.rows.map(row => {
                          if (row.accountCode && !row.accountCode.includes('|') && row.accountCode.length <= 8) {
                            return { ...row, accountCode: SUBCODE_TO_5DIGIT[row.accountCode] || row.accountCode }
                          }
                          const name = row.accountName.replace(/[.\s·]/g, '')
                          const match = allItems.find(m => m.by24Name.replace(/[.\s·]/g, '').trim() === name)
                          if (!match) return row
                          let code: string = match.sunote
                          const subMap = subCodeMap[code]
                          if (subMap) {
                            const bm = row.summary.match(/\[([^\]]+)\]/)
                            if (bm) { for (const [kw, sc] of Object.entries(subMap)) { if (bm[1].includes(kw)) { code = sc; break } } }
                            if (code === '2142') {
                              if (row.summary.includes('퇴직적립') || row.summary.includes('퇴직연금')) code = '2142-121'
                              else if (row.summary.includes('퇴직금')) code = '2142-112'
                              else code = '2142-121'
                            }
                          }
                          code = SUBCODE_TO_5DIGIT[code] || code
                          return { ...row, accountCode: code }
                        }),
                      }))
                      setMultiData(mapped)
                    } else {
                      setMultiData(results)
                    }
                    setData(null)
                    setTransferredYms({})
                    setUnmappedCodes([])
                    setError('')
                    setTransferResult(`저장된 데이터 불러옴: ${json.months?.length || results.length}개월, ${json.totalRows || results.reduce((s: number, r: CashLedgerResult) => s + r.rows.length, 0)}건 (${json.scrapedAt?.substring(0, 16) || ''})`)
                  } catch (e) { setError(e instanceof Error ? e.message : String(e)) }
                  finally { setLoading(false) }
                }}
                disabled={loading}
                className="w-full py-2 bg-teal-500 text-white rounded-lg text-[11px] font-medium hover:bg-teal-600 disabled:opacity-50"
              >
                저장된 데이터 불러오기
              </button>
            )}
          </div>
        </div>

        {/* 목적지: 수전자장부 — 아이사랑꿈터는 자체(page_data) 저장이라 목적지 로그인 불필요 → 숨김 */}
        {!isIlovechild && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
              <span className="text-emerald-600 font-bold text-[11px]">2</span>
            </div>
            <div className="flex-1">
              <h2 className="font-semibold text-slate-800">{destName} (목적지)</h2>
              <p className="text-[11px] text-slate-400">{isIlovechild ? '통합e 회계앱' : 'sunote.co.kr'}</p>
            </div>
            <button
              onClick={() => {
                setDeleteStartYm('')
                setDeleteEndYm('')
                setDeleteResult('')
                setShowDeleteModal(true)
              }}
              className="px-3 py-1.5 text-[11px] bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 font-medium"
            >
              현금출납부 삭제
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">아이디</label>
              <input
                type="text"
                value={sunoteId}
                onChange={(e) => setSunoteId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-[11px]"
                placeholder={`${destName} 아이디`}
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">비밀번호</label>
              <input
                type="password"
                value={sunotePw}
                onChange={(e) => setSunotePw(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-[11px]"
                placeholder="비밀번호"
              />
            </div>

            {/* 목적지(수전자장부) 로그인정보 업체별 저장 */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={saveSunoteAuth}
                disabled={sunoteSaving}
                className="px-3 py-1.5 text-[11px] font-semibold rounded-lg bg-[#1A73E8] hover:bg-[#1557b0] disabled:bg-[#8ab4f8] text-white transition-colors"
              >
                {sunoteSaving ? '저장 중…' : '💾 이 업체 로그인정보 저장'}
              </button>
              {sunoteSavedAt && (
                <span className="text-[11px] text-emerald-600">저장됨 · {new Date(sunoteSavedAt).toLocaleDateString('ko-KR')}</span>
              )}
              {sunoteSaveMsg && <span className="text-[11px] text-slate-500">{sunoteSaveMsg}</span>}
            </div>

            {/* 에러 알림 */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 animate-pulse">
                <p className="text-[11px] text-red-600 font-medium">{error}</p>
              </div>
            )}

            {/* 이관 요약 */}
            {totalRows > 0 && (
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                <p className="text-[11px] text-blue-700 font-medium">
                  이관 대상: {displayData.length}개월, {totalRows}건
                </p>
                <ul className="text-[11px] text-blue-600 mt-1 space-y-0.5">
                  {displayData.map((d) => (
                    <li key={d.yearMonth}>
                      {d.yearMonth.substring(0, 4)}년 {d.yearMonth.substring(4)}월: {d.rows.length}건
                      (수입 {fmtAmt(d.summary.monthIncome)}원 / 지출 {fmtAmt(d.summary.monthExpense)}원)
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 매핑 설정 */}
            {uniqueAccounts.length > 0 && (
              <div>
                <button
                  onClick={() => setShowMappings(!showMappings)}
                  className="w-full flex items-center justify-between px-3 py-2 bg-teal-50 border border-teal-200 rounded-lg text-[11px] text-teal-800 hover:bg-teal-100"
                >
                  <span className="font-medium">
                    계정코드 매핑 설정 ({uniqueAccounts.length}개)
                    {Object.keys(customMappings).length > 0 && (
                      <span className="ml-1 text-[11px] text-teal-600">
                        (커스텀 {Object.keys(customMappings).length}건)
                      </span>
                    )}
                  </span>
                  <svg className={`w-4 h-4 transition-transform ${showMappings ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showMappings && (
                  <div className="mt-2 border border-teal-200 rounded-lg overflow-hidden">
                    <table className="w-full text-[11px]">
                      <thead>
                        <tr className="bg-teal-50 text-teal-700">
                          <th className="px-2 py-1.5 text-left">출발지 코드</th>
                          <th className="px-2 py-1.5 text-left">계정과목</th>
                          <th className="px-2 py-1.5 text-center">건수</th>
                          <th className="px-2 py-1.5 text-left">sunote 코드</th>
                        </tr>
                      </thead>
                      <tbody>
                        {uniqueAccounts.map((acc) => (
                          <tr key={acc.code} className="border-t border-teal-100">
                            <td className="px-2 py-1.5 font-mono text-slate-700">{acc.code}</td>
                            <td className="px-2 py-1.5 text-slate-600">{acc.name}</td>
                            <td className="px-2 py-1.5 text-center text-slate-500">{acc.count}</td>
                            <td className="px-2 py-1.5">
                              <input
                                type="text"
                                value={customMappings[acc.code] ?? ''}
                                onChange={(e) => {
                                  const val = e.target.value.trim()
                                  setCustomMappings((prev) => {
                                    const next = { ...prev }
                                    if (val) {
                                      next[acc.code] = val
                                    } else {
                                      delete next[acc.code]
                                    }
                                    return next
                                  })
                                }}
                                className="w-20 px-1.5 py-0.5 border border-slate-200 rounded text-[11px] font-mono text-center focus:border-teal-400 focus:outline-none"
                                placeholder="자동"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="flex items-center gap-2 px-2 py-2 bg-teal-50/50 border-t border-teal-100">
                      <button
                        type="button"
                        onClick={saveMappings}
                        disabled={mapSaving}
                        className="px-3 py-1.5 text-[11px] font-semibold rounded-lg bg-[#1A73E8] hover:bg-[#1557b0] disabled:bg-[#8ab4f8] text-white transition-colors"
                      >
                        {mapSaving ? '저장 중…' : '💾 이 업체 매핑 저장'}
                      </button>
                      {mapSavedAt && <span className="text-[11px] text-emerald-600">저장됨 · {new Date(mapSavedAt).toLocaleDateString('ko-KR')}</span>}
                      {mapSaveMsg && <span className="text-[11px] text-slate-500">{mapSaveMsg}</span>}
                      <span className="ml-auto text-[11px] text-slate-400">저장하면 다음에 이 업체·출발지로 열 때 자동 적용</span>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
        )}
      </div>

      {/* 이관 버튼 (2열 그리드 바로 아래) — 통합e 전표관리 직접 저장은 모든 출발지 공통 */}
      {displayData.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-2">
          <h3 className="font-semibold text-slate-800 mb-1">통합e 전표관리로 저장</h3>
          <p className="text-[11px] text-slate-400 mb-3">
            sunote(수전자장부)를 거치지 않고 <b>통합e 전표관리(전표입력)</b>에 바로 저장합니다.
          </p>
          <button
            onClick={handleGbccmSaveToVoucherInput}
            disabled={gbccmSaving}
            className="w-full py-2.5 bg-emerald-600 text-white rounded-lg text-[11px] font-medium hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {gbccmSaving && (
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            통합e 전표관리로 저장 ({displayData.length}개월, {totalRows}건)
          </button>
          {gbccmSaveMsg && <p className="text-[11px] text-slate-600 pt-1">{gbccmSaveMsg}</p>}
          <p className="text-[11px] text-amber-600 pt-1">
            ⚠ 추가(append) 방식 저장입니다 — 같은 달을 여러 번 저장하면 전표가 중복될 수 있으니, 한 번만 저장해주세요.
          </p>
        </div>
      )}

      {/* sunote 이관은 출발지 authType 과 무관 — 목적지(sunote) 아이디/비번만 있으면 어떤 소스든 가능 */}
      {displayData.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-2">
          <h3 className="font-semibold text-slate-800 mb-3">sunote(수전자장부)로 이관</h3>
          {/* 전체 일괄 이관 */}
          <button
            onClick={handleTransferAll}
            disabled={transferring}
            className="w-full py-2.5 bg-emerald-600 text-white rounded-lg text-[11px] font-medium hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {transferring && (
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            전체 일괄 이관 ({displayData.length}개월, {totalRows}건)
          </button>
          {transferring && (
            <button
              onClick={handleStop}
              className="w-full py-2 bg-red-600 text-white rounded-lg text-[11px] font-medium hover:bg-red-700"
            >
              중지
            </button>
          )}
          <p className="text-[11px] font-medium text-slate-500 pt-1">또는 월별 개별 이관</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {displayData.map((d) => {
              const ym = d.yearMonth
              const label = `${ym.substring(0, 4)}년 ${ym.substring(4)}월`
              const result = transferredYms[ym]
              const isThisTransferring = transferringYm === ym
              const isDone = result && !result.startsWith('실패')
              const isFailed = result && result.startsWith('실패')

              return (
                <div key={ym} className="flex items-center gap-1">
                  <button
                    onClick={() => handleTransferMonth(ym)}
                    disabled={transferring || !!isDone}
                    className={`flex-1 py-2 rounded-lg text-[11px] font-medium ${
                      isDone
                        ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                        : isFailed
                          ? 'bg-red-100 text-red-700 border border-red-200'
                          : 'bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50'
                    }`}
                  >
                    {isThisTransferring ? (
                      <span className="flex items-center justify-center gap-1.5">
                        <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        이관 중...
                      </span>
                    ) : result ? (
                      `${label} — ${result}`
                    ) : (
                      `${label} (${d.rows.length}건)`
                    )}
                  </button>
                  {isThisTransferring && (
                    <button
                      onClick={handleStop}
                      className="px-2 py-2 bg-red-600 text-white rounded-lg text-[11px] font-medium hover:bg-red-700"
                    >
                      중지
                    </button>
                  )}
                  {isDone && !transferring && (
                    <button
                      onClick={() => setTransferredYms((prev) => {
                        const next = { ...prev }
                        delete next[ym]
                        return next
                      })}
                      className="px-2 py-2 bg-slate-200 text-slate-600 rounded-lg text-[11px] font-medium hover:bg-slate-300"
                      title="리셋"
                    >
                      ↺
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 에러 */}
      {error && (
        <AgentAwareMessage text={error} className="bg-red-50 border border-red-100 rounded-lg p-3 text-[11px] text-red-600" />
      )}

      {/* 이관 결과 */}
      {transferResult && (
        <AgentAwareMessage text={transferResult} className="bg-emerald-50 border border-emerald-100 rounded-lg p-3 text-[11px] text-emerald-700 font-medium" />
      )}

      {/* 매핑 실패 계정코드 */}
      {unmappedCodes.length > 0 && (
        <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
          <p className="text-[11px] font-semibold text-teal-800 mb-2">
            매핑 안 된 계정코드 ({unmappedCodes.length}건)
          </p>
          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-[11px] text-teal-700 border-b border-teal-200">
                <th className="py-1 text-left">월</th>
                <th className="py-1 text-left">코드</th>
                <th className="py-1 text-left">계정과목</th>
                <th className="py-1 text-left">적요</th>
              </tr>
            </thead>
            <tbody>
              {unmappedCodes.map((c, i) => (
                <tr key={i} className="border-b border-teal-100 text-teal-900">
                  <td className="py-1">{c.yearMonth || '-'}</td>
                  <td className="py-1 font-mono">{c.code}</td>
                  <td className="py-1">{c.name}</td>
                  <td className="py-1">{c.summary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 데이터 미리보기 */}
      {displayData.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-semibold text-slate-800">
              조회 결과 ({totalRows}건)
            </h3>
            <div className="flex gap-2">
              <button
                onClick={handleExcelDownload}
                className="px-3 py-1.5 bg-teal-500 text-white rounded-lg text-[11px] font-medium hover:bg-teal-600 flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                월별 엑셀
              </button>
              <button
                onClick={handleExcelDownloadAll}
                className="px-3 py-1.5 bg-teal-500 text-white rounded-lg text-[11px] font-medium hover:bg-teal-600 flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                일괄 엑셀
              </button>
            </div>
          </div>

          {displayData.map((result, di) => (
            <div key={`${result.yearMonth}-${result.rows.length}-${di}`} className="border-b border-slate-100 last:border-0">
              {/* 월별 요약 */}
              <div className="px-6 py-3 bg-slate-50 flex items-center gap-4 text-[11px]">
                <span className="font-medium text-slate-700">
                  {result.yearMonth.substring(0, 4)}년 {result.yearMonth.substring(4)}월
                </span>
                <span className="text-slate-400">|</span>
                <span className="text-slate-500">전월이월: {fmtAmt(result.summary.monthStart)}원</span>
                <span className="text-blue-600">수입: {fmtAmt(result.summary.monthIncome)}원 ({result.rows.filter(r => r.income > 0).length}건)</span>
                <span className="text-red-600">지출: {fmtAmt(result.summary.monthExpense)}원 ({result.rows.filter(r => r.expense > 0).length}건)</span>
                {result.summary.bankBalance !== undefined && (
                  <span className="text-rose-600 font-semibold" title="accgg 월말 기준 총 계좌잔액 / 회계잔액">
                    계좌잔액: {fmtAmt(result.summary.bankBalance)}원 · 회계잔액: {fmtAmt(result.summary.acctBalance ?? 0)}원
                  </span>
                )}
              </div>

              {/* 테이블 */}
              <div className="overflow-x-auto">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="bg-slate-50 text-[11px] font-semibold text-slate-500">
                      <th className="px-3 py-2 text-center w-12">일자</th>
                      <th className="px-3 py-2 text-center w-20">발행번호</th>
                      <th className="px-3 py-2 text-center w-20">코드</th>
                      <th className="px-3 py-2 text-left whitespace-nowrap">계정과목</th>
                      <th className="px-3 py-2 text-left whitespace-nowrap">세목</th>
                      <th className="px-3 py-2 text-left">적요</th>
                      <th className="px-3 py-2 text-left whitespace-nowrap">비고</th>
                      <th className="px-3 py-2 text-left whitespace-nowrap">거래처</th>
                      <th className="px-3 py-2 text-left whitespace-nowrap">결제방식</th>
                      <th className="px-3 py-2 text-left whitespace-nowrap">보조금유형</th>
                      <th className="px-3 py-2 text-center w-20 whitespace-nowrap">카드매핑</th>
                      <th className="px-3 py-2 text-center w-16 whitespace-nowrap">영수증</th>
                      <th className="px-3 py-2 text-right w-28">수입금액</th>
                      <th className="px-3 py-2 text-right w-28">지출금액</th>
                      <th className="px-3 py-2 text-right w-28">잔액</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.rows.map((row) => (
                      <tr key={`${result.yearMonth}-${row.idx}`} className="border-t border-slate-100 hover:bg-slate-50">
                        <td className="px-3 py-2 text-center text-slate-600">{row.date}</td>
                        <td className="px-3 py-2 text-center text-slate-500">{row.docNo}</td>
                        <td className="px-3 py-2 text-center font-mono text-[11px]">
                          {row.accountCode ? (
                            <span className={`font-medium px-1.5 py-0.5 rounded ${
                              row.accountCode.length >= 4
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-teal-50 text-teal-700 border border-teal-200'
                            }`}>{row.accountCode}</span>
                          ) : (
                            <input
                              type="text"
                              className="w-16 px-1 py-0.5 border border-red-300 rounded text-center text-[11px] bg-red-50"
                              placeholder="코드"
                              onChange={(e) => {
                                const val = e.target.value.trim()
                                if (data) {
                                  setData(prev => {
                                    if (!prev) return prev
                                    const newRows = prev.rows.map(r =>
                                      r.idx === row.idx ? { ...r, accountCode: val } : r
                                    )
                                    return { ...prev, rows: newRows }
                                  })
                                } else {
                                  setMultiData(prev =>
                                    prev.map(d =>
                                      d.yearMonth === result.yearMonth
                                        ? { ...d, rows: d.rows.map(r => r.idx === row.idx ? { ...r, accountCode: val } : r) }
                                        : d
                                    )
                                  )
                                }
                              }}
                            />
                          )}
                        </td>
                        <td className="px-3 py-2 text-slate-700 whitespace-nowrap">{row.accountName}</td>
                        {/* 세목이 계정과목(목)과 동일 명칭이면 숨김 */}
                        <td className="px-3 py-2 text-slate-500 text-[11px] whitespace-nowrap">{row.subAccountName && row.subAccountName !== row.accountName ? row.subAccountName : ''}</td>
                        <td className="px-3 py-2 text-slate-600">{row.summary}<GgRowExtra row={row} onOpen={(urls, i) => setGallery({ urls, idx: i })} /></td>
                        <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{row._note || ''}</td>
                        <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{row.demandCoName || ''}</td>
                        <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{row._paymentMethod || ''}</td>
                        <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{row._subsidyType || ''}</td>
                        {/* 카드매핑 컬럼 — 매핑된 전표만 빨간 C (지역형 시스템과 동일). 상세(_cardInfo)
                            없어도 있다/없다만 아는 출발지(gbccm 등)는 _cardMappingExists 로 배지만 표시 */}
                        <td className="px-3 py-2 text-center">
                          {row._cardInfo?.length ? (
                            <span
                              title={row._cardInfo.map(c => `${c.cardBank || ''} ${c.crdNo || ''} 승인 ${c.approvalNo || ''} ${c.merchant || ''} ${c.industry || ''}`).join('\n')}
                              className="inline-flex items-center justify-center w-4 h-4 rounded-sm bg-white border border-red-600 text-red-600 text-[9px] font-bold leading-none cursor-default">
                              C
                            </span>
                          ) : row._cardMappingExists ? (
                            <span
                              title="카드매핑 있음 (상세는 조회 불가)"
                              className="inline-flex items-center justify-center w-4 h-4 rounded-sm bg-white border border-amber-500 text-amber-600 text-[9px] font-bold leading-none cursor-default">
                              C
                            </span>
                          ) : ''}
                        </td>
                        {/* 영수증 존재여부만 표시 — 실제 이미지(_receiptImages)는 적요 셀의 GgRowExtra 가 따로
                            처리(썸네일+갤러리). 이미지 못 가져오는 출발지(gbccm)는 있다/없다만 아이콘으로 */}
                        <td className="px-3 py-2 text-center">
                          {!row._receiptImages?.length && row._receiptExists ? (
                            <span title="영수증 있음 (이미지는 조회 불가)" className="text-emerald-600 text-[13px]">📎</span>
                          ) : ''}
                        </td>
                        <td className="px-3 py-2 text-right text-blue-600 font-medium">
                          {row.income ? fmtAmt(row.income) : ''}
                        </td>
                        <td className="px-3 py-2 text-right text-red-600 font-medium">
                          {row.expense ? fmtAmt(row.expense) : ''}
                        </td>
                        <td className="px-3 py-2 text-right text-slate-700 font-medium">
                          {fmtAmt(row.balance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
      {/* 매핑 코드 모달 */}
      {showMappingModal && source in MAPPING_TABLE && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowMappingModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-[720px] max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div>
                <h3 className="font-bold text-slate-800">계정코드 매핑표</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {currentSource.label} → 수전자장부 | {MAPPING_TABLE[source as keyof typeof MAPPING_TABLE].pattern}
                </p>
              </div>
              <button onClick={() => setShowMappingModal(false)} className="p-1 hover:bg-slate-100 rounded-lg">
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 모달 본문 */}
            <div className="overflow-y-auto px-6 py-4 space-y-4">
              {(() => {
                const mapping = MAPPING_TABLE[source as keyof typeof MAPPING_TABLE]
                return (
                  <>
                    {/* 수입 */}
                    <div>
                      <h4 className="text-[11px] font-semibold text-blue-700 mb-2">수입</h4>
                      <table className="w-full text-[11px]">
                        <thead>
                          <tr className="bg-blue-50 text-blue-700">
                            <th className="px-2 py-1.5 text-left w-20">{currentSource.label}</th>
                            <th className="px-2 py-1.5 text-left">계정과목</th>
                            <th className="px-2 py-1.5 text-left w-20">수전자장부</th>
                            <th className="px-2 py-1.5 text-left">세목 상세</th>
                          </tr>
                        </thead>
                        <tbody>
                          {mapping.income.map((m, i) => {
                            const isGroup = 'group' in m && m.group
                            const isSub = 'sub' in m && m.sub || (m.by24.length === 7 && m.sunote.includes('-'))
                            const is4to4 = !isGroup && !isSub && m.sunote.length === 4
                            return (
                            <tr key={`${m.sunote}-${i}`} className={`border-t hover:bg-slate-50 ${isGroup ? 'border-slate-200 bg-blue-50/50' : 'border-slate-100'}`}>
                              <td className={`px-2 py-1.5 font-mono ${isSub ? 'text-slate-400 pl-4 text-[11px]' : 'text-slate-700 font-medium'}`}>{m.by24}</td>
                              <td className={`px-2 py-1.5 ${isSub ? 'text-slate-500 pl-4' : 'text-slate-600 font-medium'}`}>{m.by24Name}</td>
                              <td className={`px-2 py-1.5 font-mono font-medium ${isSub ? 'text-orange-600' : is4to4 ? 'text-blue-600' : 'text-teal-600'}`}>{m.sunote}</td>
                              <td className="px-2 py-1.5 text-slate-400">{m.sunoteNote}</td>
                            </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* 지출 */}
                    <div>
                      <h4 className="text-[11px] font-semibold text-red-700 mb-2">지출</h4>
                      <table className="w-full text-[11px]">
                        <thead>
                          <tr className="bg-red-50 text-red-700">
                            <th className="px-2 py-1.5 text-left w-20">{currentSource.label}</th>
                            <th className="px-2 py-1.5 text-left">계정과목</th>
                            <th className="px-2 py-1.5 text-left w-20">수전자장부</th>
                            <th className="px-2 py-1.5 text-left">세목 상세</th>
                          </tr>
                        </thead>
                        <tbody>
                          {mapping.expense.map((m, i) => {
                            const isGroup = 'group' in m && m.group
                            const isSub = 'sub' in m && m.sub || (m.by24.length === 7 && m.sunote.includes('-'))
                            const is4to4 = !isGroup && !isSub && m.sunote.length === 4
                            return (
                            <tr key={`${m.sunote}-${i}`} className={`border-t hover:bg-slate-50 ${isGroup ? 'border-slate-200 bg-red-50/50' : 'border-slate-100'}`}>
                              <td className={`px-2 py-1.5 font-mono ${isSub ? 'text-slate-400 pl-4 text-[11px]' : 'text-slate-700 font-medium'}`}>{m.by24}</td>
                              <td className={`px-2 py-1.5 ${isSub ? 'text-slate-500 pl-4' : 'text-slate-600 font-medium'}`}>{m.by24Name}</td>
                              <td className={`px-2 py-1.5 font-mono font-medium ${isSub ? 'text-orange-600' : is4to4 ? 'text-blue-600' : 'text-teal-600'}`}>{m.sunote}</td>
                              <td className="px-2 py-1.5 text-slate-400">{m.sunoteNote}</td>
                            </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </>
                )
              })()}
            </div>
          </div>
        </div>
      )}
      {/* 삭제 모달 */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => !deleting && setShowDeleteModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-[420px] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="font-bold text-slate-800">수전자장부 현금출납부 삭제</h3>
              <button onClick={() => !deleting && setShowDeleteModal(false)} className="p-1 hover:bg-slate-100 rounded-lg">
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              {!sunoteId || !sunotePw ? (
                <p className="text-[11px] text-red-600">수전자장부 아이디/비밀번호를 먼저 입력하세요.</p>
              ) : (
                <>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">시작월</label>
                      <select
                        value={deleteStartYm}
                        onChange={(e) => { setDeleteStartYm(e.target.value); if (!deleteEndYm) setDeleteEndYm(e.target.value) }}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-[11px]"
                      >
                        <option value="">선택</option>
                        {deleteMonthOptions.map((v) => (
                          <option key={v} value={v}>{v.substring(0, 4)}년 {parseInt(v.substring(4, 6))}월</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">종료월</label>
                      <select
                        value={deleteEndYm}
                        onChange={(e) => setDeleteEndYm(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-[11px]"
                      >
                        <option value="">선택</option>
                        {deleteMonthOptions.map((v) => (
                          <option key={v} value={v}>{v.substring(0, 4)}년 {parseInt(v.substring(4, 6))}월</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {deleteResult && (
                    <AgentAwareMessage
                      text={deleteResult}
                      className={`p-3 rounded-lg text-[11px] ${deleteResult.includes('실패') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}
                    />
                  )}
                  <button
                    disabled={!deleteStartYm || !deleteEndYm || deleting}
                    onClick={async () => {
                      setDeleting(true)
                      setDeleteResult('')
                      try {
                        // 월 목록 생성
                        const yms: string[] = []
                        let y = parseInt(deleteStartYm.substring(0, 4)), m = parseInt(deleteStartYm.substring(4, 6))
                        const ey = parseInt(deleteEndYm.substring(0, 4)), em = parseInt(deleteEndYm.substring(4, 6))
                        while (y < ey || (y === ey && m <= em)) {
                          yms.push(`${y}${String(m).padStart(2, '0')}`)
                          m++; if (m > 12) { m = 1; y++ }
                        }
                        const res = await fetch('/api/sunote/delete', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ userId: sunoteId, password: sunotePw, yearMonths: yms }),
                        })
                        const json = await res.json()
                        if (!res.ok) throw new Error(json.error || '삭제 실패')
                        setDeleteResult(`삭제 완료: ${json.deleted}건 (${yms.length}개월)`)
                      } catch (e) {
                        setDeleteResult(`삭제 실패: ${e instanceof Error ? e.message : String(e)}`)
                      } finally {
                        setDeleting(false)
                      }
                    }}
                    className="w-full py-2.5 bg-red-600 text-white rounded-lg text-[11px] font-medium hover:bg-red-700 disabled:opacity-50"
                  >
                    {deleting ? '삭제 중...' : '삭제 실행'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 영수증 갤러리 모달 */}
      {gallery && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setGallery(null)}>
          <div className="relative max-w-3xl max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <img src={gallery.urls[gallery.idx]} alt="영수증" className="max-w-full max-h-[80vh] object-contain rounded-lg bg-white" />
            <div className="flex items-center justify-between mt-2 text-white text-[12px]">
              <button onClick={() => setGallery(g => g ? { ...g, idx: (g.idx - 1 + g.urls.length) % g.urls.length } : g)}
                disabled={gallery.urls.length <= 1} className="px-3 py-1 bg-white/20 rounded disabled:opacity-30">← 이전</button>
              <span>{gallery.idx + 1} / {gallery.urls.length}</span>
              <button onClick={() => setGallery(g => g ? { ...g, idx: (g.idx + 1) % g.urls.length } : g)}
                disabled={gallery.urls.length <= 1} className="px-3 py-1 bg-white/20 rounded disabled:opacity-30">다음 →</button>
            </div>
            <button onClick={() => setGallery(null)} className="absolute -top-3 -right-3 w-8 h-8 bg-white rounded-full text-slate-700 font-bold shadow">✕</button>
          </div>
        </div>
      )}
    </div>
  )
}
