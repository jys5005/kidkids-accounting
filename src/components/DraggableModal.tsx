'use client'
import React, { useState, useRef, useCallback, useEffect } from 'react'

interface Props {
  children: React.ReactNode
  onClose: () => void
  title?: string
  className?: string
}

export default function DraggableModal({ children, onClose, title, className = '' }: Props) {
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const dragging = useRef(false)
  const dragStart = useRef({ x: 0, y: 0 })

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    dragging.current = true
    dragStart.current = { x: e.clientX - pos.x, y: e.clientY - pos.y }
    e.preventDefault()
  }, [pos])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return
      setPos({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y })
    }
    const handleMouseUp = () => {
      dragging.current = false
    }
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div
        className={`bg-white rounded-xl shadow-2xl z-50 ${className}`}
        style={{ transform: `translate(${pos.x}px, ${pos.y}px)` }}
        onClick={e => e.stopPropagation()}
      >
        {title && (
          <div
            className="px-5 py-3 border-b border-slate-200 flex items-center justify-between cursor-move select-none"
            onMouseDown={onMouseDown}
          >
            <span className="text-[15px] font-bold text-slate-800">{title}</span>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg">&times;</button>
          </div>
        )}
        {children}
      </div>
    </div>
  )
}
