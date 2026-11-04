// API 스모크 (원칙 5장, R-05). 실행 중 서버 + 시드 적용된 개발 DB 전제. `npm run smoke`
// US-02 로그인, US-12 필터 4조합, US-17 타인 리소스 + T-B01·T-B03의 HTTP 수준 완료 조건(헬스, 404, 쿠키 속성, 알고리즘, 만료, 회전·재사용, 로그아웃).
// 불일치는 `<항목>: 기대 / 실제`로 출력, 종료 코드 1
import jwt from 'jsonwebtoken';

const BASE = process.env.SMOKE_BASE_URL ?? 'http://localhost:3000';
const TODAY = '2026-11-03';
const failures = [];

function expect(label, expected, actual) {
  if (JSON.stringify(expected) !== JSON.stringify(actual)) failures.push(`${label}: 기대 ${JSON.stringify(expected)} / 실제 ${JSON.stringify(actual)}`);
}

async function call(method, path, { body, cookie, raw } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
    body: raw ?? (body === undefined ? undefined : JSON.stringify(body)),
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  return { status: res.status, json, setCookie: res.headers.getSetCookie() };
}

const cookieHeader = (setCookie) => setCookie.map((c) => c.split(';')[0]).join('; ');
const cookieValue = (setCookie, name) => setCookie.find((c) => c.startsWith(`${name}=`))?.split(';')[0].slice(name.length + 1);
const attrs = (c) => c?.split(';').slice(1).map((s) => s.trim()).filter((s) => !s.startsWith('Expires=')).sort();

async function login(email, password) {
  const res = await call('POST', '/api/auth/login', { body: { email, password } });
  return { ...res, cookie: cookieHeader(res.setCookie) };
}

// T-B01
expect('T-B01 health', { status: 200, json: { ok: true } }, (({ status, json }) => ({ status, json }))(await call('GET', '/api/health')));
expect('T-B01 미등록 경로 404', [404, 'NOT_FOUND'], (({ status, json }) => [status, json?.code])(await call('GET', '/api/nope')));
expect('T-B01 잘못된 JSON 400', [400, 'VALIDATION_ERROR'], (({ status, json }) => [status, json?.code])(await call('POST', '/api/auth/login', { raw: '{bad' })));

// US-02
const bad = await call('POST', '/api/auth/login', { body: { email: 'seojun@example.com', password: 'wrongpass1' } });
expect('US-02 단계 1 status', 401, bad.status);
expect('US-02 단계 1 code', 'INVALID_CREDENTIALS', bad.json?.code);
const ps02 = await login('seojun@example.com', 'seojun1234');
expect('US-02 단계 2 status', 200, ps02.status);
expect('US-02 단계 2 user', { id: 2, name: '이서준' }, ps02.json?.user);
expect('US-02 단계 2 cookies', ['refresh_token', 'token'], ps02.setCookie.map((c) => c.split('=')[0]).sort());

// T-B03 쿠키 속성·토큰
const tokenCookie = ps02.setCookie.find((c) => c.startsWith('token='));
const refreshCookie = ps02.setCookie.find((c) => c.startsWith('refresh_token='));
expect('T-B03 token 쿠키 속성', ['HttpOnly', 'Max-Age=900', 'Path=/', 'SameSite=Lax'], attrs(tokenCookie));
expect('T-B03 refresh_token 쿠키 속성', ['HttpOnly', 'Max-Age=1209600', 'Path=/api/auth', 'SameSite=Lax'], attrs(refreshCookie));
const decoded = jwt.decode(cookieValue(ps02.setCookie, 'token'), { complete: true });
expect('T-B03 alg HS384', 'HS384', decoded?.header?.alg);
expect('T-B03 claims', ['exp', 'iat', 'sub'], Object.keys(decoded?.payload ?? {}).sort());
const secret = process.env.JWT_SECRET;
const hs256 = jwt.sign({ sub: '2' }, secret, { algorithm: 'HS256', expiresIn: 900 });
expect('T-B03 HS256 토큰 401', 401, (await call('GET', '/api/categories', { cookie: `token=${hs256}` })).status);
const expired = jwt.sign({ sub: '2' }, secret, { algorithm: 'HS384', expiresIn: -10 });
expect('T-B03 만료 액세스 + refresh 쿠키 401', 401, (await call('GET', '/api/categories', { cookie: `token=${expired}; refresh_token=${cookieValue(ps02.setCookie, 'refresh_token')}` })).status);

