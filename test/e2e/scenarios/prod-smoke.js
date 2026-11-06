// 운영 배포 스모크: https://todolist-kje-fe.vercel.app (API https://todolist-kje-be.vercel.app). 계정 e2e-probe@example.com
// 로컬 시드와 무관. 기준일 고정 없음(오늘 날짜). 실행 후 데이터 원복(만든 할일·카테고리 삭제)
const PROD = 'https://todolist-kje-fe.vercel.app';
const today = new Date().toISOString().slice(0, 10);
const listRefetch = () => page.waitForResponse((r) => /\/api\/todos\?today=[0-9-]+$/.test(r.url()) && r.request().method() === 'GET', { timeout: 15000 });
await page.setViewportSize({ width: 1280, height: 900 });
await clearSession();
const apiReqs = [];
page.on('response', (r) => { if (r.url().startsWith('https://todolist-kje-be.vercel.app/api/')) apiReqs.push(`${r.request().method()} ${new URL(r.url()).pathname} ${r.status()}`); });
await page.goto(PROD + '/login');
await page.locator('#email').fill('e2e-probe@example.com');
await page.locator('#password').fill('probe1234');
await page.getByRole('button', { name: '로그인' }).click();
await page.waitForURL('**/todos', { timeout: 15000 });
await page.locator('.todo-list, .empty').first().waitFor({ timeout: 15000 });
const cookies = (await page.context().cookies()).map((c) => `${c.name}@${c.domain} sameSite=${c.sameSite} secure=${c.secure}`);
// 이전 실행 잔여물 정리
while ((await titles()).includes('운영 스모크')) {
  await rowOf('운영 스모크').getByRole('button', { name: '삭제' }).click();
  await page.getByRole('dialog').getByRole('button', { name: '확인' }).click(); await sleep(800);
}
ok('PROD 로그인 → /todos (cross-site 쿠키 저장)', page.url().endsWith('/todos') && cookies.some((c) => c.startsWith('token@')), cookies.join(' | '));
await shot('PROD-1-todos');
await page.getByRole('button', { name: '등록' }).click(); await page.waitForURL('**/todos/new'); await page.locator('#title').waitFor();
await fillTodoForm({ title: '운영 스모크', startDate: today, endDate: today });
await Promise.all([listRefetch(), page.getByRole('button', { name: '저장' }).click()]); await page.waitForURL('**/todos'); await waitList(); await sleep(300);
ok('PROD 할일 등록 → 목록에 표시 (보호 API에 쿠키 전송)', (await titles()).includes('운영 스모크'), (await titles()).join(','));
await shot('PROD-2-created');
const [res] = await Promise.all([page.waitForResponse((r) => r.url().includes('/completed')), listRefetch(), rowOf('운영 스모크').locator('input[type=checkbox]').click()]);
await sleep(300);
ok('PROD 완료 체크 200 → 완료', res.status() === 200 && (await rowInfo('운영 스모크')).status === '완료');
await page.getByRole('link', { name: '캘린더' }).click(); await page.waitForURL('**/calendar'); await page.locator('.cal--month').waitFor(); await sleep(500);
ok('PROD 캘린더 월 뷰에 막대', (await calendarBars()).some((b) => b.startsWith('운영 스모크')));
await shot('PROD-3-calendar');
await page.reload(); await page.locator('.cal--month').waitFor({ timeout: 15000 });
ok('PROD 새로고침(직접 진입, SPA 리라이트) 후 세션 유지', page.url().endsWith('/calendar') && (await calendarBars()).length >= 1);
await page.goto(PROD + '/todos'); await waitList();
await rowOf('운영 스모크').getByRole('button', { name: '삭제' }).click();
await Promise.all([listRefetch(), page.getByRole('dialog').getByRole('button', { name: '확인' }).click()]); await sleep(300);
ok('PROD 삭제 → 목록에서 제거', !(await titles()).includes('운영 스모크'));
await page.getByRole('button', { name: '다크 모드' }).click(); await sleep(200);
ok('PROD 다크 모드 전환', (await page.evaluate(() => document.documentElement.dataset.theme)) === 'dark');
await shot('PROD-4-dark');
await page.getByRole('button', { name: '라이트 모드' }).click();
await logoutViaMenu();
ok('PROD 로그아웃 → /login, 쿠키 0개', (await page.context().cookies()).length === 0);
ok('PROD API 응답에 5xx 없음', apiReqs.every((r) => !/ 5\d\d$/.test(r)), apiReqs.join(' ; '));
