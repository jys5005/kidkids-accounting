import { NextRequest, NextResponse } from 'next/server'
import iconv from 'iconv-lite'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const { content, filename } = await req.json() as { content: string; filename: string }
    if (typeof content !== 'string') return NextResponse.json({ error: 'content required' }, { status: 400 })
    const buf = iconv.encode(content, 'cp949')
    return new NextResponse(buf as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${filename || 'withholding.01'}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'unknown' }, { status: 500 })
  }
}
