'use client'

import { useEffect, useState } from 'react'

interface CisStatus {
  hasUserId: boolean
  hasUserPw: boolean
}

interface ProgramEntry {
  authType: string
  hasUserId?: boolean
  hasUserPw?: boolean
  certName?: string
  hasCertPw?: boolean
  savedAt: string
}

const PROGRAM_LABELS: Record<string, string> = {
  by24: '보육나라',
  kidshome: '키즈홈',
  incheon: '인천시어린이집관리시스템',
  kidkids: '키드키즈',
  prime: '프라임전자장부',
  easys: '이편한시스템',
  mores: '더편한시스템',
  seoul: '서울시어린이집관리시스템',
}

export default function SettingsPage() {
  const [cisStatus, setCisStatus] = useState<CisStatus | null>(null)
  const [cisLoading, setCisLoading] = useState(true)
  const [programs, setPrograms] = useState<Record<string, ProgramEntry>>({})
  const [programLoading, setProgramLoading] = useState(true)

  useEffect(() => {
    // CIS 상태
    fetch('/api/settings/cis-status')
      .then(res => res.json())
      .then(json => { if (json.success) setCisStatus(json.data) })
      .catch(() => {})
      .finally(() => setCisLoading(false))

    // 회계프로그램 등록 상태
    fetch('/api/settings/program-auth')
      .then(res => res.json())
      .then(json => { if (json.success) setPrograms(json.data ?? {}) })
      .catch(() => {})
      .finally(() => setProgramLoading(false))
  }, [])

  const cisReady = cisStatus && cisStatus.hasUserId && cisStatus.hasUserPw
  const programCount = Object.keys(programs).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">설정</h1>
        <p className="text-sm text-slate-500 mt-1">인증 상태 확인 및 관리</p>
      </div>

      {/* 보육통합(CIS) 인증 상태 */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${cisReady ? 'bg-emerald-500' : 'bg-red-400'}`} />
            <h2 className="font-semibold text-slate-800">보육통합정보시스템 (CIS)</h2>
          </div>
          <a
            href={`${process.env.NEXT_PUBLIC_PLATFORM_URL || 'http://localhost:4000'}/dashboard/settings/cis-auth`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            통합e에서 관리 &rarr;
          </a>
        </div>

        {cisLoading ? (
          <p className="text-sm text-slate-400">확인 중...</p>
        ) : cisStatus ? (
          <div className="grid grid-cols-2 gap-3">
            <StatusItem label="CIS 아이디" ok={cisStatus.hasUserId} />
            <StatusItem label="CIS 비밀번호" ok={cisStatus.hasUserPw} />
          </div>
        ) : (
          <p className="text-sm text-slate-400">통합e 서버에 연결할 수 없습니다.</p>
        )}
      </div>

      {/* 회계프로그램 등록 상태 */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${programCount > 0 ? 'bg-emerald-500' : 'bg-red-400'}`} />
            <h2 className="font-semibold text-slate-800">회계프로그램</h2>
            <span className="text-xs text-slate-400">({programCount}개 등록)</span>
          </div>
          <a
            href={`${process.env.NEXT_PUBLIC_PLATFORM_URL || 'http://localhost:4000'}/dashboard/settings/cis-auth`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            통합e에서 관리 &rarr;
          </a>
        </div>

        {programLoading ? (
          <p className="text-sm text-slate-400">확인 중...</p>
        ) : programCount > 0 ? (
          <div className="space-y-2">
            {Object.entries(programs).map(([id, entry]) => (
              <div key={id} className="flex items-center justify-between px-3 py-2.5 rounded-lg border bg-emerald-50 border-emerald-200">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-emerald-600">&#x2713;</span>
                  <div>
                    <span className="text-sm font-medium text-emerald-800">{PROGRAM_LABELS[id] || id}</span>
                    {entry.authType === 'cert' && entry.certName && (
                      <span className="text-xs text-emerald-600 ml-2">({entry.certName})</span>
                    )}
                    {entry.authType === 'idpw' && (
                      <span className="text-xs text-emerald-600 ml-2">(아이디/비밀번호)</span>
                    )}
                  </div>
                </div>
                <span className="text-xs text-emerald-500">{new Date(entry.savedAt).toLocaleDateString('ko-KR')}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-xs text-amber-700 font-medium">등록된 회계프로그램이 없습니다.</p>
            <p className="text-xs text-amber-600 mt-1">통합e 인증설정 &gt; 회계프로그램 관리에서 등록하세요.</p>
          </div>
        )}
      </div>

      {/* 안내 */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
        <p className="text-xs text-slate-500">
          모든 인증 정보는 <strong>통합e 인증설정</strong>에서 등록·관리됩니다.
          회계프로그램 등록 시 로그인 검증을 거쳐 정상 확인 후 저장됩니다.
        </p>
      </div>
    </div>
  )
}

function StatusItem({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${ok ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
      <span className={`text-sm ${ok ? 'text-emerald-600' : 'text-red-400'}`}>{ok ? '\u2713' : '\u2717'}</span>
      <span className={`text-xs font-medium ${ok ? 'text-emerald-700' : 'text-red-600'}`}>{label}</span>
    </div>
  )
}
