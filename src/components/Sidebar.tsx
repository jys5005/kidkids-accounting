'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'

interface SubMenu {
  label: string
  href: string
}

interface MenuItem {
  label: string
  href?: string
  children?: SubMenu[]
}

interface MenuCategory {
  key: string
  label: string
  menus: MenuItem[]
}

const categories: MenuCategory[] = [
  {
    key: 'accounting',
    label: '회계',
    menus: [
      { label: '회계현황', href: '/accounting' },
      {
        label: '예산관리',
        children: [
          { label: '예산작성', href: '/budget/create' },
          { label: '과목전용', href: '/budget/transfer' },
          { label: '예산보고서', href: '/budget/report' },
          { label: '예산대비집행현황', href: '/budget/execution' },
          { label: 'CIS예산보고', href: '/budget/cis-accounting-report' },
        ],
      },
      {
        label: '전표관리',
        children: [
          { label: '전표입력', href: '/voucher/input' },
          { label: '삭제전표', href: '/voucher/deleted' },
          { label: '잔액비교', href: '/voucher/balance' },
          { label: '거래내역', href: '/voucher/transactions' },
          { label: '계좌내역', href: '/voucher/bank' },
          { label: '영수증(CIS)연동', href: '/voucher/receipt' },
        ],
      },
      {
        label: '월회계보고',
        children: [
          { label: '월회계보고', href: '/monthly-report' },
          { label: '전표검증', href: '/monthly-report/verify' },
          { label: '재무회계분석자료', href: '/monthly-report/analysis' },
        ],
      },
      {
        label: '결산관리',
        children: [
{ label: '월별결산서', href: '/settlement/monthly' },
          { label: '연말결산서', href: '/settlement/annual' },
          { label: 'CIS결산보고', href: '/settlement/cis' },
        ],
      },
      {
        label: '정산관리',
        children: [
          { label: '정부보조금명세서', href: '/reconciliation/subsidy' },
          { label: '보조금정산서', href: '/reconciliation/settlement' },
          { label: '누리과정정산서', href: '/reconciliation/nuri' },
          { label: '급식비정산서', href: '/reconciliation/meal' },
          { label: '필요경비정산서', href: '/reconciliation/required-expense' },
          { label: '특별활동비보고서', href: '/reconciliation/activity' },
          { label: '기타필요경비보고서', href: '/reconciliation/expense' },
        ],
      },
      {
        label: '경영분석',
        href: '/analysis',
      },
      {
        label: '설정',
        children: [
          { label: '회계계정관리', href: '/settings/accounts' },
          { label: '결제방식관리', href: '/settings/payment-method' },
          { label: '결제방식매칭관리', href: '/settings/payment-matching' },
          { label: '적요코드매칭관리', href: '/settings/summary-matching' },
          { label: '거래처관리', href: '/settings/counterpart' },
          { label: '4대보험요율관리', href: '/settings/insurance-rate' },
          { label: '보육통합인증키', href: '/settings/cis-auth' },
        ],
      },
      {
        label: '데이터이관',
        children: [
          { label: '데이터이관', href: '/data-migration' },
          { label: '자동로그인', href: '/data-migration/auto-login' },
        ],
      },
    ],
  },
  {
    key: 'staff',
    label: '교직원',
    menus: [
      {
        label: '교직원현황',
        children: [
          { label: '교직원정보', href: '/staff/info' },
          { label: '출근부', href: '/staff/attendance' },
          { label: '증명서', href: '/staff/certificate' },
          { label: '교사교육', href: '/staff/education' },
          { label: '공문서', href: '/staff/document' },
        ],
      },
      {
        label: '급여관리',
        children: [
          { label: '급여대장', href: '/staff/payroll/ledger' },
          { label: '급여명세서', href: '/staff/payroll/slip' },
        ],
      },
      {
        label: '4대보험',
        children: [
          { label: '취득신고', href: '/staff/insurance/acquisition' },
          { label: '보수월액변경', href: '/staff/insurance/salary-change' },
          { label: '상실신고', href: '/staff/insurance/loss' },
          { label: '납입유예신청', href: '/staff/insurance/deferment' },
          { label: '납입유예해지신청', href: '/staff/insurance/deferment-cancel' },
          { label: '사업장적용신고', href: '/staff/insurance/workplace-apply' },
          { label: '사업장탈퇴신고', href: '/staff/insurance/workplace-withdraw' },
          { label: 'EDI사무위탁출력물', href: '/staff/insurance/edi-print' },
        ],
      },
      { label: '연말정산', href: '/staff/year-end' },
    ],
  },
  {
    key: 'children',
    label: '아동',
    menus: [
      {
        label: '아동관리',
        children: [
          { label: '아동현황', href: '/children/status' },
          { label: '반편성관리', href: '/children/class' },
          { label: '보호자관리', href: '/children/guardian' },
        ],
      },
      { label: '보육료납부', href: '/children/fee' },
      { label: '기타필요경비', href: '/children/expense' },
      { label: '출석부', href: '/children/attendance' },
    ],
  },
  {
    key: 'supplies',
    label: '물품',
    menus: [
      {
        label: '물품관리',
        children: [
          { label: '물품현황', href: '/supplies/status' },
        ],
      },
    ],
  },
  {
    key: 'community',
    label: '커뮤니티',
    menus: [
      {
        label: '게시판',
        children: [
          { label: '공지사항', href: '/community/notice' },
          { label: 'Q&A', href: '/community/qna' },
          { label: '자주하는질문', href: '/community/faq' },
        ],
      },
      {
        label: '자료실',
        children: [
          { label: '자료실', href: '/community/resources' },
          { label: '원장님자료실', href: '/community/principal-resources' },
          { label: '공제서류', href: '/community/deduction-docs' },
        ],
      },
      {
        label: '계산기',
        children: [
          { label: '급간식계산기', href: '/community/calculator/meal' },
          { label: '퇴직금계산기', href: '/community/calculator/retirement' },
          { label: '퇴직소득세계산기', href: '/community/calculator/retirement-tax' },
          { label: '4대보험계산기', href: '/community/calculator/insurance' },
          { label: '연말정산계산기', href: '/community/calculator/year-end' },
        ],
      },
    ],
  },
]

