// 인증·내 정보 mutation/query (원칙 3.2: pages → queries → api). 쿼리 키는 여기만
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '../api/auth';
import { useAppStore } from '../stores/app-store';

export const ME_KEY = ['me'] as const;

// 로그인·가입 성공: 이전 계정 캐시 제거 후 스토어 user 저장 (UC-01, UC-02)
function useStartSession() {
  const qc = useQueryClient();
  const setUser = useAppStore((s) => s.setUser);
  return (user: { id: number; name: string }) => {
    qc.clear();
    setUser(user);
  };
}

export function useLogin() {
  const start = useStartSession();
  return useMutation({ mutationFn: api.login, onSuccess: start });
}

export function useSignup() {
  const start = useStartSession();
  return useMutation({ mutationFn: api.signup, onSuccess: start });
}

// UC-03: 응답(성공·실패 무관) 후 캐시·스토어 초기화. 실패해도 로컬 세션은 끝낸다
export function useLogout() {
  const qc = useQueryClient();
  const reset = useAppStore((s) => s.reset);
  return useMutation({
    mutationFn: api.logout,
    onSettled: () => {
      qc.clear();
      reset();
    },
  });
}

export const useMe = () => useQuery({ queryKey: ME_KEY, queryFn: api.me });

export function useUpdateMe() {
  const qc = useQueryClient();
  const setUser = useAppStore((s) => s.setUser);
  return useMutation({
    mutationFn: api.updateMe,
    onSuccess: (m) => {
      setUser({ id: m.id, name: m.name });
      void qc.invalidateQueries({ queryKey: ME_KEY });
    },
  });
}
