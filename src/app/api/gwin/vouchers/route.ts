import { NextRequest, NextResponse } from 'next/server'
import puppeteer, { type Browser, type Page } from 'puppeteer'

export const runtime = 'nodejs'
export const maxDuration = 180

// 걸음마(gwin.co.kr) 전표(현금출납부) — 실 브라우저 UI 흐름으로 세션 확보.
// ⚠ 핵심: 로그인 후 "걸음마회계 WiN 실행" 버튼을 실제 클릭해야 /acc 세션이 활성화됨(핸드오프).
//    직접 fetch/포털API 로그인만으론 /acc 가 401("세션만료") — 이 클릭이 유일한 열쇠.
// 자격증명은 클라이언트 전달, 저장/로그 금지.

const BOOK_GB: Record<string, string> = { subsidy: '03', fee: '04', 'info-center': '01' }
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

let _b: Browser | null = null
async function getBrowser(): Promise<Browser> {
  if (_b && _b.connected) return _b
  _b = await puppeteer.launch({ headless: true, protocolTimeout: 220000, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] })
  return _b
}

// 로그인 → 팝업닫기 → "걸음마회계 WiN 실행" 클릭 → { acc페이지, fcltcd }
async function loginAndEnterAcc(page: Page, id: string, password: string): Promise<{ acc: Page; fcltcd: string } | null> {
  page.on('dialog', async d => { await d.accept().catch(() => {}) })
  // 로그인 중 mberFclt 응답 가로채 fcltcd 확보
  let fcltcd = ''
  page.on('response', async r => {
    if (r.url().includes('/portal/api/cmmn/mberFclt')) {
      try { const j = await r.json() as Array<{ fcltcd?: string }>; if (j?.[0]?.fcltcd) fcltcd = j[0].fcltcd } catch { }
    }
  })
  await page.goto('https://gwin.co.kr/', { waitUntil: 'domcontentloaded', timeout: 40000 }).catch(() => {})
  await sleep(5000)
  // 로그인 팝업 열기
  await page.evaluate(() => { const t = [...document.querySelectorAll('button,a,span,div')].find(e => ((e as HTMLElement).innerText || '').trim() === '로그인'); if (t) (t as HTMLElement).click() })
  await sleep(3500)
  // 아이디/패스워드 입력(React value setter) + 로그인
  await page.evaluate((uid, pw) => {
    const set = (el: HTMLInputElement, v: string) => { const s = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!; s.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })) }
    const idEl = [...document.querySelectorAll('input')].find(i => (i as HTMLInputElement).placeholder === '아이디' && (i as HTMLElement).offsetParent) as HTMLInputElement | undefined
    const pwEl = [...document.querySelectorAll('input')].find(i => (i as HTMLInputElement).placeholder === '패스워드' && (i as HTMLElement).offsetParent) as HTMLInputElement | undefined
    if (idEl) set(idEl, uid); if (pwEl) set(pwEl, pw)
  }, id, password)
  await sleep(600)
  await page.evaluate(() => { const bs = [...document.querySelectorAll('button,a,input')].filter(e => (((e as HTMLElement).innerText || (e as HTMLInputElement).value || '').trim()) === '로그인' && (e as HTMLElement).offsetParent); (bs[bs.length - 1] as HTMLElement)?.click() })
  await sleep(6000)
  // 로그인 성공 확인
  const loggedIn = await page.evaluate(() => !![...document.querySelectorAll('button,a,span')].find(e => ((e as HTMLElement).innerText || '').trim() === '로그아웃'))
  if (!loggedIn) return null
  // 팝업(별도 창 + 인페이지 모달) 닫기
  const b = page.browser()
  for (const pg of await b.pages()) { if (pg !== page) await pg.close().catch(() => {}) }
  await page.evaluate(() => { ['나중에 하기', '닫기'].forEach(txt => [...document.querySelectorAll('button,a,span,div')].filter(e => ((e as HTMLElement).innerText || '').trim() === txt && (e as HTMLElement).offsetParent).forEach(e => { try { (e as HTMLElement).click() } catch { } })) })
  await sleep(2500)
  // "걸음마회계 WiN 실행" 실제 마우스 클릭 → /acc 세션 핸드오프
  const meta = await page.evaluate(() => {
    const t = [...document.querySelectorAll('*')].find(e => ((e as HTMLElement).innerText || '').trim() === '걸음마회계 WiN 실행')
    if (!t) return null
    const a = (t.closest('a,button,[onclick]') || t) as HTMLElement
    const r = a.getBoundingClientRect()
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
  })
  if (!meta) return null
  await page.mouse.click(meta.x, meta.y)
  await sleep(10000)
  const acc = (await b.pages()).find(pg => pg.url().includes('/acc/')) || page
  if (!fcltcd) return null
  return { acc, fcltcd }
}

