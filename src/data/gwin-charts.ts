// 걸음마(gwin.co.kr)에서 가져온 실제 계정과목 — 장부(book)별.
// 회계계정관리에서 저장본이 없으면 이 계정과목을 기본으로 표시 → [저장]만 누르면 반영.
// 꿈터(subsidy)/이용료(fee)는 HAR 받는 대로 추가.
import infoCenter from './gwin-info-center.json'   // BOOK_GB=02 (getEmptyBudgetList)
import subsidy from './gwin-subsidy.json'          // 꿈터  BOOK_GB=03 (getBudgetList)
import fee from './gwin-fee.json'                  // 이용료 BOOK_GB=04 (getBudgetList)

// 걸음마(gwin) 3개 장부 실제 계정과목 — 각각 다름 (HAR getBudgetList 에서 추출).
export const GWIN_CHARTS: Record<string, unknown[]> = {
  'info-center': infoCenter as unknown[],
  'subsidy': subsidy as unknown[],
  'fee': fee as unknown[],
}
