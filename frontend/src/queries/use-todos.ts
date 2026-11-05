// 할일 쿼리·mutation (T-F05). 쿼리 키에 today·필터·from/to 포함, Date 객체 없음 (PR-05)
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '../api/todos';
import type { TodoFilter, TodoInput } from '../types/todo';
import { ApiError } from '../types/api';
import { CATEGORIES_KEY, TODOS_KEY } from './use-categories';

export const useTodoList = (filter: TodoFilter, today: string) =>
  useQuery({
    queryKey: [...TODOS_KEY, 'list', today, filter.categoryId, filter.status],
    queryFn: () => api.list(filter, today),
  });

export const useTodoRange = (from: string, to: string, today: string) =>
  useQuery({ queryKey: [...TODOS_KEY, 'range', today, from, to], queryFn: () => api.range(from, to, today) });

export const useTodo = (id: number | null, today: string) =>
  useQuery({
    queryKey: [...TODOS_KEY, 'one', id, today],
    queryFn: () => api.get(id as number, today),
    enabled: id !== null,
    retry: false,
  });

function useInvalidateTodos() {
  const qc = useQueryClient();
  return () => void qc.invalidateQueries({ queryKey: TODOS_KEY });
}

// NOT_FOUND는 오류 표시 후 목록 재조회 (PRD 4.2). 그 외 오류는 재조회하지 않는다
const refetchOnNotFound = (invalidate: () => void) => (err: unknown) => {
  if (err instanceof ApiError && err.code === 'NOT_FOUND') invalidate();
};

// 등록·수정의 NOT_FOUND는 할일(다른 탭 삭제) 또는 categoryId(삭제된 카테고리)이므로 둘 다 재조회
function useInvalidateTodosAndCategories() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: TODOS_KEY });
    void qc.invalidateQueries({ queryKey: CATEGORIES_KEY });
  };
}

export function useCreateTodo() {
  const invalidate = useInvalidateTodos();
  const onNotFound = refetchOnNotFound(useInvalidateTodosAndCategories());
  return useMutation({ mutationFn: ({ input, today }: { input: TodoInput; today: string }) => api.create(input, today), onSuccess: invalidate, onError: onNotFound });
}

export function useUpdateTodo() {
  const invalidate = useInvalidateTodos();
  const onNotFound = refetchOnNotFound(useInvalidateTodosAndCategories());
  return useMutation({
    mutationFn: ({ id, input, today }: { id: number; input: TodoInput; today: string }) => api.update(id, input, today),
    onSuccess: invalidate,
    onError: onNotFound,
  });
}

export function useSetCompleted() {
  const invalidate = useInvalidateTodos();
  return useMutation({
    mutationFn: ({ id, isCompleted, today }: { id: number; isCompleted: boolean; today: string }) => api.setCompleted(id, isCompleted, today),
    onSuccess: invalidate,
    onError: refetchOnNotFound(invalidate),
  });
}

export function useDeleteTodo() {
  const invalidate = useInvalidateTodos();
  return useMutation({ mutationFn: (id: number) => api.remove(id), onSuccess: invalidate, onError: refetchOnNotFound(invalidate) });
}
