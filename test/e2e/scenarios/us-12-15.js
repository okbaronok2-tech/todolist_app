// US-12 목록 필터 4조합, US-13 월 뷰, US-14 주 뷰, US-15 일 뷰 (PS-02, 시드 7건 그대로)
await setup();
await clearSession();
const reqs = [];
page.on('request', (r) => { if (r.url().includes(':3000/api/todos')) reqs.push(r.url()); });
await login('seojun@example.com', 'seojun1234');
const ID = { '헬스장 등록': 6, '주간 보고서 제출': 1, '거래처 견적 회신': 2, '분기 계획 작성': 5, '은행 서류 제출': 4, '팀 회의 자료 준비': 3, '가족 여행 준비': 7 };
const ids = async () => (await titles()).map((t) => ID[t] ?? t);
const cases = [
  ['미선택', '미선택', [6, 1, 2, 5, 4, 3, 7]],
  ['업무', '미선택', [1, 2, 5, 3]],
  ['미선택', '기한 초과', [6, 2]],
  ['업무', '진행중', [5]],
  ['개인', '완료', []],
];
for (const [c, s, exp] of cases) {
  await selectFilter({ category: c, status: s });
  const got = await ids();
  const empty = (await page.locator('.empty').count()) ? await page.locator('.empty').textContent() : '';
  ok(`US-12 필터 ${c}/${s} → [${exp.join(',')}]`, JSON.stringify(got) === JSON.stringify(exp) && (exp.length > 0 || empty.includes('조건에 맞는 할일이 없습니다')), `[${got.join(',')}] ${empty}`);
}
await shot('US-12-empty-filter');
await selectFilter({ category: '미선택', status: '기한 초과' });
await shot('US-12-overdue-filter');
ok('US-12 모든 목록 요청에 today=2026-11-03', reqs.length > 0 && reqs.every((u) => u.includes('today=2026-11-03')), reqs.length + '건');
const noToday = await api('GET', '/api/todos');
const badToday = await api('GET', '/api/todos?today=2026/11/03');
ok('US-12-ex today 누락 / today=2026/11/03 → VALIDATION_ERROR 400', noToday.status === 400 && noToday.body.code === 'VALIDATION_ERROR' && badToday.status === 400 && badToday.body.code === 'VALIDATION_ERROR');
// US-13 (업무 필터 선택 중)
await selectFilter({ category: '업무', status: '미선택' });
reqs.length = 0;
await page.getByRole('link', { name: '캘린더' }).click();
await page.waitForURL('**/calendar'); await page.locator('.cal--month').waitFor(); await sleep(300);
const monthReq = reqs.find((u) => u.includes('from='));
ok('US-13-1/2 월 뷰, 42칸, 요청 from=10-26 to=12-06 today=11-03', (await page.locator('.cal--month .cal__date').count()) === 42 && !!monthReq && monthReq.includes('from=2026-10-26') && monthReq.includes('to=2026-12-06') && monthReq.includes('today=2026-11-03'), monthReq);
let bars = await calendarBars();
const has = (t) => bars.some((b) => b.startsWith(t));
ok('US-13-3/4 7건 전부 표시(완료 포함, 업무 필터 미적용: 개인·기본 포함)', Object.keys(ID).every(has), bars.length + '개 막대');
ok('US-13-3 완료·기한 초과 상태 구분 표시', bars.some((b) => b.includes('주간 보고서 제출, 완료')) && bars.some((b) => b.includes('거래처 견적 회신, 기한 초과')));
await shot('US-13-month');
reqs.length = 0;
await page.getByRole('button', { name: '다음' }).click(); await sleep(400);
const nextReq = reqs.find((u) => u.includes('from='));
ok('US-13-5 [다음] → 2026-11-30~2027-01-03, 할일 없음(빈 캘린더)', (await page.locator('.cal__range').textContent()) === '2026-12' && !!nextReq && nextReq.includes('from=2026-11-30') && nextReq.includes('to=2027-01-03') && (await calendarBars()).length === 0, nextReq);
await shot('US-13-5-next-month-empty');
await page.getByRole('button', { name: '오늘' }).click(); await sleep(400);
ok('US-13-5 [오늘] → 2026-11 복귀', (await page.locator('.cal__range').textContent()) === '2026-11' && (await calendarBars()).length >= 7);
await page.locator('.cal__bar', { hasText: '분기 계획 작성' }).first().click();
await page.waitForURL('**/todos/5/edit');
ok('US-13-6 할일 5 선택 → /todos/5/edit', page.url().endsWith('/todos/5/edit'));
await page.goBack(); await page.locator('.cal--month').waitFor();
// US-14
reqs.length = 0;
await page.getByRole('button', { name: '주', exact: true }).click(); await page.locator('.cal--week').waitFor(); await sleep(300);
const weekReq = reqs.find((u) => u.includes('from='));
ok('US-14-1 주 뷰 11-02~11-08, 요청 from/to/today', (await page.locator('.cal__range').textContent()).includes('11-02') && !!weekReq && weekReq.includes('from=2026-11-02') && weekReq.includes('to=2026-11-08') && weekReq.includes('today=2026-11-03'), weekReq);
const weekLists = () => page.evaluate(() => [...document.querySelectorAll('.cal--week .cal__list')].map((ul) => [...ul.querySelectorAll('li')].map((li) => li.textContent.trim())));
const week = await weekLists();
const expWeek = [['주간 보고서 제출', '거래처 견적 회신', '분기 계획 작성'], ['분기 계획 작성', '은행 서류 제출'], ['팀 회의 자료 준비'], ['팀 회의 자료 준비'], ['(없음)'], ['(없음)'], ['가족 여행 준비']];
const weekTitles = week.map((d) => d.map((t) => Object.keys(ID).find((k) => t.includes(k)) ?? t));
ok('US-14-2 날짜 칸별 할일 (6은 어느 칸에도 없음)', JSON.stringify(weekTitles) === JSON.stringify(expWeek), JSON.stringify(weekTitles));
await shot('US-14-week');
await page.getByRole('button', { name: '다음' }).click(); await sleep(400);
const w2 = await weekLists();
ok('US-14-3 [다음] 11-09~11-15: 할일 7이 11-09, 11-10 칸', (await page.locator('.cal__range').textContent()).includes('11-09') && w2[0].some((t) => t.includes('가족 여행 준비')) && w2[1].some((t) => t.includes('가족 여행 준비')) && w2[2][0] === '(없음)', JSON.stringify(w2));
await page.getByRole('button', { name: '오늘' }).click(); await sleep(300);
ok('US-14-4 [오늘] → 11-02~11-08 복귀', (await page.locator('.cal__range').textContent()).includes('11-02'));
// US-15
reqs.length = 0;
await page.getByRole('button', { name: '일', exact: true }).click(); await page.locator('.cal--day').waitFor(); await sleep(300);
const dayReq = reqs.find((u) => u.includes('from='));
const dayItems = () => page.locator('.cal__list--day li').allTextContents();
let d = await dayItems();
ok('US-15-1 일 뷰 11-03: 할일 5, 4, 요청 from=to=11-03', (await page.locator('.cal__range').textContent()).includes('11-03') && !!dayReq && dayReq.includes('from=2026-11-03') && dayReq.includes('to=2026-11-03') && d.length === 2 && d[0].includes('분기 계획 작성') && d[1].includes('은행 서류 제출'), d.join(' | '));
await shot('US-15-day');
await page.getByRole('button', { name: '이전' }).click(); await sleep(300); d = await dayItems();
ok('US-15-2 [이전] 11-02: 할일 1, 2, 5', d.length === 3 && ['주간 보고서 제출', '거래처 견적 회신', '분기 계획 작성'].every((t, i) => d[i].includes(t)), d.join(' | '));
await page.getByRole('button', { name: '다음' }).click(); await page.getByRole('button', { name: '다음' }).click(); await sleep(300); d = await dayItems();
ok('US-15-3 [다음] 두 번 11-04: 할일 3', (await page.locator('.cal__range').textContent()).includes('11-04') && d.length === 1 && d[0].includes('팀 회의 자료 준비'), d.join(' | '));
