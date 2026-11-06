// E2E 공통 함수 (build.mjs가 각 시나리오 앞에 붙인다). Playwright MCP run_code는 import/require 불가라 인라인한다.
const BASE = 'http://localhost:5173';
const API = 'http://localhost:3000';
const TODAY = '2026-11-03';
const SHOT_DIR = 'C:/Users/student/todolist_app/test/e2e/screenshots/';
const rows = [];
const shots = [];
const ok = (step, cond, note = '') => { rows.push({ step, pass: !!cond, note: String(note ?? '') }); return !!cond; };
const done = () => ({ rows, shots });
const setup = async ({ width = 1280, height = 900 } = {}) => {
  await page.setViewportSize({ width, height });
  await page.clock.setFixedTime(new Date('2026-11-03T12:00:00'));
};
const shot = async (name) => { await page.screenshot({ path: `${SHOT_DIR}${name}.png`, fullPage: true }); shots.push(`${name}.png`); };
const clearSession = () => page.context().clearCookies();
const waitList = () => page.locator('.todo-list, .empty').first().waitFor();
const login = async (email, password) => {
  await page.goto(`${BASE}/login`);
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: '로그인' }).click();
  await page.waitForURL('**/todos');
  await waitList();
};
const logoutViaMenu = async () => { await page.getByRole('button', { name: '로그아웃' }).click(); await page.waitForURL('**/login'); };
const gotoTodos = async () => { await page.goto(`${BASE}/todos`); await waitList(); };
const titles = () => page.locator('.todo-list .todo-row:not(.todo-row--head) .todo-row__title').allTextContents();
const rowOf = (title) => page.locator('.todo-row', { has: page.locator('.todo-row__title', { hasText: title }) }).first();
const rowInfo = async (title) => {
  const row = rowOf(title);
  return {
    period: await row.locator('.todo-row__period').textContent(),
    category: await row.locator('.todo-row__category').textContent(),
    status: await row.locator('.badge').textContent(),
    checked: await row.locator('input[type=checkbox]').isChecked(),
  };
};
const alertText = async () => { const a = page.locator('[role=alert]'); return (await a.count()) ? a.first().textContent() : null; };
const fieldErrors = () => page.locator('.field__error').allTextContents();
const api = (method, path, body) => page.evaluate(async ({ method, path, body, API }) => {
  const r = await fetch(API + path, { method, credentials: 'include', headers: body === undefined ? {} : { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await r.text(); let json = null; try { json = text ? JSON.parse(text) : null; } catch { json = text; }
  return { status: r.status, body: json };
}, { method, path, body, API });
const fillTodoForm = async ({ title, description, startDate, endDate, category }) => {
  if (title !== undefined) await page.locator('#title').fill(title);
  if (description !== undefined) await page.locator('#description').fill(description);
  if (startDate !== undefined) await page.locator('#startDate').fill(startDate);
  if (endDate !== undefined) await page.locator('#endDate').fill(endDate);
  if (category !== undefined) await page.locator('#categoryId').selectOption({ label: category });
};
const selectFilter = async ({ category, status }) => {
  if (category !== undefined) await page.getByLabel('카테고리').selectOption({ label: category });
  if (status !== undefined) await page.getByLabel('상태').selectOption({ label: status });
  await page.waitForTimeout(300);
};
const calendarBars = () => page.locator('.cal__bar').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')));
const sleep = (ms) => page.waitForTimeout(ms);
