import { NextRequest, NextResponse } from 'next/server'
import puppeteer, { type Browser } from 'puppeteer'

export const runtime = 'nodejs'
export const maxDuration = 120

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
  _b = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] })
  return _b
}

export async function POST(req: NextRequest) {
  let page = null
  try {
    const { id, password, book, year, month } = await req.json()
    if (!id || !password) return NextResponse.json({ success: false, error: '걸음마 아이디/비밀번호가 필요합니다.' }, { status: 400 })
    const bg = BOOK_GB[book] || '03'
    const y = String(year || new Date().getFullYear())
    const m = String(month || '06').padStart(2, '0')

    const b = await getBrowser()
    page = await b.newPage()
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36')
    // acc 도메인 진입(오리진·쿠키 확보). WebSquare 트래커로 networkidle 안 끝날 수 있어 domcontentloaded.
    await page.goto('https://gwin.co.kr/acc/websquare/websquare.html?w2xPath=/acc/views/common/main.xml', { waitUntil: 'domcontentloaded', timeout: 40000 })

    // 브라우저 컨텍스트에서 로그인 → 시설 → 전표조회 (문자열 evaluate: __name 주입 회피)
    const script = `(async () => {
      const j = async (path, body) => {
        const r = await fetch(path, { method:'POST', headers:{'Content-Type':'application/json'}, credentials:'include', body: JSON.stringify(body) });
        const t = await r.text(); let json=null; try{ json=JSON.parse(t) }catch(e){}
        return { ok:r.ok, status:r.status, json, text: json?null:t.slice(0,400) };
      };
      const login = await j('/portal/api/cmmn/login', ${JSON.stringify({ id, password })});
      const mberNo = login.json && login.json.mberNo;
      if (!mberNo) return { step:'login', login };
      const fclt = await j('/portal/api/cmmn/mberFclt', { mberNo });
      const fcltcd = fclt.json && fclt.json[0] && fclt.json[0].fcltcd;
      if (!fcltcd) return { step:'fclt', fclt };
      const search = {
        FCLTCD: fcltcd, BOOK_GB: '${bg}',
        ESTI_YEAR: '${y}', PAPER_YEAR: '${y}', YEAR: '${y}',
        ESTI_MONTH: '${m}', PAPER_MONTH: '${m}', MONTH: '${m}',
        PAPER_YEARMONTH: '${y}${m}', ESTI_YEARMONTH: '${y}${m}',
        DURATION_GB: 0, ESTI_CODE: '', ACCT_CODE: '', SEMOK_CODE: '',
        PAPER_DATE_START: '${y}${m}01', PAPER_DATE_END: '${y}${m}31',
        SORT_GB: '', INOUT_GB: 'A'
      };
      const endpoints = ${JSON.stringify(BILL_ENDPOINTS)};
      for (const ep of endpoints) {
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
