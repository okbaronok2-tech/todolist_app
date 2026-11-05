// docs/3-user-scenario.md US-01~US-17, US-19를 HTTP 수준으로 재현한다 (테스트 DB, 시나리오마다 시드 초기화).
// 화면 단계는 같은 API 호출로 치환하고, UI 전용 단계(확인 대화상자, 뒤로 가기, 375px)는 다루지 않는다. US-18은 UI 전용이라 제외.
// 서버는 임시 포트에 app을 직접 띄운다. 실행: `npm test`
import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { resetDb } from './setup.js';
import { pool } from '../src/db/pool.js';
import { app } from '../src/app.js';

const TODAY = '2026-11-03';
const PS01 = { email: 'haneul@example.com', password: 'haneul1234' };
const PS02 = { email: 'seojun@example.com', password: 'seojun1234' };
let server;
let BASE;

before(() => new Promise((resolve) => {
  server = app.listen(0, () => {
    BASE = `http://127.0.0.1:${server.address().port}`;
    resolve();
  });
}));
beforeEach(resetDb);
after(async () => {
  server.close();
  await pool.end();
});

async function call(method, path, { body, cookie } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, json: text ? JSON.parse(text) : null, setCookie: res.headers.getSetCookie() };
}

const cookieHeader = (setCookie) => setCookie.map((c) => c.split(';')[0]).join('; ');
const cookieValue = (setCookie, name) => setCookie.find((c) => c.startsWith(`${name}=`))?.split(';')[0].slice(name.length + 1);
const cookieNames = (setCookie) => setCookie.map((c) => c.split('=')[0]).sort();
const ids = (list) => list.map((t) => t.id);
const q = (extra = '') => `?today=${TODAY}${extra}`;

async function login({ email, password }) {
  const res = await call('POST', '/api/auth/login', { body: { email, password } });
  assert.equal(res.status, 200);
  return { cookie: cookieHeader(res.setCookie), setCookie: res.setCookie, user: res.json.user };
}
const todos = (cookie, extra = '') => call('GET', `/api/todos${q(extra)}`, { cookie });
const expectError = (res, status, code) => {
  assert.equal(res.status, status);
  assert.equal(res.json?.code, code);
  assert.equal(typeof res.json?.message, 'string');
};
const count = async (table) => (await pool.query(`SELECT count(*)::int AS c FROM ${table}`)).rows[0].c;

test('CORS: 허용 origin은 프리플라이트 204·자격 증명 헤더, 비허용 origin은 헤더 없음 (NFR-06 (6))', async () => {
  const origin = process.env.CORS_ORIGIN.split(',')[0];
  const pre = await fetch(`${BASE}/api/auth/login`, { method: 'OPTIONS', headers: { origin, 'access-control-request-method': 'POST' } });
  assert.equal(pre.status, 204);
  assert.equal(pre.headers.get('access-control-allow-origin'), origin);
  assert.equal(pre.headers.get('access-control-allow-credentials'), 'true');
  assert.equal(pre.headers.get('access-control-allow-methods'), 'GET,POST,PATCH,DELETE');
  const real = await fetch(`${BASE}/api/health`, { headers: { origin } });
  assert.equal(real.headers.get('access-control-allow-origin'), origin);
  assert.equal(real.headers.get('vary'), 'Origin');
  const other = await fetch(`${BASE}/api/health`, { headers: { origin: 'http://evil.example.com' } });
  assert.equal(other.status, 200);
  assert.equal(other.headers.get('access-control-allow-origin'), null);
});

