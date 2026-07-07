'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { visibleCategories, isCisEnabled } from './Sidebar'
import BookDropdown from './BookDropdown'

const TIMEOUT_SEC = 30 * 60

// 전화번호 문자열 → [지역/앞, 중간, 끝] 3분할 (기본정보 모달 입력칸용)
function splitPhone(p: string): [string, string, string] {
  const d = (p || '').replace(/[^0-9]/g, '')
  if (d.length === 11) return [d.slice(0, 3), d.slice(3, 7), d.slice(7)]
  if (d.length === 10) return [d.slice(0, 3), d.slice(3, 6), d.slice(6)]
  return ['', '', '']
}

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
      // 회계앱 자체 쿠키 정리 → 통합e logout 으로 navigate (양쪽 .cert24.kr 쿠키 expire + /login redirect)
      fetch('/api/auth/logout', { method: 'POST' }).finally(() => {
        try { sessionStorage.removeItem('accounting-sso-set') } catch {}
        window.location.href = `${process.env.NEXT_PUBLIC_PLATFORM_URL || 'http://localhost:3000'}/api/auth/logout`
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

const categoryIconColors: Record<string, string> = {
  accounting: 'text-blue-500',
  staff: 'text-emerald-500',
  children: 'text-orange-400',
  supplies: 'text-purple-500',
  community: 'text-rose-400',
}

const categoryIconPaths: Record<string, string> = {
  accounting: 'M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25v-.008zm2.498-6.75h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007v-.008zm2.504-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008v-.008zm2.498-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008v-.008zM8.25 6h7.5v2.25h-7.5V6zM12 2.25c-1.892 0-3.758.11-5.593.322C5.307 2.7 4.5 3.65 4.5 4.757V19.5a2.25 2.25 0 002.25 2.25h10.5a2.25 2.25 0 002.25-2.25V4.757c0-1.108-.806-2.057-1.907-2.185A48.507 48.507 0 0012 2.25z',
  staff: 'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z',
  children: 'M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z',
  supplies: 'M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z',
  community: 'M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155',
}

export default function Header() {
  const pathname = usePathname()
  const { secondsLeft, display: timerDisplay } = useAutoLogout()
  const user = useUser()
  const [gnbExpanded, setGnbExpanded] = useState(true)
  const [profileOpen, setProfileOpen] = useState(false)
  const [centerInfoOpen, setCenterInfoOpen] = useState(false)
  const [centerInfoTab, setCenterInfoTab] = useState<'basic' | 'accounting' | 'stamp'>('basic')
  const [profileData, setProfileData] = useState({ centerName: '', displayName: '', phone: '', email: '', userId: '', bizNo: '', ownerName: '', address: '', zipCode: '' })
  const [institutionType, setInstitutionType] = useState<string>('childcare')
  const [editData, setEditData] = useState({ phone: '', email: '' })
  const profileRef = useRef<HTMLDivElement>(null)
  // 기본정보 모달 편집 폼
  const [basicForm, setBasicForm] = useState({ name: '', bizNo: '', ownerName: '', zipCode: '', address: '', email: '', phone: '', pw: '', pw2: '' })
  const [basicMsg, setBasicMsg] = useState('')
  const [basicSaving, setBasicSaving] = useState(false)

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          const p = (data.profile ?? {}) as Record<string, string | undefined>
          const phone = data.phone || p.phone || p.hpNo || p.mobile || p.tel || ''
          const email = data.email || p.email || ''
          setProfileData({
            centerName: data.centerName || p.centerName || '',
            displayName: data.displayName || data.userId || '',
            phone,
            email,
            userId: data.userId || p.userId || '',
            bizNo: (data.bizNo as string) || p.bizNo || p.businessNo || p.regNo || '',
            ownerName: (data.ownerName as string) || p.ownerName || p.representative || p.principalName || p.name || '',
            address: p.address || (data.address as string) || '',
            zipCode: p.zipCode || p.zip || p.postCode || '',
          })
          const itype = (data.institutionType as string) || (p.institutionType as string) || 'childcare'
          setInstitutionType(itype)
          setEditData({ phone, email })
          setBasicForm({
            name: data.centerName || p.centerName || '',
            bizNo: (data.bizNo as string) || p.bizNo || p.businessNo || p.regNo || '',
            ownerName: (data.ownerName as string) || p.ownerName || p.representative || p.principalName || p.name || '',
            zipCode: p.zipCode || p.zip || p.postCode || '',
            address: p.address || (data.address as string) || '',
            email, phone, pw: '', pw2: '',
          })
        }
      })
      .catch(() => {})
  }, [])

  // 우편번호 검색 (다음 우편번호 서비스) — 클릭 시 스크립트 로드 후 팝업
  const openPostcode = () => {
    const run = () => {
      const w = window as unknown as { daum?: { Postcode: new (o: unknown) => { open: () => void } } }
      if (!w.daum?.Postcode) { setBasicMsg('우편번호 서비스를 불러오지 못했습니다.'); return }
      new w.daum.Postcode({
        oncomplete: (data: { zonecode: string; roadAddress: string; jibunAddress: string }) => {
          setBasicForm(f => ({ ...f, zipCode: data.zonecode, address: data.roadAddress || data.jibunAddress }))
        },
      }).open()
    }
    const w = window as unknown as { daum?: { Postcode?: unknown } }
    if (w.daum?.Postcode) { run(); return }
    const s = document.createElement('script')
    s.src = 'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js'
    s.onload = run
    s.onerror = () => setBasicMsg('우편번호 서비스 로드 실패')
    document.body.appendChild(s)
  }

  // 기본정보 저장 → 통합e 프로필 반영
  const saveBasicInfo = async () => {
    if (basicForm.pw && basicForm.pw !== basicForm.pw2) { setBasicMsg('새 비밀번호가 일치하지 않습니다.'); return }
    setBasicSaving(true); setBasicMsg('저장 중…')
    try {
      const res = await fetch('/api/auth/me', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({
          profile: { centerName: basicForm.name, bizNo: basicForm.bizNo, ownerName: basicForm.ownerName, zipCode: basicForm.zipCode, address: basicForm.address, email: basicForm.email, phone: basicForm.phone },
          newPassword: basicForm.pw || undefined,
        }),
      })
      const j = await res.json().catch(() => ({}))
      if (j?.success) {
        setBasicMsg('✅ 저장되었습니다.')
        setProfileData(pd => ({ ...pd, centerName: basicForm.name, bizNo: basicForm.bizNo, ownerName: basicForm.ownerName, email: basicForm.email, phone: basicForm.phone, address: basicForm.address, zipCode: basicForm.zipCode }))
        setBasicForm(f => ({ ...f, pw: '', pw2: '' }))
      } else setBasicMsg(`❌ ${j?.error || '저장 실패'}`)
    } catch (e) { setBasicMsg(`❌ ${e instanceof Error ? e.message : '저장 오류'}`) }
    finally { setBasicSaving(false) }
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false)
    }
    if (profileOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [profileOpen])

  // 기관 유형에 맞는 메뉴만 (아이사랑꿈터·연합회 등은 CIS/검증 제거)
  const cats = visibleCategories(institutionType)
  const cisEnabled = isCisEnabled(institutionType)

  const activeKey = cats.find((cat) =>
    cat.menus.some((m) =>
      (m.href && pathname?.startsWith(m.href)) ||
      m.children?.some((c) => pathname?.startsWith(c.href))
    )
  )?.key || 'accounting'

  const currentCategory = cats.find((c) => c.key === activeKey) || cats[0]

  const activeMenu = currentCategory.menus.find((m) =>
    m.children?.some((c) => pathname === c.href || pathname?.startsWith(c.href + '/'))
  )

  const gnbBgMap: Record<string, string> = {
    accounting: 'bg-blue-500',
    staff: 'bg-emerald-500',
    children: 'bg-orange-400',
    supplies: 'bg-purple-500',
    community: 'bg-rose-400',
  }
  const gnbBg = gnbBgMap[activeKey] || 'bg-blue-500'

  return (
    <div className="shrink-0">
      {/* 1단: 흰 배경 — 로고 + 대메뉴 + 유저 */}
      <div className="bg-white border-b border-slate-200">
        <div className="px-5 flex items-end pb-1 pt-6 relative">
          <Link href="/accounting" className="flex items-center gap-1.5 mr-auto flex-shrink-0">
            <span className="text-lg leading-none">🏠</span>
            <span className="text-slate-800 font-bold text-sm whitespace-nowrap">통합e</span>
          </Link>
          <nav className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1">
            {cisEnabled && (
            <a
              href={`${process.env.NEXT_PUBLIC_PLATFORM_URL || 'http://localhost:3000'}/dashboard`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-white bg-gradient-to-r from-teal-400 to-cyan-500 rounded-full hover:from-teal-500 hover:to-cyan-600 transition-all shadow-sm mr-1 whitespace-nowrap shrink-0"
              title="통합e — CIS 검증으로 이동 (새 탭)"
            >
              CIS 검증
              <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
            )}
            {cats.map((cat) => {
              const isActive = activeKey === cat.key
              return (
                <Link
                  key={cat.key}
                  href={cat.menus[0].href || cat.menus[0].children?.[0].href || '#'}
                  className={`flex items-center gap-2 px-5 py-1.5 rounded-lg transition-colors shrink-0 whitespace-nowrap ${
                    isActive ? 'text-slate-800' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50 sub-tab-hover'
                  }`}
                >
                  <span className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${isActive ? categoryIconColors[cat.key].replace('text-', 'bg-') : ''}`}>
                    {cat.key === 'accounting' && <svg className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25v-.008zm2.498-6.75h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007v-.008zm2.504-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008v-.008zm2.498-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008v-.008zM8.25 6h7.5v2.25h-7.5V6zM12 2.25c-1.892 0-3.758.11-5.593.322C5.307 2.7 4.5 3.65 4.5 4.757V19.5a2.25 2.25 0 002.25 2.25h10.5a2.25 2.25 0 002.25-2.25V4.757c0-1.108-.806-2.057-1.907-2.185A48.507 48.507 0 0012 2.25z" /></svg>}
                    {cat.key === 'staff' && <svg className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>}
                    {cat.key === 'children' && <svg className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><circle cx="12" cy="8" r="4" /><path d="M5 20c0-3.87 3.13-7 7-7s7 3.13 7 7" /></svg>}
                    {cat.key === 'supplies' && <svg className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M20 7H4a1 1 0 00-1 1v1h18V8a1 1 0 00-1-1zM4 10h16v8a2 2 0 01-2 2H6a2 2 0 01-2-2v-8zM10 13h4" /></svg>}
                    {cat.key === 'community' && <svg className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" /></svg>}
                  </span>
                  <span className={`text-sm font-extrabold ${isActive ? 'text-slate-900' : 'text-slate-400'}`}>{cat.label}</span>
                </Link>
              )
            })}
          </nav>
          <div className="flex items-center gap-2">
            {/* 어린이집명 + 회원정보 팝업 (원격지원은 아래 GNB 바로 이동) */}
            <div ref={profileRef} className="relative flex items-center gap-0.5">
              <button
                onClick={() => setProfileOpen(v => !v)}
                className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <span className="text-[12px] font-semibold text-slate-700">{profileData.centerName || '...'}</span>
                <svg className={`w-3.5 h-3.5 text-slate-400 transition-transform ${profileOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <button onClick={() => setCenterInfoOpen(true)} className="p-1 rounded hover:bg-slate-100 transition-colors" title={institutionType === 'ilovechild' ? '기관 정보' : '어린이집 정보'}>
                <svg className="w-4 h-4 text-slate-400 hover:text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              </button>

              {profileOpen && (
                <div className="absolute right-0 top-full mt-1 w-72 bg-white rounded-lg shadow-xl border border-slate-200 z-[100] p-4">
                  <h3 className="text-sm font-bold text-slate-800 mb-3 border-b border-slate-100 pb-2">회원정보</h3>
                  <div className="space-y-2.5">
                    <div>
                      <label className="text-[11px] text-slate-400">{institutionType === 'ilovechild' ? '기관명' : '어린이집명'}</label>
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
                        className="w-full px-2.5 py-1.5 text-[12px] border border-slate-200 rounded-md focus:outline-none focus:border-teal-400"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-0.5">이메일</label>
                      <input
                        type="email"
                        value={editData.email}
                        onChange={e => setEditData(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="email@example.com"
                        className="w-full px-2.5 py-1.5 text-[12px] border border-slate-200 rounded-md focus:outline-none focus:border-teal-400"
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
                      className="w-full py-1.5 text-[12px] font-bold text-white bg-teal-500 hover:bg-teal-600 rounded-md transition-colors"
                    >
                      저장
                    </button>
                  </div>
                </div>
              )}
            </div>

            <span className="text-[12px] text-slate-600 font-medium">{profileData.displayName || user?.displayName || '...'}님</span>

            <span className={`text-[11px] font-mono px-2 py-0.5 border rounded-md ${secondsLeft <= 300 ? 'text-red-500 border-red-300 animate-pulse' : secondsLeft <= 600 ? 'text-teal-500 border-teal-300' : 'text-slate-400 border-slate-200'}`} title="자동 로그아웃까지 남은 시간">
              {timerDisplay}
            </span>

            <button
              onClick={async () => {
                await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
                try { sessionStorage.removeItem('accounting-sso-set') } catch {}
                // 통합e logout 으로 navigate — .cert24.kr 쿠키 expire + /login redirect
                window.location.href = `${process.env.NEXT_PUBLIC_PLATFORM_URL || 'http://localhost:3000'}/api/auth/logout`
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

      {/* 2단: GNB 바 — 활성 카테고리 아이콘 색과 동일 */}
      <div className={gnbBg}>
        <div className="px-5 flex items-center gap-2 py-1 overflow-x-auto scrollbar-hide">
          {currentCategory.menus.map((item) => {
            const href = item.href || item.children?.[0]?.href || '#'
            const isActive = item.href
              ? (pathname === item.href || pathname?.startsWith(item.href + '/'))
              : item.children?.some((c) => pathname === c.href || pathname?.startsWith(c.href + '/'))
            return (
              <Link
                key={item.label}
                href={href}
                className={`px-5 py-2 text-[13px] font-bold whitespace-nowrap border-b-3 ${
                  isActive
                    ? 'text-white border-b-white'
                    : 'text-white/80 border-b-transparent hover:text-white hover:border-b-white/50'
                }`}
              >
                {item.label}
              </Link>
            )
          })}
          <div className="ml-auto flex items-center gap-2 shrink-0">
            <a
              href="https://070remotehelp.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-3 py-1 text-[11px] font-bold text-white bg-gradient-to-r from-orange-400 to-red-400 rounded-full hover:from-orange-500 hover:to-red-500 transition-all shadow-sm whitespace-nowrap"
            >
              원격지원
              <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25h-13.5A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25h-13.5A2.25 2.25 0 013 12V5.25" />
              </svg>
            </a>
            <button
              onClick={() => setGnbExpanded(!gnbExpanded)}
              className="flex items-center gap-1 px-2 py-1 text-[11px] text-white/80 hover:text-white hover:bg-white/15 rounded transition-colors whitespace-nowrap"
            >
              <svg className={`w-3.5 h-3.5 transition-transform ${gnbExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
              {gnbExpanded ? '접기' : '펼쳐보기'}
            </button>
          </div>
        </div>
      </div>

      {/* 3단: 하위 탭 (항상 표시) */}
      {activeMenu && activeMenu.children && (
        <div className="bg-white border-b border-slate-200">
          <div className="px-5 flex items-center gap-0 overflow-x-auto scrollbar-hide">
            {activeMenu.children.map((sub) => {
              const isActive = pathname === sub.href || pathname?.startsWith(sub.href + '/')
              return (
                <Link
                  key={sub.href}
                  href={sub.href}
                  className={`px-4 py-2.5 text-[12px] font-bold whitespace-nowrap border-b-2 transition-colors ${
                    isActive
                      ? 'text-slate-900 border-b-teal-500'
                      : 'text-slate-400 border-b-transparent hover:text-slate-700 hover:border-b-slate-300'
                  }`}
                >
                  {sub.label}
                </Link>
              )
            })}
            <div className="flex items-center gap-3 ml-auto text-[11px] text-slate-500 whitespace-nowrap">
              <span>회계담당: <strong className="text-slate-700">홍길동</strong> 010-1111-1111</span>
              <span className="text-slate-300">|</span>
              <span>급여관리: <strong className="text-slate-700">032-584-9019</strong></span>
              <span className="text-slate-300">|</span>
              <span>팩스: <strong className="text-slate-700">032-584-9019</strong></span>
            </div>
          </div>
        </div>
      )}

      {/* 4단: 아이사랑꿈터 장부 선택 — 회계 메뉴에서만 노출 (종사자/아동/물품/커뮤니티 제외) */}
      {institutionType === 'ilovechild' && currentCategory.key === 'accounting' && activeMenu && activeMenu.children && (
        <div className="bg-white border-b border-slate-200">
          <div className="px-5 py-1.5 flex items-center">
            <BookDropdown />
          </div>
        </div>
      )}

      {/* 어린이집 정보 팝업 */}
      {centerInfoOpen && (
        <div className="fixed inset-0 bg-black/40 z-[9999] flex items-start justify-center pt-10 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-[700px] mb-10 border border-slate-300" onClick={e => e.stopPropagation()}>
            <div className="flex items-center border-b border-slate-200">
              {(['basic', 'accounting', 'stamp'] as const).map(tab => (
                <button key={tab} onClick={() => setCenterInfoTab(tab)} className={`px-5 py-3 text-[12px] font-bold border-b-2 transition-colors ${centerInfoTab === tab ? 'text-slate-900 border-b-teal-500' : 'text-slate-400 border-b-transparent hover:text-slate-600'}`}>
                  {tab === 'basic' ? '기본정보' : tab === 'accounting' ? '회계연동정보' : '직인정보'}
                </button>
              ))}
              <button onClick={() => setCenterInfoOpen(false)} className="ml-auto px-3 text-slate-400 hover:text-slate-600 text-lg">×</button>
            </div>

            {centerInfoTab === 'basic' && (
              <div className="p-4">
                <p className="text-[11px] font-bold text-slate-600 mb-3">기본정보</p>
                <table className="w-full text-[12px] border-collapse">
                  <tbody>
                    {[
                      ['아이디', profileData.userId || ''],
                      ['새 비밀번호', ''],
                      ['새 비밀번호 확인', ''],
                      ['이름(상호)', profileData.centerName || ''],
                      ['사업자등록번호', profileData.bizNo || ''],
                      ['대표자명', profileData.ownerName || ''],
                    ].map(([label, val], i) => (
                      <tr key={i} className="border-b border-slate-100">
                        <td className="text-[12px] font-medium text-slate-700 bg-slate-50 px-3 py-2.5 border-r border-slate-200 w-[120px]">{label}</td>
                        <td className="px-3 py-2.5">{label === '새 비밀번호' ? <input type="password" value={basicForm.pw} onChange={e => setBasicForm(f => ({ ...f, pw: e.target.value }))} className="border border-teal-300 rounded px-2 py-1 text-[12px] w-64" placeholder="공백문자를 제외한 6 ~ 12 자, 비밀번호를 변경하고 싶으면 입력하세요" /> : label === '새 비밀번호 확인' ? <input type="password" value={basicForm.pw2} onChange={e => setBasicForm(f => ({ ...f, pw2: e.target.value }))} className="border border-teal-300 rounded px-2 py-1 text-[12px] w-64" placeholder="비밀번호를 다시 한번 확인합니다." /> : label === '이름(상호)' ? <input type="text" value={basicForm.name} onChange={e => setBasicForm(f => ({ ...f, name: e.target.value }))} className="border border-teal-300 rounded px-2 py-1 text-[12px] w-64" /> : label === '사업자등록번호' ? <input type="text" value={basicForm.bizNo} onChange={e => setBasicForm(f => ({ ...f, bizNo: e.target.value }))} className="border border-teal-300 rounded px-2 py-1 text-[12px] w-64" /> : label === '대표자명' ? <input type="text" value={basicForm.ownerName} onChange={e => setBasicForm(f => ({ ...f, ownerName: e.target.value }))} className="border border-teal-300 rounded px-2 py-1 text-[12px] w-64" /> : label === '아이디' ? <span className="text-slate-700">{val}</span> : <input type="text" className="border border-teal-300 rounded px-2 py-1 text-[12px] w-64" />}</td>
                      </tr>
                    ))}
                    <tr className="border-b border-slate-100">
                      <td className="text-[12px] font-medium text-slate-700 bg-slate-50 px-3 py-2.5 border-r border-slate-200">주소</td>
                      <td className="px-3 py-2.5"><div className="flex gap-1 mb-1"><input type="text" value={basicForm.zipCode} onChange={e => setBasicForm(f => ({ ...f, zipCode: e.target.value }))} className="border border-teal-300 rounded px-2 py-1 text-[12px] w-20" /><button type="button" onClick={openPostcode} className="px-2 py-1 text-[10px] bg-slate-100 border border-slate-300 rounded hover:bg-slate-200">우편번호</button></div><input type="text" value={basicForm.address} onChange={e => setBasicForm(f => ({ ...f, address: e.target.value }))} className="border border-teal-300 rounded px-2 py-1 text-[12px] w-full" placeholder="우편번호 검색 후 상세주소 입력" /></td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="text-[12px] font-medium text-slate-700 bg-slate-50 px-3 py-2.5 border-r border-slate-200">일반전화</td>
                      <td className="px-3 py-2.5 flex items-center gap-0.5" key={`tel-${profileData.phone}`}><input type="text" defaultValue={splitPhone(profileData.phone)[0]} className="border border-teal-300 rounded px-2 py-1 text-[12px] w-14 text-center" />-<input type="text" defaultValue={splitPhone(profileData.phone)[1]} className="border border-teal-300 rounded px-2 py-1 text-[12px] w-14 text-center" />-<input type="text" defaultValue={splitPhone(profileData.phone)[2]} className="border border-teal-300 rounded px-2 py-1 text-[12px] w-14 text-center" /></td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="text-[12px] font-medium text-slate-700 bg-slate-50 px-3 py-2.5 border-r border-slate-200">휴대전화</td>
                      <td className="px-3 py-2.5 flex items-center gap-0.5" key={`hp-${profileData.phone}`}><input type="text" defaultValue={splitPhone(profileData.phone)[0] || '010'} className="border border-teal-300 rounded px-2 py-1 text-[12px] w-14 text-center" />-<input type="text" defaultValue={splitPhone(profileData.phone)[1]} className="border border-teal-300 rounded px-2 py-1 text-[12px] w-14 text-center" />-<input type="text" defaultValue={splitPhone(profileData.phone)[2]} className="border border-teal-300 rounded px-2 py-1 text-[12px] w-14 text-center" /></td>
                    </tr>
                    {([
                      ['이메일', profileData.email || ''],
                      // 제본·원아 정원은 아이사랑꿈터 미사용 → 제거 (어린이집은 유지)
                      ...(institutionType !== 'ilovechild' ? [['제본', ''], ['원아 정원', '76 명']] as [string, string][] : []),
                    ] as [string, string][]).map(([label, val]) => (
                      <tr key={`${label}-${val}`} className="border-b border-slate-100">
                        <td className="text-[12px] font-medium text-slate-700 bg-slate-50 px-3 py-2.5 border-r border-slate-200">{label}</td>
                        <td className="px-3 py-2.5">{label === '제본' ? <><label className="text-[11px]"><input type="radio" name="binding" className="mr-0.5" />양면</label><label className="text-[11px] ml-2"><input type="radio" name="binding" defaultChecked className="mr-0.5" />단면</label></> : label === '원아 정원' ? <select className="border border-teal-300 rounded px-2 py-1 text-[12px]"><option>76 명</option></select> : label === '이메일' ? <input type="text" value={basicForm.email} onChange={e => setBasicForm(f => ({ ...f, email: e.target.value }))} className="border border-teal-300 rounded px-2 py-1 text-[12px] w-64" /> : <input type="text" defaultValue={val} className="border border-teal-300 rounded px-2 py-1 text-[12px] w-64" />}</td>
                      </tr>
                    ))}
                    <tr className="border-b border-slate-100">
                      <td className="text-[12px] font-medium text-slate-700 bg-slate-50 px-3 py-2.5 border-r border-slate-200">그룹/등급/상태</td>
                      <td className="px-3 py-2.5 text-[12px] text-slate-600">{institutionType === 'ilovechild' ? '아이사랑꿈터회원' : '어린이집회원'} / 통합 일반 / 정상회원</td>
                    </tr>
                    <tr>
                      <td className="text-[12px] font-medium text-slate-700 bg-slate-50 px-3 py-2.5 border-r border-slate-200">가입/수정/로긴</td>
                      <td className="px-3 py-2.5 text-[11px] text-slate-500">2013-10-21 17:14:51 / 2020-12-24 10:39:23 / 2025-09-30 15:19:17</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {centerInfoTab === 'accounting' && (
              <div className="p-4">
                <p className="text-[11px] font-bold text-slate-600 mb-3">회계연동정보</p>
                <table className="w-full text-[12px] border-collapse">
                  <tbody>
                    <tr className="border-b border-slate-100">
                      <td className="font-medium text-slate-700 bg-slate-50 px-3 py-2.5 border-r border-slate-200 w-[140px]">회계보고 인증키</td>
                      <td className="px-3 py-2.5 text-[11px] text-slate-600">79AA08D8DD1274B7A6FD73833A2DAEC8</td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="font-medium text-slate-700 bg-slate-50 px-3 py-2.5 border-r border-slate-200">기용지역형</td>
                      <td className="px-3 py-2.5"><select className="border border-teal-300 rounded px-2 py-1 text-[12px] w-40"><option>서비스를 선택하세요</option></select></td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="font-medium text-slate-700 bg-slate-50 px-3 py-2.5 border-r border-slate-200">뱅크다 K</td>
                      <td className="px-3 py-2.5"><select className="border border-teal-300 rounded px-2 py-1 text-[12px] w-40"><option>서비스를 선택하세요</option></select></td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="font-medium text-slate-700 bg-slate-50 px-3 py-2.5 border-r border-slate-200">충남형(농협)</td>
                      <td className="px-3 py-2.5"><span className="text-[11px] text-slate-500">아이디:</span><input type="text" className="border border-teal-300 rounded px-2 py-1 text-[12px] w-32 ml-1" /><span className="text-[11px] text-slate-500 ml-2">비밀번호:</span><input type="password" className="border border-teal-300 rounded px-2 py-1 text-[12px] w-32 ml-1" /></td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="font-medium text-slate-700 bg-slate-50 px-3 py-2.5 border-r border-slate-200">은행명</td>
                      <td className="px-3 py-2.5"><input type="text" className="border border-teal-300 rounded px-2 py-1 text-[12px] w-full" /></td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="font-medium text-slate-700 bg-slate-50 px-3 py-2.5 border-r border-slate-200">은행 계좌번호</td>
                      <td className="px-3 py-2.5"><input type="text" className="border border-teal-300 rounded px-2 py-1 text-[12px] w-full" /></td>
                    </tr>
                    {['직책급 한도액 설정','원장급여 한도액 설정','원장수당 한도액 설정','일반아동 급식단가 설정','누리아동 급식단가 설정'].map((label, i) => (
                      <tr key={i} className="border-b border-slate-100">
                        <td className="font-medium text-slate-700 bg-slate-50 px-3 py-2.5 border-r border-slate-200">{label}</td>
                        <td className="px-3 py-2.5"><input type="number" defaultValue={0} className="border border-teal-300 rounded px-2 py-1 text-[12px] w-24 text-right" />{label.includes('급식') && <span className="text-[10px] text-red-500 ml-1">* 숫자만 입력하세요. 마감시 사용.</span>}</td>
                      </tr>
                    ))}
                    <tr className="border-b border-slate-100">
                      <td className="font-medium text-slate-700 bg-slate-50 px-3 py-2.5 border-r border-slate-200">4대보험 자동이체일</td>
                      <td className="px-3 py-2.5"><label className="text-[11px]"><input type="radio" name="insuranceDate" defaultChecked className="mr-0.5" />매월 10일</label><label className="text-[11px] ml-2"><input type="radio" name="insuranceDate" className="mr-0.5" />매월 말일</label></td>
                    </tr>
                    <tr>
                      <td className="font-medium text-slate-700 bg-slate-50 px-3 py-2.5 border-r border-slate-200">홈택스</td>
                      <td className="px-3 py-2.5"><span className="text-[11px] text-slate-500">아이디:</span><input type="text" className="border border-teal-300 rounded px-2 py-1 text-[12px] w-32 ml-1" /><span className="text-[11px] text-slate-500 ml-2">비밀번호:</span><input type="password" className="border border-teal-300 rounded px-2 py-1 text-[12px] w-32 ml-1" /></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {centerInfoTab === 'stamp' && (
              <div className="p-4">
                <p className="text-[11px] font-bold text-slate-600 mb-3">직인정보</p>
                <p className="text-[10px] text-slate-500 mb-3">*jpg, gif, png 이미지파일로 등록하세요</p>
                <table className="w-full text-[12px] border-collapse">
                  <tbody>
                    {['원장님도장','담당도장','보육료대장 직인'].map((label, i) => (
                      <tr key={i} className="border-b border-slate-100">
                        <td className="font-medium text-slate-700 bg-slate-50 px-3 py-2.5 border-r border-slate-200 w-[120px]">{label}</td>
                        <td className="px-3 py-2.5"><input type="file" className="text-[10px]" /> <span className="text-[10px] text-slate-400">선택된 파일 없음</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-end gap-2">
              {basicMsg && <span className={`text-xs font-semibold ${basicMsg.startsWith('❌') ? 'text-rose-600' : 'text-emerald-700'}`}>{basicMsg}</span>}
              <button onClick={saveBasicInfo} disabled={basicSaving} className="px-6 py-2 text-xs font-bold text-white bg-teal-500 hover:bg-teal-600 rounded disabled:opacity-50">{basicSaving ? '저장 중…' : '수정'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
