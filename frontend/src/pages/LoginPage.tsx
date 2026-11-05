// WF-01 로그인 (SC-01)
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useLogin } from '../queries/use-auth';
import { ErrorMessage } from '../components/common/ErrorMessage';
import { errorText } from '../lib/error-text';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const login = useLogin();
  const navigate = useNavigate();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    login.mutate(
      { email, password },
      {
        onSuccess: () => navigate('/todos', { replace: true }),
        onError: (err) => setError(errorText(err)), // INVALID_CREDENTIALS: 단일 메시지, 화면 유지 (BR-06)
      },
    );
  }

  return (
    <div className="auth-page">
      <header className="nav">
        <span className="nav__brand">TodoList</span>
      </header>
      <main className="auth-card">
        <h1 className="page-title">로그인</h1>
        <ErrorMessage message={error} />
        <form className="form" onSubmit={onSubmit} noValidate>
          <div className="field">
            <label className="field__label" htmlFor="email">
              이메일
            </label>
            <input id="email" type="email" value={email} maxLength={254} autoComplete="username" onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="field">
            <label className="field__label" htmlFor="password">
              비밀번호
            </label>
            <input id="password" type="password" value={password} maxLength={64} autoComplete="current-password" onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div className="form__actions">
            <button type="submit" className="btn btn--primary" disabled={login.isPending}>
              로그인
            </button>
          </div>
        </form>
        <p className="auth-card__footer">
          계정이 없으신가요? <Link to="/signup">가입 화면</Link>
        </p>
      </main>
    </div>
  );
}
