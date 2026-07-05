'use client'

import { useState, useEffect } from 'react'

/**
 * 4대보험 신고 페이지의 [CIS종사자조회] 버튼.
 * 아이사랑꿈터(ilovechild)는 CIS 미사용 → 렌더 안 함(자체 유형 게이트).
 * 어린이집 등은 기존과 동일하게 노출.
 */
export default function CisStaffLookupButton() {
  const [show, setShow] = useState(false)
  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then(r => r.json())
      .then(d => setShow(((d?.institutionType || d?.profile?.institutionType) as string) !== 'ilovechild'))
      .catch(() => setShow(true))
  }, [])
  if (!show) return null
  return (
    <button className="px-4 py-1.5 text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 rounded">CIS종사자조회</button>
  )
}
