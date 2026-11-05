// 카테고리 쿼리·mutation (T-F04). 쿼리 키·invalidate 규칙은 queries/에만
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '../api/categories';
import { ApiError } from '../types/api';

export const CATEGORIES_KEY = ['categories'] as const;
export const TODOS_KEY = ['todos'] as const;

export const useCategories = () => useQuery({ queryKey: CATEGORIES_KEY, queryFn: api.list });

function useInvalidate(alsoTodos = false) {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: CATEGORIES_KEY });
    if (alsoTodos) void qc.invalidateQueries({ queryKey: TODOS_KEY });
  };
}

export function useCreateCategory() {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: (name: string) => api.create(name), onSuccess: invalidate });
}

// NOT_FOUND(다른 탭에서 삭제)만 목록 재조회 (PRD 4.2). 그 외 오류는 재조회하지 않는다
const refetchOnNotFound = (invalidate: () => void) => (err: unknown) => {
  if (err instanceof ApiError && err.code === 'NOT_FOUND') invalidate();
};

export function useRenameCategory() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) => api.rename(id, name),
    onSuccess: invalidate,
    onError: refetchOnNotFound(invalidate),
  });
}

export function useDeleteCategory() {
  const invalidate = useInvalidate(true); // 소속 할일이 기본으로 이동 (BR-15)
  return useMutation({ mutationFn: (id: number) => api.remove(id), onSuccess: invalidate, onError: refetchOnNotFound(invalidate) });
}
