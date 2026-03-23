// 계정과목 공통 데이터 (전체 페이지에서 공유)

export interface AccItem { value: string; label: string; isSub?: boolean }

export const incomeAccounts: AccItem[] = [
  { value: '정부지원 보육료', label: '정부지원 보육료' },
  { value: '부모부담 보육료', label: '부모부담 보육료' },
  { value: '특별활동비', label: '특별활동비' },
  { value: '기타 필요경비', label: '기타 필요경비' },
  { value: '세목:입학준비금', label: '입학준비금', isSub: true },
  { value: '세목:현장학습비', label: '현장학습비', isSub: true },
  { value: '세목:차량운행비', label: '차량운행비', isSub: true },
  { value: '세목:부모부담행사비', label: '부모부담행사비', isSub: true },
  { value: '세목:조석식비', label: '아침,저녁급식비', isSub: true },
  { value: '필:특성화비', label: '기타시도특성화비', isSub: true },
  { value: '인건비 보조금', label: '인건비 보조금' },
  { value: '기관보육료', label: '기관보육료' },
  { value: '연장보육료', label: '연장보육료' },
  { value: '공공형 운영비', label: '공공형 운영비' },
  { value: '그 밖의 지원금', label: '그 밖의 지원금' },
  { value: '자본보조금', label: '자본보조금' },
  { value: '전입금', label: '전입금' },
  { value: '단기차입금', label: '단기차입금' },
  { value: '장기차입금', label: '장기차입금' },
  { value: '지정후원금', label: '지정후원금' },
  { value: '비지정후원금', label: '비지정후원금' },
  { value: '적립금 처분 수입', label: '적립금 처분 수입' },
  { value: '과년도 수입', label: '과년도 수입' },
  { value: '이자수입', label: '이자수입' },
  { value: '그 밖의 잡수입', label: '그 밖의 잡수입' },
  { value: '전년도 이월금', label: '전년도 이월금' },
  { value: '전년도 이월사업비', label: '전년도 이월사업비' },
]

export const expenseAccounts: AccItem[] = [
  { value: '원장급여', label: '원장급여' },
  { value: '원장수당', label: '원장수당' },
  { value: '보육교직원급여', label: '보육교직원급여' },
  { value: '보육교직원수당', label: '보육교직원수당' },
  { value: '기타 인건비', label: '기타 인건비' },
  { value: '법정부담금', label: '법정부담금' },
  { value: '퇴직금 및 퇴직적립금', label: '퇴직금 및 퇴직적립금' },
  { value: '세목:퇴직금', label: '퇴직금', isSub: true },
  { value: '세목:퇴직적립금', label: '퇴직적립금', isSub: true },
  { value: '수용비 및 수수료', label: '수용비 및 수수료' },
  { value: '공공요금 및 제세공과금', label: '공공요금 및 제세공과금' },
  { value: '연료비', label: '연료비' },
  { value: '여비', label: '여비' },
  { value: '차량비', label: '차량비' },
  { value: '복리후생비', label: '복리후생비' },
  { value: '기타 운영비', label: '기타 운영비' },
  { value: '세목:임대료', label: '임대료', isSub: true },
  { value: '세목:건물융자금의이자', label: '건물융자금의이자', isSub: true },
  { value: '업무추진비', label: '업무추진비' },
  { value: '직책급', label: '직책급' },
  { value: '회의비', label: '회의비' },
  { value: '교직원연수·연구비', label: '교직원연수·연구비' },
  { value: '교재·교구 구입비', label: '교재·교구 구입비' },
  { value: '행사비', label: '행사비' },
  { value: '영유아복리비', label: '영유아복리비' },
  { value: '급식·간식재료비', label: '급식·간식재료비' },
  { value: '특별활동비지출', label: '특별활동비지출' },
  { value: '기타 필요경비 지출', label: '기타 필요경비 지출' },
  { value: '세목:입학준비금(지출)', label: '입학준비금', isSub: true },
  { value: '세목:현장학습비(지출)', label: '현장학습비', isSub: true },
  { value: '세목:차량운행비(지출)', label: '차량운행비', isSub: true },
  { value: '세목:부모부담행사비(지출)', label: '부모부담행사비', isSub: true },
  { value: '세목:조석식비(지출)', label: '아침,저녁급식비', isSub: true },
  { value: '필:특성화비(지출)', label: '기타시도특성화비', isSub: true },
  { value: '적립금', label: '적립금' },
  { value: '단기 차입금 상환', label: '단기 차입금 상환' },
  { value: '장기 차입금 상환', label: '장기 차입금 상환' },
  { value: '보조금 반환금', label: '보조금 반환금' },
  { value: '보호자 반환금', label: '보호자 반환금' },
  { value: '법인회계 전출금', label: '법인회계 전출금' },
  { value: '시설비', label: '시설비' },
  { value: '시설장비 유지비', label: '시설장비 유지비' },
  { value: '자산취득비', label: '자산취득비' },
  { value: '세목:차량할부금', label: '차량할부금', isSub: true },
  { value: '세목:자산취득비(세목)', label: '자산취득비', isSub: true },
  { value: '과년도 지출', label: '과년도 지출' },
  { value: '잡지출', label: '잡지출' },
  { value: '예비비', label: '예비비' },
]

