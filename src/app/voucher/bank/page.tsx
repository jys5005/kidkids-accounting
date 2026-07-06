'use client'
import React, { useState, useEffect, useCallback } from 'react'
import { ILOVECHILD_BOOKS, bookLabel } from '@/lib/ilovechild-books'

const ILOVECHILD_BOOK_CODES = ILOVECHILD_BOOKS.map(b => b.code)  // 보육정보센터·보조금·이용료

interface BankAccount {
  id: string
  bankType?: string
  bankName: string
  bankCd?: string
  alias?: string
  accountNo: string
  bizNo: string
  status: string
  loginId: string
  loginPw?: string
  queryId?: string
  safeAccount?: string
  hasAccountPw?: boolean
  hasLoginPw?: boolean
  hasQueryPw?: boolean
  hasSafePw?: boolean
  _book?: string   // 아이사랑꿈터 용도(장부): info-center/subsidy/fee
}

interface BankTransaction {
  id: number
  accountNo: string
  type: '입금' | '출금'
  date: string
  time: string
  withdrawAmt: number
  depositAmt: number
  balance: number
  sender: string
  medium: string
  branch: string
}

const fmt = (n: number) => n ? n.toLocaleString('ko-KR') : '0'
const num = (v: unknown) => Number(String(v ?? '').replace(/[^0-9.-]/g, '')) || 0

