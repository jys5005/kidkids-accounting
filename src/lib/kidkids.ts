import puppeteer, { type Browser, type Page } from 'puppeteer'

const BASE_URL = 'https://kas.kidkids.net'

let browser: Browser | null = null

async function getBrowser(): Promise<Browser> {
  if (browser && browser.connected) return browser
  browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  })
  return browser
}

export async function loginAndGetPage(memberId: string, pw: string): Promise<Page> {
  const b = await getBrowser()
  const page = await b.newPage()
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36')

  // 로그인 페이지 이동
  await page.goto(`${BASE_URL}/login.htm`, { waitUntil: 'networkidle2', timeout: 30000 })

  // 이미 로그인된 상태 체크 (로그인 폼이 없으면 이미 로그인)
  const hasLoginForm = await page.$('input[name="member_id"]')
  if (!hasLoginForm) {
    // 이미 로그인됨 → 그대로 반환
    return page
  }

  // 아이디/비번 입력 후 로그인
  await page.type('input[name="member_id"]', memberId, { delay: 50 })
  await page.type('input[name="pw"]', pw, { delay: 50 })

  // loginSubmit() 또는 form submit
  await page.evaluate(() => {
    const form = document.querySelector('form[name="formLogin"]') as HTMLFormElement
    if (form) form.submit()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    else if ((window as any).loginSubmit) (window as any).loginSubmit()
  })

  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {})

  // 로그인 실패 체크
  const currentUrl = page.url()
  if (currentUrl.includes('login.htm')) {
    const errorMsg = await page.evaluate(() => {
      const alert = document.querySelector('.alert, .error, .msg')
      return alert?.textContent?.trim() || ''
    })
    await page.close()
    throw new Error(errorMsg || '로그인 실패: 아이디 또는 비밀번호를 확인하세요.')
  }

  return page
}

export interface KidkidsAccount {
  date: string           // 거래일자
  summary: string        // 적요
  accountName: string    // 계정과목
  income: string         // 수입
  expense: string        // 지출
  balance: string        // 잔액
  memo: string           // 비고
}

// 현금출납부 스크래핑
// table#grip_table.grid_table
// 컬럼: 월/일 | 적요 | 목 | 증빙서번호 | 채주 | 수입금액 | 지출금액 | 잔액
// form: formSearch — yearmon, start_day, end_day, search_ac_seq
export async function scrapeAccounts(
  page: Page,
  options?: { startDate?: string; endDate?: string; yearmon?: string }
): Promise<{ rows: KidkidsAccount[]; summary: { carryOver: string; monthIncome: string; monthExpense: string; totalIncome: string; totalExpense: string; balance: string } }> {
  // 현금출납부 페이지 이동
  await page.goto(`${BASE_URL}/accounts/statement02_01.htm`, { waitUntil: 'networkidle2', timeout: 30000 })

  // 날짜 필터 적용
  if (options?.startDate || options?.endDate || options?.yearmon) {
    await page.evaluate((opts) => {
      const form = document.querySelector('form[name="formSearch"]') as HTMLFormElement
      if (!form) return
      if (opts.yearmon) {
        const sel = form.querySelector('select[name="yearmon"]') as HTMLSelectElement
        if (sel) sel.value = opts.yearmon
      }
      if (opts.startDate) {
        const inp = form.querySelector('input[name="start_day"]') as HTMLInputElement
        if (inp) inp.value = opts.startDate
      }
      if (opts.endDate) {
        const inp = form.querySelector('input[name="end_day"]') as HTMLInputElement
        if (inp) inp.value = opts.endDate
      }
      form.submit()
    }, { startDate: options?.startDate, endDate: options?.endDate, yearmon: options?.yearmon })

    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {})
  }

  // grip_table 데이터 추출
  const data = await page.evaluate(() => {
    const rows: {
      date: string; summary: string; accountName: string;
      income: string; expense: string; balance: string; memo: string;
    }[] = []
    const summary = { carryOver: '', monthIncome: '0', monthExpense: '0', totalIncome: '0', totalExpense: '0', balance: '0' }

    const table = document.querySelector('#grip_table, .grid_table') as HTMLTableElement
    if (!table) return { rows, summary }

    const trs = table.querySelectorAll('tr')
    for (const tr of trs) {
      const cells = tr.querySelectorAll('td')
      if (cells.length === 0) continue

      const text0 = cells[0]?.textContent?.trim() || ''

      // 이월액 행
      if (text0.includes('이월액')) {
        summary.carryOver = cells[cells.length - 1]?.textContent?.trim() || '0'
        continue
      }
      // 월계 행
      if (text0.includes('월 계')) {
        const vals = Array.from(cells).map(c => c.textContent?.trim() || '')
        summary.monthIncome = vals[vals.length - 3] || '0'
        summary.monthExpense = vals[vals.length - 2] || '0'
        continue
      }
      // 누계 행
      if (text0.includes('누 계')) {
        const vals = Array.from(cells).map(c => c.textContent?.trim() || '')
        summary.totalIncome = vals[vals.length - 3] || '0'
        summary.totalExpense = vals[vals.length - 2] || '0'
        summary.balance = vals[vals.length - 1] || '0'
        continue
      }
      // "자료가 존재하지 않음" 건너뛰기
      if (text0.includes('자료가 존재하지') || text0.includes('존재하지 않음')) continue

      // 데이터 행: 월/일 | 적요 | 목 | 증빙서번호 | 채주 | 수입금액 | 지출금액 | 잔액
      if (cells.length >= 6) {
        const cellTexts = Array.from(cells).map(c => c.textContent?.trim() || '')
        // 날짜가 있는 행만 (MM/DD 또는 숫자)
        if (/\d{2}\/\d{2}|\d{4}-\d{2}-\d{2}/.test(cellTexts[0]) || /^\d+\/\d+$/.test(cellTexts[0])) {
          rows.push({
            date: cellTexts[0] || '',
            summary: cellTexts[1] || '',
            accountName: cellTexts[2] || '',
            income: cellTexts[5] || '',
            expense: cellTexts[6] || '',
            balance: cellTexts[7] || '',
            memo: cellTexts[4] || '', // 채주
          })
        }
      }
    }

    return { rows, summary }
  })

  return data
}

// 메뉴 구조 파악 (최초 연동 시 사용)
export async function scrapeMenuStructure(page: Page): Promise<{ url: string; label: string }[]> {
  const menus = await page.evaluate(() => {
    const items: { url: string; label: string }[] = []
    const links = document.querySelectorAll('a[href]')
    links.forEach(a => {
      const href = a.getAttribute('href') || ''
      const label = a.textContent?.trim() || ''
      if (label && href && !href.startsWith('javascript:void') && !href.startsWith('#')) {
        items.push({ url: href, label })
      }
    })
    return items
  })
  return menus
}

// 페이지 전체 HTML 가져오기 (디버깅용)
export async function getPageHtml(page: Page): Promise<string> {
  return await page.content()
}

export async function closePage(page: Page) {
  try { await page.close() } catch { /* ignore */ }
}
