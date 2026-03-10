import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const session = request.cookies.get('auth_session')?.value
  if (!session) {
    return NextResponse.json({ error: '미인증' }, { status: 401 })
  }
  try {
    const data = JSON.parse(session)
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: '세션 오류' }, { status: 401 })
  }
}