export { categories }

// ── 기관 유형별 CIS·회계검증 게이팅 ──
// 어린이집만 CIS(보육통합) 연동·회계검증 사용. 아이사랑꿈터·연합회 등은 숨김.
export const CIS_GATED_HREFS = new Set<string>([
  '/budget/cis-accounting-report', // CIS예산보고
  '/voucher/receipt',              // 영수증(CIS)연동
  '/monthly-report/verify',        // 전표검증(회계검증)
  '/settlement/cis',               // CIS결산보고
  '/settings/cis-auth',            // 보육통합인증키
])

export function isCisEnabled(institutionType?: string | null): boolean {
  // 값 없음(기존 계정) = 어린이집으로 간주 → CIS 노출
  return !institutionType || institutionType === 'childcare'
}

// 아이사랑꿈터 전용 메뉴 — 다른 유형에서는 숨김
export const ILOVECHILD_ONLY_HREFS = new Set<string>([
  '/settings/accounts', // 회계계정관리(장부별 계정과목)
  '/analysis',          // 경영분석 집계표(coa 기반)
])

// 아이사랑꿈터에서 숨기는 메뉴 — 어린이집 서식이라 미사용 (어린이집은 그대로 노출)
export const ILOVECHILD_HIDDEN_HREFS = new Set<string>([
  '/monthly-report',          // 월회계보고 (어린이집 서식)
  '/monthly-report/analysis', // 재무회계분석자료
  // 전표관리는 전표입력(일괄수정)만 사용 — 나머지 숨김
  '/voucher/deleted',         // 삭제전표
  '/voucher/balance',         // 잔액비교
  '/voucher/transactions',    // 거래내역
  '/voucher/bank',            // 계좌내역
])

