// 스타일 가이드 3.7 막대 lane 배정. 행(주) 안에서 시작일 빠른 순, 같으면 id 순으로 위에서부터 빈 줄에 넣는다.
import type { Todo } from '../types/todo';
import { daysBetween } from './date';

export interface Bar {
  todo: Todo;
  col: number; // 행 안 시작 열 0~6
  span: number; // 칸 수 1~7
  lane: number;
}

export function layoutBars(todos: Todo[], rowStart: string, rowEnd: string): Bar[] {
  const items = todos
    .filter((t) => t.startDate <= rowEnd && t.endDate >= rowStart)
    .sort((a, b) => (a.startDate < b.startDate ? -1 : a.startDate > b.startDate ? 1 : a.id - b.id));
  const occupied: [number, number][][] = [];
  return items.map((todo) => {
    const c0 = Math.max(0, daysBetween(rowStart, todo.startDate));
    const c1 = Math.min(6, daysBetween(rowStart, todo.endDate));
    let lane = 0;
    while ((occupied[lane] ?? []).some(([a, b]) => !(c1 < a || c0 > b))) lane++;
    (occupied[lane] ??= []).push([c0, c1]);
    return { todo, col: c0, span: c1 - c0 + 1, lane };
  });
}

// BR-33: 칸 날짜를 포함하는 할일
export const todosOn = (todos: Todo[], date: string) => todos.filter((t) => t.startDate <= date && date <= t.endDate);
