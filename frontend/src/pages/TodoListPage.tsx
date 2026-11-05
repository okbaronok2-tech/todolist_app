// WF-03 할일 목록 (SC-03)
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAppStore } from '../stores/app-store';
import { useCategories } from '../queries/use-categories';
import { useDeleteTodo, useSetCompleted, useTodoList } from '../queries/use-todos';
import { todayLocal } from '../lib/date';
import { errorText } from '../lib/error-text';
import { TODO_STATUS, type Todo, type TodoStatus } from '../types/todo';
import { TopNav } from '../components/common/TopNav';
import { ErrorMessage } from '../components/common/ErrorMessage';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { TodoRow } from '../components/common/TodoRow';
import { EmptyList } from '../components/common/EmptyList';
import { statusLabel } from '../lib/status';

export function TodoListPage() {
  const today = todayLocal();
  const filter = useAppStore((s) => s.filter);
  const setFilter = useAppStore((s) => s.setFilter);
  const navigate = useNavigate();
  const categories = useCategories();
  const todos = useTodoList(filter, today);
  const setCompleted = useSetCompleted();
  const remove = useDeleteTodo();
  const [error, setError] = useState<string | null>(null);
  const [target, setTarget] = useState<Todo | null>(null);

  const categoryName = (id: number) => categories.data?.find((c) => c.id === id)?.name ?? '';
  const filtered = filter.categoryId !== null || filter.status !== null;

  function onToggle(todo: Todo, isCompleted: boolean) {
    setError(null);
    setCompleted.mutate({ id: todo.id, isCompleted, today }, { onError: (e) => setError(errorText(e)) });
  }

  function onConfirmDelete() {
    if (!target) return;
    setError(null);
    remove.mutate(target.id, { onError: (e) => setError(errorText(e)), onSettled: () => setTarget(null) });
  }

  return (
    <>
      <TopNav />
      <main className="page">
        <div className="page__head">
          <h1 className="page-title">할일 목록</h1>
          <button type="button" className="btn btn--primary" onClick={() => navigate('/todos/new')}>
            등록
          </button>
        </div>
        <div className="filters">
          <label className="filters__item">
            카테고리
            <select value={filter.categoryId ?? ''} onChange={(e) => { setError(null); setFilter({ categoryId: e.target.value ? Number(e.target.value) : null }); }}>
              <option value="">미선택</option>
              {categories.data?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="filters__item">
            상태
            <select value={filter.status ?? ''} onChange={(e) => { setError(null); setFilter({ status: (e.target.value || null) as TodoStatus | null }); }}>
              <option value="">미선택</option>
              {Object.values(TODO_STATUS).map((s) => (
                <option key={s} value={s}>
                  {statusLabel(s)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <ErrorMessage message={error ?? (todos.error ? errorText(todos.error) : null)} />
        {todos.isPending ? (
          <p className="loading">불러오는 중...</p>
        ) : todos.data && todos.data.length === 0 ? (
          <EmptyList filtered={filtered} />
        ) : (
          <ul className="table todo-list">
            <li className="todo-row todo-row--head" aria-hidden="true">
              <span className="todo-row__check">완료</span>
              <span className="todo-row__title">제목</span>
              <span className="todo-row__period">기간</span>
              <span className="todo-row__category">카테고리</span>
              <span className="todo-row__status">상태</span>
              <span className="todo-row__actions">동작</span>
            </li>
            {todos.data?.map((t) => (
              <TodoRow
                key={t.id}
                todo={t}
                categoryName={categoryName(t.categoryId)}
                busy={setCompleted.isPending && setCompleted.variables?.id === t.id}
                onToggle={onToggle}
                onEdit={(todo) => navigate(`/todos/${todo.id}/edit`)}
                onDelete={setTarget}
              />
            ))}
          </ul>
        )}
      </main>
      <ConfirmDialog
        open={target !== null}
        title={`할일 '${target?.title ?? ''}' 삭제`}
        message="이 할일은 영구 삭제되며 복구할 수 없습니다."
        busy={remove.isPending}
        onConfirm={onConfirmDelete}
        onCancel={() => setTarget(null)}
      />
    </>
  );
}
