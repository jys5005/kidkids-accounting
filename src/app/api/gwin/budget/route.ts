import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 60

// 걸음마(gwin.co.kr) 실시간 예산 조회 — WebSquare 다단계:
//  1) POST /portal/api/cmmn/login {id,password}         → mberNo
//  2) POST /portal/api/cmmn/mberFclt {mberNo}           → fcltcd
//  3) POST /acc/.../getEstimateSetList (INOUT별)        → SET_IDX(현재 예산세트)
//  4) POST /acc/.../getBudgetList (INOUT별)             → budgetList(산출기초 라인)
//  → 목코드별 산출기초 items 로 변환(세출은 'E' 접두). 저장 형식은 정적 GWIN_BUDGETS 와 동일.
// ⚠ 자격증명은 클라이언트가 전달(사용자 본인 걸음마 계정) — 서버는 중계만, 저장/로그 금지.

const GWIN = 'https://gwin.co.kr'
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36'
// 장부 → BOOK_GB (HAR 검증: 03=보조금 102,630,172 / 04=이용료 4,006,774). 보육정보센터는 예산 미입력.
const BOOK_GB: Record<string, string> = { subsidy: '03', fee: '04', 'info-center': '01' }

const num = (v: unknown) => Number(String(v ?? '').replace(/[,\s]/g, '')) || 0

// 간이 쿠키 자ar — 응답 set-cookie 누적 후 다음 요청 Cookie 헤더로 전송
class Jar {
  private m = new Map<string, string>()
  absorb(res: Response) {
    const sc = (res.headers as unknown as { getSetCookie?: () => string[] }).getSetCookie?.() ?? []
    const list = sc.length ? sc : (res.headers.get('set-cookie') ? [res.headers.get('set-cookie') as string] : [])
    for (const c of list) {
      const [pair] = c.split(';')
      const eq = pair.indexOf('=')
      if (eq > 0) this.m.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim())
    }
  }
  header() { return [...this.m].map(([k, v]) => `${k}=${v}`).join('; ') }
}

async function post(jar: Jar, path: string, body: unknown, referer: string) {
  const res = await fetch(GWIN + path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': UA,
      'Origin': GWIN,
      'Referer': referer,
      'Accept': 'application/json, text/plain, */*',
      ...(jar.header() ? { 'Cookie': jar.header() } : {}),
    },
    body: JSON.stringify(body),
  })
  jar.absorb(res)
  const text = await res.text()
  let json: unknown = null
  try { json = text ? JSON.parse(text) : null } catch { /* non-json */ }
  return { ok: res.ok, status: res.status, json, text }
}

const PORTAL_REF = GWIN + '/portal/websquare/websquare.html'
const ACC_REF = GWIN + '/acc/websquare/websquare.html'

function baseSearch(fcltcd: string, bg: string, year: string, inout: string, setIdx: string) {
  return {
    SET_IDX: setIdx, SET_NAME: '', FCLTCD: fcltcd, BOOK_GB: bg, DURATION_GB: 1,
    ESTI_YEAR: year, ESTI_INOUT: inout, ESTIM_GB: 'M01', ESTIM_NUM: '0', ESTIM_MONEY1000: 'N',
    IS_LAST_SET: 'Y', INS_AUTH_KEY: '', ESTI_YEARMONTH: `${year}07`, ESTI_DEPTH: '1',
    ISARANG_ESTI_NUM: '', ESTIM_DATE: `${year}0101`, ESTIM_DATE_START: `${year}01`, ESTIM_DATE_END: `${year}12`,
    IS_LOCKED: '', AAV_IDX: '', ExecutionEstiDepth: '', ReportEstiDepth: '',
  }
}

// budgetList 라인 → 산출기초 item
function toItem(r: Record<string, unknown>) {
  const extras = []
  for (let i = 3; i <= 9; i++) {
    extras.push({ num: num(r[`ESTI_OUT_BASICNUM${i}`]) || 1, unit: String(r[`ESTI_OUT_BASICTEXT${i}`] ?? '식') || '식' })
  }
  return {
    name: String(r.ESTI_OUT_NAME ?? r.ESTI_NAME ?? ''),
    unitPrice: num(r.ESTI_OUT_MONEY),
    qty: num(r.ESTI_OUT_BASICNUM1) || 1,
    qtyUnit: String(r.ESTI_OUT_BASICTEXT1 ?? '식') || '식',
    months: num(r.ESTI_OUT_BASICNUM2) || 1,
    monthsUnit: String(r.ESTI_OUT_BASICTEXT2 ?? '식') || '식',
    extras,
    total: num(r.ESTI_OUT_TOTMONEY),
  }
}

