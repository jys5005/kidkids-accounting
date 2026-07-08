// 영수증 OCR + 어린이집 계정과목 자동분류 (서버 전용)
// 엔진 전환: RECEIPT_OCR_ENGINE=claude(기본) | clova | tesseract
//   - claude    : ANTHROPIC_API_KEY 재사용 (바로 동작, 유료)
//   - clova     : CLOVA_OCR_URL / CLOVA_OCR_SECRET (네이버클라우드 영수증 도메인, 유료)
//   - tesseract : 완전 무료 오픈소스(tesseract.js) — 상호/날짜/총액은 정규식 휴리스틱 파싱이라
//                 claude/clova 대비 정확도 낮음(특히 흐릿한 사진·손글씨). 품목(items)은 시도만 함.

export interface ReceiptItem { name: string; price: number }
export interface ReceiptResult {
  store: string
  date: string // YYYY-MM-DD (가능 시)
  total: number
  items: ReceiptItem[]
  account: string // VoucherRow.account (예: 운영비)
  subAccount: string // 세목 (예: 급간식비)
}

// 상호/품목 키워드 → 운영비 세목 (voucher/input 의 subAccountMap['운영비'] 기준)
const RULES: { sub: string; kw: string[] }[] = [
  { sub: '급간식비', kw: ['이마트', '홈플러스', '롯데마트', '코스트코', '하나로', '농협', '식자재', '정육', '청과', '수산', '베이커리', '제과', '우유', '급식', '간식', '푸드', '마트', '슈퍼'] },
  { sub: '차량유지비', kw: ['주유', '칼텍스', '에너지', 'S-OIL', '에쓰오일', '오일뱅크', '충전소', '현대오일', '지에스칼텍스'] },
  { sub: '공공요금', kw: ['한국전력', '한전', '전기', '도시가스', '수도', 'KT', 'SKT', 'SK텔레콤', 'LG유플러스', 'U+', '통신', '인터넷'] },
  { sub: '소모품비', kw: ['다이소', '문구', '알파', '오피스', '철물', '생활용품', '청소', '위생', '건전지', '휴지', '세제', '완구', '교구', '교재'] },
  { sub: '수용비', kw: ['약국', '병원', '의원', '인쇄', '출력', '복사', '우체국', '택배'] },
]

/** 상호 + 품목명으로 계정과목(운영비/세목) 추정. 못 찾으면 세목 빈값(원장 직접 선택). */
export function classifyReceipt(store = '', items: ReceiptItem[] = []): { account: string; subAccount: string } {
  const hay = (store + ' ' + items.map(i => i.name).join(' ')).replace(/\s+/g, '')
  for (const r of RULES) {
    if (r.kw.some(k => hay.includes(k.replace(/\s+/g, '')))) return { account: '운영비', subAccount: r.sub }
  }
  return { account: '운영비', subAccount: '' }
}

const onlyNum = (v: unknown): number => Number(String(v ?? '').replace(/[^0-9]/g, '')) || 0

async function ocrClaude(base64: string, mediaType: string): Promise<Omit<ReceiptResult, 'account' | 'subAccount'>> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY 미설정')
  const body = {
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
        {
          type: 'text',
          text: `이 이미지는 한국 영수증입니다. 아래 항목을 JSON만으로 응답하세요(설명·코드블록 금지).
- store: 상호명(가게 이름)
- date: 결제일자 YYYY-MM-DD (없으면 "")
- total: 총 결제금액 숫자만 (콤마 없이)
- items: 품목 배열 [{"name":"품명","price":금액숫자}] 최대 20개 (없으면 [])
형식: {"store":"","date":"","total":0,"items":[]}`,
        },
      ],
    }],
  }
  // 5xx(게이트웨이/일시 오류)는 최대 3회 재시도
  let res: Response | null = null
  for (let attempt = 0; attempt < 3; attempt++) {
    res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify(body),
    })
    if (res.ok || res.status < 500 || attempt === 2) break
    await new Promise(r => setTimeout(r, 800 * (attempt + 1)))
  }
  if (!res || !res.ok) {
    const status = res?.status ?? 0
    throw new Error(`Claude API 오류 ${status}${status >= 500 ? ' (일시 오류 — 사진을 더 작게 하거나 잠시 후 재시도)' : ''}`)
  }
  const data = await res.json()
  const text = data?.content?.[0]?.type === 'text' ? data.content[0].text : ''
  const m = text.match(/\{[\s\S]*\}/)
  const parsed = JSON.parse(m ? m[0] : text)
  return {
    store: String(parsed.store || ''),
    date: String(parsed.date || ''),
    total: onlyNum(parsed.total),
    items: Array.isArray(parsed.items)
      ? parsed.items.slice(0, 20).map((it: { name?: unknown; price?: unknown }) => ({ name: String(it?.name || ''), price: onlyNum(it?.price) }))
      : [],
  }
}

