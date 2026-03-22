'use client'

import React, { useState } from 'react'

interface BudgetRow {
  code: string
  name: string
  amount: number
  prevAmount: number
  change: number
  level: number // 0: 대분류, 1: 중분류, 2: 소분류, 3: 세분류
  basis?: string
}

const budgetData: BudgetRow[] = [
  { code: '01', name: '보육료', amount: 186288000, prevAmount: 0, change: 186288000, level: 0 },
  { code: '11', name: '보육료', amount: 186288000, prevAmount: 0, change: 186288000, level: 1 },
  { code: '111', name: '정부지원 보육료', amount: 186288000, prevAmount: 0, change: 186288000, level: 2, basis: '0세 584,000원*6명*12월=42,048,000 / 1세 515,000원*8명*12월=49,440,000 / 2세 426,000원*10명*12월=51,120,000 / 3세 280,000원*6명*12월=20,160,000 / 5세 280,000원*7명*12월=23,520,000' },
  { code: '112', name: '부모부담 보육료', amount: 0, prevAmount: 0, change: 0, level: 2 },

  { code: '02', name: '수익자부담 수입', amount: 0, prevAmount: 0, change: 0, level: 0 },
  { code: '21', name: '선택적 보육활동비', amount: 0, prevAmount: 0, change: 0, level: 1 },
  { code: '211', name: '특별활동비', amount: 0, prevAmount: 0, change: 0, level: 2 },
  { code: '22', name: '기타 필요경비', amount: 0, prevAmount: 0, change: 0, level: 1 },
  { code: '221', name: '기타 필요경비', amount: 0, prevAmount: 0, change: 0, level: 2 },
  { code: '221-111', name: '입학준비금', amount: 0, prevAmount: 0, change: 0, level: 3 },
  { code: '221-112', name: '현장학습비', amount: 0, prevAmount: 0, change: 0, level: 3 },
  { code: '221-113', name: '차량운행비', amount: 0, prevAmount: 0, change: 0, level: 3 },
  { code: '221-121', name: '부모부담행사비', amount: 0, prevAmount: 0, change: 0, level: 3 },
  { code: '221-131', name: '아침.저녁급식비', amount: 0, prevAmount: 0, change: 0, level: 3 },
  { code: '221-141', name: '기타시도특성화비', amount: 0, prevAmount: 0, change: 0, level: 3 },

  { code: '03', name: '보조금 및 지원금', amount: 161791520, prevAmount: 0, change: 161791520, level: 0 },
  { code: '31', name: '인건비 보조금', amount: 103139520, prevAmount: 0, change: 103139520, level: 1 },
  { code: '311', name: '인건비 보조금', amount: 103139520, prevAmount: 0, change: 103139520, level: 2, basis: '보조교사 1,139,000*1명*12월=13,668,000 / 연장교사 1,139,000*1명*12월=13,668,000 / 행복도우미 1,139,000*1명*12월=13,668,000 / 사용자부담금 63,830*2명*12월=1,531,920 / 0세교사 2,479,600*1명*12월=29,755,200 / 1세교사 2,570,700*1명*12월=30,848,400' },
  { code: '32', name: '운영보조금', amount: 58652000, prevAmount: 0, change: 58652000, level: 1 },
  { code: '321', name: '기관보육료', amount: 0, prevAmount: 0, change: 0, level: 2 },
  { code: '322', name: '연장보육료', amount: 4560000, prevAmount: 0, change: 4560000, level: 2, basis: '0세 3,000*3명*20회*12월=2,160,000 / 영아반 2,000*2명*20회*12월=960,000 / 유아반 1,000*6명*20회*12월=1,440,000' },
  { code: '323', name: '공공형 운영비', amount: 0, prevAmount: 0, change: 0, level: 2 },
  { code: '324', name: '그 밖의 지원금', amount: 54092000, prevAmount: 0, change: 54092000, level: 2, basis: '방과후과정비 100,000*2반*12월=2,400,000 / 현장학습비 15,000*37명*12월=6,660,000 / 행사비 100,000*37명*1월=3,700,000 / 기타필요경비 20,000*10명*12월=2,400,000 / 친환경농산물 13,000*37명*12월=5,772,000 / 급간식 10,000*37명*12월=4,440,000 / 교재교구 1,000,000*1회=1,000,000 / 냉난방비 600,000*1회=600,000 / 누리과정 50,000*13명*12월=7,800,000 / 누리추가 70,000*13명*12월=10,920,000 / 영아반 100,000*7반*12월=8,400,000' },
  { code: '33', name: '자본 보조금', amount: 0, prevAmount: 0, change: 0, level: 1 },
  { code: '331', name: '자본보조금', amount: 0, prevAmount: 0, change: 0, level: 2 },

  { code: '04', name: '전입금', amount: 450000000, prevAmount: 0, change: 450000000, level: 0 },
  { code: '41', name: '전입금', amount: 450000000, prevAmount: 0, change: 450000000, level: 1 },
  { code: '411', name: '전입금', amount: 450000000, prevAmount: 0, change: 450000000, level: 2, basis: '전입금 450,000,000' },
  { code: '42', name: '차입금', amount: 0, prevAmount: 0, change: 0, level: 1 },
  { code: '421', name: '단기차입금', amount: 0, prevAmount: 0, change: 0, level: 2 },
  { code: '422', name: '장기차입금', amount: 0, prevAmount: 0, change: 0, level: 2 },

  { code: '05', name: '기부금', amount: 0, prevAmount: 0, change: 0, level: 0 },
  { code: '51', name: '기부금', amount: 0, prevAmount: 0, change: 0, level: 1 },
  { code: '511', name: '지정후원금', amount: 0, prevAmount: 0, change: 0, level: 2 },
  { code: '512', name: '비지정후원금', amount: 0, prevAmount: 0, change: 0, level: 2 },

  { code: '06', name: '적립금', amount: 0, prevAmount: 0, change: 0, level: 0 },
  { code: '61', name: '적립금', amount: 0, prevAmount: 0, change: 0, level: 1 },
  { code: '611', name: '적립금 처분 수입', amount: 0, prevAmount: 0, change: 0, level: 2 },

  { code: '07', name: '과년도 수입', amount: 0, prevAmount: 0, change: 0, level: 0 },
  { code: '71', name: '과년도 수입', amount: 0, prevAmount: 0, change: 0, level: 1 },
  { code: '711', name: '과년도 수입', amount: 0, prevAmount: 0, change: 0, level: 2 },

  { code: '08', name: '잡수입', amount: 1000000, prevAmount: 0, change: 1000000, level: 0 },
  { code: '81', name: '잡수입', amount: 1000000, prevAmount: 0, change: 1000000, level: 1 },
  { code: '811', name: '이자수입', amount: 1000000, prevAmount: 0, change: 1000000, level: 2, basis: '이자수입 1,000,000*1회=1,000,000' },
  { code: '812', name: '그 밖의 잡수입', amount: 0, prevAmount: 0, change: 0, level: 2 },

  { code: '09', name: '전년도 이월액', amount: 20000000, prevAmount: 0, change: 20000000, level: 0 },
  { code: '91', name: '전년도 이월액', amount: 20000000, prevAmount: 0, change: 20000000, level: 1 },
  { code: '911', name: '전년도 이월금', amount: 20000000, prevAmount: 0, change: 20000000, level: 2, basis: '전년도 이월금 20,000,000*1회=20,000,000' },
  { code: '912', name: '전년도 이월사업비', amount: 0, prevAmount: 0, change: 0, level: 2 },
]

