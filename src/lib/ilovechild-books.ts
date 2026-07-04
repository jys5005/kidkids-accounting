// 아이사랑꿈터 전용 — 장부(계정) 3종. 각 장부마다 예산/결산/전표가 분리 저장된다.
// page_data field 를 `${field}::${book}` 로 분리해서 장부별 데이터 스코프.

export interface AccountBook { code: string; label: string }

export const ILOVECHILD_BOOKS: AccountBook[] = [
  { code: 'info-center', label: '보육정보센터' },
  { code: 'subsidy',     label: '보조금' },
  { code: 'fee',         label: '이용료' },
]

export const DEFAULT_BOOK = ILOVECHILD_BOOKS[0].code
const STORAGE_KEY = 'ilovechild-active-book'
export const BOOK_CHANGE_EVENT = 'ilovechild-book-change'

export function bookLabel(code?: string | null): string {
  return ILOVECHILD_BOOKS.find(b => b.code === code)?.label || (code ?? '')
}

export function getActiveBook(): string {
  if (typeof window === 'undefined') return DEFAULT_BOOK
  return localStorage.getItem(STORAGE_KEY) || DEFAULT_BOOK
}

export function setActiveBook(code: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, code)
  window.dispatchEvent(new CustomEvent(BOOK_CHANGE_EVENT, { detail: code }))
}

/** page_data field 를 장부별로 분리. book 없으면(어린이집 등) 원본 필드 그대로. */
export function bookField(field: string, book?: string | null): string {
  return book && ILOVECHILD_BOOKS.some(b => b.code === book) ? `${field}::${book}` : field
}
