import { NextRequest, NextResponse } from 'next/server'
import puppeteer from 'puppeteer'

/**
 * 경상북도(gbccm) 세션쿠키로 로그인된 브라우저 열기 — "세션값 로그인".
 *
 * gbccm.co.kr 은 보안프로그램(npPfs)+보안키패드로 자동로그인이 불가(2026-07-10 확인).
 * → 원장이 실제 브라우저로 로그인 후 등록한 `DCPU_SSID` 세션쿠키를 크롬에 주입해
 *   로그인된 화면을 그대로 띄운다 (재로그인 없이).
 *
 * body: { sessionCookie: string, menu?: string }
 *   sessionCookie = DCPU_SSID 값
 *   menu = 이동할 메뉴 코드 (예 'U02M02T01D000' 회계보고). 없으면 메인.
 *
 * ⚠ headful 크롬은 코드가 도는 호스트에 뜬다 — 사용자 PC(로컬 실행/에이전트)에서 돌려야
 *   사용자 화면에 보임. VPS(headless)에서는 화면 안 보임(headless=true 반환).
 */

const IS_WINDOWS = require('os').platform() === 'win32'
const GBCCM_BASE = 'https://www.gbccm.co.kr'

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

    const target = menu
      ? `${GBCCM_BASE}/ccmc_2040.act?m=${encodeURIComponent(menu)}`
      : GBCCM_BASE

    const baseDir = process.env.LOCALAPPDATA
      ? `${process.env.LOCALAPPDATA}\\PuppeteerAutoLogin`
      : './.puppeteer-userdata'

    const headless = !IS_WINDOWS
    const browser = await puppeteer.launch({
      headless,
      defaultViewport: null,
      executablePath: process.env.CHROME_PATH || undefined,
      userDataDir: `${baseDir}\\gbccm`,
      args: [
        '--start-maximized', '--no-sandbox', '--disable-notifications',
        '--disable-popup-blocking', '--ignore-certificate-errors',
        '--allow-running-insecure-content', '--allow-insecure-localhost',
      ],
    })

    const page = await browser.newPage()
    page.on('dialog', async (d) => { try { await d.dismiss() } catch { /* ignore */ } })

    // DCPU_SSID 세션쿠키 주입 → 로그인 상태로 진입
    await page.setCookie({
      name: 'DCPU_SSID',
      value: cookie,
      domain: 'www.gbccm.co.kr',
      path: '/',
      secure: true,
    })

    await page.goto(target, { waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {})

    // 로그인 여부 간이 판정 (로그인 페이지로 튕겼는지)
    const url = page.url()
    const bouncedToLogin = /login|Login|LOGIN/.test(url)

    // 브라우저는 닫지 않음 — 사용자가 로그인된 화면을 그대로 사용
    return NextResponse.json({
      success: true,
      headless,
      bouncedToLogin,
      currentUrl: url,
      message: headless
        ? '브라우저를 열었지만 서버(headless)라 화면이 안 보입니다. 로컬 PC에서 실행하세요.'
        : bouncedToLogin
          ? '세션이 만료된 것 같습니다. gbccm.co.kr 재로그인 후 새 DCPU_SSID 등록하세요.'
          : '로그인된 gbccm 화면을 열었습니다.',
    })
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : '브라우저 실행 실패' },
      { status: 500 },
    )
  }
}
