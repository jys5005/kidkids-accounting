import { NextRequest, NextResponse } from 'next/server'
import puppeteer, { type Browser } from 'puppeteer'

export const runtime = 'nodejs'
export const maxDuration = 300

// 걸음마(gwin.co.kr) 전표(현금출납부) 가져오기 — 실 브라우저(puppeteer)로 로그인해 세션 확보 후,
// 브라우저 컨텍스트 안에서 API 호출(getBillList). 브라우저가 쿠키/세션을 관리 → 서버 직접호출의 세션 문제 우회.
// ⚠ getBillList 정확한 엔드포인트/파라미터/응답필드가 미확인 → 1차는 원시 응답을 반환(진단), 확인 후 매핑 확정.
// 자격증명은 클라이언트 전달, 저장/로그 금지.

const BOOK_GB: Record<string, string> = { subsidy: '03', fee: '04', 'info-center': '01' }
// getBillList 후보 엔드포인트 (billManage 모듈). 성공하는 것 채택.
const BILL_ENDPOINTS = [
  '/acc/api/acc/acc/billManage/getBillList',
  '/acc/api/acc/acc/billManage/getBillMngList',
  '/acc/api/acc/acc/billManage/getCashList',
]

let _b: Browser | null = null
async function getBrowser(): Promise<Browser> {
  if (_b && _b.connected) return _b
  _b = await puppeteer.launch({
    headless: true,
    protocolTimeout: 300000, // 5분 — 천천히 정확히
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  })
  return _b
}

export async function POST(req: NextRequest) {
  let page = null
  try {
    const { id, password, book, year, monthFrom, monthTo, month } = await req.json()
    if (!id || !password) return NextResponse.json({ success: false, error: '걸음마 아이디/비밀번호가 필요합니다.' }, { status: 400 })
    const bg = BOOK_GB[book] || '03'
    const y = String(year || new Date().getFullYear())
    const mFrom = String(monthFrom || month || '03').padStart(2, '0')
    const mTo = String(monthTo || month || '12').padStart(2, '0')

    const b = await getBrowser()
    page = await b.newPage()
    page.setDefaultTimeout(60000)
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36')
    // gwin.co.kr 오리진·쿠키 확보용 가벼운 정적 리소스로 진입 (무거운 WebSquare SPA 회피)
    await page.goto('https://gwin.co.kr/acc/resources/images/common/common/icon-card.png', { waitUntil: 'domcontentloaded', timeout: 40000 })

    // 브라우저 컨텍스트에서 로그인 → 시설 → 전표조회 (문자열 evaluate: __name 주입 회피). 각 fetch 20초 타임아웃.
    const script = `(async () => {
      const sleep = (ms) => new Promise(r => setTimeout(r, ms));
      const j = async (path, body) => {
        try {
          const r = await fetch(path, { method:'POST', headers:{'Content-Type':'application/json'}, credentials:'include', body: JSON.stringify(body), signal: AbortSignal.timeout(60000) });
          const t = await r.text(); let json=null; try{ json=JSON.parse(t) }catch(e){}
          return { ok:r.ok, status:r.status, json, text: json?null:t.slice(0,400) };
        } catch(e) { return { ok:false, status:0, json:null, err: String(e && e.message || e) }; }
      };
      await sleep(1500);
      const login = await j('/portal/api/cmmn/login', ${JSON.stringify({ id, password })});
      if (!(login.json && login.json.mberNo)) return { step:'login', login };
      const mberNo = login.json.mberNo;
      await sleep(2000);
      const fclt = await j('/portal/api/cmmn/mberFclt', { mberNo });
      const fcltcd = fclt.json && fclt.json[0] && fclt.json[0].fcltcd;
      if (!fcltcd) return { step:'fclt', fclt };
      await sleep(2000);
      const search = {
        FCLTCD: fcltcd, BOOK_GB: '${bg}',
        ESTI_YEAR: '${y}', PAPER_YEAR: '${y}', YEAR: '${y}',
        DURATION_GB: 1, ESTI_CODE: '', ACCT_CODE: '', SEMOK_CODE: '',
        PAPER_DATE_START: '${y}${mFrom}01', PAPER_DATE_END: '${y}${mTo}31',
        PAPER_YEARMONTH_START: '${y}${mFrom}', PAPER_YEARMONTH_END: '${y}${mTo}',
        START_YM: '${y}${mFrom}', END_YM: '${y}${mTo}',
        SORT_GB: '', INOUT_GB: 'A'
      };
      const endpoints = ${JSON.stringify(BILL_ENDPOINTS)};
      for (const ep of endpoints) {
        await sleep(1500);
        const res = await j(ep, { search });
        if (res.json) {
          const listKey = Object.keys(res.json).find(k => Array.isArray(res.json[k]));
          const list = listKey ? res.json[listKey] : [];
          return { step:'bill', endpoint: ep, fcltcd, listKey, count: list.length, sample: list.slice(0,2), keys: list[0]?Object.keys(list[0]):[], topKeys: Object.keys(res.json) };
        }
      }
      return { step:'bill-fail', tried: endpoints };
    })()`
    const result = await page.evaluate(script)
    await page.close(); page = null
    return NextResponse.json({ success: true, book, diag: result })
  } catch (e) {
    try { if (page) await page.close() } catch {}
    return NextResponse.json({ success: false, error: `걸음마 전표 조회 오류: ${e instanceof Error ? e.message : String(e)}` }, { status: 200 })
  }
}
