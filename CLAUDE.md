# 수전자장부 - 어린이집 회계관리시스템

## 프로젝트 구조
- **프레임워크**: Next.js 16, App Router (`src/app/`)
- **스타일**: Tailwind CSS
- **언어**: TypeScript
- **포트**: 3000

## 주요 경로
- `/accounting` - 회계현황 (메인)
- `/budget/*` - 예산관리 (작성, 과목전용, 보고서, 집행현황, 보육통합예산보고)
- `/voucher/*` - 전표관리 (입력, 삭제전표, 잔액비교, 거래내역, 계좌내역, 영수증연동)
- `/cash-ledger/*` - 현금출납부 (기간별, 총계정원장, 계정과목별총괄표, 월별수입지출합계, 합계잔액시산표, 월별비교)
- `/monthly-report/*` - 월회계보고 (전표검증, 재무회계분석자료)
- `/settlement/*` - 결산관리 (결산보고서, 월별결산서, 연말결산서, 보육통합결산보고)
- `/reconciliation/*` - 정산관리 (정부보조금명세서, 보조금정산서, 누리과정정산서, 필요경비정산서, 급식비정산서)
- `/staff/*` - 교직원 (정보, 출근부, 증명서, 공문서, 급여대장, 4대보험, 연말정산)
- `/children/*` - 아동 (아동관리, 보육료납부, 출석부)
- `/supplies/*` - 물품 (물품관리)
- `/community/*` - 커뮤니티 (게시판, 자료실, 계산기)
- `/settings/*` - 설정 (결제방식, 적요코드매칭, 거래처, 4대보험요율, 보육통합인증키)
- `/data-migration` - 데이터이관

## 개발
```bash
npx next dev -p 3000
```

## Header 구조 (3단)
- **1단**: 로고(어린이집회계관리시스템/수전자장부) + 카테고리탭(회계/교직원/아동/물품/커뮤니티) + 통합e + 어린이집명(회원정보팝업) + 사용자명 + 30분타이머 + 로그아웃
- **2단 GNB**: 노란 바(`#f5b800`), 카테고리별 메뉴 박스 + 펼쳐보기/접기
- **3단**: 하위 서브탭 (hover 시 rotateY 15도 CSS transition)

## 메뉴 구조
- `src/components/Sidebar.tsx` - categories 배열 (회계/교직원/아동/물품/커뮤니티)
- `src/components/Header.tsx` - 3단 네비게이션 (categories 참조)

## 전표입력 기능키 툴바
- **전표**: 등록, 합산, 삭제, 일괄분리, 미계정전환
- **적요**: 삭제, 치환, 세목추가
- **매핑**(핑크): 원아경비, 거래처.적요.결제방식
- **정렬**(초록): 수입부우선, 전표번호, 전체
- **출력**: 엑셀, 출력, 저장
- 그룹 라벨(전표/적요/매핑/정렬)은 말풍선 아이콘 + hover 툴팁 설명

## 인증
- SSO: 통합e(localhost:4000)에서 토큰으로 세션 전달
- `/api/auth/me` - 통합e API에서 displayName, centerName 가져옴
- 30분 자동로그아웃 (마우스/키보드/터치 시 리셋)

## CSS 효과
- `sub-tab-hover`: perspective rotateY(15deg) + 흰배경 + 붉은글씨 hover
- `globals.css`에 정의

## 연동 프로젝트
- **통합e** (`C:\projects\childcare-platform`): Next.js 15, 포트 4000
- 환경변수: `NEXT_PUBLIC_PLATFORM_URL` (통합e URL)

## 컨벤션
- 커밋 메시지: 한국어, `feat:/fix:/refactor:` 접두사
- UI: Tailwind 유틸리티 클래스
