// WF-02 회원가입 (SC-02). 성공 시 자동 로그인 → /todos (UC-01)
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useSignup } from '../queries/use-auth';
import { ErrorMessage } from '../components/common/ErrorMessage';
import { errorText } from '../lib/error-text';

export function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const signup = useSignup();
  const navigate = useNavigate();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    signup.mutate(
      { email, password, name },
      {
        onSuccess: () => navigate('/todos', { replace: true }),
        onError: (err) => setError(errorText(err)), // DUPLICATE_EMAIL·VALIDATION_ERROR: 화면 유지
      },
    );
  }

  return (
    <div className="auth-page">
      <header className="nav">
        <span className="nav__brand">TodoList</span>
      </header>
      <main className="auth-card">
        <h1 className="page-title">회원가입</h1>
        <ErrorMessage message={error} />
        <form className="form" onSubmit={onSubmit} noValidate>
          <div className="field">
            <label className="field__label" htmlFor="email">
              이메일
            </label>
            <input id="email" type="email" value={email} maxLength={254} autoComplete="username" onChange={(e) => setEmail(e.target.value)} />
            <span className="field__hint">이메일 형식(local@domain), 254자 이하</span>
          </div>
          <div className="field">
            <label className="field__label" htmlFor="password">
              비밀번호
            </label>
            <input id="password" type="password" value={password} maxLength={64} autoComplete="new-password" onChange={(e) => setPassword(e.target.value)} />
            <span className="field__hint">8~64자</span>
          </div>
          <div className="field">
            <label className="field__label" htmlFor="name">
              이름
            </label>
            <input id="name" type="text" value={name} maxLength={50} autoComplete="name" onChange={(e) => setName(e.target.value)} />
            <span className="field__hint">앞뒤 공백 제외 1~50자</span>
          </div>
          <div className="form__actions">
            <button type="submit" className="btn btn--primary" disabled={signup.isPending}>
              가입
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
