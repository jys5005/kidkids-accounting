'use client'
import { useEffect } from 'react'
export default function Page() {
  useEffect(() => {
    window.open('https://www.nts.go.kr/nts/cm/cntnts/cntntsView.do?mi=6444&cntntsId=7880', '_blank')
  }, [])
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
      <h2 className="text-xl font-bold text-slate-700">퇴직소득세계산기</h2>
      <p className="text-slate-500 text-sm">홈택스 퇴직소득 세액계산 프로그램이 새 탭에서 열립니다.</p>
      <a href="https://www.nts.go.kr/nts/cm/cntnts/cntntsView.do?mi=6444&cntntsId=7880" target="_blank" rel="noopener noreferrer" className="px-6 py-3 text-white bg-blue-600 hover:bg-blue-700 rounded font-bold text-sm">홈택스 퇴직소득세 계산기 바로가기</a>
    </div>
  )
}
