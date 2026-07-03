'use client'

import { useState, useRef } from 'react'

export interface ReceiptOcrResult {
  store: string
  date: string
  total: number
  items: { name: string; price: number }[]
  account: string
  subAccount: string
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

/** 영수증 사진 → OCR → 결과 확인 → [적용] 시 onApply 호출 */
export default function ReceiptOcrModal({
  open, onClose, onApply,
}: {
  open: boolean
  onClose: () => void
  onApply: (r: ReceiptOcrResult) => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<ReceiptOcrResult | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  if (!open) return null

  const fmt = (n: number) => (n || 0).toLocaleString('ko-KR')

  const reset = () => { setFile(null); setPreview(''); setResult(null); setError('') }

  const pick = (f: File | null) => {
    setError(''); setResult(null)
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

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

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-2 sm:p-4" onClick={close}>
      <div className="bg-white rounded-xl shadow-xl w-[92vw] max-w-md max-h-[88vh] overflow-auto" onClick={e => e.stopPropagation()}>
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
            <button onClick={analyze} disabled={loading || !file}
              className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50">
              {loading ? '분석 중…' : '🔍 분석하기'}
            </button>
          )}

          {error && <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded p-2">{error}</div>}

          {result && (
            <div className="space-y-2">
              <div className="bg-slate-50 border rounded-lg p-3 text-sm space-y-1">
                <div><span className="text-slate-500 mr-2">상호</span><b>{result.store || '(인식 안됨)'}</b></div>
                <div><span className="text-slate-500 mr-2">날짜</span>{result.date || '-'}</div>
                <div><span className="text-slate-500 mr-2">총액</span><b className="text-rose-600">{fmt(result.total)}원</b></div>
                <div><span className="text-slate-500 mr-2">계정과목</span>{result.account}{result.subAccount ? ` / ${result.subAccount}` : ' (세목 직접 선택)'}</div>
                {result.items.length > 0 && (
                  <div className="pt-1 mt-1 border-t">
                    <div className="text-slate-500 mb-0.5">품목 {result.items.length}건</div>
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