async function ocrClova(base64: string, format: string): Promise<Omit<ReceiptResult, 'account' | 'subAccount'>> {
  const url = process.env.CLOVA_OCR_URL, secret = process.env.CLOVA_OCR_SECRET
  if (!url || !secret) throw new Error('CLOVA_OCR_URL / CLOVA_OCR_SECRET 미설정 — 네이버클라우드에서 영수증 도메인 생성 후 설정하세요')
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'X-OCR-SECRET': secret },
    body: JSON.stringify({ version: 'V2', requestId: 'r' + Date.now(), timestamp: Date.now(), images: [{ format, name: 'receipt', data: base64 }] }),
  })
  if (!res.ok) throw new Error(`CLOVA 오류 ${res.status}: ${(await res.text()).slice(0, 300)}`)
  const data = await res.json()
  const r = data?.images?.[0]?.receipt?.result
  return {
    store: r?.storeInfo?.name?.text || '',
    date: r?.paymentInfo?.date?.text || '',
    total: onlyNum(r?.totalPrice?.price?.text),
    items: (r?.subResults?.[0]?.items || []).map((it: { name?: { text?: string }; price?: { price?: { text?: string } } }) => ({
      name: it?.name?.text || '', price: onlyNum(it?.price?.price?.text),
    })),
  }
}

// ── Tesseract(무료, 오픈소스) — raw text 뽑아서 정규식으로 상호/날짜/총액 추출 ──
const DATE_PATTERNS = [
  /(20\d{2})[.\-/년]\s?(\d{1,2})[.\-/월]\s?(\d{1,2})/, // 2026-07-08 / 2026.07.08 / 2026년 07월 08일
  /(\d{2})[.\-/](\d{1,2})[.\-/](\d{1,2})/,               // 26-07-08
]

function extractDate(text: string): string {
  for (const re of DATE_PATTERNS) {
    const m = text.match(re)
    if (!m) continue
    let y = m[1]
    if (y.length === 2) y = (Number(y) >= 70 ? '19' : '20') + y
    const mm = String(m[2]).padStart(2, '0')
    const dd = String(m[3]).padStart(2, '0')
    if (Number(mm) >= 1 && Number(mm) <= 12 && Number(dd) >= 1 && Number(dd) <= 31) return `${y}-${mm}-${dd}`
  }
  return ''
}

const TOTAL_KEYWORDS = ['합계금액', '총결제금액', '결제금액', '판매금액', '받을금액', '카드승인금액', '승인금액', '총액', '합계']

function extractTotal(lines: string[]): number {
  for (const kw of TOTAL_KEYWORDS) {
    for (const line of lines) {
      if (!line.includes(kw)) continue
      const n = onlyNum(line)
      if (n > 0) return n
    }
  }
  // 키워드 매칭 실패 시 — 본문 전체에서 가장 큰 금액을 총액으로 추정(휴리스틱)
  let max = 0
  for (const line of lines) {
    const n = onlyNum(line)
    if (n > max) max = n
  }
  return max
}

function extractStore(lines: string[]): string {
  for (const line of lines) {
    const clean = line.replace(/\s+/g, '')
    if (clean.length < 2) continue
    if (/^\d[\d.\-/]*$/.test(clean)) continue // 날짜/숫자만 있는 줄 스킵
    if (/사업자|등록번호|대표자|전화|TEL|영수증/.test(clean)) continue
    return line.trim()
  }
  return ''
}

async function ocrTesseract(base64: string): Promise<Omit<ReceiptResult, 'account' | 'subAccount'>> {
  const Tesseract = await import('tesseract.js')
  const buf = Buffer.from(base64, 'base64')
  const { data } = await Tesseract.recognize(buf, 'kor+eng')
  const text: string = data?.text || ''
  const lines = text.split('\n').map((l: string) => l.trim()).filter(Boolean)
  return {
    store: extractStore(lines),
    date: extractDate(text),
    total: extractTotal(lines),
    items: [], // 품목별 라인 파싱은 정확도가 낮아 생략(총액/상호 기반 세목 분류만 사용)
  }
}

/** 영수증 이미지 → OCR + 계정과목 자동분류 */
export async function ocrReceipt(base64: string, mediaType: string, format: string): Promise<ReceiptResult> {
  const engine = (process.env.RECEIPT_OCR_ENGINE || 'claude').toLowerCase()
  const r = engine === 'clova' ? await ocrClova(base64, format)
    : engine === 'tesseract' ? await ocrTesseract(base64)
    : await ocrClaude(base64, mediaType)
  const cls = classifyReceipt(r.store, r.items)
  return { ...r, ...cls }
}
