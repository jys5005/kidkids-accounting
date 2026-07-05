import { NextRequest, NextResponse } from 'next/server'
import puppeteer, { type Browser, type Page } from 'puppeteer'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

export const runtime = 'nodejs'
export const maxDuration = 300

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

// 첨부(영수증) 있는 전표의 이미지 다운로드 → data/receipts 저장 → 각 행에 _receiptImage(첫장)/_receiptImages(전체) 부착.
// ⚠ acc 세션이 살아있어야 함(다운로드가 세션쿠키 필요). BILL_ATCH_TYPE: 1=카드만 / 2=영수증사진 / 3=둘다 / 0=없음.
const IMG_EXT = ['.jpg', '.jpeg', '.png', '.webp']
async function attachReceipts(acc: Page, fcltcd: string, list: Record<string, unknown>[]): Promise<{ photos: number; bills: number }> {
  const dir = path.join(process.cwd(), 'data', 'receipts')
  await mkdir(dir, { recursive: true })
  const targets = list.filter(r => String(r.BILL_ATCH_TYPE) === '2') // 2=영수증 사진만 (1=카드 제외)
  let photos = 0, bills = 0
  for (const row of targets) {
    try {
      const billIdx = String(row.BILL_IDX)
      // 전표별 영수증 이미지 목록
      const imgs = await acc.evaluate(async (bd) => {
        const r = await fetch('/acc/api/acc/acc/billManage/getBillRciptMappngImageList', {
          method: 'POST', headers: { 'Content-Type': 'application/json; charset="UTF-8"' },
          credentials: 'include', body: JSON.stringify(bd),
        })
        try { return ((await r.json())?.billRciptMappngList || []) as Record<string, unknown>[] } catch { return [] }
      }, { search: { BILL_IDX: billIdx, FCLTCD: fcltcd, PARENT_ROWINDEX: '0' } })
      const urls: string[] = []
      for (const im of imgs) {
        const ext = '.' + String(im.EXTSN || '').toLowerCase()
        if (!IMG_EXT.includes(ext)) continue // 이미지만(PDF 등 제외)
        // 세션쿠키로 실제 파일 다운로드 → base64
        const b64 = await acc.evaluate(async (key: string, name: string) => {
          const url = 'https://gwin.co.kr/file/api/download/file?downloadKey=' + encodeURIComponent(key) + '&fileName=' + encodeURIComponent(name)
          const r = await fetch(url, { credentials: 'include' })
          if (!r.ok) return null
          const bytes = new Uint8Array(await r.arrayBuffer())
          let bin = ''; const CH = 0x8000
          for (let i = 0; i < bytes.length; i += CH) bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + CH)))
          return btoa(bin)
        }, String(im.DOWNLOAD_KEY), String(im.ORGINL_NM || ('receipt' + ext)))
        if (!b64) continue
        const safe = `gwin_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`
        await writeFile(path.join(dir, safe), Buffer.from(b64, 'base64'))
        urls.push(`/api/receipt-file/${safe}`)
        photos++
      }
      if (urls.length) { row._receiptImage = urls[0]; row._receiptImages = urls.join(','); bills++ }
    } catch { /* 개별 전표 실패는 건너뜀 */ }
  }
  return { photos, bills }
}

const BOOK_LABEL: Record<string, string> = { subsidy: '보조금', fee: '이용료', 'info-center': '보육정보센터' }

export async function POST(req: NextRequest) {
  let page: Page | null = null
  try {
    const body = await req.json()
    const { id, password, book, books, year, monthFrom, monthTo, withReceipts } = body
    if (!id || !password) return NextResponse.json({ success: false, error: '걸음마 아이디/비밀번호가 필요합니다.' }, { status: 400 })
    // 다중 장부: books 배열 우선, 없으면 단일 book
    const bookList: string[] = Array.isArray(books) && books.length ? books.filter((x: string) => BOOK_GB[x]) : [book || 'subsidy']
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

    const buildSearch = (bg: string) => ({
      FCLTCD: fcltcd, schBookGb: bg, schACCOUNT_IDX: '', schACCOUNT_IDXforBillSearch: '',
      schYear: y, schByTerm: 'Y', schNotEstimate: 'Y', schYearMonth: '',
      schDateFrom: `${yFrom}${mF}01`, schDateTo: `${yTo}${mT}${lastDay}`,
      schTRANS_GB: '', schESTI_INOUT: '', schESTI_IDX: '', schBILL_MEMO: '',
      BILL_NUM_TYPE: '2', BILL_DATE_START: `${yFrom}${mF}`, BILL_DATE_END: `${yTo}${mT}`,
      CRED_IDX: '', AAV_IDX: '', schByMonth: '', rd_EstiDepth: '3', rd_EstiDepthDetail: '3',
      schBILL_GB: 'statement_A', schType1: '',
    })

    // 체크한 장부들을 한 세션에서 순차 조회 (각 행에 _book 태그) + 영수증 다운로드
    const allRows: Record<string, unknown>[] = []
    const perBook: { book: string; label: string; count: number }[] = []
    let photos = 0, bills = 0
    let sessionDead = false
    for (const bk of bookList) {
      const bg = BOOK_GB[bk]
      const result = await acc.evaluate(async (sch) => {
        const r = await fetch('/acc/api/acc/acc/billManage/getBillList', {
          method: 'POST', headers: { 'Content-Type': 'application/json; charset="UTF-8"', 'submissionid': 'sbm_getBillList2' },
          credentials: 'include', body: JSON.stringify({ search: sch }),
        })
        const t = await r.text(); let j: unknown = null; try { j = JSON.parse(t) } catch { }
        return { status: r.status, json: j }
      }, buildSearch(bg))
      const j = result.json as { billList?: Record<string, unknown>[]; status?: number } | null
      if (result.status === 401 || j?.status === 401) { sessionDead = true; break }
      const list = Array.isArray(j?.billList) ? j!.billList! : []
      if (list.length > 0 && withReceipts !== false) {
        try { const rc = await attachReceipts(acc, fcltcd, list); photos += rc.photos; bills += rc.bills } catch { /* 영수증 실패 무시 */ }
      }
      for (const row of list) { row._book = bk; row._bookLabel = BOOK_LABEL[bk] || bk }
      allRows.push(...list)
      perBook.push({ book: bk, label: BOOK_LABEL[bk] || bk, count: list.length })
    }
    await page.close().catch(() => {}); page = null

    if (sessionDead && allRows.length === 0) return NextResponse.json({ success: false, error: '걸음마 회계 세션 활성 실패 — 잠시 후 다시 시도해 주세요.', billStatus: 401 }, { status: 200 })
    if (allRows.length === 0) return NextResponse.json({ success: false, error: `해당 기간 전표가 없습니다. (장부: ${bookList.map(bk => BOOK_LABEL[bk] || bk).join(', ')})`, billStatus: 200, perBook }, { status: 200 })
    // keys: _bookLabel 을 앞에 두고 나머지 합집합
    const keySet = new Set<string>(['_bookLabel'])
    for (const r of allRows) for (const k of Object.keys(r)) if (k !== '_book') keySet.add(k)
    return NextResponse.json({ success: true, count: allRows.length, keys: [...keySet], rows: allRows.slice(0, 6000), perBook, receiptPhotos: photos, receiptBills: bills })
  } catch (e) {
    try { if (page) await page.close() } catch { }
    return NextResponse.json({ success: false, error: `걸음마 전표 조회 오류: ${e instanceof Error ? e.message : String(e)}` }, { status: 200 })
  }
}