/** 기관 유형에 맞는 메뉴만 반환. CIS 미사용 유형이면 CIS/검증 제거, 아이사랑꿈터 전용은 그 외 유형에서 제거. */
export function visibleCategories(institutionType?: string | null): MenuCategory[] {
  const cisOn = isCisEnabled(institutionType)
  const ilove = institutionType === 'ilovechild'
  const hide = (href: string) =>
    (!cisOn && CIS_GATED_HREFS.has(href)) ||
    (!ilove && ILOVECHILD_ONLY_HREFS.has(href)) ||
    (ilove && ILOVECHILD_HIDDEN_HREFS.has(href))
  // 아이사랑꿈터 용어 치환 — 교직원/보육교직원/교사 → 종사자 (라벨 표시만, 라우팅은 href 기준이라 무관)
  const relabel = (s: string): string => {
    if (!ilove) return s
    return ({ '교직원': '종사자', '교직원현황': '종사자현황', '교직원정보': '종사자정보', '교사교육': '종사자교육' } as Record<string, string>)[s] ?? s
  }
  return categories.map(cat => ({
    ...cat,
    label: relabel(cat.label),
    menus: cat.menus
      .map(m => (m.children ? { ...m, children: m.children.filter(c => !hide(c.href)) } : m))
      .filter(m => !(m.href && hide(m.href)))               // 자체 href 게이트(children 없는 메뉴)
      .filter(m => !m.children || m.children.length > 0)  // 자식이 전부 제거된 메뉴는 숨김
      .map(m => ({ ...m, label: relabel(m.label), children: m.children?.map(c => ({ ...c, label: relabel(c.label) })) })),
  }))
}

export default function Sidebar() {
  const pathname = usePathname()
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({})

  // 현재 경로에 해당하는 카테고리 찾기
  const findCategory = () => {
    return categories.find((cat) =>
      cat.menus.some((m) =>
        (m.href && pathname?.startsWith(m.href)) ||
        m.children?.some((c) => pathname?.startsWith(c.href))
      )
    ) || categories[0]
  }

  const [selectedCategory, setSelectedCategory] = useState(findCategory().key)

  useEffect(() => {
    setSelectedCategory(findCategory().key)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  const currentCategory = categories.find((c) => c.key === selectedCategory) || categories[0]

  const toggleMenu = (label: string) => {
    setOpenMenus((prev) => ({ ...prev, [label]: !prev[label] }))
  }

  const isActive = (href: string) => pathname === href || pathname?.startsWith(href + '/')

  return (
    <aside className="w-52 bg-white border-r border-slate-200 flex flex-col shrink-0 min-h-0">
      {/* 카테고리 타이틀 */}
      <div className="px-4 py-3.5 border-b border-slate-100">
        <h2 className="text-sm font-bold text-slate-800">{currentCategory.label}</h2>
      </div>

      {/* 메뉴 목록 */}
      <nav className="flex-1 py-2 overflow-y-auto">
        <div className="px-2 space-y-0.5">
          {currentCategory.menus.map((item) => {
            if (item.children) {
              const isOpen = openMenus[item.label] || item.children.some((c) => pathname === c.href)
              return (
                <div key={item.label}>
                  <button
                    onClick={() => toggleMenu(item.label)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                      isOpen ? 'text-slate-800 bg-slate-50' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {item.label}
                    <svg
                      className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {isOpen && (
                    <div className="ml-3 mt-0.5 space-y-0.5 border-l-2 border-slate-100 pl-3">
                      {item.children.map((sub) => (
                        <Link
                          key={sub.href}
                          href={sub.href}
                          className={`block px-2 py-1.5 rounded text-[12px] transition-colors ${
                            isActive(sub.href)
                              ? 'text-blue-700 font-semibold bg-blue-50'
                              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {sub.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )
            }

            return (
              <Link
                key={item.href}
                href={item.href!}
                className={`block px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                  isActive(item.href!)
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                }`}
              >
                {item.label}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* 하단 어린이집 정보 */}
      <div className="px-3 py-3 border-t border-slate-100">
        <div className="bg-slate-50 rounded-lg px-3 py-2.5">
          <p className="text-[10px] text-slate-400">어린이집</p>
          <p className="text-xs font-semibold text-slate-700 mt-0.5">별빛어린이집</p>
          <p className="text-[10px] text-slate-400 mt-0.5">2026년 3월</p>
        </div>
      </div>
    </aside>
  )
}
