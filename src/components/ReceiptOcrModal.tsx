'use client'

import { useState, useRef, useEffect } from 'react'

export interface ReceiptOcrResult {
  store: string
  date: string
  total: number
  items: { name: string; price: number }[]
  account: string
  subAccount: string
}

// 계정과목/세목 옵션 (전표입력 subAccountMap 과 동일) — 미전달 시 운영비 세목 기본값
const DEFAULT_ACCOUNTS = ['보육료', '보조금', '인건비', '4대보험', '운영비', '기타수입', '전입금', '차입금']
const DEFAULT_SUB_MAP: Record<string, string[]> = {
  '운영비': ['급간식비', '소모품비', '공공요금', '여비교통비', '수용비', '차량유지비'],
}

/** 업로드 전 이미지 축소 (긴 변 1568px, JPEG 압축) — 502/속도/토큰 절감. 실패 시 원본 반환 */
async function downscaleImage(file: File, maxEdge = 1568, quality = 0.85): Promise<File> {
  try {
    const dataUrl: string = await new Promise((res, rej) => {
      const fr = new FileReader(); fr.onload = () => res(fr.result as string); fr.onerror = rej; fr.readAsDataURL(file)
    })
    const img: HTMLImageElement = await new Promise((res, rej) => {
      const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = dataUrl
    })
    const scale = Math.min(1, maxEdge / Math.max(img.width, img.height))
    if (scale >= 1 && file.size < 1_200_000) return file // 이미 충분히 작음
    const w = Math.round(img.width * scale), h = Math.round(img.height * scale)
    const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h
    const ctx = canvas.getContext('2d'); if (!ctx) return file
    ctx.drawImage(img, 0, 0, w, h)
    const blob: Blob | null = await new Promise(res => canvas.toBlob(res, 'image/jpeg', quality))
    return blob ? new File([blob], 'receipt.jpg', { type: 'image/jpeg' }) : file
  } catch { return file }
}

