// 라우트 정의, RequireAuth, 세션 복구(앱 시작 시 GET /api/users/me 1회), 세션 만료 핸들러 등록
import { useEffect, useState, type ReactNode } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { setSessionExpiredHandler } from './api/client';
import { me } from './api/auth';
import { useAppStore } from './stores/app-store';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { TodoListPage } from './pages/TodoListPage';
import { TodoFormPage } from './pages/TodoFormPage';
import { CalendarPage } from './pages/CalendarPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { MePage } from './pages/MePage';

function RequireAuth({ children }: { children: ReactNode }) {
  const user = useAppStore((s) => s.user);
  return user ? children : <Navigate to="/login" replace />;
}

export function App() {
  const [checked, setChecked] = useState(false);
  const setUser = useAppStore((s) => s.setUser);
  const reset = useAppStore((s) => s.reset);
  const navigate = useNavigate();
  const qc = useQueryClient();

  // 세션 복구(me) 실패는 만료가 아니라 "비로그인"이다. 핸들러는 복구 확인 뒤에만 등록한다 (/signup 직접 진입 보호)
  useEffect(() => {
    if (!checked) return;
    setSessionExpiredHandler(() => {
      qc.clear();
      reset();
      navigate('/login', { replace: true });
    });
    return () => setSessionExpiredHandler(() => {});
  }, [checked, qc, reset, navigate]);

  useEffect(() => {
    me()
      .then((m) => setUser({ id: m.id, name: m.name }))
      .catch(() => setUser(null))
      .finally(() => setChecked(true));
  }, [setUser]);

  if (!checked) return <p className="loading">불러오는 중...</p>;

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/todos" element={<RequireAuth><TodoListPage /></RequireAuth>} />
      <Route path="/todos/new" element={<RequireAuth><TodoFormPage /></RequireAuth>} />
      <Route path="/todos/:id/edit" element={<RequireAuth><TodoFormPage /></RequireAuth>} />
      <Route path="/calendar" element={<RequireAuth><CalendarPage /></RequireAuth>} />
      <Route path="/categories" element={<RequireAuth><CategoriesPage /></RequireAuth>} />
      <Route path="/me" element={<RequireAuth><MePage /></RequireAuth>} />
      <Route path="*" element={<Navigate to="/todos" replace />} />
    </Routes>
  );
}
