// WF-04 할일 등록·편집 (SC-04). /todos/new, /todos/:id/edit 공용
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useCategories } from '../queries/use-categories';
import { useCreateTodo, useTodo, useUpdateTodo } from '../queries/use-todos';
import { todayLocal } from '../lib/date';
import { errorText, fieldOf } from '../lib/error-text';
import { ApiError } from '../types/api';
import type { Category } from '../types/category';
import type { TodoInput } from '../types/todo';
import { TopNav } from '../components/common/TopNav';
import { ErrorMessage } from '../components/common/ErrorMessage';

const EMPTY: TodoInput = { title: '', description: null, startDate: '', endDate: '', categoryId: null };

export function TodoFormPage() {
  const { id } = useParams();
  const todoId = id ? Number(id) : null;
  const today = todayLocal();
  const navigate = useNavigate();
  const categories = useCategories();
  const existing = useTodo(todoId, today);

  // 편집 진입 NOT_FOUND: 오류 표시 후 목록으로 (PRD 4.2)
  const loadError = existing.error ? errorText(existing.error) : null;
  const notFound = existing.error instanceof ApiError && existing.error.code === 'NOT_FOUND';
  useEffect(() => {
    if (!notFound) return;
    const t = setTimeout(() => navigate('/todos', { replace: true }), 1200);
    return () => clearTimeout(t);
  }, [notFound, navigate]);

  const editing = todoId !== null;
  return (
    <>
      <TopNav />
      <main className="page">
        <h1 className="page-title">{editing ? '할일 편집' : '할일 등록'}</h1>
        {loadError ? (
          <ErrorMessage message={loadError} />
        ) : editing && existing.isPending ? (
          <p className="loading">불러오는 중...</p>
        ) : (
          <TodoForm
            key={existing.data?.id ?? 'new'}
            todoId={todoId}
            initial={existing.data ? { title: existing.data.title, description: existing.data.description, startDate: existing.data.startDate, endDate: existing.data.endDate, categoryId: existing.data.categoryId } : EMPTY}
            categories={categories.data ?? []}
            today={today}
          />
        )}
      </main>
    </>
  );
}

type Field = 'title' | 'description' | 'date';

function TodoForm({ todoId, initial, categories, today }: { todoId: number | null; initial: TodoInput; categories: Category[]; today: string }) {
  const navigate = useNavigate();
  const create = useCreateTodo();
  const update = useUpdateTodo();
  const [form, setForm] = useState<TodoInput>(initial);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<Partial<Record<Field, string>>>({});

  const dateHint = form.startDate && form.endDate && form.startDate > form.endDate ? '시작일이 종료일보다 늦습니다. 저장하면 서버가 거부합니다.' : null;
  const busy = create.isPending || update.isPending;

  function set<K extends keyof TodoInput>(key: K, value: TodoInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function onError(err: unknown) {
    setError(errorText(err));
    if (err instanceof ApiError) {
      const f = err.code === 'INVALID_DATE_RANGE' ? 'date' : fieldOf(err.message);
      if (f === 'title' || f === 'description' || f === 'date') setFieldError({ [f]: errorText(err) });
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldError({});
    const input: TodoInput = { ...form, description: form.description?.trim() ? form.description : null };
    const opts = { onSuccess: () => navigate('/todos'), onError };
    if (todoId !== null) update.mutate({ id: todoId, input, today }, opts);
    else create.mutate({ input, today }, opts);
  }

  return (
    <>
      <ErrorMessage message={error} />
      <form className="form form--todo" onSubmit={onSubmit} noValidate>
        <div className="field">
          <label className="field__label" htmlFor="title">
            제목 <span className="field__required">(필수)</span>
          </label>
          <input id="title" type="text" value={form.title} maxLength={100} className={fieldError.title ? 'is-error' : ''} onChange={(e) => set('title', e.target.value)} />
          {fieldError.title && <span className="field__error">{fieldError.title}</span>}
        </div>
        <div className="field">
          <label className="field__label" htmlFor="description">
            설명
          </label>
          <textarea id="description" rows={3} maxLength={1000} value={form.description ?? ''} onChange={(e) => set('description', e.target.value)} />
          {fieldError.description && <span className="field__error">{fieldError.description}</span>}
        </div>
        <div className="field field--dates">
          <label className="field__label" htmlFor="startDate">
            시작일 <span className="field__required">(필수)</span>
          </label>
          <input id="startDate" type="date" value={form.startDate} className={fieldError.date ? 'is-error' : ''} onChange={(e) => set('startDate', e.target.value)} />
          <label className="field__label" htmlFor="endDate">
            종료일 <span className="field__required">(필수)</span>
          </label>
          <input id="endDate" type="date" value={form.endDate} className={fieldError.date ? 'is-error' : ''} onChange={(e) => set('endDate', e.target.value)} />
          {fieldError.date ? <span className="field__error">{fieldError.date}</span> : dateHint && <span className="field__hint">{dateHint}</span>}
        </div>
        <div className="field">
          <label className="field__label" htmlFor="categoryId">
            카테고리
          </label>
          <select id="categoryId" value={form.categoryId ?? ''} onChange={(e) => set('categoryId', e.target.value ? Number(e.target.value) : null)}>
            <option value="">미선택 (기본)</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="form__actions">
          <button type="submit" className="btn btn--primary" disabled={busy}>
            저장
          </button>
          <button type="button" className="btn" onClick={() => navigate('/todos')}>
            취소
          </button>
        </div>
      </form>
    </>
  );
}