test('US-01 회원가입 후 자동 로그인 (BR-04, BR-11, BR-43~45)', async () => {
  const su = await call('POST', '/api/auth/signup', { body: { email: 'haneul.new@example.com', password: 'haneul1234', name: '김하늘' } });
  assert.equal(su.status, 201);
  assert.deepEqual(cookieNames(su.setCookie), ['refresh_token', 'token']);
  const cookie = cookieHeader(su.setCookie);
  assert.deepEqual((await todos(cookie)).json, []);
  const cats = (await call('GET', '/api/categories', { cookie })).json;
  assert.deepEqual(cats.map((c) => [c.name, c.isDefault]), [['기본', true]]);

  const users = await count('users');
  const cases = [
    [{ email: 'HANEUL@example.com', password: 'haneul1234', name: '김하늘' }, 409, 'DUPLICATE_EMAIL'],
    [{ email: 'x@example.com', password: 'abc1234', name: '김하늘' }, 400, 'VALIDATION_ERROR'],
    [{ email: 'haneul.example.com', password: 'haneul1234', name: '김하늘' }, 400, 'VALIDATION_ERROR'],
    [{ email: 'y@example.com', password: 'haneul1234', name: '   ' }, 400, 'VALIDATION_ERROR'],
  ];
  for (const [body, status, code] of cases) expectError(await call('POST', '/api/auth/signup', { body }), status, code);
  assert.equal(await count('users'), users);
});

test('US-02 로그인 실패와 성공 (BR-06, NFR-06)', async () => {
  const wrong = await call('POST', '/api/auth/login', { body: { email: PS02.email, password: 'wrongpass1' } });
  const nobody = await call('POST', '/api/auth/login', { body: { email: 'nobody@example.com', password: PS02.password } });
  expectError(wrong, 401, 'INVALID_CREDENTIALS');
  assert.deepEqual(nobody, wrong);
  assert.deepEqual(wrong.setCookie, []);
  const ok = await login(PS02);
  assert.deepEqual(ok.user, { id: 2, name: '이서준' });
  assert.ok(ok.setCookie.every((c) => /HttpOnly/.test(c)));
  assert.equal((await todos(ok.cookie)).json.length, 7);
});

test('US-03 로그아웃 후 접근 차단 (BR-01, PD-01)', async () => {
  const { cookie, setCookie } = await login(PS02);
  const lo = await call('POST', '/api/auth/logout', { cookie });
  assert.equal(lo.status, 204);
  assert.equal(lo.setCookie.filter((c) => /Max-Age=0/.test(c)).length, 2);
  expectError(await todos(''), 401, 'UNAUTHORIZED');
  expectError(await call('POST', '/api/auth/refresh', { cookie: `refresh_token=${cookieValue(setCookie, 'refresh_token')}` }), 401, 'UNAUTHORIZED');
  // 액세스 토큰은 만료 전까지 유효 (PD-01, R-06)
  assert.equal((await todos(`token=${cookieValue(setCookie, 'token')}`)).status, 200);
});

test('US-04 카테고리 추가와 이름 변경 (BR-14, BR-46)', async () => {
  const { cookie } = await login(PS01);
  const list = async () => (await call('GET', '/api/categories', { cookie })).json;
  assert.deepEqual((await list()).map((c) => c.name), ['기본', '과제']);
  const created = await call('POST', '/api/categories', { cookie, body: { name: '동아리' } });
  assert.equal(created.status, 201);
  assert.equal((await list()).length, 3);
  const renamed = await call('PATCH', `/api/categories/${created.json.id}`, { cookie, body: { name: '동아리 활동' } });
  assert.equal(renamed.status, 200);
  assert.deepEqual((await list()).map((c) => c.name), ['기본', '과제', '동아리 활동']);
  assert.equal((await todos(cookie)).json.length, 1);

  expectError(await call('POST', '/api/categories', { cookie, body: { name: ' 과제 ' } }), 409, 'DUPLICATE_CATEGORY_NAME');
  expectError(await call('POST', '/api/categories', { cookie, body: { name: '가'.repeat(31) } }), 400, 'VALIDATION_ERROR');
  assert.equal((await list()).length, 3);
  for (let i = 3; i < 20; i++) assert.equal((await call('POST', '/api/categories', { cookie, body: { name: `c${i}` } })).status, 201);
  assert.equal((await list()).length, 20);
  expectError(await call('POST', '/api/categories', { cookie, body: { name: 'one-more' } }), 409, 'CATEGORY_LIMIT_EXCEEDED');
});

test('US-05 카테고리 삭제 시 할일 이동 (BR-15)', async () => {
  const { cookie } = await login(PS01);
  assert.equal((await call('DELETE', '/api/categories/2', { cookie })).status, 204);
  assert.deepEqual((await call('GET', '/api/categories', { cookie })).json.map((c) => c.id), [1]);
  const list = (await todos(cookie)).json;
  assert.deepEqual(list.map((t) => [t.id, t.categoryId]), [[8, 1]]);
  expectError(await todos(cookie, '&categoryId=2'), 404, 'NOT_FOUND');
});

