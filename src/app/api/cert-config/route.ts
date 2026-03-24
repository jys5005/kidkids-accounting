import { NextResponse } from 'next/server'

const PLATFORM_URL = process.env.NEXT_PUBLIC_PLATFORM_URL || 'http://localhost:3000'

/** GET: 통합e에서 인증서 설정(파일 경로) 가져오기 */
export async function GET() {
  try {
    const res = await fetch(`${PLATFORM_URL}/api/settings/cert-save`)
    const json = await res.json()
    // cert-save API는 { success, data: { signCert, signPri, signPw, ... } } 구조
    const d = json.data || json
    return NextResponse.json({
      signCert: d.signCert || '',
      signPri: d.signPri || '',
      signPw: d.signPw || '',
      certName: d.certName || '',
    })
  } catch {
    return NextResponse.json({ signCert: '', signPri: '', error: '통합e 서버에 연결할 수 없습니다.' }, { status: 502 })
  }
}
