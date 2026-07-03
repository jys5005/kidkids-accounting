import { NextRequest, NextResponse } from 'next/server'
import { ocrReceipt } from '@/lib/receipt-ocr'

export const runtime = 'nodejs'
export const maxDuration = 60

// POST /api/receipt-ocr  (multipart: file)
// → { success, store, date, total, items[], account, subAccount }
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const file = form.get('file') as File | null
    if (!file) return NextResponse.json({ success: false, error: '영수증 이미지가 없습니다' })
    if (file.type === 'application/pdf') {
      return NextResponse.json({ success: false, error: 'PDF는 지원하지 않습니다 — 사진(JPG/PNG)으로 첨부하세요' })
    }
    const buf = Buffer.from(await file.arrayBuffer())
    const base64 = buf.toString('base64')

    let mediaType: 'image/jpeg' | 'image/png' | 'image/webp' = 'image/jpeg'
    let format = 'jpg'
    if (file.type === 'image/png') { mediaType = 'image/png'; format = 'png' }
    else if (file.type === 'image/webp') { mediaType = 'image/webp'; format = 'webp' }

    const result = await ocrReceipt(base64, mediaType, format)
    return NextResponse.json({ success: true, ...result })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[receipt-ocr]', msg)
    return NextResponse.json({ success: false, error: msg })
  }
}
