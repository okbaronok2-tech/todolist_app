// BR-35 조회 기간, PRD 4.2 캘린더 이동 (T-F07)
import type { CalendarView } from '../types/todo';
import { addDays, addMonths, eachDay, firstOfMonth, lastOfMonth, weekdayIndex } from './date';

export interface DateRange {
  from: string;
  to: string;
}

const weekStart = (date: string) => addDays(date, -weekdayIndex(date));

export function range(view: CalendarView, anchorDate: string): DateRange {
  if (view === 'day') return { from: anchorDate, to: anchorDate };
  if (view === 'week') {
    const from = weekStart(anchorDate);
    return { from, to: addDays(from, 6) };
  }
  const from = weekStart(firstOfMonth(anchorDate));
  const last = lastOfMonth(anchorDate);
  return { from, to: addDays(weekStart(last), 6) };
}

export function move(view: CalendarView, anchorDate: string, delta: 1 | -1): string {
  if (view === 'day') return addDays(anchorDate, delta);
  if (view === 'week') return addDays(anchorDate, delta * 7);
  return addMonths(anchorDate, delta);
}

// 월 뷰 날짜 배열 (28~42칸)
export function monthCells(anchorDate: string): string[] {
  const { from, to } = range('month', anchorDate);
  return eachDay(from, to);
}

// 행(7일) 단위로 나눈다
export function chunkWeeks(days: string[]): string[][] {
  const rows: string[][] = [];
  for (let i = 0; i < days.length; i += 7) rows.push(days.slice(i, i + 7));
  return rows;
}