test('US-06 기본 카테고리 보호 (BR-13, BR-17)', async () => {
  const { cookie } = await login(PS01);
  expectError(await call('PATCH', '/api/categories/2', { cookie, body: { name: '기본' } }), 409, 'DUPLICATE_CATEGORY_NAME');
  expectError(await call('POST', '/api/categories', { cookie, body: { name: '기본' } }), 409, 'DUPLICATE_CATEGORY_NAME');
  expectError(await call('DELETE', '/api/categories/1', { cookie }), 403, 'DEFAULT_CATEGORY_PROTECTED');
  expectError(await call('PATCH', '/api/categories/1', { cookie, body: { name: '새이름' } }), 403, 'DEFAULT_CATEGORY_PROTECTED');
  const cats = (await call('GET', '/api/categories', { cookie })).json;
  assert.deepEqual(cats.map((c) => [c.id, c.name, c.isDefault]), [[1, '기본', true], [2, '과제', false]]);
});

test('US-07 할일 등록: 카테고리 미지정과 지정 (BR-12, BR-24, ST-03, ST-04)', async () => {
  const { cookie } = await login(PS02);
  const meeting = await call('POST', `/api/todos${q()}`, { cookie, body: { title: '고객 미팅 준비', startDate: '2026-11-05', endDate: '2026-11-05' } });
  assert.equal(meeting.status, 201);
  assert.equal(meeting.json.categoryId, 3);
  assert.equal(meeting.json.status, 'NOT_STARTED');
  assert.equal(meeting.json.isCompleted, false);
  assert.equal(meeting.json.completedAt, null);
  const quote = await call('POST', `/api/todos${q()}`, { cookie, body: { title: '견적서 작성', startDate: '2026-11-03', endDate: '2026-11-04', categoryId: 4 } });
  assert.equal(quote.status, 201);
  assert.equal(quote.json.categoryId, 4);
  assert.equal(quote.json.status, 'IN_PROGRESS');
  assert.deepEqual(ids((await todos(cookie)).json), [6, 1, 2, 5, 4, quote.json.id, 3, meeting.json.id, 7]);
});

test('US-08 할일 등록 오류와 과거 날짜 (BR-21~23, BR-41, BR-52, ST-02)', async () => {
  const { cookie } = await login(PS01);
  const post = (body) => call('POST', `/api/todos${q()}`, { cookie, body });
  expectError(await post({ title: '', startDate: '2026-11-05', endDate: '2026-11-07' }), 400, 'VALIDATION_ERROR');
  expectError(await post({ title: '중간고사 정리', startDate: '2026-11-07', endDate: '2026-11-05' }), 400, 'INVALID_DATE_RANGE');
  expectError(await post({ title: '가'.repeat(101), startDate: '2026-11-05', endDate: '2026-11-07' }), 400, 'VALIDATION_ERROR');
  expectError(await post({ startDate: '2026-11-07', endDate: '2026-11-05' }), 400, 'VALIDATION_ERROR'); // BR-52: 제목 검증이 날짜 범위보다 먼저
  assert.equal((await todos(cookie)).json.length, 1);
  const past = await post({ title: '지난 퀴즈 오답 정리', startDate: '2026-10-20', endDate: '2026-10-22' });
  assert.equal(past.status, 201);
  assert.equal(past.json.status, 'OVERDUE');
  assert.equal((await post({ title: '하루짜리', startDate: '2026-11-05', endDate: '2026-11-05' })).status, 201); // BR-22 시작일 = 종료일
  assert.equal((await todos(cookie)).json.length, 3);
});

