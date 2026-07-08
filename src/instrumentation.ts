/**
 * Next.js instrumentation hook — 서버 프로세스 시작 시 1회 실행
 * https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 *
 * 목적: Puppeteer(sunote 등 스크래핑)·tesseract.js(영수증 OCR 워커) 같은
 *       내부 의존성에서 발생하는 지연 rejection/uncaughtException 이
 *       Next.js 프로세스를 죽여서 PM2 가 재시작 루프에 빠지는 현상 방지
 *       (childcare-platform 의 동일 패턴 이식, 2026-07-08)
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return

  process.on('unhandledRejection', (reason) => {
    const msg = reason instanceof Error ? (reason.stack || reason.message) : String(reason)
    console.error('[instrumentation] unhandledRejection 포획(프로세스 유지):', msg.slice(0, 2000))
  })

  process.on('uncaughtException', (err) => {
    console.error('[instrumentation] uncaughtException 포획(프로세스 유지):', err.stack || err.message)
  })
}
