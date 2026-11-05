// 상태 상수는 백엔드 services/todo-status.js와 같은 문자열 (원칙 4장 표)
export const TODO_STATUS = {
  NOT_STARTED: 'NOT_STARTED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  OVERDUE: 'OVERDUE',
} as const;

export type TodoStatus = (typeof TODO_STATUS)[keyof typeof TODO_STATUS];

export interface Todo {
  id: number;
  categoryId: number;
  title: string;
  description: string | null;
  startDate: string; // YYYY-MM-DD
  endDate: string;
  isCompleted: boolean;
  completedAt: string | null;
  status: TodoStatus;
  createdAt: string;
  updatedAt: string;
}

export interface TodoInput {
  title: string;
  description: string | null;
  startDate: string;
  endDate: string;
  categoryId: number | null; // null → 기본 카테고리 (BR-12)
}

// BR-31 단일 선택 2개. null = 미선택
export interface TodoFilter {
  categoryId: number | null;
  status: TodoStatus | null;
}

export type CalendarView = 'month' | 'week' | 'day';