test('US-09 할일 수정 (BR-12, BR-22, BR-26, UC-06)', async () => {
  const { cookie } = await login(PS02);
  const before = (await call('GET', `/api/todos/3${q()}`, { cookie })).json;
  assert.deepEqual([before.title, before.startDate, before.endDate, before.categoryId], ['팀 회의 자료 준비', '2026-11-04', '2026-11-05', 4]);
  const moved = await call('PATCH', `/api/todos/3${q()}`, { cookie, body: { title: before.title, startDate: '2026-11-03', endDate: '2026-11-06', categoryId: 5 } });
  assert.equal(moved.status, 200);
  assert.deepEqual([moved.json.startDate, moved.json.endDate, moved.json.categoryId, moved.json.status], ['2026-11-03', '2026-11-06', 5, 'IN_PROGRESS']);
  const back = await call('PATCH', `/api/todos/3${q()}`, { cookie, body: { title: before.title, startDate: '2026-11-03', endDate: '2026-11-06' } });
  assert.equal(back.json.categoryId, 3);
  const done = await call('PATCH', `/api/todos/1${q()}`, { cookie, body: { title: '주간 보고서 제출(최종)', startDate: '2026-11-01', endDate: '2026-11-02', categoryId: 4 } });
  assert.equal(done.json.title, '주간 보고서 제출(최종)');
  assert.equal(done.json.isCompleted, true);
  assert.equal(done.json.status, 'COMPLETED');
  assert.equal((await todos(cookie)).json.length, 7);

  expectError(await call('PATCH', `/api/todos/3${q()}`, { cookie, body: { title: 'x', startDate: '2026-11-07', endDate: '2026-11-06' } }), 400, 'INVALID_DATE_RANGE');
  expectError(await call('PATCH', `/api/todos/3${q()}`, { cookie, body: { title: '   ', startDate: '2026-11-03', endDate: '2026-11-06' } }), 400, 'VALIDATION_ERROR');
  const unchanged = (await call('GET', `/api/todos/3${q()}`, { cookie })).json;
  assert.deepEqual([unchanged.title, unchanged.startDate, unchanged.endDate], [before.title, '2026-11-03', '2026-11-06']);
});

test('US-10 완료 처리·취소와 상태 변화 (BR-25, BR-28, ST-01~04, D-10)', async () => {
  const { cookie } = await login(PS02);
  const set = async (id, isCompleted) => {
    const res = await call('PATCH', `/api/todos/${id}/completed${q()}`, { cookie, body: { isCompleted } });
    assert.equal(res.status, 200);
    assert.equal(res.json.isCompleted, isCompleted);
    assert.equal(res.json.completedAt === null, !isCompleted);
    return res.json.status;
  };
  assert.equal(await set(2, true), 'COMPLETED');
  assert.equal(await set(2, false), 'OVERDUE');
  assert.equal(await set(5, true), 'COMPLETED');
  assert.equal(await set(5, false), 'IN_PROGRESS');
  assert.equal(await set(3, true), 'COMPLETED');
  assert.equal(await set(3, false), 'NOT_STARTED');
  assert.equal(await set(1, false), 'OVERDUE');
  assert.equal(await set(1, true), 'COMPLETED');
  expectError(await call('PATCH', `/api/todos/2/completed${q()}`, { cookie, body: {} }), 400, 'VALIDATION_ERROR'); // D-10 명시 필수
  expectError(await call('PATCH', `/api/todos/2/completed${q()}`, { cookie, body: { isCompleted: 'true' } }), 400, 'VALIDATION_ERROR');
});

test('US-11 할일 삭제 (BR-27)', async () => {
  const { cookie } = await login(PS02);
  assert.equal((await call('DELETE', '/api/todos/6', { cookie })).status, 204);
  const list = (await todos(cookie)).json;
  assert.equal(list.length, 6);
  assert.ok(!ids(list).includes(6));
  expectError(await call('GET', `/api/todos/6${q()}`, { cookie }), 404, 'NOT_FOUND');
  expectError(await call('DELETE', '/api/todos/6', { cookie }), 404, 'NOT_FOUND');
});

