'use client'

import { useState, useEffect } from 'react'
import { ILOVECHILD_BOOKS, getActiveBook, setActiveBook, BOOK_CHANGE_EVENT } from '@/lib/ilovechild-books'

/**
 * 아이사랑꿈터 장부 선택 드롭다운 — 보육정보센터/보조금/이용료.
 * 페이지 조회조건 줄(회계연도 옆 등)에 배치. 선택 시 공유 활성장부(setActiveBook)를 바꾸고
 * BOOK_CHANGE_EVENT 발생 → 모든 book-연동 페이지가 그 장부로 로드된다.
 * 어린이집 등 다른 유형에서는 렌더 안 함(자체 유형 게이트).
 */
export default function BookDropdown() {
  const [book, setBook] = useState('')
  const [show, setShow] = useState(false)

  useEffect(() => {
    setBook(getActiveBook())
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => {
        const t = (d?.institutionType || d?.profile?.institutionType || 'childcare') as string
        setShow(t === 'ilovechild')
      })
      .catch(() => {})
    const onCh = (e: Event) => setBook(((e as CustomEvent).detail as string) || '')
    window.addEventListener(BOOK_CHANGE_EVENT, onCh)
    return () => window.removeEventListener(BOOK_CHANGE_EVENT, onCh)
  }, [])

  if (!show) return null

  // 장부 구분(보육정보센터/보조금/이용료) — 알약(pill) 토글. 선택 장부만 파란 배지로 강조.
  return (
    <div className="inline-flex items-center gap-1" title="장부 선택">
      <span className="text-[11px] font-bold text-slate-400 mr-1">장부</span>
      {ILOVECHILD_BOOKS.map(b => (
        <button
          key={b.code}
          onClick={() => { if (b.code !== book) setActiveBook(b.code) }}
          className={`px-3.5 py-1 text-xs font-bold rounded-full border transition-colors ${
            book === b.code
              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
              : 'bg-white text-slate-500 border-slate-300 hover:border-blue-400 hover:text-blue-600'
          }`}
        >
          {b.label}
        </button>
      ))}
    </div>
  )
}
