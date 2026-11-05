// US-13·US-14 칸 배치 (BR-33), 스타일 가이드 3.7 lane 규칙
import { describe, expect, it } from 'vitest';
import { layoutBars, todosOn } from './calendar-lanes';
import type { Todo } from '../types/todo';

const t = (id: number, startDate: string, endDate: string): Todo => ({
  id, categoryId: 3, title: `t${id}`, description: null, startDate, endDate, isCompleted: false, completedAt: null, status: 'IN_PROGRESS', createdAt: '', updatedAt: '',
});
// 시나리오 3.4 PS-02 할일 7건
const SEED = [t(1, '2026-11-01', '2026-11-02'), t(2, '2026-11-01', '2026-11-02'), t(3, '2026-11-04', '2026-11-05'), t(4, '2026-11-03', '2026-11-03'), t(5, '2026-10-31', '2026-11-03'), t(6, '2026-10-26', '2026-11-01'), t(7, '2026-11-08', '2026-11-10')];
const ids = (list: Todo[]) => list.map((x) => x.id).sort((a, b) => a - b);

describe('todosOn (BR-33, US-13·14 칸 표)', () => {
  it('주 11-02~11-08 칸별 집합', () => {
    expect(ids(todosOn(SEED, '2026-11-02'))).toEqual([1, 2, 5]);
    expect(ids(todosOn(SEED, '2026-11-03'))).toEqual([4, 5]);
    expect(ids(todosOn(SEED, '2026-11-04'))).toEqual([3]);
    expect(ids(todosOn(SEED, '2026-11-06'))).toEqual([]);
    expect(ids(todosOn(SEED, '2026-11-08'))).toEqual([7]);
  });
  it('11-01 칸 4건, 10-26~10-31 매일 할일 6', () => {
    expect(ids(todosOn(SEED, '2026-11-01'))).toEqual([1, 2, 5, 6]);
    for (const d of ['2026-10-26', '2026-10-28', '2026-10-31']) expect(ids(todosOn(SEED, d))).toContain(6);
  });
});

describe('layoutBars', () => {
  it('주 11-02~11-08: 6 제외, 열·폭·lane', () => {
    const bars = layoutBars(SEED, '2026-11-02', '2026-11-08');
    expect(bars.map((b) => b.todo.id)).toEqual([5, 1, 2, 4, 3, 7]); // 시작일 → id 순
    const by = Object.fromEntries(bars.map((b) => [b.todo.id, b]));
    expect([by[5].col, by[5].span, by[5].lane]).toEqual([0, 2, 0]); // 10-31 시작은 행 첫 칸에서 잘림
    expect([by[1].col, by[1].span, by[1].lane]).toEqual([0, 1, 1]);
    expect([by[2].col, by[2].span, by[2].lane]).toEqual([0, 1, 2]);
    expect([by[4].col, by[4].span, by[4].lane]).toEqual([1, 1, 1]); // 11-03 칸에서 lane 0은 5가 차지
    expect([by[3].col, by[3].span, by[3].lane]).toEqual([2, 2, 0]);
    expect([by[7].col, by[7].span, by[7].lane]).toEqual([6, 1, 0]);
  });
  it('주 10-26~11-01: 6이 전체 폭 lane 0', () => {
    const bars = layoutBars(SEED, '2026-10-26', '2026-11-01');
    const six = bars.find((b) => b.todo.id === 6)!;
    expect([six.col, six.span, six.lane]).toEqual([0, 7, 0]);
    expect(bars).toHaveLength(4);
  });
});
