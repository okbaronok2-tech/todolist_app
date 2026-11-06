// US-16 액세스 만료 자동 갱신 (a), 리프레시 만료 시 로그인 이동 (b) (PS-02). 쿠키 삭제로 만료 대용
await setup();
await clearSession();
const log = [];
page.on('request', (r) => { if (r.url().includes('/api/auth/refresh') || (r.url().includes('/api/todos/3') && r.method() === 'PATCH')) log.push(`${r.method()} ${new URL(r.url()).pathname}`); });
await login('seojun@example.com', 'seojun1234');
// (a)
await rowOf('팀 회의 자료 준비').getByRole('button', { name: '편집' }).click(); await page.waitForURL('**/todos/3/edit'); await page.locator('#title').waitFor(); await sleep(300);
await fillTodoForm({ title: '팀 회의 자료 준비(a)' });
await page.context().clearCookies({ name: 'token' });
ok('US-16-a-2 token 쿠키만 삭제', (await page.context().cookies()).map((c) => c.name).join(',') === 'refresh_token');
log.length = 0;
await page.getByRole('button', { name: '저장' }).click();
await page.waitForURL('**/todos'); await waitList();
const after = (await page.context().cookies()).map((c) => c.name).sort().join(',');
const ia = await rowInfo('팀 회의 자료 준비(a)');
ok('US-16-a-3 401 → refresh 1회 → 재시도 1회 → 성공, /todos 복귀, 새 쿠키 2개', JSON.stringify(log) === JSON.stringify(['PATCH /api/todos/3', 'POST /api/auth/refresh', 'PATCH /api/todos/3']) && after === 'refresh_token,token' && !!ia.period, log.join(' → ') + ' | ' + after);
await shot('US-16-a-after-refresh');
// (b)
await rowOf('팀 회의 자료 준비(a)').getByRole('button', { name: '편집' }).click(); await page.waitForURL('**/todos/3/edit'); await page.locator('#title').waitFor(); await sleep(300);
await fillTodoForm({ title: '팀 회의 자료 준비(b)' });
await page.context().clearCookies();
log.length = 0;
await page.getByRole('button', { name: '저장' }).click();
await page.waitForURL('**/login', { timeout: 5000 });
ok('US-16-b-6 401 → refresh도 401 → /login 이동 (refresh 1회, 재시도 없음)', JSON.stringify(log) === JSON.stringify(['PATCH /api/todos/3', 'POST /api/auth/refresh']) && page.url().endsWith('/login'), log.join(' → '));
await shot('US-16-b-login-redirect');
await login('seojun@example.com', 'seojun1234');
ok("US-16-b-7 재로그인 후 할일 3 제목은 '팀 회의 자료 준비(a)' (b 미반영, BR-53)", (await titles()).includes('팀 회의 자료 준비(a)') && !(await titles()).includes('팀 회의 자료 준비(b)'), (await titles()).join(','));
