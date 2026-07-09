import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

/**
 * 데이터이관 출발지(회계사이트) 로그인 정보를 **업체(로그인 사용자)별**로 저장/조회.
 * - 키 = `${loginUserId}::${source}` → 업체마다 독립 저장 (전역 program-auth 와 별개)
 * - auth_session 쿠키에서 로그인 업체 식별
 * - 저장소: data/migration-auth.json (회계앱 VPS 로컬)
 */
const STORE = path.join(process.cwd(), 'data', 'migration-auth.json')
const PLATFORM_URL = process.env.NEXT_PUBLIC_PLATFORM_URL || 'http://localhost:3000'
// 통합e 쪽에 세션쿠키 캐시(source_session_cache)가 구현된 출발지만 워밍업 대상
const SESSION_CACHE_SOURCES = new Set(['by24', 'jangbunara', 'wisean', 'ifriends'])

interface Entry { userId: string; password: string; savedAt: string }
type Store = Record<string, Entry>

/**
 * 로그인정보 등록 직후 실제 로그인을 1회 수행해 세션쿠키를 미리 캐시.
 * 통합e cash-ledger API(이번 달 1개월)를 그대로 호출 — 그 부수효과로 로그인 성공 시
 * 자동으로 source_session_cache 에 저장된다(이미 구현된 로직 재사용).
 * fire-and-forget: 실패해도 무해(다음 실제 조회 때 정상적으로 폼 로그인됨).
 */
function warmupSession(source: string, userId: string, password: string): void {
  if (!SESSION_CACHE_SOURCES.has(source)) return
  const now = new Date()
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
  fetch(`${PLATFORM_URL}/api/${source}/cash-ledger`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ userId, password, yearMonth }),
    signal: AbortSignal.timeout(90000),
  })
    .then(() => console.log(`[migration-auth] ${source} 세션 워밍업 완료 (${userId})`))
    .catch(e => console.log(`[migration-auth] ${source} 세션 워밍업 실패(무해): ${e instanceof Error ? e.message : String(e)}`))
}

function read(): Store {
  try { return fs.existsSync(STORE) ? JSON.parse(fs.readFileSync(STORE, 'utf-8')) : {} } catch { return {} }
}
function write(s: Store) {
  const dir = path.dirname(STORE)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(STORE, JSON.stringify(s, null, 2), 'utf-8')
}
function loginUser(req: NextRequest): string | null {
  const c = req.cookies.get('auth_session')?.value
  if (!c) return null
  try { const j = JSON.parse(c); return j.userId || j.username || j.id || null } catch { return null }
}

/** GET ?source=xxx → { saved: bool, userId, hasPw } (비밀번호 평문은 응답하지 않고 prefill 은 별도 필드) */
export async function GET(req: NextRequest) {
  const uid = loginUser(req)
  if (!uid) return NextResponse.json({ saved: false, error: '로그인 필요' }, { status: 401 })
  const sp = new URL(req.url).searchParams
  const store = read()
  // ?list=1 → 이 업체가 저장한 출발지 목록 (자동 선택용). sunote-target 은 제외.
  if (sp.get('list')) {
    const prefix = `${uid}::`
    const sources = Object.keys(store)
      .filter(k => k.startsWith(prefix))
      .map(k => k.slice(prefix.length))
      .filter(s => s !== 'sunote-target')
    return NextResponse.json({ sources })
  }
  const source = sp.get('source') || ''
  if (!source) return NextResponse.json({ saved: false })
  const e = store[`${uid}::${source}`]
  if (!e) return NextResponse.json({ saved: false })
  // 데이터이관은 즉시 자동입력이 목적이므로 비밀번호도 반환 (본인 업체 것만)
  return NextResponse.json({ saved: true, userId: e.userId, password: e.password, savedAt: e.savedAt })
}

/** POST { source, userId, password } → 저장 */
export async function POST(req: NextRequest) {
  const uid = loginUser(req)
  if (!uid) return NextResponse.json({ success: false, error: '로그인 필요' }, { status: 401 })
  let body: Record<string, unknown> = {}
  try { body = await req.json() } catch { /* ignore */ }
  const source = String(body.source ?? '').trim()
  const userId = String(body.userId ?? '').trim()
  const password = String(body.password ?? '')
  if (!source || !userId || !password) {
    return NextResponse.json({ success: false, error: '출발지·아이디·비밀번호가 모두 필요합니다.' }, { status: 400 })
  }
  const s = read()
  s[`${uid}::${source}`] = { userId, password, savedAt: new Date().toISOString() }
  write(s)
  warmupSession(source, userId, password)  // fire-and-forget — 응답 지연 없이 백그라운드에서 세션 미리 캐시
  return NextResponse.json({ success: true })
}

/** DELETE ?source=xxx → 삭제 */
export async function DELETE(req: NextRequest) {
  const uid = loginUser(req)
  if (!uid) return NextResponse.json({ success: false, error: '로그인 필요' }, { status: 401 })
  const source = new URL(req.url).searchParams.get('source') || ''
  const s = read()
  delete s[`${uid}::${source}`]
  write(s)
  return NextResponse.json({ success: true })
}
