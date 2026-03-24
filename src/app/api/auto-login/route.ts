import { NextRequest, NextResponse } from 'next/server'

const PLATFORM_URL = process.env.NEXT_PUBLIC_PLATFORM_URL || 'http://localhost:4000'

// 업체명 → programId 매핑
const PROGRAM_MAP: Record<string, string> = {
  '보육나라': 'by24',
  '장부나라': 'jangbunara',
  '키즈홈': 'kidshome',
  '인천시어린이집관리시스템': 'incheon',
  '경기도어린이집관리시스템': 'gyeonggi',
  '대전시어린이집관리시스템': 'daejeon',
  '충청남도어린이집관리시스템(하나은행)': 'chungnam',
  '프라임전자장부': 'prime',
  '키득키즈': 'kidkids',
}

export const maxDuration = 60

/** POST: 저장 (통합e program-auth API로 프록시) */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { company, authType, id, pw, certName, certPw, action } = body

    const programId = PROGRAM_MAP[company]
    if (!programId) {
      return NextResponse.json({ error: `${company}는 지원하지 않는 업체입니다.` }, { status: 400 })
    }

    // 검증 요청
    if (action === 'verify') {
      const verifyBody = authType === 'cert'
        ? { programId, authType: 'cert', certName, certPw }
        : { programId, authType: 'idpw', userId: id, userPw: pw }

      const res = await fetch(`${PLATFORM_URL}/api/settings/program-verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(verifyBody),
        signal: AbortSignal.timeout(60000),
      })
      const data = await res.json()
      return NextResponse.json(data, { status: res.status })
    }

    // 저장 요청
    const saveBody = authType === 'cert'
      ? { programId, authType: 'cert', certName, certPw }
      : { programId, authType: 'idpw', userId: id, userPw: pw }

    const res = await fetch(`${PLATFORM_URL}/api/settings/program-auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(saveBody),
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ error: '통합e 서버에 연결할 수 없습니다.' }, { status: 502 })
  }
}

/** GET: 전체 인증 상태 조회 */
export async function GET() {
  try {
    const res = await fetch(`${PLATFORM_URL}/api/settings/program-auth`)
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ error: '통합e 서버에 연결할 수 없습니다.' }, { status: 502 })
  }
}

/** DELETE: 인증 정보 삭제 */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const programId = searchParams.get('programId')
    const res = await fetch(`${PLATFORM_URL}/api/settings/program-auth?programId=${programId}`, {
      method: 'DELETE',
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ error: '통합e 서버에 연결할 수 없습니다.' }, { status: 502 })
  }
}
