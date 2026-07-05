import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 120

// 걸음마(gwin.co.kr) 전표(현금출납부) 조회 — 예산과 동일한 서버 방식(브라우저 없이 fetch + 쿠키 jar).
// login → mberFclt → getBillList(장부·기간). 응답 원시 행 + 필드키 반환(구조 확인 후 매핑 확정).
// 자격증명은 클라이언트 전달, 저장/로그 금지.

const GWIN = 'https://gwin.co.kr'
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36'
const BOOK_GB: Record<string, string> = { subsidy: '03', fee: '04', 'info-center': '01' }
const PORTAL_REF = GWIN + '/portal/websquare/websquare.html'
const ACC_REF = GWIN + '/acc/websquare/websquare.html'
// 예산(작동 확인됨) 대조군 — 세션 유효성 확인용
const CONTROL_ENDPOINT = '/acc/api/acc/acc/budgetManage/getBudgetList'
// getBillList 후보 (모듈×메서드 다수) — 401=경로없음(auth필터), 200+list=정답
const BILL_ENDPOINTS = [
  '/acc/api/acc/acc/billManage/getBillList',
  '/acc/api/acc/acc/billManage/getBillMngList',
  '/acc/api/acc/acc/billManage/selectBillList',
  '/acc/api/acc/acc/billManage/getBillPaperList',
  '/acc/api/acc/acc/paperManage/getPaperList',
  '/acc/api/acc/acc/paperManage/getBillList',
  '/acc/api/acc/acc/voucherManage/getVoucherList',
  '/acc/api/acc/acc/cashManage/getCashList',
  '/acc/api/acc/acc/cashbookManage/getCashbookList',
  '/acc/api/acc/acc/billManage/getBillListPaging',
]

class Jar {
  private m = new Map<string, string>()
  absorb(res: Response) {
    const sc = (res.headers as unknown as { getSetCookie?: () => string[] }).getSetCookie?.() ?? []
    const list = sc.length ? sc : (res.headers.get('set-cookie') ? [res.headers.get('set-cookie') as string] : [])
    for (const c of list) {
      const [pair] = c.split(';'); const eq = pair.indexOf('=')
      if (eq > 0) this.m.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim())
    }
  }
  header() { return [...this.m].map(([k, v]) => `${k}=${v}`).join('; ') }
}

async function get(jar: Jar, path: string, referer: string) {
  const res = await fetch(GWIN + path, {
    method: 'GET',
    headers: { 'User-Agent': UA, 'Referer': referer, 'Accept': 'text/html,application/xhtml+xml,*/*', ...(jar.header() ? { 'Cookie': jar.header() } : {}) },
  })
  jar.absorb(res)
  await res.text().catch(() => '')
  return { ok: res.ok, status: res.status }
}

async function post(jar: Jar, path: string, body: unknown, referer: string) {
  const res = await fetch(GWIN + path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json', 'User-Agent': UA, 'Origin': GWIN, 'Referer': referer,
      'Accept': 'application/json, text/plain, */*', ...(jar.header() ? { 'Cookie': jar.header() } : {}),
    },
    body: JSON.stringify(body),
  })
  jar.absorb(res)
  const text = await res.text()
  let json: unknown = null
  try { json = text ? JSON.parse(text) : null } catch { /* non-json */ }
  return { ok: res.ok, status: res.status, json, text }
}

