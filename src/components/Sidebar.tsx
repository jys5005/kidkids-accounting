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
          { label: '예산대비 집행현황', href: '/budget/execution' },
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
        ],
      },
      { label: '현금출납부', href: '/cash-ledger' },
      { label: '월회계보고', href: '/monthly-report' },
      {
        label: '결산관리',
        children: [
          { label: '결산보고서', href: '/settlement/report' },
          { label: '월별결산서', href: '/settlement/monthly' },
          { label: '연말결산서', href: '/settlement/annual' },
        ],
      },
      {
        label: '정산관리',
        children: [
          { label: '보조금명세서', href: '/reconciliation/subsidy' },
          { label: '보조금정산서', href: '/reconciliation/settlement' },
          { label: '누리과정정산서', href: '/reconciliation/nuri' },
          { label: '필요경비정산서', href: '/reconciliation/expense' },
          { label: '급식비정산서', href: '/reconciliation/meal' },
        ],
      },
      { label: '데이터이관', href: '/data-migration' },
      { label: '설정', href: '/settings' },
    ],
  },
  {
    key: 'staff',
    label: '교직원',
    menus: [
      { label: '교직원현황', href: '/staff' },
      { label: '급여관리', href: '/staff/payroll' },
      { label: '4대보험', href: '/staff/insurance' },
      { label: '퇴직금관리', href: '/staff/retirement' },
      { label: '연말정산', href: '/staff/year-end' },
    ],
  },
  {
    key: 'children',
    label: '아동',
    menus: [
      { label: '아동현황', href: '/children' },
      { label: '보육료관리', href: '/children/fee' },
      { label: '필요경비', href: '/children/expense' },
      { label: '특별활동비', href: '/children/activity' },
    ],
  },
  {
    key: 'supplies',
    label: '물품',
    menus: [
      { label: '물품현황', href: '/supplies' },
      { label: '재물조사', href: '/supplies/inventory' },
    ],
  },
  {
    key: 'community',
    label: '커뮤니티',
    menus: [
      { label: '공지사항', href: '/community/notice' },
      { label: '질의응답', href: '/community/qna' },
      { label: '자료실', href: '/community/resources' },
    ],
  },
]

export { categories }

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
