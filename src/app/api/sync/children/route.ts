import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PLATFORM_URL = process.env.NEXT_PUBLIC_PLATFORM_URL || 'http://localhost:3000'

type RawChild = Record<string, unknown>

interface MappedChild {
  id: number
  name: string
  birth: string
  age: string
  residentNo: string  // YYMMDD-N****** (앞6 + 뒷1자리만, 나머지 마스킹)
  className: string
  enterDate: string
  leaveDate: string
  guardian: string
  guardianRelation: string
  phone: string
  status: '현원' | '퇴소'
  _key: string
}

function s(v: unknown): string {
  return typeof v === 'string' ? v : v == null ? '' : String(v)
}

function fmtBirth(front: string, back: string): string {
  if (!front || front.length < 6) return ''
  const yy = front.slice(0, 2)
  const mm = front.slice(2, 4)
  const dd = front.slice(4, 6)
  if (!/^\d{6}$/.test(front)) return ''
  // 어린이집 원아: backFirst 3/4/7/8 → 2000년대, 1/2/5/6 → 1900년대, 그 외 → yy<=현재 끝2자리면 2000년대
  const bFirst = back?.[0] ?? ''
  let century = ''
  if (['3', '4', '7', '8'].includes(bFirst)) century = '20'
  else if (['1', '2', '5', '6'].includes(bFirst)) century = '19'
  else {
    const cur2 = new Date().getFullYear() % 100
    century = parseInt(yy, 10) <= cur2 ? '20' : '19'
  }
  return `${century}${yy}-${mm}-${dd}`
}

function ageLabel(childOrder: unknown): string {
  const n = typeof childOrder === 'number' ? childOrder
    : typeof childOrder === 'string' ? parseInt(childOrder, 10) : NaN
  if (Number.isNaN(n)) return ''
  if (n < 0 || n > 5) return ''
  return `만${n}세`
}

function maskResident(front: string, back: string): string {
  if (!front || front.length < 6) return ''
  const f6 = front.slice(0, 6)
  if (!back) return `${f6}-*******`
  return `${f6}-${back[0]}******`
}

function mapChild(raw: RawChild, statFallback: '현원' | '퇴소', idx: number): MappedChild {
  const childStatus = s(raw.childStatus)
  const status: '현원' | '퇴소' =
    childStatus === 'A' ? '현원' : childStatus === 'W' ? '퇴소' : statFallback
  const name = s(raw.childName ?? raw.childNm)
  const front = s(raw.residentIdFront ?? raw.rrnFr)
  const back  = s(raw.residentIdBack  ?? raw.rrnBk)
  const birth = fmtBirth(front, back)
  const enterDateRaw = s(raw.entryDate ?? raw.enterDt)
  const leaveDateRaw = s(raw.withdrawalDate ?? raw.leaveDt)
  return {
    id: idx + 1,
    name,
    birth,
    age: ageLabel(raw.childOrder),
    residentNo: maskResident(front, back),
    className: s(raw.generalClassId ?? raw.classNm),
    enterDate: enterDateRaw,
    leaveDate: leaveDateRaw,
    guardian: s(raw.guardianName ?? raw.parentNm),
    guardianRelation: s(raw.guardianRelation),
    phone: s(raw.guardianPhone ?? raw.parentTel),
    status,
    _key: `${name}|${birth}|${enterDateRaw}`,
  }
}

async function fetchPageData(session: string, field: string): Promise<RawChild[]> {
  try {
    const res = await fetch(`${PLATFORM_URL}/api/settings/page-data?field=${encodeURIComponent(field)}`, {
      headers: { Cookie: `auth_session=${session}` },
      cache: 'no-store',
    })
    if (!res.ok) return []
    const j = await res.json()
    const list = j?.list ?? j?.data?.list ?? []
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

export async function GET(request: NextRequest) {
  const session = request.cookies.get('auth_session')?.value
  if (!session) return NextResponse.json({ error: '미인증' }, { status: 401 })

  const [curList, leaveList] = await Promise.all([
    fetchPageData(session, 'child-cur'),
    fetchPageData(session, 'child-leave'),
  ])

  // childKey(이름+생년월일+입소일) 기준 dedupe — 퇴소 레코드가 현원보다 우선 (퇴소가 최종 확정값)
  const byKey = new Map<string, MappedChild>()
  curList.forEach((r, i) => {
    const m = mapChild(r, '현원', i)
    byKey.set(m._key, m)
  })
  leaveList.forEach((r, i) => {
    const m = mapChild(r, '퇴소', curList.length + i)
    byKey.set(m._key, m)
  })

  const children = Array.from(byKey.values()).map((c, i) => ({ ...c, id: i + 1 }))
  return NextResponse.json({
    success: true,
    count: children.length,
    children,
    source: { 'child-cur': curList.length, 'child-leave': leaveList.length },
  })
}