export async function POST(req: NextRequest) {
  try {
    const { id, password, book, year, monthFrom, monthTo } = await req.json()
    if (!id || !password) return NextResponse.json({ success: false, error: '걸음마 아이디/비밀번호가 필요합니다.' }, { status: 400 })
    const bg = BOOK_GB[book] || '03'
    const y = String(year || new Date().getFullYear())
    const mF = String(monthFrom || '03').padStart(2, '0')
    const mT = String(monthTo || '02').padStart(2, '0')
    // 회계연도 3월~익년2월: 1·2월은 회계연도+1 (달력연도 보정)
    const yFrom = Number(mF) >= 3 ? y : String(Number(y) + 1)
    const yTo = Number(mT) >= 3 ? y : String(Number(y) + 1)
    const lastDay = String(new Date(Number(yTo), Number(mT), 0).getDate()).padStart(2, '0')
    const jar = new Jar()

    // 로그인 → 시설
    const login = await post(jar, '/portal/api/cmmn/login', { id, password }, PORTAL_REF)
    const mberNo = (login.json as { mberNo?: string } | null)?.mberNo
    if (!mberNo) return NextResponse.json({ success: false, error: `걸음마 로그인 실패 (${login.status}) ${String(login.text).slice(0, 120)}` }, { status: 200 })
    const fclt = await post(jar, '/portal/api/cmmn/mberFclt', { mberNo }, PORTAL_REF)
    const fcltcd = (fclt.json as Array<{ fcltcd?: string }> | null)?.[0]?.fcltcd
    if (!fcltcd) return NextResponse.json({ success: false, error: '걸음마 시설 정보를 찾을 수 없습니다.' }, { status: 200 })

    // /acc 진입 페이지 GET — /acc 세션 쿠키(SSO) 확보 시도
    const accEnter = await get(jar, '/acc/websquare/websquare.html?w2xPath=/acc/views/common/main.xml', PORTAL_REF)

    // HAR 실측 파라미터 (billManage/getBillList). schACCOUNT_IDX/AAV_IDX 는 페이지 컨텍스트값 → 우선 빈값 시도.
    const search: Record<string, unknown> = {
      FCLTCD: fcltcd, schBookGb: bg,
      schACCOUNT_IDX: '', schACCOUNT_IDXforBillSearch: '',
      schYear: y, schByTerm: 'Y', schNotEstimate: 'Y', schYearMonth: '',
      schDateFrom: `${yFrom}${mF}01`, schDateTo: `${yTo}${mT}${lastDay}`,
      schTRANS_GB: '', schESTI_INOUT: '', schESTI_IDX: '', schESTI_IDX2_DEPTH4: '',
      schBILL_MEMO: '', schSUPPORT_NURI: '', FIX_COMBINE_BILL_IN: '', FIX_COMBINE_BILL_OUT: '',
      BILL_NUM_TYPE: '2', BILL_DATE_START: `${yFrom}${mF}`, BILL_DATE_END: `${yTo}${mT}`,
      CRED_IDX: '', AAV_IDX: '', FCLT_NM: '', schByMonth: '',
      rd_EstiDepth: '3', rd_EstiDepthDetail: '3', schBILL_GB: 'statement_A',
      schESTI_IDX2: '', schESTI_IDX_DEPTH4: '', schESTI_DEPTH: '', schESTI_INOUT2: '',
      schSUPPORT: '', schType1: '', schAutoBill: '', schDirect: '', schAutoDirect: '',
    }

    // ★ /acc 세션 초기화 — 예산과 동일하게 getEstimateSetList 를 먼저 호출(이게 acc 컨텍스트/세션 활성화로 추정)
    const warm = await post(jar, '/acc/api/acc/acc/budgetManage/getEstimateSetList', {
      search: { FCLTCD: fcltcd, BOOK_GB: bg, ESTI_YEAR: y, ESTI_INOUT: 'I', ESTIM_GB: 'M01', ESTIM_NUM: '0', DURATION_GB: 1, IS_LAST_SET: 'Y', ESTIM_MONEY1000: 'N' },
    }, ACC_REF)
    // 대조군 — 예산 getBudgetList. warmup 후 200 이면 세션 OK.
    const ctrl = await post(jar, CONTROL_ENDPOINT, { search: { FCLTCD: fcltcd, BOOK_GB: bg, ESTI_YEAR: y, ESTI_INOUT: 'I', ESTIM_GB: 'M01', DURATION_GB: 1 } }, ACC_REF)
    const control = { accEnter: accEnter.status, warm: warm.status, status: ctrl.status, hasJson: !!ctrl.json, msg: String(warm.text || ctrl.text || '').slice(0, 200) }

    const res = await post(jar, BILL_ENDPOINTS[0], { search }, ACC_REF)
    const j = res.json as Record<string, unknown> | null
    const list = (j && Array.isArray((j as { billList?: unknown[] }).billList)) ? (j as { billList: Record<string, unknown>[] }).billList : []
    if (list.length > 0) {
      return NextResponse.json({ success: true, endpoint: BILL_ENDPOINTS[0], count: list.length, keys: Object.keys(list[0]), rows: list.slice(0, 3000) })
    }
    return NextResponse.json({
      success: false,
      error: `전표 목록 비었거나 실패`,
      billStatus: res.status, control,
      billSnippet: j ? `keys:${Object.keys(j).join(',')}` : String(res.text || '').slice(0, 200),
    }, { status: 200 })
  } catch (e) {
    return NextResponse.json({ success: false, error: `걸음마 전표 조회 오류: ${e instanceof Error ? e.message : String(e)}` }, { status: 200 })
  }
}
