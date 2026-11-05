// 개발 모드 콘솔 로그. `npm run dev`(import.meta.env.DEV)에서만 출력하고 운영 빌드·vitest에서는 아무것도 하지 않는다.
// 비밀번호·토큰·요청 본문은 넘기지 않는다 (원칙 6.2). 태그: api, auth, session, route, store, theme
const ON = import.meta.env.DEV && import.meta.env.MODE !== 'test';

export function log(tag: string, ...args: unknown[]) {
  if (ON) console.log(`[${tag}]`, ...args);
}

export function warn(tag: string, ...args: unknown[]) {
  if (ON) console.warn(`[${tag}]`, ...args);
}
