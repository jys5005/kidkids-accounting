'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { categories } from './Sidebar'

const TIMEOUT_SEC = 30 * 60

function useAutoLogout() {
  const [secondsLeft, setSecondsLeft] = useState(TIMEOUT_SEC)

  useEffect(() => {
    const id = setInterval(() => setSecondsLeft(s => Math.max(0, s - 1)), 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const reset = () => { setSecondsLeft(TIMEOUT_SEC) }
    const evs = ['mousedown', 'keydown', 'touchstart'] as const
    evs.forEach(ev => document.addEventListener(ev, reset))
    return () => evs.forEach(ev => document.removeEventListener(ev, reset))
  }, [])

  useEffect(() => {
    if (secondsLeft === 0) {
      fetch('/api/auth/logout', { method: 'POST' }).finally(() => {
        window.location.href = `${process.env.NEXT_PUBLIC_PLATFORM_URL || 'http://localhost:4000'}/login`
      })
    }
  }, [secondsLeft])

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0')
  const ss = String(secondsLeft % 60).padStart(2, '0')
  return { secondsLeft, display: `${mm}:${ss}` }
}

function useUser() {
  const [user, setUser] = useState<{ userId: string; type: string; displayName?: string } | null>(null)
  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data && setUser(data))
      .catch(() => {})
  }, [])
  return user
}

const categoryIcons: Record<string, React.ReactNode> = {
  accounting: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25v-.008zm2.498-6.75h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007v-.008zm2.504-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008v-.008zm2.498-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008v-.008zM8.25 6h7.5v2.25h-7.5V6zM12 2.25c-1.892 0-3.758.11-5.593.322C5.307 2.7 4.5 3.65 4.5 4.757V19.5a2.25 2.25 0 002.25 2.25h10.5a2.25 2.25 0 002.25-2.25V4.757c0-1.108-.806-2.057-1.907-2.185A48.507 48.507 0 0012 2.25z" />
    </svg>
  ),
  staff: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  ),
  children: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" />
    </svg>
  ),
  supplies: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  ),
  community: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
    </svg>
  ),
}

