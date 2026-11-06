// 다크 모드 토글 (스타일 가이드 2.4). 상단 메뉴와 별개로 모든 화면 우하단에 고정된다
import { useState } from 'react';
import { getTheme, saveTheme, type Theme } from '../../lib/theme';
import { log } from '../../lib/log';

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(getTheme);
  const onClick = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    log('theme', next);
    saveTheme(next);
    setTheme(next);
  };
  return (
    <button type="button" className="theme-toggle" aria-pressed={theme === 'dark'} onClick={onClick}>
      {theme === 'dark' ? '라이트 모드' : '다크 모드'}
    </button>
  );
}
