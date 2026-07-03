import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

export const runtime = 'nodejs'
export const maxDuration = 30

// POST /api/receipt-upload (multipart: file)
// → { success, url } : 영수증 이미지를 서버 data/receipts 에 저장하고 서빙 URL 반환
//    (전표 행에는 URL 만 저장 → page_data JSON 비대화 방지)
const ALLOWED = ['.jpg', '.jpeg', '.png', '.webp']
const MAX_BYTES = 10 * 1024 * 1024

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const file = form.get('file') as File | null
    if (!file) return NextResponse.json({ success: false, error: '파일이 없습니다' }, { status: 400 })
    if (file.size > MAX_BYTES) return NextResponse.json({ success: false, error: '파일 크기는 10MB 이하여야 합니다' }, { status: 400 })

    let ext = path.extname(file.name || '').toLowerCase()
    if (!ALLOWED.includes(ext)) ext = '.jpg' // 축소본은 항상 jpg

    const dir = path.join(process.cwd(), 'data', 'receipts')
    await mkdir(dir, { recursive: true })
    const safe = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`
    await writeFile(path.join(dir, safe), Buffer.from(await file.arrayBuffer()))

    return NextResponse.json({ success: true, url: `/api/receipt-file/${safe}` })
  } catch (e) {
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