export default function Header() {
  const pathname = usePathname()
  const { secondsLeft, display: timerDisplay } = useAutoLogout()
  const user = useUser()
  const [gnbExpanded, setGnbExpanded] = useState(true)
  const [profileOpen, setProfileOpen] = useState(false)
  const [profileData, setProfileData] = useState({ centerName: '', displayName: '', phone: '', email: '' })
  const [editData, setEditData] = useState({ phone: '', email: '' })
  const profileRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setProfileData({
            centerName: data.centerName || '베르디움어린이집',
            displayName: data.displayName || data.userId || '',
            phone: data.phone || '',
            email: data.email || '',
          })
          setEditData({ phone: data.phone || '', email: data.email || '' })
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false)
    }
    if (profileOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [profileOpen])

  const activeKey = categories.find((cat) =>
    cat.menus.some((m) =>
      (m.href && pathname?.startsWith(m.href)) ||
      m.children?.some((c) => pathname?.startsWith(c.href))
    )
  )?.key || 'accounting'

  const currentCategory = categories.find((c) => c.key === activeKey) || categories[0]

  const activeMenu = currentCategory.menus.find((m) =>
    m.children?.some((c) => pathname === c.href || pathname?.startsWith(c.href + '/'))
  )

  return (
    <div className="shrink-0">
      {/* 1단: 흰 배경 — 로고 + 대메뉴 + 유저 */}
      <div className="bg-white border-b border-slate-200">
        <div className="px-5 flex items-end pb-1 pt-6 relative">
          <Link href="/accounting" className="flex items-center gap-1.5 mr-auto">
            <span className="text-base font-bold text-slate-800">어린이집회계관리시스템</span>
            <span className="text-xs text-slate-400 ml-0.5">수전자장부</span>
          </Link>
          <nav className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1">
            {categories.map((cat) => {
              const isActive = activeKey === cat.key
              return (
                <Link
                  key={cat.key}
                  href={cat.menus[0].href || cat.menus[0].children?.[0].href || '#'}
                  className={`flex items-center gap-2 px-5 py-1.5 rounded-lg transition-colors border ${
                    isActive
                      ? 'text-amber-700 bg-amber-50 border-amber-400'
                      : 'text-slate-500 hover:text-amber-700 hover:bg-amber-50 hover:border-amber-400 hover:shadow-sm border-transparent sub-tab-hover'
                  }`}
                >
                  {categoryIcons[cat.key]}
                  <span className={`text-sm font-bold ${isActive ? 'text-amber-700' : ''}`}>{cat.label}</span>
                </Link>
              )
            })}
            <a
              href={`${process.env.NEXT_PUBLIC_PLATFORM_URL || 'http://localhost:4000'}/dashboard`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-white bg-gradient-to-r from-amber-400 to-pink-400 rounded-full hover:from-amber-500 hover:to-pink-500 transition-all shadow-sm ml-1"
            >
              통합<span className="italic">e</span>
              <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </nav>
          <div className="flex items-center gap-2">
            {/* 어린이집명 + 회원정보 팝업 */}
            <div ref={profileRef} className="relative">
              <button
                onClick={() => setProfileOpen(v => !v)}
                className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <span className="text-[12px] font-semibold text-slate-700">{profileData.centerName || '...'}</span>
                <svg className={`w-3.5 h-3.5 text-slate-400 transition-transform ${profileOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {profileOpen && (
                <div className="absolute right-0 top-full mt-1 w-72 bg-white rounded-lg shadow-xl border border-slate-200 z-[100] p-4">
                  <h3 className="text-sm font-bold text-slate-800 mb-3 border-b border-slate-100 pb-2">회원정보</h3>
                  <div className="space-y-2.5">
                    <div>
                      <label className="text-[11px] text-slate-400">어린이집명</label>
                      <p className="text-[13px] font-medium text-slate-700">{profileData.centerName}</p>
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-400">이름</label>
                      <p className="text-[13px] font-medium text-slate-700">{profileData.displayName}</p>
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-0.5">연락처</label>
                      <input
                        type="tel"
                        value={editData.phone}
                        onChange={e => setEditData(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="010-0000-0000"
                        className="w-full px-2.5 py-1.5 text-[12px] border border-slate-200 rounded-md focus:outline-none focus:border-amber-400"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-0.5">이메일</label>
                      <input
                        type="email"
                        value={editData.email}
                        onChange={e => setEditData(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="email@example.com"
                        className="w-full px-2.5 py-1.5 text-[12px] border border-slate-200 rounded-md focus:outline-none focus:border-amber-400"
                      />
                    </div>
                    <button
                      onClick={async () => {
                        await fetch('/api/auth/profile', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify(editData),
                        })
                        setProfileData(prev => ({ ...prev, ...editData }))
                        setProfileOpen(false)
                      }}
                      className="w-full py-1.5 text-[12px] font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-md transition-colors"
                    >
                      저장
                    </button>
                  </div>
                </div>
              )}
            </div>

            <span className="text-[12px] text-slate-600 font-medium">{profileData.displayName || user?.displayName || '...'}님</span>

            <span className={`text-[11px] font-mono px-2 py-0.5 border rounded-md ${secondsLeft <= 300 ? 'text-red-500 border-red-300 animate-pulse' : secondsLeft <= 600 ? 'text-amber-500 border-amber-300' : 'text-slate-400 border-slate-200'}`} title="자동 로그아웃까지 남은 시간">
              {timerDisplay}
            </span>

            <button
              onClick={async () => {
                await fetch('/api/auth/logout', { method: 'POST' })
                window.location.href = `${process.env.NEXT_PUBLIC_PLATFORM_URL || 'http://localhost:4000'}/login`
              }}
              className="flex items-center gap-1 px-2 py-1 text-[11px] text-slate-400 hover:text-red-500 border border-slate-200 rounded-md transition-colors"
              title="로그아웃"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              로그아웃
            </button>
          </div>
        </div>
      </div>

      {/* 2단: GNB 노란 바, 박스 버튼 + 펼쳐보기 */}
      <div className="bg-[#f5b800]">
        <div className="max-w-6xl mx-auto px-5 flex items-center gap-2 py-1 overflow-x-auto scrollbar-hide">
          {currentCategory.menus.map((item) => {
            const href = item.href || item.children?.[0]?.href || '#'
            const isActive = item.href
              ? (pathname === item.href || pathname?.startsWith(item.href + '/'))
              : item.children?.some((c) => pathname === c.href || pathname?.startsWith(c.href + '/'))
            return (
              <Link
                key={item.label}
                href={href}
                className={`px-5 py-1.5 text-[13px] font-bold whitespace-nowrap rounded-md border-b-2 ${
                  isActive
                    ? 'bg-white text-amber-900 shadow-sm border-b-amber-700'
                    : 'text-white border-b-transparent sub-tab-hover hover:bg-white/15 hover:border-b-white/50'
                }`}
              >
                {item.label}
              </Link>
            )
          })}
          <button
            onClick={() => setGnbExpanded(!gnbExpanded)}
            className="ml-auto flex items-center gap-1 px-2 py-1 text-[11px] text-white/80 hover:text-white hover:bg-white/15 rounded transition-colors whitespace-nowrap"
          >
            <svg className={`w-3.5 h-3.5 transition-transform ${gnbExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
            {gnbExpanded ? '접기' : '펼쳐보기'}
          </button>
        </div>
      </div>

      {/* 3단: 하위 탭 (children 있는 메뉴 선택 시) */}
      {gnbExpanded && activeMenu && activeMenu.children && (
        <div className="bg-slate-100 border-b-2 border-b-slate-300 mt-2">
          <div className="max-w-6xl mx-auto px-5 flex items-center gap-2 py-1.5 overflow-x-auto scrollbar-hide">
            {activeMenu.children.map((sub) => {
              const isActive = pathname === sub.href || pathname?.startsWith(sub.href + '/')
              return (
                <Link
                  key={sub.href}
                  href={sub.href}
                  className={`px-4 py-1.5 text-[12px] font-bold whitespace-nowrap rounded-md ${
                    isActive
                      ? 'bg-white text-amber-700 shadow-sm border border-slate-200'
                      : 'text-slate-500 sub-tab-hover hover:bg-white/70 hover:text-amber-600 hover:shadow-sm'
                  }`}
                >
                  {sub.label}
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
