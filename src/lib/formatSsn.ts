// 주민등록번호 포맷: 숫자만 입력, 6자리 뒤 자동 하이픈, 최대 13자리
export function formatSsn(value: string): string {
  const digits = value.replace(/[^0-9]/g, '').slice(0, 13)
  if (digits.length <= 6) return digits
  return digits.slice(0, 6) + '-' + digits.slice(6)
}

export function handleSsnChange(
  e: React.ChangeEvent<HTMLInputElement>,
  setter: (val: string) => void
) {
  setter(formatSsn(e.target.value))
}
