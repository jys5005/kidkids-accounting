import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

/**
 * 데이터이관 계정코드 커스텀 매핑을 **업체(로그인)별 + 출발지별**로 저장/조회.
 * - 키 = `${loginUserId}::${source}`
 * - 저장소: data/migration-mapping.json (회계앱 VPS 로컬)
 */
const STORE = path.join(process.cwd(), 'data', 'migration-mapping.json')

type Store = Record<string, { mappings: Record<string, string>; savedAt: string }>

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

/** GET ?source=xxx → { mappings } */
export async function GET(req: NextRequest) {
  const uid = loginUser(req)
  if (!uid) return NextResponse.json({ mappings: {}, error: '로그인 필요' }, { status: 401 })
  const source = new URL(req.url).searchParams.get('source') || ''
  const e = read()[`${uid}::${source}`]
  return NextResponse.json({ mappings: e?.mappings || {}, savedAt: e?.savedAt || '' })
}

/** POST { source, mappings } → 저장 */
export async function POST(req: NextRequest) {
  const uid = loginUser(req)
  if (!uid) return NextResponse.json({ success: false, error: '로그인 필요' }, { status: 401 })
  let body: Record<string, unknown> = {}
  try { body = await req.json() } catch { /* ignore */ }
  const source = String(body.source ?? '')
  const mappings = (body.mappings && typeof body.mappings === 'object') ? body.mappings as Record<string, string> : null
  if (!source || !mappings) {
    return NextResponse.json({ success: false, error: '출발지·매핑이 필요합니다.' }, { status: 400 })
  }
  const s = read()
  s[`${uid}::${source}`] = { mappings, savedAt: new Date().toISOString() }
  write(s)
  return NextResponse.json({ success: true })
}
