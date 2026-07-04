'use client'

import { useState, useEffect } from 'react'
import { ILOVECHILD_BOOKS, getActiveBook, setActiveBook, BOOK_CHANGE_EVENT } from '@/lib/ilovechild-books'

/**
 * 아이사랑꿈터 장부(계정) 3토글 — 보육정보센터/보조금/이용료.
 * 각 테이블 상단에 배치. 클릭 시 공유 활성장부(setActiveBook)를 바꾸고 BOOK_CHANGE_EVENT 발생 →
 * 모든 테이블이 그 장부 기준으로 로드된다. 저장 알림은 각 테이블(예: 전표입력)이 이벤트를 받아 처리.
 * 어린이집 등 다른 유형에서는 렌더 안 함.
 */
export default function BookToggle() {
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
    <div className="inline-flex items-center gap-0.5 bg-slate-100 rounded-lg p-0.5">
      <span className="text-[11px] font-bold text-slate-400 px-1.5">장부</span>
      {ILOVECHILD_BOOKS.map(b => (
        <button
          key={b.code}
          onClick={() => { if (b.code !== book) setActiveBook(b.code) }}
          className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${
            book === b.code ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          {b.label}
        </button>
      ))}
    </div>
  )
}