const expenseBudgetData: BudgetRow[] = [
  { code: 'E01', name: '인건비', amount: 480000000, prevAmount: 0, change: 480000000, level: 0 },
  { code: 'E11', name: '원장인건비', amount: 48000000, prevAmount: 0, change: 48000000, level: 1 },
  { code: 'E111', name: '원장급여', amount: 42000000, prevAmount: 0, change: 42000000, level: 2 },
  { code: 'E112', name: '원장수당', amount: 6000000, prevAmount: 0, change: 6000000, level: 2 },
  { code: 'E12', name: '보육교직원인건비', amount: 300000000, prevAmount: 0, change: 300000000, level: 1 },
  { code: 'E121', name: '보육교직원급여', amount: 264000000, prevAmount: 0, change: 264000000, level: 2 },
  { code: 'E122', name: '보육교직원수당', amount: 36000000, prevAmount: 0, change: 36000000, level: 2 },
  { code: 'E13', name: '기타인건비', amount: 12000000, prevAmount: 0, change: 12000000, level: 1 },
  { code: 'E131', name: '기타 인건비', amount: 12000000, prevAmount: 0, change: 12000000, level: 2 },
  { code: 'E14', name: '법정부담금·퇴직금', amount: 120000000, prevAmount: 0, change: 120000000, level: 1 },
  { code: 'E141', name: '법정부담금', amount: 60000000, prevAmount: 0, change: 60000000, level: 2 },
  { code: 'E142', name: '퇴직금 및 퇴직적립금', amount: 60000000, prevAmount: 0, change: 60000000, level: 2 },
  { code: 'E142-111', name: '퇴직금', amount: 30000000, prevAmount: 0, change: 30000000, level: 3 },
  { code: 'E142-121', name: '퇴직적립금', amount: 30000000, prevAmount: 0, change: 30000000, level: 3 },

  { code: 'E02', name: '관리운영비', amount: 120000000, prevAmount: 0, change: 120000000, level: 0 },
  { code: 'E21', name: '기관운영비', amount: 108000000, prevAmount: 0, change: 108000000, level: 1 },
  { code: 'E211', name: '수용비 및 수수료', amount: 24000000, prevAmount: 0, change: 24000000, level: 2 },
  { code: 'E212', name: '공공요금 및 제세공과금', amount: 18000000, prevAmount: 0, change: 18000000, level: 2 },
  { code: 'E213', name: '연료비', amount: 6000000, prevAmount: 0, change: 6000000, level: 2 },
  { code: 'E214', name: '여비', amount: 1200000, prevAmount: 0, change: 1200000, level: 2 },
  { code: 'E215', name: '차량비', amount: 8400000, prevAmount: 0, change: 8400000, level: 2 },
  { code: 'E216', name: '복리후생비', amount: 3600000, prevAmount: 0, change: 3600000, level: 2 },
  { code: 'E217', name: '기타 운영비', amount: 6000000, prevAmount: 0, change: 6000000, level: 2 },
  { code: 'E217-111', name: '임대료', amount: 3000000, prevAmount: 0, change: 3000000, level: 3 },
  { code: 'E217-121', name: '건물융자금의이자', amount: 3000000, prevAmount: 0, change: 3000000, level: 3 },
  { code: 'E22', name: '업무추진비', amount: 12000000, prevAmount: 0, change: 12000000, level: 1 },
  { code: 'E218', name: '업무추진비', amount: 6000000, prevAmount: 0, change: 6000000, level: 2 },
  { code: 'E219', name: '직책급', amount: 3000000, prevAmount: 0, change: 3000000, level: 2 },
  { code: 'E220', name: '회의비', amount: 3000000, prevAmount: 0, change: 3000000, level: 2 },

  { code: 'E03', name: '보육활동비', amount: 100000000, prevAmount: 0, change: 100000000, level: 0 },
  { code: 'E31', name: '보육활동운영비', amount: 100000000, prevAmount: 0, change: 100000000, level: 1 },
  { code: 'E311', name: '교직원연수·연구비', amount: 2400000, prevAmount: 0, change: 2400000, level: 2 },
  { code: 'E312', name: '교재·교구 구입비', amount: 4800000, prevAmount: 0, change: 4800000, level: 2 },
  { code: 'E313', name: '행사비', amount: 3600000, prevAmount: 0, change: 3600000, level: 2 },
  { code: 'E314', name: '영유아복리비', amount: 2400000, prevAmount: 0, change: 2400000, level: 2 },
  { code: 'E315', name: '급식·간식재료비', amount: 48000000, prevAmount: 0, change: 48000000, level: 2 },

  { code: 'E04', name: '수익자부담 지출', amount: 60000000, prevAmount: 0, change: 60000000, level: 0 },
  { code: 'E41', name: '특별활동비', amount: 30000000, prevAmount: 0, change: 30000000, level: 1 },
  { code: 'E411', name: '특별활동비지출', amount: 30000000, prevAmount: 0, change: 30000000, level: 2 },
  { code: 'E42', name: '기타필요경비지출', amount: 30000000, prevAmount: 0, change: 30000000, level: 1 },
  { code: 'E421', name: '기타 필요경비 지출', amount: 30000000, prevAmount: 0, change: 30000000, level: 2 },
  { code: 'E421-111', name: '입학준비금', amount: 5000000, prevAmount: 0, change: 5000000, level: 3 },
  { code: 'E421-112', name: '현장학습비', amount: 8000000, prevAmount: 0, change: 8000000, level: 3 },
  { code: 'E421-113', name: '차량운행비', amount: 3000000, prevAmount: 0, change: 3000000, level: 3 },
  { code: 'E421-121', name: '부모부담행사비', amount: 5000000, prevAmount: 0, change: 5000000, level: 3 },
  { code: 'E421-131', name: '아침,저녁급식비', amount: 0, prevAmount: 0, change: 0, level: 3 },
  { code: 'E421-141', name: '기타시도특성화비', amount: 9000000, prevAmount: 0, change: 9000000, level: 3 },

  { code: 'E05', name: '적립금', amount: 0, prevAmount: 0, change: 0, level: 0 },
  { code: 'E51', name: '적립금', amount: 0, prevAmount: 0, change: 0, level: 1 },
  { code: 'E511', name: '적립금', amount: 0, prevAmount: 0, change: 0, level: 2 },

  { code: 'E06', name: '상환금', amount: 0, prevAmount: 0, change: 0, level: 0 },
  { code: 'E61', name: '차입금상환', amount: 0, prevAmount: 0, change: 0, level: 1 },
  { code: 'E611', name: '단기 차입금 상환', amount: 0, prevAmount: 0, change: 0, level: 2 },
  { code: 'E621', name: '장기 차입금 상환', amount: 0, prevAmount: 0, change: 0, level: 2 },
  { code: 'E62', name: '반환금', amount: 0, prevAmount: 0, change: 0, level: 1 },
  { code: 'E631', name: '보조금 반환금', amount: 0, prevAmount: 0, change: 0, level: 2 },
  { code: 'E632', name: '보호자 반환금', amount: 0, prevAmount: 0, change: 0, level: 2 },
  { code: 'E63', name: '전출금', amount: 0, prevAmount: 0, change: 0, level: 1 },
  { code: 'E641', name: '법인회계 전출금', amount: 0, prevAmount: 0, change: 0, level: 2 },

  { code: 'E07', name: '시설비', amount: 0, prevAmount: 0, change: 0, level: 0 },
  { code: 'E71', name: '시설비', amount: 0, prevAmount: 0, change: 0, level: 1 },
  { code: 'E711', name: '시설비', amount: 0, prevAmount: 0, change: 0, level: 2 },
  { code: 'E712', name: '시설장비 유지비', amount: 0, prevAmount: 0, change: 0, level: 2 },
  { code: 'E72', name: '자산취득비', amount: 0, prevAmount: 0, change: 0, level: 1 },
  { code: 'E721', name: '자산취득비', amount: 0, prevAmount: 0, change: 0, level: 2 },
  { code: 'E721-111', name: '차량할부금', amount: 0, prevAmount: 0, change: 0, level: 3 },
  { code: 'E721-121', name: '자산취득비', amount: 0, prevAmount: 0, change: 0, level: 3 },

  { code: 'E08', name: '과년도 지출', amount: 0, prevAmount: 0, change: 0, level: 0 },
  { code: 'E81', name: '과년도 지출', amount: 0, prevAmount: 0, change: 0, level: 1 },
  { code: 'E811', name: '과년도 지출', amount: 0, prevAmount: 0, change: 0, level: 2 },

  { code: 'E09', name: '잡지출·예비비', amount: 59079520, prevAmount: 0, change: 59079520, level: 0 },
  { code: 'E91', name: '잡지출·예비비', amount: 59079520, prevAmount: 0, change: 59079520, level: 1 },
  { code: 'E911', name: '잡지출', amount: 0, prevAmount: 0, change: 0, level: 2 },
  { code: 'E991', name: '예비비', amount: 59079520, prevAmount: 0, change: 59079520, level: 2 },
]

