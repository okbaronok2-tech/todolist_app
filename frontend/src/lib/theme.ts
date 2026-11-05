// 다크 모드 (스타일 가이드 2.4). html[data-theme]만 바꾸고 색은 styles.css 토큰이 결정한다.
// 저장 키 'theme'. 저장값이 없으면 OS 설정(prefers-color-scheme)을 따른다
export type Theme = 'light' | 'dark';
const KEY = 'theme';

export function getTheme(): Theme {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'light' || v === 'dark') return v;
  } catch {
    /* 비공개 창 등 저장소 접근 불가: OS 설정으로 */
  }
  return typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
}

// shortcut: 저장한 뒤에는 OS 설정 변경을 따라가지 않는다, 요구가 생기면 matchMedia change 리스너 추가
export function saveTheme(theme: Theme) {
  applyTheme(theme);
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    /* 저장 실패해도 현재 화면에는 적용됨 */
  }
}
