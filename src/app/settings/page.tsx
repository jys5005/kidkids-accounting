'use client'

import { useEffect, useState } from 'react'
import { REGION_SYSTEMS } from '@/lib/region-systems'

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
  // 지역시스템 설정 — 이 시설이 어느 지역형 회계시스템을 쓰는지. profile.regionSystem 에 저장(PUT /api/auth/me
  // 가 그대로 프록시 → 통합e updateUser 가 profile 필드만 머지, 다른 정보 안 건드림).
  const [regionSystem, setRegionSystem] = useState<string>('')
  const [regionLoading, setRegionLoading] = useState(true)
  const [regionSaving, setRegionSaving] = useState(false)
  const [regionMsg, setRegionMsg] = useState('')

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

    // 지역시스템 설정
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(json => setRegionSystem((json?.profile?.regionSystem as string) || ''))
      .catch(() => {})
      .finally(() => setRegionLoading(false))
  }, [])

  const saveRegionSystem = async (value: string) => {
    setRegionSaving(true); setRegionMsg('')
    try {
      const res = await fetch('/api/auth/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile: { regionSystem: value } }),
      })
      const j = await res.json()
      if (j.success) { setRegionSystem(value); setRegionMsg('✅ 저장됨') }
      else setRegionMsg(`❌ ${j.error || '저장 실패'}`)
    } catch (e) {
      setRegionMsg(`❌ ${e instanceof Error ? e.message : '연결 실패'}`)
    } finally {
      setRegionSaving(false)
      setTimeout(() => setRegionMsg(''), 3000)
    }
  }

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
            href={`${process.env.NEXT_PUBLIC_PLATFORM_URL || 'http://localhost:3000'}/dashboard/settings/cis-auth`}
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
            href={`${process.env.NEXT_PUBLIC_PLATFORM_URL || 'http://localhost:3000'}/dashboard/settings/cis-auth`}
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
          <div className="bg-teal-50 border border-teal-200 rounded-lg p-3">
            <p className="text-xs text-teal-700 font-medium">등록된 회계프로그램이 없습니다.</p>
            <p className="text-xs text-teal-600 mt-1">통합e 인증설정 &gt; 회계프로그램 관리에서 등록하세요.</p>
          </div>
        )}
      </div>

      {/* 지역시스템 설정 */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className={`w-2.5 h-2.5 rounded-full ${regionSystem ? 'bg-emerald-500' : 'bg-slate-300'}`} />
          <h2 className="font-semibold text-slate-800">지역시스템</h2>
        </div>
        <p className="text-xs text-slate-500 mb-3">
          이 시설이 어느 지역 어린이집관리시스템을 쓰는지 지정합니다. 데이터이관으로 안 들어온 수기입력 전표도
          이 설정으로 어느 지역인지 판단할 수 있어, "전표수정" 등 지역형 전용 기능이 더 안정적으로 동작합니다.
        </p>
        {regionLoading ? (
          <p className="text-sm text-slate-400">확인 중...</p>
        ) : (
          <div className="flex items-center gap-2">
            <select
              value={regionSystem}
              onChange={e => saveRegionSystem(e.target.value)}
              disabled={regionSaving}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm disabled:opacity-50"
            >
              <option value="">해당없음(일반 어린이집)</option>
              {REGION_SYSTEMS.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
            {regionMsg && <span className="text-xs text-slate-500">{regionMsg}</span>}
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
