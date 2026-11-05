import { qs, request } from './client';
import type { Todo, TodoFilter, TodoInput } from '../types/todo';

// 모든 요청에 today (D-05, API-01)
export const list = (filter: TodoFilter, today: string) =>
  request<Todo[]>(`/api/todos${qs({ today, categoryId: filter.categoryId, status: filter.status })}`);

// 캘린더: 필터 없음 (BR-36)
export const range = (from: string, to: string, today: string) => request<Todo[]>(`/api/todos${qs({ today, from, to })}`);

export const get = (id: number, today: string) => request<Todo>(`/api/todos/${id}${qs({ today })}`);
export const create = (input: TodoInput, today: string) => request<Todo>(`/api/todos${qs({ today })}`, { method: 'POST', body: input });
export const update = (id: number, input: TodoInput, today: string) =>
  request<Todo>(`/api/todos/${id}${qs({ today })}`, { method: 'PATCH', body: input });
export const setCompleted = (id: number, isCompleted: boolean, today: string) =>
  request<Todo>(`/api/todos/${id}/completed${qs({ today })}`, { method: 'PATCH', body: { isCompleted } });
export const remove = (id: number) => request<void>(`/api/todos/${id}`, { method: 'DELETE' });
