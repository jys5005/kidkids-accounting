'use client'
import React, { useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import DraggableModal from '@/components/DraggableModal'
const fmt = (n: number) => n.toLocaleString('ko-KR')
const inputCls = "border border-amber-300 rounded px-2 py-1 text-[11px] text-right focus:outline-none focus:border-amber-500 w-[70px]"

type ChildRow = {
  id: number; name: string; className: string; residentNo: string; status?: string
  enterDate?: string; leaveDate?: string
}

// 회계연도(3월~다음해2월) 상반기(3~8월) / 하반기(9~익년2월) 라벨
const HALF_LABELS: { half: 'H1' | 'H2'; label: string; months: number[] }[] = [
  { half: 'H1', label: '상반기(3~8월)',   months: [3, 4, 5, 6, 7, 8] },
  { half: 'H2', label: '하반기(9~익년2월)', months: [9, 10, 11, 12, 1, 2] },
]

type Step = 'select' | 'confirm' | 'edit'

export default function ExpensePage() {
  const now = new Date()
  const [yearMonth, setYearMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)
  const [step, setStep] = useState<Step>('select')
  const [checked, setChecked] = useState<Set<number>>(new Set())
  const [splitType, setSplitType] = useState<'equal' | 'custom'>('equal')
  const [splitAmount, setSplitAmount] = useState(100000)
  const [searchName, setSearchName] = useState('')
  const [filterClass, setFilterClass] = useState('선택')
  const [showConfirm, setShowConfirm] = useState(false)
  const [childrenList, setChildrenList] = useState<ChildRow[]>([])
  const [syncing, setSyncing] = useState(false)
  const [lastSynced, setLastSynced] = useState<string | null>(null)
  const excelInputRef = useRef<HTMLInputElement>(null)
  // 회계연도 (3월 시작). 1~2월은 전년도 회계연도
  const _curFY = (() => { const t = new Date(); return t.getMonth() + 1 <= 2 ? t.getFullYear() - 1 : t.getFullYear() })()
  const [fiscalYear, setFiscalYear] = useState<number>(_curFY)
  const [half, setHalf] = useState<'H1' | 'H2'>('H1')

  // 통합e 동기화 — 회계앱 server proxy → 통합e page_data (child-cur + child-leave)
  const handleSyncFromPlatform = async () => {
    if (syncing) return
    setSyncing(true)
    try {
      const r = await fetch('/api/sync/children', { cache: 'no-store' })
      if (r.status === 401) { alert('통합e 로그인이 필요합니다.'); return }
      const j = await r.json()
      if (!j.success) { alert(j.error || '동기화 실패'); return }
      const list: ChildRow[] = (j.children || []).map((c: { id: number; name: string; className: string; residentNo: string; status: string; enterDate?: string; leaveDate?: string }) => ({
        id: c.id, name: c.name, className: c.className, residentNo: c.residentNo, status: c.status,
        enterDate: c.enterDate, leaveDate: c.leaveDate,
      }))
      setChildrenList(list)
      setLastSynced(new Date().toLocaleString('ko-KR'))
      const src = j.source || {}
      alert(`✅ 통합e 동기화 완료\n\n총 ${j.count}명 (현원 ${src['child-cur'] ?? 0} / 퇴소 ${src['child-leave'] ?? 0})`)
    } catch (e) {
      alert('동기화 실패: ' + (e instanceof Error ? e.message : String(e)))
    } finally {
      setSyncing(false)
    }
  }

  // 엑셀 등록 — .xlsx/.xls 업로드 → 원아명단으로 파싱
  // 컬럼 키: 이름/반/주민번호/입소일/퇴소일 (없으면 빈 값)
  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target?.result as ArrayBuffer)
        const wb = XLSX.read(data, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const json = XLSX.utils.sheet_to_json<any>(ws)
        const parsed: ChildRow[] = json
          .filter((r: Record<string, unknown>) => String(r['이름'] ?? r['성명'] ?? r['원아명'] ?? '').trim())
          .map((r: Record<string, unknown>, idx: number) => ({
            id: idx + 1,
            name: String(r['이름'] ?? r['성명'] ?? r['원아명'] ?? '').trim(),
            className: String(r['반'] ?? r['반명'] ?? r['클래스'] ?? '').trim(),
            residentNo: String(r['주민번호'] ?? r['주민등록번호'] ?? '').trim(),
            enterDate: String(r['입소일'] ?? r['입학일'] ?? r['등원일'] ?? '').trim(),
            leaveDate: String(r['퇴소일'] ?? r['퇴원일'] ?? '').trim(),
            status: String(r['상태'] ?? '현원').trim(),
          }))
        if (parsed.length === 0) {
          alert('파싱된 행이 없습니다.\n엑셀 첫 행에 [이름] 컬럼이 있는지 확인해주세요.\n지원 컬럼: 이름·반·주민번호·입소일·퇴소일')
          return
        }
        setChildrenList(parsed)
        alert(`✅ 엑셀 등록 완료\n\n총 ${parsed.length}명 (${file.name})`)
      } catch (err) {
        alert('엑셀 파싱 실패: ' + (err instanceof Error ? err.message : String(err)))
      } finally {
        if (excelInputRef.current) excelInputRef.current.value = ''
      }
    }
    reader.readAsArrayBuffer(file)
  }

  // 분리적용 편집 데이터
  const [editRows, setEditRows] = useState<{ id: number; name: string; className: string; etcFee: number; entrance: number; fieldTrip: number; vehicle: number; event: number; mealFee: number; special: number; specialAct: number; applyMonth: string; amount: number }[]>([])

  const classes = [...new Set(childrenList.map(c => c.className).filter(Boolean))]
  const filtered = childrenList.filter(c =>
    (filterClass === '선택' || c.className === filterClass) &&
    (searchName === '' || c.name.includes(searchName))
  )

  const toggleCheck = (id: number) => {
    const next = new Set(checked)
    next.has(id) ? next.delete(id) : next.add(id)
    setChecked(next)
  }
  const toggleAll = () => {
    if (checked.size === filtered.length) setChecked(new Set())
    else setChecked(new Set(filtered.map(c => c.id)))
  }

  const handleNext = () => {
    if (checked.size === 0) { alert('원아를 선택해주세요.'); return }
    setShowConfirm(true)
  }

  const handleConfirm = () => {
    setShowConfirm(false)
    const selected = childrenList.filter(c => checked.has(c.id))
    const perChild = splitType === 'equal' ? Math.floor(splitAmount / selected.length) : 0
    setEditRows(selected.map(c => ({
      id: c.id, name: c.name, className: c.className,
      etcFee: 0, entrance: 0, fieldTrip: 0, vehicle: 0, event: 0, mealFee: 0, special: 0, specialAct: 0,
      applyMonth: yearMonth, amount: perChild,
    })))
    setStep('edit')
  }

  const updateEditRow = (id: number, key: string, val: number | string) => {
    setEditRows(prev => prev.map(r => r.id === id ? { ...r, [key]: val } : r))
  }

  const totalSplit = editRows.reduce((s, r) => s + r.amount, 0)
  const diff = splitAmount - totalSplit

  // Step: 원아 선택
  if (step === 'select') {
    return (
      <div className="p-3 space-y-3">
        <div className="bg-white rounded-xl border border-teal-400/30 shadow-sm">
          <div className="px-4 py-3 border-b border-teal-400/20 flex items-center gap-3 flex-wrap">
            <span className="text-sm font-bold text-slate-700">필요경비요율정산서</span>
            <div className="flex items-center gap-1.5 ml-2">
              <span className="text-[11px] font-bold text-slate-600">회계연도</span>
              <select
                value={fiscalYear}
                onChange={e => setFiscalYear(Number(e.target.value))}
                className="border border-teal-300 rounded px-2 py-1 text-[12px] font-bold"
              >
                {Array.from({ length: 6 }, (_, i) => _curFY - 4 + i).map(y => (
                  <option key={y} value={y}>{y}년</option>
                ))}
              </select>
              <span className="text-[11px] text-slate-500">→</span>
              <div className="inline-flex rounded overflow-hidden border border-teal-300">
                {HALF_LABELS.map(h => (
                  <button
                    key={h.half}
                    onClick={() => setHalf(h.half)}
                    className={`px-2.5 py-1 text-[11px] font-bold transition-colors ${
                      half === h.half ? 'bg-teal-600 text-white' : 'bg-white text-slate-600 hover:bg-teal-50'
                    }`}
                  >
                    {h.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 상반기/하반기 실제 사용 요율 — 데이터 연결 전 영역 */}
        <div className="bg-gradient-to-r from-amber-50 to-pink-50 border border-amber-200 rounded-lg px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12px] font-bold text-amber-800">
              📊 {fiscalYear}년 {HALF_LABELS.find(h => h.half === half)?.label} 실제 사용 요율
            </span>
            <span className="text-[10px] text-slate-500">
              해당 반기 회계보고(sub-acct) 기준 — 항목별 합계
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
            {['기타필요경비', '입학준비금', '현장학습비', '차량운행비', '행사비', '조석식비', '특성화비', '특별활동비'].map(label => (
              <div key={label} className="bg-white rounded px-2 py-1.5 border border-slate-200">
                <div className="text-[9px] text-slate-500">{label}</div>
                <div className="text-[12px] font-bold text-slate-700 text-right">- 원</div>
              </div>
            ))}
          </div>
        </div>

        {/* 안내 */}
        <div className="bg-yellow-50 border border-yellow-300 rounded-lg px-4 py-3 text-[12px] text-yellow-800 space-y-1">
          <p className="font-bold">[참조] 분리적용할 원아를 선택하신 후 다음을 클릭하세요.</p>
          <p className="ml-4">분리적용할 경우 이름앞에 체크하신 후 다음을 클릭하세요.</p>
          <p className="text-blue-700 font-bold">[분리할 수입내역 적요] : {yearMonth.replace('-', '년 ')}월 입소로 정용</p>
          <p className="text-red-600 font-bold">[분리할 금액] {fmt(splitAmount)}원</p>
        </div>

        {/* 옵션 */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <span className="text-[12px] font-bold text-slate-700">원아검색</span>
            <label className="text-[11px]"><input type="radio" name="status" defaultChecked className="mr-0.5" />현원 기준</label>
            <label className="text-[11px]"><input type="radio" name="status" className="mr-0.5" />퇴소일 무시</label>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[12px] font-bold text-slate-700">반선택</span>
            <select value={filterClass} onChange={e => setFilterClass(e.target.value)} className="border border-teal-300 rounded px-2 py-1 text-[12px]">
              <option>선택</option>
              {classes.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[12px] font-bold text-slate-700">원아명/반</span>
            <input value={searchName} onChange={e => setSearchName(e.target.value)} className="border border-teal-300 rounded px-2 py-1 text-[12px] w-28" />
            <button className="px-3 py-1 text-[11px] font-bold text-white bg-teal-500 rounded">검색</button>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <input
              ref={excelInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleExcelUpload}
            />
            <button
              onClick={() => excelInputRef.current?.click()}
              className="flex items-center gap-1 px-3 py-1 text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded transition-colors"
              title=".xlsx/.xls 파일에서 원아명단을 불러옵니다 (이름·반·주민번호·입소일·퇴소일)"
            >
              📊 엑셀등록
            </button>
            <button
              onClick={handleSyncFromPlatform}
              disabled={syncing}
              className="flex items-center gap-1 px-3 py-1 text-[11px] font-bold text-white bg-gradient-to-r from-yellow-400 to-pink-500 hover:from-yellow-500 hover:to-pink-600 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="통합e의 원아명단(CIS E0003 현원+퇴소)을 불러옵니다"
            >
              {syncing ? (
                <>
                  <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  동기화 중…
                </>
              ) : (
                <>🔄 통합e 동기화</>
              )}
            </button>
            {lastSynced && <span className="text-[10px] text-slate-400">최근: {lastSynced}</span>}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <label className="text-[12px]"><input type="radio" name="split" checked={splitType === 'equal'} onChange={() => setSplitType('equal')} className="mr-1" />균등분할</label>
          <label className="text-[12px]"><input type="radio" name="split" checked={splitType === 'custom'} onChange={() => setSplitType('custom')} className="mr-1" />개별금액분할</label>
          <div className="flex items-center gap-1">
            <span className="text-[12px] font-bold text-slate-700">분리할 금액:</span>
            <input type="text" value={fmt(splitAmount)} onChange={e => setSplitAmount(Number(e.target.value.replace(/[^0-9]/g, '')) || 0)} className="border border-teal-300 rounded px-2 py-1 text-[12px] w-32 text-right" />
            <span className="text-[12px] text-slate-500">원</span>
          </div>
        </div>

        {/* 원아명 색상 안내 */}
        <p className="text-[10px]">
          * 원아명 색상 : <span className="text-red-500">특별활동참여 안함</span>, <span className="text-green-600">기타필요경비 참여 안함</span>, <span className="text-blue-600">특별활동참여 + 기타필요경비 참여 안함</span>, 해당사항없음
        </p>

        {/* 다음 버튼 */}
        <div className="flex justify-center">
          <button onClick={handleNext} className="px-10 py-2 text-[13px] font-bold text-white bg-teal-600 rounded hover:bg-teal-700">다 음</button>
        </div>

        {/* 테이블 */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
          <table className="w-full text-[11px] border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-300">
                <th className="px-1 py-2 border-r border-slate-200 w-[30px]"><input type="checkbox" checked={checked.size === filtered.length && filtered.length > 0} onChange={toggleAll} /></th>
                <th className="px-2 py-2 font-bold text-slate-600 border-r border-slate-200">이름</th>
                <th className="px-2 py-2 font-bold text-slate-600 border-r border-slate-200">반</th>
                <th className="px-2 py-2 font-bold text-slate-600 border-r border-slate-200">입소일</th>
                <th className="px-2 py-2 font-bold text-slate-600 border-r border-slate-200">퇴소일</th>
                <th className="px-2 py-2 font-bold text-slate-600 border-r border-slate-200">주민번호</th>
                <th className="px-2 py-2 font-bold text-slate-600 border-r border-slate-200">기타<br/>필요경비</th>
                <th className="px-2 py-2 font-bold text-slate-600 border-r border-slate-200">입학<br/>준비금</th>
                <th className="px-2 py-2 font-bold text-slate-600 border-r border-slate-200">현장<br/>학습비</th>
                <th className="px-2 py-2 font-bold text-slate-600 border-r border-slate-200">차량<br/>운행비</th>
                <th className="px-2 py-2 font-bold text-slate-600 border-r border-slate-200">행사비</th>
                <th className="px-2 py-2 font-bold text-slate-600 border-r border-slate-200">조석식비</th>
                <th className="px-2 py-2 font-bold text-slate-600 border-r border-slate-200">특성화비</th>
                <th className="px-2 py-2 font-bold text-slate-600 border-r border-slate-200">특별<br/>활동비</th>
                <th className="px-2 py-2 font-bold text-slate-600 border-r border-slate-200">적용월<br/>(등록시적용)</th>
                <th className="px-2 py-2 font-bold text-slate-600">단일<br/>적용</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} className="border-b border-slate-100 hover:bg-blue-50/30">
                  <td className="px-1 py-1.5 text-center border-r border-slate-100"><input type="checkbox" checked={checked.has(c.id)} onChange={() => toggleCheck(c.id)} /></td>
                  <td className="px-2 py-1.5 border-r border-slate-100 whitespace-nowrap">{c.name}</td>
                  <td className="px-2 py-1.5 border-r border-slate-100 text-[10px]">{c.className}</td>
                  <td className={`px-2 py-1.5 text-center border-r border-slate-100 ${c.enterDate ? 'text-sky-600' : 'text-slate-300'}`}>{c.enterDate || '-'}</td>
                  <td className={`px-2 py-1.5 text-center border-r border-slate-100 ${c.leaveDate ? 'text-pink-600 font-medium' : 'text-slate-300'}`}>{c.leaveDate || '-'}</td>
                  <td className="px-2 py-1.5 text-center border-r border-slate-100">{c.residentNo}</td>
                  <td className="px-2 py-1.5 text-center border-r border-slate-100">0</td>
                  <td className="px-2 py-1.5 text-center border-r border-slate-100 text-green-600">0</td>
                  <td className="px-2 py-1.5 text-center border-r border-slate-100 text-green-600">0</td>
                  <td className="px-2 py-1.5 text-center border-r border-slate-100 text-green-600">0</td>
                  <td className="px-2 py-1.5 text-center border-r border-slate-100 text-green-600">0</td>
                  <td className="px-2 py-1.5 text-center border-r border-slate-100">0</td>
                  <td className="px-2 py-1.5 text-center border-r border-slate-100">0</td>
                  <td className="px-2 py-1.5 text-center border-r border-slate-100">0</td>
                  <td className="px-2 py-1.5 text-center border-r border-slate-100">
                    <select className="border border-slate-200 rounded px-1 py-0.5 text-[10px]">
                      <option>{yearMonth}</option>
                    </select>
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <button className="text-[10px] font-bold text-white bg-teal-500 px-2 py-0.5 rounded">적용</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 확인 팝업 */}
        {showConfirm && (
          <DraggableModal onClose={() => setShowConfirm(false)} title="확인" className="w-[400px]">
            <div className="p-6">
              <p className="text-[14px] text-slate-700 mb-2">선택된 원아를 기준으로 분할 관리됩니다.</p>
              <p className="text-[13px] text-slate-600 mb-6">계속하시려면 확인을 클릭하세요</p>
              <div className="flex items-center justify-center gap-3">
                <button onClick={handleConfirm} className="px-8 py-2 text-[13px] font-bold text-white bg-slate-800 rounded hover:bg-slate-900">확인</button>
                <button onClick={() => setShowConfirm(false)} className="px-8 py-2 text-[13px] font-bold text-slate-600 bg-slate-200 rounded hover:bg-slate-300">취소</button>
              </div>
            </div>
          </DraggableModal>
        )}
      </div>
    )
  }

  // Step: 분리적용 편집
  return (
    <div className="p-3 space-y-3">
      <div className="bg-white rounded-xl border border-teal-400/30 shadow-sm">
        <div className="px-4 py-3 border-b border-teal-400/20">
          <span className="text-sm font-bold text-slate-700">필요경비요율정산서</span>
          <span className="ml-2 text-[11px] text-slate-500">— {fiscalYear}년 {HALF_LABELS.find(h => h.half === half)?.label}</span>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-300 rounded-lg px-4 py-3 text-[12px] text-yellow-800 space-y-1">
        <p className="font-bold">[참조] 분리적용할 원아금액을 확인하신 후 저장을 클릭하세요.</p>
        <p className="text-blue-700 font-bold">[분리할 수입내역 적요] : {yearMonth.replace('-', '년 ')}월 입소로 정용</p>
        <p className="text-red-600 font-bold">[분리할 금액] {fmt(splitAmount)}원을 {splitType === 'equal' ? '균등분할' : '개별금액분할'}로 처리합니다.</p>
      </div>

      <div className="flex justify-center gap-3">
        <button onClick={() => setStep('select')} className="px-8 py-2 text-[12px] font-bold text-slate-600 bg-slate-200 rounded hover:bg-slate-300">뒤로</button>
        <button onClick={() => alert('저장되었습니다.')} className="px-8 py-2 text-[12px] font-bold text-white bg-teal-600 rounded hover:bg-teal-700">저 장</button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-[11px] border-collapse min-w-[1000px]">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-300">
              <th className="px-2 py-2 font-bold text-slate-600 border-r border-slate-200">이름</th>
              <th className="px-2 py-2 font-bold text-slate-600 border-r border-slate-200">반</th>
              <th className="px-2 py-2 font-bold text-slate-600 border-r border-slate-200">기타<br/>필요경비</th>
              <th className="px-2 py-2 font-bold text-slate-600 border-r border-slate-200">입학<br/>준비금</th>
              <th className="px-2 py-2 font-bold text-slate-600 border-r border-slate-200">현장<br/>학습비</th>
              <th className="px-2 py-2 font-bold text-slate-600 border-r border-slate-200">차량<br/>운행비</th>
              <th className="px-2 py-2 font-bold text-slate-600 border-r border-slate-200">행사비</th>
              <th className="px-2 py-2 font-bold text-slate-600 border-r border-slate-200">조석식비</th>
              <th className="px-2 py-2 font-bold text-slate-600 border-r border-slate-200">특성화비</th>
              <th className="px-2 py-2 font-bold text-slate-600 border-r border-slate-200">특별<br/>활동비</th>
              <th className="px-2 py-2 font-bold text-slate-600 border-r border-slate-200">적용월<br/>(등록시적용)</th>
              <th className="px-2 py-2 font-bold text-slate-600 border-r border-slate-200">금액</th>
              <th className="px-2 py-2 font-bold text-slate-600">차액적용</th>
            </tr>
          </thead>
          <tbody>
            {editRows.map(r => (
              <tr key={r.id} className="border-b border-slate-100">
                <td className="px-2 py-1.5 border-r border-slate-100 whitespace-nowrap">{r.name}</td>
                <td className="px-2 py-1.5 border-r border-slate-100 text-[10px]">{r.className}</td>
                <td className="px-1 py-1 border-r border-slate-100 text-center">0</td>
                <td className="px-1 py-1 border-r border-slate-100 text-center">0</td>
                <td className="px-1 py-1 border-r border-slate-100 text-center">0</td>
                <td className="px-1 py-1 border-r border-slate-100 text-center">0</td>
                <td className="px-1 py-1 border-r border-slate-100 text-center">0</td>
                <td className="px-1 py-1 border-r border-slate-100 text-center">0</td>
                <td className="px-1 py-1 border-r border-slate-100 text-center">0</td>
                <td className="px-1 py-1 border-r border-slate-100 text-center">0</td>
                <td className="px-1 py-1 border-r border-slate-100 text-center">
                  <select value={r.applyMonth} onChange={e => updateEditRow(r.id, 'applyMonth', e.target.value)} className="border border-slate-200 rounded px-1 py-0.5 text-[10px]">
                    <option>{yearMonth}</option>
                  </select>
                </td>
                <td className="px-1 py-1 border-r border-slate-100">
                  <input value={r.amount} onChange={e => updateEditRow(r.id, 'amount', Number(e.target.value) || 0)} className={inputCls} />
                </td>
                <td className="px-2 py-1.5 text-center">
                  <button className="text-[10px] font-bold text-white bg-orange-500 px-2 py-0.5 rounded">차액적용</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-center gap-3">
        <button onClick={() => setStep('select')} className="px-8 py-2 text-[12px] font-bold text-slate-600 bg-slate-200 rounded hover:bg-slate-300">뒤로</button>
        <button onClick={() => alert('저장되었습니다.')} className="px-8 py-2 text-[12px] font-bold text-white bg-teal-600 rounded hover:bg-teal-700">저 장</button>
      </div>

      <div className="text-right text-[12px] text-slate-600">
        (원금액-분리증금액=차액) : {fmt(splitAmount)} - {fmt(totalSplit)} = {fmt(diff)}
      </div>
    </div>
  )
}
