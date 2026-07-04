// 걸음마(gwin) getBudgetList 에서 추출한 예산(B) — 장부별 { 목코드(세출은 E접두): 산출기초 items[] }.
// 산출기초 item = { name, unitPrice(단가), qty(수량), months(개월), extras[7](항목1~7), total(합계) }.
// 2026년 예산만 존재(사업 시작연도). 보육정보센터(info-center)는 걸음마에 예산 미입력 → 빈 객체.
import infoCenter from './gwin-budget-info-center.json'
import subsidy from './gwin-budget-subsidy.json'
import fee from './gwin-budget-fee.json'

export const GWIN_BUDGETS: Record<string, Record<string, unknown[]>> = {
  'info-center': infoCenter as Record<string, unknown[]>,
  'subsidy': subsidy as Record<string, unknown[]>,
  'fee': fee as Record<string, unknown[]>,
}