test('US-12 목록 필터 4조합과 기한 초과 경계 (BR-31, BR-32)', async () => {
  const { cookie } = await login(PS02);
  const table = [
    ['', [6, 1, 2, 5, 4, 3, 7]],
    ['&categoryId=4', [1, 2, 5, 3]],
    ['&status=OVERDUE', [6, 2]],
    ['&categoryId=4&status=IN_PROGRESS', [5]],
    ['&categoryId=5&status=COMPLETED', []],
  ];
  for (const [query, expected] of table) {
    const res = await todos(cookie, query);
    assert.equal(res.status, 200, query);
    assert.deepEqual(ids(res.json), expected, query);
  }
  expectError(await call('GET', '/api/todos', { cookie }), 400, 'VALIDATION_ERROR');
  expectError(await call('GET', '/api/todos?today=2026/11/03', { cookie }), 400, 'VALIDATION_ERROR');
});

test('US-13 캘린더 월 뷰 (BR-33, BR-36)', async () => {
  const { cookie } = await login(PS02);
  const month = await todos(cookie, '&from=2026-10-26&to=2026-12-06');
  assert.equal(month.status, 200);
  assert.deepEqual(ids(month.json).sort((a, b) => a - b), [1, 2, 3, 4, 5, 6, 7]); // 완료 포함, 카테고리 필터 없음
  assert.deepEqual((await todos(cookie, '&from=2026-11-30&to=2027-01-03')).json, []);
  expectError(await todos(cookie, '&from=2026-10-26'), 400, 'VALIDATION_ERROR'); // AD-C4 from·to 함께
});

test('US-14 캘린더 주 뷰와 경계일 (BR-33, BR-35)', async () => {
  const { cookie } = await login(PS02);
  const week = (await todos(cookie, '&from=2026-11-02&to=2026-11-08')).json;
  assert.ok(!ids(week).includes(6));
  const onDay = (day) => week.filter((t) => t.startDate <= day && day <= t.endDate).map((t) => t.id).sort((a, b) => a - b);
  const table = { '2026-11-02': [1, 2, 5], '2026-11-03': [4, 5], '2026-11-04': [3], '2026-11-05': [3], '2026-11-06': [], '2026-11-07': [], '2026-11-08': [7] };
  for (const [day, expected] of Object.entries(table)) assert.deepEqual(onDay(day), expected, day);
  assert.deepEqual(ids((await todos(cookie, '&from=2026-11-09&to=2026-11-15')).json), [7]);
});

test('US-15 캘린더 일 뷰와 기간 이동 (BR-35)', async () => {
  const { cookie } = await login(PS02);
  const day = async (d) => ids((await todos(cookie, `&from=${d}&to=${d}`)).json).sort((a, b) => a - b);
  assert.deepEqual(await day('2026-11-03'), [4, 5]);
  assert.deepEqual(await day('2026-11-02'), [1, 2, 5]);
  assert.deepEqual(await day('2026-11-04'), [3]);
});

test('US-16 액세스 만료 자동 갱신과 리프레시 만료 시 로그인 이동 (BR-53, BR-01)', async () => {
  const { setCookie } = await login(PS02);
  const expired = jwt.sign({}, process.env.JWT_SECRET, { algorithm: 'HS384', subject: '2', expiresIn: -10 });
  const refresh = cookieValue(setCookie, 'refresh_token');
  const body = (suffix) => ({ title: `팀 회의 자료 준비(${suffix})`, startDate: '2026-11-04', endDate: '2026-11-05', categoryId: 4 });
  // (a) 액세스만 만료: 401 → refresh 1회 → 재시도 성공
  expectError(await call('PATCH', `/api/todos/3${q()}`, { cookie: `token=${expired}`, body: body('a') }), 401, 'UNAUTHORIZED');
  const rot = await call('POST', '/api/auth/refresh', { cookie: `refresh_token=${refresh}` });
  assert.equal(rot.status, 200);
  assert.deepEqual(cookieNames(rot.setCookie), ['refresh_token', 'token']);
  const retry = await call('PATCH', `/api/todos/3${q()}`, { cookie: cookieHeader(rot.setCookie), body: body('a') });
  assert.equal(retry.status, 200);
  assert.equal(retry.json.title, '팀 회의 자료 준비(a)');
  // (b) 리프레시까지 폐기: 401 → refresh 401 → 재로그인 후 (b) 미반영
  const refresh2 = cookieValue(rot.setCookie, 'refresh_token');
  assert.equal((await call('POST', '/api/auth/logout', { cookie: `refresh_token=${refresh2}` })).status, 204);
  expectError(await call('PATCH', `/api/todos/3${q()}`, { cookie: `token=${expired}`, body: body('b') }), 401, 'UNAUTHORIZED');
  expectError(await call('POST', '/api/auth/refresh', { cookie: `refresh_token=${refresh2}` }), 401, 'UNAUTHORIZED');
  const again = await login(PS02);
  assert.equal((await call('GET', `/api/todos/3${q()}`, { cookie: again.cookie })).json.title, '팀 회의 자료 준비(a)');
});

