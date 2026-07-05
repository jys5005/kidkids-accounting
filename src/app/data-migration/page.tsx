'use client'

import { useState, useEffect, useRef } from 'react'
import * as XLSX from 'xlsx'
import { getActiveBook, BOOK_CHANGE_EVENT, bookLabel, ILOVECHILD_BOOKS } from '@/lib/ilovechild-books'
import { GWIN_BUDGETS } from '@/data/gwin-budgets'

interface CashLedgerRow {
  idx: number
  date: string
  docNo: string
  accountCode: string
  accountName: string
  summary: string
  income: number
  expense: number
  balance: number
  agreeDate: string
}

interface CashLedgerSummary {
  prevIncome: number
  prevExpense: number
  monthStart: number
  monthIncome: number
  monthExpense: number
}

interface CashLedgerResult {
  yearMonth: string
  rows: CashLedgerRow[]
  summary: CashLedgerSummary
}

const SOURCE_OPTIONS = [
  { value: 'by24', label: '보육나라', url: 'by24.co.kr', features: ['현금출납부'], authType: 'idpw' as const },
  { value: 'prime', label: '프라임전자장부', url: '', features: [], authType: 'idpw' as const },
  { value: 'kidshome', label: '키즈홈', url: 'ikidshome.co.kr', features: ['현금출납부'], authType: 'idpw' as const },
  { value: 'kidkids', label: '키드키즈', url: 'kidkids.net', features: [], authType: 'idpw' as const },
  { value: 'easys', label: '이편한시스템', url: '', features: [], authType: 'idpw' as const },
  { value: 'mores', label: '더편한시스템', url: '', features: [], authType: 'idpw' as const },
  { value: 'incheon', label: '인천시어린이집관리시스템', url: 'aincheon.co.kr', features: ['현금출납부'], authType: 'cert' as const },
  { value: 'seoul', label: '서울시어린이집관리시스템', url: '', features: [], authType: 'idpw' as const },
  { value: 'wisean', label: '와이즈안', url: 'waisn.wisearn.co.kr', features: ['현금출납부'], authType: 'idpw' as const },
  { value: 'ifriends', label: '아이프렌즈', url: 'i-friends.co.kr', features: ['현금출납부'], authType: 'idpw' as const },
  { value: 'walk', label: '걸음마회계', url: '', features: [], authType: 'idpw' as const },
] as const

type SourceType = typeof SOURCE_OPTIONS[number]['value']

// 보육나라 ↔ 수전자장부 매핑 테이블
const MAPPING_TABLE = {
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
} as const

function fmtAmt(n: number): string {
  if (!n) return ''
  return n.toLocaleString()
}

