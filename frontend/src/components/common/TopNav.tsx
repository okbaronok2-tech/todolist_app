// CP-01 상단 메뉴. 로그아웃 mutation만 예외로 여기서 호출한다 (T-F02)
import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router';
import { useLogout } from '../../queries/use-auth';
import { getTheme, saveTheme, type Theme } from '../../lib/theme';
import { log } from '../../lib/log';

const ITEMS = [
  { to: '/todos', label: '할일 목록' },
  { to: '/calendar', label: '캘린더' },
  { to: '/categories', label: '카테고리 관리' },
  { to: '/me', label: '내 정보', p1: true },
];

export function TopNav({ showMe = true }: { showMe?: boolean }) {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>(getTheme);
  const navigate = useNavigate();
  const logout = useLogout();

  // 서버가 리프레시 폐기 + 두 쿠키 삭제 (UC-03). 응답 후 캐시·스토어 초기화는 useLogout, 이동은 여기
  const onLogout = () => logout.mutate(undefined, { onSettled: () => navigate('/login', { replace: true }) });
  const onTheme = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    log('theme', next);
    saveTheme(next);
    setTheme(next);
  };

  return (
    <nav className={`nav${open ? ' nav--open' : ''}`}>
      <span className="nav__brand">TodoList</span>
      <button type="button" className="btn nav__toggle" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        메뉴
      </button>
      <ul className="nav__list">
        {ITEMS.filter((i) => !i.p1 || showMe).map((i) => (
          <li key={i.to}>
            <NavLink to={i.to} className={({ isActive }) => `nav__item${isActive ? ' nav__item--active' : ''}`} onClick={() => setOpen(false)}>
              {i.label}
            </NavLink>
          </li>
        ))}
        <li>
          <button type="button" className="nav__item nav__theme" aria-pressed={theme === 'dark'} onClick={onTheme}>
            {theme === 'dark' ? '라이트 모드' : '다크 모드'}
          </button>
        </li>
        <li>
          <button type="button" className="nav__item nav__logout" onClick={onLogout} disabled={logout.isPending}>
            로그아웃
          </button>
        </li>
      </ul>
    </nav>
  );
}
