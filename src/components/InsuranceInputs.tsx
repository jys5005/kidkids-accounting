'use client'
import React from 'react'
import { formatSsn } from '@/lib/formatSsn'

const inputCls = "border border-teal-300 rounded px-1.5 py-1 text-[11px] focus:outline-none focus:border-teal-500"
const wrapCls = "flex justify-center"

// 성명 입력: 숫자 차단, 한글만
export function NameInput({ className = '' }: { className?: string }) {
  return (
    <div className={wrapCls}>
      <input
        type="text"
        className={`${inputCls} ${className || 'w-[80%]'}`}
        onKeyDown={e => { if (/[0-9]/.test(e.key) && !e.ctrlKey) e.preventDefault() }}
        placeholder="성명"
      />
    </div>
  )
}

// 주민등록번호 입력: 숫자만, 6자리 후 자동 하이픈, 최대 14자(하이픈 포함)
export function SsnInput({ className = '' }: { className?: string }) {
  return (
    <div className={wrapCls}>
      <input
        type="text"
        maxLength={14}
        className={`${inputCls} ${className || 'w-[80%]'}`}
        placeholder="000000-0000000"
        onChange={e => { e.target.value = formatSsn(e.target.value) }}
      />
    </div>
  )
}

// 숫자만 입력 (금액, 개월수, 보수총액 등)
export function NumberOnlyInput({ className = '', placeholder = '' }: { className?: string; placeholder?: string }) {
  return (
    <div className={wrapCls}>
      <input
        type="text"
        className={`${inputCls} ${className || 'w-[80%] text-right'}`}
        placeholder={placeholder}
        onKeyDown={e => { if (!/[0-9]/.test(e.key) && !['Backspace','Delete','Tab','ArrowLeft','ArrowRight','Home','End'].includes(e.key) && !e.ctrlKey) e.preventDefault() }}
        onChange={e => { e.target.value = e.target.value.replace(/[^0-9]/g, '') }}
      />
    </div>
  )
}

export { inputCls }
