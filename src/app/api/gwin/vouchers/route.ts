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
// getBillList 후보 (billManage 모듈)
const BILL_ENDPOINTS = [
  '/acc/api/acc/acc/billManage/getBillList',
  '/acc/api/acc/acc/billManage/getBillMngList',
  '/acc/api/acc/acc/billManage/getPaperList',
  '/acc/api/acc/acc/billManage/getCashList',
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

    const search: Record<string, unknown> = {
      FCLTCD: fcltcd, BOOK_GB: bg, ESTI_YEAR: y, PAPER_YEAR: y, YEAR: y, DURATION_GB: 1,
      ESTI_CODE: '', ACCT_CODE: '', SEMOK_CODE: '', INOUT_GB: 'A', SORT_GB: '',
      PAPER_DATE_START: `${yFrom}${mF}01`, PAPER_DATE_END: `${yTo}${mT}${lastDay}`,
      PAPER_YEARMONTH_START: `${yFrom}${mF}`, PAPER_YEARMONTH_END: `${yTo}${mT}`,
      START_YM: `${yFrom}${mF}`, END_YM: `${yTo}${mT}`,
    }

    // getBillList 후보 순회 — list 있는 응답 채택
    const tried: { ep: string; status: number; keys: string[] }[] = []
    for (const ep of BILL_ENDPOINTS) {
      const res = await post(jar, ep, { search }, ACC_REF)
      const j = res.json as Record<string, unknown> | null
      if (j && typeof j === 'object') {
        const listKey = Object.keys(j).find(k => Array.isArray((j as Record<string, unknown>)[k]))
        const list = (listKey ? (j as Record<string, unknown[]>)[listKey] : []) as Record<string, unknown>[]
        if (Array.isArray(list) && list.length > 0) {
          return NextResponse.json({
            success: true, endpoint: ep, listKey, count: list.length,
            keys: Object.keys(list[0]), rows: list.slice(0, 2000),
          })
        }
        tried.push({ ep, status: res.status, keys: j ? Object.keys(j) : [] })
      } else {
        tried.push({ ep, status: res.status, keys: [] })
      }
    }
    return NextResponse.json({ success: false, error: `전표 목록 응답을 찾지 못했습니다 (엔드포인트/파라미터 확인 필요).`, tried }, { status: 200 })
  } catch (e) {
    return NextResponse.json({ success: false, error: `걸음마 전표 조회 오류: ${e instanceof Error ? e.message : String(e)}` }, { status: 200 })
  }
}
