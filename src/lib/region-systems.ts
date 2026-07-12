// 지역형(정부/지자체 운영) 회계시스템 목록 — data-migration 의 SOURCE_OPTIONS 값과 동일 코드 사용.
// incheon/gbccm/gyeonggi 는 실제 구현됨(데이터이관·전표수정 가능), 나머지는 설정 항목만 미리 열어둔
// 상태(아직 실제 연동 없음). Header.tsx(기본정보 모달)·settings/page.tsx 양쪽에서 이 파일을 공유한다.
export interface RegionSystemOption {
  value: string
  label: string
}

// ⚠ 2026-07-13: 라벨을 "-형" 표기로 통일(사용자 지정, 헤더 알약배지에 "서울형"/"경기형" 식으로 노출).
export const REGION_SYSTEMS: RegionSystemOption[] = [
  { value: 'seoul', label: '서울형' },
  { value: 'gyeonggi', label: '경기형' },
  { value: 'incheon', label: '인천형' },
  { value: 'wonju', label: '원주형' },
  { value: 'daejeon', label: '대전형' },
  { value: 'daegu', label: '대구형' },
  { value: 'gbccm', label: '경북형' },
  { value: 'jeonbuk', label: '전북형' },
  { value: 'chungnam_nh', label: '충남형(농협)' },
  { value: 'chungnam_hana', label: '충남형(하나은행)' },
]
