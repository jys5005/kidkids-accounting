// 걸음마(gwin.co.kr)에서 가져온 실제 계정과목 — 장부(book)별.
// 회계계정관리에서 저장본이 없으면 이 계정과목을 기본으로 표시 → [저장]만 누르면 반영.
// 꿈터(subsidy)/이용료(fee)는 HAR 받는 대로 추가.
import infoCenter from './gwin-info-center.json'

// ⚠ 보육정보센터만 실제 걸음마 계정 확보(HAR).
//   보조금(꿈터)·이용료는 HAR 3개가 다 보육정보센터라 실제 데이터 없음 → 시딩 안 함(기본 관 01~09로 표시).
//   로그인 스크래퍼로 실제 데이터 받으면 그때 추가.
export const GWIN_CHARTS: Record<string, unknown[]> = {
  'info-center': infoCenter as unknown[],
}
