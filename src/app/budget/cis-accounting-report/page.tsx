'use client'

import { useState } from 'react'

interface ToolButton {
  label: string
  color?: 'pink' | 'green' | 'default'
  onClick?: () => void
}

interface ToolGroup {
  buttons: ToolButton[]
}

const toolGroups: ToolGroup[] = [
  {
    buttons: [
      { label: '전표' },
      { label: '등록' },
      { label: '합산' },
      { label: '삭제' },
      { label: '일괄분리' },
      { label: '미계정전환' },
    ],
  },
  {
    buttons: [
      { label: '적요' },
      { label: '삭제' },
      { label: '치환' },
      { label: '세목추가' },
    ],
  },
  {
    buttons: [
      { label: '매핑', color: 'pink' },
      { label: '원아경비' },
      { label: '거래처.적요.결제방식' },
    ],
  },
  {
    buttons: [
      { label: '정렬', color: 'green' },
      { label: '수입부우선' },
      { label: '전표번호' },
      { label: '전체' },
    ],
  },
]

const colorMap = {
  default: 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300',
  pink: 'bg-pink-50 hover:bg-pink-100 text-pink-700 border-pink-300',
  green: 'bg-green-50 hover:bg-green-100 text-green-700 border-green-300',
}

export default function CisAccountingReportPage() {
  const [activeBtn, setActiveBtn] = useState<string | null>(null)

  return (
    <div className="p-4">
      {/* 툴바 */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 flex items-center gap-0 overflow-x-auto scrollbar-hide">
        {toolGroups.map((group, gi) => (
          <div key={gi} className="flex items-center">
            {gi > 0 && <div className="w-px h-7 bg-slate-300 mx-2 flex-shrink-0" />}
            <div className="flex items-center gap-1">
              {group.buttons.map((btn) => {
                const isActive = activeBtn === `${gi}-${btn.label}`
                const base = colorMap[btn.color || 'default']
                return (
                  <button
                    key={`${gi}-${btn.label}`}
                    onClick={() => {
                      setActiveBtn(`${gi}-${btn.label}`)
                      btn.onClick?.()
                    }}
                    className={`px-3 py-1.5 text-[12px] font-bold whitespace-nowrap border rounded transition-all sub-tab-hover ${
                      isActive
                        ? 'ring-2 ring-amber-400 shadow-sm'
                        : base
                    }`}
                  >
                    {btn.label}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* 데이터 영역 (placeholder) */}
      <div className="mt-4 bg-white border border-slate-200 rounded-lg p-6 min-h-[500px] flex items-center justify-center text-slate-400 text-sm">
        CIS 예산회계보고 데이터 영역
      </div>
    </div>
  )
}
