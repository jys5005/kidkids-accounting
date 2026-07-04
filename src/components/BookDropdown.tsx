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

  return (
    <div className="inline-flex items-center gap-1.5">
      <span className="text-[11px] font-extrabold text-white bg-gradient-to-r from-blue-600 to-indigo-600 px-2.5 py-1.5 rounded-lg shadow-sm whitespace-nowrap">📒 장부</span>
      <select
        value={book}
        onChange={e => setActiveBook(e.target.value)}
        className="border-2 border-blue-500 rounded-lg px-3 py-1.5 text-sm font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-300 cursor-pointer shadow-sm transition-colors"
      >
        {ILOVECHILD_BOOKS.map(b => (
          <option key={b.code} value={b.code}>{b.label}</option>
        ))}
      </select>
    </div>
  )
}
