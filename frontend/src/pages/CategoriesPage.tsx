// WF-07 카테고리 관리 (SC-07)
import { useState } from 'react';
import { useAppStore } from '../stores/app-store';
import { useCategories, useCreateCategory, useDeleteCategory, useRenameCategory } from '../queries/use-categories';
import { errorText } from '../lib/error-text';
import type { Category } from '../types/category';
import { ApiError } from '../types/api';
import { TopNav } from '../components/common/TopNav';
import { ErrorMessage } from '../components/common/ErrorMessage';
import { ConfirmDialog } from '../components/common/ConfirmDialog';

export function CategoriesPage() {
  const categories = useCategories();
  const create = useCreateCategory();
  const rename = useRenameCategory();
  const remove = useDeleteCategory();
  const filter = useAppStore((s) => s.filter);
  const setFilter = useAppStore((s) => s.setFilter);
  const [name, setName] = useState('');
  const [editing, setEditing] = useState<{ id: number; name: string } | null>(null);
  const [target, setTarget] = useState<Category | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fail = (e: unknown) => setError(errorText(e));

  function onAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    create.mutate(name, { onSuccess: () => setName(''), onError: fail });
  }

  function onSaveRename() {
    if (!editing) return;
    setError(null);
    rename.mutate(editing, { onSuccess: () => setEditing(null), onError: (e) => { fail(e); if (e instanceof ApiError && e.code === 'NOT_FOUND') setEditing(null); } });
  }

  function onConfirmDelete() {
    if (!target) return;
    setError(null);
    remove.mutate(target.id, {
      // 목록 필터가 이 카테고리를 가리키면 미선택으로 (삭제된 id로 조회하면 NOT_FOUND)
      onSuccess: () => { if (filter.categoryId === target.id) setFilter({ categoryId: null }); },
      onError: fail,
      onSettled: () => setTarget(null),
    });
  }

  return (
    <>
      <TopNav />
      <main className="page">
        <h1 className="page-title">카테고리 관리</h1>
        <form className="inline-form" onSubmit={onAdd}>
          <label htmlFor="newCategory">이름</label>
          <input id="newCategory" type="text" value={name} maxLength={30} onChange={(e) => setName(e.target.value)} />
          <button type="submit" className="btn btn--primary" disabled={create.isPending}>
            추가
          </button>
        </form>
        <ErrorMessage message={error ?? (categories.error ? errorText(categories.error) : null)} />
        {categories.isPending ? (
          <p className="loading">불러오는 중...</p>
        ) : (
          <ul className="table category-list">
            <li className="category-row category-row--head" aria-hidden="true">
              <span className="category-row__name">이름</span>
              <span className="category-row__kind">구분</span>
              <span className="category-row__actions">동작</span>
            </li>
            {categories.data?.map((c) => (
              <li key={c.id} className="category-row">
                {editing?.id === c.id ? (
                  <>
                    <span className="category-row__name">
                      <input type="text" value={editing.name} maxLength={30} aria-label="새 이름" autoFocus onChange={(e) => setEditing({ id: c.id, name: e.target.value })} />
                    </span>
                    <span className="category-row__kind" />
                    <span className="category-row__actions">
                      <button type="button" className="btn btn--sm btn--primary" onClick={onSaveRename} disabled={rename.isPending}>
                        저장
                      </button>
                      <button type="button" className="btn btn--sm" onClick={() => setEditing(null)}>
                        취소
                      </button>
                    </span>
                  </>
                ) : (
                  <>
                    <span className="category-row__name">{c.name}</span>
                    <span className="category-row__kind">{c.isDefault ? '기본 카테고리' : ''}</span>
                    <span className="category-row__actions">
                      <button type="button" className="btn btn--sm" disabled={c.isDefault} onClick={() => setEditing({ id: c.id, name: c.name })}>
                        이름 변경
                      </button>
                      <button type="button" className="btn btn--sm btn--danger" disabled={c.isDefault} onClick={() => setTarget(c)}>
                        삭제
                      </button>
                    </span>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </main>
      <ConfirmDialog
        open={target !== null}
        title={`카테고리 '${target?.name ?? ''}' 삭제`}
        message="이 카테고리에 속한 할일은 기본 카테고리로 이동합니다."
        busy={remove.isPending}
        onConfirm={onConfirmDelete}
        onCancel={() => setTarget(null)}
      />
    </>
  );
}
