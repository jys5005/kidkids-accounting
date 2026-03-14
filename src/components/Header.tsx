'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { categories } from './Sidebar'

function useClock() {
  const [time, setTime] = useState('')
  useEffect(() => {
    const update = () => {
      const now = new Date()
      setTime(now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }))
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [])
  return time
}

function useUser() {
  const [user, setUser] = useState<{ userId: string; type: string } | null>(null)
  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data && setUser(data))
      .catch(() => {})
  }, [])
  return user
}

export default function Header() {
  const pathname = usePathname()
  const router = useRouter()
  const clock = useClock()
  const user = useUser()

  const activeKey = categories.find((cat) =>
    cat.menus.some((m) =>
      (m.href && pathname?.startsWith(m.href)) ||
      m.children?.some((c) => pathname?.startsWith(c.href))
    )
  )?.key || 'accounting'

  const currentCategory = categories.find((c) => c.key === activeKey) || categories[0]

  return (
    <div className="shrink-0">
      {/* 1단: 카테고리 탭 (검은 박스 위) */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-5 flex items-center justify-between">
          {/* 좌측: 로고 */}
          <Link href="/accounting" className="flex items-center gap-2 py-2">
            <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-blue-700 rounded-md flex items-center justify-center">
              <span className="text-white text-[10px] font-black">K</span>
            </div>
            <span className="text-sm font-bold text-slate-800">어린이집 재무회계</span>
            <span className="text-[11px] text-slate-400 ml-1">수전자장부</span>
          </Link>

          {/* 우측: 카테고리 탭 + 유저 */}
          <div className="flex items-center gap-3">
            <nav className="flex items-center">
              {categories.map((cat) => {
                const isActive = activeKey === cat.key
                return (
                  <Link
                    key={cat.key}
                    href={cat.menus[0].href || cat.menus[0].children?.[0].href || '#'}
                    className={`px-3 py-2 text-[12px] font-medium border-b-2 transition-colors ${
                      isActive
                        ? 'text-blue-600 border-blue-600'
                        : 'text-slate-400 border-transparent hover:text-slate-600'
                    }`}
                  >
                    {cat.label}
                  </Link>
                )
              })}
            </nav>
            <div className="flex items-center gap-3 border-l border-slate-200 pl-3">
              <a
                href="http://localhost:4000/dashboard"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-white
                           bg-gradient-to-r from-amber-400 to-pink-400 rounded-full hover:from-amber-500 hover:to-pink-500 transition-all shadow-sm"
              >
                통합<span className="italic">e</span>
                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
              <a
                href="/settings"
                className="flex items-center justify-center w-7 h-7 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                title="설정"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </a>
              <span className="text-[11px] text-slate-400">{clock}</span>
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div className="leading-none">
                  <p className="text-[11px] font-medium text-slate-700">{user?.userId ?? '...'}</p>
                  <p className="text-[9px] text-slate-400">{user?.type === 'center' ? '원장' : user?.type === 'admin' ? '관리자' : '교사'}</p>
                </div>
                <button
                  onClick={async () => {
                    await fetch('/api/auth/logout', { method: 'POST' })
                    window.location.href = 'http://localhost:4000/login'
                  }}
                  className="ml-1 text-[10px] text-slate-400 hover:text-red-500 transition-colors"
                  title="로그아웃"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2단: GNB 박스 (서브메뉴) */}
      <div className="bg-gradient-to-r from-sky-400 to-sky-500">
        <div className="max-w-6xl mx-auto px-5 flex items-center gap-1 overflow-x-auto scrollbar-hide">
          {currentCategory.menus.map((item) => {
            if (item.href) {
              const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-3.5 text-[12px] font-medium whitespace-nowrap transition-colors ${
                    isActive
                      ? 'text-white bg-white/20 rounded-t-md font-bold'
                      : 'text-white/70 hover:text-white hover:bg-white/15'
                  }`}
                >
                  {item.label}
                </Link>
              )
            }

            const isChildActive = item.children?.some((c) => pathname === c.href || pathname?.startsWith(c.href + '/'))
            const firstChildHref = item.children?.[0]?.href || '#'
            return (
              <div key={item.label} className="relative group">
                <Link
                  href={firstChildHref}
                  className={`flex items-center gap-1 px-3 py-3.5 text-[12px] font-medium whitespace-nowrap transition-colors ${
                    isChildActive
                      ? 'text-white bg-white/20 rounded-t-md font-bold'
                      : 'text-white/70 hover:text-white hover:bg-white/15'
                  }`}
                >
                  {item.label}
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </Link>
                <div className="absolute top-full left-0 mt-0 bg-white border border-slate-200 rounded-lg shadow-xl py-1 min-w-[160px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                  {item.children?.map((sub) => (
                    <Link
                      key={sub.href}
                      href={sub.href}
                      className={`block px-4 py-2 text-[12px] transition-colors ${
                        pathname === sub.href || pathname?.startsWith(sub.href + '/')
                          ? 'text-blue-600 bg-blue-50 font-medium'
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {sub.label}
                    </Link>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