export async function POST(req: NextRequest) {
  let page: Page | null = null
  try {
    const { id, password, book, year, monthFrom, monthTo } = await req.json()
    if (!id || !password) return NextResponse.json({ success: false, error: '걸음마 아이디/비밀번호가 필요합니다.' }, { status: 400 })
    const bg = BOOK_GB[book] || '03'
    const y = String(year || new Date().getFullYear())
    const mF = String(monthFrom || '03').padStart(2, '0')
    const mT = String(monthTo || '02').padStart(2, '0')
    const yFrom = Number(mF) >= 3 ? y : String(Number(y) + 1)
    const yTo = Number(mT) >= 3 ? y : String(Number(y) + 1)
    const lastDay = String(new Date(Number(yTo), Number(mT), 0).getDate()).padStart(2, '0')

    const b = await getBrowser()
    page = await b.newPage()
    await page.setViewport({ width: 1500, height: 950 })
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36')
    const entered = await loginAndEnterAcc(page, id, password)
    if (!entered) { await page.close().catch(() => {}); page = null; return NextResponse.json({ success: false, error: '걸음마 로그인/회계 진입 실패 (아이디·비밀번호 확인 또는 잠시 후 재시도)' }, { status: 200 }) }
    const { acc, fcltcd } = entered

    // /acc 세션 활성 상태에서 getBillList 호출 (기간=회계연도 범위). FCLTCD 필수, schACCOUNT_IDX/AAV_IDX 는 빈값 가능.
    const search = {
      FCLTCD: fcltcd, schBookGb: bg, schACCOUNT_IDX: '', schACCOUNT_IDXforBillSearch: '',
      schYear: y, schByTerm: 'Y', schNotEstimate: 'Y', schYearMonth: '',
      schDateFrom: `${yFrom}${mF}01`, schDateTo: `${yTo}${mT}${lastDay}`,
      schTRANS_GB: '', schESTI_INOUT: '', schESTI_IDX: '', schBILL_MEMO: '',
      BILL_NUM_TYPE: '2', BILL_DATE_START: `${yFrom}${mF}`, BILL_DATE_END: `${yTo}${mT}`,
      CRED_IDX: '', AAV_IDX: '', schByMonth: '', rd_EstiDepth: '3', rd_EstiDepthDetail: '3',
      schBILL_GB: 'statement_A', schType1: '',
    }
    const result = await acc.evaluate(async (sch) => {
      // FCLTCD 는 페이지가 아는 값이 우선. 비었으면 서버가 세션기준으로 처리.
      const r = await fetch('/acc/api/acc/acc/billManage/getBillList', {
        method: 'POST', headers: { 'Content-Type': 'application/json; charset="UTF-8"', 'submissionid': 'sbm_getBillList2' },
        credentials: 'include', body: JSON.stringify({ search: sch }),
      })
      const t = await r.text(); let j: unknown = null; try { j = JSON.parse(t) } catch { }
      return { status: r.status, json: j }
    }, search)

    await page.close().catch(() => {}); page = null
    const j = result.json as { billList?: Record<string, unknown>[]; status?: number } | null
    if (result.status === 401 || j?.status === 401) return NextResponse.json({ success: false, error: '걸음마 회계 세션 활성 실패 — 잠시 후 다시 시도해 주세요.', billStatus: 401 }, { status: 200 })
    const list = Array.isArray(j?.billList) ? j!.billList! : []
    if (list.length > 0) return NextResponse.json({ success: true, count: list.length, keys: Object.keys(list[0]), rows: list.slice(0, 3000) })
    return NextResponse.json({ success: false, error: '해당 기간 전표가 없습니다.', billStatus: result.status }, { status: 200 })
  } catch (e) {
    try { if (page) await page.close() } catch { }
    return NextResponse.json({ success: false, error: `걸음마 전표 조회 오류: ${e instanceof Error ? e.message : String(e)}` }, { status: 200 })
  }
}