interface BasisItem {
  name: string
  unitPrice: number
  qty: number
  months: number
  total: number
  formula?: string
}

interface BasisData {
  code: string
  label: string
  prevAmount: number
  items: BasisItem[]
}

const basisDetails: Record<string, BasisData> = {
  '111': {
    code: '111', label: '정부지원 보육료', prevAmount: 0,
    items: [
      { name: '정부지원보육료 만0세', unitPrice: 584000, qty: 9, months: 12, total: 63072000 },
      { name: '정부지원보육료 만1세', unitPrice: 515000, qty: 10, months: 12, total: 61800000 },
      { name: '정부지원보육료 만2세', unitPrice: 426000, qty: 14, months: 12, total: 71568000 },
      { name: '정부지원보육료 만3세', unitPrice: 280000, qty: 20, months: 12, total: 67200000 },
      { name: '정부지원보육료 만4세', unitPrice: 280000, qty: 20, months: 12, total: 67200000 },
      { name: '정부지원보육료 만5세', unitPrice: 280000, qty: 20, months: 12, total: 67200000 },
      { name: '장애통합보육료', unitPrice: 634000, qty: 3, months: 12, total: 22824000 },
    ],
  },
  '112': {
    code: '112', label: '부모부담 보육료', prevAmount: 0,
    items: [
      { name: '부모부담 보육료', unitPrice: 25000000, qty: 1, months: 1, total: 25000000 },
    ],
  },
  '211': {
    code: '211', label: '특별활동비', prevAmount: 0,
    items: [
      { name: '1세 특별활동비', unitPrice: 61000, qty: 10, months: 12, total: 7320000 },
      { name: '2세 특별활동비', unitPrice: 71000, qty: 14, months: 12, total: 11928000 },
      { name: '3세 특별활동비', unitPrice: 71000, qty: 20, months: 12, total: 17040000 },
      { name: '4세 특별활동비', unitPrice: 71000, qty: 20, months: 12, total: 17040000 },
    ],
  },
  '311': {
    code: '311', label: '인건비 보조금', prevAmount: 0,
    items: [
      { name: '보조교사인건비', unitPrice: 1139000, qty: 1, months: 12, total: 13668000 },
      { name: '연장교사인건비', unitPrice: 1139000, qty: 1, months: 12, total: 13668000 },
      { name: '행복도우미', unitPrice: 1139000, qty: 1, months: 12, total: 13668000 },
      { name: '사용자부담금', unitPrice: 63830, qty: 2, months: 12, total: 1531920 },
      { name: '0세교사인건비', unitPrice: 2479600, qty: 1, months: 12, total: 29755200 },
      { name: '1세교사인건비', unitPrice: 2570700, qty: 1, months: 12, total: 30848400 },
    ],
  },
  '322': {
    code: '322', label: '연장보육료', prevAmount: 0,
    items: [
      { name: '0세 연장보육료', unitPrice: 3000, qty: 3, months: 240, total: 2160000 },
      { name: '영아반 연장보육료', unitPrice: 2000, qty: 2, months: 240, total: 960000 },
      { name: '유아반 연장보육료', unitPrice: 1000, qty: 6, months: 240, total: 1440000 },
    ],
  },
  '324': {
    code: '324', label: '그 밖의 지원금', prevAmount: 0,
    items: [
      { name: '방과후과정비', unitPrice: 100000, qty: 2, months: 12, total: 2400000 },
      { name: '현장학습비', unitPrice: 15000, qty: 37, months: 12, total: 6660000 },
      { name: '행사비', unitPrice: 100000, qty: 37, months: 1, total: 3700000 },
      { name: '기타필요경비', unitPrice: 20000, qty: 10, months: 12, total: 2400000 },
      { name: '친환경농산물지원비', unitPrice: 13000, qty: 37, months: 12, total: 5772000 },
      { name: '급간식지원금', unitPrice: 10000, qty: 37, months: 12, total: 4440000 },
      { name: '교재교구비', unitPrice: 1000000, qty: 1, months: 1, total: 1000000 },
      { name: '냉난방비', unitPrice: 600000, qty: 1, months: 1, total: 600000 },
      { name: '누리과정지원금', unitPrice: 50000, qty: 13, months: 12, total: 7800000 },
      { name: '누리과정추가지원금', unitPrice: 70000, qty: 13, months: 12, total: 10920000 },
      { name: '영아반지원금', unitPrice: 100000, qty: 7, months: 12, total: 8400000 },
    ],
  },
  '411': {
    code: '411', label: '전입금', prevAmount: 0,
    items: [
      { name: '전입금', unitPrice: 450000000, qty: 1, months: 1, total: 450000000 },
    ],
  },
  '811': {
    code: '811', label: '이자수입', prevAmount: 0,
    items: [
      { name: '이자수입', unitPrice: 1000000, qty: 1, months: 1, total: 1000000 },
    ],
  },
  '911': {
    code: '911', label: '전년도 이월금', prevAmount: 0,
    items: [
      { name: '전년도 이월금', unitPrice: 20000000, qty: 1, months: 1, total: 20000000 },
    ],
  },
}