/** 영수증 사진 → OCR → 결과 확인/수정 → [적용] 시 onApply 호출. onAttach 는 분석 없이 사진만 첨부 */
export default function ReceiptOcrModal({
  open, onClose, onApply, onAttach, accountOptions = DEFAULT_ACCOUNTS, subAccountMap = DEFAULT_SUB_MAP,
}: {
  open: boolean
  onClose: () => void
  onApply: (r: ReceiptOcrResult) => void
  onAttach?: (imageUrl: string) => void
  accountOptions?: string[]
  subAccountMap?: Record<string, string[]>
}) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState('')
  const [loading, setLoading] = useState(false)
  const [attaching, setAttaching] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<ReceiptOcrResult | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // 미리보기 objectURL 해제 (메모리 누수 방지)
  useEffect(() => { return () => { if (preview) URL.revokeObjectURL(preview) } }, [preview])

  if (!open) return null

  const fmt = (n: number) => (n || 0).toLocaleString('ko-KR')

  const reset = () => { setFile(null); setPreview(''); setResult(null); setError('') }

  const pick = (f: File | null) => {
    setError(''); setResult(null)
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  // 결과 필드 편집 (상호/날짜/총액/계정/세목)
  const patch = (p: Partial<ReceiptOcrResult>) => setResult(prev => (prev ? { ...prev, ...p } : prev))
  const onAccountChange = (account: string) => {
    const subs = subAccountMap[account] || []
    patch({ account, subAccount: result && subs.includes(result.subAccount) ? result.subAccount : '' })
  }
  const subOptions = result ? (subAccountMap[result.account] || []) : []

  const analyze = async () => {
    if (!file) { setError('영수증 사진을 먼저 선택하세요'); return }
    setLoading(true); setError('')
    try {
      const small = await downscaleImage(file)
      const fd = new FormData()
      fd.append('file', small)
      const res = await fetch('/api/receipt-ocr', { method: 'POST', body: fd })
      const j = await res.json()
      if (!j.success) throw new Error(j.error || '분석에 실패했습니다')
      setResult({ store: j.store, date: j.date, total: j.total, items: j.items || [], account: j.account, subAccount: j.subAccount })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  const close = () => { reset(); onClose() }

  // 분석 없이 사진만 첨부 (OCR 미사용 — 401 등으로 분석 안 될 때도 증빙 보관 가능)
  const attachOnly = async () => {
    if (!file) { setError('영수증 사진을 먼저 선택하세요'); return }
    setAttaching(true); setError('')
    try {
      const small = await downscaleImage(file)
      const fd = new FormData()
      fd.append('file', small)
      const res = await fetch('/api/receipt-upload', { method: 'POST', body: fd })
      const j = await res.json()
      if (!j.success) throw new Error(j.error || '첨부에 실패했습니다')
      onAttach?.(j.url)
      close()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setAttaching(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4" onClick={close}>
      <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-xl w-full sm:w-[92vw] sm:max-w-md max-h-[92vh] sm:max-h-[88vh] overflow-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-bold text-slate-800">📷 영수증 사진으로 자동입력</h3>
          <button onClick={close} className="text-slate-400 hover:text-slate-700 text-2xl leading-none">×</button>
        </div>

        <div className="p-4 space-y-3">
          <input ref={inputRef} type="file" accept="image/*" capture="environment" className="hidden"
            onChange={e => pick(e.target.files?.[0] || null)} />

          <button onClick={() => inputRef.current?.click()}
            className="w-full py-8 border-2 border-dashed border-slate-300 rounded-lg text-slate-500 hover:border-blue-400 hover:text-blue-500 transition-colors">
            {preview ? '다른 사진 선택' : '📷 영수증 사진 촬영 / 선택'}
          </button>

          {preview && <img src={preview} alt="영수증 미리보기" className="max-h-56 mx-auto rounded border" />}

          {!result && (
            <div className="space-y-1.5">
              <div className="flex gap-2">
                <button onClick={analyze} disabled={loading || attaching || !file}
                  className="flex-[2] py-2.5 bg-teal-500 text-white rounded-lg font-medium hover:bg-teal-600 disabled:opacity-50 flex items-center justify-center gap-2">
                  {loading && <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                  {loading ? '분석 중…' : '🔍 분석하기'}
                </button>
                <button onClick={attachOnly} disabled={loading || attaching || !file}
                  className="flex-1 py-2.5 border border-slate-300 text-slate-600 rounded-lg font-medium hover:bg-slate-50 disabled:opacity-50 flex items-center justify-center gap-1.5">
                  {attaching && <span className="inline-block w-4 h-4 border-2 border-slate-300 border-t-slate-500 rounded-full animate-spin" />}
                  {attaching ? '첨부 중…' : '📎 그냥 첨부'}
                </button>
              </div>
              <div className="text-[11px] text-slate-400 text-center">분석이 안 되면 [📎 그냥 첨부]로 사진만 붙일 수 있어요</div>
            </div>
          )}

          {error && <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded p-2">{error}</div>}

          {result && (
            <div className="space-y-2">
              <div className="text-xs text-slate-400 flex items-center gap-1">✏️ 인식 결과를 확인·수정한 뒤 적용하세요</div>
              <div className="bg-slate-50 border rounded-lg p-3 text-sm space-y-2">
                <label className="block">
                  <span className="text-slate-500 text-xs">상호 (적요)</span>
                  <input value={result.store} onChange={e => patch({ store: e.target.value })}
                    placeholder="(인식 안됨)"
                    className="mt-0.5 w-full px-2 py-1.5 border rounded bg-white focus:border-blue-400 outline-none" />
                </label>
                <div className="flex gap-2">
                  <label className="block flex-1">
                    <span className="text-slate-500 text-xs">날짜</span>
                    <input type="date" value={result.date} onChange={e => patch({ date: e.target.value })}
                      className="mt-0.5 w-full px-2 py-1.5 border rounded bg-white focus:border-blue-400 outline-none" />
                  </label>
                  <label className="block flex-1">
                    <span className="text-slate-500 text-xs">총액</span>
                    <input inputMode="numeric" value={result.total ? fmt(result.total) : ''}
                      onChange={e => patch({ total: Number(e.target.value.replace(/[^0-9]/g, '')) || 0 })}
                      placeholder="0"
                      className="mt-0.5 w-full px-2 py-1.5 border rounded bg-white text-right font-medium text-rose-600 focus:border-blue-400 outline-none" />
                  </label>
                </div>
                <div className="flex gap-2">
                  <label className="block flex-1">
                    <span className="text-slate-500 text-xs">계정과목</span>
                    <select value={result.account} onChange={e => onAccountChange(e.target.value)}
                      className="mt-0.5 w-full px-2 py-1.5 border rounded bg-white focus:border-blue-400 outline-none">
                      {accountOptions.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </label>
                  <label className="block flex-1">
                    <span className="text-slate-500 text-xs">세목</span>
                    <select value={result.subAccount} onChange={e => patch({ subAccount: e.target.value })}
                      className="mt-0.5 w-full px-2 py-1.5 border rounded bg-white focus:border-blue-400 outline-none">
                      <option value="">(선택)</option>
                      {subOptions.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </label>
                </div>
                {result.items.length > 0 && (
                  <div className="pt-1 mt-1 border-t">
                    <div className="text-slate-500 mb-0.5 text-xs">품목 {result.items.length}건</div>
                    <ul className="max-h-24 overflow-auto text-xs text-slate-600 space-y-0.5">
                      {result.items.map((it, i) => <li key={i}>· {it.name}{it.price ? ` ${fmt(it.price)}원` : ''}</li>)}
                    </ul>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <button onClick={reset} className="flex-1 py-2 border rounded-lg text-slate-600 hover:bg-slate-50">다시</button>
                <button onClick={() => { onApply(result); close() }}
                  className="flex-[2] py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700">이 전표에 적용</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
