/**
 * i-friends.co.kr (아이프렌즈) 현금출납부 스크래퍼
 * - Puppeteer 로그인 → 전표등록 페이지 → pqGrid 데이터 직접 추출
 */
import puppeteer, { type Browser, type Page } from 'puppeteer'
import type { CashLedgerRow, CashLedgerResult, CashLedgerSummary } from './by24'
import { accountCodeMap, subAccountCodeMap } from './accounts'

const BASE_URL = 'https://i-friends.co.kr'
const SLIP_URL = `${BASE_URL}/rspnber/childHouseChitManagePage.do`

let browser: Browser | null = null

async function getBrowser(): Promise<Browser> {
  if (browser && browser.connected) return browser
  browser = await puppeteer.launch({
    headless: !process.env['CHROME_HEADFUL'],
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  })
  return browser
}

/** i-friends.co.kr AJAX 로그인 */
export async function loginIfriends(userId: string, password: string): Promise<Page> {
  const b = await getBrowser()
  const page = await b.newPage()
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
  )

  await page.goto(`${BASE_URL}/www/index.do`, { waitUntil: 'networkidle2', timeout: 30000 })

  const loginResult = await page.evaluate(
    (id: string, pw: string) => (window as any).gFn.login(id, pw),
    userId, password,
  )

  if (!loginResult.successAt) {
    throw new Error(loginResult.msg || '아이프렌즈 로그인 실패')
  }

  console.log('[ifriends] 로그인 성공')
  return page
}

/** 전표등록 페이지 검색 후 pqGrid 데이터 추출 */
async function fetchGridData(
  page: Page,
  fsyr: string,
): Promise<any[]> {
  // 전표등록 페이지로 이동
  await page.goto(SLIP_URL, { waitUntil: 'networkidle2', timeout: 30000 })
  await new Promise(r => setTimeout(r, 2000))

  // 1. 회계연도 선택
  await page.select('#fsyr', fsyr)
  await new Promise(r => setTimeout(r, 1000))

  // 2. 기간조회 체크
  const isChecked = await page.evaluate(() => {
    const chk = document.getElementById('searchPdKnd') as HTMLInputElement
    return chk?.checked
  })
  if (!isChecked) {
    await page.click('#searchPdKnd')
    await new Promise(r => setTimeout(r, 1000))
  }

  // 3. 등록 라디오 클릭
  await page.evaluate(() => {
    const rs = Array.from(document.querySelectorAll('input[type=radio]'))
    const reg = rs.find(r => (r as HTMLInputElement).name === 'searchRegistAt' && (r as HTMLInputElement).value === 'Y')
    if (reg) (reg as HTMLInputElement).click()
  })
  await new Promise(r => setTimeout(r, 500))

  // 4. 계좌 목록 가져오기
  const accounts = await page.evaluate(() => {
    const sel = document.getElementById('searchAcnut') as HTMLSelectElement
    if (!sel) return []
    return Array.from(sel.options).map(o => o.value)
  })

  // 5. 각 계좌별로 검색 후 데이터 합치기
  let allData: any[] = []
  for (const acnut of accounts) {
    await page.select('#searchAcnut', acnut)
    await new Promise(r => setTimeout(r, 500))

    console.log(`[ifriends] 검색: 회계연도=${fsyr}, 계좌=${acnut}`)
    await page.click('#searchButton')
    await new Promise(r => setTimeout(r, 8000))

    const data = await page.evaluate(() => {
      const $ = (window as any).$
      if (!$) return []
      try {
        const gridEl = $('.pq-grid').first()
        const inst = gridEl.pqGrid('instance')
        if (inst) {
          const d = inst.option('dataModel').data
          return d || []
        }
      } catch (e) { /* */ }
      return []
    })

    console.log(`[ifriends] 계좌 ${acnut}: ${data.length}건`)
    allData = allData.concat(data)
  }

  console.log(`[ifriends] 회계연도 ${fsyr} 전체: ${allData.length}건`)
  return allData
}

/**
 * i-friends 세목명 → sunote 코드 직접 매핑
 * (i-friends 표현방식이 sunote/by24와 다른 경우)
 */
