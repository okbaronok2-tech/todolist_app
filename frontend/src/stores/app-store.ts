// Zustand 1개 (원칙 3.3). 서버 데이터는 넣지 않는다. Date 객체 금지 (PR-05)
import { create } from 'zustand';
import type { User } from '../types/api';
import type { CalendarView, TodoFilter } from '../types/todo';
import { todayLocal } from '../lib/date';

interface CalendarState {
  view: CalendarView;
  anchorDate: string;
}

interface AppState {
  user: User | null;
  filter: TodoFilter;
  calendar: CalendarState;
  setUser: (user: User | null) => void;
  setFilter: (filter: Partial<TodoFilter>) => void;
  setCalendar: (calendar: Partial<CalendarState>) => void;
  reset: () => void;
}

const initial = () => ({
  user: null,
  filter: { categoryId: null, status: null },
  calendar: { view: 'month' as CalendarView, anchorDate: todayLocal() },
});

export const useAppStore = create<AppState>((set) => ({
  ...initial(),
  setUser: (user) => set({ user }),
  setFilter: (filter) => set((s) => ({ filter: { ...s.filter, ...filter } })),
  setCalendar: (calendar) => set((s) => ({ calendar: { ...s.calendar, ...calendar } })),
  reset: () => set(initial()),
}));
