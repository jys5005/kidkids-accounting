// 데이터이관 페이지는 배포 직후 바로 반영돼야 함 — 정적 프리렌더 캐시(s-maxage=1y) 금지.
// force-dynamic 이면 HTML 이 매 요청 렌더(no-store) → 옛 청크 참조가 브라우저에 눌러붙는 문제 제거.
export const dynamic = 'force-dynamic'

export default function DataMigrationLayout({ children }: { children: React.ReactNode }) {
  return children
}
