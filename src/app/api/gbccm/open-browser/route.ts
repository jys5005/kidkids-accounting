import { NextRequest, NextResponse } from 'next/server'

const PLATFORM_URL = process.env.NEXT_PUBLIC_PLATFORM_URL || 'http://localhost:3000'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * POST /api/gbccm/open-browser — 경상북도(gbccm) 자동로그인(로그인된 새창 띄우기) 프록시
 *
 * 통합e 에 잡을 등록하면 원장 PC 로컬 에이전트가 저장된 세션(DCPU_SSID)을 주입한 브라우저를
 * 헤드풀로 열어 로그인된 화면에 진입한다. 여기서는 잡 등록 후 완료까지 폴링해 최종 결과만 반환.
 * body: { targetUrl?: string }
 * resp: { ok, openedUrl?, error?, pending? }
 */
export async function POST(req: NextRequest) {
  const cookie = req.headers.get('cookie') || ''
  let body: { targetUrl?: string; tabLabel?: string } = {}
  try { body = await req.json() } catch {}

  try {
    // 1) 통합e 에 잡 등록
    const r1 = await fetch(`${PLATFORM_URL}/api/gbccm/open-browser`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie },
      body: JSON.stringify({ targetUrl: body.targetUrl, tabLabel: body.tabLabel }),
    })
    const j1 = await r1.json().catch(() => ({}))
    if (!r1.ok || !j1?.success || !j1?.jobId) {
      return NextResponse.json(
        { ok: false, error: j1?.error || '자동로그인 잡 등록 실패' },
        { status: r1.status === 412 ? 412 : 200 },
      )
    }
    const jobId = j1.jobId

    // 2) 잡 완료까지 폴링 (~28s, nginx 60s 이내)
    const deadline = Date.now() + 28000
    let claimed = false
    while (Date.now() < deadline) {
      await sleep(1500)
      const r2 = await fetch(`${PLATFORM_URL}/api/jobs/${jobId}`, { headers: { cookie } })
      const j2 = await r2.json().catch(() => ({}))
      const job = j2?.job
      if (!job) continue
      if (job.status === 'running') claimed = true
      if (job.status === 'completed') {
        const res = job.result || {}
        return NextResponse.json({ ok: res.ok !== false, openedUrl: res.openedUrl, error: res.errMsg, nav: res.nav })
      }
      if (job.status === 'failed' || job.status === 'cancelled') {
        return NextResponse.json({ ok: false, error: job.error || '브라우저 열기 실패' })
      }
    }

    // 3) 시간 초과 — 아직 진행 중이거나 에이전트 미기동
    return NextResponse.json({
      ok: false,
      pending: true,
      error: claimed
        ? '에이전트가 브라우저를 여는 중입니다. 잠시 후 화면을 확인하세요.'
        : '원장님 PC의 자동화 에이전트가 실행 중이 아닙니다. 에이전트를 켠 뒤 다시 시도하세요.',
    })
  } catch {
    return NextResponse.json({ ok: false, error: '통합e 서버에 연결할 수 없습니다.' }, { status: 502 })
  }
}
