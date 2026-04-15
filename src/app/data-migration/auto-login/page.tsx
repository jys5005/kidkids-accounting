'use client'

import { useState, useEffect, useCallback } from 'react'

// ─── ExWeb 통신 ──────────────────────────────────────────────────────────────
const EXWEB_URL = 'https://127.0.0.1:16566'

interface ExWebCert {
  drive: string
  certName: string
  fromDt: string
  toDt: string
  pub: string
  sn: string
  oid: string
  path: string
}

async function callExWeb(op: string, body?: string | null) {
  const res = await fetch(`${EXWEB_URL}/?op=${op}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=UTF-8' },
    body: body ?? null,
    mode: 'cors',
  })
  if (!res.ok) throw new Error(`ExWeb 응답 오류: ${res.status}`)
  return res.json()
}

async function checkExWeb(): Promise<{ available: boolean; version?: string }> {
  try {
    const json = await callExWeb('setup')
    return json.errYn === 'N' ? { available: true, version: json.nxVer } : { available: false }
  } catch {
    return { available: false }
  }
}

async function getCertList(drive?: string): Promise<ExWebCert[]> {
  const body = drive ? JSON.stringify({ certDrive: drive }) : null
  const json = await callExWeb('certList', body)
  if (json.errYn === 'Y') throw new Error(json.errMsg || '인증서 목록 조회 실패')
  return (json.list as ExWebCert[]) ?? []
}

async function selectCertPopup(): Promise<{ cert_nm: string; file1: string; file2: string; end_dt: string; cert_pw: string }> {
  const json = await callExWeb('certSelect', '{"certImageUrl": "", "nxKeypad": ""}')
  if (json.errYn === 'Y') throw new Error(json.errMsg || '인증서 선택 실패')
  return json as { cert_nm: string; file1: string; file2: string; end_dt: string; cert_pw: string }
}

const allCompanies = [
  '보육나라', '장부나라', '키즈홈', '인천시어린이집관리시스템',
  '경기도어린이집관리시스템', '대전시어린이집관리시스템',
  '충청남도어린이집관리시스템(하나은행)', '프라임전자장부', '키득키즈',
  '서울시어린이집관리시스템', '이편한시스템', '더편한시스템', '와이즈안',
  '키드키즈', '부산시어린이집관리시스템', '광주시어린이집관리시스템',
]

type Row = {
  label: string
  facilityName: string
  authType: 'id+pw' | 'cert'
  id: string
  pw: string
  certFile: string
  certPw: string
  lastLogin: string
  verifyStatus?: 'success' | 'fail' | ''
}

const TH = 'px-2 py-2 text-center font-bold text-slate-700 whitespace-nowrap border-b border-r border-slate-200 text-[11px] bg-yellow-300'
const STORAGE_KEY = 'autoLoginRows'

function makeRow(label: string): Row {
  return { label, facilityName: '', authType: 'id+pw', id: '', pw: '', certFile: '', certPw: '', lastLogin: '' }
}

export default function AutoLoginPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [selectedCompany, setSelectedCompany] = useState('')

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try { setRows(JSON.parse(stored)) } catch {}
    }
  }, [])

  const save = (updated: Row[]) => {
    setRows(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  }

  const handleChange = (idx: number, field: keyof Row, value: string) => {
    const next = [...rows]
    next[idx] = { ...next[idx], [field]: value }
    setRows(next)
  }

  const handleSave = (idx: number) => {
    const now = new Date()
    const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`
    const next = [...rows]
    next[idx] = { ...next[idx], lastLogin: dateStr }
    save(next)
    alert(`${rows[idx].label} 저장 완료`)
  }

  const handleDeleteRow = (idx: number) => {
    if (!confirm(`"${rows[idx].label}" 업체를 삭제하시겠습니까?`)) return
    const next = rows.filter((_, i) => i !== idx)
    save(next)
  }

  const handleClearRow = (idx: number) => {
    const next = [...rows]
    next[idx] = { ...next[idx], id: '', pw: '', certFile: '', lastLogin: '' }
    save(next)
  }

  const [certModalIdx, setCertModalIdx] = useState<number | null>(null)
  const [testingIdx, setTestingIdx] = useState<number | null>(null)

  // ExWeb 상태
  const [exwebOk, setExwebOk] = useState(false)
  const [exwebVer, setExwebVer] = useState('')
  const [certList, setCertList] = useState<ExWebCert[]>([])
  const [certLoading, setCertLoading] = useState(false)
  const [certError, setCertError] = useState('')
  const [certDrive, setCertDrive] = useState('hard')

  // ExWeb 설치 확인 (모달 열릴 때)
  useEffect(() => {
    if (certModalIdx === null) return
    setCertError('')
    setCertList([])
    checkExWeb().then(r => {
      setExwebOk(r.available)
      if (r.version) setExwebVer(r.version)
      if (r.available) {
        // 자동으로 인증서 목록 조회
        setCertLoading(true)
        getCertList()
          .then(list => setCertList(list))
          .catch(e => setCertError(e.message))
          .finally(() => setCertLoading(false))
      }
    })
  }, [certModalIdx])

  // 인증서 목록 새로고침
  const handleRefreshCerts = useCallback(async () => {
    setCertLoading(true)
    setCertError('')
    try {
      const driveParam = certDrive === 'hard' ? undefined : certDrive
      const list = await getCertList(driveParam)
      setCertList(list)
      if (list.length === 0) setCertError('저장된 인증서가 없습니다.')
    } catch (e) {
      setCertError(e instanceof Error ? e.message : '인증서 목록 조회 실패')
    } finally {
      setCertLoading(false)
    }
  }, [certDrive])

  // ExWeb 인증서 선택 팝업 (Windows)
  const handleExWebSelect = useCallback(async () => {
    if (certModalIdx === null) return
    setCertLoading(true)
    setCertError('')
    try {
      const cert = await selectCertPopup()
      const next = [...rows]
      next[certModalIdx] = { ...next[certModalIdx], certFile: cert.cert_nm, certPw: cert.cert_pw }
      save(next)
      setCertError('')
    } catch (e) {
      setCertError(e instanceof Error ? e.message : '인증서 선택 실패')
    } finally {
      setCertLoading(false)
    }
  }, [certModalIdx, rows])

  // 목록에서 인증서 클릭 선택
  const handleCertClick = useCallback((cert: ExWebCert) => {
    if (certModalIdx === null) return
    const next = [...rows]
    next[certModalIdx] = { ...next[certModalIdx], certFile: cert.certName }
    save(next)
  }, [certModalIdx, rows])

  const handleCertFileSelect = (idx: number, file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      const next = [...rows]
      next[idx] = { ...next[idx], certFile: file.name }
      save(next)
    }
    reader.readAsDataURL(file)
  }

  const handleTest = async (idx: number) => {
    const row = rows[idx]
    if (row.authType === 'id+pw' && (!row.id || !row.pw)) { alert('아이디와 비밀번호를 입력해주세요.'); return }
    if (row.authType === 'cert' && (!row.certFile || !row.certPw)) { alert('인증서를 등록해주세요.'); return }
    setTestingIdx(idx)
    try {
      const res = await fetch('/api/auto-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company: row.label,
          authType: row.authType === 'id+pw' ? 'idpw' : 'cert',
          id: row.id,
          pw: row.pw,
          certName: row.certFile,
          certPw: row.certPw,
          action: 'verify',
        }),
      })
      const data = await res.json()
      if (data.success) {
        const now = new Date()
        const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`
        const next = [...rows]
        next[idx] = { ...next[idx], lastLogin: dateStr, verifyStatus: 'success' }
        save(next)
      } else {
        const next = [...rows]
        next[idx] = { ...next[idx], verifyStatus: 'fail' }
        save(next)
        alert(data.error || data.message || '로그인 실패')
      }
    } catch {
      const next = [...rows]
      next[idx] = { ...next[idx], verifyStatus: 'fail' }
      save(next)
      alert('통합e 서버에 연결할 수 없습니다.')
    } finally {
      setTestingIdx(null)
    }
  }

  // 통합e에 인증정보 저장
  const handleSaveToServer = async (idx: number) => {
    const row = rows[idx]
    try {
      const res = await fetch('/api/auto-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company: row.label,
          authType: row.authType === 'id+pw' ? 'idpw' : 'cert',
          id: row.id,
          pw: row.pw,
          certName: row.certFile,
          certPw: row.certPw,
        }),
      })
      const data = await res.json()
      if (data.success) {
        handleSave(idx)
      } else {
        alert(data.message || '저장 실패')
      }
    } catch {
      alert('통합e 서버에 연결할 수 없습니다.')
    }
  }

  // 로그인 버튼: ExWeb execute로 인포텍 인증 후 해당 사이트 자동 로그인
  const [loginIdx, setLoginIdx] = useState<number | null>(null)

  const handleLogin = async (idx: number) => {
    const row = rows[idx]
    if (row.authType === 'cert' && (!row.certFile || !row.certPw)) { alert('인증서를 등록해주세요.'); return }
    if (row.authType === 'id+pw' && (!row.id || !row.pw)) { alert('아이디와 비밀번호를 입력해주세요.'); return }

    setLoginIdx(idx)
    try {
      // Puppeteer로 해당 사이트에 자동 로그인 (서버에서 브라우저를 직접 열어줌)
      const res = await fetch('/api/auto-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company: row.label,
          authType: row.authType === 'id+pw' ? 'idpw' : 'cert',
          id: row.id,
          pw: row.pw,
          certName: row.certFile,
          certPw: row.certPw,
          action: 'login',
        }),
      })
      const data = await res.json()
      if (data.success) {
        const now = new Date()
        const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`
        const next = [...rows]
        next[idx] = { ...next[idx], lastLogin: dateStr, verifyStatus: 'success' }
        save(next)
      } else {
        const next = [...rows]
        next[idx] = { ...next[idx], verifyStatus: 'fail' }
        save(next)
        alert(data.error || data.message || '로그인 실패')
      }
    } catch (e) {
      const next = [...rows]
      next[idx] = { ...next[idx], verifyStatus: 'fail' }
      save(next)
      alert(`로그인 실패: ${e instanceof Error ? e.message : '알 수 없는 오류'}`)
    } finally {
      setLoginIdx(null)
    }
  }

  // 메뉴 이동 (월회계보고/추경/결산/카드매칭)
  const [navIdx, setNavIdx] = useState<number | null>(null)
  // 카드매칭 내역 모달 인덱스
  const [historyIdx, setHistoryIdx] = useState<number | null>(null)
  // 카드매칭 구간 선택 모달 인덱스
  const [matchRangeIdx, setMatchRangeIdx] = useState<number | null>(null)
  // 행별 최근 매핑 정보 (캐시) — { rowIdx: { targetMonth, matched, runAt } }
  const [latestMatch, setLatestMatch] = useState<Record<number, { targetMonth: string; matched: number; runAt: string } | null>>({})

  // 카드매칭 행에 대해 최근 이력 조회 (rows 변경 시) — 로컬 프록시 경유
  const refreshLatestMatch = useCallback(async (idx: number) => {
    const row = rows[idx]
    if (!row) return
    const facilityKey = row.facilityName || row.label || `idx-${idx}`
    if (!facilityKey) return
    try {
      const res = await fetch(`/api/card-match-history?facilityKey=${encodeURIComponent(facilityKey)}`)
      const data = await res.json()
      const list = (data.list || []) as Array<{ targetMonth: string; matched: number; runAt: string }>
      if (list.length === 0) { setLatestMatch(prev => ({ ...prev, [idx]: null })); return }
      const latest = list.slice().sort((a, b) => (b.runAt || '').localeCompare(a.runAt || ''))[0]
      setLatestMatch(prev => ({ ...prev, [idx]: latest }))
    } catch {
      // 무시
    }
  }, [rows])

  useEffect(() => {
    rows.forEach((_, idx) => refreshLatestMatch(idx))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows])

  /** "YYYY-MM" 시작 ~ 종료 사이의 월 목록 반환 */
  const monthsInRange = (start: string, end: string): string[] => {
    const [sy, sm] = start.split('-').map(Number)
    const [ey, em] = end.split('-').map(Number)
    const result: string[] = []
    let y = sy, m = sm
    let safety = 0
    while ((y < ey || (y === ey && m <= em)) && safety++ < 60) {
      result.push(`${y}-${String(m).padStart(2, '0')}`)
      m++
      if (m > 12) { m = 1; y++ }
    }
    return result
  }

  const handleNavigate = async (idx: number, menuName: string, opts?: { monthList?: string[] }) => {
    const row = rows[idx]
    if (row.authType === 'cert' && (!row.certFile || !row.certPw)) { alert('인증서를 등록해주세요.'); return }

    // 카드매칭은 구간 모달에서 monthList 를 받아옴 — 모달 아직이면 모달 열기
    let monthList: string[]
    if (menuName === '카드매칭') {
      if (!opts?.monthList || opts.monthList.length === 0) {
        setMatchRangeIdx(idx)  // 모달 오픈, 매핑 시작은 모달에서 호출
        return
      }
      monthList = opts.monthList
    } else {
      monthList = ['']  // 그 외 메뉴는 월 의미 없음, 1회 호출
    }

    setNavIdx(idx)
    const facilityKey = row.facilityName || row.label || `idx-${idx}`
    let totalMatched = 0, totalSkipped = 0, totalErrors = 0
    const monthResults: string[] = []
    try {
      for (const targetMonth of monthList) {
        const res = await fetch('/api/auto-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            company: row.label,
            action: 'navigate',
            menuName,
            targetMonth: targetMonth || undefined,
            certName: row.certFile,
            certPw: row.certPw,
            facilityKey,
          }),
        })
        const data = await res.json()
        if (!data.success) {
          alert(data.error || data.message || `${menuName} ${targetMonth || ''} 실패`)
          break
        }
        if (menuName === '카드매칭' && data.result) {
          totalMatched += data.result.matched || 0
          totalSkipped += data.result.skipped || 0
          totalErrors += (data.result.errors || []).length
          monthResults.push(`${targetMonth} → 성공 ${data.result.matched} / 스킵 ${data.result.skipped}`)
        }
      }
      if (menuName === '카드매칭' && monthList.length > 0) {
        alert(
          `카드매칭 완료\n` +
          `대상: ${monthList[0]} ~ ${monthList[monthList.length - 1]} (${monthList.length}개월)\n` +
          `성공 ${totalMatched}건 / 스킵 ${totalSkipped}건 / 실패 ${totalErrors}건\n\n` +
          monthResults.join('\n')
        )
        // 카드매칭 완료 후 행의 최근 매핑 정보 새로고침
        refreshLatestMatch(idx)
      }
    } catch (e) {
      alert(`이동 실패: ${e instanceof Error ? e.message : '알 수 없는 오류'}`)
    } finally {
      setNavIdx(null)
    }
  }

  const handleAdd = () => {
    if (!selectedCompany) { alert('업체를 선택해주세요.'); return }
    save([...rows, makeRow(selectedCompany)])
    setSelectedCompany('')
  }

  return (
    <div className="p-6 space-y-4">
      {/* 언더바 탭 */}
      <div className="flex items-center gap-0 border-b border-slate-200">
        <a href="/data-migration" className="px-4 py-2 text-[12px] font-bold whitespace-nowrap border-b-2 text-slate-400 border-transparent hover:text-slate-600 hover:border-slate-300">데이터이관</a>
        <a href="/data-migration/auto-login" className="px-4 py-2 text-[12px] font-bold whitespace-nowrap border-b-2 text-teal-700 border-teal-500">자동로그인</a>
      </div>
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-bold text-slate-800">자동로그인</h2>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-slate-600">회계장부업체명</span>
          <select
            value={selectedCompany}
            onChange={e => setSelectedCompany(e.target.value)}
            className="border border-slate-300 rounded px-2 py-1.5 text-[11px] min-w-[200px] focus:outline-none focus:border-blue-400"
          >
            <option value="">업체 선택</option>
            {allCompanies.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button onClick={handleAdd} className="px-3 py-1.5 text-[11px] font-bold text-white bg-blue-500 hover:bg-blue-600 rounded transition-colors">추가</button>
        </div>
      </div>

      <div className="bg-white rounded border border-slate-200 overflow-x-auto">
        <table className="w-full text-[11px] border-collapse min-w-[1100px]">
          <thead>
            <tr>
              <th className={TH} style={{width:40}}>연번</th>
              <th className={TH} style={{width:200}}>업체명</th>
              <th className={TH} style={{width:150}}>시설명</th>
              <th className={TH} style={{width:80}}>로그인방식</th>
              <th className={TH} style={{width:140}}>아이디</th>
              <th className={TH} style={{width:140}}>비번</th>
              <th className={TH} style={{width:80}}>인증서등록</th>
              <th className={TH} style={{width:80}}>저장,삭제</th>
              <th className={TH} style={{width:50}}>검증</th>
              <th className={TH} style={{width:90}}>최종로그인</th>
              <th className={TH} style={{width:50}}>로그인</th>
              <th className={TH} style={{width:70}}>월회계보고</th>
              <th className={TH} style={{width:70}}>예산회계보고</th>
              <th className={TH} style={{width:70}}>결산회계보고</th>
              <th className={`${TH} border-r-0`} style={{width:70}}>카드매칭</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50/50">
                <td className="px-2 py-2.5 text-center border-r border-slate-100 text-slate-500">{idx + 1}</td>
                <td className="px-2 py-2.5 border-r border-slate-100 font-medium text-slate-800">{row.label}</td>
                <td className="px-1.5 py-1.5 border-r border-slate-100">
                  <input
                    type="text"
                    value={row.facilityName}
                    onChange={e => handleChange(idx, 'facilityName', e.target.value)}
                    placeholder="시설명 입력"
                    className="w-full border border-slate-300 rounded px-1.5 py-1 text-[11px] focus:outline-none focus:border-blue-400 placeholder:text-slate-300"
                  />
                </td>
                <td className="px-1.5 py-1.5 text-center border-r border-slate-100">
                  <select
                    value={row.authType}
                    onChange={e => handleChange(idx, 'authType', e.target.value)}
                    className="border border-slate-300 rounded px-1 py-0.5 text-[10px] focus:outline-none focus:border-blue-400"
                  >
                    <option value="id+pw">id+pw</option>
                    <option value="cert">공인인증서</option>
                  </select>
                </td>
                <td className={`px-1.5 py-1.5 border-r border-slate-100 ${row.authType !== 'id+pw' ? 'bg-slate-100' : ''}`}>
                  <input
                    type="text"
                    value={row.id}
                    onChange={e => handleChange(idx, 'id', e.target.value)}
                    disabled={row.authType !== 'id+pw'}
                    className={`w-full border border-slate-300 rounded px-1.5 py-1 text-[11px] focus:outline-none focus:border-blue-400 ${row.authType !== 'id+pw' ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : ''}`}
                  />
                </td>
                <td className={`px-1.5 py-1.5 border-r border-slate-100 ${row.authType !== 'id+pw' ? 'bg-slate-100' : ''}`}>
                  <input
                    type="password"
                    value={row.pw}
                    onChange={e => handleChange(idx, 'pw', e.target.value)}
                    disabled={row.authType !== 'id+pw'}
                    className={`w-full border border-slate-300 rounded px-1.5 py-1 text-[11px] focus:outline-none focus:border-blue-400 ${row.authType !== 'id+pw' ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : ''}`}
                  />
                </td>
                <td className={`px-1.5 py-1.5 text-center border-r border-slate-100 ${row.authType !== 'cert' ? 'bg-slate-100' : ''}`}>
                  {row.authType === 'cert' ? (
                    <button onClick={() => setCertModalIdx(idx)} className="px-2 py-0.5 text-[10px] font-bold text-slate-600 bg-white border border-slate-300 rounded hover:bg-slate-50">
                      {row.certFile ? '✔ 등록됨' : '선택...'}
                    </button>
                  ) : (
                    <span className="text-slate-300">-</span>
                  )}
                </td>
                <td className="px-1.5 py-1.5 text-center border-r border-slate-100">
                  <div className="flex items-center justify-center gap-1">
                    <button onClick={() => handleSaveToServer(idx)} className="px-1.5 py-0.5 text-[10px] font-bold text-white bg-teal-500 rounded">저장</button>
                    <button onClick={() => handleClearRow(idx)} className="px-1.5 py-0.5 text-[10px] font-bold text-white bg-slate-400 rounded">초기화</button>
                    <button onClick={() => handleDeleteRow(idx)} className="px-1.5 py-0.5 text-[10px] font-bold text-white bg-red-400 rounded">삭제</button>
                  </div>
                </td>
                <td className="px-2 py-2.5 text-center border-r border-slate-100">
                  <div className="flex flex-col items-center gap-0.5">
                    {(row.id || row.certFile) ? (
                      <button onClick={() => handleTest(idx)} disabled={testingIdx === idx} className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${testingIdx === idx ? 'text-slate-400 border border-slate-200 bg-slate-50' : 'text-blue-600 border border-blue-300 bg-blue-50'}`}>
                        {testingIdx === idx ? '검증중...' : '실행'}
                      </button>
                    ) : <span className="text-slate-300">-</span>}
                    {row.verifyStatus === 'success' && (
                      <span className="text-[9px] font-bold text-green-600 bg-green-50 border border-green-200 rounded px-1">성공</span>
                    )}
                    {row.verifyStatus === 'fail' && (
                      <span className="text-[9px] font-bold text-red-500 bg-red-50 border border-red-200 rounded px-1">실패</span>
                    )}
                  </div>
                </td>
                <td className="px-2 py-2.5 text-center border-r border-slate-100 text-[10px] text-slate-500">{row.lastLogin || '-'}</td>
                <td className="px-2 py-2.5 text-center border-r border-slate-100">
                  {(row.id || row.certFile) ? (
                    <button
                      onClick={() => handleLogin(idx)}
                      disabled={loginIdx === idx}
                      className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${loginIdx === idx ? 'text-slate-400 border border-slate-200 bg-slate-50' : 'text-teal-600 border border-teal-300 bg-teal-50 hover:bg-teal-100'}`}
                    >
                      {loginIdx === idx ? '로그인중...' : '로그인'}
                    </button>
                  ) : <span className="text-slate-300">-</span>}
                </td>
                <td className="px-2 py-2.5 text-center border-r border-slate-100">
                  <button
                    onClick={() => handleNavigate(idx, '월회계보고')}
                    disabled={navIdx === idx}
                    className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${navIdx === idx ? 'text-slate-400 border border-slate-200 bg-slate-50' : 'text-indigo-600 border border-indigo-300 bg-indigo-50 hover:bg-indigo-100'}`}
                  >
                    {navIdx === idx ? '이동중...' : '이동'}
                  </button>
                </td>
                <td className="px-2 py-2.5 text-center border-r border-slate-100">
                  <button
                    onClick={() => handleNavigate(idx, '예산회계보고')}
                    disabled={navIdx === idx}
                    className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${navIdx === idx ? 'text-slate-400 border border-slate-200 bg-slate-50' : 'text-indigo-600 border border-indigo-300 bg-indigo-50 hover:bg-indigo-100'}`}
                  >
                    {navIdx === idx ? '이동중...' : '이동'}
                  </button>
                </td>
                <td className="px-2 py-2.5 text-center border-r border-slate-100">
                  <button
                    onClick={() => handleNavigate(idx, '결산회계보고')}
                    disabled={navIdx === idx}
                    className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${navIdx === idx ? 'text-slate-400 border border-slate-200 bg-slate-50' : 'text-indigo-600 border border-indigo-300 bg-indigo-50 hover:bg-indigo-100'}`}
                  >
                    {navIdx === idx ? '이동중...' : '이동'}
                  </button>
                </td>
                <td className="px-2 py-2.5 text-center">
                  <div className="flex flex-col items-center gap-1">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => handleNavigate(idx, '카드매칭')}
                        disabled={navIdx === idx}
                        className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${navIdx === idx ? 'text-slate-400 border border-slate-200 bg-slate-50' : 'text-indigo-600 border border-indigo-300 bg-indigo-50 hover:bg-indigo-100'}`}
                      >
                        {navIdx === idx ? '매핑중...' : '매핑'}
                      </button>
                      <button
                        onClick={() => setHistoryIdx(idx)}
                        className="px-1.5 py-0.5 text-[10px] font-bold text-slate-600 border border-slate-300 bg-white rounded hover:bg-slate-50"
                      >
                        내역
                      </button>
                    </div>
                    {latestMatch[idx] && (
                      <div className="text-[9px] text-slate-500 leading-tight whitespace-nowrap">
                        <span className="text-blue-600 font-bold">{latestMatch[idx]!.matched}건</span>
                        <span className="mx-1">·</span>
                        <span>{latestMatch[idx]!.targetMonth}</span>
                        <div className="text-[8px] text-slate-400">{(latestMatch[idx]!.runAt || '').slice(0, 10)}</div>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 카드매칭 구간 선택 모달 */}
      {matchRangeIdx !== null && (
        <CardMatchRangeModal
          facilityKey={rows[matchRangeIdx]?.facilityName || rows[matchRangeIdx]?.label || `idx-${matchRangeIdx}`}
          onClose={() => setMatchRangeIdx(null)}
          onStart={(monthList) => {
            const idx = matchRangeIdx
            setMatchRangeIdx(null)
            if (idx !== null) handleNavigate(idx, '카드매칭', { monthList })
          }}
        />
      )}

      {/* 카드매칭 내역 모달 */}
      {historyIdx !== null && (
        <CardMatchHistoryModal
          facilityKey={rows[historyIdx]?.facilityName || rows[historyIdx]?.label || `idx-${historyIdx}`}
          onClose={() => setHistoryIdx(null)}
        />
      )}

      {/* 인포텍 인증프로그램 모달 */}
      {certModalIdx !== null && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setCertModalIdx(null)}>
          <div className="bg-white rounded-lg shadow-xl p-5 w-[420px] space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h3 className="text-[14px] font-bold text-slate-800">
                인포텍 인증프로그램
              </h3>
              <span className="text-[10px] text-slate-400">{rows[certModalIdx].label}</span>
            </div>

            {/* 인증서 선택 영역 */}
            <div className="border border-slate-200 rounded p-3 bg-slate-50 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center text-blue-600 text-[14px]">🔐</div>
                  <div>
                    <p className="text-[11px] font-bold text-slate-700">공동인증서 (구 공인인증서)</p>
                    <p className="text-[10px] text-slate-400">인포텍 인증프로그램을 통해 인증서를 등록합니다</p>
                  </div>
                </div>
                {/* ExWeb 상태 표시 */}
                <div className="flex items-center gap-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${exwebOk ? 'bg-green-500' : 'bg-red-400'}`} />
                  <span className={`text-[9px] ${exwebOk ? 'text-green-600' : 'text-red-500'}`}>
                    {exwebOk ? `ExWeb v${exwebVer}` : 'ExWeb 미연결'}
                  </span>
                </div>
              </div>

              {/* 인증서 저장위치 + 새로고침 */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-600">인증서 저장위치</label>
                <div className="flex gap-1.5">
                  <select
                    className="flex-1 border border-slate-300 rounded px-2 py-1.5 text-[11px] bg-white focus:outline-none focus:border-blue-400"
                    value={certDrive}
                    onChange={e => setCertDrive(e.target.value)}
                  >
                    <option value="hard">하드디스크</option>
                    <option value="usb">이동식디스크(USB)</option>
                    <option value="phone">휴대폰</option>
                    <option value="cloud">클라우드</option>
                  </select>
                  <button
                    onClick={handleRefreshCerts}
                    disabled={!exwebOk || certLoading}
                    className="px-2 py-1.5 text-[10px] font-bold border border-slate-300 rounded bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                    title="인증서 목록 새로고침"
                  >
                    {certLoading ? '⏳' : '🔄'} 조회
                  </button>
                </div>
              </div>

              {/* 인증서 목록 */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-slate-600">인증서 선택</label>
                  {exwebOk && (
                    <button
                      onClick={handleExWebSelect}
                      disabled={certLoading}
                      className="text-[9px] text-blue-600 hover:text-blue-800 font-bold disabled:opacity-40"
                    >
                      Windows 인증서 선택창 열기
                    </button>
                  )}
                </div>
                <div className="border border-slate-300 rounded bg-white max-h-[150px] overflow-y-auto">
                  {certLoading ? (
                    <div className="px-2 py-3 text-[10px] text-center text-slate-400">인증서 목록 조회 중...</div>
                  ) : certList.length > 0 ? (
                    certList.map((cert, i) => {
                      const selected = rows[certModalIdx]?.certFile === cert.certName
                      return (
                        <div
                          key={i}
                          onClick={() => handleCertClick(cert)}
                          className={`px-2 py-1.5 text-[11px] border-b border-slate-100 cursor-pointer transition-colors
                            ${selected ? 'bg-blue-50 border-blue-200' : 'hover:bg-slate-50'}`}
                        >
                          <div className="flex items-center gap-1.5">
                            <span className={selected ? 'text-blue-500' : 'text-slate-300'}>{selected ? '✔' : '○'}</span>
                            <span className={`font-medium ${selected ? 'text-blue-700' : 'text-slate-700'}`}>{cert.certName}</span>
                          </div>
                          <div className="ml-5 text-[9px] text-slate-400">
                            {cert.pub} · {cert.fromDt} ~ {cert.toDt}
                          </div>
                        </div>
                      )
                    })
                  ) : rows[certModalIdx]?.certFile ? (
                    <div className="px-2 py-1.5 text-[11px] bg-blue-50 border-b border-blue-100 flex items-center gap-1.5">
                      <span className="text-blue-500">✔</span>
                      <span className="text-slate-700 font-medium">{rows[certModalIdx].certFile}</span>
                    </div>
                  ) : (
                    <div className="px-2 py-3 text-[10px] text-center text-slate-400">
                      {exwebOk ? '인증서 목록이 비어 있습니다. 조회 버튼을 눌러주세요.' : 'ExWeb 미연결 — 파일 가져오기를 이용해주세요.'}
                    </div>
                  )}
                </div>
                {certError && (
                  <p className="text-[10px] text-red-500 mt-0.5">{certError}</p>
                )}
              </div>

              {/* 인증서 파일 가져오기 */}
              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-1">인증서 파일 가져오기</label>
                <input
                  type="file"
                  accept=".pfx,.p12,.der,.cer,.pem,.key"
                  onChange={e => {
                    const file = e.target.files?.[0]
                    if (file) handleCertFileSelect(certModalIdx, file)
                  }}
                  className="text-[10px] w-full file:mr-2 file:py-1 file:px-3 file:rounded file:border file:border-slate-300 file:text-[10px] file:font-bold file:bg-white file:text-slate-600 hover:file:bg-slate-50"
                />
              </div>
            </div>

            {/* 인증서 비밀번호 */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600">인증서 비밀번호</label>
              <input
                type="password"
                value={rows[certModalIdx].certPw || ''}
                onChange={e => handleChange(certModalIdx, 'certPw', e.target.value)}
                placeholder="인증서 비밀번호를 입력하세요"
                className="w-full border border-slate-300 rounded px-2 py-1.5 text-[11px] focus:outline-none focus:border-blue-400 placeholder:text-slate-300"
              />
            </div>

            {/* 버튼 */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => {
                  if (!rows[certModalIdx].certFile) { alert('인증서를 선택해주세요.'); return }
                  if (!rows[certModalIdx].certPw) { alert('인증서 비밀번호를 입력해주세요.'); return }
                  save([...rows])
                  setCertModalIdx(null)
                  alert('인증서가 등록되었습니다.')
                }}
                className="px-4 py-1.5 text-[11px] font-bold text-white bg-blue-500 rounded hover:bg-blue-600"
              >
                인증서 등록
              </button>
              <button
                onClick={() => {
                  const next = [...rows]
                  next[certModalIdx] = { ...next[certModalIdx], certFile: '', certPw: '' }
                  save(next)
                }}
                className="px-4 py-1.5 text-[11px] font-bold text-slate-600 bg-slate-100 rounded hover:bg-slate-200"
              >
                초기화
              </button>
              <button
                onClick={() => setCertModalIdx(null)}
                className="px-4 py-1.5 text-[11px] font-bold text-slate-500 border border-slate-300 rounded hover:bg-slate-50"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── 카드매칭 내역 모달 ─────────────────────────────────────────────────
const PLATFORM_URL = process.env.NEXT_PUBLIC_PLATFORM_URL || 'http://localhost:3000'

interface HistoryEntry {
  runAt:        string
  targetMonth:  string  // "YYYY-MM"
  matched:      number
  skipped:      number
  errorCount:   number
  errorSamples?: string[]
}

// ─── 카드매칭 구간 선택 모달 ─────────────────────────────────────────────
/**
 * 회계연도 + 시작월 + 종료월 드롭다운으로 매핑 구간 선택.
 * - 회계연도 1년(3월~익년 2월) 안에서만 선택 가능
 * - 종료월 옵션은 시작월 이후 ~ 회계연도 마지막 월(2월) 까지만 노출
 */
function CardMatchRangeModal({
  facilityKey, onClose, onStart,
}: { facilityKey: string; onClose: () => void; onStart: (monthList: string[]) => void }) {
  const now = new Date()
  // 회계연도: 1~2월은 전년도, 3월부터는 당해
  const fyDefault = now.getMonth() < 2 ? now.getFullYear() - 1 : now.getFullYear()
  const [fiscalYear, setFiscalYear] = useState<number>(fyDefault)

  // 회계연도 12개월 (3,4,...,12,1,2) — 각 월의 (년, 월) 쌍 반환
  const monthsOfFY = (fy: number): { ym: string; label: string; monthIdx: number }[] => {
    const arr: { ym: string; label: string; monthIdx: number }[] = []
    for (let i = 0; i < 12; i++) {
      const m = ((2 + i) % 12) + 1  // 3,4,5,...,12,1,2
      const y = i < 10 ? fy : fy + 1
      arr.push({ ym: `${y}-${String(m).padStart(2, '0')}`, label: `${y}년 ${String(m).padStart(2, '0')}월`, monthIdx: i })
    }
    return arr
  }

  const fyMonths = monthsOfFY(fiscalYear)
  // 기본값: 시작월 = 회계연도 첫 월(03월), 종료월 = 회계연도 마지막 월(익년 02월)
  const [startYm, setStartYm] = useState<string>(fyMonths[0].ym)
  const [endYm, setEndYm] = useState<string>(fyMonths[fyMonths.length - 1].ym)

  // 회계연도 변경 시 시작=03월 / 종료=익년 02월 으로 재설정
  useEffect(() => {
    const arr = monthsOfFY(fiscalYear)
    setStartYm(arr[0].ym)
    setEndYm(arr[arr.length - 1].ym)
  }, [fiscalYear])

  // 시작월 변경 시 종료월이 시작월보다 이르면 자동으로 시작월로 맞춤
  useEffect(() => {
    const startIdx = fyMonths.findIndex(x => x.ym === startYm)
    const endIdx = fyMonths.findIndex(x => x.ym === endYm)
    if (startIdx >= 0 && endIdx >= 0 && endIdx < startIdx) setEndYm(startYm)
  }, [startYm])  // eslint-disable-line react-hooks/exhaustive-deps

  const startIdx = fyMonths.findIndex(x => x.ym === startYm)
  const endOptions = startIdx >= 0 ? fyMonths.slice(startIdx) : fyMonths

  const handleStart = () => {
    const sIdx = fyMonths.findIndex(x => x.ym === startYm)
    const eIdx = fyMonths.findIndex(x => x.ym === endYm)
    if (sIdx < 0 || eIdx < 0 || eIdx < sIdx) { alert('시작월/종료월 선택 오류'); return }
    const list = fyMonths.slice(sIdx, eIdx + 1).map(x => x.ym)
    onStart(list)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl p-5 w-[460px] space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <h3 className="text-[14px] font-bold text-slate-800">카드매칭 구간 선택 <span className="text-[11px] text-slate-400 ml-2">{facilityKey}</span></h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-[18px]">×</button>
        </div>
        <div className="space-y-3 py-2">
          <div className="flex items-center gap-3">
            <label className="text-[11px] font-bold text-slate-600 w-16">회계연도</label>
            <select
              value={fiscalYear}
              onChange={e => setFiscalYear(Number(e.target.value))}
              className="border border-slate-300 rounded px-2 py-1.5 text-[11px] flex-1"
            >
              {[fyDefault - 2, fyDefault - 1, fyDefault, fyDefault + 1].map(y => (
                <option key={y} value={y}>{y}년 ({y}-03 ~ {y + 1}-02)</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-[11px] font-bold text-slate-600 w-16">시작월</label>
            <select
              value={startYm}
              onChange={e => setStartYm(e.target.value)}
              className="border border-slate-300 rounded px-2 py-1.5 text-[11px] flex-1"
            >
              {fyMonths.map(x => <option key={x.ym} value={x.ym}>{x.label}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-[11px] font-bold text-slate-600 w-16">종료월</label>
            <select
              value={endYm}
              onChange={e => setEndYm(e.target.value)}
              className="border border-slate-300 rounded px-2 py-1.5 text-[11px] flex-1"
            >
              {endOptions.map(x => <option key={x.ym} value={x.ym}>{x.label}</option>)}
            </select>
          </div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded p-2 text-[10px] text-amber-700">
          선택한 구간의 모든 월을 순차로 매핑합니다. 회계연도(3월~익년 2월) 한 개 안에서만 처리됩니다.
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-3 py-1.5 text-[11px] font-bold text-slate-600 border border-slate-300 bg-white rounded hover:bg-slate-50">취소</button>
          <button onClick={handleStart} className="px-3 py-1.5 text-[11px] font-bold text-white bg-indigo-500 hover:bg-indigo-600 rounded">매핑 시작</button>
        </div>
      </div>
    </div>
  )
}

function CardMatchHistoryModal({ facilityKey, onClose }: { facilityKey: string; onClose: () => void }) {
  const now = new Date()
  // 회계연도: 1~2월은 전년도, 3월부터는 당해
  const fyDefault = now.getMonth() < 2 ? now.getFullYear() - 1 : now.getFullYear()
  const [fiscalYear, setFiscalYear] = useState<number>(fyDefault)
  const [list, setList] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    // 로컬 프록시 경유 (CORS 회피)
    fetch(`/api/card-match-history?facilityKey=${encodeURIComponent(facilityKey)}`)
      .then(r => r.json())
      .then(data => { if (!cancelled) setList(data.list || []) })
      .catch(() => { if (!cancelled) setList([]) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [facilityKey])

  // 회계연도 12개월 (3월~익년 2월)
  const months: string[] = []
  for (let i = 0; i < 12; i++) {
    const m = ((2 + i) % 12) + 1  // 3,4,5,...,12,1,2
    const y = i < 10 ? fiscalYear : fiscalYear + 1
    months.push(`${y}-${String(m).padStart(2, '0')}`)
  }

  // 각 월의 최신 실행 이력 (최신 runAt 기준)
  const latestByMonth = new Map<string, HistoryEntry>()
  for (const e of list) {
    const cur = latestByMonth.get(e.targetMonth)
    if (!cur || (e.runAt || '') > (cur.runAt || '')) latestByMonth.set(e.targetMonth, e)
  }

  const fmtDt = (iso: string) => {
    if (!iso) return '-'
    const d = new Date(iso)
    if (isNaN(d.getTime())) return iso
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl p-5 w-[520px] space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <h3 className="text-[14px] font-bold text-slate-800">카드매칭 내역 <span className="text-[11px] text-slate-400 ml-2">{facilityKey}</span></h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-[18px]">×</button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-slate-600">회계연도</span>
          <select
            value={fiscalYear}
            onChange={e => setFiscalYear(Number(e.target.value))}
            className="border border-slate-300 rounded px-2 py-1 text-[11px]"
          >
            {[fyDefault - 2, fyDefault - 1, fyDefault, fyDefault + 1].map(y => (
              <option key={y} value={y}>{y}년</option>
            ))}
          </select>
          <span className="text-[10px] text-slate-400">({fiscalYear}년 03월 ~ {fiscalYear + 1}년 02월)</span>
        </div>
        <div className="border border-slate-200 rounded overflow-hidden">
          <table className="w-full text-[11px]">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-200">
                <th className="px-3 py-2 text-center font-bold text-slate-700 w-24">월</th>
                <th className="px-3 py-2 text-center font-bold text-slate-700 w-20">매핑개수</th>
                <th className="px-3 py-2 text-center font-bold text-slate-700">매핑일시</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={3} className="px-3 py-4 text-center text-slate-400">불러오는 중...</td></tr>
              )}
              {!loading && months.map(ym => {
                const [y, m] = ym.split('-')
                const e = latestByMonth.get(ym)
                return (
                  <tr key={ym} className="border-b border-slate-100 hover:bg-slate-50/40">
                    <td className="px-3 py-2 text-center text-slate-700">{y}년 {m}월</td>
                    <td className="px-3 py-2 text-center">{e ? <span className="font-bold text-blue-600">{e.matched}건</span> : <span className="text-slate-300">-</span>}</td>
                    <td className="px-3 py-2 text-center text-slate-500">{e ? fmtDt(e.runAt) : <span className="text-slate-300">-</span>}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="flex justify-end pt-2">
          <button onClick={onClose} className="px-3 py-1.5 text-[11px] font-bold text-white bg-slate-500 hover:bg-slate-600 rounded">닫기</button>
        </div>
      </div>
    </div>
  )
}
