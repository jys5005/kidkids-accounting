import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { loginAndGetPage, scrapeAccounts, scrapeMenuStructure, closePage } from '@/lib/kidkids'

export const maxDuration = 120

export async function POST(request: NextRequest) {
  let page = null
  try {
    const body = await request.json()
    const { memberId: bodyId, pw: bodyPw, startDate, endDate, yearmon, debug } = body as {
      memberId?: string
      pw?: string
      startDate?: string
      endDate?: string
      yearmon?: string
      debug?: boolean
    }

    const memberId = bodyId || process.env.KIDKIDS_ID || ''
    const pw = bodyPw || process.env.KIDKIDS_PW || ''

    if (!memberId || !pw) {
      return NextResponse.json({ success: false, error: '아이디와 비밀번호를 입력하세요.' }, { status: 400 })
    }

    console.log('[kidkids] 로그인 시도:', memberId)
    page = await loginAndGetPage(memberId, pw)
    console.log('[kidkids] 로그인 성공, URL:', page.url())

    if (debug) {
      const menus = await scrapeMenuStructure(page)
      const currentUrl = page.url()
      const title = await page.title()
      await closePage(page)
      return NextResponse.json({ success: true, debug: true, currentUrl, title, menus })
    }

    console.log('[kidkids] 현금출납부 스크래핑', { startDate, endDate, yearmon })
    const result = await scrapeAccounts(page, { startDate, endDate, yearmon })
    console.log('[kidkids] 거래내역:', result.rows.length, '건')
    await closePage(page)

    return NextResponse.json({
      success: true,
      data: result.rows,
      summary: result.summary,
      count: result.rows.length,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[kidkids error]', msg)
    if (page) await closePage(page)
    return NextResponse.json({ success: false, error: msg })
  }
}
