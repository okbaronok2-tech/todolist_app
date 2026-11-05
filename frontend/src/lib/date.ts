// 날짜 유틸 (T-F07, PR-05). 입출력은 전부 YYYY-MM-DD 문자열. Date는 이 파일 안에서만, UTC 고정.
const pad = (n: number) => String(n).padStart(2, '0');

function toUtc(date: string): Date {
  return new Date(`${date}T00:00:00Z`);
}

function fromUtc(d: Date): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

// 클라이언트 로컬 날짜 (D-05). 유일하게 로컬 시간대를 쓰는 곳
export function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function addDays(date: string, n: number): string {
  const d = toUtc(date);
  d.setUTCDate(d.getUTCDate() + n);
  return fromUtc(d);
}

// 0 = 월요일 … 6 = 일요일 (D-13 주 시작 월요일)
export function weekdayIndex(date: string): number {
  return (toUtc(date).getUTCDay() + 6) % 7;
}

export const WEEKDAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'] as const;

export function weekdayLabel(date: string): string {
  return WEEKDAY_LABELS[weekdayIndex(date)];
}

export function firstOfMonth(date: string): string {
  return `${date.slice(0, 7)}-01`;
}

export function lastOfMonth(date: string): string {
  const d = toUtc(firstOfMonth(date));
  d.setUTCMonth(d.getUTCMonth() + 1);
  d.setUTCDate(0);
  return fromUtc(d);
}

export function addMonths(date: string, n: number): string {
  const d = toUtc(firstOfMonth(date));
  d.setUTCMonth(d.getUTCMonth() + n);
  return fromUtc(d);
}

export const sameMonth = (a: string, b: string) => a.slice(0, 7) === b.slice(0, 7);
export const mmdd = (date: string) => date.slice(5);
export const yyyymm = (date: string) => date.slice(0, 7);

// 문자열 비교로 충분 (YYYY-MM-DD)
export const isBefore = (a: string, b: string) => a < b;
export const isAfter = (a: string, b: string) => a > b;
export const inRange = (date: string, from: string, to: string) => from <= date && date <= to;

export function daysBetween(from: string, to: string): number {
  return Math.round((toUtc(to).getTime() - toUtc(from).getTime()) / 86400000);
}

export function eachDay(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}
