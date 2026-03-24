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

/** 통합e에서 인증서 설정 가져오기 */
async function getCertConfig() {
  const res = await fetch(`${PLATFORM_URL}/api/settings/cert-save`)
  const json = await res.json()
  const d = json.data || json
  return { signCert: d.signCert || '', signPri: d.signPri || '', signPw: d.signPw || '' }
}

/** 통합e에서 CIS 설정 가져오기 */
async function getCisConfig() {
  const res = await fetch(`${PLATFORM_URL}/api/settings/exweb-config`)
  return res.json()
}

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

  // 인천시어린이집관리시스템: ExWeb certSelect를 가로채서 자동 로그인
  if (company === '인천시어린이집관리시스템') {
    const cert = await getCertConfig()

    if (!cert.signCert || !cert.signPri) {
      browser.disconnect()
      throw new Error('인증서 파일 경로를 찾을 수 없습니다.')
    }

    // 페이지 로드 전에 request interception 설정
    await page.setRequestInterception(true)
    page.on('request', (req) => {
      const u = req.url()
      if (u.includes('127.0.0.1') && u.includes('certSelect')) {
        console.log('[자동로그인] certSelect 가로채기!')
        req.respond({
          status: 200,
          contentType: 'application/json; charset=UTF-8',
          body: JSON.stringify({
            errYn: 'N', errMsg: '',
            cert_nm: '자동선택',
            file1: cert.signCert,
            file2: cert.signPri,
            cert_pw: certPw || cert.signPw,
            end_dt: '20271231', pub_dt: '20250101',
            org_nm: '', oid: '', sn: '',
          }),
        })
      } else {
        req.continue()
      }
    })

    // 이제 페이지 로드 (interception이 이미 설정됨)
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })

    // WebSquare 로딩 대기 (7초 - 충분히)
    await new Promise(r => setTimeout(r, 7000))

    // "공동인증서 로그인" 버튼 클릭
    const clicked = await page.evaluate(() => {
      const all = document.querySelectorAll('*')
      for (const el of all) {
        const text = (el.textContent || '').trim()
        // 정확히 "공동인증서 로그인" 매칭
        if (text === '공동인증서 로그인' && (el as HTMLElement).offsetWidth > 0) {
          ;(el as HTMLElement).click()
          return '공동인증서 로그인 클릭!'
        }
      }
      // 폴백: "로그인" 포함된 큰 버튼
      for (const el of all) {
        const text = (el.textContent || '').trim()
        if (text.includes('로그인') && (el as HTMLElement).offsetWidth > 50) {
          ;(el as HTMLElement).click()
          return '로그인 버튼 클릭: ' + text.substring(0, 30)
        }
      }
      return null
    })

    console.log('[자동로그인]', clicked)

    // 인증서 선택 및 로그인 처리 대기
    await new Promise(r => setTimeout(r, 10000))
  } else {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })
  }

  // 브라우저를 닫지 않고 사용자에게 넘김
  browser.disconnect()

  return { success: true, message: `${company} 자동 로그인 완료` }
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

    // 로그인 요청: Puppeteer headful 모드로 브라우저 열기
    if (action === 'login') {
      try {
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
