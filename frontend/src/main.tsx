import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from './App';
import { applyTheme, getTheme } from './lib/theme';
import './styles.css';

// 첫 렌더 전에 테마 적용 (로그인 화면에도 적용)
applyTheme(getTheme());

// 낙관적 업데이트 없음, 자동 재시도 없음 (PRD 4.2, 오류를 그대로 보여준다)
const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false }, mutations: { retry: false } } });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