// 계정과목 → 코드 매핑 (목 4자리)
export const accountCodeMap: Record<string, string> = {
  '정부지원 보육료': '1111', '부모부담 보육료': '1112', '특별활동비': '1211', '기타 필요경비': '1221',
  '인건비 보조금': '1311', '기관보육료': '1321', '연장보육료': '1322', '공공형 운영비': '1323',
  '그 밖의 지원금': '1324', '자본보조금': '1331', '전입금': '1411', '단기차입금': '1421',
  '장기차입금': '1422', '지정후원금': '1511', '비지정후원금': '1512', '적립금 처분 수입': '1611',
  '과년도 수입': '1711', '이자수입': '1811', '그 밖의 잡수입': '1812', '전년도 이월금': '1911',
  '전년도 이월사업비': '1912',
  '원장급여': '2111', '원장수당': '2112', '보육교직원급여': '2121', '보육교직원수당': '2122',
  '기타 인건비': '2131', '법정부담금': '2141', '퇴직금 및 퇴직적립금': '2142',
  '수용비 및 수수료': '2211', '공공요금 및 제세공과금': '2212', '연료비': '2213', '여비': '2214',
  '차량비': '2215', '복리후생비': '2216', '기타 운영비': '2217', '업무추진비': '2221',
  '직책급': '2222', '회의비': '2223', '교직원연수·연구비': '2311', '교재·교구 구입비': '2312',
  '행사비': '2313', '영유아복리비': '2314', '급식·간식재료비': '2315', '특별활동비지출': '2411',
  '기타 필요경비 지출': '2421', '적립금': '2511', '단기 차입금 상환': '2611',
  '장기 차입금 상환': '2612', '보조금 반환금': '2621', '보호자 반환금': '2622',
  '법인회계 전출금': '2623', '시설비': '2711', '시설장비 유지비': '2712', '자산취득비': '2721',
  '과년도 지출': '2811', '잡지출': '2911', '예비비': '2991',
}

// 세목 → 5자리 코드
export const subAccountCodeMap: Record<string, string> = {
  '입학준비금': '1221111', '현장학습비': '1221112', '차량운행비': '1221113',
  '부모부담행사비': '1221121', '아침,저녁급식비': '1221131', '기타시도특성화비': '1221141',
  '조석식비': '1221131', '특성화비': '1221141',
  '퇴직금': '2142112', '퇴직적립금': '2142121',
  '임대료': '2217111', '건물융자금의이자': '2217121',
  '입학준비금(지출)': '2421111', '현장학습비(지출)': '2421121', '차량운행비(지출)': '2421131',
  '부모부담행사비(지출)': '2421141', '아침,저녁급식비(지출)': '2421151', '기타시도특성화비(지출)': '2421161',
  '조석식비(지출)': '2421151', '특성화비(지출)': '2421161',
  '차량할부금': '2721001', '자산취득비': '2721002',
}

// 코드 → 계정과목 역매핑
export const codeToAccount: Record<string, { account: string; subAccount: string }> = {}
Object.entries(accountCodeMap).forEach(([name, code]) => {
  codeToAccount[code] = { account: name, subAccount: '' }
})
Object.entries(subAccountCodeMap).forEach(([name, code]) => {
  const parentCode = code.substring(0, 4)
  const parentName = Object.entries(accountCodeMap).find(([, c]) => c === parentCode)?.[0] || ''
  codeToAccount[code] = { account: parentName, subAccount: name }
})

// 외부 시스템 계정명 → 목/세목 치환 매핑
// 키즈키즈 등에서 들어오는 계정명을 목+세목으로 분리
export const accountAliasMap: Record<string, { account: string; subAccount: string }> = {
  // 기타 필요경비 (수입) 세목
  '입학준비금': { account: '기타 필요경비', subAccount: '입학준비금' },
  '현장학습비': { account: '기타 필요경비', subAccount: '현장학습비' },
  '차량운행비': { account: '기타 필요경비', subAccount: '차량운행비' },
  '부모부담행사비': { account: '기타 필요경비', subAccount: '부모부담행사비' },
  '조석식비': { account: '기타 필요경비', subAccount: '아침,저녁급식비' },
  '기타시도특성화비': { account: '기타 필요경비', subAccount: '기타시도특성화비' },
  // 기타 필요경비 지출 세목
  '입학준비금지출': { account: '기타 필요경비 지출', subAccount: '입학준비금(지출)' },
  '현장학습비지출': { account: '기타 필요경비 지출', subAccount: '현장학습비(지출)' },
  '차량운행비지출': { account: '기타 필요경비 지출', subAccount: '차량운행비(지출)' },
  '부모부담행사비지출': { account: '기타 필요경비 지출', subAccount: '부모부담행사비(지출)' },
  '조석식비지출': { account: '기타 필요경비 지출', subAccount: '아침,저녁급식비(지출)' },
  '기타시도특성화비지출': { account: '기타 필요경비 지출', subAccount: '기타시도특성화비(지출)' },
  // 퇴직금 및 퇴직적립금 세목
  '퇴직금': { account: '퇴직금 및 퇴직적립금', subAccount: '퇴직금' },
  '퇴직적립금': { account: '퇴직금 및 퇴직적립금', subAccount: '퇴직적립금' },
  // 기타 운영비 세목
  '임대료': { account: '기타 운영비', subAccount: '임대료' },
  '건물융자금의이자': { account: '기타 운영비', subAccount: '건물융자금의이자' },
  // 자산취득비 세목
  '차량할부금': { account: '자산취득비', subAccount: '차량할부금' },
}

// 계정명 치환: 외부 계정명이 aliasMap에 있으면 목/세목 분리, 없으면 원본 반환
export function resolveAccount(name: string): { account: string; subAccount: string } {
  if (accountAliasMap[name]) return accountAliasMap[name]
  return { account: name, subAccount: '' }
}

// 계정과목명으로 수입/지출 판별
export function isIncomeAccount(account: string): boolean {
  return incomeAccounts.some(a => a.value === account || a.label === account)
}

// 전체 계정 목록 (수입+지출, 목만)
export const allAccounts = [
  ...incomeAccounts.filter(a => !a.isSub),
  ...expenseAccounts.filter(a => !a.isSub),
]