// T-B03 회전·재사용·로그아웃
const raw1 = cookieValue(ps02.setCookie, 'refresh_token');
const rot = await call('POST', '/api/auth/refresh', { cookie: `refresh_token=${raw1}` });
expect('T-B03 refresh 200 user', [200, { id: 2, name: '이서준' }], [rot.status, rot.json?.user]);
const raw2 = cookieValue(rot.setCookie, 'refresh_token');
expect('T-B03 refresh 새 토큰', true, Boolean(raw2) && raw2 !== raw1);
const reuse = await call('POST', '/api/auth/refresh', { cookie: `refresh_token=${raw1}` });
expect('T-B03 재사용 401 + 두 쿠키 Max-Age=0', [401, 'UNAUTHORIZED', 2], [reuse.status, reuse.json?.code, reuse.setCookie.filter((c) => /Max-Age=0/.test(c)).length]);
expect('T-B03 재사용 후 새 토큰도 401', 401, (await call('POST', '/api/auth/refresh', { cookie: `refresh_token=${raw2}` })).status);
const lo = await call('POST', '/api/auth/logout');
expect('T-B03 쿠키 없는 로그아웃 204 + Max-Age=0 x2', [204, 2], [lo.status, lo.setCookie.filter((c) => /Max-Age=0/.test(c)).length]);
expect('T-B03 쿠키 없는 보호 API 401', 401, (await call('GET', '/api/categories')).status);

// US-12 (재사용 탐지로 ps02 세션이 폐기됐으므로 다시 로그인)
const s2 = await login('seojun@example.com', 'seojun1234');
const list = async (query, cookie = s2.cookie) => call('GET', `/api/todos?today=${TODAY}${query}`, { cookie });
expect('US-12 단계 1 필터 없음 건수', 7, (await list('')).json?.length);
expect('US-12 단계 1 기본 정렬', [6, 1, 2, 5, 4, 3, 7], (await list('')).json?.map((t) => t.id));
expect('US-12 단계 2 categoryId=4 건수', 4, (await list('&categoryId=4')).json?.length);
expect('US-12 단계 3 status=OVERDUE 건수', 2, (await list('&status=OVERDUE')).json?.length);
expect('US-12 단계 4 둘 다 건수', 1, (await list('&categoryId=4&status=OVERDUE')).json?.length);

// US-17 (PS-01 쿠키로 PS-02 리소스)
const ps01 = await login('haneul@example.com', 'haneul1234');
expect('US-17 사전 로그인', 200, ps01.status);
const before = (await list('')).json;
const steps = [
  ['GET 할일 1', () => call('GET', `/api/todos/1?today=${TODAY}`, { cookie: ps01.cookie })],
  ['PATCH 할일 1', () => call('PATCH', `/api/todos/1?today=${TODAY}`, { cookie: ps01.cookie, body: { title: 'x', startDate: '2026-11-01', endDate: '2026-11-02' } })],
  ['DELETE 할일 1', () => call('DELETE', '/api/todos/1', { cookie: ps01.cookie })],
  ['categoryId=3 등록', () => call('POST', `/api/todos?today=${TODAY}`, { cookie: ps01.cookie, body: { title: 'x', startDate: '2026-11-01', endDate: '2026-11-02', categoryId: 3 } })],
  ['categoryId=3 필터', () => list('&categoryId=3', ps01.cookie)],
];
const bodies = new Set();
for (const [name, fn] of steps) {
  const res = await fn();
  expect(`US-17 ${name} status`, 404, res.status);
  expect(`US-17 ${name} code`, 'NOT_FOUND', res.json?.code);
  bodies.add(JSON.stringify(res.json));
}
expect('US-17 동일 본문', 1, bodies.size);
expect('US-17 사용자 2 데이터 불변', before, (await list('')).json);

if (failures.length) {
  console.log(failures.join('\n'));
  process.exit(1);
}
console.log('smoke OK (T-B01, T-B03, US-02, US-12, US-17)');
