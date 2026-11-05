// WF-06 내 정보 (SC-06, P1). INVALID_CREDENTIALS는 화면 유지 (PRD 4.2)
import { useState } from 'react';
import { useMe, useUpdateMe } from '../queries/use-auth';
import type { Me } from '../types/api';
import { errorText } from '../lib/error-text';
import { TopNav } from '../components/common/TopNav';
import { ErrorMessage } from '../components/common/ErrorMessage';

export function MePage() {
  const info = useMe();
  return (
    <>
      <TopNav />
      <main className="page">
        <h1 className="page-title">내 정보</h1>
        {info.isPending ? (
          <p className="loading">불러오는 중...</p>
        ) : info.data ? (
          <MeForm key={`${info.data.id}-${info.data.name}`} initial={info.data} />
        ) : (
          <ErrorMessage message={errorText(info.error)} />
        )}
      </main>
    </>
  );
}

function MeForm({ initial }: { initial: Me }) {
  const save = useUpdateMe();
  const [name, setName] = useState(initial.name);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    // 바뀐 것만 보낸다. 비밀번호만 바꿀 때 이름 검증에 걸리지 않도록
    const input: { name?: string; currentPassword?: string; newPassword?: string } = {};
    if (name !== initial.name) input.name = name;
    if (currentPassword || newPassword) Object.assign(input, { currentPassword, newPassword });
    save.mutate(input, {
      onSuccess: () => {
        setCurrentPassword('');
        setNewPassword('');
        setSaved(true);
      },
      onError: (err) => setError(errorText(err)),
    });
  }

  return (
    <>
      <ErrorMessage message={error} />
      {saved && <p className="notice">저장했습니다.</p>}
      <form className="form" onSubmit={onSubmit} noValidate>
        <div className="field">
          <label className="field__label" htmlFor="name">
            이름
          </label>
          <input id="name" type="text" value={name} maxLength={50} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label className="field__label" htmlFor="currentPassword">
            현재 비밀번호
          </label>
          <input id="currentPassword" type="password" value={currentPassword} maxLength={64} autoComplete="current-password" onChange={(e) => setCurrentPassword(e.target.value)} />
        </div>
        <div className="field">
          <label className="field__label" htmlFor="newPassword">
            새 비밀번호
          </label>
          <input id="newPassword" type="password" value={newPassword} maxLength={64} autoComplete="new-password" onChange={(e) => setNewPassword(e.target.value)} />
          <span className="field__hint">비밀번호를 바꿀 때만 두 칸을 입력 (8~64자)</span>
        </div>
        <div className="form__actions">
          <button type="submit" className="btn btn--primary" disabled={save.isPending}>
            저장
          </button>
        </div>
      </form>
    </>
  );
}
