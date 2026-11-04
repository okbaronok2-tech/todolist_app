import { after, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { resetDb } from './setup.js';
import { pool } from '../src/db/pool.js';
import * as todos from '../src/services/todo-service.js';
import { STATUS } from '../src/services/todo-status.js';
import * as v from '../src/routes/validate.js';

const today = '2026-11-03';
const base = { title: '테스트', description: null, startDate: '2026-11-03', endDate: '2026-11-04', categoryId: null };
const rejects = (promise, code) => assert.rejects(promise, (e) => e.code === code);

beforeEach(resetDb);
after(() => pool.end());

test('BR-12 categoryId 없음 → 기본 카테고리, 수정 시 null → 기본으로 변경', async () => {
  const created = await todos.create(2, base, today);
  assert.equal(created.categoryId, 3);
  const moved = await todos.update(2, created.id, { ...base, categoryId: 4 }, today);
  assert.equal(moved.categoryId, 4);
  const back = await todos.update(2, created.id, { ...base, categoryId: null }, today);
  assert.equal(back.categoryId, 3);
});

test('BR-16 타인·미존재 categoryId는 NOT_FOUND', async () => {
  await rejects(todos.create(2, { ...base, categoryId: 2 }, today), 'NOT_FOUND');
  await rejects(todos.create(2, { ...base, categoryId: 999 }, today), 'NOT_FOUND');
  await rejects(todos.update(2, 1, { ...base, categoryId: 2 }, today), 'NOT_FOUND');
});

test('BR-22 startDate > endDate는 INVALID_DATE_RANGE, 같은 날짜·과거 날짜는 저장 (BR-23)', () => {
  assert.throws(() => v.dateRange({ startDate: '2026-11-05', endDate: '2026-11-04' }), (e) => e.code === 'INVALID_DATE_RANGE');
  assert.doesNotThrow(() => v.dateRange({ startDate: '2026-11-04', endDate: '2026-11-04' }));
  return todos.create(2, { ...base, startDate: '2026-10-20', endDate: '2026-10-22' }, today).then((t) => {
    assert.equal(t.startDate, '2026-10-20');
    assert.equal(t.status, STATUS.OVERDUE);
  });
});

test('BR-24 생성 요청의 isCompleted는 무시되어 false·null', async () => {
  const body = v.todoBody({ ...base, isCompleted: true, status: 'COMPLETED' });
  assert.equal('isCompleted' in body, false);
  const created = await todos.create(2, { ...body, categoryId: null }, today);
  assert.equal(created.isCompleted, false);
  assert.equal(created.completedAt, null);
  assert.equal(created.status, STATUS.IN_PROGRESS);
});

test('BR-25·BR-28·D-10 완료 지정은 멱등, 취소 시 completedAt null과 날짜 재판정', async () => {
  const first = await todos.setCompleted(2, 2, true, today);
  assert.notEqual(first.completedAt, null);
  assert.equal(first.status, STATUS.COMPLETED);
  const again = await todos.setCompleted(2, 2, true, today);
  assert.equal(again.completedAt.getTime(), first.completedAt.getTime());
  const undone = await todos.setCompleted(2, 2, false, today);
  assert.equal(undone.completedAt, null);
  assert.equal(undone.status, STATUS.OVERDUE);
  const { rows } = await pool.query('SELECT bool_and(is_completed = (completed_at IS NOT NULL)) AS ok FROM todos');
  assert.equal(rows[0].ok, true);
});

test('UC-06 수정은 완료 여부 유지, updatedAt 갱신', async () => {
  const before = await todos.get(2, 1, today);
  const after = await todos.update(2, 1, { ...base, title: '주간 보고서 제출(수정)', startDate: before.startDate, endDate: before.endDate, categoryId: 4 }, today);
  assert.equal(after.isCompleted, true);
  assert.equal(after.completedAt.getTime(), before.completedAt.getTime());
  assert.ok(after.updatedAt > before.updatedAt);
});

test('BR-27·BR-02 삭제 후 조회는 NOT_FOUND, 타인·미존재 id는 같은 본문', async () => {
  await todos.remove(2, 7);
  await rejects(todos.get(2, 7, today), 'NOT_FOUND');
  const messages = new Set();
  for (const id of [8, 999]) {
    for (const op of [() => todos.get(2, id, today), () => todos.update(2, id, base, today), () => todos.remove(2, id)]) {
      await op().then(() => assert.fail('should reject'), (e) => messages.add(`${e.code}:${e.message}`));
    }
  }
  assert.equal(messages.size, 1);
  assert.equal((await pool.query('SELECT title FROM todos WHERE id = 8')).rows[0].title, '알고리즘 과제');
});

test('BR-31~33 목록 필터·정렬·캘린더 겹침 (시드 사용자 2, today 11-03)', async () => {
  const ids = async (filter) => (await todos.list(2, filter, today)).map((t) => t.id);
  assert.deepEqual(await ids({}), [6, 1, 2, 5, 4, 3, 7]);
  assert.deepEqual(await ids({ categoryId: 4 }), [1, 2, 5, 3]);
  assert.deepEqual(await ids({ status: 'OVERDUE' }), [6, 2]);
  assert.deepEqual(await ids({ categoryId: 4, status: 'OVERDUE' }), [2]);
  assert.deepEqual(await ids({ status: 'COMPLETED' }), [1]);
  assert.deepEqual(await ids({ status: 'NOT_STARTED' }), [3, 7]);
  assert.deepEqual(await ids({ status: 'IN_PROGRESS' }), [5, 4]);
  for (const status of Object.values(STATUS)) {
    assert.ok((await todos.list(2, { status }, today)).every((t) => t.status === status));
  }
  assert.deepEqual(await ids({ range: { from: '2026-11-02', to: '2026-11-08' } }), [1, 2, 5, 4, 3, 7]);
  assert.deepEqual(await ids({ range: { from: '2026-10-26', to: '2026-12-06' } }), [6, 1, 2, 5, 4, 3, 7]);
  await rejects(todos.list(2, { categoryId: 2 }, today), 'NOT_FOUND');
  await rejects(todos.list(2, { categoryId: 999 }, today), 'NOT_FOUND');
  assert.deepEqual((await todos.list(1, {}, today)).map((t) => t.id), [8]);
});