const IFRIENDS_TAX_MAP: Record<string, { RY?: string; DY?: string; code?: string }> = {
  // 기타필요경비 세목 (수입 1221-xxx, 지출 2421-xxx)
  '입학준비금': { RY: '1221-111', DY: '2421-111' },
  '현장학습비': { RY: '1221-112', DY: '2421-121' },
  '부모부담행사비': { RY: '1221-121', DY: '2421-141' },
  '시도특성화비': { RY: '1221-141', DY: '2421-161' },
  '아침저녁급식비': { RY: '1221-131', DY: '2421-151' },
  // 퇴직금 세목
  '퇴직적립금': { code: '2142-121' },
  '퇴직금': { code: '2142-112' },
  // 기타운영비 세목
  '건물융자금의이자': { code: '2217-121' },
  '임대료': { code: '2217-111' },
}

/** 계정과목명 + 세목명 → 코드 변환 (세목 있으면 XXXX-XXX 형식) */
function resolveAccountCode(acntctgrNm: string, taxitmNm: string, rcppaySe: string): string {
  const normalize = (s: string) => s.replace(/[·\s·,.]/g, '').replace(/및/g, '')
  const fmtCode = (c: string) => c.includes('-') ? c : `${c.substring(0, 4)}-${c.substring(4)}`

  // 1. 세목이 있고 계정과목과 다르면 i-friends 전용 매핑
  if (taxitmNm && taxitmNm !== acntctgrNm) {
    // 괄호 안 내용 제거: "부모부담행사비(기타필요경비)" → "부모부담행사비"
    const cleanTax = taxitmNm.replace(/\([^)]*\)/g, '').trim()
    const normTax = normalize(cleanTax)

    // i-friends 전용 매핑 (노멀라이즈 비교)
    for (const [key, mapping] of Object.entries(IFRIENDS_TAX_MAP)) {
      if (normalize(key) === normTax || normTax.includes(normalize(key))) {
        if (mapping.code) return mapping.code
        if (rcppaySe === 'RY' && mapping.RY) return mapping.RY
        if (rcppaySe === 'DY' && mapping.DY) return mapping.DY
        return mapping.RY || mapping.DY || ''
      }
    }

    // subAccountCodeMap 매칭
    if (rcppaySe === 'DY') {
      for (const [key, code] of Object.entries(subAccountCodeMap)) {
        if (key.endsWith('(지출)') && normalize(key.replace('(지출)', '')) === normTax) {
          return fmtCode(code)
        }
      }
    }
    if (subAccountCodeMap[cleanTax]) return fmtCode(subAccountCodeMap[cleanTax])
    for (const [key, code] of Object.entries(subAccountCodeMap)) {
      if (normalize(key) === normTax) return fmtCode(code)
    }
    // 키워드 포함 매칭
    for (const [key, code] of Object.entries(subAccountCodeMap)) {
      if (key !== '자산취득비' && normTax.includes(normalize(key))) return fmtCode(code)
    }
  }

  // 2. 계정과목명 → 4자리 코드
  if (accountCodeMap[acntctgrNm]) return accountCodeMap[acntctgrNm]
  if (accountCodeMap[taxitmNm]) return accountCodeMap[taxitmNm]

  const normName = normalize(acntctgrNm)
  for (const [key, code] of Object.entries(accountCodeMap)) {
    if (normalize(key) === normName) return code
  }

  const normTax = normalize(taxitmNm)
  for (const [key, code] of Object.entries(accountCodeMap)) {
    if (normalize(key) === normTax) return code
  }

  return ''
}

/** pqGrid row → CashLedgerRow 변환 */
function toRow(d: any, idx: number): CashLedgerRow {
  const date = `${d.delngYear}${String(d.delngMonth).padStart(2, '0')}${String(d.delngDay).padStart(2, '0')}`
  const accountName = d.acntctgrNm || ''
  const taxitmNm = d.taxitmNm || ''
  const rcppaySe = d.rcppaySe || ''
  return {
    idx,
    date,
    docNo: d.prufNo || '',
    accountCode: resolveAccountCode(accountName, taxitmNm, rcppaySe),
    accountName,
    subAccountName: taxitmNm,
    summary: d.dedtSumry || '',
    income: d.rcpmnyAmount || 0,
    expense: d.defrayAmount || 0,
    balance: d.blce || 0,
    agreeDate: '',
  }
}

