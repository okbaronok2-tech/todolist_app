// US-02 로그인 실패와 성공, US-03 로그아웃 후 뒤로 가기
await setup();
await clearSession();
await page.goto(BASE + '/login');
const fail = async (email, pw) => {
  await page.locator('#email').fill(email); await page.locator('#password').fill(pw);
  const [res] = await Promise.all([page.waitForResponse((r) => r.url().endsWith('/api/auth/login')), page.getByRole('button', { name: '로그인' }).click()]);
  await sleep(300);
  return { status: res.status(), body: await res.json(), alert: await alertText(), url: page.url() };
};
const a = await fail('seojun@example.com', 'wrongpass1');
ok('US-02-1 비밀번호 오류: INVALID_CREDENTIALS 401, 단일 오류, /login 유지', a.status === 401 && a.body.code === 'INVALID_CREDENTIALS' && !!a.alert && a.url.endsWith('/login'), `${a.body.code} "${a.alert}"`);
await shot('US-02-1-login-fail');
const b = await fail('nobody@example.com', 'seojun1234');
ok('US-02-2 없는 이메일: 1단계와 같은 코드·메시지 (BR-06)', b.status === 401 && JSON.stringify(a.body) === JSON.stringify(b.body) && a.alert === b.alert, JSON.stringify(b.body));
await page.locator('#email').fill('seojun@example.com'); await page.locator('#password').fill('seojun1234');
await page.getByRole('button', { name: '로그인' }).click();
await page.waitForURL('**/todos'); await waitList();
const t = await titles();
const cookies = (await page.context().cookies()).map((c) => c.name + (c.httpOnly ? ':httpOnly' : ''));
ok('US-02-3 로그인 성공: /todos 7건, HttpOnly 쿠키 2개', t.length === 7 && cookies.includes('token:httpOnly') && cookies.includes('refresh_token:httpOnly'), `${t.length}건 ${cookies.join(',')}`);
await shot('US-02-3-todos');
// US-03
const [logoutRes] = await Promise.all([page.waitForResponse((r) => r.url().endsWith('/api/auth/logout')), page.getByRole('button', { name: '로그아웃' }).click()]);
await page.waitForURL('**/login');
const setCookie = (await logoutRes.headersArray()).filter((h) => h.name.toLowerCase() === 'set-cookie').map((h) => h.value);
const after = (await page.context().cookies()).map((c) => c.name);
ok('US-03-1 로그아웃: 응답 Set-Cookie로 token·refresh_token 삭제, 쿠키 0개, /login 이동', after.length === 0 && setCookie.some((v) => v.startsWith('token=;')) && setCookie.some((v) => v.startsWith('refresh_token=;')), `남은 쿠키 [${after.join(',')}] set-cookie ${setCookie.length}개`);
await shot('US-03-1-after-logout');
await page.goBack(); await sleep(600);
const back = await page.locator('.todo-row__title').count();
ok('US-03-2 뒤로 가기: 할일 제목 0건, /login', back === 0 && page.url().endsWith('/login'), `url=${page.url()} titles=${back}`);
await page.goto(BASE + '/calendar'); await sleep(600);
ok('US-03-3 /calendar 직접 입력 → /login (BR-01)', page.url().endsWith('/login') && (await page.locator('.cal__bar').count()) === 0, page.url());
await shot('US-03-3-calendar-redirect');
const noCookie = await api('GET', '/api/todos?today=' + TODAY);
ok('US-03 쿠키 없는 todos 요청 UNAUTHORIZED 401', noCookie.status === 401 && noCookie.body.code === 'UNAUTHORIZED', JSON.stringify(noCookie.body));
