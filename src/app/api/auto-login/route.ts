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
  '경기도어린이집관리시스템': 'https://www.accgg.co.kr/websquare/user_index.html',
  '보육나라': 'https://www.by24.or.kr',
  '키즈홈': 'https://www.kidshome.or.kr',
}

export const maxDuration = 120

/** Puppeteer headful 모드로 브라우저를 열고 사이트에 자동 로그인 */
async function openAndLogin(company: string, authType: string, id: string, pw: string, certPw: string, certName?: string) {
  const url = LOGIN_URLS[company]
  if (!url) throw new Error(`${company}의 로그인 URL이 등록되지 않았습니다.`)

  // 시스템 Chrome + 영구 user-data-dir 사용 (CROSSCERT/UniSign 등 cert 프로그램 설치 영구 반영)
  // - 시스템 Chrome 경로: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' (Windows)
  // - userDataDir: %LOCALAPPDATA%\\PuppeteerAutoLogin\\{programId} (업체별 분리 — 동시 로그인 시 충돌 방지)
  const programId = PROGRAM_MAP[company] || company.replace(/[^a-zA-Z0-9가-힣]/g, '_')
  const baseDir = process.env.LOCALAPPDATA
    ? `${process.env.LOCALAPPDATA}\\PuppeteerAutoLogin`
    : './.puppeteer-userdata'
  const userDataDir = `${baseDir}\\${programId}`
  const browser = await puppeteer.launch({
    headless: process.platform !== 'win32',
    defaultViewport: null,
    executablePath: process.env.CHROME_PATH || undefined,
    userDataDir,
    args: [
      '--start-maximized', '--no-sandbox', '--disable-notifications', '--disable-popup-blocking',
      '--ignore-certificate-errors', '--allow-running-insecure-content', '--allow-insecure-localhost',
    ],
  })

  // 권한 요청 자동 허용
  const context = browser.defaultBrowserContext()
  await context.overridePermissions(url.split('#')[0].split('?')[0], [])

  let page = await browser.newPage()

  // 모든 JS 다이얼로그(alert/confirm/prompt) 자동 dismiss — 설치 안내 등 패스
  page.on('dialog', async (d) => {
    console.log(`[autoLogin:dialog] ${d.type()}: ${d.message().substring(0, 150)} → dismiss`)
    try { await d.dismiss() } catch { /* ignore */ }
  })

  // 인천시는 UniSign 통합 경로(아래 함수 상단에서 처리)로 분기되므로 여기로 내려오지 않음.
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })

  // 경기도: "공동인증서 (개인)" 버튼 자동 클릭
  if (company === '경기도어린이집관리시스템') {
    try {
      // WebSquare 렌더링 대기 — 최대 15초, "공동인증서" 텍스트 등장까지
      let textReady = false
      for (let i = 0; i < 15; i++) {
        await new Promise(r => setTimeout(r, 1000))
        const found = await page.evaluate(() => /공동인증서\s*\(?\s*개인/.test(document.body.innerText))
        if (found) { textReady = true; break }
      }
      console.log(`[gyeonggi] 텍스트 대기: ${textReady ? 'ready' : 'timeout'}`)

      // 모든 frame에서 공동인증서(개인) 카드 탐색
      let target: any = null
      for (const frame of page.frames()) {
        try {
          const f = await frame.evaluate(() => {
            const all = Array.from(document.querySelectorAll<HTMLElement>('*'))
            const candidates: { el: HTMLElement; area: number; r: DOMRect; t: string }[] = []
            for (const el of all) {
              const r = el.getBoundingClientRect()
              if (r.width === 0 || r.height === 0) continue
              if (r.width > 900 || r.height > 900) continue
              const t = (el.textContent || '').replace(/\s+/g, '').trim()
              if (!/공동인증서/.test(t)) continue
              if (!/개인/.test(t)) continue
              if (/법인/.test(t) && t.length > 30) continue
              if (t.length > 60) continue  // 텍스트가 너무 길면 상위 wrap
              candidates.push({ el, area: r.width * r.height, r, t })
            }
            if (candidates.length === 0) return null
            // 가장 작은 영역 (텍스트만 감싸는 element)
            candidates.sort((a, b) => a.area - b.area)
            const pick = candidates[0]
            pick.el.scrollIntoView({ block: 'center' })
            return {
              tag: pick.el.tagName,
              cls: (pick.el.className || '').toString().substring(0, 60),
              id: pick.el.id,
              x: pick.r.left + pick.r.width / 2,
              y: pick.r.top + pick.r.height / 2,
              w: pick.r.width, h: pick.r.height,
              totalCandidates: candidates.length,
              textPreview: pick.t.substring(0, 60),
            }
          })
          if (f) {
            target = { ...f, frameUrl: frame.url() }
            break
          }
        } catch { /* iframe cross-origin 등 무시 */ }
      }
      console.log(`[gyeonggi] 공동인증서(개인) 후보:`, JSON.stringify(target))
      if (target && target.w > 0) {
        await page.mouse.click(target.x, target.y, { delay: 50 })
        console.log(`[gyeonggi] 좌표 클릭 (${target.x},${target.y})`)
      } else {
        // 폴백: SVG/img 하위 텍스트 노드까지 포함해서 더 넓게 찾기
        const fb = await page.evaluate(() => {
          const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
          const nodes: { text: string; rect: DOMRect }[] = []
          let n: Node | null
          while ((n = walker.nextNode())) {
            const t = (n.textContent || '').trim()
            if (!/공동인증서/.test(t) || !/개인/.test(t)) continue
            const range = document.createRange()
            range.selectNodeContents(n)
            const r = range.getBoundingClientRect()
            if (r.width === 0) continue
            nodes.push({ text: t, rect: r })
          }
          if (nodes.length === 0) return null
          const pick = nodes[0]
          return { x: pick.rect.left + pick.rect.width / 2, y: pick.rect.top + pick.rect.height / 2, text: pick.text }
        })
        if (fb) {
          await page.mouse.click(fb.x, fb.y, { delay: 50 })
          console.log(`[gyeonggi] 폴백 TextNode 클릭 (${fb.x},${fb.y}) "${fb.text}"`)
        } else {
          console.log(`[gyeonggi] 공동인증서(개인) 버튼 못 찾음 — 사용자 직접 클릭 필요`)
        }
      }

      // 퀴즈 모달 자동 처리 — 한글 단어 또는 수식 동적 분기
      await new Promise(r => setTimeout(r, 2500))
      const quizResult = await page.evaluate(() => {
        const allText = document.body.innerText

        let extractedWord: string | null = null
        let quizType: 'math' | 'word' | 'unknown' = 'unknown'

        // 1) 수식 패턴 우선: "50 + 5 = ?", "12-3=?" 등
        const mathMatch = allText.match(/(-?\d+)\s*([+\-*xX×÷/])\s*(-?\d+)\s*=\s*\?/)
        if (mathMatch) {
          const a = parseInt(mathMatch[1], 10)
          const op = mathMatch[2]
          const b = parseInt(mathMatch[3], 10)
          let result: number | null = null
          if (op === '+') result = a + b
          else if (op === '-') result = a - b
          else if (op === '*' || op === 'x' || op === 'X' || op === '×') result = a * b
          else if (op === '÷' || op === '/') result = b !== 0 ? Math.floor(a / b) : null
          if (result !== null) { extractedWord = String(result); quizType = 'math' }
        }

        // 2) 한글 단어 패턴: "띄어쓰기 없이 정확히 입력하세요. {단어}"
        if (!extractedWord) {
          const wordMatch = allText.match(/띄어쓰기\s*없이\s*정확히\s*입력하세요[.\s]*([^\s\n\r]+)/)
          if (wordMatch) { extractedWord = wordMatch[1].trim(); quizType = 'word' }
        }

        // 3) 마지막 폴백: 모달 내 짧은 한글 단어 (2~8자)
        if (!extractedWord) {
          const els = Array.from(document.querySelectorAll<HTMLElement>('*'))
            .filter(el => el.offsetWidth > 0 && el.offsetHeight > 0 && el.children.length === 0)
          for (const el of els) {
            const t = (el.textContent || '').trim()
            if (/^[가-힣]{2,8}$/.test(t)) { extractedWord = t; quizType = 'word'; break }
          }
        }

        if (!extractedWord) return { ok: false, reason: 'no-quiz-answer', textPreview: allText.substring(0, 400) }

        // 2) 퀴즈 input 찾기 (placeholder "텍스트를 입력해주세요" 포함)
        const inputs = Array.from(document.querySelectorAll<HTMLInputElement>('input[type="text"], input:not([type])'))
          .filter(i => i.offsetWidth > 0 && i.offsetHeight > 0)
        const quizInput = inputs.find(i => /텍스트를?\s*입력|정답|퀴즈|답/.test((i.placeholder || '') + (i.title || ''))) || inputs[0]
        if (!quizInput) return { ok: false, reason: 'no-input', extractedWord }

        // 3) 단어 입력
        quizInput.focus()
        quizInput.value = extractedWord
        quizInput.dispatchEvent(new Event('input', { bubbles: true }))
        quizInput.dispatchEvent(new Event('change', { bubbles: true }))

        // 4) "확인" 버튼 위치 반환 (Puppeteer가 좌표 클릭하도록)
        const btns = Array.from(document.querySelectorAll<HTMLElement>('a, button, span, div, input[type="button"], input[type="submit"]'))
          .filter(b => b.offsetWidth > 0 && b.offsetHeight > 0)
        const confirmBtn = btns.find(b => {
          const t = (b.textContent || (b as HTMLInputElement).value || '').trim()
          return /^확인$/.test(t)
        })
        const r = confirmBtn?.getBoundingClientRect()
        return {
          ok: true, extractedWord, quizType,
          inputId: quizInput.id, inputName: quizInput.name,
          confirmX: r ? r.left + r.width / 2 : null,
          confirmY: r ? r.top + r.height / 2 : null,
        }
      })
      console.log(`[gyeonggi] 퀴즈 처리:`, JSON.stringify(quizResult).substring(0, 400))
      // 확인 버튼 클릭 (좌표 기반)
      if (quizResult?.ok && quizResult.confirmX && quizResult.confirmY) {
        await new Promise(r => setTimeout(r, 300))
        await page.mouse.click(quizResult.confirmX, quizResult.confirmY, { delay: 50 })
        console.log(`[gyeonggi] 확인 버튼 클릭 (${quizResult.confirmX},${quizResult.confirmY})`)
      }

      // 인증서 선택 모달 등장 대기 (사용자가 허용 팝업 처리할 시간 포함, 최대 30초)
      let modalReady = false
      for (let i = 0; i < 30; i++) {
        const ready = await page.evaluate(() =>
          /저장매체를?\s*선택/.test(document.body.innerText)
          || /인증서\s*비밀번호/.test(document.body.innerText)
        )
        if (ready) { modalReady = true; break }
        await new Promise(r => setTimeout(r, 1000))
      }
      console.log(`[gyeonggi] 인증서 모달: ${modalReady ? 'ready' : 'timeout'}`)

      if (modalReady) {
        // 1) 하드디스크 클릭
        await new Promise(r => setTimeout(r, 800))
        const hddTarget = await page.evaluate(() => {
          const all = Array.from(document.querySelectorAll<HTMLElement>('a, button, span, div, li, img'))
          const target = all.find(el => {
            if (el.offsetWidth === 0 || el.offsetHeight === 0) return false
            const t = (el.textContent || '').replace(/\s+/g, '').trim()
            const alt = (el.getAttribute('alt') || '').replace(/\s+/g, '').trim()
            return /하드디스크/.test(t + alt) && el.children.length <= 2
          })
          if (!target) return null
          // 가장 가까운 클릭 가능 부모
          let click: HTMLElement = target
          for (let cur: HTMLElement | null = target; cur && cur !== document.body; cur = cur.parentElement) {
            const cls = (cur.className || '').toString().toLowerCase()
            if (cur.tagName === 'A' || cur.tagName === 'BUTTON' || cur.getAttribute('onclick') || /btn|item|card/.test(cls)) { click = cur; break }
          }
          click.scrollIntoView({ block: 'center' })
          const r = click.getBoundingClientRect()
          return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
        })
        if (hddTarget) {
          await page.mouse.click(hddTarget.x, hddTarget.y, { delay: 50 })
          console.log(`[gyeonggi] 하드디스크 클릭 (${hddTarget.x},${hddTarget.y})`)
        }

        // 2) 인증서 목록 로드 대기 (최대 30초)
        const waitForCertList = async (p: typeof page, maxSec: number): Promise<number> => {
          for (let i = 0; i < maxSec; i++) {
            const count = await p.evaluate(() => {
              const rows = Array.from(document.querySelectorAll<HTMLElement>('tr, li, div'))
              return rows.filter(r => {
                const t = (r.textContent || '')
                return /(개인|법인|은행거래|보험)/.test(t) && /\d{4}-\d{2}-\d{2}/.test(t)
                  && r.offsetWidth > 0 && r.offsetHeight > 0
              }).length
            })
            if (count > 0) return count
            if (i % 5 === 0 && i > 0) console.log(`[gyeonggi] 인증서 목록 로드 대기중... (${i}/${maxSec}초)`)
            await new Promise(r => setTimeout(r, 1000))
          }
          return 0
        }

        await new Promise(r => setTimeout(r, 1500))
        let certCount = await waitForCertList(page, 30)
        let certListReady = certCount > 0
        console.log(`[gyeonggi] 1차 인증서 목록: ${certListReady ? `ready (${certCount}건)` : 'timeout — 새 탭으로 재시도'}`)

        // 1차 실패 시: 새 탭 열어서 cert 매니저 재초기화 후 재시도
        if (!certListReady) {
          try {
            const newPage = await browser.newPage()
            await newPage.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })
            await new Promise(r => setTimeout(r, 3000))
            // 새 탭에서 공동인증서(개인) 클릭
            const newCertTarget = await newPage.evaluate(() => {
              const all = Array.from(document.querySelectorAll<HTMLElement>('*'))
              const cands: { el: HTMLElement; area: number; r: DOMRect }[] = []
              for (const el of all) {
                if (el.offsetWidth === 0 || el.offsetHeight === 0) continue
                const t = (el.textContent || '').replace(/\s+/g, '').trim()
                if (!/공[동인]인증서/.test(t)) continue
                if (!/개인/.test(t)) continue
                if (/법인/.test(t) && t.length > 30) continue
                const r = el.getBoundingClientRect()
                if (r.width === 0 || r.height === 0 || r.width > 600 || r.height > 600) continue
                cands.push({ el, area: r.width * r.height, r })
              }
              if (cands.length === 0) return null
              cands.sort((a, b) => a.area - b.area)
              cands[0].el.scrollIntoView({ block: 'center' })
              return { x: cands[0].r.left + cands[0].r.width / 2, y: cands[0].r.top + cands[0].r.height / 2 }
            })
            if (newCertTarget) {
              await newPage.mouse.click(newCertTarget.x, newCertTarget.y, { delay: 50 })
              console.log(`[gyeonggi] 새 탭 공동인증서 클릭`)
            }
            // 새 탭 인증서 모달 + 목록 대기
            await new Promise(r => setTimeout(r, 4000))
            const newCertCount = await waitForCertList(newPage, 30)
            if (newCertCount > 0) {
              certCount = newCertCount; certListReady = true
              page = newPage  // 이후 작업은 새 탭에서
              console.log(`[gyeonggi] 2차(새 탭) 인증서 목록: ready (${newCertCount}건)`)
            } else {
              console.log(`[gyeonggi] 2차(새 탭)도 timeout — 사용자 직접 진행 필요`)
            }
          } catch (e) {
            console.log(`[gyeonggi] 새 탭 재시도 실패: ${e instanceof Error ? e.message : String(e)}`)
          }
        }

        // 3) certName 매칭 인증서 클릭
        if (certListReady && certName) {
          const certTarget = await page.evaluate((targetName: string) => {
            const targetClean = targetName.replace(/[\s()]/g, '')
            const rows = Array.from(document.querySelectorAll<HTMLElement>('tr, li, div'))
              .filter(r => r.offsetWidth > 0 && r.offsetHeight > 0)
            // 정확 매칭: certName 의 sn 부분이라도 포함된 행
            const target = rows.find(r => {
              const t = (r.textContent || '').replace(/[\s()]/g, '')
              return t.includes(targetClean) || (targetName.length > 10 && t.includes(targetName.substring(0, 10)))
            }) || rows.find(r => {
              const t = (r.textContent || '')
              return /(개인|법인)/.test(t) && /\d{4}-\d{2}-\d{2}/.test(t)
            })  // 폴백: 첫 번째 인증서
            if (!target) return null
            target.scrollIntoView({ block: 'center' })
            const r = target.getBoundingClientRect()
            target.click()
            return { x: r.left + r.width / 2, y: r.top + r.height / 2, text: (target.textContent || '').replace(/\s+/g, ' ').substring(0, 80) }
          }, certName)
          if (certTarget) {
            await page.mouse.click(certTarget.x, certTarget.y, { delay: 50 })
            console.log(`[gyeonggi] 인증서 선택: ${certTarget.text}`)
          } else {
            console.log(`[gyeonggi] 인증서 매칭 실패 (certName=${certName})`)
          }
        }

        // 4) 비밀번호 입력
        await new Promise(r => setTimeout(r, 800))
        if (certPw) {
          const pwResult = await page.evaluate((pw: string) => {
            const inputs = Array.from(document.querySelectorAll<HTMLInputElement>('input[type="password"], input[type="text"]'))
              .filter(i => i.offsetWidth > 0 && i.offsetHeight > 0)
            const pwInput = inputs.find(i => {
              const id = (i.id || '').toLowerCase()
              const name = (i.name || '').toLowerCase()
              const ph = (i.placeholder || '')
              return i.type === 'password' || /pw|pass|비밀번호|password/.test(id + name + ph)
            })
            if (!pwInput) return { ok: false }
            pwInput.focus()
            pwInput.value = pw
            pwInput.dispatchEvent(new Event('input', { bubbles: true }))
            pwInput.dispatchEvent(new Event('change', { bubbles: true }))
            return { ok: true, id: pwInput.id, name: pwInput.name }
          }, certPw)
          console.log(`[gyeonggi] 비밀번호 입력:`, JSON.stringify(pwResult))
        }

        // 5) 확인 버튼 클릭
        await new Promise(r => setTimeout(r, 400))
        const confirmTarget = await page.evaluate(() => {
          const btns = Array.from(document.querySelectorAll<HTMLElement>('button, a, input[type="button"], input[type="submit"], div, span'))
            .filter(b => b.offsetWidth > 0 && b.offsetHeight > 0)
          const btn = btns.find(b => {
            const t = (b.textContent || (b as HTMLInputElement).value || '').trim()
            return /^확인$/.test(t) && (b as HTMLElement).children.length <= 1
          })
          if (!btn) return null
          const r = btn.getBoundingClientRect()
          return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
        })
        if (confirmTarget) {
          await page.mouse.click(confirmTarget.x, confirmTarget.y, { delay: 50 })
          console.log(`[gyeonggi] 확인 클릭 (${confirmTarget.x},${confirmTarget.y})`)
        }
      }
    } catch (e) {
      console.log(`[gyeonggi] 자동화 처리 실패: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

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
          body: JSON.stringify({ menuName: body.menuName, targetMonth: body.targetMonth, certName, certPw, facilityKey: body.facilityKey }),
          signal: AbortSignal.timeout(300000),
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
        const result = await openAndLogin(company, authType, id, pw, certPw, certName)
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
