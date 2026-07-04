// 걸음마(gwin.co.kr)에서 가져온 실제 계정과목 — 장부(book)별.
// 회계계정관리에서 저장본이 없으면 이 계정과목을 기본으로 표시 → [저장]만 누르면 반영.
// 꿈터(subsidy)/이용료(fee)는 HAR 받는 대로 추가.
import infoCenter from './gwin-info-center.json'
import subsidy from './gwin-subsidy.json'   // 꿈터
import fee from './gwin-fee.json'            // 이용료

// ⚠ 현재 3개 HAR 계정과목이 완전히 동일 — 표준 계정과목 공유이거나 캡처 시 장부 미전환.
//   장부마다 실제로 다르면 해당 장부 HAR 재캡처 후 이 JSON 교체.
export const GWIN_CHARTS: Record<string, unknown[]> = {
  'info-center': infoCenter as unknown[],
  'subsidy': subsidy as unknown[],
  'fee': fee as unknown[],
}
