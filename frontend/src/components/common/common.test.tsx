// T-F02 완료 조건: CP-01~06 표시·콜백
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBadge } from './StatusBadge';
import { ErrorMessage } from './ErrorMessage';
import { ConfirmDialog } from './ConfirmDialog';
import { EmptyList } from './EmptyList';
import { TopNav } from './TopNav';
import { TodoRow } from './TodoRow';
import type { Todo } from '../../types/todo';

describe('StatusBadge (CP-04)', () => {
  it('상태 4개 전체·축약 글자', () => {
    const { container } = render(
      <>
        <StatusBadge status="NOT_STARTED" /><StatusBadge status="IN_PROGRESS" /><StatusBadge status="COMPLETED" /><StatusBadge status="OVERDUE" />
        <StatusBadge status="NOT_STARTED" compact /><StatusBadge status="IN_PROGRESS" compact /><StatusBadge status="COMPLETED" compact /><StatusBadge status="OVERDUE" compact />
      </>,
    );
    expect([...container.querySelectorAll('.badge')].map((b) => b.textContent)).toEqual(['시작 전', '진행중', '완료', '기한 초과', '전', '진', '완', '초']);
  });
});

describe('ErrorMessage (CP-02)', () => {
  it('message가 비면 렌더하지 않는다', () => {
    const { container } = render(<ErrorMessage message="" />);
    expect(container.innerHTML).toBe('');
    render(<ErrorMessage message="오류" />);
    expect(screen.getByRole('alert').textContent).toBe('오류');
  });
});

describe('ConfirmDialog (CP-03)', () => {
  it('onConfirm·onCancel 각각 호출, 닫히면 미렌더', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    const { rerender } = render(<ConfirmDialog open title="t" message="m" onConfirm={onConfirm} onCancel={onCancel} />);
    fireEvent.click(screen.getByText('확인'));
    fireEvent.click(screen.getByText('취소'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('dialog')).toBeTruthy();
    rerender(<ConfirmDialog open={false} title="t" message="m" onConfirm={onConfirm} onCancel={onCancel} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('EmptyList (CP-06)', () => {
  it('filtered 여부로 문구 2종', () => {
    const { rerender } = render(<MemoryRouter><EmptyList filtered={false} /></MemoryRouter>);
    expect(screen.getByText(/등록된 할일이 없습니다/)).toBeTruthy();
    rerender(<MemoryRouter><EmptyList filtered /></MemoryRouter>);
    expect(screen.getByText('조건에 맞는 할일이 없습니다.')).toBeTruthy();
  });
});

describe('TopNav (CP-01)', () => {
  const wrap = (ui: React.ReactNode) => render(<QueryClientProvider client={new QueryClient()}><MemoryRouter initialEntries={['/calendar']}>{ui}</MemoryRouter></QueryClientProvider>);
  it('메뉴 5개, showMe=false면 내 정보 숨김, 현재 메뉴 강조', () => {
    wrap(<TopNav />);
    expect(['할일 목록', '캘린더', '카테고리 관리', '내 정보', '로그아웃'].map((l) => screen.getByText(l))).toHaveLength(5);
    expect(screen.getByText('캘린더').className).toContain('nav__item--active');
  });
  it('F-03 미구현(showMe=false)이면 내 정보 없음', () => {
    wrap(<TopNav showMe={false} />);
    expect(screen.queryByText('내 정보')).toBeNull();
    expect(screen.getAllByRole('link')).toHaveLength(3);
  });
  it('테마 버튼: 누르면 html[data-theme]과 localStorage.theme이 바뀐다', () => {
    localStorage.removeItem('theme');
    delete document.documentElement.dataset.theme;
    wrap(<TopNav />);
    fireEvent.click(screen.getByText('다크 모드'));
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem('theme')).toBe('dark');
    fireEvent.click(screen.getByText('라이트 모드'));
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(localStorage.getItem('theme')).toBe('light');
  });
});

describe('TodoRow (CP-05)', () => {
  const todo: Todo = { id: 2, categoryId: 4, title: '거래처 견적 회신', description: null, startDate: '2026-11-01', endDate: '2026-11-02', isCompleted: false, completedAt: null, status: 'OVERDUE', createdAt: '', updatedAt: '' };
  it('제목·기간·카테고리·배지, 체크는 isCompleted 명시값으로 콜백', () => {
    const onToggle = vi.fn();
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(<ul><TodoRow todo={todo} categoryName="업무" onToggle={onToggle} onEdit={onEdit} onDelete={onDelete} /></ul>);
    expect(screen.getByText('11-01~11-02')).toBeTruthy();
    expect(screen.getByText('업무')).toBeTruthy();
    expect(screen.getByText('기한 초과')).toBeTruthy();
    fireEvent.click(screen.getByRole('checkbox'));
    expect(onToggle).toHaveBeenCalledWith(todo, true);
    fireEvent.click(screen.getByText('편집'));
    fireEvent.click(screen.getByText('삭제'));
    expect(onEdit).toHaveBeenCalledWith(todo);
    expect(onDelete).toHaveBeenCalledWith(todo);
  });
});
