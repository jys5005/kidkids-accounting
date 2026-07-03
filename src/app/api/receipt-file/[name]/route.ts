import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'

export const runtime = 'nodejs'

// GET /api/receipt-file/{name} — data/receipts 의 영수증 이미지 서빙
const TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp',
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ name: string }> }) {
  const { name } = await ctx.params
  const safe = path.basename(name) // 경로 탈출 방지
  const ext = path.extname(safe).toLowerCase()
  if (!(ext in TYPES)) return new NextResponse('Not found', { status: 404 })
  try {
    const buf = await readFile(path.join(process.cwd(), 'data', 'receipts', safe))
    return new NextResponse(new Uint8Array(buf), {
      headers: { 'content-type': TYPES[ext], 'cache-control': 'private, max-age=86400' },
    })
  } catch {
    return new NextResponse('Not found', { status: 404 })
  }
}