export default function DataMigrationPage() {
  // 출발지
  const [source, setSource] = useState<SourceType>('by24')
  // 걸음마회계 출발지는 아이사랑꿈터 유형만 노출 (어린이집은 기존 목록 그대로)
  const [isIlovechild, setIsIlovechild] = useState(false)
  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json())
      .then(d => {
        const ilove = ((d?.institutionType || d?.profile?.institutionType || 'childcare') as string) === 'ilovechild'
        setIsIlovechild(ilove)
        if (ilove) setSource('walk') // 아이사랑꿈터는 걸음마만 사용
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
        if (pick) setSource(pick as SourceType)
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
  const [yearMonth, setYearMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`
  })

  // sunote (목적지)
  const [sunoteId, setSunoteId] = useState('')
  const [sunotePw, setSunotePw] = useState('')

  // 상태
  const [loading, setLoading] = useState(false)
  const [transferring, setTransferring] = useState(false)
  const [transferringYm, setTransferringYm] = useState<string | null>(null) // 현재 이관 중인 월
  const [transferredYms, setTransferredYms] = useState<Record<string, string>>({}) // 월별 이관 결과
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
  const [deleteResult, setDeleteResult] = useState('')
  const [mode, setMode] = useState<'single' | 'range'>('single')
  const [startYm, setStartYm] = useState('')
  const [endYm, setEndYm] = useState('')

  // 프로그램 인증 정보 (등록된 정보 자동 로드)
  const [programAuth, setProgramAuth] = useState<{ authType: string; hasUserId?: boolean; hasUserPw?: boolean; certName?: string; hasCertPw?: boolean; savedAt?: string } | null>(null)
  const [authLoading, setAuthLoading] = useState(false)
  // 업체(로그인)별 저장 인증정보
  const [savedAuthAt, setSavedAuthAt] = useState('')       // 저장 시각 (있으면 "저장됨" 표시)
  const [authSaving, setAuthSaving] = useState(false)
  const [authSaveMsg, setAuthSaveMsg] = useState('')

  // 소스 변경 시 등록된 인증 정보 자동 로드
  useEffect(() => {
    setAuthLoading(true)
    setProgramAuth(null)
    fetch(`/api/settings/program-auth?programId=${source}`)
      .then(res => res.json())
      .then(json => {
        if (json.success && json.data) {
          setProgramAuth(json.data)
        }
      })
      .catch(() => {})
      .finally(() => setAuthLoading(false))
  }, [source])

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
  const [gbSelBooks, setGbSelBooks] = useState<string[]>(ILOVECHILD_BOOKS.map(b => b.code)) // 기본 3장부 전체
  const [gbPreviewByBook, setGbPreviewByBook] = useState<Record<string, GbBasis> | null>(null)
  const [gbSaving, setGbSaving] = useState(false)
  const [gbMsg, setGbMsg] = useState('')
  const [gbLoading, setGbLoading] = useState(false)
  const toggleGbBook = (code: string) => {
    setGbPreviewByBook(null); setGbMsg('')
    setGbSelBooks(prev => prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code])
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
  const loadGwinVouchers = async () => {
    if (!sourceId || !sourcePw) { setGbMsg('걸음마 아이디/비밀번호를 먼저 입력(또는 저장)하세요.'); return }
    const book = gbSelBooks[0] || 'subsidy'
    setGbVLoading(true); setGbVRows(null); setGbMsg(`걸음마 전표 조회 중(${bookLabel(book)} · ${gbYear}.${gbVFrom}~${gbVTo}월)…`)
    try {
      const res = await fetch('/api/gwin/vouchers', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ id: sourceId, password: sourcePw, book, year: gbYear, monthFrom: gbVFrom, monthTo: gbVTo }),
      })
      const j = await res.json().catch(() => ({}))
      if (j?.success && Array.isArray(j.rows)) {
        setGbVRows(j.rows); setGbVKeys(j.keys || []); setGbVBook(book)
        setGbMsg(`✅ 전표 ${j.count}건 조회 (${bookLabel(book)}, endpoint: ${j.endpoint}). 아래 미리보기 확인 후 [전표관리로 저장].`)
      } else {
        setGbVRows(null)
        setGbMsg(`❌ ${j?.error || '전표 조회 실패'}${j?.tried ? ` (시도: ${j.tried.map((t: { ep: string; status: number }) => `${t.ep.split('/').pop()}:${t.status}`).join(', ')})` : ''}`)
      }
    } catch (e) { setGbVRows(null); setGbMsg(`❌ 전표 조회 오류: ${e instanceof Error ? e.message : ''}`) }
    finally { setGbVLoading(false) }
  }
  // 별도: 가져온 전표를 전표관리(voucher-input)로 저장 — 응답 필드 확인 후 매핑 확정 예정
  const saveGwinVouchers = async () => {
    if (!gbVRows || gbVRows.length === 0) return
    setGbVSaving(true)
    try {
      const res = await fetch('/api/gwin/vouchers/save', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ book: gbVBook, year: gbYear, rows: gbVRows }),
      })
      const j = await res.json().catch(() => ({}))
      setGbMsg(j?.success ? `✅ 전표관리 저장 완료 — ${j.saved || gbVRows.length}건 (${bookLabel(gbVBook)}). 전표관리에서 확인하세요.` : `❌ ${j?.error || '전표관리 저장 실패'}`)
    } catch (e) { setGbMsg(`❌ 전표 저장 오류: ${e instanceof Error ? e.message : ''}`) }
    finally { setGbVSaving(false) }
  }
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
      const autoMap = (results: CashLedgerResult[]) => {
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
            if (row.accountCode && row.accountCode.length <= 8) return row

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
          let dateStr = r.date
          if (dateStr.length >= 8) {
            dateStr = `${dateStr.substring(0, 4)}/${dateStr.substring(4, 6)}/${dateStr.substring(6, 8)}`
          } else {
            dateStr = `${ym.substring(0, 4)}/${ym.substring(4)}/${dateStr.padStart(2, '0')}`
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
        // date: "20210309" (8자리) 또는 "9" (일자만)
        let dateStr = r.date
        if (dateStr.length >= 8) {
          dateStr = `${dateStr.substring(0, 4)}/${dateStr.substring(4, 6)}/${dateStr.substring(6, 8)}`
        } else {
          const yyyy = result.yearMonth.substring(0, 4)
          const mm = result.yearMonth.substring(4)
          dateStr = `${yyyy}/${mm}/${dateStr.padStart(2, '0')}`
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
      {/* 언더바 탭 */}
      <div className="flex items-center gap-0 border-b border-slate-200">
        <a href="/data-migration" className="px-4 py-2 text-[12px] font-bold whitespace-nowrap border-b-2 text-teal-700 border-teal-500">데이터이관</a>
        <a href="/data-migration/auto-login" className="px-4 py-2 text-[12px] font-bold whitespace-nowrap border-b-2 text-slate-400 border-transparent hover:text-slate-600 hover:border-slate-300">자동로그인</a>
      </div>
      {/* 제목 */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">데이터 이관</h1>
        <p className="text-sm text-slate-500 mt-1">
          {currentSource.label}({currentSource.url}) → {destName}{isIlovechild ? '' : '(sunote.co.kr)'} 현금출납부 이관
        </p>
      </div>

      {/* 걸음마 예산 가져오기 — 아이사랑꿈터 + 출발지 걸음마 */}
      {isIlovechild && source === 'walk' && (
        <div className="bg-white rounded-xl border-2 border-amber-200 p-5 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-amber-800 font-bold text-sm">🐤 걸음마 예산·전표 가져오기</span>
            <span className="ml-2 text-xs font-bold text-slate-600">회계연도</span>
            <select value={gbYear} onChange={e => { setGbYear(e.target.value); setGbPreviewByBook(null); setGbMsg('') }} className="border border-slate-300 rounded px-2 py-1.5 text-xs">
              <option value="2026">2026년</option><option value="2025">2025년</option><option value="2024">2024년</option>
            </select>
          </div>
          {/* 장부 선택 토글 — 3장부 동시 가져오기 (보육정보센터+보조금+이용료) */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-slate-500">가져올 장부</span>
            {ILOVECHILD_BOOKS.map(b => {
              const on = gbSelBooks.includes(b.code)
              return (
                <button key={b.code} onClick={() => toggleGbBook(b.code)}
                  className={`px-3 py-1 text-xs font-bold rounded-full border transition-colors ${on ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-slate-500 border-slate-300 hover:border-amber-400'}`}>
                  {on ? '✓ ' : ''}{b.label}
                </button>
              )
            })}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={loadGwinBudget} disabled={gbLoading} className="px-3 py-1.5 text-xs font-bold text-amber-800 bg-amber-100 border border-amber-300 rounded hover:bg-amber-200 disabled:opacity-50">{gbLoading ? '⏳ 걸음마 조회 중…' : '📥 예산 가져오기 (실시간)'}</button>
            <button onClick={saveGwinBudget} disabled={!gbPreviewByBook || gbSaving} className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-40">💾 저장</button>
            <button onClick={loadGwinBudgetStatic} className="px-2 py-1.5 text-[11px] font-bold text-slate-500 bg-white border border-slate-200 rounded hover:bg-slate-50" title="실시간 조회 실패 시 마지막 저장된 스냅샷으로 미리보기">저장 데이터로 보기</button>
            <span className="text-[11px] font-bold text-slate-500 ml-1">전표기간</span>
            <select value={gbVFrom} onChange={e => setGbVFrom(e.target.value)} className="border border-slate-300 rounded px-1.5 py-1.5 text-xs" title="시작월(회계연도 3월~익년2월)">
              {FISCAL_MONTHS.map(m => <option key={m} value={m}>{Number(m)}월{Number(m) < 3 ? '(익년)' : ''}</option>)}
            </select>
            <span className="text-slate-400 text-xs">~</span>
            <select value={gbVTo} onChange={e => setGbVTo(e.target.value)} className="border border-slate-300 rounded px-1.5 py-1.5 text-xs" title="종료월(회계연도 3월~익년2월)">
              {FISCAL_MONTHS.map(m => <option key={m} value={m}>{Number(m)}월{Number(m) < 3 ? '(익년)' : ''}</option>)}
            </select>
            <button onClick={loadGwinVouchers} disabled={gbVLoading} className="px-3 py-1.5 text-xs font-bold text-amber-800 bg-amber-100 border border-amber-300 rounded hover:bg-amber-200 disabled:opacity-50" title="걸음마 전표(현금출납부) 조회">{gbVLoading ? '⏳ 전표 조회 중…' : '🧾 전표 가져오기'}</button>
            <button onClick={saveGwinVouchers} disabled={!gbVRows || !gbVRows.length || gbVSaving} className="px-3 py-1.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded disabled:opacity-40" title="가져온 전표를 전표관리로 저장">{gbVSaving ? '저장 중…' : '📒 전표관리로 저장'}</button>
            {gbMsg && <span className={`text-xs font-semibold ${gbMsg.startsWith('❌') ? 'text-rose-600' : 'text-emerald-700'}`}>{gbMsg}</span>}
          </div>
          {gbPreviewByBook && (
            <div className="text-xs text-slate-600 bg-amber-50 rounded px-3 py-2 space-y-0.5">
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
              <div className="bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600 flex items-center gap-2">
                🧾 가져온 전표 {gbVRows.length}건 <span className="text-slate-400 font-normal">({bookLabel(gbVBook)} · {gbYear}.{gbVFrom}~{gbVTo}월) — [📒 전표관리로 저장]으로 반영</span>
              </div>
              <div className="overflow-x-auto max-h-64 overflow-y-auto">
                <table className="text-[11px] w-full">
                  <thead className="bg-slate-100 sticky top-0"><tr>{gbVKeys.map(k => <th key={k} className="px-2 py-1 text-left font-semibold text-slate-500 whitespace-nowrap border-b border-slate-200">{k}</th>)}</tr></thead>
                  <tbody>
                    {gbVRows.slice(0, 100).map((r, i) => (
                      <tr key={i} className="border-b border-slate-50 hover:bg-amber-50/40">
                        {gbVKeys.map(k => <td key={k} className="px-2 py-1 text-slate-600 whitespace-nowrap">{String(r[k] ?? '')}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {gbVRows.length > 100 && <div className="px-3 py-1 text-[10px] text-slate-400">미리보기 100건 표시 (전체 {gbVRows.length}건 저장됨)</div>}
            </div>
          )}
          <p className="text-[11px] text-slate-400">· 예산은 <b className="text-slate-600">예산관리 › 예산작성</b>에, 전표는 <b className="text-slate-600">전표관리 › 전표입력</b>에 반영됩니다.</p>
        </div>
      )}

      {/* 2열 레이아웃: 출발지 / 목적지 (아이사랑꿈터는 자체 저장 → 단일 컬럼) */}
      <div className={`grid grid-cols-1 gap-6 ${isIlovechild ? '' : 'lg:grid-cols-2'}`}>
        {/* 출발지 */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-blue-600 font-bold text-sm">1</span>
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
                  className="px-2 py-1 border border-slate-200 rounded-lg text-sm font-medium text-blue-700 bg-blue-50"
                >
                  {/* 아이사랑꿈터는 걸음마만(어린이집 이관원 제외), 어린이집은 걸음마 제외 */}
                  {SOURCE_OPTIONS.filter((o) => isIlovechild ? o.value === 'walk' : o.value !== 'walk').map((o) => (
                    <option key={o.value} value={o.value}>{o.label}{o.features.length > 0 ? '  (가능)' : ''}</option>
                  ))}
                </select>
                {source in MAPPING_TABLE && (
                  <button
                    onClick={() => setShowMappingModal(true)}
                    className="px-2 py-1 text-xs bg-violet-50 text-violet-700 border border-violet-200 rounded-lg hover:bg-violet-100 font-medium"
                  >
                    매핑 코드
                  </button>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <p className="text-xs text-slate-400">{currentSource.url}</p>
                {isIlovechild && source === 'walk' ? (
                  <span className="text-[10px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded font-medium">예산 실시간</span>
                ) : currentSource.features.length > 0 ? (
                  currentSource.features.map((f) => (
                    <span key={f} className="text-[10px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded font-medium">{f}</span>
                  ))
                ) : (
                  <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-400 rounded">준비중</span>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {/* 인증 정보 영역 */}
            {authLoading ? (
              <div className="text-xs text-slate-400 py-2">인증 정보 확인 중...</div>
            ) : programAuth ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-600 text-lg">&#x2713;</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-emerald-800">
                      {programAuth.authType === 'cert'
                        ? `인증서 등록됨: ${programAuth.certName}`
                        : '아이디/비밀번호 등록됨'}
                    </p>
                    <p className="text-xs text-emerald-600 mt-0.5">
                      통합e 인증설정에서 등록 · 바로 사용 가능
                      {programAuth.savedAt && ` · ${new Date(programAuth.savedAt).toLocaleDateString('ko-KR')}`}
                    </p>
                  </div>
                  <a href={`${process.env.NEXT_PUBLIC_PLATFORM_URL || 'http://localhost:3000'}/dashboard/settings/cis-auth`}
                    target="_blank" rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:text-blue-700 px-2 py-1 rounded hover:bg-blue-50">
                    수정
                  </a>
                </div>
              </div>
            ) : currentSource.authType === 'cert' ? (
              <div className="bg-teal-50 border border-teal-200 rounded-lg p-3">
                <p className="text-xs text-teal-700 font-medium">인증서가 등록되지 않았습니다.</p>
                <a href={`${process.env.NEXT_PUBLIC_PLATFORM_URL || 'http://localhost:3000'}/dashboard/settings/cis-auth`}
                  target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-2 text-xs text-teal-700 font-medium underline">
                  통합e 인증설정에서 등록하기
                </a>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">아이디</label>
                  <input
                    type="text"
                    value={sourceId}
                    onChange={(e) => setSourceId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    placeholder={`${currentSource.label} 아이디`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">비밀번호</label>
                  <input
                    type="password"
                    value={sourcePw}
                    onChange={(e) => setSourcePw(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    placeholder="비밀번호"
                  />
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={saveMigrationAuth}
                    disabled={authSaving}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#1A73E8] hover:bg-[#1557b0] disabled:bg-[#8ab4f8] text-white transition-colors"
                  >
                    {authSaving ? '저장 중…' : '💾 이 업체 로그인정보 저장'}
                  </button>
                  {savedAuthAt && (
                    <span className="text-xs text-emerald-600">
                      저장됨 · {new Date(savedAuthAt).toLocaleDateString('ko-KR')}
                    </span>
                  )}
                  {authSaveMsg && <span className="text-xs text-slate-500">{authSaveMsg}</span>}
                </div>
                <p className="text-[11px] text-slate-400">
                  이 업체 계정으로 로그인한 상태에서 저장하면, 다음에 이 화면 열 때 자동으로 채워집니다. (업체별로 따로 저장)
                </p>
              </>
            )}

            {/* 조회 모드 — 어린이집 현금출납부 이관 전용. 아이사랑꿈터는 상단 걸음마 예산·전표 패널 사용 → 숨김 */}
            {!isIlovechild && (<>
            <div className="flex gap-2">
              <button
                onClick={() => setMode('single')}
                className={`px-3 py-1.5 text-xs rounded-lg ${
                  mode === 'single'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                단일 월
              </button>
              <button
                onClick={() => setMode('range')}
                className={`px-3 py-1.5 text-xs rounded-lg ${
                  mode === 'range'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                기간 조회
              </button>
            </div>

            {mode === 'single' ? (
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">조회월</label>
                <select
                  value={yearMonth}
                  onChange={(e) => setYearMonth(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                >
                  {monthOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">시작월</label>
                  <select
                    value={startYm}
                    onChange={(e) => setStartYm(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  >
                    <option value="">선택</option>
                    {monthOptions.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">종료월</label>
                  <select
                    value={endYm}
                    onChange={(e) => setEndYm(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
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
              className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
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
            </>)}

            {/* 저장된 데이터 불러오기 */}
            {(source === 'kidshome' || source === 'by24' || source === 'incheon' || source === 'ifriends' || source === 'wisean') && (
              <button
                onClick={async () => {
                  const storedUserId = currentSource.authType === 'cert' ? (programAuth?.certName || '') : sourceId
                  if (!storedUserId) { setError(currentSource.authType === 'cert' ? '등록된 인증서가 없습니다.' : '아이디를 입력하세요.'); return }
                  setLoading(true); setError('')
                  try {
                    let storedUrl = `/api/${source}/stored?userId=${encodeURIComponent(storedUserId)}&latest=1`
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
                          if (row.accountCode && row.accountCode.length <= 8) return row
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
                className="w-full py-2 bg-teal-500 text-white rounded-lg text-sm font-medium hover:bg-teal-600 disabled:opacity-50"
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
              <span className="text-emerald-600 font-bold text-sm">2</span>
            </div>
            <div className="flex-1">
              <h2 className="font-semibold text-slate-800">{destName} (목적지)</h2>
              <p className="text-xs text-slate-400">{isIlovechild ? '통합e 회계앱' : 'sunote.co.kr'}</p>
            </div>
            <button
              onClick={() => {
                setDeleteStartYm('')
                setDeleteEndYm('')
                setDeleteResult('')
                setShowDeleteModal(true)
              }}
              className="px-3 py-1.5 text-xs bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 font-medium"
            >
              현금출납부 삭제
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">아이디</label>
              <input
                type="text"
                value={sunoteId}
                onChange={(e) => setSunoteId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                placeholder={`${destName} 아이디`}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">비밀번호</label>
              <input
                type="password"
                value={sunotePw}
                onChange={(e) => setSunotePw(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                placeholder="비밀번호"
              />
            </div>

            {/* 목적지(수전자장부) 로그인정보 업체별 저장 */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={saveSunoteAuth}
                disabled={sunoteSaving}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#1A73E8] hover:bg-[#1557b0] disabled:bg-[#8ab4f8] text-white transition-colors"
              >
                {sunoteSaving ? '저장 중…' : '💾 이 업체 로그인정보 저장'}
              </button>
              {sunoteSavedAt && (
                <span className="text-xs text-emerald-600">저장됨 · {new Date(sunoteSavedAt).toLocaleDateString('ko-KR')}</span>
              )}
              {sunoteSaveMsg && <span className="text-xs text-slate-500">{sunoteSaveMsg}</span>}
            </div>

            {/* 에러 알림 */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 animate-pulse">
                <p className="text-sm text-red-600 font-medium">{error}</p>
              </div>
            )}

            {/* 이관 요약 */}
            {totalRows > 0 && (
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                <p className="text-sm text-blue-700 font-medium">
                  이관 대상: {displayData.length}개월, {totalRows}건
                </p>
                <ul className="text-xs text-blue-600 mt-1 space-y-0.5">
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
                  className="w-full flex items-center justify-between px-3 py-2 bg-teal-50 border border-teal-200 rounded-lg text-sm text-teal-800 hover:bg-teal-100"
                >
                  <span className="font-medium">
                    계정코드 매핑 설정 ({uniqueAccounts.length}개)
                    {Object.keys(customMappings).length > 0 && (
                      <span className="ml-1 text-xs text-teal-600">
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
                    <table className="w-full text-xs">
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
                                className="w-20 px-1.5 py-0.5 border border-slate-200 rounded text-xs font-mono text-center focus:border-teal-400 focus:outline-none"
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
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#1A73E8] hover:bg-[#1557b0] disabled:bg-[#8ab4f8] text-white transition-colors"
                      >
                        {mapSaving ? '저장 중…' : '💾 이 업체 매핑 저장'}
                      </button>
                      {mapSavedAt && <span className="text-xs text-emerald-600">저장됨 · {new Date(mapSavedAt).toLocaleDateString('ko-KR')}</span>}
                      {mapSaveMsg && <span className="text-xs text-slate-500">{mapSaveMsg}</span>}
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

      {/* 이관 버튼 (2열 그리드 바로 아래) */}
      {displayData.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-2">
          <h3 className="font-semibold text-slate-800 mb-3">이관 실행</h3>
          {/* 전체 일괄 이관 */}
          <button
            onClick={handleTransferAll}
            disabled={transferring}
            className="w-full py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"
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
              className="w-full py-2 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700"
            >
              중지
            </button>
          )}
          <p className="text-xs font-medium text-slate-500 pt-1">또는 월별 개별 이관</p>
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
                    className={`flex-1 py-2 rounded-lg text-xs font-medium ${
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
                      className="px-2 py-2 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700"
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
                      className="px-2 py-2 bg-slate-200 text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-300"
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
        <div className="bg-red-50 border border-red-100 rounded-lg p-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* 이관 결과 */}
      {transferResult && (
        <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3">
          <p className="text-sm text-emerald-700 font-medium">{transferResult}</p>
        </div>
      )}

      {/* 매핑 실패 계정코드 */}
      {unmappedCodes.length > 0 && (
        <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
          <p className="text-sm font-semibold text-teal-800 mb-2">
            매핑 안 된 계정코드 ({unmappedCodes.length}건)
          </p>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-teal-700 border-b border-teal-200">
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
                className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                월별 엑셀
              </button>
              <button
                onClick={handleExcelDownloadAll}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 flex items-center gap-1"
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
              <div className="px-6 py-3 bg-slate-50 flex items-center gap-4 text-sm">
                <span className="font-medium text-slate-700">
                  {result.yearMonth.substring(0, 4)}년 {result.yearMonth.substring(4)}월
                </span>
                <span className="text-slate-400">|</span>
                <span className="text-slate-500">전월이월: {fmtAmt(result.summary.monthStart)}원</span>
                <span className="text-blue-600">수입: {fmtAmt(result.summary.monthIncome)}원</span>
                <span className="text-red-600">지출: {fmtAmt(result.summary.monthExpense)}원</span>
              </div>

              {/* 테이블 */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-xs font-semibold text-slate-500">
                      <th className="px-3 py-2 text-center w-12">일자</th>
                      <th className="px-3 py-2 text-center w-20">발행번호</th>
                      <th className="px-3 py-2 text-center w-20">코드</th>
                      <th className="px-3 py-2 text-left">계정과목</th>
                      <th className="px-3 py-2 text-left">세목</th>
                      <th className="px-3 py-2 text-left">적요</th>
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
                        <td className="px-3 py-2 text-center font-mono text-xs">
                          {row.accountCode ? (
                            <span className={`font-medium px-1.5 py-0.5 rounded ${
                              row.accountCode.length >= 4
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-teal-50 text-teal-700 border border-teal-200'
                            }`}>{row.accountCode}</span>
                          ) : (
                            <input
                              type="text"
                              className="w-16 px-1 py-0.5 border border-red-300 rounded text-center text-xs bg-red-50"
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
                        <td className="px-3 py-2 text-slate-700">{row.accountName}</td>
                        <td className="px-3 py-2 text-slate-500 text-xs">{(row as any).subAccountName || ''}</td>
                        <td className="px-3 py-2 text-slate-600">{row.summary}</td>
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
                <p className="text-xs text-slate-500 mt-0.5">
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
                      <h4 className="text-sm font-semibold text-blue-700 mb-2">수입</h4>
                      <table className="w-full text-xs">
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
                      <h4 className="text-sm font-semibold text-red-700 mb-2">지출</h4>
                      <table className="w-full text-xs">
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
                <p className="text-sm text-red-600">수전자장부 아이디/비밀번호를 먼저 입력하세요.</p>
              ) : (
                <>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-slate-600 mb-1">시작월</label>
                      <select
                        value={deleteStartYm}
                        onChange={(e) => { setDeleteStartYm(e.target.value); if (!deleteEndYm) setDeleteEndYm(e.target.value) }}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                      >
                        <option value="">선택</option>
                        {Array.from({ length: 36 }, (_, i) => {
                          const d = new Date(); d.setMonth(d.getMonth() - i)
                          const v = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`
                          return <option key={v} value={v}>{d.getFullYear()}년 {d.getMonth() + 1}월</option>
                        })}
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-slate-600 mb-1">종료월</label>
                      <select
                        value={deleteEndYm}
                        onChange={(e) => setDeleteEndYm(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                      >
                        <option value="">선택</option>
                        {Array.from({ length: 36 }, (_, i) => {
                          const d = new Date(); d.setMonth(d.getMonth() - i)
                          const v = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`
                          return <option key={v} value={v}>{d.getFullYear()}년 {d.getMonth() + 1}월</option>
                        })}
                      </select>
                    </div>
                  </div>
                  {deleteResult && (
                    <div className={`p-3 rounded-lg text-sm ${deleteResult.includes('실패') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                      {deleteResult}
                    </div>
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
                    className="w-full py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                  >
                    {deleting ? '삭제 중...' : '삭제 실행'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