test('US-17 타인 리소스 접근 차단 (BR-02, BR-16)', async () => {
  const { cookie } = await login(PS01);
  const todoBody = { title: 'x', startDate: '2026-11-01', endDate: '2026-11-02' };
  const steps = [
    () => call('GET', `/api/todos/1${q()}`, { cookie }),
    () => call('GET', `/api/todos/9999${q()}`, { cookie }),
    () => call('GET', `/api/todos/abc${q()}`, { cookie }),
    () => call('PATCH', `/api/todos/1${q()}`, { cookie, body: todoBody }),
    () => call('PATCH', `/api/todos/1/completed${q()}`, { cookie, body: { isCompleted: true } }),
    () => call('DELETE', '/api/todos/1', { cookie }),
    () => call('POST', `/api/todos${q()}`, { cookie, body: { ...todoBody, categoryId: 3 } }),
    () => todos(cookie, '&categoryId=3'),
  ];
  const bodies = new Set();
  for (const step of steps) {
    const res = await step();
    expectError(res, 404, 'NOT_FOUND');
    bodies.add(JSON.stringify(res.json));
  }
  assert.equal(bodies.size, 1);
  assert.equal((await todos(cookie)).json.length, 1);
  const owner = await login(PS02);
  const todo1 = (await call('GET', `/api/todos/1${q()}`, { cookie: owner.cookie })).json;
  assert.deepEqual([todo1.title, todo1.isCompleted], ['주간 보고서 제출', true]);
});

test('US-19 (P1) 내 정보 수정 (BR-03, BR-05, BR-44, BR-45)', async () => {
  const { cookie } = await login(PS02);
  assert.deepEqual((await call('GET', '/api/users/me', { cookie })).json, { id: 2, email: PS02.email, name: '이서준' });
  const renamed = await call('PATCH', '/api/users/me', { cookie, body: { name: '이서준(팀장)' } });
  assert.equal(renamed.status, 200);
  assert.equal(renamed.json.name, '이서준(팀장)');
  expectError(await call('PATCH', '/api/users/me', { cookie, body: { currentPassword: 'wrongpass1', newPassword: 'seojun5678' } }), 401, 'INVALID_CREDENTIALS');
  expectError(await call('PATCH', '/api/users/me', { cookie, body: { currentPassword: PS02.password, newPassword: 'short12' } }), 400, 'VALIDATION_ERROR');
  expectError(await call('PATCH', '/api/users/me', { cookie, body: { name: '   ' } }), 400, 'VALIDATION_ERROR');
  const { setCookie: before } = await login(PS02); // 다른 기기 세션
  const changed = await call('PATCH', '/api/users/me', { cookie, body: { currentPassword: PS02.password, newPassword: 'seojun5678' } });
  assert.equal(changed.status, 200);
  assert.deepEqual(cookieNames(changed.setCookie), ['refresh_token', 'token']); // S-01: 새 쿠키 2개
  assert.equal((await call('POST', '/api/auth/refresh', { cookie: `refresh_token=${cookieValue(changed.setCookie, 'refresh_token')}` })).status, 200); // 새 토큰 유효
  expectError(await call('POST', '/api/auth/refresh', { cookie: `refresh_token=${cookieValue(before, 'refresh_token')}` }), 401, 'UNAUTHORIZED'); // 다른 기기 세션 폐기
  assert.equal((await call('POST', '/api/auth/logout', { cookie })).status, 204);
  expectError(await call('POST', '/api/auth/login', { body: PS02 }), 401, 'INVALID_CREDENTIALS');
  const fresh = await login({ email: PS02.email, password: 'seojun5678' });
  assert.equal(fresh.user.name, '이서준(팀장)');
});