const fmt = (n: number) => n.toLocaleString('ko-KR')

export default function BudgetCreatePage() {
  const [tab, setTab] = useState<'income' | 'expense'>('income')
  const [modalCode, setModalCode] = useState<string | null>(null)
  const [budgetStatus, setBudgetStatus] = useState('신청')
  const [basisState, setBasisState] = useState<Record<string, BasisItem[]>>(() => {
    const init: Record<string, BasisItem[]> = {}
    Object.entries(basisDetails).forEach(([code, data]) => {
      init[code] = data.items.map(item => ({
        ...item,
        formula: item.unitPrice > 0 ? `${fmt(item.unitPrice)}원*${item.qty}명*${item.months}개월` : '',
      }))
    })
    return init
  })

  const calcFormula = (expr: string): number => {
    try {
      let cleaned = expr.replace(/[원명개월회식]/g, '').replace(/,/g, '').trim()
      if (!cleaned) return 0
      // %를 /100으로 변환
      cleaned = cleaned.replace(/(\d+(?:\.\d+)?)\s*%/g, '($1/100)')
      // *와 /로 분리하여 계산
      const tokens = cleaned.split(/([*/])/)
      let result = Number(tokens[0].trim()) || 0
      for (let j = 1; j < tokens.length; j += 2) {
        const op = tokens[j]
        const val = Number(tokens[j + 1]?.replace(/[()]/g, '').trim()) || 0
        if (op === '*') result *= val
        else if (op === '/') result = val !== 0 ? result / val : 0
      }
      return Math.round(result)
    } catch { return 0 }
  }

  const updateBasisFormula = (code: string, idx: number, formula: string) => {
    setBasisState(prev => {
      const items = [...(prev[code] || [])]
      items[idx] = { ...items[idx], formula, total: calcFormula(formula) }
      return { ...prev, [code]: items }
    })
  }

  const updateBasisName = (code: string, idx: number, name: string) => {
    setBasisState(prev => {
      const items = [...(prev[code] || [])]
      items[idx] = { ...items[idx], name }
      return { ...prev, [code]: items }
    })
  }

  const addBasisRow = (code: string, afterIdx: number) => {
    setBasisState(prev => {
      const items = [...(prev[code] || [])]
      items.splice(afterIdx + 1, 0, { name: '', unitPrice: 0, qty: 0, months: 0, total: 0 })
      return { ...prev, [code]: items }
    })
  }

  const removeBasisRow = (code: string, idx: number) => {
    setBasisState(prev => ({
      ...prev,
      [code]: prev[code].filter((_, i) => i !== idx)
    }))
  }

  // 목별 합계 계산 (세부항목 합산)
  const getMokTotal = (code: string) => {
    const items = basisState[code]
    return items ? items.reduce((s, item) => s + item.total, 0) : 0
  }

  // 관/항/목 합산 계산
  const calcGroupTotal = (data: BudgetRow[], parentLevel: number, parentCode: string) => {
    let total = 0
    let found = false
    for (const row of data) {
      if (row.code === parentCode) { found = true; continue }
      if (found) {
        if (row.level <= parentLevel) break
        if (row.level === 2) {
          const mokTotal = getMokTotal(row.code)
          total += mokTotal > 0 ? mokTotal : row.amount
        }
      }
    }
    return total
  }

  const totalIncome = budgetData.filter(r => r.level === 0).reduce((s, r) => s + calcGroupTotal(budgetData, 0, r.code), 0)
  const totalExpense = expenseBudgetData.filter(r => r.level === 0).reduce((s, r) => s + calcGroupTotal(expenseBudgetData, 0, r.code), 0)

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
          <option>추경예산</option>
        </select>
        <button className="px-3 py-1.5 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded hover:bg-amber-100 transition-colors">추경하기</button>
        <button className="px-4 py-1.5 text-xs font-bold text-white bg-[#f5b800] hover:bg-[#d4a000] rounded transition-colors">조회</button>
        <select value={budgetStatus} onChange={e => setBudgetStatus(e.target.value)} className={`border rounded px-2 py-1.5 text-xs font-bold ${budgetStatus === '작성완료' ? 'border-red-300 text-red-600 bg-red-50' : budgetStatus === '작성중' ? 'border-amber-300 text-amber-600 bg-amber-50' : 'border-slate-300 text-slate-600'}`}>
          <option>신청</option>
          <option>작성중</option>
          <option>작성완료</option>
        </select>
        {budgetStatus === '작성완료' && <span className="text-[10px] font-bold text-red-500">🔒 잠금</span>}
      </div>


      {/* 탭 + 버튼 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
          <button
            onClick={() => setTab('income')}
            className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${
              tab === 'income' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            세입
          </button>
          <button
            onClick={() => setTab('expense')}
            className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${
              tab === 'expense' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            세출
          </button>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-slate-400">단위:</span>
            <label className="flex items-center gap-0.5 text-[10px] text-slate-500 cursor-pointer">
              <input type="radio" name="budgetUnit" defaultChecked className="w-3 h-3 accent-blue-600" />
              <span>원</span>
            </label>
            <label className="flex items-center gap-0.5 text-[10px] text-slate-500 cursor-pointer">
              <input type="radio" name="budgetUnit" className="w-3 h-3 accent-blue-600" />
              <span>천원</span>
            </label>
          </div>
          <button className="w-7 h-7 flex items-center justify-center bg-white hover:bg-slate-50 border border-slate-300 rounded transition-colors" title="인쇄하기">
            <svg className="w-3.5 h-3.5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2z" /></svg>
          </button>
          <button className="w-7 h-7 flex items-center justify-center bg-white hover:bg-green-50 border border-green-400 rounded transition-colors" title="엑셀다운로드">
            <svg className="w-3.5 h-3.5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          </button>
        </div>
      </div>

      {/* 예산 테이블 */}
      <div className="bg-white rounded-xl border border-slate-200">

        {/* 합계 */}
        <div className="px-4 py-2 border-b border-slate-200 flex items-center gap-4 sticky top-[33px] z-10 bg-white">
          <div className="flex items-center gap-1">
            <span className="text-xs font-bold text-slate-600">정원:</span>
            <input type="text" defaultValue="96" className="w-10 px-1 py-0.5 border border-slate-300 rounded text-xs text-center focus:outline-none focus:border-blue-400" />
            <span className="text-xs text-slate-500">명</span>
          </div>
          <div className="w-px h-4 bg-slate-200" />
          <span className="text-xs text-slate-500">세입금액: <span className="font-bold text-blue-700">{fmt(totalIncome)}</span>원</span>
          <span className="text-xs text-slate-500">세출금액: <span className="font-bold text-red-600">{fmt(totalExpense)}</span>원</span>
          <span className="text-xs text-slate-500">차이액: <span className="font-bold text-emerald-700">{fmt(totalIncome - totalExpense)}</span>원</span>
          {tab === 'income' && (
            <div className="flex items-center gap-1">
              <span className="text-xs text-slate-500">2026년2월말 잔액:</span>
              <span className="text-xs font-bold text-slate-800">{fmt(117139911)}원</span>
            </div>
          )}
          <div className="ml-auto flex items-center gap-1.5">
            <button className="px-2.5 py-1 text-[10px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded transition-colors">전달사항</button>
            <button className="px-2.5 py-1 text-[10px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded transition-colors">이전예산호출</button>
            <button className="px-2.5 py-1 text-[10px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded transition-colors">엑셀업로드</button>
            <button className="px-2.5 py-1 text-[10px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded transition-colors">일괄변경</button>
            <div className="relative group">
              <svg className="w-4 h-4 text-slate-400 cursor-pointer hover:text-slate-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
              <div className="absolute right-0 top-full mt-2 z-[9999] hidden group-hover:block pointer-events-none">
                <div className="bg-white text-slate-700 border border-slate-200 text-[11px] rounded-lg px-4 py-3 shadow-xl leading-relaxed whitespace-nowrap">
                  <div className="absolute right-3 -top-1 w-2 h-2 bg-white border-l border-t border-slate-200 rotate-45" />
                  {tab === 'income' ? (
                    <p>정부지원보육료, 인건비보조금, 기관운영비, 전입금을 일괄변경처리합니다.</p>
                  ) : (
                    <>
                      <p>원장급여, 보육교직원급여, 기타인건비, 법정부담금,</p>
                      <p>특별활동비, 기타필요경비 일괄변경처리합니다.</p>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 헤더 */}
        <div className="flex border-b border-slate-300 bg-orange-50 text-[11px] font-bold text-slate-600 sticky top-0 z-10">
          <div className="w-[80px] flex-shrink-0 border-r border-slate-200 px-2 py-2 text-center">관</div>
          <div className="w-[140px] flex-shrink-0 border-r border-slate-200 px-2 py-2 text-center">항</div>
          <div className="w-[140px] flex-shrink-0 border-r border-slate-200 px-2 py-2 text-center">목</div>
          <div className="w-[140px] flex-shrink-0 border-r border-slate-200 px-2 py-2 text-center">전년도결산액</div>
          <div className="w-[140px] flex-shrink-0 border-r border-slate-200 px-2 py-2 text-center">예산액</div>
          <div className="flex-1 px-2 py-2 text-center">세부항목(항목/내용/합계)</div>
        </div>

        {/* 데이터 */}
        <div className="overflow-x-auto">
          {(() => {
            const currentData = tab === 'income' ? budgetData : expenseBudgetData
            const locked = budgetStatus === '작성완료'
            let prevGwan = '', prevHang = ''
            return currentData.filter(r => r.level >= 2).map((row) => {
              // 관/항 표시 여부
              const rowIdx = currentData.indexOf(row)
              let gwanRow: BudgetRow | undefined, hangRow: BudgetRow | undefined
              for (let j = rowIdx - 1; j >= 0; j--) {
                if (!gwanRow && currentData[j].level === 0) gwanRow = currentData[j]
                if (!hangRow && currentData[j].level === 1) hangRow = currentData[j]
                if (gwanRow && hangRow) break
              }
              let showGwan = false, showHang = false
              if (gwanRow && gwanRow.code !== prevGwan) { showGwan = true; prevGwan = gwanRow.code }
              if (hangRow && hangRow.code !== prevHang) { showHang = true; prevHang = hangRow.code }

              const isSub = row.level === 3
              const mokTotal = getMokTotal(row.code) || row.amount
              const items = basisState[row.code] || [{ name: '', unitPrice: 0, qty: 0, months: 0, total: 0 }]

              return (
                <div key={row.code} className={`flex group/row hover:bg-blue-50/30 transition-colors ${isSub ? 'bg-slate-50/30' : ''}`}>
                  {/* 관 */}
                  <div className={`w-[80px] flex-shrink-0 border-r border-slate-200 px-2 py-2 text-center ${showGwan ? 'border-t border-slate-200' : ''}`}>
                    {showGwan && gwanRow && <span className="text-[11px] font-bold text-slate-700">{gwanRow.code}<br /><span className="text-[10px] font-medium">{gwanRow.name}</span></span>}
                  </div>
                  {/* 항 */}
                  <div className={`w-[140px] flex-shrink-0 border-r border-slate-200 px-2 py-2 text-center ${showHang ? 'border-t border-slate-200' : ''}`}>
                    {showHang && hangRow && <span className="text-[11px] font-semibold text-slate-600">{hangRow.code}<br /><span className="text-[10px] font-medium">{hangRow.name}</span></span>}
                  </div>
                  {/* 목 */}
                  <div className={`w-[140px] flex-shrink-0 border-r border-slate-200 border-t border-slate-200 px-2 py-2 flex flex-col justify-center ${isSub ? 'pl-4' : ''}`}>
                    <span className={`text-[11px] font-bold ${isSub ? 'text-slate-400' : 'text-slate-700'}`}>{row.code}</span>
                    <span className={`text-[10px] ${isSub ? 'text-slate-400' : 'text-slate-600'}`}>{row.name}</span>
                  </div>
                  {/* 전년도결산액 */}
                  <div className="w-[140px] flex-shrink-0 border-r border-slate-200 border-t border-slate-200 px-2 py-2 flex items-center justify-end">
                    <span className="text-[11px] text-slate-500">{row.prevAmount > 0 ? fmt(row.prevAmount) : ''}</span>
                  </div>
                  {/* 예산액 */}
                  <div className="w-[140px] flex-shrink-0 border-r border-slate-200 border-t border-slate-200 px-2 py-2 flex items-center justify-end">
                    <input type="text" value={fmt(mokTotal)} readOnly className="w-full px-1 py-0.5 border border-amber-300 rounded text-[11px] text-right bg-amber-50 font-bold" />
                  </div>
                  {/* 세부항목 */}
                  <div className="flex-1 divide-y divide-slate-50 border-t border-slate-200">
                    {items.map((item, i) => {
                      const isEmpty = !item.name && item.total === 0
                      const isOnly = items.length === 1
                      const rowKey = `${row.code}-${i}-${item.name}-${item.total}`
                      return (
                        <div key={rowKey} className={`flex items-center gap-1.5 px-2 py-1.5 transition-colors ${locked ? 'bg-slate-50/50' : 'hover:bg-slate-50'}`}>
                          {!locked && !isEmpty && <button onClick={() => removeBasisRow(row.code, i)} className="text-[10px] font-bold text-amber-600 bg-amber-100 hover:bg-amber-200 px-1 py-0.5 rounded flex-shrink-0 transition-colors">삭제</button>}
                          {!locked && isEmpty && <span className="w-[30px] flex-shrink-0" />}
                          <input type="checkbox" className="w-3 h-3 rounded border-slate-300 flex-shrink-0" />
                          <input type="text" value={item.name} onChange={e => updateBasisName(row.code, i, e.target.value)} disabled={locked} placeholder="항목명" className={`w-32 px-1.5 py-1 border rounded text-[11px] placeholder:text-slate-300 focus:outline-none flex-shrink-0 ${locked ? 'border-slate-100 bg-slate-50 text-slate-500' : 'border-slate-200 bg-white text-slate-700 focus:border-blue-400'}`} />
                          <input type="text" value={item.formula || ''} onChange={e => setBasisState(prev => { const its = [...(prev[row.code] || [])]; its[i] = { ...its[i], formula: e.target.value }; return { ...prev, [row.code]: its } })} onBlur={e => updateBasisFormula(row.code, i, e.target.value)} disabled={locked} placeholder="단가*수량*개월" className={`w-44 px-1.5 py-1 border rounded text-[11px] text-right placeholder:text-slate-300 focus:outline-none flex-shrink-0 ${locked ? 'border-slate-100 bg-slate-50 text-slate-500' : 'border-amber-300 bg-amber-50 focus:border-blue-400'}`} />
                          <span className="text-[11px] text-slate-400">=</span>
                          <span className="text-[11px] font-bold text-slate-800 min-w-[70px] text-right">{item.total > 0 ? fmt(item.total) : ''}</span>
                          <span className="text-[10px] text-slate-400">원</span>
                          {!locked && <button onClick={() => addBasisRow(row.code, i)} className="w-4 h-4 flex items-center justify-center rounded-full bg-green-100 text-green-600 hover:bg-green-200 text-[10px] font-bold flex-shrink-0">+</button>}
                          {!locked && !isOnly && isEmpty && <button onClick={() => removeBasisRow(row.code, i)} className="w-4 h-4 flex items-center justify-center rounded-full bg-red-100 text-red-500 hover:bg-red-200 text-[10px] font-bold flex-shrink-0">-</button>}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })
          })()}

        </div>
      </div>
    </div>
  )
}

function BasisPanel({ data, onClose }: { data: BasisData; onClose: () => void }) {
  const emptyRow: BasisItem = { name: '', unitPrice: 0, qty: 1, months: 1, total: 0 }
  const [rows, setRows] = useState<BasisItem[]>([...data.items])
  const [checked, setChecked] = useState<Set<number>>(new Set())
  const [clipboard, setClipboard] = useState<BasisItem[]>([])

  const grandTotal = rows.reduce((sum, item) => sum + item.total, 0)

  const toggleCheck = (i: number) => {
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  const toggleAll = () => {
    if (checked.size === rows.length) setChecked(new Set())
    else setChecked(new Set(rows.map((_, i) => i)))
  }

  const addRow = () => {
    setRows((prev) => [...prev, { ...emptyRow }])
  }

  const deleteRows = () => {
    if (checked.size === 0) return
    setRows((prev) => prev.filter((_, i) => !checked.has(i)))
    setChecked(new Set())
  }

  const copyRows = () => {
    if (checked.size === 0) return
    const sorted = Array.from(checked).sort((a, b) => a - b)
    setClipboard(sorted.map((i) => ({ ...rows[i] })))
  }

  const pasteRows = () => {
    if (clipboard.length === 0) return
    setRows((prev) => [...prev, ...clipboard.map((r) => ({ ...r }))])
  }

  const updateRow = (i: number, field: keyof BasisItem, value: string) => {
    setRows((prev) => {
      const next = [...prev]
      const row = { ...next[i] }
      if (field === 'name') {
        row.name = value
      } else {
        const num = Number(value.replace(/,/g, '')) || 0
        ;(row[field] as number) = num
        row.total = row.unitPrice * row.qty * row.months
      }
      next[i] = row
      return next
    })
  }

  return (
    <div className="bg-amber-50/30 border-t-2 border-b-2 border-amber-200">
      {/* 헤더 */}
      <div className="px-4 py-2.5 bg-white/80 flex items-center justify-between border-b border-amber-100">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-slate-700">세부항목(항목/내용/합계)</span>
          <span className="text-[11px] text-slate-500">항목 {rows.length}개</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={deleteRows} className={`px-2.5 py-1 text-[10px] font-bold rounded transition-colors ${checked.size > 0 ? 'text-red-600 bg-red-50 border border-red-200 hover:bg-red-100' : 'text-slate-400 bg-slate-50 border border-slate-200 cursor-not-allowed'}`}>체크삭제{checked.size > 0 && ` (${checked.size})`}</button>
          <span className="text-xs text-slate-500">합계금액: <span className="font-bold text-blue-700">{fmt(grandTotal)}</span>원</span>
          <button className="px-3 py-1 text-[11px] font-bold text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors">저장</button>
          <button onClick={onClose} className="w-6 h-6 flex items-center justify-center rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      </div>

      {/* 산출 리스트 */}
      <div className="divide-y divide-amber-100">
        {rows.map((item, i) => (
          <div key={i} className={`flex items-center gap-2 px-4 py-2 ${checked.has(i) ? 'bg-amber-100/50' : 'bg-white/60 hover:bg-white'} transition-colors`}>
            <input type="checkbox" className="w-3.5 h-3.5 rounded border-slate-300 flex-shrink-0" checked={checked.has(i)} onChange={() => toggleCheck(i)} />
            <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded flex-shrink-0">산출</span>
            <input
              type="text"
              value={item.name}
              onChange={(e) => updateRow(i, 'name', e.target.value)}
              className="w-44 px-2 py-1.5 border border-slate-200 rounded text-xs font-medium text-slate-700 focus:outline-none focus:border-blue-400 bg-white flex-shrink-0"
            />
            <input
              type="text"
              value={fmt(item.unitPrice)}
              onChange={(e) => updateRow(i, 'unitPrice', e.target.value)}
              className="w-24 px-2 py-1.5 border border-amber-300 rounded text-xs text-right bg-amber-50 focus:outline-none focus:border-blue-400 flex-shrink-0"
            />
            <span className="text-xs text-slate-400">원*</span>
            <input
              type="text"
              value={String(item.qty)}
              onChange={(e) => updateRow(i, 'qty', e.target.value)}
              className="w-10 px-1 py-1.5 border border-amber-300 rounded text-xs text-center bg-amber-50 focus:outline-none focus:border-blue-400 flex-shrink-0"
            />
            <span className="text-xs text-slate-400">명*</span>
            <input
              type="text"
              value={String(item.months)}
              onChange={(e) => updateRow(i, 'months', e.target.value)}
              className="w-10 px-1 py-1.5 border border-amber-300 rounded text-xs text-center bg-amber-50 focus:outline-none focus:border-blue-400 flex-shrink-0"
            />
            <span className="text-xs text-slate-400">개월</span>
            <span className="text-xs text-slate-500 font-bold">=</span>
            <span className="text-sm font-bold text-slate-800 min-w-[90px] text-right">{fmt(item.total)}</span>
            <span className="text-[10px] text-slate-400">원</span>
            <button onClick={addRow} className="w-5 h-5 flex items-center justify-center rounded-full bg-green-100 text-green-600 hover:bg-green-200 transition-colors flex-shrink-0 text-sm font-bold">+</button>
            <button onClick={() => { setRows(prev => prev.filter((_, idx) => idx !== i)) }} className="w-5 h-5 flex items-center justify-center rounded-full bg-red-100 text-red-500 hover:bg-red-200 transition-colors flex-shrink-0 text-sm font-bold">-</button>
          </div>
        ))}
        {rows.length === 0 && (
          <div className="px-4 py-6 text-center text-xs text-slate-400">
            <button onClick={addRow} className="px-3 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 transition-colors">+ 항목 추가</button>
          </div>
        )}
      </div>
    </div>
  )
}
