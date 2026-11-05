// T-F08·T-F09 완료 조건: 월 42칸, today 강조, 이웃 달, 막대 배치, 주·일 뷰 내용
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import { MonthView } from './MonthView';
import { WeekView } from './WeekView';
import { DayView } from './DayView';
import type { Todo } from '../../types/todo';

const t = (id: number, title: string, startDate: string, endDate: string, status: Todo['status'], categoryId = 4): Todo => ({
  id, categoryId, title, description: null, startDate, endDate, isCompleted: status === 'COMPLETED', completedAt: null, status, createdAt: '', updatedAt: '',
});
// 서버 기본 정렬 순서 (endDate, startDate, createdAt): 6, 1, 2, 5, 4, 3, 7. 프론트는 재정렬하지 않는다
const SEED: Todo[] = [
  t(6, '헬스장 등록', '2026-10-26', '2026-11-01', 'OVERDUE', 3),
  t(1, '주간 보고서 제출', '2026-11-01', '2026-11-02', 'COMPLETED'),
  t(2, '거래처 견적 회신', '2026-11-01', '2026-11-02', 'OVERDUE'),
  t(5, '분기 계획 작성', '2026-10-31', '2026-11-03', 'IN_PROGRESS'),
  t(4, '은행 서류 제출', '2026-11-03', '2026-11-03', 'IN_PROGRESS', 5),
  t(3, '팀 회의 자료 준비', '2026-11-04', '2026-11-05', 'NOT_STARTED'),
  t(7, '가족 여행 준비', '2026-11-08', '2026-11-10', 'NOT_STARTED', 5),
];
const TODAY = '2026-11-03';

describe('MonthView (US-13)', () => {
  it('42칸, 10-26 시작 12-06 끝, today·이웃 달 표시', () => {
    const { container } = render(<MonthView anchorDate={TODAY} today={TODAY} todos={SEED} onSelect={() => {}} />);
    const cells = container.querySelectorAll('.cal__cell');
    expect(cells).toHaveLength(42);
    expect(cells[0].getAttribute('data-date')).toBe('2026-10-26');
    expect(cells[41].getAttribute('data-date')).toBe('2026-12-06');
    expect(container.querySelector('.cal__cell--today')?.getAttribute('data-date')).toBe(TODAY);
    expect(container.querySelectorAll('.cal__cell--other-month')).toHaveLength(12); // 10-26~31 (6) + 12-01~06 (6)
  });
  it('막대: 1행 4개(6 전체 폭), 2행 6개, 3행 1개, 완료는 완 배지, 클릭 시 onSelect', () => {
    const onSelect = vi.fn();
    const { container } = render(<MonthView anchorDate={TODAY} today={TODAY} todos={SEED} onSelect={onSelect} />);
    const rows = container.querySelectorAll('.cal__row');
    const barsIn = (r: Element) => [...r.querySelectorAll('.cal__bar')];
    expect(barsIn(rows[0])).toHaveLength(4);
    expect(barsIn(rows[1])).toHaveLength(6);
    expect(barsIn(rows[2])).toHaveLength(1);
    expect(barsIn(rows[3])).toHaveLength(0);
    const six = barsIn(rows[0]).find((b) => b.textContent?.includes('헬스장 등록')) as HTMLElement;
    expect(six.style.gridColumn).toBe('1 / span 7');
    expect(barsIn(rows[1]).find((b) => b.textContent?.includes('주간 보고서'))?.querySelector('.badge')?.textContent).toBe('완');
    fireEvent.click(six);
    expect(onSelect).toHaveBeenCalledWith(SEED[0]);
  });
  it('모바일 점: 11-01 칸 4개, 11-02 칸 3개 (BR-33)', () => {
    const { container } = render(<MonthView anchorDate={TODAY} today={TODAY} todos={SEED} onSelect={() => {}} />);
    const dots = (d: string) => container.querySelector(`[data-date="${d}"] .cal__dots`)!.querySelectorAll('.cal__dot').length;
    expect(dots('2026-11-01')).toBe(4);
    expect(dots('2026-11-02')).toBe(3);
    expect(dots('2026-10-27')).toBe(1);
    expect(dots('2026-11-06')).toBe(0);
  });
});

describe('WeekView (US-14)', () => {
  it('11-02~11-08: 칸별 목록과 막대, 6 없음', () => {
    const { container } = render(<WeekView from="2026-11-02" to="2026-11-08" today={TODAY} todos={SEED} onSelect={() => {}} />);
    const titles = (d: string) => [...container.querySelectorAll(`[data-date="${d}"] .cal__list .cal__bar-title`)].map((e) => e.textContent);
    expect(titles('2026-11-02')).toEqual(['주간 보고서 제출', '거래처 견적 회신', '분기 계획 작성']);
    expect(titles('2026-11-03')).toEqual(['분기 계획 작성', '은행 서류 제출']);
    expect(titles('2026-11-04')).toEqual(['팀 회의 자료 준비']);
    expect(titles('2026-11-06')).toEqual([]);
    expect(titles('2026-11-08')).toEqual(['가족 여행 준비']);
    expect(container.textContent).not.toContain('헬스장 등록');
    expect(container.querySelectorAll('.cal__bars .cal__bar')).toHaveLength(6);
  });
  it('11-09~11-15: 가족 여행 준비가 11-09·11-10', () => {
    const { container } = render(<WeekView from="2026-11-09" to="2026-11-15" today={TODAY} todos={SEED} onSelect={() => {}} />);
    const bar = container.querySelector('.cal__bars .cal__bar') as HTMLElement;
    expect(bar.style.gridColumn).toBe('1 / span 2');
    expect(bar.textContent).toContain('가족 여행 준비');
  });
});

describe('DayView (US-15)', () => {
  const name = (id: number) => ({ 3: '기본', 4: '업무', 5: '개인' })[id] ?? '';
  it('11-03: 분기 계획 작성(‹, 업무), 은행 서류 제출(개인), 전체 배지', () => {
    const { container } = render(<DayView date="2026-11-03" today={TODAY} todos={SEED} categoryName={name} onSelect={() => {}} />);
    const bars = [...container.querySelectorAll('.cal__bar')];
    expect(bars.map((b) => b.querySelector('.cal__bar-title')?.textContent)).toEqual(['분기 계획 작성', '은행 서류 제출']);
    expect(bars[0].textContent).toContain('‹');
    expect(bars[0].textContent).toContain('10-31~11-03 업무');
    expect(bars[1].textContent).toContain('11-03~11-03 개인');
    expect(bars[0].querySelector('.badge')?.textContent).toBe('진행중');
  });
  it('11-02: 1, 2, 5. 11-04: 3. 11-06: 없음', () => {
    const titles = (d: string) => [...render(<DayView date={d} today={TODAY} todos={SEED} categoryName={name} onSelect={() => {}} />).container.querySelectorAll('.cal__bar-title')].map((e) => e.textContent);
    expect(titles('2026-11-02')).toEqual(['주간 보고서 제출', '거래처 견적 회신', '분기 계획 작성']);
    expect(titles('2026-11-04')).toEqual(['팀 회의 자료 준비']);
    expect(titles('2026-11-06')).toEqual([]);
  });
});
