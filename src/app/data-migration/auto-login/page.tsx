'use client'

import { useEffect } from 'react'

/**
 * 이 페이지는 통합e /admin/auto-login 으로 이관되었습니다.
 * 사용자가 기존 북마크/링크로 접근 시 통합e 관리자 패널로 리다이렉트.
 */
const PLATFORM_URL =
  process.env.NEXT_PUBLIC_PLATFORM_URL ||
  (typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'http://localhost:3000'
    : 'http://76.13.216.76:4000')

export default function AutoLoginRedirect() {
  useEffect(() => {
    window.location.replace(`${PLATFORM_URL}/admin/auto-login`)
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center space-y-2">
        <div className="text-slate-600 text-base font-bold">통합e 관리자 패널로 이동 중...</div>
        <div className="text-slate-400 text-sm">
          어린이집 자동로그인은 <code className="px-1.5 py-0.5 bg-slate-100 rounded text-xs">/admin/auto-login</code> 으로 이관되었습니다
        </div>
        <a
          href={`${PLATFORM_URL}/admin/auto-login`}
          className="inline-block mt-3 px-4 py-2 text-sm font-bold text-white bg-teal-500 hover:bg-teal-600 rounded"
        >
          바로 가기
        </a>
      </div>
    </div>
  )
}