export async function POST(req: NextRequest) {
  try {
    const { id, password, book, year } = await req.json()
    if (!id || !password) return NextResponse.json({ success: false, error: '걸음마 아이디/비밀번호가 필요합니다.' }, { status: 400 })
    const bg = BOOK_GB[book]
    if (!bg) return NextResponse.json({ success: false, error: `알 수 없는 장부: ${book}` }, { status: 400 })
    const y = String(year || new Date().getFullYear())
    const jar = new Jar()

    // 1) 로그인
    const login = await post(jar, '/portal/api/cmmn/login', { id, password }, PORTAL_REF)
    const mberNo = (login.json as { mberNo?: string } | null)?.mberNo
    if (!mberNo) return NextResponse.json({ success: false, error: `걸음마 로그인 실패 (${login.status}) ${String(login.text).slice(0, 120)}` }, { status: 200 })

    // 2) 시설 선택
    const fclt = await post(jar, '/portal/api/cmmn/mberFclt', { mberNo }, PORTAL_REF)
    const fcltArr = fclt.json as Array<{ fcltcd?: string }> | null
    const fcltcd = fcltArr?.[0]?.fcltcd
    if (!fcltcd) return NextResponse.json({ success: false, error: '걸음마 시설 정보를 찾을 수 없습니다.' }, { status: 200 })

    // 3~4) 세입(I)/세출(O) 각각 예산세트 → 예산조회
    const basisByMok: Record<string, ReturnType<typeof toItem>[]> = {}
    let moneyIn = 0, moneyOut = 0
    for (const inout of ['I', 'O'] as const) {
      const setRes = await post(jar, '/acc/api/acc/acc/budgetManage/getEstimateSetList',
        { search: baseSearch(fcltcd, bg, y, inout, '') }, ACC_REF)
      // 401 = 걸음마 세션 거부(반복 로그인 차단 등) — "예산 없음"으로 오인 표시 방지
      if (setRes.status === 401 || (setRes.json as { status?: number } | null)?.status === 401) {
        return NextResponse.json({ success: false, error: '걸음마 접속이 일시 거부되었습니다(반복 로그인 차단 가능). 잠시 후 다시 시도해 주세요.' }, { status: 200 })
      }
      const setList = (setRes.json as { estimateSetList?: Array<{ SET_IDX?: string }> } | null)?.estimateSetList
      const setIdx = setList?.[0]?.SET_IDX || ''
      if (!setIdx) continue // 해당 장부/방향 예산 없음

      const budRes = await post(jar, '/acc/api/acc/acc/budgetManage/getBudgetList',
        { search: baseSearch(fcltcd, bg, y, inout, setIdx) }, ACC_REF)
      const budJson = budRes.json as { budgetList?: Record<string, unknown>[]; estimateSetSum?: Record<string, unknown> } | null
      if (inout === 'I') moneyIn = num(budJson?.estimateSetSum?.MONEY_IN)
      else moneyOut = num(budJson?.estimateSetSum?.MONEY_OUT)
      for (const r of budJson?.budgetList ?? []) {
        if (!r.ESTI_OUT_TOTMONEY || String(r.ESTI_OUT_TOTMONEY) === '0') continue // 산출기초 라인만
        const mok = String(r.ESTI_DISPLAY ?? '').trim()
        if (!mok) continue
        const key = (inout === 'O' ? 'E' : '') + mok
        ;(basisByMok[key] ||= []).push(toItem(r))
      }
    }

    const mokCount = Object.keys(basisByMok).length
    if (mokCount === 0) return NextResponse.json({ success: false, error: `걸음마에 등록된 ${y}년 예산이 없습니다 (${book}).` }, { status: 200 })
    return NextResponse.json({ success: true, basisByMok, mokCount, moneyIn, moneyOut })
  } catch (e) {
    return NextResponse.json({ success: false, error: `걸음마 조회 오류: ${e instanceof Error ? e.message : String(e)}` }, { status: 200 })
  }
}