/** 다기간 현금출납부 조회 */
export async function getCashLedgerRange(
  page: Page,
  startYm: string,
  endYm: string,
  onMonth?: (data: CashLedgerResult) => void,
): Promise<CashLedgerResult[]> {
  const startYear = parseInt(startYm.substring(0, 4))
  const startMonth = parseInt(startYm.substring(4, 6))
  const endYear = parseInt(endYm.substring(0, 4))
  const endMonth = parseInt(endYm.substring(4, 6))

  const startFsyr = startMonth <= 2 ? startYear - 1 : startYear
  const endFsyr = endMonth <= 2 ? endYear - 1 : endYear

  const results: CashLedgerResult[] = []
  console.log(`[ifriends] 총 ${endFsyr - startFsyr + 1}개 회계연도 처리 (${startFsyr}~${endFsyr})`)

  for (let fsyr = startFsyr; fsyr <= endFsyr; fsyr++) {
    try {
      const gridData = await fetchGridData(page, String(fsyr))
      if (gridData.length === 0) {
        console.log(`[ifriends] 회계연도 ${fsyr}: 데이터 없음`)
        continue
      }

      // 요청 범위 내 데이터만 필터
      const reqStartYm = startYm
      const reqEndYm = endYm

      // 월별 분리
      const byMonth: Record<string, any[]> = {}
      for (const d of gridData) {
        const ym = `${d.delngYear}${String(d.delngMonth).padStart(2, '0')}`
        if (ym < reqStartYm || ym > reqEndYm) continue
        if (!byMonth[ym]) byMonth[ym] = []
        byMonth[ym].push(d)
      }

      // 이월금
      const carryOverItem = gridData.find((d: any) =>
        (d.dedtSumry || '').includes('전년도이월') || (d.acntctgrNm || '').includes('전년도 이월')
      )
      const carryOver = carryOverItem?.rcpmnyAmount || 0

      for (const [ym, monthData] of Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b))) {
        const cashRows = monthData.map((d, i) => toRow(d, i + 1))
        const monthNum = parseInt(ym.substring(4, 6))

        const summary: CashLedgerSummary = {
          prevIncome: 0,
          prevExpense: 0,
          monthStart: (monthNum === 3 && fsyr === startFsyr) ? carryOver : 0,
          monthIncome: cashRows.reduce((s, r) => s + r.income, 0),
          monthExpense: cashRows.reduce((s, r) => s + r.expense, 0),
        }

        const result: CashLedgerResult = { yearMonth: ym, rows: cashRows, summary }
        results.push(result)
        onMonth?.(result)
      }

      console.log(`[ifriends] 회계연도 ${fsyr} 완료: ${gridData.length}행, ${Object.keys(byMonth).length}개월`)
    } catch (e) {
      console.error(`[ifriends] 회계연도 ${fsyr} 실패:`, e)
      continue
    }
  }

  return results
}

/** 단일 월 현금출납부 조회 */
export async function getCashLedger(page: Page, yearMonth: string): Promise<CashLedgerResult> {
  const year = yearMonth.substring(0, 4)
  const month = parseInt(yearMonth.substring(4, 6))
  const fsyr = month <= 2 ? String(parseInt(year) - 1) : year

  const gridData = await fetchGridData(page, fsyr)

  // 해당 월만 필터
  const monthData = gridData.filter((d: any) =>
    d.delngYear === year && String(d.delngMonth).padStart(2, '0') === String(month).padStart(2, '0')
  )

  const cashRows = monthData.map((d: any, i: number) => toRow(d, i + 1))
  const carryOverItem = monthData.find((d: any) =>
    (d.dedtSumry || '').includes('전년도이월')
  )

  const summary: CashLedgerSummary = {
    prevIncome: 0,
    prevExpense: 0,
    monthStart: carryOverItem?.rcpmnyAmount || 0,
    monthIncome: cashRows.reduce((s, r) => s + r.income, 0),
    monthExpense: cashRows.reduce((s, r) => s + r.expense, 0),
  }

  return { yearMonth, rows: cashRows, summary }
}

export async function closeBrowser(): Promise<void> {
  if (browser) {
    await browser.close().catch(() => {})
    browser = null
  }
}
