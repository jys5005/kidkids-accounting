import { NextRequest, NextResponse } from 'next/server'

/**
 * 경상북도(gbccm) "세션값 로그인 화면 열기" — 로컬 에이전트 경유.
 *
 * gbccm 은 보안키패드로 자동로그인 불가 → 등록된 DCPU_SSID 세션쿠키를 사용자 PC 의
 * 로컬 에이전트가 시스템 브라우저에 주입해 로그인된 gbccm.co.kr 창을 띄운다.
 *
 * 흐름: 이 라우트 → 통합e `/api/jobs`(type='gbccm-open-browser') 잡 등록 →
 *       사용자 PC 로컬 에이전트가 가로채 실행(headful) → 폴링으로 결과 수신.
 * ⚠ VPS 직접 Puppeteer(headless) 대신 에이전트 경유라 배포판에서도 사용자 PC 에 창이 뜬다.
 *
 * body: { sessionCookie: string, menu?: string }
 */

const PLATFORM_URL =
  process.env.NEXT_PUBLIC_PLATFORM_URL || 'http://localhost:3000'

export const maxDuration = 120

export async function POST(req: NextRequest) {
  try {
    const { sessionCookie, menu } = await req.json()
    const cookie = String(sessionCookie || '').trim()
    if (!cookie) {
      return NextResponse.json(
        { success: false, error: 'DCPU_SSID 세션쿠키값이 필요합니다' },
        { status: 400 },
      )
    }

    const authCookie = req.headers.get('cookie') || ''

    // 1) 통합e 잡큐에 등록 (로컬 에이전트가 사용자 PC 에서 실행)
    const enq = await fetch(`${PLATFORM_URL}/api/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie: authCookie },
      body: JSON.stringify({
        type: 'gbccm-open-browser',
        params: { sessionCookie: cookie, menu },
      }),
    })
    const enqData = await enq.json().catch(() => ({}))
    if (!enqData.success) {
      return NextResponse.json(
        { success: false, error: enqData.error || '잡 등록 실패 (통합e 연결 확인)' },
        { status: 502 },
      )
    }
    const jobId = enqData.jobId

    // 2) 폴링 (최대 ~90초)
    const startedAt = Date.now()
    while (Date.now() - startedAt < 90_000) {
      await new Promise((r) => setTimeout(r, 2000))
      const r = await fetch(`${PLATFORM_URL}/api/jobs/${jobId}`, {
        headers: { cookie: authCookie },
      })
      const d = await r.json().catch(() => ({}))
      const job = d?.job
      if (!job) continue

      if (job.status === 'completed') {
        const result = job.result || {}
        return NextResponse.json({
          success: true,
          bouncedToLogin: !!result.bouncedToLogin,
          currentUrl: result.currentUrl,
          message: result.bouncedToLogin
            ? '세션이 만료된 것 같습니다. gbccm.co.kr 재로그인 후 새 DCPU_SSID 등록하세요.'
            : '로그인된 gbccm 화면을 PC 에 열었습니다.',
        })
      }
      if (job.status === 'failed' || job.status === 'cancelled') {
        return NextResponse.json(
          { success: false, error: job.error || '실행 실패' },
          { status: 500 },
        )
      }
      // queued / running → 계속 폴링
    }

    return NextResponse.json(
      {
        success: false,
        error: '시간 초과 — 로컬 에이전트(npm run agent)가 실행 중인지 확인하세요.',
      },
      { status: 504 },
    )
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : '연결 실패' },
      { status: 500 },
    )
  }
}