export default function BankPage() {
  const [filterYm, setFilterYm] = useState('2026-03')
  const [filterAccount, setFilterAccount] = useState('전체')
  const [sortAsc, setSortAsc] = useState(true)

  const formatDate = (d: string) => `${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}`
  const formatTime = (t: string) => `${t.slice(0,2)}:${t.slice(2,4)}:${t.slice(4,6)}`
  const [autoSave, setAutoSave] = useState(true)
  const [tradeSync, setTradeSync] = useState(true)
  const [memoSync, setMemoSync] = useState(true)
  const [showAddAccount, setShowAddAccount] = useState(false)
  const [showSpeedGuide, setShowSpeedGuide] = useState(false)
  const [speedBank, setSpeedBank] = useState('KB 국민은행')

  // ── 실데이터 연동 (통합e 은행조회 API, DATAPLEX 게이트웨이 경유) ──
  // 어린이집 = 단일 스코프(book='') / 아이사랑꿈터 = 3장부(보육정보센터·보조금·이용료) 통합
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [transactions, setTransactions] = useState<BankTransaction[]>([])
  const [isIlovechild, setIsIlovechild] = useState<boolean | null>(null)
  const [queryingId, setQueryingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const filtered = [...transactions]
    .filter(r => filterAccount === '전체' || r.accountNo === filterAccount)
    .sort((a, b) => sortAsc ? a.date.localeCompare(b.date) || a.time.localeCompare(b.time) : b.date.localeCompare(a.date) || b.time.localeCompare(a.time))
  const totalDeposit = filtered.reduce((s, r) => s + r.depositAmt, 0)
  const totalWithdraw = filtered.reduce((s, r) => s + r.withdrawAmt, 0)
  const diff = totalDeposit - totalWithdraw

  // 기관유형 판정
  useEffect(() => {
    let cancelled = false
    fetch('/api/auth/me').then(r => r.json()).then(me => {
      const itype = (me?.institutionType || me?.profile?.institutionType || 'childcare') as string
      if (!cancelled) setIsIlovechild(itype === 'ilovechild')
    }).catch(() => { if (!cancelled) setIsIlovechild(false) })
  }, [])

  const loadAccounts = useCallback(async (ilove: boolean) => {
    try {
      const url = ilove
        ? `/api/bank/accounts?books=${ILOVECHILD_BOOK_CODES.join(',')}`
        : `/api/bank/accounts?book=`
      const res = await fetch(url)
      const j = await res.json()
      setAccounts(Array.isArray(j.accounts) ? j.accounts : [])
    } catch { setAccounts([]) }
  }, [])
  useEffect(() => { if (isIlovechild !== null) loadAccounts(isIlovechild) }, [isIlovechild, loadAccounts])

  const bankList = [
    { code: '04', name: 'KB 국민은행' },
    { code: '03', name: 'IBK 기업은행' },
    { code: '11', name: 'NH 농협은행' },
    { code: '26', name: '신한은행' },
    { code: '20', name: '우리은행' },
    { code: '81', name: '하나은행' },
    { code: '71', name: '우체국예금' },
    { code: '23', name: 'SC제일은행' },
    { code: '31', name: 'iM뱅크' },
    { code: '27', name: 'citibank' },
    { code: '32', name: 'BNK 부산은행' },
    { code: '39', name: 'BNK 경남은행' },
    { code: '34', name: '광주은행' },
    { code: '37', name: '전북은행' },
    { code: '45', name: 'MG새마을금고' },
    { code: '89', name: 'KDB산업은행' },
    { code: '88', name: 'Sh 수협은행' },
    { code: '35', name: '제주은행' },
    { code: '48', name: '신협' },
    { code: '91', name: 'Kbank' },
  ]

  const speedGuideData: Record<string, { title: string; url: string; notice: string; section1Label: string; section1: string[]; section2Label: string; section2: string[] }> = {
    'KB 국민은행': {
      title: 'KB국민은행 빠른계좌조회 등록 절차', url: 'http://www.kbstar.com',
      notice: '[사전 인터넷뱅킹 가입 필수]\n(은행별 필요서류 또는 방문여부가 상이할 수 있으니 꼭히 직접 체크하시기 바랍니다.)',
      section1Label: '개인뱅킹', section1: ['국민은행 홈페이지(http://www.kbstar.com)에 접속', '공인인증서를 통한 인터넷뱅킹에 로그인', '[뱅킹관리 > 계좌관리 > 빠른조회서비스]에서 신청'],
      section2Label: '기업뱅킹', section2: ['국민은행 홈페이지(http://www.kbstar.com)에 접속', '공인인증서를 통한 인터넷뱅킹에 로그인', '[뱅킹관리 > 통지/편의서비스 신청 > 빠른조회관리 > 빠른계좌 등록]에서 신청'],
    },
    'IBK 기업은행': {
      title: '기업은행 빠른조회 등록 절차', url: 'http://www.ibk.co.kr',
      notice: '[사전 인터넷뱅킹 가입 필수\n(은행별 필요서류 또는 방문여부가 상이할 수 있으니 필히 직접 체크하시기 바랍니다.)]',
      section1Label: '개인뱅킹', section1: ['기업은행 홈페이지(http://www.ibk.co.kr)에 접속', '공인인증서를 통한 인터넷뱅킹에 로그인', '[뱅킹관리 > 계좌관리 > 빠른계좌조회서비스 신청/해지]에서 신청'],
      section2Label: '기업뱅킹', section2: ['기업은행 홈페이지(http://www.ibk.co.kr)에 접속', '공인인증서를 통한 인터넷뱅킹에 로그인', '[뱅킹관리 > 계좌관리 > 빠른계좌조회서비스 신청/해지]에서 신청'],
    },
    'NH 농협은행': {
      title: '농협 빠른조회 등록 절차', url: 'http://banking.nonghyup.com',
      notice: '[사전 인터넷뱅킹 가입 필수\n(은행별 필요서류 또는 방문여부가 상이할 수 있으니 필히 직접 체크하시기 바랍니다.)]',
      section1Label: '개인뱅킹', section1: ['농협 개인뱅킹(http://banking.nonghyup.com)에 접속', '공인인증서를 통한 인터넷뱅킹에 로그인', '[뱅킹관리 > 뱅킹서비스관리 > 빠른조회 등록/해지]에서 등록'],
      section2Label: '기업뱅킹', section2: ['농협 기업뱅킹(http://ibz.nonghyup.com)에 접속', '공인인증서를 통한 인터넷뱅킹에 로그인', '[기업인터넷뱅킹 > 뱅킹관리 > 계좌관리 > 빠른조회 계좌관리]에서 등록'],
    },
    '신한은행': {
      title: '신한은행 간편서비스 등록 절차', url: 'https://www.shinhan.com',
      notice: '[사전 인터넷뱅킹 가입 필수\n(은행별 필요서류 또는 방문여부가 상이할 수 있으니 필히 직접 체크하시기 바랍니다.)]',
      section1Label: '개인뱅킹', section1: ['신한은행 홈페이지(https://www.shinhan.com)에 접속 > 개인 (오른쪽 상단)', '좌측중앙 [간편조회서비스] > [계좌조회] > 로그인(홈페이지 회원 아이디와 비밀번호 필요)', '로그인후 좌측상단 [계좌조회] > [간편계좌관리] > [간편계좌조회 추가하기]\n\n참고> 홈페이지 회원이 아닌 경우 [회원가입]후 로그인 - [회원가입] > [개인회원가입]에서 회원가입'],
      section2Label: '기업뱅킹', section2: ['신한은행 홈페이지(https://www.shinhan.com)에 접속 > 기업 (오른쪽 상단)', '좌측중앙 [간편서비스] > [계좌조회] > 로그인(홈페이지 회원 아이디와 비밀번호 필요)', '로그인후 좌측상단 [계좌조회] > [간편계좌관리] > [간편계좌조회 추가하기]\n\n참고> 홈페이지 회원이 아닌 경우 [회원가입] 후 로그인 - [회원가입] > [기업회원가입]에서 회원가입'],
    },
    '우리은행': {
      title: '우리은행 스피드조회 등록 절차', url: 'http://www.wooribank.com',
      notice: '[사전 인터넷뱅킹 가입 필수\n(은행별 필요서류 또는 방문여부가 상이할 수 있으니 필히 직접 체크하시기 바랍니다.)]',
      section1Label: '개인뱅킹', section1: ['우리은행 홈페이지(http://www.wooribank.com)에 접속', '공인인증서를 통한 인터넷뱅킹에 로그인', '[뱅킹관리 > 뱅킹계좌관리 > 스피드조회계좌등록/해지]에서 신청'],
      section2Label: '기업뱅킹', section2: ['우리은행 홈페이지(http://www.wooribank.com)에 접속', '공인인증서를 통한 인터넷뱅킹에 로그인', '[뱅킹관리 > 계좌관리 > 스피드조회계좌등록/해지]에서 신청'],
    },
    '하나은행': {
      title: '하나은행 빠른조회 등록 절차', url: 'http://www.kebhana.com',
      notice: '[사전 인터넷뱅킹 가입 필수\n(은행별 필요서류 또는 방문여부가 상이할 수 있으니 필히 직접 체크하시기 바랍니다.)]',
      section1Label: '개인뱅킹', section1: ['KEB하나은행 홈페이지(http://www.kebhana.com)에 접속', '공인인증서를 통한 인터넷뱅킹에 로그인', '[마이하나 > 계좌정보관리 > 빠른조회관리]에서 신청'],
      section2Label: '기업뱅킹', section2: ['KEB하나은행 홈페이지(http://www.kebhana.com)에 접속', '공인인증서를 통한 인터넷뱅킹에 로그인 - 기업/CMS 로 분류되며, CMS인 경우 지점방문 후 신청해야 합니다.', '[뱅킹관리 > 계좌관리 > 빠른조회계좌관리]에서 신청'],
    },
    '우체국예금': {
      title: '우체국 스피드조회 등록 절차', url: 'http://www.epostbank.go.kr',
      notice: '[사전 인터넷뱅킹 가입 필수\n(은행별 필요서류 또는 방문여부가 상이할 수 있으니 필히 직접 체크하시기 바랍니다.)]',
      section1Label: '개인뱅킹', section1: ['우체국 홈페이지(http://www.epostbank.go.kr)에 접속', '[예금간편서비스 > 간편조회계좌등록]에서 등록'],
      section2Label: '기업뱅킹', section2: ['우체국 홈페이지(http://www.epostbank.go.kr)에 접속', '[예금간편서비스 > 간편조회계좌등록]에서 등록'],
    },
    'SC제일은행': {
      title: '스탠다드차타드은행 스피드조회 등록 절차', url: 'https://www.standardchartered.co.kr',
      notice: '[사전 인터넷뱅킹 가입 필수\n(은행별 필요서류 또는 방문여부가 상이할 수 있으니 필히 직접 체크하시기 바랍니다.)]',
      section1Label: '개인뱅킹', section1: ['스탠다드차타드은행 홈페이지(https://www.standardchartered.co.kr)에 접속', '공인인증서를 통한 인터넷뱅킹에 로그인', '인터넷뱅킹 가입고객 : [서비스 및 설정 > 통장관리 > 스피드조회등록]에서 신청'],
      section2Label: '기업뱅킹', section2: ['스탠다드차타드은행 홈페이지(https://www.standardchartered.co.kr)에 접속', '공인인증서를 통한 인터넷뱅킹에 로그인', '- First Biz 가입고객 : [이용자관리 > 관리자 업무 > 계좌정보관리 > 스피드계좌관리]에서 등록\n- Straight2Bank 가입고객 : [관리자화면 > 계좌정보관리 > 스피드계좌등록/해지]에서 등록'],
    },
    'iM뱅크': {
      title: 'iM뱅크(구 대구은행) 안전계좌조회 등록 절차', url: 'https://www.imbank.co.kr',
      notice: '[사전 인터넷뱅킹 가입 필수]\n(은행별 필요서류 또는 방문여부가 상이할 수 있으니 꼭히 직접 체크하시기 바랍니다.)',
      section1Label: '개인뱅킹', section1: ['iM뱅크 홈페이지(https://www.imbank.co.kr)에 접속', '[뻐른조회 > 안전계좌] > [계좌신청]에서 등록'],
      section2Label: '기업뱅킹', section2: ['iM뱅크 홈페이지(https://www.imbank.co.kr)에 접속', '[뻐른조회 > 안전계좌] > [계좌신청]에서 등록'],
    },
    'citibank': {
      title: '씨티은행 빠른조회 등록 절차', url: 'http://www.citibank.co.kr',
      notice: '[사전 인터넷뱅킹 가입 필수\n(은행별 필요서류 또는 방문여부가 상이할 수 있으니 필히 직접 체크하시기 바랍니다.)]',
      section1Label: '개인뱅킹', section1: ['해당없음'],
      section2Label: '기업뱅킹', section2: ['씨티은행 홈페이지(http://www.citibank.co.kr)에 접속', '[법인 로그인 > 웹회원가입 > 기업인터넷뱅킹 > 인증서 로그인> CAT-i 메뉴 > 이용자관리 > 빠른조회서비스]에서 등록'],
    },
    'BNK 부산은행': {
      title: '부산은행 빠른조회 등록 절차', url: 'http://www.busanbank.co.kr',
      notice: '[사전 인터넷뱅킹 가입 필수\n(은행별 필요서류 또는 방문여부가 상이할 수 있으니 필히 직접 체크하시기 바랍니다.)]',
      section1Label: '개인뱅킹', section1: ['부산은행 홈페이지(http://www.busanbank.co.kr)에 접속', '공인인증서를 통한 인터넷뱅킹에 로그인', '[메인화면중앙 > 빠른조회서비스 > 개인빠른조회 계좌등록]에서 등록'],
      section2Label: '기업뱅킹', section2: ['부산은행 홈페이지(http://www.busanbank.co.kr)에 접속', '공인인증서를 통한 인터넷뱅킹에 로그인', '[메인화면중앙 > 빠른조회서비스 > 기업빠른조회 계좌등록]에서 등록'],
    },
    'BNK 경남은행': {
      title: '경남은행 빠른조회 등록 절차', url: 'http://www.knbank.co.kr',
      notice: '[사전 인터넷뱅킹 가입 필수\n(은행별 필요서류 또는 방문여부가 상이할 수 있으니 필히 직접 체크하시기 바랍니다.)]',
      section1Label: '개인뱅킹', section1: ['경남은행 홈페이지(http://www.knbank.co.kr)에 접속', '공인인증서를 통한 인터넷뱅킹에 로그인', '[왼쪽상단 My Banking > 계좌관리> 빠른서비스 계좌관리]에서 등록'],
      section2Label: '기업뱅킹', section2: ['경남은행 홈페이지(http://www.knbank.co.kr)에 접속', '공인인증서를 통한 인터넷뱅킹에 로그인', '[왼쪽상단 My Banking > 계좌관리> 빠른서비스 계좌관리]에서 등록'],
    },
    '광주은행': {
      title: '광주은행 빠른조회 등록 절차', url: 'http://www.kjbank.com',
      notice: '[사전 인터넷뱅킹 가입 필수\n(은행별 필요서류 또는 방문여부가 상이할 수 있으니 필히 직접 체크하시기 바랍니다.)]',
      section1Label: '개인뱅킹', section1: ['광주은행 홈페이지(http://www.kjbank.com)에 접속', '공인인증서를 통한 인터넷뱅킹에 로그인', '[마이뱅킹관리 > 계좌통합관리 > 빠른서비스 사용계좌관리]에서 등록'],
      section2Label: '기업뱅킹', section2: ['광주은행 홈페이지(http://www.kjbank.com)에 접속', '공인인증서를 통한 인터넷뱅킹에 로그인', '[사용자관리 > 계좌통합관리 > 빠른서비스 계좌등록]에서 등록'],
    },
    '전북은행': {
      title: '전북은행 빠른조회 등록 절차', url: 'http://www.jbbank.co.kr',
      notice: '[사전 인터넷뱅킹 가입 필수\n(은행별 필요서류 또는 방문여부가 상이할 수 있으니 필히 직접 체크하시기 바랍니다.)]',
      section1Label: '개인뱅킹', section1: ['전북은행 홈페이지(http://www.jbbank.co.kr)에 접속', '공인인증서를 통한 인터넷뱅킹에 로그인', '[뱅킹관리 > 계좌관리 > 바로바로서비스 계좌관리]에서 등록'],
      section2Label: '기업뱅킹', section2: ['전북은행 홈페이지(http://www.jbbank.co.kr)에 접속', '공인인증서를 통한 인터넷뱅킹에 로그인', '[뱅킹관리 > 계좌관리 > 바로바로서비스 계좌관리]에서 등록'],
    },
    'MG새마을금고': {
      title: '새마을금고 즉시조회 등록 절차', url: 'http://www.kfcc.co.kr',
      notice: '[사전 인터넷뱅킹 가입 필수\n(은행별 필요서류 또는 방문여부가 상이할 수 있으니 필히 직접 체크하시기 바랍니다.)]',
      section1Label: '개인뱅킹', section1: ['새마을금고 홈페이지(http://www.kfcc.co.kr)에 접속', '공인인증서를 통한 인터넷뱅킹에 로그인', '[개인정보관리 > 즉시조회 계좌관리]에서 신청'],
      section2Label: '기업뱅킹', section2: ['새마을금고 홈페이지(http://www.kfcc.co.kr)에 접속', '공인인증서를 통한 인터넷뱅킹에 로그인', '[뱅킹관리 > 즉시조회계좌등록/해제]에서 신청 (OTP필요)'],
    },
    'KDB산업은행': {
      title: '산업은행 빠른조회 등록 절차', url: 'http://www.kdb.co.kr',
      notice: '[사전 인터넷뱅킹 가입 필수 (은행별 필요서류 또는 방문여부가 상이할 수 있으니 필히 직접 체크하시기 바랍니다.)]',
      section1Label: '개인뱅킹', section1: ['산업은행 홈페이지(http://www.kdb.co.kr)에 접속', '공인인증서를 통한 인터넷뱅킹에 로그인', '[뱅킹관리 > 계좌관리 > 계좌관리]에서 등록'],
      section2Label: '기업뱅킹', section2: ['산업은행 홈페이지(http://www.kdb.co.kr)에 접속', '공인인증서를 통한 인터넷뱅킹에 로그인', '- [기업뱅킹 (USB1개 사용) : 뱅킹관리 > 계좌관리 > 빠른조회대상계좌설정]에서 등록\n- [기업뱅킹 (USB2개 이상) : 대표관리자 인터넷뱅킹접속 > 뱅킹관리 > 계좌관리 > 빠른조회대상계좌설정]에서 등록'],
    },
    'Sh 수협은행': {
      title: '수협 간편조회 등록 절차', url: 'http://www.suhyup-bank.com',
      notice: '[사전 인터넷뱅킹 가입 필수 (은행별 필요서류 또는 방문여부가 상이할 수 있으니 필히 직접 체크하시기 바랍니다.)]',
      section1Label: '개인뱅킹', section1: ['수협 홈페이지(http://www.suhyup-bank.com)에 접속', '공인인증서를 통한 인터넷뱅킹에 로그인', '[MY정보 > 계좌정보관리 > 간편조회서비스]에서 등록'],
      section2Label: '기업뱅킹', section2: ['수협 홈페이지(http://www.suhyup-bank.com)에 접속', '공인인증서를 통한 인터넷뱅킹에 로그인', '[MY정보 > 계좌정보관리 > 간편조회서비스]에서 등록'],
    },
    '제주은행': {
      title: '제주은행 바로바로서비스 등록 절차', url: 'https://www.jejubank.co.kr',
      notice: '[사전 인터넷뱅킹 가입 필수 (은행별 필요서류 또는 방문여부가 상이할 수 있으니 필히 직접 체크하시기 바랍니다.)]',
      section1Label: '개인뱅킹', section1: ['제주은행 홈페이지(https://www.jejubank.co.kr)에 접속', '공인인증서를 통한 인터넷뱅킹에 로그인', '[사용자관리 > 바로바로서비스 신청]에서 신청'],
      section2Label: '기업뱅킹', section2: ['제주은행 홈페이지(https://www.jejubank.co.kr)에 접속', '공인인증서를 통한 인터넷뱅킹에 로그인', '[사용자관리 > 바로바로서비스 신청]에서 신청'],
    },
    '신협': {
      title: '신협 조회전용서비스 등록 절차', url: 'http://openbank.cu.co.kr',
      notice: '[사전 인터넷뱅킹 가입 필수 (은행별 필요서류 또는 방문여부가 상이할 수 있으니 필히 직접 체크하시기 바랍니다.)]',
      section1Label: '개인뱅킹', section1: ['신협 홈페이지(http://openbank.cu.co.kr/)에 접속', '좌측중앙[조회전용 > 조회전용서비스 > 신규 > 계좌등록/해지]에서 등록'],
      section2Label: '기업뱅킹', section2: ['신협 홈페이지(https://bizbank.cu.co.kr)에 접속', '로그인 하단 ->조회전용로그인-> 조회전용서비스 가입'],
    },
    'Kbank': {
      title: '케이뱅크 간편서비스 등록 절차', url: 'https://biz.kbanknow.com',
      notice: '[사전 인터넷뱅킹 가입 필수 (은행별 필요서류 또는 방문여부가 상이할 수 있으니 필히 직접 체크하시기 바랍니다.)]',
      section1Label: '개인뱅킹', section1: ['해당없음.'],
      section2Label: '기업뱅킹', section2: ['케이뱅크(https://biz.kbanknow.com/)는 별도의 빠른조회서비스가 없으며', '케이뱅크 계좌정보를 정확히 입력하시면 인터넷뱅킹을 통해 조회가 가능합니다.'],
    },
  }

  const [newAccount, setNewAccount] = useState({
    book: '', bankType: '법인', bankName: '국민은행', alias: '', accountNo: '', accountPw: '', bizNo: '', loginId: '', queryId: '', queryPw: '', safeAccount: '', safeAccountPw: ''
  })
  const [editId, setEditId] = useState<string | null>(null)
  const reload = () => loadAccounts(!!isIlovechild)

  const saveAccount = async () => {
    if (!newAccount.bankName || !newAccount.accountNo) { setMsg('은행명과 계좌번호는 필수입니다.'); return }
    if (isIlovechild && !newAccount.book) { setMsg('용도(장부)를 선택하세요.'); return }
    setSaving(true); setMsg('')
    try {
      const res = await fetch('/api/bank/accounts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ book: isIlovechild ? newAccount.book : '', account: { ...newAccount, id: editId || undefined } }),
      })
      const j = await res.json()
      if (!res.ok || j.error) { setMsg(j.error || '저장 실패'); return }
      setShowAddAccount(false); setEditId(null)
      await reload()
    } catch (e) { setMsg(e instanceof Error ? e.message : String(e)) }
    finally { setSaving(false) }
  }

  const openAdd = () => {
    setEditId(null)
    setNewAccount({ book: isIlovechild ? ILOVECHILD_BOOK_CODES[0] : '', bankType: '법인', bankName: '국민은행', alias: '', accountNo: '', accountPw: '', bizNo: '', loginId: '', queryId: '', queryPw: '', safeAccount: '', safeAccountPw: '' })
    setShowAddAccount(true)
  }
  const openEdit = (a: BankAccount) => {
    setEditId(a.id)
    setNewAccount({
      book: a._book || '', bankType: a.bankType || '법인', bankName: a.bankName, alias: a.alias || '',
      accountNo: a.accountNo, accountPw: '', bizNo: a.bizNo || '',
      loginId: a.loginId || '', queryId: a.queryId || '', queryPw: '',
      safeAccount: a.safeAccount || '', safeAccountPw: '',
    })
    setShowAddAccount(true)
  }
  const deleteAccount = async (a: BankAccount) => {
    if (!confirm(`${a.bankName} ${a.accountNo} 계좌를 삭제할까요?`)) return
    await fetch(`/api/bank/accounts?book=${encodeURIComponent(a._book || '')}&id=${encodeURIComponent(a.id)}`, { method: 'DELETE' })
    await reload()
  }

  const queryAccount = async (a: BankAccount) => {
    setQueryingId(a.id); setMsg('')
    try {
      const res = await fetch('/api/bank/query', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ book: a._book || '', accountId: a.id, ym: filterYm }),
      })
      const j = await res.json()
      if (!j.success) { setMsg(`[${a.bankName} ${a.accountNo}] 조회 실패: ${j.errMsg || '알 수 없는 오류'}`); return }
      const acctNo = j.acctNo || a.accountNo
      const rows: BankTransaction[] = (j.rows || []).map((r: Record<string, string>, i: number) => {
        const inAmt = num(r.inAmt), outAmt = num(r.outAmt)
        return {
          id: Date.now() + i,
          accountNo: acctNo,
          type: (inAmt > 0 ? '입금' : '출금') as '입금' | '출금',
          date: String(r.trDt || '').replace(/[^0-9]/g, '').slice(0, 8),
          time: String(r.trTm || '').replace(/[^0-9]/g, '').padEnd(6, '0').slice(0, 6),
          withdrawAmt: outAmt, depositAmt: inAmt, balance: num(r.balance),
          sender: r.trNm || '', medium: r.trTp || '', branch: r.trBr || '',
        }
      })
      setTransactions(prev => [...prev.filter(t => t.accountNo !== acctNo), ...rows])
      setFilterAccount(acctNo)
      setMsg(rows.length === 0 ? `[${a.bankName} ${acctNo}] ${filterYm} 거래내역 0건` : `[${a.bankName} ${acctNo}] ${rows.length}건 조회 완료`)
    } catch (e) { setMsg(e instanceof Error ? e.message : String(e)) }
    finally { setQueryingId(null) }
  }

  return (
    <div className="p-6 space-y-5">
      {/* 자동저장 안내 */}
      <div className="bg-white rounded-xl border border-teal-400/30 shadow-sm px-5 py-4 space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative group">
            <button onClick={() => setAutoSave(!autoSave)} className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-lg transition-all shadow-sm border ${autoSave ? 'text-white bg-teal-600 border-teal-600 hover:bg-teal-700' : 'text-slate-500 bg-gradient-to-b from-slate-50 to-slate-100 border-slate-300 hover:from-slate-100 hover:to-slate-200'}`}>
              <svg className={`w-4 h-4 ${autoSave ? 'text-white' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              거래 내역 자동저장 {autoSave ? '해지' : '설정'}
              <svg className={`w-3.5 h-3.5 ${autoSave ? 'text-white/60' : 'text-slate-400/60'}`} fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
            </button>
            <div className="absolute left-0 top-full mt-2 w-80 bg-white text-slate-700 text-[11px] leading-relaxed border border-slate-200 rounded-lg px-4 py-3 shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-30">
              <div className="absolute -top-1.5 left-6 w-3 h-3 bg-white border-l border-t border-slate-200 rotate-45"></div>
              <div className="flex gap-2">
                <svg className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-500" fill="currentColor" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"/><path d="M12 15h2v2h-2zm0-8h2v6h-2z"/></svg>
                <div>
                  <p>위의 [거래 내역 자동저장 설정하기] 설정을 클릭하시면</p>
                  <p>간편등록에서 은행거래내역을 별도로 고객님이 저장할 필요없이 자동으로 은행계좌 거래내역이 장부에 등록됩니다.</p>
                  <p className="mt-1">[거래 내역 자동저장 해지하기]를 클릭하시면 기존 방법인 수동으로 장부에 저장할 수 있습니다.</p>
                </div>
              </div>
            </div>
          </div>
          <div className="relative group/trade">
            <button onClick={() => setTradeSync(!tradeSync)} className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-lg transition-all shadow-sm border ${tradeSync ? 'text-white bg-teal-600 border-teal-600 hover:bg-teal-700' : 'text-slate-500 bg-gradient-to-b from-slate-50 to-slate-100 border-slate-300 hover:from-slate-100 hover:to-slate-200'}`}>
              <svg className={`w-4 h-4 ${tradeSync ? 'text-white' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
              거래 내역 저장시 적요를 거래처에 동시 저장 {tradeSync ? '해지' : '설정'}
              <svg className={`w-3.5 h-3.5 ${tradeSync ? 'text-white/60' : 'text-slate-400/60'}`} fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
            </button>
            <div className="absolute left-0 top-full mt-2 w-96 bg-white text-slate-700 text-[11px] leading-relaxed border border-slate-200 rounded-lg px-4 py-3 shadow-lg opacity-0 group-hover/trade:opacity-100 pointer-events-none transition-opacity z-30">
              <div className="absolute -top-1.5 left-6 w-3 h-3 bg-white border-l border-t border-slate-200 rotate-45"></div>
              <div className="flex gap-2">
                <svg className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-500" fill="currentColor" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"/><path d="M12 15h2v2h-2zm0-8h2v6h-2z"/></svg>
                <p>거래 내역 저장 시 [거래 내역 저장 시 적요를 거래처에 함께 저장 설정하기] 을 클릭하시면 은행 적요항목이 장부의 거래처에 자동 저장됩니다.</p>
              </div>
            </div>
          </div>
          <div className="relative group/memo">
            <button onClick={() => setMemoSync(!memoSync)} className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-lg transition-all shadow-sm border ${memoSync ? 'text-white bg-teal-600 border-teal-600 hover:bg-teal-700' : 'text-slate-500 bg-gradient-to-b from-slate-50 to-slate-100 border-slate-300 hover:from-slate-100 hover:to-slate-200'}`}>
              <svg className={`w-4 h-4 ${memoSync ? 'text-white' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              적요내용 자동저장 {memoSync ? '해지' : '설정'}
              <svg className={`w-3.5 h-3.5 ${memoSync ? 'text-white/60' : 'text-slate-400/60'}`} fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
            </button>
            <div className="absolute left-0 top-full mt-2 w-96 bg-white text-slate-700 text-[11px] leading-relaxed border border-slate-200 rounded-lg px-4 py-3 shadow-lg opacity-0 group-hover/memo:opacity-100 pointer-events-none transition-opacity z-30">
              <div className="absolute -top-1.5 left-6 w-3 h-3 bg-white border-l border-t border-slate-200 rotate-45"></div>
              <div className="flex gap-2">
                <svg className="w-4 h-4 mt-0.5 flex-shrink-0 text-orange-500" fill="currentColor" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"/><path d="M12 15h2v2h-2zm0-8h2v6h-2z"/></svg>
                <p>거래 내역 저장 시 [적요내용 자동저장 ***] 을 클릭하시면 은행 적요항목이 장부의 거래처에 자동 저장/미저장 됩니다.</p>
              </div>
            </div>
          </div>
        </div>
        <p className="text-[11px] text-slate-400 mt-1">각각 버튼을 클릭하면 설정/해지가 변경됩니다.</p>
      </div>

      {/* 계좌정보 목록 */}
      <div className="bg-white rounded-xl border border-teal-400/30 shadow-sm">
        <div className="px-5 py-3 border-b border-teal-400/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[teal-400]">🏦</span>
            <span className="text-sm font-semibold text-slate-700">계좌정보 목록</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={openAdd} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-teal-500 hover:bg-[#e0a800] border border-teal-400 rounded transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
              계좌추가
            </button>
            <button onClick={() => setShowSpeedGuide(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              빠른계좌조회방법
            </button>
          </div>
        </div>
        <div className="overflow-auto">
          <table className="w-full text-[11px]" style={{ tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: '10%' }} />
              <col style={{ width: '16%' }} />
              <col style={{ width: '16%' }} />
              <col style={{ width: '9%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '13%' }} />
            </colgroup>
            <thead>
              <tr className="bg-teal-50 border-b border-teal-400/20">
                {isIlovechild && <th className="text-center px-2 py-2.5 font-normal text-slate-600 whitespace-nowrap">용도</th>}
                <th className="text-center px-2 py-2.5 font-normal text-slate-600 whitespace-nowrap">은행명</th>
                <th className="text-center px-2 py-2.5 font-normal text-slate-600 whitespace-nowrap">계좌번호</th>
                <th className="text-center px-2 py-2.5 font-normal text-slate-600 whitespace-nowrap">사업자번호(주민번호)</th>
                <th className="text-center px-2 py-2.5 font-normal text-slate-600 whitespace-nowrap">조회상태</th>
                <th className="text-center px-2 py-2.5 font-normal text-slate-600 whitespace-nowrap">로그인아이디</th>
                <th className="text-center px-2 py-2.5 font-normal text-slate-600 whitespace-nowrap">로그인비밀번호</th>
                <th className="text-center px-2 py-2.5 font-normal text-slate-600 whitespace-nowrap">조회</th>
                <th className="text-center px-2 py-2.5 font-normal text-slate-600 whitespace-nowrap">관리</th>
              </tr>
            </thead>
            <tbody>
              {accounts.length === 0 && (
                <tr><td colSpan={isIlovechild ? 9 : 8} className="text-center px-2 py-6 text-slate-400 text-xs">등록된 계좌가 없습니다. [계좌추가]로 빠른조회 등록 계좌를 추가하세요.</td></tr>
              )}
              {accounts.map((a) => (
                <tr key={a.id} className="border-b border-teal-400/10 hover:bg-teal-50">
                  {isIlovechild && (
                    <td className="text-center px-2 py-2.5">
                      <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-teal-100 text-teal-700">{bookLabel(a._book)}</span>
                    </td>
                  )}
                  <td className="text-center px-2 py-2.5 text-slate-700 text-xs">{a.bankName}</td>
                  <td className="text-center px-2 py-2.5 text-slate-700 font-mono text-xs">{a.accountNo}</td>
                  <td className="text-center px-2 py-2.5 text-slate-700 font-mono text-xs">{a.bizNo}</td>
                  <td className="text-center px-2 py-2.5 text-slate-500 text-xs">{a.status || '-'}</td>
                  <td className="text-center px-2 py-2.5 text-slate-700 text-xs">{a.queryId || a.loginId || '-'}</td>
                  <td className="text-center px-2 py-2.5 text-slate-400 text-xs">{(a.hasQueryPw || a.hasLoginPw || a.hasAccountPw || a.hasSafePw) ? '••••' : '-'}</td>
                  <td className="text-center px-2 py-2.5">
                    <button onClick={() => queryAccount(a)} disabled={queryingId === a.id} className="px-4 py-1.5 text-xs font-bold text-white bg-teal-500 hover:bg-[#e0a800] rounded border border-teal-400 transition-colors disabled:opacity-50">
                      {queryingId === a.id ? '조회 중…' : '조회'}
                    </button>
                  </td>
                  <td className="text-center px-2 py-2.5">
                    <div className="flex items-center justify-center gap-1.5">
                      <button onClick={() => openEdit(a)} className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-200 hover:bg-slate-300 border border-slate-300 rounded transition-colors">수정</button>
                      <button onClick={() => deleteAccount(a)} className="px-2 py-1.5 text-xs font-bold text-red-500 hover:text-red-700 hover:underline transition-colors">삭제</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 검색/필터 바 */}
      <div className="bg-white rounded-xl border border-teal-400/30 shadow-sm">
        <div className="px-5 py-3 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-600 font-semibold">년월</span>
            <input
              type="month"
              value={filterYm}
              onChange={e => setFilterYm(e.target.value)}
              className="px-2 py-1.5 text-xs border border-slate-300 rounded bg-white"
            />
            <select
              value={filterAccount}
              onChange={e => setFilterAccount(e.target.value)}
              className="px-2 py-1.5 text-xs border border-slate-300 rounded bg-white"
            >
              <option value="전체">계좌전체</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.accountNo}>{isIlovechild && a._book ? `[${bookLabel(a._book)}] ` : ''}{a.bankName} {a.accountNo}</option>
              ))}
            </select>
            <select className="px-2 py-1.5 text-xs border border-slate-300 rounded bg-white">
              <option>기본</option>
              <option>환불</option>
            </select>
            <button className="px-3 py-1.5 text-xs font-bold text-white bg-blue-500 hover:bg-blue-600 rounded transition-colors">검색</button>
            <button className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-200 hover:bg-slate-300 border border-slate-300 rounded transition-colors">삭제</button>
            <button className="px-2.5 py-1.5 text-slate-600 bg-white hover:bg-slate-50 border border-slate-300 rounded transition-colors" title="인쇄">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18.75 12h.008v.008h-.008V12zm-3 0h.008v.008h-.008V12z" /></svg>
            </button>
            <button className="px-2.5 py-1.5 text-green-700 bg-white hover:bg-green-50 border border-green-400 rounded transition-colors" title="엑셀 다운로드">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 2l5 5h-5V4zM9.5 11.5l2.5 3.5-2.5 3.5h1.7l1.8-2.5 1.8 2.5h1.7l-2.5-3.5 2.5-3.5h-1.7l-1.8 2.5-1.8-2.5H9.5z"/></svg>
            </button>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="font-semibold text-slate-600">입금금액 <span className="text-blue-600 font-bold">{fmt(totalDeposit)}</span></span>
            <span className="font-semibold text-slate-600">출금금액 <span className="text-red-600 font-bold">{fmt(totalWithdraw)}</span></span>
            <span className="font-semibold text-slate-600">차이액 <span className="text-slate-800 font-bold">{fmt(diff)}</span></span>
          </div>
        </div>
      </div>

      {!showAddAccount && msg && (
        <div className="px-4 py-2 rounded-lg bg-teal-50 border border-teal-200 text-xs text-teal-700 flex items-center justify-between">
          <span>{msg}</span>
          <button onClick={() => setMsg('')} className="text-teal-400 hover:text-teal-600">✕</button>
        </div>
      )}

      {/* 거래내역 테이블 */}
      <div className="bg-white rounded-xl border border-teal-400/30 shadow-sm overflow-auto max-h-[calc(100vh-420px)]">
        <table className="w-full text-[11px]" style={{ minWidth: '1200px' }}>
          <thead className="sticky top-0 z-10">
            <tr className="bg-teal-50 border-b border-teal-400/30">
              <th className="text-center px-3 py-2.5 font-normal text-slate-600 w-44">계좌번호</th>
              <th className="text-center px-3 py-2.5 font-normal text-slate-600 w-20">구분</th>
              <th className="text-center px-3 py-2.5 font-normal text-slate-600 w-28 cursor-pointer hover:text-slate-800 select-none" onClick={() => setSortAsc(!sortAsc)}>거래일자 {sortAsc ? '▲' : '▼'}</th>
              <th className="text-center px-3 py-2.5 font-normal text-slate-600 w-24">거래시간</th>
              <th className="text-right px-4 py-2.5 font-normal text-slate-600 w-28">출금금액</th>
              <th className="text-right px-4 py-2.5 font-normal text-slate-600 w-28">입금금액</th>
              <th className="text-right px-4 py-2.5 font-normal text-slate-600 w-32">거래후잔액</th>
              <th className="text-center px-3 py-2.5 font-normal text-slate-600">의뢰인명</th>
              <th className="text-center px-3 py-2.5 font-normal text-slate-600 w-24">이체매체</th>
              <th className="text-center px-3 py-2.5 font-normal text-slate-600 w-20">취급점</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, idx) => (
              <tr key={r.id} className={`border-b border-teal-400/10 hover:bg-teal-50 ${idx % 2 === 1 ? 'bg-teal-50/30' : 'bg-white'}`}>
                <td className="text-center px-3 py-2.5 text-slate-600 font-mono text-xs">{r.accountNo}</td>
                <td className="text-center px-3 py-2.5">
                  <span className="flex items-center justify-center gap-1">
                    <span className={`text-xs font-medium ${r.type === '입금' ? 'text-red-600' : 'text-blue-600'}`}>{r.type}</span>
                    <select className="text-[10px] border border-slate-300 rounded px-0.5 py-0 bg-white text-slate-500">
                      <option>기본</option>
                      <option>환불</option>
                    </select>
                  </span>
                </td>
                <td className="text-center px-3 py-2.5 text-slate-700 text-xs">{formatDate(r.date)}</td>
                <td className="text-center px-3 py-2.5 text-slate-600 text-xs font-mono">{formatTime(r.time)}</td>
                <td className={`text-right px-4 py-2.5 text-xs ${r.withdrawAmt > 0 ? 'text-blue-600' : 'text-slate-400'}`}>{r.withdrawAmt > 0 ? fmt(r.withdrawAmt) : '0'}</td>
                <td className={`text-right px-4 py-2.5 text-xs ${r.depositAmt > 0 ? 'text-red-600 font-medium' : 'text-slate-400'}`}>{r.depositAmt > 0 ? fmt(r.depositAmt) : '0'}</td>
                <td className="text-right px-4 py-2.5 text-slate-700 text-xs">{fmt(r.balance)}</td>
                <td className="text-center px-3 py-2.5 text-slate-600 text-xs">{r.sender}</td>
                <td className="text-center px-3 py-2.5 text-slate-500 text-xs">{r.medium}</td>
                <td className="text-center px-3 py-2.5 text-slate-500 text-xs">{r.branch}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* 계좌 신규등록 팝업 */}
      {showAddAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowAddAccount(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-[480px] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-teal-400/30 flex items-center justify-between">
              <span className="text-sm font-bold text-slate-700">🏦 계좌정보 {editId ? '수정' : '신규등록'}</span>
              <button onClick={() => setShowAddAccount(false)} className="text-slate-400 hover:text-slate-600 text-lg">✕</button>
            </div>
            <div className="px-5 py-5 space-y-4">
              {isIlovechild && (
                <div className="flex items-center gap-3">
                  <label className="text-xs font-semibold text-slate-600 w-24 flex-shrink-0">용도(장부)</label>
                  <select value={newAccount.book} onChange={e => setNewAccount({...newAccount, book: e.target.value})} className="px-2 py-1.5 text-xs border border-teal-400/50 rounded bg-white flex-1 focus:outline-none focus:border-teal-400">
                    {ILOVECHILD_BOOKS.map(b => <option key={b.code} value={b.code}>{b.label}</option>)}
                  </select>
                </div>
              )}
              <div className="flex items-center gap-3">
                <label className="text-xs font-semibold text-slate-600 w-24 flex-shrink-0">은행명</label>
                <select value={newAccount.bankType} onChange={e => setNewAccount({...newAccount, bankType: e.target.value})} className="px-2 py-1.5 text-xs border border-slate-300 rounded bg-white">
                  <option>개인</option>
                  <option>법인</option>
                </select>
                <select value={newAccount.bankName} onChange={e => setNewAccount({...newAccount, bankName: e.target.value})} className="px-2 py-1.5 text-xs border border-slate-300 rounded bg-white flex-1">
                  <option>국민은행</option>
                  <option>기업은행</option>
                  <option>농협</option>
                  <option>신한은행</option>
                  <option>우리은행</option>
                  <option>하나은행</option>
                  <option>우체국</option>
                  <option>SC제일은행</option>
                  <option>대구은행</option>
                  <option>부산은행</option>
                  <option>광주은행</option>
                  <option>경남은행</option>
                  <option>전북은행</option>
                  <option>제주은행</option>
                  <option>새마을금고</option>
                  <option>신협</option>
                  <option>케이뱅크</option>
                  <option>카카오뱅크</option>
                  <option>수협</option>
                  <option>토스뱅크</option>
                </select>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-xs font-semibold text-slate-600 w-24 flex-shrink-0">별명</label>
                <input type="text" value={newAccount.alias} onChange={e => setNewAccount({...newAccount, alias: e.target.value})} className="px-2 py-1.5 text-xs border border-teal-400/50 rounded bg-white flex-1 focus:outline-none focus:border-teal-400" placeholder="계좌 별명" />
              </div>
              <div className="flex items-center gap-3">
                <label className="text-xs font-semibold text-slate-600 w-24 flex-shrink-0">계좌번호</label>
                <input type="text" value={newAccount.accountNo} onChange={e => setNewAccount({...newAccount, accountNo: e.target.value})} className="px-2 py-1.5 text-xs border border-teal-400/50 rounded bg-white flex-1 focus:outline-none focus:border-teal-400" placeholder="계좌번호 입력" />
              </div>
              <div className="flex items-center gap-3">
                <label className="text-xs font-semibold text-slate-600 w-24 flex-shrink-0">계좌비밀번호</label>
                <input type="password" value={newAccount.accountPw} onChange={e => setNewAccount({...newAccount, accountPw: e.target.value})} className="px-2 py-1.5 text-xs border border-teal-400/50 rounded bg-white flex-1 focus:outline-none focus:border-teal-400" placeholder="계좌 비밀번호" />
              </div>
              <div className="flex items-center gap-3">
                <label className="text-xs font-semibold text-slate-600 w-24 flex-shrink-0">사업자번호<br/><span className="text-[10px] text-slate-400">(주민번호)</span></label>
                <input type="text" value={newAccount.bizNo} onChange={e => setNewAccount({...newAccount, bizNo: e.target.value})} className="px-2 py-1.5 text-xs border border-teal-400/50 rounded bg-white flex-1 focus:outline-none focus:border-teal-400" />
              </div>
              {/* 신한은행: 계좌조회아이디, 계좌조회비밀번호 */}
              {newAccount.bankName === '신한은행' && (
                <>
                  <div className="flex items-center gap-3">
                    <label className="text-xs font-semibold text-slate-600 w-24 flex-shrink-0">계좌조회<br/>아이디</label>
                    <input type="text" value={newAccount.queryId} onChange={e => setNewAccount({...newAccount, queryId: e.target.value})} className="px-2 py-1.5 text-xs border border-teal-400/50 rounded bg-white flex-1 focus:outline-none focus:border-teal-400" placeholder="계좌조회 아이디" />
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="text-xs font-semibold text-slate-600 w-24 flex-shrink-0">계좌조회<br/>비밀번호</label>
                    <input type="password" value={newAccount.queryPw} onChange={e => setNewAccount({...newAccount, queryPw: e.target.value})} className="px-2 py-1.5 text-xs border border-teal-400/50 rounded bg-white flex-1 focus:outline-none focus:border-teal-400" placeholder="계좌조회 비밀번호" />
                  </div>
                </>
              )}
              {/* 대구은행: 안전계좌, 안전계좌비밀번호 */}
              {newAccount.bankName === '대구은행' && (
                <>
                  <div className="flex items-center gap-3">
                    <label className="text-xs font-semibold text-slate-600 w-24 flex-shrink-0">안전계좌</label>
                    <input type="text" value={newAccount.safeAccount} onChange={e => setNewAccount({...newAccount, safeAccount: e.target.value})} className="px-2 py-1.5 text-xs border border-teal-400/50 rounded bg-white flex-1 focus:outline-none focus:border-teal-400" placeholder="안전계좌 번호" />
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="text-xs font-semibold text-slate-600 w-24 flex-shrink-0">안전계좌<br/>비밀번호</label>
                    <input type="password" value={newAccount.safeAccountPw} onChange={e => setNewAccount({...newAccount, safeAccountPw: e.target.value})} className="px-2 py-1.5 text-xs border border-teal-400/50 rounded bg-white flex-1 focus:outline-none focus:border-teal-400" placeholder="안전계좌 비밀번호" />
                  </div>
                </>
              )}
              {/* 국민/우리/하나/농협/기업/카카오뱅크: 인터넷뱅킹 아이디 */}
              {!['신한은행', '대구은행'].includes(newAccount.bankName) && (
                <div className="flex items-center gap-3">
                  <label className="text-xs font-semibold text-slate-600 w-24 flex-shrink-0">인터넷뱅킹<br/>아이디</label>
                  <input type="text" value={newAccount.loginId} onChange={e => setNewAccount({...newAccount, loginId: e.target.value})} className="px-2 py-1.5 text-xs border border-teal-400/50 rounded bg-white flex-1 focus:outline-none focus:border-teal-400" placeholder="인터넷뱅킹 아이디" />
                </div>
              )}
            </div>
            <div className="px-5 py-4 border-t border-slate-200 flex items-center justify-between">
              <div>
                {msg
                  ? <span className="text-[11px] text-red-500 font-medium">{msg}</span>
                  : <span className="text-[11px] text-red-500 font-medium">빠른계좌조회서비스 등록필수!!</span>}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={saveAccount} disabled={saving} className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors disabled:opacity-50">{saving ? '저장 중…' : (editId ? '수정 저장' : '신규등록')}</button>
<button onClick={() => setShowAddAccount(false)} className="px-4 py-2 text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded transition-colors">취소</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* 빠른계좌조회방법 팝업 - bankda 스타일 */}
      {showSpeedGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowSpeedGuide(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-[860px] max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50 rounded-t-xl">
              <div className="flex items-center gap-2">
                <span className="text-base font-black tracking-wider text-slate-800">BANK</span><span className="text-base font-black tracking-wider text-blue-600">DA</span>
                <span className="text-xs text-slate-500 ml-2">빠른계좌조회 등록절차 안내</span>
              </div>
              <button onClick={() => setShowSpeedGuide(false)} className="text-slate-400 hover:text-slate-600 text-lg">✕</button>
            </div>
            <div className="flex flex-1 overflow-hidden">
              {/* 좌측: 은행 목록 그리드 */}
              <div className="w-[280px] border-r border-slate-200 overflow-y-auto p-3 flex-shrink-0">
                <div className="grid grid-cols-2 gap-1.5">
                  {bankList.map(bank => (
                    <button key={bank.code} onClick={() => setSpeedBank(bank.name)} className={`w-full px-2 py-2.5 rounded border transition-all flex items-center justify-center ${speedBank === bank.name ? 'bg-blue-50 border-blue-300 shadow-sm' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`https://bankda.com/images/bank_logo_${bank.code}.gif`} alt={bank.name} className="h-7 w-full object-contain" />
                    </button>
                  ))}
                </div>
              </div>
              {/* 우측: 안내 내용 */}
              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                {speedGuideData[speedBank] && (
                  <>
                    <div>
                      <p className="text-sm font-bold text-slate-800">▣ {speedGuideData[speedBank].title}</p>
                      <p className="text-xs text-red-600 font-medium mt-1">{speedGuideData[speedBank].notice.split('\n').map((line, i) => <span key={i}>{line}<br/></span>)}</p>
                    </div>
                    {/* 섹션: 기업뱅킹 (먼저) */}
                    <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-5">
                      <p className="text-sm font-bold text-slate-800 mb-4">◈ {speedGuideData[speedBank].section2Label}</p>
                      <div className="space-y-2.5 ml-2">
                        {speedGuideData[speedBank].section2.map((step, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <span className="text-xs font-bold text-slate-600 mt-0.5 flex-shrink-0">{i + 1}.</span>
                            <span className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">{step}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* 섹션: 개인뱅킹 (나중) */}
                    <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-5">
                      <p className="text-sm font-bold text-slate-800 mb-4">◈ {speedGuideData[speedBank].section1Label}</p>
                      <div className="space-y-2.5 ml-2">
                        {speedGuideData[speedBank].section1.map((step, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <span className="text-xs font-bold text-slate-600 mt-0.5 flex-shrink-0">{i + 1}.</span>
                            <span className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">{step}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
