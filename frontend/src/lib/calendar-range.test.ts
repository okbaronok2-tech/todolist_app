// T-F07 완료 조건 (BR-35, PRD 4.2 이동)
import { describe, expect, it } from 'vitest';
import { monthCells, move, range } from './calendar-range';
import { addDays, todayLocal, weekdayIndex } from './date';

describe('range (BR-35)', () => {
  it('week 2026-11-03 → 11-02 ~ 11-08', () => {
    expect(range('week', '2026-11-03')).toEqual({ from: '2026-11-02', to: '2026-11-08' });
  });
  it('month 2026-11-03 → 10-26 ~ 12-06, 42칸', () => {
    expect(range('month', '2026-11-03')).toEqual({ from: '2026-10-26', to: '2026-12-06' });
    expect(monthCells('2026-11-03')).toHaveLength(42);
  });
  it('day 2026-11-03 → 당일', () => {
    expect(range('day', '2026-11-03')).toEqual({ from: '2026-11-03', to: '2026-11-03' });
  });
  it('월요일 시작: 일요일 2026-11-01의 주는 10-26 ~ 11-01', () => {
    expect(range('week', '2026-11-01')).toEqual({ from: '2026-10-26', to: '2026-11-01' });
  });
  it('2026-02는 35칸(01-26 ~ 03-01), 2027-02는 28칸(02-01 월요일 ~ 02-28 일요일)', () => {
    expect(monthCells('2026-02-10')).toHaveLength(35);
    expect(monthCells('2027-02-10')).toHaveLength(28); // 2027-02-01 월요일, 02-28 일요일
  });
});

describe('move (PRD 4.2)', () => {
  it('month +1 → 2026-12-01, 그 월 뷰 범위 11-30 ~ 2027-01-03', () => {
    const next = move('month', '2026-11-03', 1);
    expect(next).toBe('2026-12-01');
    expect(range('month', next)).toEqual({ from: '2026-11-30', to: '2027-01-03' });
  });
  it('month -1 → 2026-10-01, week +1 → 11-10, day -1 → 11-02', () => {
    expect(move('month', '2026-11-03', -1)).toBe('2026-10-01');
    expect(move('week', '2026-11-03', 1)).toBe('2026-11-10');
    expect(move('day', '2026-11-03', -1)).toBe('2026-11-02');
  });
});

describe('date', () => {
  it('addDays, weekdayIndex, todayLocal 형식', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
    expect(weekdayIndex('2026-11-02')).toBe(0);
    expect(weekdayIndex('2026-11-01')).toBe(6);
    expect(todayLocal()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
