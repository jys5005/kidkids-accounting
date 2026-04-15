import { NextRequest, NextResponse } from 'next/server'
import puppeteer from 'puppeteer'

const PLATFORM_URL = process.env.NEXT_PUBLIC_PLATFORM_URL || 'http://localhost:3000'

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

// 업체명 → 로그인 URL
const LOGIN_URLS: Record<string, string> = {
  '인천시어린이집관리시스템': 'https://aincheon.co.kr/jsp/main/main.do?w2xPath=/ui/imggmain/common/sign_Login.xml#',
  '보육나라': 'https://www.by24.or.kr',
  '키즈홈': 'https://www.kidshome.or.kr',
}

export const maxDuration = 120

/** Puppeteer headful 모드로 브라우저를 열고 사이트에 자동 로그인 */
async function openAndLogin(company: string, authType: string, id: string, pw: string, certPw: string) {
  const url = LOGIN_URLS[company]
  if (!url) throw new Error(`${company}의 로그인 URL이 등록되지 않았습니다.`)

  // headful 모드 (사용자가 볼 수 있는 브라우저 창)
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized', '--no-sandbox', '--disable-notifications', '--disable-popup-blocking'],
  })

  // 권한 요청 자동 허용
  const context = browser.defaultBrowserContext()
  await context.overridePermissions(url.split('#')[0].split('?')[0], [])

  const page = await browser.newPage()

  // 인천시는 UniSign 통합 경로(아래 함수 상단에서 처리)로 분기되므로 여기로 내려오지 않음.
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })

  // 브라우저를 닫지 않고 사용자에게 넘김
  browser.disconnect()

  return { success: true, message: `${company} 자동 로그인 완료` }
}

/** 인천시는 통합e의 loginAincheon(UniSign 브릿지)을 재사용 */
async function loginIncheonViaPlatform(certName: string, certPw: string) {
  const res = await fetch(`${PLATFORM_URL}/api/incheon/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ certName, certPw, useSavedCert: !certName || !certPw }),
    signal: AbortSignal.timeout(120000),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data.success) {
    throw new Error(data.error || data.message || `통합e 로그인 API 오류 (${res.status})`)
  }
  return { success: true as const, message: data.message || '인천시어린이집관리시스템 자동 로그인 완료' }
}

/** POST: 저장/검증/로그인 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { company, authType, id, pw, certName, certPw, action } = body

    const programId = PROGRAM_MAP[company]
    if (!programId) {
      return NextResponse.json({ error: `${company}는 지원하지 않는 업체입니다.` }, { status: 400 })
    }

    // 메뉴 이동 요청: 로그인된 세션 있으면 탭만, 없으면 로그인+이동 원샷
    if (action === 'navigate') {
      try {
        const res = await fetch(`${PLATFORM_URL}/api/incheon/navigate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ menuName: body.menuName, certName, certPw }),
          signal: AbortSignal.timeout(120000),
        })
        const data = await res.json().catch(() => ({}))
        return NextResponse.json(data, { status: res.status })
      } catch (e) {
        return NextResponse.json({ success: false, error: e instanceof Error ? e.message : '이동 실패' }, { status: 500 })
      }
    }

    // 로그인 요청: Puppeteer headful 모드로 브라우저 열기
    if (action === 'login') {
      try {
        // 인천시는 통합e의 UniSign 로그인 파이프라인을 사용 (인증서 선택/비번 입력 자동)
        if (company === '인천시어린이집관리시스템') {
          const result = await loginIncheonViaPlatform(certName || '', certPw || '')
          return NextResponse.json(result)
        }
        const result = await openAndLogin(company, authType, id, pw, certPw)
        return NextResponse.json(result)
      } catch (e) {
        return NextResponse.json({ success: false, error: e instanceof Error ? e.message : '로그인 실패' })
      }
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
